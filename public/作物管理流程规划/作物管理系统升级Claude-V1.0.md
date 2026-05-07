# 作物管理系统升级 - 业务链追溯系统实施计划

## 背景与目标

构建完整的农业追溯系统，确保：
1. 生产计划、种源、育苗、库存之间的关联正确
2. 支持库存扣减和追溯查询
3. **所有配置项放入数据字典，禁止硬编码**

---

## 一、作物编码规则（11位结构）

```
类别(2位) + 类型(2位) + 品种(2位) + 子品种(3位) + 详细(2位)
```

**示例：**
- `FR010100101` = 水果类(FR) + 浆果类(01) + 草莓(01) + 红颜(001) + 详细(01)
- `PD03020399900` = 蔬菜类(PD) + 茄果类(03) + 茄子(03) + 其他茄子(999) + 详细(00)

---

## 二、追溯链路设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        生产计划 (Production Plan)                     │
│  ┌─────────────────┬─────────────────┬─────────────────┐           │
│  │ seed_breeding   │    seedling     │    planting     │           │
│  │   (JZ前缀)     │   (YM前缀)     │   (ZZ前缀)     │           │
│  └────────┬────────┴────────┬────────┴────────┬────────┘           │
│           │                   │                   │                  │
└───────────│───────────────────│───────────────────│──────────────────┘
            │                   │                   │
            ▼                   │                   │
    ┌───────────────┐         │                   │
    │   种源管理    │         │                   │
    │ (Seed Source) │         │                   │
    │  source_origin │◄────────┘                   │
    └───────┬───────┘                             │
            │                                     │
            │ 库存扣减                            │
            ▼                                     │
    ┌───────────────┐                             │
    │   库存管理    │                             │
    │  (Inventory)  │                             │
    │  stock_type   │                             │
    └───────┬───────┘                             │
            │                                     │
            │ 关联使用                            │
            ▼                                     │
    ┌───────────────┐         ┌─────────────────┐ │
    │   育苗管理    │────────►│  作物种植管理   │ │
    │ (Seedling)   │         │   (Planting)    │ │
    └───────┬───────┘         └────────┬────────┘ │
            │                           │            │
            │         采收入库          │            │
            │◄──────────────────────────┘            │
            ▼                                     │
    ┌───────────────┐                             │
    │   采收管理    │                             │
    │  (Harvest)    │                             │
    └───────┬───────┘                             │
            │                                     │
            │ 入库                                │
            ▼                                     │
    ┌───────────────┐                             │
    │  成品库存     │                             │
    │ stock_type=   │                             │
    │   product     │                             │
    └───────────────┘                             │
```

---

## 三、数据字典完整配置清单

### 3.1 现有已使用的数据字典

| 分类代码 | 字典项 | 状态 | 使用页面 |
|---------|--------|------|---------|
| `source_type` | seed, seedling, cutting, grafting, tissue_culture | 已有 | 种源管理 |
| `source_origin` | external_purchase, self_produced, commissioned, gift, self_retained, other | 已有 | 种源管理 |
| `seedling_type` | plug, direct, grafting | 已有 | 育苗管理 |
| `harvest_type` | 采收类型 | 已有 | 采收管理 |
| `harvest_status` | 采收状态 | 已有 | 采收管理 |
| `quality_grade` | A/B/C等级 | 已有 | 采收/库存 |
| `seedling_plan_type` | 育苗计划类型 | 已有 | 育苗管理 |
| `survival_rate_target` | 目标成苗率 | 已有 | 育苗管理 |
| `propagation_multiple` | 扩繁倍数 | 已有 | 育苗管理 |
| `operator` | 操作人员 | 已有 | 育苗管理 |

---

### 3.2 需要新增到数据字典的字段

#### A. 生产计划页面 (Production)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 计划类型 | `plan_type` | seed_breeding(育种), seedling(育苗), planting(种植) | **需添加 planting** |
| 种植模式 | `planting_mode` | 直播, 移栽, 嫁接, 组培, 其他 | **需新增** |
| 负责人 | `responsible_person` | 陆启闯, 王建国, 李明辉, 张伟 | **需新增** |
| 生产计划状态 | `batch_status` | 规划中, 执行中, 已完成, 已取消 | **需新增** |
| 种植区域 | `greenhouse_id` | 玻璃温室A区, 玻璃温室B区, 育苗温室A区 | **可复用现有字典** |

#### B. 种源管理页面 (Seed Source)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 来源类型 | `supplier_is_internal` | internal(内部), external(外部) | **需新增** |
| 基地选择 | `base_id` | 基地列表 | **可复用现有字典** |
| 单位 | `unit` | 株, kg, 袋, 粒, 颗 | **需新增** |
| 作物类型 | `crop_category` | 蔬菜类, 水果类, 粮食类 | **已有，需清理重复项** |
| 是否补录 | `is_supplementary` | 是, 否 | **需新增** |

#### C. 育苗管理页面 (Seedling)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 育苗区域/温室 | `seedling_site` | 育苗温室A区, 育苗温室B区, 玻璃温室A区 | **需新增** |
| 育苗方式 | `seedling_type` | 穴盘育苗, 直播育苗, 扦插育苗, 嫁接育苗 | **需合并/确认** |
| 计算模式 | `seedling_calculate_mode` | 单株育苗, 扩繁育苗 | **需新增** |
| 是否补录 | `is_supplementary` | 是, 否 | **需新增** |

#### D. 作物种植页面 (Planting)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 来源类型 | `planting_source_type` | 种苗种植, 种子种植, 库存调拨 | **需新增** |
| 种植区域 | `planting_area` | 1号区, 2号区, 3号区, A区, B区 | **可复用现有字典** |

#### E. 库存管理页面 (Inventory)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 作物形态 | `stock_type` | seed(种子), seedling(种苗), product(成品) | **需新增** |
| 单位 | `inventory_unit` | 株, kg, 袋, 粒, 颗 | **可复用种源的unit** |
| 品质等级 | `quality_grade` | A级, B级, C级, 优, 良, 差 | **需统一** |
| 品质评定 | `quality_level` | 特优, 优, 良, 合格, 不合格 | **需新增** |
| 仓库 | `warehouse` | 种源库, 种苗库, 成品库, 采后库 | **需新增/确认** |
| 种植模式 | `planting_mode` | 直播, 移栽, 嫁接, 组培 | **可复用种植的** |

#### F. 采收管理页面 (Harvest)

| 字段名称 | 建议字典码 | 建议字典项 | 说明 |
|---------|-----------|----------|------|
| 入库类型 | `inbound_type` | 采收入库, 退回入库, 调拨入库 | **需新增** |
| 采收区域 | `harvest_greenhouse` | 玻璃温室A区, 玻璃温室B区 | **需新增** |
| 入库仓库 | `harvest_warehouse` | 种源库, 种苗库, 成品库, 采后库 | **可复用库存的warehouse** |
| 目标库存 | `target_inventory` | 目标库存配置 | **需新增** |
| 是否补录 | `is_supplementary` | 是, 否 | **可复用** |

---

## 四、数据字典分类汇总表

### 4.1 需要新增的字典分类

| 序号 | 字典码 | 字典名称 | 模块 | 字典项 |
|------|--------|---------|------|--------|
| 1 | `plan_type` | 计划类型 | production | seed_breeding, seedling, **planting(新增)** |
| 2 | `planting_mode` | 种植模式 | crop | 直播, 移栽, 嫁接, 组培, 其他 |
| 3 | `responsible_person` | 负责人 | production | 陆启闯, 王建国, 李明辉, 张伟 |
| 4 | `batch_status` | 生产计划状态 | production | 规划中, 执行中, 已完成, 已取消 |
| 5 | `supplier_is_internal` | 来源类型 | seed_source | internal, external |
| 6 | `seedling_site` | 育苗场地 | seedling | 育苗温室A区, 育苗温室B区, 玻璃温室A区, 玻璃温室B区 |
| 7 | `seedling_calculate_mode` | 计算模式 | seedling | 单株育苗, 扩繁育苗 |
| 8 | `planting_source_type` | 种植来源类型 | planting | 种苗种植, 种子种植, 库存调拨 |
| 9 | `stock_type` | 库存形态 | inventory | seed, seedling, product |
| 10 | `quality_level` | 品质评定 | inventory | 特优, 优, 良, 合格, 不合格 |
| 11 | `warehouse` | 仓库 | warehouse | 种源库, 种苗库, 成品库, 采后库 |
| 12 | `inbound_type` | 入库类型 | harvest | 采收入库, 退回入库, 调拨入库 |
| 13 | `harvest_greenhouse` | 采收区域 | harvest | 玻璃温室A区, 玻璃温室B区 |
| 14 | `target_inventory` | 目标库存 | harvest | 配置值 |
| 15 | `is_supplementary` | 是否补录 | common | 是, 否 |
| 16 | `unit` | 单位 | common | 株, kg, 袋, 粒, 颗 |

### 4.2 需要清理的字典分类

| 字典码 | 问题 | 处理方式 |
|--------|------|---------|
| `crop_category` | 存在中英文混合重复 | 清理统一 |
| `source_type` | 与 source_origin 混淆 | 确认区分 |

---

## 五、现有系统类型定义（勿修改）

### 5.1 生产计划类型
```typescript
// src/types/index.ts
export enum PlanType {
  SEED_BREEDING = 'seed_breeding', // 育种计划（对应 JZ 前缀）
  SEEDLING = 'seedling',           // 育苗计划（对应 YM 前缀）
  PLANTING = 'planting'            // 种植计划（对应 ZZ 前缀）
}
```

### 5.2 库存形态类型
```typescript
// src/types/inventory.ts
export enum StockType {
  SEED = 'seed',         // 种源
  SEEDLING = 'seedling', // 种苗
  PRODUCT = 'product',   // 成品
}
```

### 5.3 种源来源类型
```typescript
// src/types/crop.ts
export type SourceOrigin =
  | 'internal_seed'       // 内部种源
  | 'external_purchase'   // 外部采购
  | 'tissue_culture'      // 组培苗
  | 'grafting'            // 嫁接苗
  | 'cutting'             // 扦插繁殖
  | 'direct_seedling'     // 直接育苗
  | 'direct_planting'     // 直接种植
  | 'external_harvest';   // 外购成品入库
```

---

## 六、业务规则

### 6.1 库存扣减触发点

| 操作 | 扣减库存 | 目标形态 |
|------|---------|---------|
| 新建育苗并选择种源 | 种源库 | stock_type='seed' |
| 新建种植并选择种苗 | 种苗库 | stock_type='seedling' |
| 采收入库 | 增加成品库 | stock_type='product' |

### 6.2 追溯查询链路

```
育苗记录
  ├── 关联种源批号 → 种源记录
  │                  ├── 供应商信息（外购场景）
  │                  ├── 关联生产计划（自研场景）
  │                  └── 入库仓库
  └── 关联生产计划 → 生产计划记录
                     ├── plan_type 判断类型
                     └── 批次号前缀判断（JZ/YM/ZZ）
```

---

## 七、涉及修改的文件清单

### 7.1 数据字典配置
| 文件 | 修改内容 |
|------|---------|
| `SettingsDataProvider.tsx` | 添加所有缺失的字典分类和字典项 |

### 7.2 前端页面（改用 DictSelect）
| 页面 | 文件 | 修改字段 |
|------|------|---------|
| 生产计划 | CreateBatchModal.tsx | planType, plantingMode, responsiblePerson, batchStatus |
| 种源管理 | AddModal.tsx, EditModal.tsx | supplierIsInternal, unit, isSupplementary |
| 育苗管理 | AddModal.tsx, EditModal.tsx | seedlingSite, seedlingType, calculateMode, isSupplementary |
| 作物种植 | AddModal.tsx, EditModal.tsx | sourceType, areaId |
| 库存管理 | ProduceInventoryAddModal.tsx | stockType, unit, qualityLevel, warehouse, plantingMode |
| 采收管理 | AddModal.tsx, BatchEditModal.tsx | inboundType, harvestGreenhouse, targetInventory, isSupplementary |

---

## 八、实施顺序

### 第一阶段：数据字典配置（优先级P0）
1. 在 `SettingsDataProvider.tsx` 中添加所有字典分类
2. 添加所有字典项
3. 验证前端可见

### 第二阶段：前端页面改造（优先级P1）
1. 按页面顺序改造：生产计划 → 种源 → 育苗 → 种植 → 库存 → 采收
2. 将硬编码的 options 替换为 DictSelect 组件
3. 验证下拉选项正确显示

### 第三阶段：业务逻辑验证（优先级P2）
1. 测试库存扣减链路
2. 测试追溯查询链路
3. 修复发现的问题

---

## 九、关键约束

1. **禁止硬编码**：所有下拉选项必须来自数据字典
2. **统一字典码**：相同含义的字段使用同一字典码（如 unit）
3. **保持类型定义**：现有枚举定义（如 PlanType, StockType）勿修改
4. **数据兼容**：现有数据需要迁移适配新字典

---

## 版本信息
- 文档名称：作物管理系统升级Claude-V1.0
- 创建时间：2026-05-05
- 版本：V1.0
- 状态：待实施
