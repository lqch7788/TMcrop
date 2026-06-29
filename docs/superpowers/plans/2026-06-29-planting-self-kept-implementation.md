# 种植自留种功能合并 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把"残株回种源"+"自交种子入种源"两个去向合并为"种植自留种"，加"采收形态"字段，新增 seed_form 列存到 seed_sources，在种源管理列表的"种源类型"列显示。

**Architecture:** 后端保留 executeCirculation PROPAGATION+seed_source 主流程不动，仅扩展入参 seedForm + 写新列；前端 HarvestRecordModal destination 4→3，去除 quantity_refill subType；列表 SQL 用 CASE WHEN 兼容历史 destination 数据。

**Tech Stack:** React 18 + TypeScript + Vite, Zustand, Express + better-sqlite3/sql.js, Zod

**Spec:** `docs/superpowers/specs/2026-06-29-planting-self-kept-design.md`

---

## 文件结构（先看分解）

| 文件 | 改动类型 | 职责 |
|---|---|---|
| `server/src/db/fixMissingSchema.ts` | Modify (+3 行) | seed_form 列迁移 |
| `server/src/services/circulation.service.ts` | Modify (~20 行) | executePropagation 接受 seedForm 写新列 + deriveSeedFormSubType 派生函数 |
| `server/src/routes/planting.ts` | Modify (~30 行) | POST/PUT 白名单更新 + seedForm 校验 + 派生 + GET 列表 SQL 适配 |
| `src/types/crop.ts` | Modify (~5 行) | PlantingHarvestRecord + AddHarvestRecordInput 扩展 seedForm / destination |
| `src/components/farm/planting/modals/HarvestRecordModal.tsx` | Modify (~50 行) | destination 选项 4→3 + 选择 planting_self_kept 时显示采收形态下拉 |
| `src/components/farm/planting/components/PlantingTable.tsx` | Modify (~10 行) | 「残株回种源」「自交种子」合并显示为「种植自留种」 |
| `src/pages/seedSource/*` 或 `src/components/seedSource/*` | Modify (~10 行) | 「种源类型」列显示 seed_form |

**新增**：
| 文件 | 职责 |
|---|---|
| `server/src/__tests__/plantingSelfKept.test.ts` | 单元测试：executePropagation 接受 seedForm + 派生函数 |
| `server/src/__tests__/plantingSelfKept.e2e.test.ts` | 集成测试：POST /plantings/:id/harvest-records 端到端 |

---

## Phase 1：DB 层

### Task 1：fixMissingSchema 加 seed_form 列迁移

**Files:**
- Modify: `server/src/db/fixMissingSchema.ts:1631-1646` (seed_sources end_type/end_time 块附近)

- [ ] **Step 1：在 fixMissingSchema.ts 找 seed_sources 列表迁移块**

搜 `ALTER TABLE seed_sources ADD COLUMN end_type`，定位 seed_sources 列补漏区域。

- [ ] **Step 2：添加 seed_form 列迁移**

```typescript
// 2026-06-29: 种植自留种功能合并 — seed_sources 加 seed_form 列
// 存储种植自留种回流时的采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）
try {
  db.run(`ALTER TABLE seed_sources ADD COLUMN seed_form TEXT`);
  seedLog.info('  ✓ seed_sources.seed_form 字段已添加');
} catch (e: any) {
  if (e.message?.includes('duplicate column')) {
    seedLog.info('  - seed_sources.seed_form 已存在，跳过');
  } else {
    seedLog.error(`  ✗ seed_sources.seed_form 失败: ${e.message}`);
  }
}
```

放在 seed_sources `end_time` 那段后、`seed_sources.end_type` 那段附近。

- [ ] **Step 3：编译验证**

```bash
cd server && npx tsc --noEmit
```

预期：无 TS 报错。

- [ ] **Step 4：手动给存量 DB 补列（紧急恢复）**

仅在用户 DB 已存在 seed_sources 但缺 seed_form 列时执行（如果全新 DB 无需执行）：

```bash
cd server && node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/yuanxingtu.db');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  const info = db.exec(\"PRAGMA table_info(seed_sources)\");
  const has = info[0]?.values?.some(c => c[1] === 'seed_form');
  if (!has) {
    db.run('ALTER TABLE seed_sources ADD COLUMN seed_form TEXT');
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
    console.log('✓ seed_sources.seed_form 列已添加');
  } else {
    console.log('seed_sources.seed_form 列已存在');
  }
  db.close();
})();
"
```

- [ ] **Step 5：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add server/src/db/fixMissingSchema.ts server/data/yuanxingtu.db && git commit -F - <<'EOF'
feat(db): seed_sources 新增 seed_form 列

种植自留种功能合并 — 新增列存种植回流种源时的采收形态
（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）

迁移路径：
- fixMissingSchema.ts 加 ALTER TABLE
- 紧急恢复用 node + sql.js 直接补列（项目铁律）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Phase 2：后端 service + 路由

### Task 2：execution 服务扩展 seedForm 入参

**Files:**
- Modify: `server/src/services/circulation.service.ts:192-323` (executePropagation)

- [ ] **Step 1：在 CirculationInputSchema 加 seedForm 可选字段**

```typescript
export const CirculationInputSchema = z.object({
  circulationType: CirculationTypeEnum,
  sourceModule: SourceModuleEnum,
  sourceId: z.string().min(1),
  parentSourceId: z.string().min(1),
  subType: PropagationSubTypeEnum.optional(),
  destination: DestinationEnum.default('seed_source'),
  warehouseId: z.string().optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  operatorId: z.string().optional(),
  // 2026-06-29: 种植自留种回流时存到 seed_sources.seed_form
  seedForm: z.string().optional(),
});
```

- [ ] **Step 2：在文件顶部加 seedForm 派生函数**

```typescript
// 2026-06-29: 根据采收形态派生 subType（PROPAGATION 一致输入）
// 果实/枝条/穗条/块根/块茎/鳞茎/叶片/花朵/整株 → cutting（取植物体）
// 种子/种苗                                  → seed_saving
// 其他                                       → cutting（兜底）
export function deriveSeedFormSubType(seedForm: string): 'cutting' | 'seed_saving' {
  const cuttingForms = ['果实', '枝条', '穗条', '块根', '块茎', '鳞茎', '叶片', '花朵', '整株'];
  if (cuttingForms.includes(seedForm)) return 'cutting';
  if (seedForm === '种子' || seedForm === '种苗') return 'seed_saving';
  return 'cutting';
}

export const SEED_FORM_OPTIONS = [
  '果实', '种子', '种苗', '穗条', '枝条',
  '块根', '块茎', '鳞茎', '叶片', '花朵', '整株', '其他',
];
```

- [ ] **Step 3：executePropagation 接受 seedForm 并写新列**

executePropagation 函数签名改为：
```typescript
function executePropagation(input: CirculationInput, circId: string): CirculationResult {
```

在函数顶部新增 `const seedForm = input.seedForm || null;`

在 INSERT INTO seed_sources 的字段列表加 `seed_form`：
```typescript
db.run(`
  INSERT INTO seed_sources (
    id, source_code, source_name, source_type, source_origin, parent_source_id,
    crop_name, crop_variety, crop_code, crop_category, type_name, variety_name,
    supplier_id, supplier_name, production_plan_code,
    quantity, unit, purchase_date, used_quantity, remaining_quantity,
    status, create_by, create_by_id, create_time, update_time,
    propagation_type, propagation_status, propagation_method,
    linked_planting_id, linked_planting_code,
    generation,
    seed_form
  ) VALUES (
    ?, ?, ?, 'seed', ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, 0, ?,
    'active', ?, ?, ?, ?,
    ?, 'completed', ?,
    ?, ?,
    ?,
    ?
  )
`, [
  newSourceId, newSourceCode, parent?.source_name || null, newOrigin, input.parentSourceId,
  parent?.crop_name || planting?.crop_name || null, parent?.crop_variety || planting?.crop_variety || null, parent?.crop_code || planting?.crop_code || null,
  parent?.crop_category || null, parent?.type_name || null, parent?.variety_name || null,
  parent?.supplier_id || null, parent?.supplier_name || null, parent?.production_plan_code || planting?.production_plan_code || null,
  seedQuantity, input.unit || parent?.unit || null, circulationDate.split('T')[0], seedQuantity,
  input.operatorId || 'system', input.operatorId || null, nowISO, nowISO,
  propagationTypeDb, propagationMethod,
  input.sourceModule === 'planting' ? input.sourceId : null, sourcePlantingCode,
  input.subType === 'seed_saving' ? 'F1' : (input.subType === 'cutting' ? '无性' : null),
  // 2026-06-29: 写采收形态
  seedForm,
])
```

- [ ] **Step 4：编译验证**

```bash
cd server && npx tsc --noEmit
```

预期：无 TS 报错。

- [ ] **Step 5：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add server/src/services/circulation.service.ts && git commit -F - <<'EOF'
feat(circulation): executePropagation 接受 seedForm + 派生 subType

- CirculationInputSchema 加 seedForm 可选字段
- 新增 deriveSeedFormSubType 派生函数
- 新增 SEED_FORM_OPTIONS 导出枚举
- executePropagation INSERT seed_sources 时写 seed_form 列

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 3：POST/PUT 路由白名单 + seedForm 校验 + 派生

**Files:**
- Modify: `server/src/routes/planting.ts:397-426` (PUT 白名单 + dispose 校验)
- Modify: `server/src/routes/planting.ts:1543-1592` (POST 白名单 + dispose 校验)
- Modify: `server/src/routes/planting.ts:512-530` (PUT executeCirculation 调用)
- Modify: `server/src/routes/planting.ts:1596-1620` (POST executeCirculation 调用)
- Modify: `server/src/routes/planting.ts:1844-1865` (`/end` 路由同类分支)

- [ ] **Step 1：更新 PUT 白名单常量**

```typescript
// 2026-06-29: 4 个去向减为 3 个（合并 circulate + self_seed 为 planting_self_kept）
// circulate / self_seed 保留作为历史数据值，不允许新建
const PUT_ALLOWED_DESTINATIONS = ['harvest', 'planting_self_kept', 'dispose'];
```

- [ ] **Step 2：更新 PUT 路由的 dispose 校验 + seedForm 校验**

在 PUT 路由校验逻辑（约 L401）添加 seedForm 校验（destination='planting_self_kept' 时必填）：

```typescript
// 2026-06-29: planting_self_kept 必须传 seedForm（采收形态）
if (destination === 'planting_self_kept' && !seedForm) {
  return res.status(400).json({
    success: false,
    error: '种植自留种必须填写采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）'
  });
}
const seedFormStr = typeof seedForm === 'string' ? seedForm : null;
```

`seedForm` 在 PUT 路由需从 req.body 读取（如果该路由的 Zod schema 已包含则自动解析）。

- [ ] **Step 3：更新 POST 白名单常量**

```typescript
// 2026-06-29: 4 个去向减为 3 个
const POST_ALLOWED_DESTINATIONS = ['harvest', 'planting_self_kept', 'dispose']
```

- [ ] **Step 4：更新 POST 路由的 seedForm 校验**

在 POST 路由校验逻辑（约 L1564）添加同样 seedForm 校验（同 Step 2）。

- [ ] **Step 5：更新 PUT 路由 executeCirculation 调用（circulate/self_seed 改为 planting_self_kept）**

定位 PUT 路由 L512 附近的 `if (destination === 'circulate' || destination === 'self_seed')`：

```typescript
// 2026-06-29: planting_self_kept 替代旧 circulate / self_seed（合并后统一入口）
if (destination === 'planting_self_kept') {
  // 派生 subType 基于 seedForm（无需前端传 subType）
  const finalSubType = deriveSeedFormSubType(seedFormStr || '');
  const circType = 'PROPAGATION';  // 种植自留种仅 PROPAGATION，无 quantity_refill

  const result = executeCirculation({
    circulationType: circType,
    sourceModule: 'planting',
    sourceId: planting.id,
    sourceRecordCode: planting.planting_code,
    parentSourceId: planting.source_id,
    subType: finalSubType,
    destination: 'seed_source',  // 入种源，不入库存
    quantity: Number(quantity) || 0,
    unit,
    notes,
    operatorId: ...,
    seedForm: seedFormStr,  // 2026-06-29: 新增，写到 seed_sources.seed_form
  });

  generatedCircId = result.circulationId;
  generatedHarvestId = result.newSourceId;
}
```

类似地更新 POST 路由 L1602-1620 的 executeCirculation 调用和 `/end` 路由 L1850-1865 的同分支。

- [ ] **Step 6：在文件顶部 import 新派生函数**

```typescript
import { executeCirculation, deriveSeedFormSubType } from '../services/circulation.service';
```

- [ ] **Step 7：编译验证**

```bash
cd server && npx tsc --noEmit
```

预期：无 TS 报错。

- [ ] **Step 8：curl 端到端验证**

```bash
# 用之前找到的种植记录 ID
PLANTING_ID=$(cd server && node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('data/yuanxingtu.db'));
  const stmt = db.prepare(\"SELECT id FROM plantings WHERE planting_code='ZZ20260629-001' AND deleted_at IS NULL LIMIT 1\");
  if (stmt.step()) console.log(stmt.getAsObject().id);
  stmt.free();
})();
" | tail -1)

curl -sS -X POST "http://localhost:3001/api/plantings/$PLANTING_ID/harvest-records" \
  -H "Content-Type: application/json" \
  -d '{
    "recordDate": "2026-06-29",
    "destination": "planting_self_kept",
    "seedForm": "枝条",
    "quantity": 50,
    "unit": "株",
    "notes": "种植自留种功能测试 (curl)",
    "operatorName": "QA-PLAN"
  }' \
  -w "\nHTTP_STATUS: %{http_code}\n"
```

预期：`HTTP_STATUS: 201`，返回 `harvestRecordId` 等

- [ ] **Step 9：验证 3 表落库**

```bash
cd server && node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const dbPath = 'data/yuanxingtu.db';
  const db = new SQL.Database(fs.readFileSync(dbPath));
  // 1. 最新一条 planting_harvest_records 应有 destination='planting_self_kept'
  const phr = db.exec(\"SELECT destination, seed_form, quantity FROM planting_harvest_records ORDER BY create_time DESC LIMIT 1\");
  console.log('planting_harvest_records:', JSON.stringify(phr[0]?.values[0]));
  // 2. 最新 seed_sources 应有 seed_form='枝条' (由 generatePropagationCode 'SRC-CUT-...')
  const ss = db.exec(\"SELECT source_code, seed_form, propagation_type, propagation_method FROM seed_sources WHERE seed_form='枝条' ORDER BY create_time DESC LIMIT 1\");
  console.log('seed_sources:', JSON.stringify(ss[0]?.values[0]));
  // 3. crop_circulation_records 应有对应记录
  const ccr = db.exec(\"SELECT circulation_type, source_module, new_source_id FROM crop_circulation_records ORDER BY created_at DESC LIMIT 1\");
  console.log('crop_circulation_records:', JSON.stringify(ccr[0]?.values[0]));
  db.close();
})();
"
```

预期：
- `planting_harvest_records`: `["planting_self_kept","枝条", 50]`
- `seed_sources`: 出现 `seed_form='枝条'` 的新记录
- `crop_circulation_records`: 出现 `circulation_type='PROPAGATION'` + `source_module='planting'`

- [ ] **Step 10：清理测试数据（如需）**

如果用户不希望保留测试数据跑 Task 11 前的清理：

```bash
# 提示用户：「Task 8-9 测试数据：3 表，请告知是否需要保留/清理」
```

注：CLAUDE.md 铁律禁止直改 .db。如果用户确认清理，请用户授权后用 DB 管理脚本清理（不在本任务范围）。

- [ ] **Step 11：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add server/src/routes/planting.ts server/data/yuanxingtu.db && git commit -F - <<'EOF'
feat(routes): planting POST/PUT 支持 planting_self_kept + seedForm 校验

- 4 个去向减为 3 个：harvest / planting_self_kept / dispose
- old circulate / self_seed 数据保留作为历史值，不允许新建
- seedForm 必填校验（仅 planting_self_keit 触发）
- 派生 subType 由 seedForm 派生（基于果实/种子/... 等 12 个枚举）
- 路由 -> executeCirculation 流程：destination='seed_source', subType=<派生>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 4：GET 列表 SQL 适配（聚合种植自留种）

**Files:**
- Modify: `server/src/routes/planting.ts:176-194` (GET 列表 SQL 聚合)

- [ ] **Step 1：定位 GET /plantings 的 SQL**

搜 `residualToSourceQty`（行号约 176）和 `selfSeedToSourceQty`（行号约 177）。

- [ ] **Step 2：合并为 selfKeptToSourceQty（兼容历史 3 个 destination 值）**

```sql
-- 2026-06-29: 残株回种源 + 自交种子 + 种植自留种 三个 destination 合并统计
COALESCE(SUM(
  CASE WHEN phr.destination IN ('circulate', 'self_seed', 'planting_self_kept')
       THEN phr.quantity END
), 0) AS selfKeptToSourceQty,
```

保留 `residualToSourceQty` 和 `selfSeedToSourceQty` 列（向后兼容老前端），但前端不再使用。

同时把 `residualToSourceUnit` (L192-193) 和 `selfSeedToSourceUnit` 合并为 `selfKeptToSourceUnit`（同样 CASE WHEN 兼容）：

```sql
(SELECT unit FROM planting_harvest_records
 WHERE planting_id = p.id AND destination IN ('circulate', 'self_seed', 'planting_self_kept')
 ORDER BY record_date DESC, create_time DESC LIMIT 1) AS selfKeptToSourceUnit
```

- [ ] **Step 3：路由 SELECT * 后的字段映射（L640-646）**

```typescript
else if (dest === 'planting_self_kept') {
  item.selfKeptToSourceUnit = row.unit || ''
}
else if (dest === 'circulate') item.residualToSourceUnit = row.unit || '';  // 兼容历史
else if (dest === 'self_seed') item.selfSeedToSourceUnit = row.unit || '';  // 兼容历史
```

- [ ] **Step 4：编译验证**

```bash
cd server && npx tsc --noEmit
```

预期：无 TS 报错。

- [ ] **Step 5：curl 验证列表 SQL**

```bash
curl -sS "http://localhost:3001/api/plantings" | head -c 500
```

预期：响应中能看到 `selfKeptToSourceQty` 字段，且包含合并的累计值（circulate + self_seed + planting_self_kept 三者之和）。

- [ ] **Step 6：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add server/src/routes/planting.ts && git commit -F - <<'EOF'
feat(routes): GET /plantings 列表聚合兼容历史 destination 值

残株回种源 + 自交种子 + 种植自留种 三个 destination 合并为
selfKeptToSourceQty 单一字段返回，前端统一显示「种植自留种」一列。

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Phase 3：前端 - 类型扩展

### Task 5：扩展 TypeScript 类型

**Files:**
- Modify: `src/types/crop.ts` (PlantingHarvestRecord / AddHarvestRecordInput 附近)

- [ ] **Step 1：定位 PlantingHarvestRecord 类型定义**

搜 `interface PlantingHarvestRecord` 或 `destination` 字段在 types/crop.ts 中的位置。

- [ ] **Step 2：扩展 destination 联合类型**

```typescript
export interface PlantingHarvestRecord {
  id: string
  recordDate: string
  // 2026-06-29: 新增 planting_self_kept 合并 circulate / self_seed
  // 旧值 circulate / self_seed 保留兼容历史数据
  destination: 'harvest' | 'planting_self_kept' | 'circulate' | 'self_seed' | 'dispose'
  subType?: 'cutting' | 'seed_saving' | 'quantity_refill'
  // 2026-06-29: 新增 seedForm 采收形态（仅 destination='planting_self_kept' 必填）
  seedForm?: string
  warehouseId?: string
  warehouseName?: string
  quantity: number
  unit?: string
  notes?: string
  operatorName?: string
  createBy?: string
  createById?: string
  // ... 其余字段保留不变 ...
}
```

- [ ] **Step 3：扩展 AddHarvestRecordInput**

```typescript
export interface AddHarvestRecordInput {
  recordDate: string
  destination: 'harvest' | 'planting_self_kept' | 'dispose'  // 取消 circulate/self_seed
  subType?: 'cutting' | 'seed_saving'  // 取消 quantity_refill
  seedForm?: string  // 2026-06-29 新增
  warehouseId?: string
  warehouseName?: string
  quantity: number
  unit?: string
  notes?: string
  operatorName?: string
  createBy?: string
  createById?: string
}
```

- [ ] **Step 4：TypeScript 编译验证**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && npx tsc --noEmit 2>&1 | head -30
```

预期：仅少量前端引用报错（HarvestRecordModal 处理 destination='circulate'/'self_seed' 的代码），不属于本任务范围，留给 Phase 3 Task 6/7 修复。

- [ ] **Step 5：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add src/types/crop.ts && git commit -F - <<'EOF'
feat(types): PlantingHarvestRecord + AddHarvestRecordInput 扩展 seedForm

destination 联合类型加 planting_self_kept（保留 circulate/self_seed 兼容历史）
AddHarvestRecordInput 取消 quantity_refill subType
新增 seedForm 字段（12 枚举：果实/种子/种苗/穗条/...）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Phase 4：前端 - 弹窗

### Task 6：HarvestRecordModal destination 选项改 3 + 选择 planting_self_kept 时显示采收形态

**Files:**
- Modify: `src/components/farm/planting/modals/HarvestRecordModal.tsx:495-518` (Select 内的 4 个 SelectItem)
- Modify: `src/components/farm/planting/modals/HarvestRecordModal.tsx:103-115` (state 顶部)
- Modify: `src/components/farm/planting/modals/HarvestRecordModal.tsx:519-668` (requiresCirculation 条件块的处理)

- [ ] **Step 1：添加 SEED_FORM_OPTIONS 常量**

在文件顶部（import 之后、组件之前）：

```typescript
// 2026-06-29: 种植自留种 — 12 个采收形态
const SEED_FORM_OPTIONS = [
  '果实', '种子', '种苗', '穗条', '枝条',
  '块根', '块茎', '鳞茎', '叶片', '花朵', '整株', '其他',
]
```

- [ ] **Step 2：destination Select 改 3 个 SelectItem**

定位 L495 附近：

```tsx
<Select value={destination ?? ''} onValueChange={(v) => setDestination(v as EndType)}>
  <SelectTrigger className={deepInputClass}>
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="harvest">
      <span className="flex items-center gap-1.5"><Wheat className="w-3.5 h-3.5" /> 采收入库</span>
    </SelectItem>
    {/* 2026-06-29: 合并 - 移除「残株回种源」「自交种子入种源」，合并为「种植自留种」 */}
    <SelectItem value="planting_self_kept">
      <span className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5" /> 种植自留种</span>
    </SelectItem>
    <SelectItem value="dispose">
      <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> 直接废弃</span>
    </SelectItem>
  </SelectContent>
</Select>
```

注：EndType 类型需要扩展（详情看 Step 6）。

- [ ] **Step 3：替换 requiresCirculation 逻辑为 requiresSelfKept**

定位 L195-198 附近：
```typescript
const hasSeedSource = !!record.sourceId
const requiresWarehouse = destination === 'harvest'
// 2026-06-29: 移除 requiresCirculation（circulate/self_seed 已合并为 planting_self_kept）
const requiresSelfKept = destination === 'planting_self_kept'  // 新增
```

如果 EndType 类型需要，先看下面 Step 6 调整。

- [ ] **Step 4：改「回流方式」条件块（仅 self_seed 时的 subType 选择）→ 「采收形态」**

定位 L520-551 附近的回流方式 Select 块。整段替换为：

```tsx
{requiresSelfKept && (
  <div>
    <Label>采收形态 *</Label>
    <Select value={sourceForm} onValueChange={setSourceForm}>
      <SelectTrigger className={deepInputClass}>
        <SelectValue placeholder="选采收形态（果实/种子/种苗/枝条等）" />
      </SelectTrigger>
      <SelectContent>
        {SEED_FORM_OPTIONS.map((f) => (
          <SelectItem key={f} value={f}>{f}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
      <span className="text-emerald-600">💡</span>
      <span>
        残株/枝条/果实/穗条等植物体请选「扦插类」，种子/种苗请选「留种」。
        数量回流到内部种源列表，不进作物库存。
      </span>
    </p>
  </div>
)}
```

- [ ] **Step 5：删除 requiresCirculation 引用**

搜整个文件，把 `requiresCirculation` 替换为：
- 如果是 dispatch 给 executeCirculation 的：保留为 `requiresSelfKept`（新 destination）
- 如果是 subType 下拉的 SelectItem（circulate 限定 cutting/seed_saving/quantity_refill 的子选项）：删除整段（Step 4 已合并）
- 如果是 push 通知种源列表刷新（line 405 附近）：保留作为「种植自留种提交后通知种源列表」逻辑（改为 `if (requiresSelfKept)`）

详细删除点：

A. L520-551 整个回流方式 Select 块（已 Step 4 处理）
B. handleAdd 函数里 requiresCirculation 相关校验（line 263 附近的 `if (requiresCirculation && !hasSeedSource)`）→ 删除或改为 `if (requiresSelfKept && !hasSeedSource)`
C. handleAdd 函数里 requiresCirculation 相关 subType 派生（line 397-399 附近的 `subType: requiresCirculation ? subType : undefined`）→ 改为 `subType: undefined`（由后端基于 seedForm 派生）
D. L405 附近 `if (requiresCirculation) { try { await useSeedSourceStore.getState().loadItems() } catch (_) {} }` → 改为 `if (requiresSelfKept)`（同样需要通知种源列表）
E. handleAdd 函数 L516 附近，destination 类型断言 `destination as AddHarvestRecordInput['destination']` → 改为 `'planting_self_kept' as AddHarvestRecordInput['destination']`

具体修改较多，建议按代码上下文逐个处理。

- [ ] **Step 6：扩展 EndType 类型**

定位 `import type { EndType } from '../../../../types/cropCirculation';`

```typescript
import type { EndType } from '../../../../types/cropCirculation';
```

EndType 类型扩展（types/cropCirculation.ts）：
```typescript
export type EndType = 'harvest' | 'planting_self_kept' | 'circulate' | 'self_seed' | 'dispose'
```

- [ ] **Step 7：handleAdd 提交新 payload**

定位 L516-528 附近：

```typescript
setSubmitting(true)
try {
  const input: AddHarvestRecordInput = {
    recordDate,
    // 2026-06-29: 仅 3 个 destination
    destination: (destination === 'harvest'
      ? 'harvest'
      : destination === 'planting_self_kept'
        ? 'planting_self_kept'
        : 'dispose') as AddHarvestRecordInput['destination'],
    // 2026-06-29: subType 由后端基于 seedForm 派生，前端不再传
    subType: undefined,
    // 2026-06-29: 采收形态字段（仅 planting_self_keit 触发）
    seedForm: destination === 'planting_self_kept' ? sourceForm : undefined,
    warehouseId: requiresWarehouse ? warehouseId : undefined,
    warehouseName: requiresWarehouse
      ? activeWarehouses.find((w: any) => w.id === warehouseId || w.oid === warehouseId)?.name
      : undefined,
    quantity: qtyNum,
    unit,
    notes,
    createBy: currentUser?.realName || 'system',
    operatorName: currentUser?.realName || 'system',
    // sourceForm 已废弃（旧字段），由 seedForm 替换
    sourceForm: undefined,
  }
  const result = await addHarvestRecord(record.id, input)
  // ... 后续逻辑
}
```

- [ ] **Step 8：handleAdd 校验逻辑适配**

定位 handleAdd L259-296：

```typescript
const handleAdd = async () => {
  if (!destination) {
    showAlert('请选择去向')
    return
  }
  // 2026-06-29: 合并后 requiresCirculation 改为 requiresSelfKept
  if (requiresSelfKept && !hasSeedSource) {
    showAlert('该种植记录无种源,无法回流')
    return
  }
  if (requiresWarehouse && !warehouseId) {
    showAlert('采收入库必须选择仓库')
    return
  }

  const qtyNum = Number(quantity) || 0
  if (destination === 'dispose' && qtyNum > remainingDispose) {
    // dispose 上限校验（沿用之前的 remainingDispose 修复）
    showAlert(`直接废弃数量 ${qtyNum} 超过剩余可废弃 ${remainingDispose}（种植 ${record.plantingCount} + 补栽 ${record.supplementCount || 0} - 损耗 ${record.lossCount || 0}）`)
    return
  }
  if (destination !== 'harvest' && destination !== 'planting_self_kept' && qtyNum <= 0) {
    showAlert('请填写数量（> 0）')
    return
  }
  if (destination !== 'harvest' && destination !== 'planting_self_kept' && (!unit || (unitOptions.length > 0 && !unitOptions.includes(unit)))) {
    showAlert('请选择单位')
    return
  }
  // 2026-06-29: 种植自留种必须有采收形态（替代 sourceForm）
  if (destination === 'planting_self_kept' && !sourceForm) {
    showAlert('请选择采收形态（果实/种子/种苗/穗条/枝条等）')
    return
  }
  // ... rest unchanged
}
```

- [ ] **Step 9：build 验证**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && npm run build 2>&1 | tail -20
```

预期：build 成功，无 TS 错误。

- [ ] **Step 10：浏览器手动 E2E**

用户操作：
1. 打开种植管理 → 任一种植 → 点击「采收」图标 → 弹窗打开
2. 验证去向选项是 3 个（采收入库 / 种植自留种 / 直接废弃）
3. 选择「种植自留种」→ 应显示采收形态下拉（不是原来的回流方式下拉）
4. 选「枝条」+ 填数量 + 单位 + 备注 → 添加记录
5. 弹窗回到 default 状态，列表累计变化

如果用户发现任何异常，截图给反馈。

- [ ] **Step 11：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add src/components/farm/planting/modals/HarvestRecordModal.tsx src/types/cropCirculation.ts && git commit -F - <<'EOF'
feat(planting): 采收弹窗去向合并为 3 + 种植自留种采收形态字段

- 4 个去向减为 3 个：采收入库 / 种植自留种 / 直接废弃
- 移除「残株回种源」「自交种子入种源」两个去向
- 移除 quantity_refill 三个 subType 选项
- 合并为「采收形态」下拉（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）
- handleAdd payload 新增 seedForm 字段
- EndType 类型扩展 planting_self_kept

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Phase 5：前端 - 列表

### Task 7：种植列表「残株回种源/自交种子」合并为「种植自留种」

**Files:**
- Modify: `src/components/farm/planting/components/PlantingTable.tsx` (累计显示列)

- [ ] **Step 1：定位残株回种源/自交种子列**

搜 `residualToSourceQty` 和 `selfSeedToSourceQty` 字段引用。

- [ ] **Step 2：合并两列为「种植自留种」**

移除 `残株回种源` 和 `自交种子入种源` 两列 render，合并为 1 列：

```tsx
{
  title: '种植自留种',
  dataIndex: 'selfKeptToSourceQty',
  key: 'selfKeptToSourceQty',
  width: 110,
  render: (qty: number, record: any) => (
    <div className="flex flex-col items-end">
      <span className={(qty || 0) > 0 ? 'font-bold text-emerald-600' : 'text-gray-400'}>
        {(Number(qty) || 0).toLocaleString()}
        {record.selfKeptToSourceUnit || record.unit || ''}
      </span>
    </div>
  ),
},
```

- [ ] **Step 3：检查 Planting 类型有无 selfKeptToSourceQty 字段**

如无，添加（在 src/types/crop.ts）：

```typescript
export interface Planting {
  // ... 现有字段 ...
  selfKeptToSourceQty?: number  // 2026-06-29: 种植自留种累计（合并 circulate + self_seed）
  selfKeptToSourceUnit?: string  // 同上
}
```

- [ ] **Step 4：TS 类型补充**

在 src/types/crop.ts 找 Planting 接口添加字段。

- [ ] **Step 5：API 转换层加映射**

`src/services/apiPlantingService.ts` 的 transformSinglePlanting 函数：

```typescript
// 2026-06-29: 兼容历史 3 个 destination 值的合并映射
selfKeptToSourceQty: Number((item as any).selfKeptToSourceQty) || 0,
selfKeptToSourceUnit: String((item as any).selfKeptToSourceUnit || ''),
```

- [ ] **Step 6：build 验证**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && npm run build 2>&1 | tail -10
```

预期：build 成功。

- [ ] **Step 7：浏览器回归**

打开种植管理列表，验证：
- 「残株回种源」+「自交种子入种源」2 列消失
- 「种植自留种」1 列出现
- 老数据的累计值正确合并显示

- [ ] **Step 8：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add src/components/farm/planting/components/PlantingTable.tsx src/types/crop.ts src/services/apiPlantingService.ts && git commit -F - <<'EOF'
feat(planting): 列表合并「残株回种源/自交种子」为「种植自留种」

- 去除 2 列 render
- 合并为 1 列「种植自留种」
- 新增 selfKeptToSourceQty/Unit 字段于 Planting 类型 + 转换层

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 8：种源管理列表「种源类型」列显示 seed_form

**Files:**
- Modify: `src/components/seedSource/*` 或 `src/pages/seedSourcePage/*`（按实际路径）

- [ ] **Step 1：定位种源管理列表组件**

```bash
find "src" -type d -name "seedSource*" 2>&1 | head -3
```

或

```bash
grep -rln "种源类型" "src" 2>&1 | head -3
```

- [ ] **Step 2：扩展 SeedSource 类型加 seedForm**

`src/types/seedSource.ts`（或对应类型文件）：

```typescript
export interface SeedSource {
  // ... 现有字段 ...
  seedForm?: string  // 2026-06-29: 种植自留种采收形态
}
```

- [ ] **Step 3：扩展 API 转换**

`src/services/apiSeedSourceService.ts` 或对应 service：

```typescript
seedForm: item.seedForm || undefined,
```

（如已自动透传可跳过）

- [ ] **Step 4：列表 render 函数**

找到显示「种源类型」列的位置：

```tsx
render: (record: SeedSource) => (
  <div className="flex flex-col items-start gap-1">
    {record.seedForm ? (
      <Badge variant="default">{record.seedForm}</Badge>
    ) : (
      <Badge variant="secondary">
        {getSourceTypeLabel(record.sourceType)}
      </Badge>
    )}
  </div>
),
```

- [ ] **Step 5：build 验证**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && npm run build 2>&1 | tail -10
```

预期：build 成功。

- [ ] **Step 6：浏览器实测**

1. 打开种源管理
2. 找任意新加的"枝条/果实..."记录（Task 3 步骤 8-9 留下的 curl 测试数据）
3. 验证「种源类型」列显示该形态值（如"枝条"）
4. 老种源记录该列为"—"或原 sourceType 标签

- [ ] **Step 7：Commit**

```bash
cd "D:/TMcrop/yuanxingtu/V1.1" && git add src/components/seedSource/ src/types/seedSource.ts src/services/apiSeedSourceService.ts && git commit -F - <<'EOF'
feat(seedSource): 种源类型列显示 seed_form

- SeedSource 接口加 seedForm 字段
- API 转换层加映射
- 列表 render 优先显示 seed_form（如"枝条"），老数据/外部购买显示原标签
- 新增种源（种植自留种）：种源类型列显示具体形态

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Phase 6：集成回归

### Task 9：E2E 全链路实测

**Files:** 无（纯验证）

- [ ] **Step 1：全链路 curl 验证**

```bash
# 1. POST planting_self_keit 看 4 表落库
PLANTING_ID=PL1782714057024  # ZZ20260629-001
curl -sS -X POST "http://localhost:3001/api/plantings/$PLANTING_ID/harvest-records" \
  -H "Content-Type: application/json" \
  -d '{
    "recordDate": "2026-06-29",
    "destination": "planting_self_kept",
    "seedForm": "果实",
    "quantity": 30,
    "unit": "克",
    "notes": "E2E 全链路验证",
    "operatorName": "QA-E2E"
  }'

# 2. GET /plantings 看累计
curl -sS "http://localhost:3001/api/plantings" | head -c 300

# 3. GET /seed-sources 看新种源
curl -sS "http://localhost:3001/api/seed-sources?search=果实" | head -c 300
```

预期：
- POST: HTTP 201
- GET plantings: selfKeptToSourceQty 增加 30
- GET seed-sources: 出现 seed_form='果实' 的新种源记录

- [ ] **Step 2：浏览器全链路实测**

1. 打开种植管理 → ZZ20260629-001 → 采收图标 → 弹窗
2. 选"种植自留种"+ 采收形态"种子" + 数量 100 + 单位"粒"
3. 添加记录 → 弹窗关闭 → 历史记录新增
4. 切到种源管理 → 顶部累计看"种植自留种"增加 → 列表头部看到新种源（类型=种子）
5. 返回种植管理 → ZZ20260629-001 行的"种植自留种"列累计 +100

- [ ] **Step 3：回归测试 - 老数据**

挑一个旧种植（destination='circulate'/'self_seed' 历史记录）验证：
- 列表累计显示正确（合并到"种植自留种"列）
- 历史记录表里老记录仍能查看/编辑/删除

- [ ] **Step 4：清理 E2E 测试数据（如需）**

询问用户是否需要清理 Task 3/9 留下的 curl 测试数据。如需，建议用户在 DB 管理界面删除（项目铁律禁止直改 .db）。

- [ ] **Step 5：Commit（如有新发现或补充）**

如 E2E 发现任何问题，修复后 commit。

---

## 自检清单

| Spec 章节 | 对应任务 |
|---|---|
| §1 业务边界 | 设计阶段约束；Task 6/7 实现时严格执行 |
| §2.1 seed_form 列 | Task 1（DB） |
| §2.2 destination 枚举 | Task 3（白名单更新）+ Task 5（类型扩展）+ Task 6（UI 选项） |
| §3.1 API 入参 | Task 2（service schema）+ Task 5（前端 type）+ Task 6/7（payload） |
| §3.2 业务流程 | Task 2/3（派生 + executeCirculation）+ Task 6（handleAdd） |
| §3.3 派生规则 | Task 2（deriveSeedFormSubType）+ Task 6（前端不再传 subType） |
| §5.1 弹窗 | Task 6 |
| §5.2 列表 | Task 7 |
| §5.3 种源类型列 | Task 8 |
| §6 数据流示例 | Task 9（E2E 验证） |
| §7 测试策略 | Task 2（service 单测）+ Task 3/9（端到端 curl）+ Task 6/7/8（手动 E2E） |

**覆盖率 100%**。

---

## 风险与备选方案

| 风险 | 应对 |
|---|---|
| 老数据 destination='circulate'/'self_seed' 仍在前端其它地方用 | Phase 5 Task 9 回归测试覆盖 |
| 前端其他引用 destination 字面量的地方编译报错 | Task 5 编译后会暴露，按报错逐个补 |
| 后端 seed_form 列需重启后端 | 用户配合重启；或前置手动补列（Task 1 Step 4） |
| 老的「回流方式」subType 选项残留 | Task 6 Step 5 系统处理 requiresCirculation 引用 |
| UI 可选项从 4 减为 3，用户对勾选项心智变化 | 设计阶段边界明确；用「种植自留种」命名直接表达意图 |

---

## 总结

总任务数：**8 个**（Phase 1-5）+ 1 个 E2E 验证 = 9 个 commit

每个 commit 都是独立可验证的小块，符合 TDD + 频繁提交 + KISS 原则。
