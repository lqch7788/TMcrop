# 种植管理系统模块数据联动架构规划

## Context

**项目**：种植管理系统数据联动重构
**日期**：2026-04-30
**核心思路**：统一入库原则 + 库存中心化 + 全链路追溯

### 用户业务需求摘要

1. **统一入库原则**：所有物资（种子、种苗、作物）无论外购还是自产，必须先入库登记，其他模块才能引用
2. **供应商联动**：外购物资必须关联供应商管理模块
3. **数据追溯**：通过 instanceId 实现种源-育苗-种植-采收全链路追溯
4. **双向联动**：
   - 育苗可扣减种源数量
   - 种植可从种源直接获取，也可从育苗获取
   - 采收可收种子、种苗或成品
5. **品种库基础**：所有模块基于作物品种管理库的数据

---

## 一、整体架构设计

### 1.1 核心设计原则

```
┌─────────────────────────────────────────────────────────────────┐
│                     统一入库登记中心                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 外购入库    │  │ 自产入库    │  │ 采收入库    │              │
│  │ (关联供应商) │  │ (内部流转)  │  │ (成品入库)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   InventoryStock      │  ← 库存中心化             │
│              │   (库存实例表)         │                          │
│              │   instanceId 主键     │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   种源管理   │→ │   育苗管理   │→ │   种植管理   │→ 采收      │
│  │  SeedSource │  │  Seedling   │  │  Planting  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                                                    │
│         └──────────────→ 采收入库 ←───────────────────────────┘  │
│                          Harvest                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 模块关系图

```
                    ┌──────────────────┐
                    │   作物品种库      │ ←── 所有模块的品种数据基础
                    │ CropVariety      │
                    └────────┬─────────┘
                             │ cropCode (11位编码)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      库存中心 (InventoryStock)                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ instanceId | stockType | sourceType | cropCode | quantity │  │
│  │ status | supplierId | parentInstanceId | orderId         │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────┬────────────┬────────────┬────────────┬────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  种源管理  │ │  育苗管理  │ │  种植管理  │ │  采收入库  │
│SeedSource │→│ Seedling  │→│ Planting  │→│  Harvest  │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │             │
      │ instanceId  │ instanceId  │ instanceId  │ instanceId
      │ (引用库存)   │ (扣减种源)  │ (扣减种源/苗)│ (入库)
      │             │             │             │
      └─────────────┴─────────────┴─────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   供应商管理      │
              │   Supplier       │
              └──────────────────┘
```

---

## 二、数据模型设计

### 2.1 新增库存中心表 `inventory_stock`

```sql
-- 库存中心表（核心！）
CREATE TABLE inventory_stock (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,          -- 实例ID（追溯核心）
  stock_type TEXT NOT NULL,           -- 库存类型：seed|seedling|crop|harvest
  source_type TEXT NOT NULL,          -- 来源类型：external_purchase|internal_production|harvest
  source_origin TEXT NOT NULL,        -- 来源途径（继承原SourceOrigin）

  -- 作物信息（关联品种库）
  crop_code TEXT NOT NULL,            -- 11位作物编码
  crop_category TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,

  -- 数量信息
  initial_quantity INTEGER NOT NULL,  -- 初始数量
  current_quantity INTEGER NOT NULL,  -- 当前剩余数量
  unit TEXT,

  -- 供应商信息（外购必填）
  supplier_id TEXT,
  supplier_name TEXT,

  -- 溯源关系
  parent_instance_id TEXT,            -- 父实例ID（用于追溯来源）
  production_plan_id TEXT,           -- 关联生产计划
  production_plan_code TEXT,

  -- 来源单据信息
  source_document_type TEXT,          -- 来源单据类型：seed_source|seedling|planting|harvest
  source_document_id TEXT,            -- 来源单据ID
  source_document_code TEXT,          -- 来源单据编号

  -- 状态
  status TEXT DEFAULT 'in_stock',     -- in_stock|used|expired|cancelled

  -- 审计字段
  create_by TEXT,
  create_time TEXT,
  update_time TEXT
);
```

### 2.2 库存流水表 `inventory_transaction`

```sql
-- 库存流水表（记录每次出入库）
CREATE TABLE inventory_transaction (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,          -- 关联库存实例
  transaction_type TEXT NOT NULL,    -- inbound|outbound|transfer|adjust

  -- 变动信息
  quantity_change INTEGER NOT NULL,    -- 变动数量（正数入库，负数出库）
  quantity_before INTEGER NOT NULL,   -- 变动前数量
  quantity_after INTEGER NOT NULL,    -- 变动后数量

  -- 关联业务
  business_type TEXT NOT NULL,       -- seed_source|seedling|planting|harvest|sale|discard
  business_id TEXT,                  -- 业务单据ID
  business_code TEXT,                -- 业务单据编号

  -- 操作信息
  operator TEXT,
  operate_time TEXT,
  remarks TEXT,

  create_time TEXT
);
```

### 2.3 更新现有表结构

#### seed_sources 表（新增字段）
```sql
ALTER TABLE seed_sources ADD COLUMN instance_id TEXT;
ALTER TABLE seed_sources ADD COLUMN stock_status TEXT DEFAULT 'in_stock';
ALTER TABLE seed_sources ADD COLUMN production_plan_id TEXT;
ALTER TABLE seed_sources ADD COLUMN production_plan_code TEXT;
```

#### seedlings 表（新增字段）
```sql
ALTER TABLE seedlings ADD COLUMN instance_id TEXT;
ALTER TABLE seedlings ADD COLUMN source_instance_id TEXT;  -- 关联的种源库存实例
ALTER TABLE seedlings ADD COLUMN production_plan_id TEXT;
```

#### plantings 表（新增字段）
```sql
ALTER TABLE plantings ADD COLUMN instance_id TEXT;
ALTER TABLE plantings ADD COLUMN source_instance_id TEXT;  -- 来源库存实例
ALTER TABLE plantings ADD COLUMN seedling_instance_id TEXT;  -- 如从育苗来
```

#### harvest_records 表（新增字段）
```sql
ALTER TABLE harvest_records ADD COLUMN instance_id TEXT;
ALTER TABLE harvest_records ADD COLUMN source_instance_id TEXT;  -- 来源种植实例
ALTER TABLE harvest_records ADD COLUMN is_seed_harvest BOOLEAN DEFAULT FALSE;  -- 是否采收种子
ALTER TABLE harvest_records ADD COLUMN is_seedling_harvest BOOLEAN DEFAULT FALSE; -- 是否采收种苗
```

### 2.4 核心类型定义更新

```typescript
// src/types/inventory.ts

/**
 * 库存类型
 */
export enum StockType {
  SEED = 'seed',           // 种子
  SEEDLING = 'seedling',   // 种苗
  CROP = 'crop',          // 成品作物
  HARVEST = 'harvest'     // 采收入库
}

/**
 * 库存来源类型
 */
export enum StockSourceType {
  EXTERNAL_PURCHASE = 'external_purchase',   // 外部采购
  INTERNAL_PRODUCTION = 'internal_production', // 内部生产
  HARVEST = 'harvest'                       // 采收入库
}

/**
 * 库存实例（核心实体）
 */
export interface InventoryStock {
  id: string;
  instanceId: string;           // 实例ID（追溯核心）
  stockType: StockType;          // 库存类型
  sourceType: StockSourceType;   // 来源类型
  sourceOrigin: SourceOrigin;    // 来源途径

  // 作物信息
  cropCode: string;             // 11位编码
  cropCategory: string;
  cropName: string;
  cropVariety: string;

  // 数量
  initialQuantity: number;
  currentQuantity: number;
  unit: string;

  // 供应商
  supplierId?: string;
  supplierName?: string;

  // 溯源
  parentInstanceId?: string;     // 父实例（繁殖自...）
  productionPlanId?: string;
  productionPlanCode?: string;

  // 来源单据
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentCode?: string;

  // 状态
  status: 'in_stock' | 'used' | 'expired' | 'cancelled';

  // 审计
  createBy: string;
  createTime: string;
  updateTime: string;
}

/**
 * 库存流水
 */
export interface InventoryTransaction {
  id: string;
  instanceId: string;
  transactionType: 'inbound' | 'outbound' | 'transfer' | 'adjust';

  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;

  businessType: string;
  businessId?: string;
  businessCode?: string;

  operator?: string;
  operateTime: string;
  remarks?: string;

  createTime: string;
}
```

---

## 三、模块联动流程

### 3.1 种源入库流程（外购）

```
1. 用户进入「种源管理」→ 点击「新增种源」
2. 选择「来源途径」= external_purchase
3. 关联「供应商」（必填，下拉选择已有供应商或新增）
4. 填写作物信息（从品种库选择 cropCode）
5. 填写数量、单位、单价等
6. 点击「确认入库」
   │
   ├─→ 系统生成 instanceId
   ├─→ 创建 inventory_stock 记录（status: in_stock）
   ├─→ 创建 inventory_transaction 记录（type: inbound）
   ├─→ 创建 seed_sources 记录（关联 instanceId）
   └─→ 返回入库成功
```

### 3.2 育苗登记流程（扣减种源）

```
1. 用户进入「育苗管理」→ 点击「新增育苗」
2. 选择「种源」（从已入库的种源中选择）
   │
   ├─→ 系统显示：种源批号、作物信息、可用数量
   └─→ 用户填写：本次使用数量
3. 填写其他信息（场地、育苗方式等）
4. 点击「确认」
   │
   ├─→ 校验：使用数量 <= 种源可用数量
   ├─→ 创建 inventory_transaction（type: outbound，扣减种源）
   ├─→ 更新种源 current_quantity
   ├─→ 创建新的 inventory_stock（status: in_stock，作为种苗库存）
   ├─→ 创建 seedlings 记录（关联 sourceInstanceId）
   └─→ 返回成功
```

### 3.3 种植登记流程（可从种源或育苗获取）

```
场景A：从种源直接种植
1. 选择「来源类型」= 种源
2. 选择具体「种源」（从已入库种源中选择）
3. 填写使用数量 → 自动扣减种源

场景B：从育苗定植
1. 选择「来源类型」= 育苗
2. 选择具体「育苗批次」（从已入库的种苗中选择）
3. 填写定植数量 → 自动扣减育苗库存

流程：
   │
   ├─→ 校验：使用数量 <= 来源可用数量
   ├─→ 创建 inventory_transaction（type: outbound）
   ├─→ 更新来源 current_quantity
   ├─→ 创建新的 inventory_stock（作为种植库存）
   ├─→ 创建 plantings 记录（关联 sourceInstanceId）
   └─→ 返回成功
```

### 3.4 采收入库流程（可收种子/种苗/成品）

```
场景A：采收成品
1. 选择「来源类型」= 种植
2. 选择具体「种植批次」
3. 填写采收数量、品质等
4. 点击「确认入库」
   │
   ├─→ 创建 inventory_transaction（type: outbound，扣减种植）
   ├─→ 创建新的 inventory_stock（status: in_stock）
   ├─→ 创建 harvest_records（关联 instanceId）
   └─→ 返回成功

场景B：采收种子（从种植批次收种子）
1. 选择「采收类型」= 种子
2. 关联的种植批次
3. 填写采收数量
4. 「确认入库」→ 生成新的种子库存实例

场景C：采收种苗（从育苗批次或种植批次收苗）
1. 选择「采收类型」= 种苗
2. 关联的育苗/种植批次
3. 填写采收数量
4. 「确认入库」→ 生成新的种苗库存实例
```

### 3.5 数据追溯链路

```
追溯示例：成品番茄 → 种植批次 → 育苗批次 → 种源批次 → 供应商

1. 查看 harvest_records.instance_id = 'INS20260430001'
2. 关联 inventory_stock.instance_id = 'INS20260430001'
3. 获取 source_document_id = planting_id
4. 查看 plantings.source_instance_id = 'INS20260425001'（种苗库存）
5. 查看 seedlings.instance_id = 'INS20260425001'
6. 查看 seedlings.source_instance_id = 'INS20260420001'（种源库存）
7. 查看 seed_sources.instance_id = 'INS20260420001'
8. 查看 seed_sources.supplier_id = 'SUP001'（供应商）
```

---

## 四、API 接口规划

### 4.1 库存核心 API

```typescript
// src/services/inventoryService.ts

/**
 * 库存服务 - 核心 API
 */
export const inventoryService = {
  // 创建入库单据
  createInbound(params: {
    stockType: StockType;
    sourceType: StockSourceType;
    sourceOrigin: SourceOrigin;
    cropCode: string;
    quantity: number;
    unit: string;
    supplierId?: string;
    parentInstanceId?: string;
    productionPlanId?: string;
    sourceDocumentType?: string;
    sourceDocumentId?: string;
    sourceDocumentCode?: string;
    remarks?: string;
  }): Promise<InventoryStock>;

  // 出库（扣减库存）
  createOutbound(params: {
    instanceId: string;
    quantity: number;
    businessType: string;
    businessId: string;
    businessCode: string;
    remarks?: string;
  }): Promise<InventoryTransaction>;

  // 查询库存列表
  getStockList(params: {
    stockType?: StockType;
    sourceType?: StockSourceType;
    cropCode?: string;
    supplierId?: string;
    status?: string;
  }): Promise<InventoryStock[]>;

  // 查询可用库存（可用于选择的库存）
  getAvailableStock(params: {
    stockType: StockType;
    cropCode?: string;
  }): Promise<InventoryStock[]>;

  // 获取库存流水
  getTransactionList(params: {
    instanceId?: string;
    businessType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InventoryTransaction[]>;

  // 获取库存详情（含追溯链）
  getStockDetail(instanceId: string): Promise<{
    stock: InventoryStock;
    transactions: InventoryTransaction[];
    traceChain: InventoryStock[];  // 追溯链
  }>;

  // 库存调整
  adjustStock(params: {
    instanceId: string;
    newQuantity: number;
    reason: string;
  }): Promise<void>;
};
```

### 4.2 各模块关联 API

```typescript
// 种源服务 - 更新
export const seedSourceService = {
  // 创建种源（同步创建库存）
  createSeedSource(params: CreateSeedSourceParams): Promise<SeedSource>;

  // 获取种源列表（包含库存可用数量）
  getSeedSourceList(): Promise<SeedSourceWithStock[]>;
};

// 育苗服务 - 更新
export const seedlingService = {
  // 创建育苗（自动扣减种源库存）
  createSeedling(params: CreateSeedlingParams): Promise<Seedling>;

  // 获取可用种源列表（用于选择）
  getAvailableSeedSources(cropCode?: string): Promise<InventoryStock[]>;
};

// 种植服务 - 更新
export const plantingService = {
  // 创建种植（自动扣减来源库存）
  createPlanting(params: CreatePlantingParams): Promise<Planting>;

  // 获取可用来源列表（种源或育苗）
  getAvailableSources(params: {
    sourceType: 'seed' | 'seedling';
    cropCode?: string;
  }): Promise<InventoryStock[]>;
};

// 采收服务 - 更新
export const harvestService = {
  // 创建采收入库
  createHarvest(params: CreateHarvestParams): Promise<HarvestRecord>;

  // 获取可用采收来源
  getAvailableHarvestSources(): Promise<Planting[]>;
};
```

---

## 五、实施步骤

### Phase 1: 数据库层（优先）

1. **创建新表**
   - [ ] 创建 `inventory_stock` 表
   - [ ] 创建 `inventory_transaction` 表

2. **更新现有表**
   - [ ] seed_sources 表新增字段
   - [ ] seedlings 表新增字段
   - [ ] plantings 表新增字段
   - [ ] harvest_records 表新增字段

### Phase 2: 服务层

3. **实现库存核心服务**
   - [ ] 实现 `inventoryService.createInbound()`
   - [ ] 实现 `inventoryService.createOutbound()`
   - [ ] 实现库存查询和追溯 API

4. **更新各模块服务**
   - [ ] 更新 `seedSourceService` 集成库存
   - [ ] 更新 `seedlingService` 自动扣减种源
   - [ ] 更新 `plantingService` 自动扣减来源
   - [ ] 更新 `harvestService` 实现采收入库

### Phase 3: 前端页面

5. **更新种源管理页面**
   - [ ] 新增入库时调用库存 API
   - [ ] 显示库存可用数量

6. **更新育苗管理页面**
   - [ ] 选择种源时显示可用数量
   - [ ] 提交时自动扣减种源

7. **更新种植管理页面**
   - [ ] 支持从种源或育苗选择
   - [ ] 自动扣减来源库存

8. **更新采收管理页面**
   - [ ] 支持种子/种苗/成品三种采收类型
   - [ ] 入库自动创建库存记录

### Phase 4: 追溯与报表

9. **实现追溯功能**
   - [ ] 库存详情页显示完整追溯链
   - [ ] 各模块详情页显示关联信息

10. **数据初始化**
    - [ ] 现有数据迁移脚本（可选）
    - [ ] 历史数据关联 instanceId

---

## 六、验收标准

### 6.1 功能验收

| 功能 | 验收条件 |
|------|----------|
| 外购种源入库 | 选择供应商 → 填写信息 → 库存增加 → 可被育苗引用 |
| 育苗扣减种源 | 选择种源 → 填写使用量 → 种源可用数量减少 |
| 种植扣减来源 | 选择种源/育苗 → 定植 → 来源库存减少 |
| 采收入库 | 采收成品/种子/种苗 → 自动创建库存记录 |
| 追溯查询 | 输入采收单号 → 可追溯到供应商/种源/育苗/种植 |

### 6.2 数据一致性

| 校验点 | 预期结果 |
|--------|----------|
| 种源使用量 <= 采购量 | 校验通过 |
| 育苗使用量 <= 种源可用量 | 校验通过 |
| 定植量 <= 来源可用量 | 校验通过 |
| 采收量 <= 种植批次的可采数量 | 校验通过 |

### 6.3 构建验收

- [ ] `npm run build` 通过
- [ ] 所有 TypeScript 类型检查通过
- [ ] 数据库迁移脚本执行成功

---

## 七、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 存量数据迁移 | 历史数据无法追溯 | 分阶段迁移，优先新数据 |
| 库存扣减并发 | 同一库存被多次引用 | 使用事务锁 |
| 现有页面改造 | 改动较大影响现有功能 | 保持向后兼容 |

---

## 八、ADR（架构决策记录）

### Decision: 采用"库存中心化"架构

### Drivers
1. 统一管理：所有物资不论来源统一入库管理
2. 简化引用：使用方无需区分外购/自产
3. 数据追溯：通过 instanceId 实现全链路追溯
4. 库存一致性：自动扣减确保库存准确

### Alternatives considered
- **方案B（分散库存）**：各模块独立管理库存，通过 instanceId 关联
  - 优点：改动较小
  - 缺点：库存分散，难以统一管理；扣减逻辑分散，容易出错

### Why chosen
用户明确要求"统一入库"来简化业务复杂度，避免使用时要区分外购/自产。库存中心化是最符合这一需求的架构。

### Consequences
- 需要新增 `inventory_stock` 和 `inventory_transaction` 两张表
- 各模块创建/使用时需要调用库存服务
- 现有数据需要迁移或重新入库

### Follow-ups
- 评估是否需要库存预警功能
- 考虑是否需要批次管理
- 考虑是否需要有效期管理

---

*规划完成时间: 2026-04-30*
*版本: v1.0*
