# 物料流转追溯系统实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现六模块（种源/育苗/种植/采收/库存/出库）物料流转追溯闭环，包含 material_flow_log 流水表、不可变流水策略、四条断链修复、外部来源支持、字段补齐、5 个追溯报表。

**架构：** 双轨制——内部流转不经过作物库存直接写入 material_flow_log；对外出入库经过作物库存。后端路由层统一处理流水写入（与业务操作同事务）。统计报表单表聚合查询。

**技术栈：** React 18 + Zustand 5 + Express 4 + SQLite (better-sqlite3) + TypeScript 5

---

## 文件结构

| 文件 | 职责 | 类型 |
|------|------|------|
| `server/src/db/materialFlowLog.ts` | material_flow_log 建表 + CRUD 函数 | 新建 |
| `server/src/db/fixMissingSchema.ts` | 增量迁移：unit/deleted_at 字段 | 修改 |
| `server/src/db/schema.ts` | 建表语句追加 | 修改 |
| `server/src/lib/sourceCategoryMapper.ts` | 各模块枚举到 source_category 映射 | 新建 |
| `server/src/services/flowLogService.ts` | 流水写入/查询/统计服务 | 新建 |
| `server/src/routes/materialFlowLog.ts` | 追溯/统计 API 路由 | 新建 |
| `server/src/routes/seedling.ts` | with-deduct 扩展 + PUT 修正 + 外部种源 | 修改 |
| `server/src/routes/planting.ts` | POST 加种源扣减 + 育苗扣减 + 流水 | 修改 |
| `server/src/routes/seedSource.ts` | POST/PUT 流水写入 | 修改 |
| `server/src/routes/harvest.ts` | POST 事务化 + 多产品拆条 + saleType | 修改 |
| `server/src/routes/inventory.ts` | inbound 流水写入 | 修改 |
| `server/src/routes/inventoryTransactions.ts` | 出库白名单 + targetType 关联 | 修改 |
| `src/constants/outboundConstants.ts` | businessType 枚举新增 internal_seedling/source | 修改 |
| `src/types/materialFlow.ts` | 前端类型定义 | 新建 |
| `src/services/apiMaterialFlowService.ts` | 前端 API 服务 | 新建 |
| `src/stores/useMaterialFlowStore.ts` | 前端 Zustand Store | 新建 |
| `src/components/farm/seedling/modals/AddModal.tsx` | 外部种源 UI | 修改 |
| `src/components/farm/planting/modals/AddModal.tsx` | 外部来源 UI | 修改 |
| `src/components/farm/harvest/modals/AddModal.tsx` | saleType 字段 | 修改 |
| `src/components/farm/harvest/HarvestPage.tsx` | saleType 联动 | 修改 |
| `src/components/farm/seedling/modals/EditModal.tsx` | propagationType 展示 | 修改 |
| `src/components/warehouse/OutboundModal.tsx` | targetType/targetId 选择器 | 修改 |
| `src/components/farm/inventory/AddStockModal.tsx` | variety→cropVariety | 修改 |
| `src/pages/material-flow/` | 追溯报表页面（4 个页面） | 新建 |

---

## Phase 1: 基础（数据库 + 枚举 + 工具）

### 任务 1-1：material_flow_log 建表

**文件：**
- 创建：`server/src/db/materialFlowLog.ts`
- 修改：`server/src/db/schema.ts` (末尾追加)

- [ ] **步骤 1：创建 materialFlowLog.ts 建表函数**

```typescript
// server/src/db/materialFlowLog.ts
import { getDatabase, saveDatabase } from './index';

export function createMaterialFlowLogTable(): void {
  const db = getDatabase();
  db.run(`
    CREATE TABLE IF NOT EXISTS material_flow_log (
      id TEXT PRIMARY KEY,
      oid INTEGER UNIQUE,
      flow_type TEXT NOT NULL,
      crop_code TEXT,
      crop_name TEXT NOT NULL,
      crop_variety TEXT,
      source_type TEXT,
      source_id TEXT,
      source_code TEXT,
      source_quantity REAL,
      source_unit TEXT,
      source_category TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_code TEXT NOT NULL,
      target_quantity REAL,
      target_unit TEXT,
      business_id TEXT,
      business_code TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT
    )
  `);
  // 创建索引加速追溯查询
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_source ON material_flow_log(source_type, source_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_target ON material_flow_log(target_type, target_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_code ON material_flow_log(source_code, target_code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_type_time ON material_flow_log(flow_type, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_flow_crop ON material_flow_log(crop_name)');
  saveDatabase();
}
```

- [ ] **步骤 2：在 schema.ts 末尾调用建表**

```typescript
// server/src/db/schema.ts 末尾追加
import { createMaterialFlowLogTable } from './materialFlowLog';
createMaterialFlowLogTable();
export { createMaterialFlowLogTable };
```

- [ ] **步骤 3：在 fixMissingSchema.ts 中追加幂等迁移**

```typescript
// server/src/db/fixMissingSchema.ts — fixMissingSchema() 函数末尾（deduplicateDictionaries 调用之前）追加：
  // ============================================================
  // 2026-06-13: material_flow_log 流水表 + 存量表字段补齐
  // ============================================================
  seedLog.info('开始 material_flow_log 流水表迁移...\n');
  createMaterialFlowLogTable();
  
  // seedlings 加 unit 字段
  try {
    db.run('ALTER TABLE seedlings ADD COLUMN unit TEXT DEFAULT \'株\'');
    seedLog.info('  ✓ seedlings.unit 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seedlings.unit 已存在，跳过');
    } else { seedLog.error(`  ✗ seedlings.unit 失败: ${e.message}`); }
  }
  // seedlings 加 deleted_at 字段
  try {
    db.run('ALTER TABLE seedlings ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ seedlings.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seedlings.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ seedlings.deleted_at 失败: ${e.message}`); }
  }
  // plantings 加 unit 字段
  try {
    db.run('ALTER TABLE plantings ADD COLUMN unit TEXT DEFAULT \'株\'');
    seedLog.info('  ✓ plantings.unit 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - plantings.unit 已存在，跳过');
    } else { seedLog.error(`  ✗ plantings.unit 失败: ${e.message}`); }
  }
  // plantings 加 deleted_at 字段
  try {
    db.run('ALTER TABLE plantings ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ plantings.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - plantings.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ plantings.deleted_at 失败: ${e.message}`); }
  }
  // seed_sources 加 deleted_at 字段
  try {
    db.run('ALTER TABLE seed_sources ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ seed_sources.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seed_sources.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ seed_sources.deleted_at 失败: ${e.message}`); }
  }
  
  // material_flow_log 加 business_code 字段（表已由 createMaterialFlowLogTable 创建，这里做幂等补列）
  try {
    db.run('ALTER TABLE material_flow_log ADD COLUMN business_code TEXT');
    seedLog.info('  ✓ material_flow_log.business_code 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - material_flow_log.business_code 已存在，跳过');
    } else { seedLog.error(`  ✗ material_flow_log.business_code 失败: ${e.message}`); }
  }
```

- [ ] **步骤 4：在 schema.ts 的 seedlings 建表语句中追加 unit 和 deleted_at 列**

```typescript
// server/src/db/schema.ts — seedlings CREATE TABLE 语句追加：
// 在 `update_time TEXT` 之后添加：
// `unit TEXT DEFAULT '株',`
// `deleted_at TEXT,`
```

- [ ] **步骤 5：在 schema.ts 的 plantings 建表语句中追加 unit 和 deleted_at 列**

```typescript
// server/src/db/schema.ts — plantings CREATE TABLE 语句中：
// 在 update_time 之后追加 unit 和 deleted_at 列
// 确保与 fixMissingSchema 新增的 ALTER TABLE 一致
```

- [ ] **步骤 6：在 schema.ts 的 seed_sources 建表语句中追加 deleted_at 列**

```typescript
// server/src/db/schema.ts — seed_sources CREATE TABLE 语句：
// 在 update_time 之后追加 deleted_at TEXT
```

- [ ] **步骤 7：验证建表**

```bash
cd D:/TMcrop/yuanxingtu/V1.1/server && npx tsx src/db/fixMissingSchema.ts 2>&1 | grep -E "material_flow_log|unit|deleted_at"
```
预期：所有 "✓ ... 字段已添加" 或 "- 已存在，跳过" 提示（幂等）。

- [ ] **步骤 8：Commit**

```bash
git add -A && git commit -m "feat: material_flow_log 建表 + seedlings/plantings/seed_sources 加 unit/deleted_at 字段"
```

---

### 任务 1-2：source_category 公共枚举与映射器

**文件：**
- 创建：`src/types/materialFlow.ts`
- 创建：`server/src/lib/sourceCategoryMapper.ts`

- [ ] **步骤 1：创建前端类型定义**

```typescript
// src/types/materialFlow.ts
/** 流转类型枚举 */
export type FlowType =
  | 'inventory→seed_source' | 'plan→seed_source'
  | 'seed_source→seedling' | 'seed_source→planting'
  | 'seedling→planting' | 'planting→seed_source'
  | 'planting→harvest' | 'seedling→harvest'
  | 'harvest→inventory'
  | 'external→seedling' | 'external→planting'
  | 'inventory→external' | 'inventory→planting'
  | 'inventory→seedling' | 'correction';

/** 来源分类统一枚举 */
export enum FlowSourceCategory {
  EXTERNAL_PURCHASE = 'external_purchase',
  SELF_PRODUCED = 'self_produced',
  BREEDING = 'breeding',
  ASEXUAL = 'asexual',
  GIFT = 'gift',
  TRANSFER = 'transfer',
  MANUAL = 'manual',
  EXTERNAL = 'external',
  OTHER = 'other',
}

/** 流转日志记录 */
export interface MaterialFlowLog {
  id: string;
  oid: number;
  flowType: FlowType;
  cropCode?: string;
  cropName: string;
  cropVariety?: string;
  sourceType?: string;
  sourceId?: string;
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  sourceCategory?: string;
  targetType: string;
  targetId: string;
  targetCode: string;
  targetQuantity?: number;
  targetUnit?: string;
  businessId?: string;
  businessCode?: string;
  createdAt: string;
  createdBy?: string;
}

/** 来源分类映射：各模块枚举 -> FlowSourceCategory */
export const PROPAGATION_TO_SOURCE_CATEGORY: Record<string, FlowSourceCategory> = {
  EXTERNAL: FlowSourceCategory.EXTERNAL_PURCHASE,
  BREEDING: FlowSourceCategory.BREEDING,
  SEED_SAVING: FlowSourceCategory.SELF_PRODUCED,
  ASEXUAL: FlowSourceCategory.ASEXUAL,
};

export const INVENTORY_SOURCE_TO_CATEGORY: Record<string, FlowSourceCategory> = {
  external_purchased: FlowSourceCategory.EXTERNAL_PURCHASE,
  self_produced: FlowSourceCategory.SELF_PRODUCED,
  gift: FlowSourceCategory.GIFT,
  transfer: FlowSourceCategory.TRANSFER,
  manual: FlowSourceCategory.MANUAL,
};
```

- [ ] **步骤 2：创建后端映射器**

```typescript
// server/src/lib/sourceCategoryMapper.ts
/** 种源 propagationType -> source_category */
export function mapPropagationToCategory(propagationType: string | null | undefined): string {
  const map: Record<string, string> = {
    EXTERNAL: 'external_purchase',
    BREEDING: 'breeding',
    SEED_SAVING: 'self_produced',
    ASEXUAL: 'asexual',
  };
  return (propagationType && map[propagationType]) ? map[propagationType] : 'other';
}

/** 库存 sourceType -> source_category */
export function mapInventorySourceToCategory(sourceType: string | null | undefined): string {
  const map: Record<string, string> = {
    external_purchased: 'external_purchase',
    self_produced: 'self_produced',
    gift: 'gift',
    transfer: 'transfer',
    manual: 'manual',
    external: 'external',
  };
  return (sourceType && map[sourceType]) ? map[sourceType] : 'other';
}

/** 出库 businessType -> flow_type（需要写流水的类型） */
export function mapOutboundToFlowType(businessType: string): string | null {
  const map: Record<string, string> = {
    customer_sale: 'inventory→external',
    internal_planting: 'inventory→planting',
    internal_seedling: 'inventory→seedling',
    internal_seed_source: 'inventory→seed_source',
    transfer_out: 'inventory→external',
  };
  return map[businessType] || null;
}

/** 出库白名单：不需要写 flow_log 的类型 */
export function isOutboundSkipped(businessType: string): boolean {
  return mapOutboundToFlowType(businessType) === null;
}
```

- [ ] **步骤 3：更新 outboundConstants.ts 枚举**

```typescript
// src/constants/outboundConstants.ts — OutboundBusinessType 枚举新增两行：
  INTERNAL_SEEDLING = 'internal_seedling',
  INTERNAL_SEED_SOURCE = 'internal_seed_source',

// OUTBOUND_BUSINESS_TYPE_META 新增：
  [OutboundBusinessType.INTERNAL_SEEDLING]:  { label: '内部育苗', color: 'bg-lime-100 text-lime-700' },
  [OutboundBusinessType.INTERNAL_SEED_SOURCE]: { label: '内部种源', color: 'bg-teal-100 text-teal-700' },
```

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
npm run build 2>&1 | tail -3 && cd server && npx tsc --noEmit 2>&1 | tail -3
```
预期：前端和后端均编译通过。

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: source_category 枚举 + flowType 映射器 + businessType 新增 internal_seedling/source"
```

---

## Phase 2: 后端流水写入

### 任务 2-1：flowLogService 流水写入核心

**文件：**
- 创建：`server/src/services/flowLogService.ts`

- [ ] **步骤 1：创建 flowLogService.ts**

```typescript
// server/src/services/flowLogService.ts
import { getDatabase, saveDatabase } from '../db';
import { v4 } from 'uuid';

interface FlowLogInput {
  flow_type: string;
  crop_code?: string;
  crop_name: string;
  crop_variety?: string;
  source_type?: string;
  source_id?: string;
  source_code?: string;
  source_quantity?: number;
  source_unit?: string;
  source_category?: string;
  target_type: string;
  target_id: string;
  target_code: string;
  target_quantity?: number;
  target_unit?: string;
  business_id?: string;
  business_code?: string;
  created_by?: string;
}

let _oidCounter: number | null = null;
function nextOid(): number {
  if (_oidCounter === null) {
    const db = getDatabase();
    const rows = db.exec("SELECT COALESCE(MAX(oid), 0) FROM material_flow_log");
    _oidCounter = Number(rows[0]?.values?.[0]?.[0] || 0);
  }
  return ++_oidCounter;
}

/** 写入一条流水记录（调用方必须自行管理事务） */
export function writeFlowLog(input: FlowLogInput): string {
  const db = getDatabase();
  const id = input.business_id || v4();
  const oid = nextOid();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO material_flow_log (
      id, oid, flow_type, crop_code, crop_name, crop_variety,
      source_type, source_id, source_code, source_quantity, source_unit, source_category,
      target_type, target_id, target_code, target_quantity, target_unit,
      business_id, business_code, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, oid, input.flow_type, input.crop_code || null, input.crop_name, input.crop_variety || null,
    input.source_type || null, input.source_id || null, input.source_code || null,
    input.source_quantity ?? null, input.source_unit || null, input.source_category || null,
    input.target_type, input.target_id, input.target_code,
    input.target_quantity ?? null, input.target_unit || null,
    input.business_id || null, input.business_code || null,
    now, input.created_by || null,
  ]);
  return id;
}

/** 写入 correction 补偿流水 */
export function writeCorrection(params: {
  flow_type: string;
  source_type?: string;
  source_id?: string;
  target_type: string;
  target_id: string;
  source_quantity_delta: number;
  source_unit?: string;
  crop_name: string;
  crop_variety?: string;
  created_by?: string;
}): void {
  writeFlowLog({
    flow_type: 'correction',
    crop_name: params.crop_name,
    crop_variety: params.crop_variety,
    source_type: params.source_type,
    source_id: params.source_id,
    target_type: params.target_type,
    target_id: params.target_id,
    source_quantity: params.source_quantity_delta,
    source_unit: params.source_unit,
    created_by: params.created_by,
    target_code: params.target_id,
    source_category: 'manual',
  });
}
```

- [ ] **步骤 2：验证后端编译**

```bash
cd D:/TMcrop/yuanxingtu/V1.1/server && npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: flowLogService — 流水写入 + correction 补偿写入"
```

---

### 任务 2-2：种源 POST/PUT 接入流水

**文件：**
- 修改：`server/src/routes/seedSource.ts`

- [ ] **步骤 1：在 POST /api/seed-sources 路由中写入 flow_log**

找到 `POST '/'` 路由，在 `saveDatabase()` 之前插入（定位到创建 seed_source 成功后）：

```typescript
// 写入 material_flow_log — 种源创建
const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
const { writeFlowLog } = require('../services/flowLogService');
const propagationType = body.propagation_type || body.propagationType || '';
const sourceCategory = mapPropagationToCategory(propagationType);
// 判定 flow_type：有种源关联且非外部来源时是 plan→seed_source
const hasPlanSource = !!(body.production_plan_id || body.productionPlanCode);
const flowType = hasPlanSource ? 'plan→seed_source' : 'plan→seed_source';
writeFlowLog({
  flow_type: flowType,
  crop_name: cropName,
  crop_variety: cropVariety,
  source_type: null,
  source_id: null,
  source_code: null,
  source_quantity: null,
  source_category: sourceCategory,
  target_type: 'seed_source',
  target_id: newId,
  target_code: finalSeedCode,
  target_quantity: finalQuantity,
  target_unit: finalUnit || '袋',
  business_code: finalSeedCode,
  created_by: body.create_by || body.createBy || '',
});
```

- [ ] **步骤 2：在 PUT /api/seed-sources/:id 路由中加入数量变更检测**

```typescript
// 如果 quantity 变更，写 correction 流水
const oldRecord = /* 查询当前记录 */;
const newQuantity = body.quantity || body.initial_count || oldRecord.quantity;
if (Math.abs(newQuantity - oldRecord.quantity) > 0.001) {
  const { writeCorrection } = require('../services/flowLogService');
  writeCorrection({
    flow_type: 'plan→seed_source',
    target_type: 'seed_source',
    target_id: id,
    source_quantity_delta: newQuantity - oldRecord.quantity,
    source_unit: body.unit || oldRecord.unit || '袋',
    crop_name: oldRecord.crop_name,
    crop_variety: oldRecord.crop_variety,
    created_by: body.create_by || '',
  });
}
```

- [ ] **步骤 3：验证后端编译**

```bash
cd D:/TMcrop/yuanxingtu/V1.1/server && npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **步骤 4：Commit**

```bash
git add -A && git commit -m "feat: 种源 POST/PUT 接入 material_flow_log 写入 + correction"
```

---

### 任务 2-3：育苗 with-deduct 扩展 + 外部种源

**文件：**
- 修改：`server/src/routes/seedling.ts`

- [ ] **步骤 1：扩展 /with-deduct 事务内写入 flow_log**

在 `POST '/with-deduct'` 的 COMMIT 之前（第 233 行附近），写入 flow_log：

```typescript
    // 步骤3.5：写入 material_flow_log（在 COMMIT 前，同事务）
    const { writeFlowLog } = require('../services/flowLogService');
    const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
    const sourceCategory = existing.propagation_status
      ? mapPropagationToCategory(existing.propagation_status)
      : 'external_purchase';
    writeFlowLog({
      flow_type: 'seed_source→seedling',
      crop_name: crop_name,
      crop_variety: crop_variety,
      source_type: 'seed_source',
      source_id: sourceId,
      source_code: (seedling as any).source_code || source_name || sourceId,
      source_quantity: safeCount,
      source_unit: '粒',
      source_category: sourceCategory,
      target_type: 'seedling',
      target_id: newId,
      target_code: seedling_code,
      target_quantity: seedling_quantity || 0,
      target_unit: '株',
      business_code: seedling_code,
      created_by: create_by || '',
    });
```

- [ ] **步骤 2：新增外部种源自动创建逻辑**

在 `POST '/with-deduct'` 路由同级，新增 `external-source` 子路由的处理逻辑。当 `sourceId` 为空且传入 `externalSource` 字段时：

```typescript
// 自动创建简化的 seed_source 记录
const externalSeedId = `ES${Date.now()}`;
db.run(`INSERT INTO seed_sources (id, seed_code, crop_name, crop_variety, ...)
  VALUES (?, ?, ?, ?, ...)`, [externalSeedId, externalSourceCode, cropName, ...]);
// 写 flow_log: external→seedling
writeFlowLog({
  flow_type: 'external→seedling',
  source_type: null,
  source_id: null,
  source_code: externalSourceCode,
  source_quantity: externalQuantity,
  source_category: 'external',
  target_type: 'seedling',
  target_id: newId,
  target_code: seedling_code,
  ...
});
```

- [ ] **步骤 3：修改 PUT /api/seedlings/:id 加入 correction**

```typescript
// 在 PUT 路由中，检测数量字段变更
const changes: Array<{ oldVal: number; newVal: number }> = [];
if (body.seedling_quantity !== undefined) {
  changes.push({ oldVal: old.seedling_quantity, newVal: body.seedling_quantity });
}
if (body.survival_quantity !== undefined) {
  changes.push({ oldVal: old.survival_quantity, newVal: body.survival_quantity });
}
if (changes.length > 0) {
  const { writeCorrection } = require('../services/flowLogService');
  const delta = changes.reduce((sum, c) => sum + (c.newVal - c.oldVal), 0);
  if (Math.abs(delta) > 0.001) {
    writeCorrection({
      flow_type: 'seed_source→seedling',
      target_type: 'seedling', target_id: id,
      source_quantity_delta: delta,
      source_unit: '株',
      crop_name: old.crop_name,
      crop_variety: old.crop_variety,
      created_by: body.create_by || '',
    });
  }
}
```

- [ ] **步骤 4：修改 DELETE /api/seedlings/:id 为软删除**

```typescript
// 将物理 DELETE 改为：
db.run('UPDATE seedlings SET deleted_at = ? WHERE id = ?', [now, id]);
// 不删除 flow_log 记录
```

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: 育苗 with-deduct 扩展流水写入 + 外部种源自动创建 + PUT correction + 软删除"
```

---

### 任务 2-4：种植 POST 接入流水 + 种源/育苗扣减

**文件：**
- 修改：`server/src/routes/planting.ts`

- [ ] **步骤 1：重构 POST /api/plantings 为事务化 + 扣减 + 流水写入**

将当前 L208-283 的单步 INSERT 改为事务包装：

```typescript
router.post('/', (req: Request, res: Response) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const body = req.body;
  const newId = body.id || `PL${Date.now()}`;
  const sourceType = body.source_type || body.sourceType || '';
  const sourceId = body.source_id || body.sourceId || '';
  const sourceCode = body.source_name || body.sourceCode || '';
  const plantingCount = body.planting_quantity || body.plantingCount || 0;

  db.exec('BEGIN');
  try {
    let flowType = '';
    // 扣减上游数量
    if (sourceType === 'seed_source' && sourceId) {
      // 扣减种源 remaining_quantity
      const seedCheck = db.prepare('SELECT remaining_quantity, propagation_status FROM seed_sources WHERE id = ?');
      seedCheck.bind([sourceId]);
      let seedInfo: any = null;
      if (seedCheck.step()) { seedInfo = seedCheck.getAsObject(); }
      seedCheck.free();
      if (seedInfo && seedInfo.remaining_quantity >= plantingCount) {
        db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
          [plantingCount, now, sourceId]);
      }
      flowType = 'seed_source→planting';
    } else if (sourceType === 'seedling' && sourceId) {
      // 扣减育苗可定植数 (通过 increasePlantedCount 逻辑)
      const sdlCheck = db.prepare('SELECT survival_quantity, planted_quantity FROM seedlings WHERE id = ? AND deleted_at IS NULL');
      sdlCheck.bind([sourceId]);
      let sdlInfo: any = null;
      if (sdlCheck.step()) { sdlInfo = sdlCheck.getAsObject(); }
      sdlCheck.free();
      if (sdlInfo) {
        const available = (sdlInfo.survival_quantity || 0) - (sdlInfo.planted_quantity || 0);
        if (available >= plantingCount) {
          db.run('UPDATE seedlings SET planted_quantity = planted_quantity + ? WHERE id = ?',
            [plantingCount, sourceId]);
        } else {
          throw new Error(`育苗可定植数量不足 (可用:${available}, 需要:${plantingCount})`);
        }
      }
      flowType = 'seedling→planting';
    } else {
      flowType = 'external→planting';
    }

    // INSERT planting（现有代码 L258-276）
    db.run(`INSERT INTO plantings (...) VALUES (...)`, [/* 现有参数 */]);

    // 写入 flow_log
    const { writeFlowLog } = require('../services/flowLogService');
    writeFlowLog({
      flow_type: flowType,
      crop_name: finalCropName,
      crop_variety: finalCropVariety,
      source_type: sourceType || null,
      source_id: sourceId || null,
      source_code: sourceCode || null,
      source_quantity: plantingCount,
      source_unit: '株',
      source_category: null, // 由后端从上游记录反查
      target_type: 'planting',
      target_id: newId,
      target_code: finalPlantCode,
      target_quantity: plantingCount,
      target_unit: '株',
      business_code: finalPlantCode,
      created_by: finalCreateBy,
    });

    db.exec('COMMIT');
    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
```

- [ ] **步骤 2：PUT /api/plantings/:id 加入 correction + 软删除**

```typescript
// PUT 路由中检测 planting_quantity 变更
if (body.planting_quantity !== undefined && old.planting_quantity !== body.planting_quantity) {
  const delta = body.planting_quantity - old.planting_quantity;
  writeCorrection({
    flow_type: 'seed_source→planting', // 或其他 flow_type
    target_type: 'planting', target_id: id,
    source_quantity_delta: delta,
    source_unit: '株',
    crop_name: old.crop_name,
    crop_variety: old.crop_variety,
  });
}
// DELETE 改为软删除
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 种植 POST 事务化扣减 + 流水写入 + correction + 软删除"
```

---

### 任务 2-5：采收入库接入流水 + 多产品拆条 + saleType

**文件：**
- 修改：`server/src/routes/harvest.ts`
- 修改：`server/src/services/harvest.service.ts`

- [ ] **步骤 1：在 harvest POST 路由中按 saleType 分流**

```typescript
// 采收 POST 路由中
const saleType = body.sale_type || body.saleType || 'external_sale';
const products = body.products || [];

if (saleType === 'external_sale') {
  // 创建 inventory_stock（现有逻辑）+ 写 flow_log
  for (const product of products) {
    // 每个 product 一条 flow_log
    writeFlowLog({
      flow_type: batchSourceType === 'planting' ? 'planting→harvest' : 'seedling→harvest',
      crop_name: product.crop_name || product.cropName,
      crop_variety: product.crop_variety || product.variety || product.cropVariety,
      source_type: batchSourceType,
      source_id: batchSourceId,
      source_code: batchCode,
      source_quantity: product.harvest_quantity || product.harvestQuantity || 0,
      source_unit: product.unit || 'kg',
      target_type: 'inventory_stock',
      target_id: stockInstanceId,
      target_code: harvestCode,
      target_quantity: product.harvest_quantity || product.harvestQuantity || 0,
      target_unit: product.unit || 'kg',
      business_code: harvestCode,
    });
  }
} else {
  // self_use: 不创建 inventory_stock，只写 flow_log（target_type = 'self_use' 或记录为产量）
  for (const product of products) {
    writeFlowLog({
      flow_type: batchSourceType === 'planting' ? 'planting→harvest' : 'seedling→harvest',
      source_type: batchSourceType,
      source_id: batchSourceId,
      source_code: batchCode,
      source_quantity: product.harvest_quantity || product.harvestQuantity || 0,
      source_unit: product.unit || 'kg',
      target_type: 'self_use',
      target_id: harvestId,
      target_code: harvestCode,
      target_quantity: product.harvest_quantity || product.harvestQuantity || 0,
      target_unit: product.unit || 'kg',
      business_code: harvestCode,
      crop_name: product.crop_name || product.cropName,
      crop_variety: product.crop_variety || product.variety || product.cropVariety,
    });
  }
}
```

- [ ] **步骤 2：接入 createOneWithInventory 事务方法**

```typescript
// 替换 harvestPage 前端的两步调用
// 前端调用 POST /api/harvest/with-inventory
import { harvestService } from '../services/harvest.service';
const result = await harvestService.createOneWithInventory(record, products);
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 采收入库 saleType 分流 + 多产品拆条 flow_log + with-inventory 事务接入"
```

---

### 任务 2-6：库存入库 + 出库接入流水

**文件：**
- 修改：`server/src/routes/inventory.ts`
- 修改：`server/src/routes/inventoryTransactions.ts`

- [ ] **步骤 1：inventory inbound 写入 flow_log**

在 `POST /api/inventory/inbound` 成功后：

```typescript
writeFlowLog({
  flow_type: 'NULL→inventory',
  crop_name: cropName,
  crop_variety: cropVariety,
  source_type: null,
  source_category: mapInventorySourceToCategory(sourceType),
  target_type: 'inventory_stock',
  target_id: instanceId,
  target_code: businessCode,
  target_quantity: quantity,
  target_unit: unit,
  business_code: businessCode,
  created_by: createdBy,
});
```

- [ ] **步骤 2：outbound 按白名单写 flow_log**

在 `POST /api/inventory-transactions` 成功后：

```typescript
const flowType = mapOutboundToFlowType(businessType);
if (flowType) {
  writeFlowLog({
    flow_type: flowType,
    crop_name: stock.cropName,
    crop_variety: stock.cropVariety,
    source_type: 'inventory_stock',
    source_id: stock.instanceId,
    source_code: stock.businessCode || stock.instanceId,
    source_quantity: quantity,
    source_unit: stock.unit,
    source_category: mapInventorySourceToCategory(stock.sourceType),
    target_type: businessType, // customer_sale → null target
    target_id: targetId || stock.instanceId,
    target_code: businessCode || '',
    target_quantity: quantity,
    target_unit: stock.unit,
    business_code: businessCode || '',
  });
}
// damage_loss, gift_sample, inventory_adjust, return_inbound, other 不写
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 库存入库 + 出库（白名单）接入 material_flow_log 写入"
```

---

## Phase 3: 修复四条断链

### 任务 3-1：R1 — 前端育苗改用 /with-deduct 原子端点

**文件：**
- 修改：`src/services/apiSeedlingService.ts`
- 修改：`src/components/farm/seedling/modals/AddModal.tsx`

- [ ] **步骤 1：在 apiSeedlingService.ts 中新增 withDeduct 方法**

```typescript
// src/services/apiSeedlingService.ts 新增
export async function addSeedlingWithDeduct(data: {
  sourceId: string;
  count: number;
  seedling: Record<string, unknown>;
}): Promise<{ id: string }> {
  const result = await enhancedApiClient.post<{ id: string }>('/seedlings/with-deduct', {
    sourceId: data.sourceId,
    count: data.count,
    seedling: data.seedling,
  });
  return result;
}
```

- [ ] **步骤 2：修改 AddModal handleSubmit 使用 withDeduct**

```typescript
// AddModal.tsx handleSubmit 中
// 替换两步调用（addSeedling + decreaseAvailableCount）为单步：
const deductCount = formData.calculateMode === 'propagation'
  ? formData.motherPlantCount
  : formData.initialCount;

const result = await addSeedlingWithDeduct({
  sourceId: formData.sourceId,
  count: deductCount,
  seedling: buildSeedlingPayload(),
});
```

- [ ] **步骤 3：验证构建**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **步骤 4：Commit**

```bash
git add -A && git commit -m "fix(R1): 育苗前端改用 /with-deduct 原子端点替代两步调用"
```

---

### 任务 3-2：R2 — 种植 AddModal 保存后回写 plantedCount

**文件：**
- 修改：`src/components/farm/planting/modals/AddModal.tsx`

- [ ] **步骤 1：在 planting AddModal handleSubmit 中追加 increasePlantedCount 调用**

```typescript
// planting AddModal.tsx handleSubmit 中
if (formData.originPath === 'via_seedling' && formData.sourceId) {
  // 经育苗移栽 → 回写育苗 plantedCount
  await useSeedlingStore.getState().increasePlantedCount(
    formData.sourceId,
    formData.plantingCount
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add -A && git commit -m "fix(R2): 种植经育苗移栽后回写 increasePlantedCount"
```

**注意：R2 的种源扣减已在 Phase 2 任务 2-4 的后端事务中实现。**

---

### 任务 3-3：R4 — 采收前端接入事务端点

**文件：**
- 修改：`src/components/farm/harvest/HarvestPage.tsx`

- [ ] **步骤 1：将 handleCreateRecord 中的两步调用替换为事务端点**

```typescript
// HarvestPage.tsx handleCreateRecord 中
// 替换：先 addItem 创建 harvest，再 inventoryInbound
// 改为：直接调用 createOneWithInventory

const { createOneWithInventory } = await import('../../../services/apiHarvestService');
const result = await createOneWithInventory({
  harvest: record,
  products: productList,
  stockType,
  warehouseId: newRecord.warehouseId,
});
```

- [ ] **步骤 2：Commit**

```bash
git add -A && git commit -m "fix(R4): 采收前端接入 createOneWithInventory 事务端点"
```

---

## Phase 4: 前端 UI 补齐

### 任务 4-1：育苗/种植 AddModal 外部来源 UI

**文件：**
- 修改：`src/components/farm/seedling/modals/AddModal.tsx`
- 修改：`src/components/farm/planting/modals/AddModal.tsx`

- [ ] **步骤 1：育苗 AddModal 添加"内部种源/外部种源"开关**

在种源选择器上方添加：

```tsx
const [sourceMode, setSourceMode] = useState<'internal' | 'external'>('internal');

{/* 来源类型切换 */}
<div className="flex gap-2 mb-3">
  <Button size="sm" variant={sourceMode === 'internal' ? 'default' : 'secondary'}
    onClick={() => { setSourceMode('internal'); setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '' })); }}>
    内部种源
  </Button>
  <Button size="sm" variant={sourceMode === 'external' ? 'default' : 'secondary'}
    onClick={() => setSourceMode('external')}>
    外部种源
  </Button>
</div>

{sourceMode === 'internal' ? (
  /* 现有 combogrid 种源选择器 */
) : (
  /* 外部种源手动录入 */
  <>
    <div>
      <Label>外部种源批号</Label>
      <Input value={formData.externalSeedCode} onChange={...} placeholder="手动填写"/>
    </div>
    <div>
      <Label>种源名称</Label>
      <Input value={formData.externalSeedName} onChange={...} placeholder="如：红富士自留种"/>
    </div>
    <div>
      <Label>数量</Label>
      <Input type="number" value={formData.externalSeedQuantity} onChange={...} />
    </div>
    <div>
      <Label>来源说明</Label>
      <TextArea value={formData.externalSeedNote} onChange={...} rows={2} />
    </div>
  </>
)}
```

- [ ] **步骤 2：种植 AddModal 同样添加"内部来源/外部来源"开关**

结构与育苗对称，外部来源字段：外部批号、名称、数量、来源说明。

- [ ] **步骤 3：Verification build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **步骤 4：Commit**

```bash
git add -A && git commit -m "feat: 育苗/种植 AddModal 新增外部来源开关 + 手动录入字段"
```

---

### 任务 4-2：采收 AddModal saleType 字段 + HarvestPage 联动

**文件：**
- 修改：`src/components/farm/harvest/modals/AddModal.tsx`
- 修改：`src/components/farm/harvest/HarvestPage.tsx`

- [ ] **步骤 1：AddModal 添加 saleType 选择器**

```tsx
{/* 采收去向 */}
<div>
  <Label className="text-gray-900">采收去向</Label>
  <div className="flex gap-2">
    <Button size="sm" variant={addForm.saleType === 'self_use' ? 'default' : 'secondary'}
      onClick={() => onFormChange('saleType', 'self_use')}>
      自用（不入库）
    </Button>
    <Button size="sm" variant={addForm.saleType === 'external_sale' ? 'default' : 'secondary'}
      onClick={() => onFormChange('saleType', 'external_sale')}>
      外售（入作物库存）
    </Button>
  </div>
</div>

{/* 选外售时展示仓库选择器，选自用时隐藏 */}
{addForm.saleType === 'external_sale' && (
  /* 现有 warehouseId 选择器 */
)}
```

- [ ] **步骤 2：HarvestPage newRecord 初始化添加 saleType 默认值**

```typescript
saleType: 'external_sale' as 'self_use' | 'external_sale',
```

- [ ] **步骤 3：handleCreateRecord 按 saleType 分流**

```typescript
if (newRecord.saleType === 'self_use') {
  // 只创建 harvest 记录，不创建 inventory_stock
  await addItem(record);
} else {
  // 现有逻辑：创建 harvest + inventory_stock
}
```

- [ ] **步骤 4：Commit**

```bash
git add -A && git commit -m "feat: 采收 AddModal 新增 saleType 自用/外售分流"
```

---

### 任务 4-3：出库弹窗 targetType/targetId 动态选择器

**文件：**
- 修改：`src/components/warehouse/OutboundModal.tsx`

- [ ] **步骤 1：添加 targetType 联动选择逻辑**

```tsx
const [targetId, setTargetId] = useState('');
const [targetCode, setTargetCode] = useState('');

// 根据 businessType 展示不同的目标选择器
const renderTargetSelector = () => {
  switch (businessType) {
    case 'internal_planting':
      return <PlantingSelect value={targetId} onChange={setTargetId} />;
    case 'internal_seedling':
      return <SeedlingSelect value={targetId} onChange={setTargetId} />;
    case 'internal_seed_source':
      return <SeedSourceSelect value={targetId} onChange={setTargetId} />;
    default:
      return null; // customer_sale, transfer_out 不需要 target
  }
};
```

- [ ] **步骤 2：更新出库提交数据包含 targetId**

```typescript
const submitData = {
  ...baseData,
  target_type: businessType,
  target_id: targetId || undefined,
  target_code: targetCode || undefined,
};
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 出库弹窗新增 targetType/targetId 动态选择器"
```

---

### 任务 4-4：字段名统一 + 缺字段补齐

**文件：**
- 修改：`src/components/farm/inventory/AddStockModal.tsx`
- 修改：`src/components/farm/seedling/modals/EditModal.tsx`
- 修改：`src/components/farm/harvest/modals/AddModal.tsx`

- [ ] **步骤 1：AddStockModal — variety → cropVariety 统一**

```tsx
// ProductDetail 接口中的 variety → cropVariety
// 表单 state 中同步修改字段名
// 提交时字段名映射：variety → cropVariety
```

- [ ] **步骤 2：采收 ProductDetail — variety → cropVariety 统一**

```tsx
// AddModal.tsx ProductDetail 接口:
interface ProductDetail {
  cropVariety: string;  // 原 variety
  // ... 其他字段不变
}
```

- [ ] **步骤 3：种源 EditModal 展示 propagationType**

```tsx
{/* 种源 EditModal 中添加只读展示 */}
<div>
  <Label className="text-gray-900">入库方式</Label>
  <Input value={PROPAGATION_TYPE_LABELS[record.propagationType] || '-'} readOnly
    className={deepInputClass + " bg-gray-50"} />
</div>
```

- [ ] **步骤 4：后端 stock 对象返回 cropVariety 和 sourceCategory**

在 `inventory.service.ts` 的 `getList` 查询中增加 JOIN 或子查询获取原始入库记录的 cropVariety 和 sourceCategory。

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "fix: 字段名统一 variety→cropVariety + 种源EditModal补propagationType + stock对象补字段"
```

---

## Phase 5: 追溯报表

### 任务 5-1：后端追溯报表 API

**文件：**
- 创建：`server/src/routes/materialFlowLog.ts`

- [ ] **步骤 1：创建 materialFlowLog.ts 路由文件**

```typescript
// server/src/routes/materialFlowLog.ts
import express from 'express';
import { getDatabase } from '../db';
const router = express.Router();

// GET /api/material-flow-log — 流水列表（分页）
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, flowType, cropName, sourceCode, targetCode, startDate, endDate } = req.query;
  const db = getDatabase();
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (flowType) { where += ' AND flow_type = ?'; params.push(flowType); }
  if (cropName) { where += ' AND crop_name LIKE ?'; params.push(`%${cropName}%`); }
  if (sourceCode) { where += ' AND source_code = ?'; params.push(sourceCode); }
  if (targetCode) { where += ' AND target_code = ?'; params.push(targetCode); }
  if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND created_at <= ?'; params.push(endDate); }
  const offset = (Number(page) - 1) * Number(pageSize);
  const countRows = db.exec(`SELECT COUNT(*) FROM material_flow_log ${where}`, params);
  const total = Number(countRows[0]?.values?.[0]?.[0] || 0);
  const rows = db.exec(`SELECT * FROM material_flow_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), offset]);
  res.json({ success: true, data: { list: rows, total, page: Number(page), pageSize: Number(pageSize) } });
});

// GET /api/material-flow-log/trace — 单批次全链路追溯
router.get('/trace', (req, res) => {
  const { code } = req.query;
  const db = getDatabase();
  const rows = db.exec(
    `SELECT * FROM material_flow_log WHERE source_code = ? OR target_code = ? ORDER BY created_at ASC`,
    [code, code]
  );
  res.json({ success: true, data: rows });
});

// GET /api/material-flow-log/stats/by-crop — 年度用料统计
router.get('/stats/by-crop', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const db = getDatabase();
  const rows = db.exec(`
    SELECT crop_name, source_category, SUM(source_quantity) as total_qty, source_unit,
           COUNT(DISTINCT target_code) as batch_count
    FROM material_flow_log
    WHERE flow_type = 'seed_source→seedling'
      AND created_at BETWEEN ? AND ?
    GROUP BY crop_name, source_category, source_unit
    ORDER BY crop_name, total_qty DESC
  `, [`${year}-01-01`, `${year}-12-31`]);
  res.json({ success: true, data: rows });
});

// GET /api/material-flow-log/stats/by-source — 种植用料统计
router.get('/stats/by-source', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const db = getDatabase();
  const rows = db.exec(`
    SELECT crop_name, flow_type, source_category, SUM(source_quantity) as total_qty, source_unit
    FROM material_flow_log
    WHERE flow_type IN ('seed_source→planting', 'seedling→planting')
      AND created_at BETWEEN ? AND ?
    GROUP BY crop_name, flow_type, source_category, source_unit
    ORDER BY crop_name, total_qty DESC
  `, [`${year}-01-01`, `${year}-12-31`]);
  res.json({ success: true, data: rows });
});

// GET /api/material-flow-log/stats/annual — 全链路年度总览
router.get('/stats/annual', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const db = getDatabase();
  const rows = db.exec(`
    SELECT flow_type, crop_name, COUNT(*) as flow_count,
           SUM(source_quantity) as total_consumed, source_unit
    FROM material_flow_log
    WHERE created_at BETWEEN ? AND ?
    GROUP BY flow_type, crop_name, source_unit
    ORDER BY flow_type, crop_name
  `, [`${year}-01-01`, `${year}-12-31`]);
  res.json({ success: true, data: rows });
});

// GET /api/material-flow-log/stats/inventory-trace — 库存来源追溯
router.get('/stats/inventory-trace', (req, res) => {
  const { instanceId } = req.query;
  const db = getDatabase();
  const rows = db.exec(`
    SELECT * FROM material_flow_log
    WHERE target_type = 'inventory_stock' AND target_id = ?
  `, [instanceId]);
  res.json({ success: true, data: rows });
});

export default router;
```

- [ ] **步骤 2：在 server/src/index.ts 中注册路由**

```typescript
import materialFlowLogRouter from './routes/materialFlowLog';
app.use('/api/material-flow-log', materialFlowLogRouter);
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 追溯报表后端 API — 5 个端点（列表/追溯/统计）"
```

---

### 任务 5-2：前端追溯报表页面

**文件：**
- 创建：`src/services/apiMaterialFlowService.ts`
- 创建：`src/stores/useMaterialFlowStore.ts`
- 创建：`src/pages/material-flow/MaterialFlowPage.tsx`
- 创建：`src/pages/material-flow/tabs/TraceTab.tsx`
- 创建：`src/pages/material-flow/tabs/SeedlingStatsTab.tsx`
- 创建：`src/pages/material-flow/tabs/PlantingStatsTab.tsx`
- 创建：`src/pages/material-flow/tabs/AnnualOverviewTab.tsx`

- [ ] **步骤 1：创建前端 API 服务**

```typescript
// src/services/apiMaterialFlowService.ts
import { enhancedApiClient } from '../lib/apiClient';

export async function getFlowLogs(params: {
  page?: number; pageSize?: number; flowType?: string;
  cropName?: string; sourceCode?: string; targetCode?: string;
  startDate?: string; endDate?: string;
}) {
  return enhancedApiClient.get('/material-flow-log', params);
}

export async function traceFlow(code: string) {
  return enhancedApiClient.get('/material-flow-log/trace', { code });
}

export async function getCropStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/by-crop', { year });
}

export async function getSourceStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/by-source', { year });
}

export async function getAnnualStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/annual', { year });
}

export async function getInventoryTrace(instanceId: string) {
  return enhancedApiClient.get('/material-flow-log/stats/inventory-trace', { instanceId });
}
```

- [ ] **步骤 2：创建 Zustand Store**

```typescript
// src/stores/useMaterialFlowStore.ts
import { create } from 'zustand';
import * as flowService from '../services/apiMaterialFlowService';

interface MaterialFlowState {
  logs: any[]; total: number; loading: boolean;
  traceData: any[]; statsData: any[];
  loadLogs: (params: any) => Promise<void>;
  loadTrace: (code: string) => Promise<void>;
  loadStats: (type: string, params: any) => Promise<void>;
}

export const useMaterialFlowStore = create<MaterialFlowState>()((set) => ({
  logs: [], total: 0, loading: false,
  traceData: [], statsData: [],
  loadLogs: async (params) => {
    set({ loading: true });
    const data = await flowService.getFlowLogs(params);
    set({ logs: data.list || [], total: data.total || 0, loading: false });
  },
  loadTrace: async (code) => {
    const data = await flowService.traceFlow(code);
    set({ traceData: data || [] });
  },
  loadStats: async (type, params) => {
    set({ loading: true });
    let data;
    if (type === 'crop') data = await flowService.getCropStats(params?.year);
    else if (type === 'source') data = await flowService.getSourceStats(params?.year);
    else if (type === 'annual') data = await flowService.getAnnualStats(params?.year);
    set({ statsData: data || [], loading: false });
  },
}));

export { useMaterialFlowStore };
```

- [ ] **步骤 3：创建 MaterialFlowPage 主页面（Tab 切换）**

```tsx
// src/pages/material-flow/MaterialFlowPage.tsx
import { useState } from 'react';
import { BarChart3, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import TraceTab from './tabs/TraceTab';
import SeedlingStatsTab from './tabs/SeedlingStatsTab';
import PlantingStatsTab from './tabs/PlantingStatsTab';
import AnnualOverviewTab from './tabs/AnnualOverviewTab';

export default function MaterialFlowPage() {
  const [activeTab, setActiveTab] = useState<'trace' | 'seedling' | 'planting' | 'annual'>('trace');
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">物料流转追溯</h1>
        <p className="text-gray-500 mt-1">全链路物料流转记录与分析</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-0">
        <div className="flex gap-6 border-b border-gray-200">
          <Button variant="ghost" className={`relative pb-3 ${activeTab === 'trace' ? 'text-emerald-600' : ''}`}
            onClick={() => setActiveTab('trace')}>
            <Search className="w-4 h-4" /> 批次追溯
            {activeTab === 'trace' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
          </Button>
          <Button variant="ghost" className={`relative pb-3 ${activeTab === 'seedling' ? 'text-emerald-600' : ''}`}
            onClick={() => setActiveTab('seedling')}>
            <BarChart3 className="w-4 h-4" /> 育苗用料
            {activeTab === 'seedling' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
          </Button>
          {/* planting, annual tabs 同样结构 */}
        </div>
      </div>
      {activeTab === 'trace' && <TraceTab />}
      {activeTab === 'seedling' && <SeedlingStatsTab />}
      {activeTab === 'planting' && <PlantingStatsTab />}
      {activeTab === 'annual' && <AnnualOverviewTab />}
    </div>
  );
}
```

- [ ] **步骤 4：创建 TraceTab（批次追溯）**

输入批号（SSxxx/SDxxx/ZZxxx/HSxxx），展示全链路流转链（时间线样式）。

- [ ] **步骤 5：创建 SeedlingStatsTab / PlantingStatsTab / AnnualOverviewTab**

各 Tab 调用对应 API，用表格 + 饼图/柱状图展示数据。

- [ ] **步骤 6：在路由中注册页面**

```typescript
// 在 App.tsx 或路由配置中添加
{ path: '/material-flow', element: <MaterialFlowPage /> }
```

- [ ] **步骤 7：Commit**

```bash
git add -A && git commit -m "feat: 物料流转追溯报表页面 — 4 个 Tab（追溯/育苗/种植/年度）"
```

---

### 任务 5-3：集成注册 + 导航

**文件：**
- 修改：导航配置文件（MainLayout 或 Sidebar）

- [ ] **步骤 1：在侧边栏导航中添加入口**

```tsx
// MainLayout 中的 navItems 数组追加
{ path: '/material-flow', label: '流转追溯', icon: BarChart3 }
```

- [ ] **步骤 2：最终验证完整链路**

```bash
# 完整构建
npm run build 2>&1 | tail -5
cd server && npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 流转追溯导航入口 + 全链路构建验证"
```

---

## 依赖关系图

```
Phase 1 (基础)
  ├── 1-1 material_flow_log 建表
  └── 1-2 source_category 枚举 + 映射器
    ↓
Phase 2 (后端流水)
  ├── 2-1 flowLogService
  ├── 2-2 种源 POST/PUT → 流水
  ├── 2-3 育苗 with-deduct → 流水 (依赖 2-1)
  ├── 2-4 种植 POST → 流水 + 扣减 (依赖 2-1)
  ├── 2-5 采收 POST → 流水 + saleType (依赖 2-1)
  └── 2-6 库存入库/出库 → 流水 (依赖 2-1, 1-2)
    ↓
Phase 3 (修复断链)
  ├── 3-1 R1: 育苗 /with-deduct (依赖 2-3)
  ├── 3-2 R2: 种植回写 plantedCount (依赖 2-4)
  └── 3-3 R4: 采收事务端点 (依赖 2-5)
    ↓
Phase 4 (前端 UI)
  ├── 4-1 外部来源 UI (依赖 2-3)
  ├── 4-2 saleType UI (依赖 2-5)
  ├── 4-3 出库 targetType 选择器 (依赖 2-6)
  └── 4-4 字段名统一 (独立)
    ↓
Phase 5 (追溯报表)
  ├── 5-1 后端报表 API (依赖 Phase 2)
  ├── 5-2 前端报表页面 (依赖 5-1)
  └── 5-3 导航注册 (依赖 5-2)
```
