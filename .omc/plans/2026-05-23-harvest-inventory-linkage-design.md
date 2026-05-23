# 采收入库与库存联动设计

**日期**: 2026-05-23
**状态**: 已批准

---

## 1. 背景与目标

### 1.1 问题描述

采收入库后需要与作物库存形成数据流联动，在库存中增加对应作物的数量和入库时间。当前系统存在两套并行库存实现，且缺乏仓库类型校验和完整的追溯链。

### 1.2 目标

1. 采收入库保存后自动同步到库存中心
2. 支持种子/种苗/成品三种入库类型区分
3. 仓库必选，且校验仓库类型与入库类型匹配
4. 库存数据持久化到后端数据库
5. 完整的追溯查询能力

---

## 2. 设计决策

### 2.1 核心决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 库存持久化 | 后端数据库 | 数据安全，支持多端访问 |
| 页面结构 | 统一页面 + Tab 筛选 | 统一管理，切换便捷 |
| 追溯方式 | 侧边详情面板 | 操作连贯，无需跨页面跳转 |
| 仓库校验 | 类型必选 + 动态校验 | 避免入库错误，便于筛选 |

### 2.2 inboundType → StockType 映射

| inboundType | StockType | 说明 |
|-------------|-----------|------|
| `seed_source` | `seed` | 种源入库 |
| `seedling` | `seedling` | 种苗入库 |
| `planting_harvest` | `product` | 成品入库 |

### 2.3 inboundType → warehouseType 映射

| inboundType | warehouseType | 说明 |
|-------------|--------------|------|
| `seed_source` | `seed` | 种子库 |
| `seedling` | `seedling` | 种苗库 |
| `planting_harvest` | `product` | 成品库 |

---

## 3. 数据模型

### 3.1 仓库表变更 (`warehouses`)

```sql
ALTER TABLE warehouses ADD COLUMN warehouse_type TEXT;
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `warehouse_type` | TEXT | 仓库类型：`seed` / `seedling` / `product` |

### 3.2 库存表 (`inventory_stock`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT | 主键 |
| `instance_id` | TEXT | 库存实例ID，格式：`INS/ISE/IPR-日期-序号` |
| `stock_type` | TEXT | 库存类型：seed / seedling / product |
| `business_id` | TEXT | 关联业务ID（采收记录ID） |
| `business_type` | TEXT | 业务类型：harvest |
| `business_code` | TEXT | 业务单号（采收单号） |
| `crop_id` | TEXT | 作物ID |
| `crop_name` | TEXT | 作物名称 |
| `variety_id` | TEXT | 品种ID |
| `variety_name` | TEXT | 品种名称 |
| `current_quantity` | REAL | 当前数量 |
| `frozen_quantity` | REAL | 冻结数量 |
| `available_quantity` | REAL | 可用数量 |
| `unit` | TEXT | 单位 |
| `warehouse_id` | TEXT | 仓库ID |
| `warehouse_name` | TEXT | 仓库名称 |
| `inbound_date` | TEXT | 入库时间 |
| `source_type` | TEXT | 来源类型：self_produced / external_purchased |
| `production_plan_code` | TEXT | 生产计划批次号 |
| `source_instance_id` | TEXT | 上游来源库存实例ID |
| `status` | TEXT | 状态：in_stock / low_stock / frozen / outbound / empty |
| `create_time` | TEXT | 创建时间 |
| `update_time` | TEXT | 更新时间 |

### 3.3 库存流水表 (`inventory_transaction`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT | 主键 |
| `transaction_id` | TEXT | 流水ID，格式：`TXN-日期-序号` |
| `instance_id` | TEXT | 库存实例ID |
| `transaction_type` | TEXT | 流水类型：INBOUND / OUTBOUND / TRANSFER / FREEZE / UNFREEZE / ADJUST |
| `quantity` | REAL | 变动数量（正数增加/负数减少） |
| `balance_before` | REAL | 变动前余额 |
| `balance_after` | REAL | 变动后余额 |
| `business_id` | TEXT | 关联业务ID |
| `business_type` | TEXT | 业务类型 |
| `business_code` | TEXT | 业务单号 |
| `operator_id` | TEXT | 操作人ID |
| `operator_name` | TEXT | 操作人姓名 |
| `operate_date` | TEXT | 操作时间 |
| `remarks` | TEXT | 备注 |
| `create_time` | TEXT | 创建时间 |

---

## 4. API 设计

### 4.1 采收入库同步库存

**端点**: `POST /api/inventory/inbound`

**请求体**:
```json
{
  "stockType": "product",
  "businessId": "HV20260523001",
  "businessType": "harvest",
  "businessCode": "HV20260523001",
  "cropId": "VAR001",
  "cropName": "番茄",
  "varietyId": "VAR001",
  "varietyName": "红颜",
  "quantity": 100,
  "unit": "公斤",
  "warehouseId": "WH003",
  "warehouseName": "A区成品库",
  "inboundDate": "2026-05-23",
  "sourceType": "self_produced",
  "sourceInstanceId": null,
  "productionPlanCode": "ZZB2026-001",
  "remarks": "采收入库"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "instanceId": "IPR-20260523-001",
    "transactionId": "TXN-20260523-001"
  }
}
```

### 4.2 获取库存列表

**端点**: `GET /api/inventory`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `stockType` | string | 库存类型：seed / seedling / product |
| `warehouseId` | string | 仓库ID |
| `cropName` | string | 作物名称（模糊匹配） |
| `page` | number | 页码 |
| `limit` | number | 每页数量 |

### 4.3 获取库存详情

**端点**: `GET /api/inventory/:instanceId`

**响应**: 返回库存实例详情，包含关联的采收单信息和库存流水列表

### 4.4 获取库存流水

**端点**: `GET /api/inventory/transaction/:instanceId`

**响应**: 返回指定库存实例的所有流水记录

---

## 5. 前端设计

### 5.1 采收入库表单变更

**仓库下拉筛选逻辑**:
```typescript
const WAREHOUSE_TYPE_MAP = {
  'seed_source': 'seed',
  'seedling': 'seedling',
  'planting_harvest': 'product',
};

const availableWarehouses = warehouses.filter(
  w => w.warehouseType === WAREHOUSE_TYPE_MAP[inboundType]
);
```

### 5.2 库存管理页面 (`/inventory`)

**页面布局**:
```
┌─────────────────────────────────────────────────────────┐
│  库存管理                                          [刷新]│
├─────────────────────────────────────────────────────────┤
│  [全部] [种子] [种苗] [成品]          [仓库筛选 ▼]     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │ 实例ID      │ 作物名称 │ 品种   │ 数量  │ 状态  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ INS-xxx    │ 番茄     │ 红颜   │ 100kg │ 充足  │  │
│  │ IPR-xxx    │ 黄瓜     │ 之豇18 │ 50kg  │ 低库存│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ← 侧边详情面板 (点击行时滑出) →                         │
└─────────────────────────────────────────────────────────┘
```

### 5.3 侧边详情面板

**显示内容**:
- 库存基本信息（实例ID、当前数量、状态）
- 仓库信息
- 入库时间
- 关联采收单（单号、时间）
- 库存流水记录列表

---

## 6. 实现任务

### 6.1 后端

| 任务 | 文件 | 说明 |
|------|------|------|
| T1 | `server/src/db/schema.ts` | `warehouses` 表添加 `warehouse_type` 字段 |
| T2 | `server/src/db/migrations/` | 创建迁移脚本 |
| T3 | `server/src/repositories/inventory.repository.ts` | 添加 `create()` / `findByInstanceId()` 方法 |
| T4 | `server/src/services/inventory.service.ts` | 添加入库业务逻辑 |
| T5 | `server/src/routes/inventory.ts` | 新增 `POST /inbound` 端点 |

### 6.2 前端

| 任务 | 文件 | 说明 |
|------|------|------|
| T6 | `src/types/inventory.ts` | 更新 `InboundRequest` 类型 |
| T7 | `src/services/inventoryService.ts` | 改为调用后端 API |
| T8 | `src/components/farm/harvest/HarvestPage.tsx` | 调用时传入仓库信息 |
| T9 | `src/pages/Inventory.tsx` | 库存管理页面（Tab + 侧边详情） |

---

## 7. 验收标准

1. ✅ 采收入库保存后，后端 `inventory_stock` 表有对应记录
2. ✅ `inventory_transaction` 表有入库流水记录
3. ✅ 仓库下拉根据 `inboundType` 动态过滤，仅显示匹配类型的仓库
4. ✅ 库存页面 Tab 可切换 seed / seedling / product
5. ✅ 点击库存行，右侧滑出详情面板
6. ✅ 详情面板显示关联采收单号
7. ✅ 可通过库存实例ID追溯到原始采收单

---

## 8. 数据流图

```
┌──────────────┐     ┌──────────────┐
│   采收入库    │────►│ harvest_     │
│   保存表单    │     │ records 表   │
└──────┬───────┘     └──────────────┘
       │
       │ 同步调用
       ▼
┌──────────────┐     ┌──────────────┐
│  后端 API    │────►│ inventory_    │
│  /api/       │     │ stock 表     │
│  inventory    │     └──────────────┘
│  /inbound    │
       │        ┌──────────────┐
       └───────►│ inventory_   │
                │ transaction   │
                │ 表            │
                └──────────────┘
```
