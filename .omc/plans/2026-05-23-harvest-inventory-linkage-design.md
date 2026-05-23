# 采收入库与库存联动设计

**日期**: 2026-05-23
**状态**: 已审核修订

---

## 1. 背景与目标

### 1.1 问题描述

采收入库后需要与作物库存形成数据流联动，在库存中增加对应作物的数量和入库时间。当前系统存在两套并行库存实现（前端 localStorage V3.0 vs 后端旧版 inventory 表），且缺乏仓库类型校验和完整的追溯链。

### 1.2 目标

1. 采收入库保存后自动同步到后端数据库
2. 支持种子/种苗/成品三种入库类型区分
3. 仓库必选，且校验仓库类型与入库类型匹配
4. 库存数据持久化到后端数据库
5. 完整的追溯查询能力
6. 同步操作有用户反馈（成功/失败提示）

---

## 2. 系统现状分析

### 2.1 现有仓库类型

| 仓库类型值 | 说明 | 现有仓库 |
|-----------|------|---------|
| `cold_storage` | 成品冷库 | 成品冷库A区、成品冷库B区 |
| `normal` | 常温库 | 常温库 |
| `seed_storage` | 种子库 | 种子库 |
| `hazardous` | 农药库 | 农药库 |

**注意**: 现有类型中**没有** `seedling`（种苗库），需要新增。

### 2.2 现有库存实现

| 层级 | 实现 | 问题 |
|------|------|------|
| 前端 V3.0 | localStorage (`inventory_stock_v3`) | 仅本地存储，刷新丢失 |
| 后端 | 旧版 `inventory` 表 | 结构不兼容 V3.0，无 instanceId |

---

## 3. 设计决策

### 3.1 核心决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 库存持久化 | 后端数据库 (inventory_stock + inventory_transaction) | 数据安全，支持多端访问 |
| 页面结构 | 统一页面 + Tab 筛选 | 统一管理，切换便捷 |
| 追溯方式 | 侧边详情面板 | 操作连贯，无需跨页面跳转 |
| 仓库校验 | 类型必选 + 动态校验 | 避免入库错误，便于筛选 |
| 同步模式 | 同步等待 + 用户反馈 | 确保数据一致性，用户可知同步状态 |

### 3.2 inboundType → StockType 映射

| inboundType | StockType | 说明 |
|-------------|-----------|------|
| `seed_source` | `seed` | 种源入库 |
| `seedling` | `seedling` | 种苗入库 |
| `planting_harvest` | `product` | 成品入库 |

### 3.3 inboundType → warehouseType 映射（已修正）

**兼容现有仓库类型 + 新增 seedling**：

| inboundType | warehouseType | 说明 | 现有映射 |
|-------------|--------------|------|---------|
| `seed_source` | `seed_storage` | 种子库 | 现有 |
| `seedling` | `seedling` | 种苗库 | **需新增** |
| `planting_harvest` | `cold_storage` | 成品冷库 | 现有 |
| `planting_harvest` | `normal` | 常温库 | 现有（备用） |

```typescript
// 修正后的映射表
const INBOUND_TO_WAREHOUSE_TYPE: Record<string, string[]> = {
  'seed_source': ['seed_storage'],        // 仅种子库
  'seedling': ['seedling'],              // 种苗库（需新建）
  'planting_harvest': ['cold_storage', 'normal'], // 成品库（冷库或常温）
};
```

### 3.4 仓库类型 → StockType 映射

```typescript
const WAREHOUSE_TYPE_TO_STOCK_TYPE: Record<string, StockType> = {
  'seed_storage': StockType.SEED,        // 种子库 → 种源
  'seedling': StockType.SEEDLING,       // 种苗库 → 种苗
  'cold_storage': StockType.PRODUCT,     // 冷库 → 成品
  'normal': StockType.PRODUCT,           // 常温库 → 成品
};
```

---

## 4. 数据模型

### 4.1 仓库表新增字段 (`warehouses`)

**字段已存在，无需 ALTER**（schema.ts:74 已有 `warehouse_type` 字段）。

需要做的是**数据迁移**：为现有仓库设置正确的 `warehouse_type` 值。

**仓库数据修正 SQL**:
```sql
UPDATE warehouses SET warehouse_type = 'cold_storage' WHERE warehouse_type IS NULL AND name LIKE '%冷库%';
UPDATE warehouses SET warehouse_type = 'normal' WHERE warehouse_type IS NULL AND name LIKE '%常温%';
UPDATE warehouses SET warehouse_type = 'seed_storage' WHERE warehouse_type IS NULL AND name LIKE '%种子%';
UPDATE warehouses SET warehouse_type = 'hazardous' WHERE warehouse_type IS NULL AND name LIKE '%农药%';
```

### 4.2 新增仓库类型

**新增种苗库**（seedling 类型）：
```sql
INSERT INTO warehouses (id, oid, code, name, warehouse_type, location, status)
VALUES ('WH-SEEDLING-001', 'ORG001', 'SM-001', '种苗库', 'seedling', '待定', 'active');
```

### 4.3 新建 `inventory_stock` 表

```sql
CREATE TABLE IF NOT EXISTS inventory_stock (
  id TEXT PRIMARY KEY,
  instance_id TEXT UNIQUE NOT NULL,
  stock_type TEXT NOT NULL,
  business_id TEXT,
  business_type TEXT,
  business_code TEXT,
  crop_id TEXT,
  crop_name TEXT,
  variety_id TEXT,
  variety_name TEXT,
  current_quantity REAL DEFAULT 0,
  frozen_quantity REAL DEFAULT 0,
  available_quantity REAL DEFAULT 0,
  unit TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  inbound_date TEXT,
  source_type TEXT,
  production_plan_code TEXT,
  source_instance_id TEXT,
  status TEXT DEFAULT 'in_stock',
  version INTEGER DEFAULT 1,
  create_time TEXT,
  update_time TEXT
);
```

**索引**:
```sql
CREATE INDEX IF NOT EXISTS idx_inventory_stock_instance ON inventory_stock(instance_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_type ON inventory_stock(stock_type);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_business ON inventory_stock(business_id, business_type);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_warehouse ON inventory_stock(warehouse_id);
```

### 4.4 新建 `inventory_transaction` 表

```sql
CREATE TABLE IF NOT EXISTS inventory_transaction (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  instance_id TEXT NOT NULL,
  stock_type TEXT,
  transaction_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  balance_before REAL DEFAULT 0,
  balance_after REAL NOT NULL,
  business_id TEXT,
  business_type TEXT,
  business_code TEXT,
  operator_id TEXT,
  operator_name TEXT,
  operate_date TEXT,
  remarks TEXT,
  create_time TEXT,
  FOREIGN KEY (instance_id) REFERENCES inventory_stock(instance_id)
);
```

**索引**:
```sql
CREATE INDEX IF NOT EXISTS idx_inventory_tx_instance ON inventory_transaction(instance_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_type ON inventory_transaction(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_business ON inventory_transaction(business_id, business_type);
```

---

## 5. API 设计

### 5.1 新增端点

#### POST /api/inventory/inbound

采收入库同步库存。

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
  "warehouseId": "WH001",
  "warehouseName": "成品冷库A区",
  "inboundDate": "2026-05-23",
  "sourceType": "self_produced",
  "sourceInstanceId": null,
  "productionPlanCode": "ZZB2026-001",
  "remarks": "采收入库"
}
```

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "instanceId": "IPR-20260523-001",
    "transactionId": "TXN-20260523-001",
    "currentQuantity": 100,
    "availableQuantity": 100
  }
}
```

**响应** (失败):
```json
{
  "success": false,
  "error": "仓库不存在或类型不匹配"
}
```

#### GET /api/inventory

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `stockType` | string | 库存类型：seed / seedling / product |
| `warehouseId` | string | 仓库ID |
| `cropName` | string | 作物名称（模糊匹配） |
| `page` | number | 页码 |
| `limit` | number | 每页数量 |

#### GET /api/inventory/:instanceId

**响应**:
```json
{
  "success": true,
  "data": {
    "stock": { /* InventoryStock 对象 */ },
    "transactions": [ /* InventoryTransaction 列表 */ ],
    "relatedHarvest": { /* 关联的采收单信息 */ }
  }
}
```

---

## 6. 后端实现

### 6.1 Repository 层

**新建文件**: `server/src/repositories/inventory.repository.ts`

```typescript
export class InventoryRepository {
  // 创建库存记录
  async create(data: Partial<InventoryStock>): Promise<InventoryStock>;

  // 根据 instanceId 查询
  async findByInstanceId(instanceId: string): Promise<InventoryStock | null>;

  // 更新库存数量
  async updateQuantity(instanceId: string, quantity: number, version: number): Promise<boolean>;

  // 查询库存列表
  async findAll(filters: InventoryQuery): Promise<{ data: InventoryStock[]; total: number }>;
}

export class InventoryTransactionRepository {
  // 创建流水
  async create(data: Partial<InventoryTransaction>): Promise<InventoryTransaction>;

  // 根据 instanceId 查询流水
  async findByInstanceId(instanceId: string): Promise<InventoryTransaction[]>;
}
```

### 6.2 Service 层

**修改文件**: `server/src/services/inventory.service.ts`

```typescript
export class InventoryService {
  // 采收入库
  async inbound(request: InboundDTO): Promise<InboundResult> {
    // 1. 校验仓库类型
    const warehouse = await this.warehouseRepo.findById(request.warehouseId);
    if (!warehouse) throw new Error('仓库不存在');

    const expectedStockType = INBOUND_TO_STOCK_TYPE[request.stockType];
    if (warehouse.warehouse_type !== expectedStockType) {
      throw new Error(`仓库类型不匹配：期望 ${expectedStockType}，实际 ${warehouse.warehouse_type}`);
    }

    // 2. 生成 instanceId
    const instanceId = this.generateInstanceId(request.stockType);

    // 3. 创建库存记录
    const stock = await this.stockRepo.create({ instanceId, ...request });

    // 4. 创建入库流水
    await this.txRepo.create({
      transactionId: this.generateTransactionId(),
      instanceId,
      transactionType: TransactionType.INBOUND,
      quantity: request.quantity,
      balanceBefore: 0,
      balanceAfter: request.quantity,
      ...request,
    });

    return { instanceId, transactionId, currentQuantity: request.quantity };
  }

  // 生成 instanceId
  private generateInstanceId(stockType: StockType): string {
    const prefix = stockType === StockType.SEED ? 'INS'
      : stockType === StockType.SEEDLING ? 'ISE' : 'IPR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await this.getNextSequence(prefix, dateStr);
    return `${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`;
  }
}
```

### 6.3 路由层

**修改文件**: `server/src/routes/inventory.ts`

```typescript
// 新增端点（放在 /:id 之前）
router.post('/inbound', inventoryController.inbound.bind(inventoryController));
router.get('/transaction/:instanceId', inventoryController.getTransactions.bind(inventoryController));
```

---

## 7. 前端设计

### 7.1 采收入库表单变更

**仓库下拉筛选逻辑**:
```typescript
// inboundType → 可用仓库类型
const WAREHOUSE_TYPES_BY_INBOUND: Record<string, WarehouseType[]> = {
  'seed_source': ['seed_storage'],
  'seedling': ['seedling'],
  'planting_harvest': ['cold_storage', 'normal'],
};

// 根据 inboundType 过滤仓库
function getAvailableWarehouses(warehouses: Warehouse[], inboundType: string): Warehouse[] {
  const allowedTypes = WAREHOUSE_TYPES_BY_INBOUND[inboundType] || [];
  return warehouses.filter(w => allowedTypes.includes(w.warehouseType as WarehouseType));
}
```

### 7.2 同步调用改为同步等待

**HarvestPage.tsx 修改**:
```typescript
const handleCreateRecord = async () => {
  if (!validateForm()) return;

  // ... 构建 record 数据 ...

  try {
    // 1. 保存采收记录
    const createdRecord = await addItem(record);

    // 2. 同步库存（同步等待，给用户反馈）
    const inventoryResult = await inventoryInbound({
      stockType: getStockTypeByInboundType(newRecord.inboundType),
      businessId: createdRecord.id,
      businessType: BusinessType.HARVEST,
      // ... 其他字段
    }, operatorId, operatorName);

    if (!inventoryResult.success) {
      toast.error('库存同步失败，请手动重试');
      return;
    }

    toast.success('采收记录已保存，库存已同步');
    setIsCreateModalOpen(false);
    loadItems();
  } catch (error) {
    toast.error('保存失败：' + (error as Error).message);
  }
};
```

### 7.3 库存管理页面

**页面路径**: `src/pages/InventoryV3.tsx`（已有，改造）

**Tab 切换逻辑**:
```typescript
const stockTypeTabs = [
  { key: 'all', label: '全部' },
  { key: 'seed', label: '种子' },
  { key: 'seedling', label: '种苗' },
  { key: 'product', label: '成品' },
];
```

**侧边详情面板**: 复用现有的 `InventoryDetailPanel` 组件，改造以支持 instanceId 追溯。

---

## 8. 实现任务清单

### 8.1 后端任务

| 任务 | 文件 | 说明 | 状态 |
|------|------|------|------|
| T1 | `server/src/db/schema.ts` | 添加 `inventory_stock` 和 `inventory_transaction` 表创建语句 | 待完成 |
| T2 | `server/src/db/migrations/` | 创建迁移脚本 `002_add_inventory_stock.sql` | 待完成 |
| T3 | `server/src/repositories/inventory.repository.ts` | 新建 Repository | 待完成 |
| T4 | `server/src/repositories/inventory-tx.repository.ts` | 新建 Transaction Repository | 待完成 |
| T5 | `server/src/services/inventory.service.ts` | 添加 `inbound()` 等业务方法 | 待完成 |
| T6 | `server/src/routes/inventory.ts` | 添加 `/inbound` 和 `/transaction/:instanceId` 端点 | 待完成 |
| T7 | `server/src/controllers/inventory.controller.ts` | 添加对应 Controller 方法 | 待完成 |

### 8.2 前端任务

| 任务 | 文件 | 说明 | 状态 |
|------|------|------|------|
| T8 | `src/services/inventoryService.ts` | 改为调用后端 API `/api/inventory/inbound` | 待完成 |
| T9 | `src/components/farm/harvest/HarvestPage.tsx` | 仓库下拉过滤 + 同步等待反馈 | 待完成 |
| T10 | `src/pages/InventoryV3.tsx` | Tab 切换 + 侧边详情改造 | 待完成 |

### 8.3 数据迁移任务

| 任务 | 说明 |
|------|------|
| M1 | 更新现有仓库的 `warehouse_type` 值 |
| M2 | 新增 `seedling` 类型种苗库 |
| M3 | 可选：旧 `inventory` 表数据迁移（待定） |

---

## 9. 验收标准

| # | 标准 | 验证方法 |
|---|------|---------|
| 1 | 采收入库保存后，`inventory_stock` 表有对应记录 | 后端日志 + 数据库查询 |
| 2 | `inventory_transaction` 表有入库流水记录 | 后端日志 + 数据库查询 |
| 3 | 仓库下拉根据 `inboundType` 动态过滤 | 前端操作验证 |
| 4 | 库存页面 Tab 可切换 seed / seedling / product | 前端操作验证 |
| 5 | 点击库存行，右侧滑出详情面板 | 前端操作验证 |
| 6 | 详情面板显示关联采收单号 | 前端操作验证 |
| 7 | 可通过 instanceId 追溯到原始采收单 | 详情面板跳转验证 |
| 8 | 同步失败时用户看到错误提示 | 前端操作验证（模拟失败） |

---

## 10. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 仓库不存在 | 返回 400，提示"仓库不存在" |
| 仓库类型不匹配 | 返回 400，提示"仓库类型不匹配" |
| 采收记录ID不存在 | 返回 400，提示"关联业务不存在" |
| 数据库写入失败 | 返回 500，事务回滚 |
| 网络超时 | 前端显示"网络错误，请重试" |

---

## 11. 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        采收入库流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户填写表单                                                     │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐     ┌──────────────────┐                       │
│  │ inboundType │────►│ 过滤可用仓库列表   │                       │
│  └─────────────┘     └──────────────────┘                       │
│       │                    │                                    │
│       ▼                    ▼                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │         POST /api/inventory/inbound      │                   │
│  │  1. 校验仓库类型                        │                   │
│  │  2. 生成 instanceId                     │                   │
│  │  3. 写入 inventory_stock               │                   │
│  │  4. 写入 inventory_transaction         │                   │
│  │  5. 返回结果给前端                     │                   │
│  └─────────────────────────────────────────┘                   │
│                        │                                        │
│                        ▼                                        │
│                 用户看到成功/失败提示                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        追溯查询流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  库存列表 ──► 点击行 ──► 侧边详情面板                             │
│       │                  │                                     │
│       │                  ├── 库存基本信息                         │
│       │                  ├── 仓库信息                            │
│       │                  ├── 入库时间                            │
│       │                  ├── 关联采收单 ──► 跳转采收详情         │
│       │                  └── 库存流水列表                         │
│       │                                                     │
│       ▼                                                     │
│  库存变动报表                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. 设计修订记录

| 日期 | 版本 | 修订内容 |
|------|------|---------|
| 2026-05-23 | v1.0 | 初始设计 |
| 2026-05-23 | v1.1 | 审核后修订：<br>- 修正仓库类型映射（使用现有 cold_storage/normal/seed_storage）<br>- 新增 seedling 类型仓库<br>- 补充完整数据库 DDL<br>- 添加 API 端点详细实现<br>- 添加同步反馈机制<br>- 补充错误处理方案 |
