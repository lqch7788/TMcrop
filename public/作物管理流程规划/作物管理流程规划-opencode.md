# 作物管理流程规划 v3.0

## 文档信息

- **规划日期**：2026-04-30
- **版本**：v3.0（整合 OpenCode + Claude + V2.0 规划精华）
- **规划目的**：实现种源管理、育苗管理、种植管理、采收入库四大模块的数据联动

---

## 一、核心设计原则

### 1.1 三大数据基础

```
┌─────────────────────────────────────────────────────────────────┐
│                         三大数据基础                              │
│                                                                 │
│   ┌───────────────────────┐    ┌───────────────────────┐      │
│   │    作物品种管理库      │    │      生产计划         │      │
│   │  CropVariety          │    │  ProductionPlan       │      │
│   │                       │    │                       │      │
│   │  - 作物类别           │    │  - 计划批次号         │      │
│   │  - 类型名称           │    │  - 关联品种           │      │
│   │  - 11位作物编码      │    │  - 计划数量           │      │
│   │  - 生长周期参数      │    │  - 基地信息          │      │
│   └───────────┬───────────┘    └───────────┬───────────┘      │
│               │                            │                   │
│               │  cropCode (必填)         │ productionPlanId │
│               │                            │   (必填)          │
│               ▼                            ▼                   │
│   ┌─────────────────────────────────────────────────────┐      │
│   │                    统一库存中心                        │      │
│   │               inventory_stock                       │      │
│   │              (instance_id 追溯核心)                │      │
│   └───────────┬─────────────────────────────────────┘      │
│               │                                            │
│               ▼                                            │
│   ┌─────────────────────────────────────────────────────┐      │
│   │                    四大业务模块                        │      │
│   │                                                       │      │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│      │
│   │   │ 种源管理 │→│ 育苗管理 │→│ 种植管理 │→│ 采收入库 ││      │
│   │   │SeedSource│  │Seedling │  │Planting │  │ Harvest ││      │
│   │   └─────────┘  └─────────┘  └─────────┘  └─────────┘│      │
│   │                                                       │      │
│   └─────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **品种库为唯一种源** | 所有模块的作物名称、编码、类别都从`CropVariety`选择，禁止手动输入 |
| **计划为必填关联** | 种源、种苗、作物订单必须关联`ProductionPlan`，否则无法创建 |
| **统一入库原则** | 种子、种苗、作物无论外购还是自产，都必须先入库登记 |
| **库存中心化** | 通过`instance_id`实现全链路库存追溯 |
| **库存流水追踪** | 每次库存变动记录流水，实现完整的变动历史 |
| **供应商联动** | 外购物资必须关联供应商管理模块（内部供应/基地/外部） |
| **循环闭环** | 采收种子→种源入库，采收种苗→育苗入库（可回流） |
| **多基地支持** | 支持集团公司下多基地的数据关联 |
| **并发安全** | 库存操作使用乐观锁/悲观锁机制 |

---

## 二、供应商与基地区分设计

### 2.1 供应商类型内置化

**设计思路**：供应商类型内置化到供应商数据中，通过 `isInternal` 属性区分自产/外购。

```typescript
// 供应商类型
type SupplierType = 'internal' | 'external' | 'base';

// 内部供应商（本公司）
{
  id: 'SUP_INTERNAL',
  name: '内部供应（本公司）',
  type: 'internal',
  isInternal: true,
  remarks: '系统预置，表示本公司自产物资'
}

// 基地供应商（多基地场景）
{
  id: 'SUP_BASE_001',
  name: '基地一（山东）',
  type: 'base',
  baseId: 'BASE_001',
  baseName: '基地一',
  isInternal: true,
  remarks: '基地供应商，表示基地一自产物资'
}

// 外部供应商
{
  id: 'SUP_EXT_001',
  name: '金色稻种有限公司',
  type: 'external',
  isInternal: false,
  remarks: '外部采购供应商'
}
```

### 2.2 预置供应商数据

系统初始化时，自动创建以下默认供应商：

| 供应商ID | 供应商名称 | 类型 | 说明 |
|---------|-----------|------|------|
| SUP_INTERNAL | 内部供应（本公司） | internal | 表示本公司自产 |
| 动态生成 | 基地一、基地二... | base | 根据实际基地创建 |

### 2.3 入库记录中区分自产/外购

通过 `supplierId` 的 `isInternal` 属性区分：

```typescript
interface InventoryStock {
  // ...
  supplierId: string;               // 供应商ID
  supplierName: string;           // 供应商名称
  supplierIsInternal: boolean;     // true=自产, false=外购

  // 仅自产时填写
  baseId?: string;               // 基地ID
  baseName?: string;              // 基地名称
}
```

---

## 三、数据模型设计

### 3.1 库存中心表 `inventory_stock`

```sql
-- 库存中心表（核心追溯表）
-- 存储每个入库实体的完整信息，通过 instance_id 追溯
CREATE TABLE inventory_stock (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL UNIQUE,  -- 实例ID（追溯核心，格式：INS+年月日+流水号）

  -- 库存类型
  stock_type TEXT NOT NULL,         -- seed|seedling|crop|harvest

  -- 来源类型
  source_type TEXT NOT NULL,        -- external_purchase|internal_production|harvest

  -- 作物信息（关联品种库 - 必填）
  crop_code TEXT NOT NULL,          -- 11位作物编码（来自品种库）
  crop_category TEXT,
  crop_name TEXT NOT NULL,
  crop_variety TEXT,

  -- 生产计划关联（必填）
  production_plan_id TEXT NOT NULL,
  production_plan_code TEXT NOT NULL,

  -- 数量信息
  initial_quantity INTEGER NOT NULL, -- 初始入库数量
  current_quantity INTEGER NOT NULL,  -- 当前库存数量（核心）
  unit TEXT,

  -- 供应商信息
  supplier_id TEXT,
  supplier_name TEXT,
  supplier_is_internal BOOLEAN DEFAULT FALSE,  -- true=自产, false=外购

  -- 基地信息（自产时必填）
  base_id TEXT,
  base_name TEXT,

  -- 溯源关系（父子链）
  parent_instance_id TEXT,          -- 父实例ID（用于追溯上游）

  -- 来源单据信息
  source_document_type TEXT,        -- seed_source|seedling|planting
  source_document_id TEXT,
  source_document_code TEXT,

  -- 状态
  status TEXT DEFAULT 'in_stock',  -- in_stock|allocated|depleted

  -- 并发控制（乐观锁）
  version INTEGER DEFAULT 1,        -- 版本号，用于并发控制

  -- 审计字段
  create_by TEXT,
  create_time TEXT,
  update_time TEXT
);

-- 索引设计
CREATE INDEX idx_stock_instance ON inventory_stock(instance_id);
CREATE INDEX idx_stock_type ON inventory_stock(stock_type);
CREATE INDEX idx_stock_plan ON inventory_stock(production_plan_id);
CREATE INDEX idx_stock_crop ON inventory_stock(crop_code);
CREATE INDEX idx_stock_supplier ON inventory_stock(supplier_id);
CREATE INDEX idx_stock_parent ON inventory_stock(parent_instance_id);
```

### 3.2 库存流水表 `inventory_transaction`

```sql
-- 库存流水表（变动追踪表）
-- 记录每次库存变动，用于完整追踪库存变化历史
CREATE TABLE inventory_transaction (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,          -- 关联的库存实例ID

  -- 流水类型
  transaction_type TEXT NOT NULL,     -- inbound|outbound|transfer|adjust

  -- 变动信息
  quantity_change INTEGER NOT NULL,    -- 变动数量（正数增加，负数减少）
  quantity_before INTEGER NOT NULL,    -- 变动前数量
  quantity_after INTEGER NOT NULL,     -- 变动后数量

  -- 关联业务
  business_type TEXT NOT NULL,        -- seed_source|seedling|planting|harvest|sale
  business_id TEXT,
  business_code TEXT,

  -- 操作信息
  operator TEXT,
  operate_time TEXT,
  remarks TEXT,

  -- 时间戳
  create_time TEXT
);

-- 索引设计
CREATE INDEX idx_txn_instance ON inventory_transaction(instance_id);
CREATE INDEX idx_txn_business ON inventory_transaction(business_type, business_id);
CREATE INDEX idx_txn_time ON inventory_transaction(create_time);
```

### 3.3 库存状态枚举

```typescript
export enum InventoryStatus {
  IN_STOCK = 'in_stock',      // 在库中
  ALLOCATED = 'allocated',    // 已分配（部分被引用）
  DEPLETED = 'depleted'       // 已耗尽
}

export enum TransactionType {
  INBOUND = 'inbound',       // 入库
  OUTBOUND = 'outbound',      // 出库
  TRANSFER = 'transfer',       // 调拨
  ADJUST = 'adjust'           // 调整
}
```

### 3.4 入库单号编码规则

| 类型 | 前缀 | 示例 |
|------|------|------|
| 库存实例 | INS | INS-20260426-001 |
| 种源入库 | RK-ZZ | RK-ZZ-20260426-001 |
| 种苗入库 | RK-ZM | RK-ZM-20260426-001 |
| 成品入库 | RK-CP | RK-CP-20260426-001 |

### 3.5 现有表结构更新

#### seed_sources 表

```sql
ALTER TABLE seed_sources ADD COLUMN instance_id TEXT;
ALTER TABLE seed_sources ADD COLUMN production_plan_id TEXT NOT NULL;
ALTER TABLE seed_sources ADD COLUMN production_plan_code TEXT NOT NULL;
ALTER TABLE seed_sources ADD COLUMN stock_status TEXT DEFAULT 'in_stock';
ALTER TABLE seed_sources ADD COLUMN supplier_is_internal BOOLEAN DEFAULT FALSE;
ALTER TABLE seed_sources ADD COLUMN base_id TEXT;
ALTER TABLE seed_sources ADD COLUMN base_name TEXT;
```

#### seedlings 表

```sql
ALTER TABLE seedlings ADD COLUMN instance_id TEXT;
ALTER TABLE seedlings ADD COLUMN source_instance_id TEXT;
ALTER TABLE seedlings ADD COLUMN production_plan_id TEXT NOT NULL;
ALTER TABLE seedlings ADD COLUMN production_plan_code TEXT NOT NULL;
```

#### plantings 表

```sql
ALTER TABLE plantings ADD COLUMN instance_id TEXT;
ALTER TABLE plantings ADD COLUMN source_instance_id TEXT;
ALTER TABLE plantings ADD COLUMN seedling_instance_id TEXT;
ALTER TABLE plantings ADD COLUMN production_plan_id TEXT NOT NULL;
ALTER TABLE plantings ADD COLUMN production_plan_code TEXT NOT NULL;
```

#### harvest_records 表

```sql
ALTER TABLE harvest_records ADD COLUMN instance_id TEXT;
ALTER TABLE harvest_records ADD COLUMN source_instance_id TEXT;
ALTER TABLE harvest_records ADD COLUMN production_plan_id TEXT NOT NULL;
ALTER TABLE harvest_records ADD COLUMN production_plan_code TEXT NOT NULL;
ALTER TABLE harvest_records ADD COLUMN is_seed_harvest BOOLEAN DEFAULT FALSE;
ALTER TABLE harvest_records ADD COLUMN is_seedling_harvest BOOLEAN DEFAULT FALSE;
```

---

## 四、服务层设计

### 4.1 统一库存服务 (inventoryService.ts)

```typescript
// ========== 实例管理 ==========

/**
 * 创建库存实例
 * @param record 库存数据
 * @returns 创建后的库存实例（包含 instance_id）
 */
export function createInventoryStock(record: {
  stockType: 'seed' | 'seedling' | 'crop' | 'harvest';
  sourceType: 'external_purchase' | 'internal_production' | 'harvest';
  cropCode: string;
  cropCategory?: string;
  cropName: string;
  cropVariety?: string;
  productionPlanId: string;
  productionPlanCode: string;
  initialQuantity: number;
  unit: string;
  supplierId: string;
  supplierName: string;
  supplierIsInternal: boolean;
  parentInstanceId?: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentCode?: string;
  baseId?: string;
  baseName?: string;
}): InventoryStock

/**
 * 根据 instance_id 获取库存实例
 */
export function getInventoryStockByInstanceId(instanceId: string): InventoryStock | undefined

/**
 * 获取库存列表（支持多条件筛选）
 */
export function getInventoryStockList(options?: {
  stockType?: 'seed' | 'seedling' | 'crop' | 'harvest';
  sourceType?: 'external_purchase' | 'internal_production' | 'harvest';
  productionPlanId?: string;
  cropCode?: string;
  supplierId?: string;
  baseId?: string;
  status?: InventoryStatus;
}): InventoryStock[]

// ========== 库存操作（带并发控制） ==========

/**
 * 入库操作（带并发控制）
 * @param instanceId 库存实例ID
 * @param quantity 入库数量
 * @param businessInfo 业务信息
 * @returns 是否成功
 */
export function inbound(
  instanceId: string,
  quantity: number,
  businessInfo: {
    businessType: string;
    businessId: string;
    businessCode: string;
    operator?: string;
    remarks?: string;
  }
): { success: boolean; transaction?: InventoryTransaction; error?: string }

/**
 * 出库操作（扣减库存，带并发控制）
 * @param instanceId 库存实例ID
 * @param quantity 出库数量
 * @param businessInfo 业务信息
 * @returns 是否成功
 */
export function outbound(
  instanceId: string,
  quantity: number,
  businessInfo: {
    businessType: string;
    businessId: string;
    businessCode: string;
    operator?: string;
    remarks?: string;
  }
): { success: boolean; transaction?: InventoryTransaction; error?: string }

/**
 * 库存调整（带并发控制）
 * @param instanceId 库存实例ID
 * @param newQuantity 新数量
 * @param businessInfo 业务信息
 * @returns 是否成功
 */
export function adjust(
  instanceId: string,
  newQuantity: number,
  businessInfo: {
    businessType: string;
    businessId: string;
    businessCode: string;
    operator?: string;
    remarks?: string;
  }
): { success: boolean; transaction?: InventoryTransaction; error?: string }

/**
 * 乐观锁校验
 * @param instanceId 库存实例ID
 * @param expectedVersion 期望的版本号
 * @returns 是否匹配
 */
export function validateVersion(instanceId: string, expectedVersion: number): boolean

// ========== 流水查询 ==========

/**
 * 获取库存流水列表
 */
export function getInventoryTransactionList(instanceId: string): InventoryTransaction[]

/**
 * 获取业务关联的库存流水
 */
export function getTransactionsByBusiness(
  businessType: string,
  businessId: string
): InventoryTransaction[]

// ========== 溯源查询 ==========

/**
 * 向上追溯（获取父实例链）
 */
export function traceUpstream(instanceId: string): {
  current: InventoryStock;
  parents: InventoryStock[];
}

/**
 * 向下追溯（获取子实例链）
 */
export function traceDownstream(instanceId: string): {
  current: InventoryStock;
  children: InventoryStock[];
}

/**
 * 完整追溯链查询（核心功能）
 */
export function traceFullChain(instanceId: string): {
  instance: InventoryStock;
  upstreamChain: InventoryStock[];      // 父实例链
  downstreamChain: InventoryStock[];     // 子实例链
  transactions: InventoryTransaction[];   // 变动流水
  productionPlan?: ProductionPlan;       // 关联生产计划
}

// ========== 统计与预警 ==========

/**
 * 获取库存统计
 */
export function getInventoryStats(options?: {
  stockType?: 'seed' | 'seedling' | 'crop' | 'harvest';
  productionPlanId?: string;
  baseId?: string;
}): {
  totalInstances: number;
  totalQuantity: number;
  byStatus: Record<InventoryStatus, number>;
  bySourceType: Record<string, number>;
}

/**
 * 获取库存预警
 * @description 低库存预警、过期预警、保质期预警
 */
export function getInventoryAlerts(): {
  lowStockAlerts: InventoryAlert[];      // 低库存预警
  expirationAlerts: InventoryAlert[];    // 即将过期预警
  expiredAlerts: InventoryAlert[];      // 已过期预警
}

/**
 * 校验库存是否可扣减（检查负库存）
 */
export function canOutbound(instanceId: string, quantity: number): {
  canOutbound: boolean;
  currentQuantity: number;
  error?: string;
}
```

### 4.2 供应商服务扩展 (supplierService.ts)

```typescript
/**
 * 获取内部供应商（自产用）
 */
export function getInternalSuppliers(): Supplier[]
// 返回 isInternal === true 的供应商

/**
 * 获取外部供应商（外购用）
 */
export function getExternalSuppliers(): Supplier[]
// 返回 isInternal === false 的供应商

/**
 * 获取所有基地供应商
 */
export function getBaseSuppliers(): Supplier[]
// 返回 type === 'base' 的供应商

/**
 * 根据ID获取供应商
 */
export function getSupplierById(id: string): Supplier | undefined

/**
 * 搜索供应商
 */
export function searchSuppliers(keyword: string): Supplier[]

/**
 * 验证供应商是否存在
 */
export function validateSupplier(supplierId: string): Supplier | null
```

---

## 五、模块联动流程

### 5.1 数量联动规则

| 操作 | 触发条件 | 联动效果 |
|------|---------|---------|
| 育苗创建 | 从种源入库选择来源 | 自动扣减种源 `current_quantity` |
| 育苗完成 | 创建种苗入库 | `source='internal_production'`，关联育苗记录 |
| 种植创建 | 从种源/种苗入库选择来源 | 自动扣减对应入库的 `current_quantity` |
| 种植完成 | 创建成品入库 | `source='internal_production'`，关联种植记录 |
| 采收创建 | 从成品入库选择来源 | 创建采收记录，扣减成品 `current_quantity` |
| 销售出库 | 从成品入库选择来源 | 自动扣减成品入库的 `current_quantity` |
| 循环闭环 | 采收种子/种苗 | 创建新的种源/种苗入库，可回流 |

### 5.2 种源入库流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      种源入库流程                                 │
│                                                                 │
│  1. 进入「种源管理」→ 点击「新增种源」                            │
│                                                                 │
│  2. 必填项检查：                                                 │
│     ├─ [✓] 选择「生产计划」← 必填（从生产计划列表选择）           │
│     ├─ [✓] 选择「作物品种」← 必填（从品种库选择，自动填充信息）   │
│     └─ [✓] 选择「供应商」← 必填（从供应商列表选择）               │
│          │                                                       │
│          │ 选择内部供应/基地 → 表示自产                           │
│          │ 选择外购供应商 → 表示外购                             │
│                                                                 │
│  3. 填写数量、单位、单价等                                        │
│                                                                 │
│  4. 点击「确认入库」                                              │
│     │                                                            │
│     ├─→ 系统生成 instance_id                                      │
│     ├─→ 创建 inventory_stock 记录                                 │
│     │    ├─ production_plan_id = 关联的生产计划ID                 │
│     │    ├─ crop_code = 品种库的11位编码                        │
│     │    ├─ supplier_id = 选择的供应商ID                          │
│     │    └─ supplier_is_internal = 判断是自产还是外购             │
│     ├─→ 创建 inventory_transaction（type: inbound）               │
│     ├─→ 创建 seed_sources 记录（关联 instance_id 和 production_plan_id）│
│     └─→ 返回入库成功                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 育苗登记流程（扣减种源）

```
┌─────────────────────────────────────────────────────────────────┐
│                      育苗登记流程                                 │
│                                                                 │
│  1. 进入「育苗管理」→ 点击「新增育苗」                            │
│                                                                 │
│  2. 必填项检查：                                                 │
│     ├─ [✓] 选择「生产计划」← 必填（需与种源关联的计划一致）       │
│     ├─ [✓] 选择「作物品种」← 必填（从品种库选择）               │
│     └─ [✓] 选择「种源」← 必填（从已入库的种源中选择）           │
│          │                                                       │
│          │ 显示：种源批号、作物信息、可用数量                     │
│          │ 输入：本次使用数量                                     │
│                                                                 │
│  3. 填写其他信息（场地、育苗方式等）                            │
│                                                                 │
│  4. 点击「确认」                                                  │
│     │                                                            │
│     ├─→ 校验：使用数量 <= 种源可用数量                          │
│     ├─→ 创建 inventory_transaction（type: outbound，扣减种源）     │
│     ├─→ 更新种源 current_quantity（乐观锁保护）                   │
│     ├─→ 创建新的 inventory_stock（作为种苗库存）                 │
│     │    └─ production_plan_id = 关联的生产计划ID               │
│     │    └─ source_type = 'internal_production'                │
│     ├─→ 创建 seedlings 记录                                       │
│     │    ├─ source_instance_id = 关联的种源库存实例ID          │
│     │    └─ production_plan_id = 关联的生产计划ID               │
│     └─→ 返回成功                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 种植登记流程（可从种源或育苗获取）

```
┌─────────────────────────────────────────────────────────────────┐
│                      种植登记流程                                 │
│                                                                 │
│  1. 进入「种植管理」→ 点击「新增种植」                            │
│                                                                 │
│  2. 选择「来源类型」：                                            │
│     ├─ [A] 从「种源」直接种植                                    │
│     │    └─ 选择具体种源（显示可用数量）                         │
│     │                                                           │
│     └─ [B] 从「育苗」定植                                        │
│          └─ 选择具体育苗批次（显示可用数量）                      │
│                                                                 │
│  3. 必填项检查：                                                 │
│     ├─ [✓] 选择「生产计划」← 必填（需与来源关联的计划一致）      │
│     ├─ [✓] 选择「作物品种」← 必填（从品种库选择）               │
│     └─ [✓] 填写「定植数量」                                      │
│                                                                 │
│  4. 点击「确认定植」                                              │
│     │                                                            │
│     ├─→ 校验：定植数量 <= 来源可用数量                           │
│     ├─→ 创建 inventory_transaction（type: outbound，扣减来源）     │
│     ├─→ 更新来源 current_quantity（乐观锁保护）                   │
│     ├─→ 创建新的 inventory_stock（作为种植库存）                 │
│     │    └─ production_plan_id = 关联的生产计划ID                │
│     ├─→ 创建 plantings 记录                                       │
│     │    ├─ source_instance_id = 来源库存实例ID                  │
│     │    └─ production_plan_id = 关联的生产计划ID                │
│     └─→ 返回成功                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 采收入库流程（可收种子/种苗/成品）

```
┌─────────────────────────────────────────────────────────────────┐
│                      采收入库流程                                 │
│                                                                 │
│  1. 进入「采收管理」→ 点击「新增采收」                            │
│                                                                 │
│  2. 选择「采收类型」：                                            │
│     ├─ [A] 成品采收                                             │
│     │    └─ 关联「种植批次」（选择已定植的种植记录）             │
│     │                                                           │
│     ├─ [B] 种子采收                                             │
│     │    └─ 关联「种植批次」或「育苗批次」（用于繁殖）           │
│     │    └─ 效果：生成新的种源库存，可回流到种源库               │
│     │                                                           │
│     └─ [C] 种苗采收                                             │
│          └─ 关联「育苗批次」或「种植批次」（用于移栽）           │
│          └─ 效果：生成新的种苗库存，可回流到育苗库               │
│                                                                 │
│  3. 必填项检查：                                                 │
│     ├─ [✓] 选择「生产计划」← 必填（关联成品采收的种植计划）     │
│     ├─ [✓] 选择「作物品种」← 必填（从品种库选择）               │
│     └─ [✓] 填写「采收数量」                                      │
│                                                                 │
│  4. 点击「确认入库」                                              │
│     │                                                            │
│     ├─→ 校验：采收数量 <= 批次可采数量                          │
│     ├─→ 创建 inventory_transaction（type: outbound，扣减来源）    │
│     ├─→ 更新来源 current_quantity（乐观锁保护）                   │
│     ├─→ 创建新的 inventory_stock（入库）                         │
│     │    ├─ stock_type = 采收类型（seed/seedling/crop）        │
│     │    └─ production_plan_id = 关联的生产计划ID                │
│     ├─→ 创建 harvest_records 记录                                 │
│     │    ├─ source_instance_id = 来源库存实例ID                  │
│     │    ├─ production_plan_id = 关联的生产计划ID                │
│     │    └─ is_seed_harvest / is_seedling_harvest             │
│     └─→ 返回成功                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 循环闭环说明

```
┌─────────────────────────────────────────────────────────────────┐
│                      循环闭环流程                                 │
│                                                                 │
│   采收种子 → 种源入库（种子库）←── 可重新用于育苗                 │
│                                                                 │
│   采收种苗 → 育苗入库（待定植）←── 可重新用于种植                 │
│                                                                 │
│   采收成品 → 产品入库（销售/库存）                                │
│                                                                 │
│   关键点：采收入库时，根据采收类型自动创建对应类型的库存记录       │
│          实现物料回流闭环                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、数据追溯链路

### 6.1 追溯模型

```
┌─────────────────────────────────────────────────────────────────┐
│                        完整追溯链路                                 │
│                                                                 │
│   ┌──────────────┐                                              │
│   │  供应商       │ ← 外部采购时必填                           │
│   │  Supplier    │                                              │
│   │  isInternal  │                                              │
│   └──────┬───────┘                                              │
│          │ supplier_id + supplier_is_internal                    │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │  品种库      │ ← 所有品种数据来源                          │
│   │ CropVariety │                                              │
│   └──────┬───────┘                                              │
│          │ crop_code                                             │
│          ▼                                                       │
│   ┌──────────────────────────────────────────────────────┐      │
│   │                  inventory_stock                       │      │
│   │                  (库存中心 - 核心追溯表)                │      │
│   │                                                       │      │
│   │   instance_id: "INS20260430001"                       │      │
│   │   production_plan_id: "PP20260425001"                  │      │
│   │   parent_instance_id: (上级实例ID)                      │      │
│   │   supplier_is_internal: false                            │      │
│   │   base_id: (基地ID)                                    │      │
│   │   version: 1  ← 乐观锁版本号                          │      │
│   │                                                       │      │
│   └──────┬───────────────────────────────────────────┘      │
│          │                                                  │
│          ├─────────────────┬─────────────────┐              │
│          │                 │                 │               │
│          ▼                 ▼                 ▼               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │  种源管理     │  │  育苗管理    │  │  种植管理    │       │
│   │ SeedSource  │  │  Seedling   │→│  Planting   │       │
│   └─────────────┘  └─────────────┘  └──────┬──────┘       │
│          │                 │                 │               │
│          │                 │                 │               │
│          └─────────────────┴────────┬────────┘               │
│                                   │                         │
│                                   ▼                         │
│                           ┌─────────────┐                   │
│                           │  采收入库    │                   │
│                           │  Harvest   │                   │
│                           └─────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 追溯查询示例

**场景：从成品番茄追溯到供应商**

```
步骤1：查看采收记录
  harvest_records.instance_id = 'INS20260430001'

步骤2：查看库存实例（获取生产计划）
  inventory_stock.instance_id = 'INS20260430001'
  → production_plan_id = 'PP20260425001'
  → parent_instance_id = 'INS20260425001' (种植库存)

步骤3：查看种植记录
  plantings.instance_id = 'INS20260425001'
  → source_instance_id = 'INS20260425001' (育苗库存)

步骤4：查看育苗记录
  seedlings.instance_id = 'INS20260425001'
  → source_instance_id = 'INS20260420001' (种源库存)

步骤5：查看种源记录
  seed_sources.instance_id = 'INS20260420001'
  → supplier_id = 'SUP_EXT_001'
  → crop_code = 'FR0301010201' (来自品种库)

步骤6：追溯完成
  成品番茄 → 种植批次 → 育苗批次 → 种源批次 → 供应商
```

### 6.3 库存流水追溯

```
┌─────────────────────────────────────────────────────────────────┐
│                      库存流水追溯                                 │
│                                                                 │
│  instance_id: INS20260430001 (成品番茄)                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  inventory_transaction 记录                              │   │
│  │                                                          │   │
│  │  T001: inbound  +5000kg  (采收入库)                     │   │
│  │  T002: outbound -200kg   (销售出库)                      │   │
│  │  T003: outbound -300kg   (销售出库)                      │   │
│  │  ...                                                     │   │
│  │                                                          │   │
│  │  当前库存: 4500kg   version: 3                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、品种库与生产计划的绑定关系

### 7.1 品种选择约束

```
┌─────────────────────────────────────────────────────────────────┐
│                      品种选择约束                                 │
│                                                                 │
│  生产计划 ──────────────────────────────────────────────────    │
│  │                                                            │
│  │  production_plan_id: "PP20260425001"                        │
│  │  crop_code: "FR0301010201"  ←── 计划绑定的品种             │
│  │                                                            │
│  └─────────────────────────────────────────────────────────── │
│                           │                                    │
│          ┌────────────────┼────────────────┐                   │
│          ▼                ▼                ▼                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│   │  种源新增    │  │  育苗新增    │  │  种植新增    │          │
│   │             │  │             │  │             │          │
│   │ 品种=FR03.. │  │ 品种=FR03.. │  │ 品种=FR03.. │          │
│   │     ✓       │  │     ✓       │  │     ✓       │          │
│   │ (一致)      │  │ (一致)      │  │ (一致)      │          │
│   └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                 │
│  约束：各模块选择的品种必须与关联的生产计划中的品种一致           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、并发控制机制

### 8.1 乐观锁实现

```typescript
/**
 * 出库操作 - 乐观锁版本
 */
export function outboundWithOptimisticLock(
  instanceId: string,
  quantity: number,
  expectedVersion: number,
  businessInfo: BusinessInfo
): OutboundResult {
  // 1. 读取当前库存
  const stock = getInventoryStockByInstanceId(instanceId);
  if (!stock) {
    return { success: false, error: '库存记录不存在' };
  }

  // 2. 版本校验
  if (stock.version !== expectedVersion) {
    return { success: false, error: '库存已被其他操作修改，请刷新后重试' };
  }

  // 3. 数量校验
  if (stock.current_quantity < quantity) {
    return { success: false, error: '库存不足' };
  }

  // 4. 执行扣减（原子操作）
  const newQuantity = stock.current_quantity - quantity;
  const newVersion = stock.version + 1;

  // 5. 更新（带条件，避免覆盖）
  const updated = updateInventoryStockWithVersion(instanceId, {
    current_quantity: newQuantity,
    version: newVersion,
    update_time: new Date().toISOString()
  }, expectedVersion);

  if (!updated) {
    return { success: false, error: '更新失败，库存已被其他操作修改' };
  }

  // 6. 记录流水
  const transaction = createTransaction({
    instance_id: instanceId,
    transaction_type: TransactionType.OUTBOUND,
    quantity_change: -quantity,
    quantity_before: stock.current_quantity,
    quantity_after: newQuantity,
    business_type: businessInfo.businessType,
    business_id: businessInfo.businessId,
    business_code: businessInfo.businessCode,
    operator: businessInfo.operator,
    operate_time: new Date().toISOString()
  });

  return { success: true, transaction, newVersion };
}
```

### 8.2 负库存校验

```typescript
/**
 * 校验库存是否允许扣减
 */
export function canOutbound(instanceId: string, quantity: number): CheckResult {
  const stock = getInventoryStockByInstanceId(instanceId);

  if (!stock) {
    return { canOutbound: false, error: '库存记录不存在' };
  }

  if (stock.current_quantity < quantity) {
    return {
      canOutbound: false,
      currentQuantity: stock.current_quantity,
      error: `库存不足：当前${stock.current_quantity}，需要${quantity}`
    };
  }

  return {
    canOutbound: true,
    currentQuantity: stock.current_quantity
  };
}
```

---

## 九、库存预警机制

### 9.1 预警类型

```typescript
interface InventoryAlert {
  alertId: string;
  alertType: 'low_stock' | 'expiring' | 'expired';
  alertLevel: 'info' | 'warning' | 'critical';

  instanceId: string;
  instanceCode: string;
  cropName: string;
  variety: string;

  currentQuantity: number;
  threshold: number;

  message: string;
  suggestedAction: string;

  createdAt: string;
}
```

### 9.2 预警规则

| 预警类型 | 触发条件 | 等级 |
|---------|---------|------|
| 低库存预警 | `current_quantity < min_stock_threshold` | warning |
| 即将过期预警 | `保质期 < 7天` | warning |
| 已过期预警 | `保质期 < 0` | critical |
| 库存耗尽预警 | `current_quantity = 0` | critical |

---

## 十、实施任务分解

### 阶段一：数据库层（优先级 P0）

| 任务 | 文件 | 内容 |
|------|------|------|
| D1.1 | 数据库 | 创建 `inventory_stock` 表 |
| D1.2 | 数据库 | 创建 `inventory_transaction` 表 |
| D1.3 | 数据库 | 为现有表新增字段（instance_id, production_plan_id 等） |
| D1.4 | 数据库 | 设计索引 |
| D1.5 | 数据库 | 预置供应商数据 |

### 阶段二：服务层 - 库存核心（优先级 P0）

| 任务 | 文件 | 内容 |
|------|------|------|
| S2.1 | `inventoryService.ts` | 实现 `createInventoryStock()` |
| S2.2 | `inventoryService.ts` | 实现 `inbound()` / `outbound()` 带并发控制 |
| S2.3 | `inventoryService.ts` | 实现 `traceUpstream()` / `traceDownstream()` |
| S2.4 | `inventoryService.ts` | 实现 `traceFullChain()` |
| S2.5 | `inventoryService.ts` | 实现 `getInventoryStats()` |
| S2.6 | `inventoryService.ts` | 实现 `getInventoryAlerts()` |
| S2.7 | `supplierService.ts` | 添加内部/外部/基地供应商查询方法 |

### 阶段三：服务层 - 模块联动（优先级 P1）

| 任务 | 文件 | 内容 |
|------|------|------|
| S3.1 | `seedSourceService.ts` | 集成库存创建 |
| S3.2 | `seedlingService.ts` | 自动扣减种源库存 |
| S3.3 | `plantingService.ts` | 自动扣减来源库存 |
| S3.4 | `harvestService.ts` | 实现采收入库 |

### 阶段四：前端 - 品种选择组件（优先级 P1）

| 任务 | 文件 | 内容 |
|------|------|------|
| F4.1 | 品种选择组件 | 从 CropVariety 读取数据 |
| F4.2 | 各业务模块 | 品种字段改为下拉选择 |
| F4.3 | 各业务模块 | 选择品种后自动填充字段 |

### 阶段五：前端 - 计划关联组件（优先级 P1）

| 任务 | 文件 | 内容 |
|------|------|------|
| F5.1 | 计划选择组件 | 从 ProductionPlan 读取数据 |
| F5.2 | 各业务模块 | 新增时必须选择生产计划 |
| F5.3 | 计划详情页 | 显示关联的所有业务记录 |

### 阶段六：前端 - 业务模块改造（优先级 P1）

| 任务 | 文件 | 内容 |
|------|------|------|
| F6.1 | 种源管理 | instance_id 展示、供应商必填、区分自产/外购 |
| F6.2 | 育苗管理 | 种源选择、库存扣减联动 |
| F6.3 | 种植管理 | 种源/育苗来源切换 |
| F6.4 | 采收管理 | 成品/种子/种苗三种采收类型 |

### 阶段七：追溯功能（优先级 P2）

| 任务 | 文件 | 内容 |
|------|------|------|
| F7.1 | 库存详情页 | 显示完整追溯链（上游+下游+流水） |
| F7.2 | 各模块详情页 | 显示关联信息 |
| F7.3 | 生产计划详情页 | 显示关联的所有业务记录 |

### 预计总工期：20-25天

---

## 十一、验证清单

### 11.1 入库功能验证

| 序号 | 测试场景 | 预期结果 |
|------|---------|---------|
| 1 | 外购种源入库时未选择供应商 | 提示"请选择供应商"，无法保存 |
| 2 | 外购种源入库时供应商为空 | 提示"供应商列表为空，请先添加供应商" |
| 3 | 自产种源入库时自动填充供应商 | 自动填充"内部供应（本公司）"或当前基地 |
| 4 | 入库后 current_quantity 数量正确 | current_quantity = initial_quantity |
| 5 | 多基地切换后入库 | 自动关联对应基地供应商 |
| 6 | 并发扣减测试 | 乐观锁防止超卖 |

### 11.2 联动功能验证

| 序号 | 测试场景 | 预期结果 |
|------|---------|---------|
| 1 | 育苗引用种源入库后 | 种源入库的 current_quantity 减少 |
| 2 | 育苗完成后创建种苗入库 | 种苗入库关联育苗记录 |
| 3 | 种植引用种苗入库后 | 种苗入库的 current_quantity 减少 |
| 4 | 种植完成后创建成品入库 | 成品入库关联种植记录 |
| 5 | 查看入库详情时显示被引用情况 | 显示所有引用该入库的下游记录 |

### 11.3 溯源功能验证

| 序号 | 测试场景 | 预期结果 |
|------|---------|---------|
| 1 | 从入库记录追溯供应商 | 显示供应商详细信息，含 isInternal 属性 |
| 2 | 从入库记录追溯来源记录 | 显示原始育苗/种植记录 |
| 3 | 从下游记录追溯到入库 | 显示完整的入库信息 |
| 4 | 从入库统计查看各基地产出 | 显示各基地的入库数量汇总 |
| 5 | 追溯链路完整性 | traceFullChain 返回 upstream + downstream + transactions |

### 11.4 循环闭环验证

| 序号 | 测试场景 | 预期结果 |
|------|---------|---------|
| 1 | 采收种子入库后 | 生成新的种源库存实例，stock_type='seed' |
| 2 | 采收种苗入库后 | 生成新的种苗库存实例，stock_type='seedling' |
| 3 | 采收成品入库后 | 生成新的成品库存实例，stock_type='harvest' |

### 11.5 并发安全验证

| 序号 | 测试场景 | 预期结果 |
|------|---------|---------|
| 1 | 同时扣减同一库存 | 乐观锁确保数据一致性 |
| 2 | 扣减数量超过库存 | 返回错误，不允许负库存 |
| 3 | 版本号不匹配时更新 | 返回版本冲突错误 |

---

## 十二、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 存量数据迁移 | 历史数据无计划关联 | 分阶段迁移，优先新数据 |
| 品种库数据不完整 | 无法选择品种 | 先完善品种库数据 |
| 并发库存扣减 | 同一库存被多次引用 | 使用乐观锁 version 字段 |
| 现有页面改造 | 改动较大影响现有功能 | 保持向后兼容 |
| 多基地权限 | 不同基地用户数据隔离 | 实现基地级权限控制 |

---

## 十三、术语表

| 术语 | 说明 |
|------|------|
| instance_id | 库存实例唯一ID，用于追溯 |
| parent_instance_id | 父实例ID，形成父子追溯链 |
| inventory_stock | 库存中心表，核心追溯表 |
| inventory_transaction | 库存流水表，记录每次变动 |
| 内部供应商 | isInternal=true 的供应商，表示自产 |
| 外部供应商 | isInternal=false 的供应商，表示外购 |
| 基地供应商 | type=base 的供应商，用于区分不同基地的自产 |
| current_quantity | 当前库存数量 |
| initial_quantity | 初始入库数量 |
| version | 乐观锁版本号，用于并发控制 |
| 循环闭环 | 采收种子/种苗可回流到种源/育苗库 |

---

## 十四、ADR（架构决策记录）

### Decision: 双核心驱动 + 库存中心化 + 流水追踪 + 循环闭环架构

### Drivers
1. **数据规范性**：品种信息统一从品种库获取，避免各模块数据不一致
2. **业务可控性**：所有业务订单必须关联生产计划，便于统筹管理
3. **追溯完整性**：通过 instance_id 实现全链路追溯
4. **库存一致性**：统一入库+自动扣减+流水追踪确保库存准确
5. **循环利用**：采收种子/种苗可回流到上游库存
6. **并发安全**：乐观锁机制防止库存超卖

### Why chosen
用户明确要求：
- 品种必须来自品种库
- 订单必须关联生产计划
- 统一入库管理
- 完整的数据联动追溯
- 循环闭环（采收可回流）
- 自产与外购通过供应商区分

### Consequences
- 需要新增 `inventory_stock` 和 `inventory_transaction` 两张表
- 各模块创建/使用时需要调用库存服务
- 需要实现乐观锁机制处理并发
- 现有数据需要迁移或重新入库
- 需要实现完整的溯源 API

### Follow-ups
- 评估是否需要在品种库中维护"供应商推荐"
- 考虑是否需要在生产计划中设置库存预警
- 考虑是否需要批次管理和有效期管理

---

*规划完成时间: 2026-04-30*
*版本: v3.0（整合 OpenCode + Claude + V2.0 规划精华）*
