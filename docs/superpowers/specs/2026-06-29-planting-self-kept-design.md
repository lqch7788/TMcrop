# 种植自留种功能合并 - 设计文档

日期：2026-06-29
作者：Claude + lqch7788
状态：design

## 1. 背景与动机

种植管理模块现有"采收"弹窗的去向字段有 4 个选项：
1. **采收入库** → 入作物库存（inventory_stock）
2. **残株回种源**（circulate）→ 入内部种源（seed_sources）
3. **自交种子入种源**（self_seed）→ 入内部种源（seed_sources）
4. **直接废弃** → 仅审计（dispose）

**问题**：
- circulate 和 self_seed 两者都把种植作物的副产物（残株、种子、枝条等）回流到内部种源，业务本质相同 — 用户决策本次合并为一个功能「种植自留种」
- 现有 subType 字段（cutting/seed_saving/quantity_refill）让 UI 复杂，但 quantity_refill 是"数据修正/盘点补差"的语义，嵌在采收弹窗里不清晰 — 用户决策本次取消 quantity_refill
- 现有功能没有"采收形态"字段（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株），用户希望增加该字段并保存到 seed_sources 内显示
- 必须避免与种植管理列表里 is_seed_saving（种植留种）和 is_breeding（育种计划）混淆 — 后两者是种植目标属性，前者是采收副产物动态行为

## 2. 业务边界（必读）

| 功能 | 入口 | 数据流向 | 是否入库存 |
|---|---|---|---|
| **种植自留种（本次合并）** | 种植采收弹窗「种植自留种」 | planting → **seed_sources**（建新种源） | ❌ 不入作物库存 |
| **采收入库** | 种植采收弹窗「采收入库」 | planting → inventory_stock | ✅ 入作物库存 |
| **直接废弃** | 种植采收弹窗「直接废弃」 | planting → planting_harvest_records（仅审计） | ❌ |
| **种植列表：is_seed_saving** | 种植 EditModal 勾选"种植留种设置" | planting 自身属性（标记"这单目标=留种"） | ❌ |
| **种植列表：is_breeding** | 种植 EditModal 勾选"育种计划设置" | planting 自身属性（标记"这单目标=育种"） | ❌ |

**关键区分**：
- 「种植自留种」= 采收动作的副产物（动态行为）
- 「种植留种 / 育种」= 种植目标（静态属性）

## 3. 后端数据层

### 3.1 DB 列变更

**`seed_sources` 表新增 `seed_form TEXT` 列**

迁移脚本位置：`server/src/db/fixMissingSchema.ts`

```typescript
{
  name: 'seed_form',
  sql: "ALTER TABLE seed_sources ADD COLUMN seed_form TEXT"
}
```

`seed_form` 接受的值：
- `果实` / `种子` / `种苗` / `穗条` / `枝条` / `块根` / `块茎` / `鳞茎` / `叶片` / `花朵` / `整株` / `其他`
- NULL：老种源记录（外部购买/历史数据）保持 NULL 不变

### 3.2 `planting_harvest_records.destination` 枚举

| 值 | 状态 | 含义 |
|---|---|---|
| `harvest` | 已用 | 采收入库（→ inventory_stock） |
| **`planting_self_kept`** | **新增** | 种植自留种（→ seed_sources，建新种源） |
| `dispose` | 已用 | 直接废弃（仅审计） |
| `circulate` | **历史兼容保留** | 旧"残株回种源"数据值，不再允许新建 |
| `self_seed` | **历史兼容保留** | 旧"自交种子入种源"数据值，不再允许新建 |

POST/PUT 白名单更新为：`['harvest', 'planting_self_kept', 'dispose']`

GET 列表 SQL 聚合也同步（不为旧值返 0 或报错，向后兼容）：
```sql
COALESCE(SUM(CASE WHEN phr.destination = 'planting_self_kept' THEN phr.quantity END), 0) AS selfKeptToSourceQty
-- 旧 cirulate/self_seed 数据列保留
```

UI 取数改动：
- 之前列表显示 4 个去向累计：「采收入库 / 残株回种源 / 自交种子 / 直接废弃」
- 之后列表显示 **3 个去向累计**：「采收入库 / **种植自留种** / 直接废弃」
- 历史数据迁移：合并 SUM 旧 `circulate` + `self_seed` 为 `planting_self_kept` 的可视化值（用 CASE WHEN 适配）：
  ```sql
  COALESCE(SUM(
    CASE WHEN phr.destination IN ('circulate', 'self_seed', 'planting_self_kept')
         THEN phr.quantity END
  ), 0) AS selfKeptToSourceQty
  ```
  这样前端不用区分老/新 destination 值，统一在"种植自留种"列显示。

## 4. 后端 Service 层

### 4.1 API 入参

POST `/api/plantings/:id/harvest-records` 和 PUT `/api/plantings/:id/harvest-records/:recordId`：

**新增字段**：
- `seedForm: string` — 当 destination='planting_self_kept' 时必填，其他 destination 不传

**删除字段**：
- `subType: 'cutting' | 'seed_saving' | 'quantity_refill'` — 完全废弃 UI 和 API 入参（保留 zod schema 可选字段以做向后兼容，但前端不再传）
- 替代为：后端基于 seedForm 派生 propagation_method

### 4.2 业务流程（destination='planting_self_kept'）

```
POST /plantings/:id/harvest-records
├─ 1. 校验 destination 白名单（仅 3 个值）
├─ 2. 校验 seedForm 必填（在白名单枚举内）：果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他
├─ 3. 写 planting_harvest_records
│     （destination='planting_self_kept', seed_form=<用户选>, quantity, unit, notes, operator_name, ...）
├─ 4. 派生 subType（基于 seedForm）：
│     果实/枝条/穗条/块根/块茎/鳞茎/叶片/花朵/整株 → 'cutting'（扦插/取植物体）
│     种子/种苗                                  → 'seed_saving'
│     其他                                       → 'cutting'（兜底）
├─ 5. executeCirculation(input={
│     circulationType: 'PROPAGATION',
│     destination: 'seed_source',  // 强制入种源，不入库存
│     subType: <派生值>,
│     ...quantity, unit, notes, operatorId
│   })
├─ 6. executePropagation 内部：INSERT seed_sources 新增 seed_form 列
└─ 7. 返回 {recordId, harvestRecordId, ...}
```

### 4.3 propagation_method/propagation_type 派生规则

| seedForm | subType | propagation_method | propagation_type |
|---|---|---|---|
| 果实/枝条/穗条/块根/块茎/鳞茎/叶片/花朵/整株 | `cutting` | `cutting` | `asexual` |
| 种子/种苗 | `seed_saving` | `seed_saving` | `seed_saving` |
| 其他 | `cutting` | `cutting` | `asexual` |

派生逻辑放在 planting.ts 路由或 circulation.service 中集中定义（建议放 circulation.service 派生函数 `deriveSeedFormSubType`）。

## 5. 前端 UI 层

### 5.1 HarvestRecordModal 弹窗（src/components/farm/planting/modals/HarvestRecordModal.tsx）

#### 5.1.1 去向选项（4 个减为 3 个）

```tsx
<SelectItem value="harvest">采收入库</SelectItem>
<SelectItem value="planting_self_kept">种植自留种</SelectItem>
<SelectItem value="dispose">直接废弃</SelectItem>
// 删除：
// <SelectItem value="circulate">残株回种源</SelectItem>
// <SelectItem value="self_seed">自交种子入种源</SelectItem>
```

#### 5.1.2 选择"种植自留种"时显示的字段

```
┌─────────────────────────────────────────────────┐
│ 采收日期 *      │ 去向 *      │ 采收形态 *       │
│ [日期选择]       │ [种植自留种]  │ [下拉：果实/...]  │
├─────────────────────────────────────────────────┤
│ 数量 *    │ 单位 *  │ 备注                       │
│ [Number]  │ [字典]  │ [TextArea]                 │
└─────────────────────────────────────────────────┘
```

#### 5.1.3 不显示的字段（与"采收入库"模式区别）

- ❌ 仓库选择（不留作物库存）
- ❌ 操作员（默认 currentUser.realName）
- ❌ 采收人员多选
- ❌ 产品明细多产物表
- ❌ 顶部 subType 下拉（cutting/seed_saving/quantity_refill）— 这就是关键精简

#### 5.1.4 添加记录入参

```ts
const input: AddHarvestRecordInput = {
  recordDate,
  destination: 'planting_self_kept',
  seedForm: <用户选>,
  warehouseId: undefined,  // 不传
  warehouseName: undefined,
  quantity: Number(quantity) || 0,
  unit,
  notes,
  createBy: currentUser.realName,
  operatorName: currentUser.realName,
}
```

### 5.2 PlantingStore / Service / Type

#### 5.2.1 Type 修改（src/types/crop.ts）

```ts
export interface PlantingHarvestRecord {
  // ... 现有字段 ...
  destination: 'harvest' | 'planting_self_kept' | 'dispose' | 'circulate' | 'self_seed'  // 新值 + 老值保留
  seedForm?: string  // 新增
  subType?: 'cutting' | 'seed_saving' | 'quantity_refill'  // 保留兼容，但不推荐新用
}
```

#### 5.2.2 Service 不变（已经走 addHarvestRecord 直接调后端）

#### 5.2.3 列表累计显示（src/components/farm/planting/components/PlantingTable.tsx）

- 「残株回种源」+「自交种子」两列合并为 **「种植自留种」** 一列
- 累计算法兼容新老 destination（见 §3.2 SQL 适配）

### 5.3 种源管理列表（src/pages/seedSource/* 或 src/components/seedSource/*）

**"种源类型"列**显示规则：
```ts
// seed_form 非空 → 显示 seed_form 值（如 "枝条"）
// seed_form 为空 → 显示 source_type 标签（external/internal/external_purchase/...）
const displayType = record.seedForm || <sourceType 标签映射>
```

UI 不需要新组件，只需在种子类型列 render 函数里加 seedForm 优先。

## 6. 数据流示例

**场景**：用户种植葡萄 ZZ20260629-001，剪 50 根枝条作以后扦插用。

| 步骤 | 动作 | 落库 |
|---|---|---|
| 1 | 弹窗选"种植自留种" + 采收形态"枝条" + 数量 50 + 单位"根" | 前端准备 payload |
| 2 | 点击"添加记录" | POST `/plantings/{id}/harvest-records` |
| 3 | 后端校验 + Zod 解析 | 通过 |
| 4 | 派生 subType='cutting' | 内部计算 |
| 5 | 写 planting_harvest_records | destination='planting_self_kept', seed_form='枝条', quantity=50 |
| 6 | executeCirculation(PROPAGATION, seed_source, cutting) | 调用 executePropagation |
| 7 | executePropagation 写 seed_sources 新行 | source_code='SRC-CUT-20260629-001', seed_form='枝条', quantity=50, propagation_type='asexual' |
| 8 | 写 crop_circulation_records | PROPAGATION + linked_planting_id |
| 9 | 写 material_flow_log | 流转链路 |
| 10 | 用户刷新种源管理 | 种源列表新增一行，类型列显示"枝条" |

## 7. 测试策略

### 7.1 单元测试

- `server/src/__tests__/plantingSelfKept.test.ts`（新增）
  - executeCirculation 接受 seedForm 时正确写入 seed_sources.seed_form
  - 派生函数 deriveSeedFormSubType 对所有 12 个 seedForm 值映射正确
  - 后端路由 reject `circulate`/`self_seed`（POST/PUT 白名单不包含）

### 7.2 集成测试

- POST `/plantings/:id/harvest-records` destination='planting_self_kept'：
  - 验证 4 表落库（planting_harvest_records / crop_circulation_records / seed_sources / material_flow_log）
  - seed_sources 新行的 seed_form 列值匹配前端入参

### 7.3 手动 E2E

- 用户场景：葡萄种植 → 剪枝自留种 → 验证种源管理列表显示新种源 + "枝条"
- 用户场景：种植番茄 → 自交留种 → 验证种源管理列表显示新种源 + "种子"
- 回归：旧的 circulate/self_seed 历史数据显示不破坏

## 8. 不在本次范围

- ❌ 老的 `circulate`/`self_seed` 数据迁移（保留原 destination 值，仅做可视化合并）
- ❌ quantity_refill 服务底层能力删除（保留 executeQuantityToSeedSource 函数，UI 不暴露）
- ❌ inventory_stock 表不入任何自留种数据（严格边界）
- ❌ propagation_method 已有值迁移（老数据保留）

## 9. 风险与限制

| 风险 | 应对 |
|---|---|
| 老数据 destination='circulate'/'self_seed' 在新 UI 不可见 | UI 累计兼容（统一并到"种植自留种"列显示） |
| 前端 Planting 接口 destination 字面量类型需要扩展 | TypeScript 同步扩展 `'circulate' \| 'self_seed' \| 'planting_self_kept'` |
| 后端入参 subType 字段老前端可能还在传 | Zod `.passthrough()` 或 `.optional()` 兼容（直接忽略） |
| 服务端 seed_form 列需重启后端才生效 | 用户协助重启；或在紧急情况用 node + sql.js 直接补列（项目铁律） |

## 10. 实施分阶段

按 KISS + Rule 3 原则，分 4 个阶段逐步上线：

**Phase 1（DB 层）**
1. fixMissingSchema.ts 加 seed_form 列迁移
2. 紧急恢复存量 DB（如需）

**Phase 2（后端）**
1. Zod schema 加 seedForm 字段
2. POST/PUT 白名单更新
3. 派生函数 + executeCirculation 调用适配
4. executePropagation 接受 seedForm 写入新列

**Phase 3（前端 - 弹窗）**
1. HarvestRecordModal destination 选项改 3 个
2. 选择"种植自留种"时显示采收形态下拉
3. 提交 payload 改为新格式

**Phase 4（前端 - 列表）**
1. 种植列表「残株回种源」「自交种子」合并显示
2. 种源管理「种源类型」列显示 seed_form

每阶段独立验证（curl + 浏览器），通过后进入下一阶段。
