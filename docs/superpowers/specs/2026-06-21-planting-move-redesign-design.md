# 种植调入/调出功能重设计

| 项目 | 内容 |
|------|------|
| 日期 | 2026-06-21 |
| 作者 | CodeMaster Nexus (with user collaboration) |
| 状态 | 设计批准，待实现 |
| 优先级 | P0 - 业务逻辑严重缺陷 |
| 受影响模块 | 种植管理 / 库存联动 |

---

## 1. 背景与问题

### 1.1 现象

用户在 `种植作物列表` 反复测试"移入/移出"功能，发现：

- 原有 500 株的订单，移入 400 株后变成 900 株（凭空增加 400 株）
- 移出 500 株后变成 400 株（从 900 凭空扣 500）
- 种植区域字段在移入/移出时**总是被更新**到目标区域，即便 from == to

**实际生产环境下这会导致库存数据完全失真**。

### 1.2 根因分析

代码 `server/src/routes/planting.ts:330`：

```ts
const delta = operationType === 'move_out' ? -qty : qty;
db.run(
  `UPDATE plantings SET area_id = ?, area_name = ?, planting_quantity = ?, ...`,
  [toAreaId || '', toAreaName, Math.max(0, currentQty + delta), now, id]
);
```

**两层错误**：

1. **语义错误**：`planting_quantity` 被当作"累加器"。但其真实业务语义是"本订单定植株数"，**创建时定，移入/移出不改**。
2. **缺失校验**：from==to 没拦，作物一致性没校验，订单生命周期没校验，source/target 必填没强校验。

### 1.3 历史

- 2026-06-21 commit `251a0e16` 之前：移入/移出**只更新 area**，不动 quantity（用户感觉"没变化"）
- 2026-06-21 commit `251a0e16`：改为 delta 累加（矫枉过正，导致本 bug）
- 当前 commit：种植管理数据已被测试污染（ZZ20260620-001 状态 500→900→400，ZZ20260619-002/PL1781856365277 被测 5 次剩 59 株）

---

## 2. 业务定义（澄清后）

| 操作 | 真实业务语义 | 数量影响 |
|------|------------|----------|
| **移入 (move_in)** | 从种源/育苗批号**调拨**新苗到本订单的某个区域 | **不**影响 `planting_quantity`（订单总数不变），但增加该区域的 stock |
| **移出 (move_out)** | 把本订单的株数**调拨**给其他种植订单 | **不**影响 `planting_quantity`，但**减少**本订单某区域 stock，**增加**目标订单某区域 stock |

**关键认识**：
- 移入/调出都是**跨区域/跨订单的物流操作**
- "调入"和"调出"是一对配对操作，但弹窗分两次提交（先调出方，再调入方，或反之）
- 数量变化只发生在 **stocks 表**（按区域拆分），**plantings 主表的 quantity 不变**

---

## 3. 数据模型

### 3.1 新增表 `planting_area_stocks`

```sql
CREATE TABLE IF NOT EXISTS planting_area_stocks (
  id TEXT PRIMARY KEY,                  -- STK_xxx
  planting_id TEXT NOT NULL,            -- 关联 plantings.id
  area_id TEXT NOT NULL,                -- 区域 ID
  area_name TEXT NOT NULL,              -- 区域名称
  quantity INTEGER NOT NULL DEFAULT 0,  -- 该区当前株数
  source_type TEXT,                     -- 创建来源: 'initial'/'seed'/'seedling'/'transfer_in'/'transfer_out'/'migrate'
  source_id TEXT,                       -- 来源记录 ID (种源/育苗/调出订单)
  source_code TEXT,                     -- 来源显示用编号
  operation_date TEXT,                  -- 业务日期
  remarks TEXT,                         -- 备注
  create_time TEXT NOT NULL,
  update_time TEXT NOT NULL,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pas_planting ON planting_area_stocks(planting_id);
CREATE INDEX IF NOT EXISTS idx_pas_area ON planting_area_stocks(area_id);
```

**唯一约束**：`(planting_id, area_id)` 一条 planting 在某区域只能有一行 stock。
迁移时需用 `INSERT OR IGNORE` 配合 UNIQUE 索引。

### 3.2 改 `plantings` 表语义

| 字段 | 原语义 | 新语义 |
|------|--------|--------|
| `planting_quantity` | 当前存活株数 | **订单总株数**（创建/编辑时定，移入移出不变） |
| `area_id` | 当前区域 | **主区域**（stocks 中 quantity 最大的那行） |
| `area_name` | 当前区域名 | **主区域名** |

**列表查询 SQL 改造**（`server/src/routes/planting.ts:75-93`）：

```sql
-- 旧（直接读 plantings）
p.area_id AS areaId,
p.area_name AS areaName,
p.planting_quantity AS plantingCount,

-- 新（从 stocks 聚合）
(SELECT s.area_id FROM planting_area_stocks s
   WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaId,
(SELECT s.area_name FROM planting_area_stocks s
   WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaName,
COALESCE((SELECT SUM(s.quantity) FROM planting_area_stocks s
   WHERE s.planting_id = p.id), 0) AS plantingCount
```

### 3.3 保留 `planting_move_records` 履历表

不动表结构，但写入时改为：
- `from_area_id` / `to_area_id` 记录具体区域
- `source_type` / `source_id` 记录调入来源
- `target_type` / `target_id` 记录调出去向（新增字段，迁移时加）

**ALTER TABLE**（如果旧表没有 target 字段）：

```sql
ALTER TABLE planting_move_records ADD COLUMN target_type TEXT;
ALTER TABLE planting_move_records ADD COLUMN target_id TEXT;
ALTER TABLE planting_move_records ADD COLUMN target_code TEXT;
```

---

## 4. 业务流程

### 4.1 调入 (move_in)

**前置校验（前端 + 后端）**：

| 校验项 | 错误信息 | HTTP |
|--------|---------|------|
| 目标种植订单 A 存在 | "目标种植订单不存在" | 404 |
| 目标区域必填 | "请选择目标区域" | 400 |
| 来源种源/育苗 S 存在 | "来源种源/育苗记录不存在" | 404 |
| S 状态 = 已用完/已废弃 | "来源记录状态不可用" | 400 |
| 数量 N > 0 | "数量必须 > 0" | 400 |
| N ≤ S 可用量 | "来源库存不足" | 400 |
| **A.crop_code = S.crop_code** | "来源作物与目标订单作物不一致" | 400 |
| **A.crop_variety = S.crop_variety** | "来源品种与目标订单品种不一致" | 400 |
| A.status ∈ {已结束, 已废弃, 已采收} | "目标订单已结束/已采收，不能调入" | 400 |
| A.is_harvest_locked = true | "目标订单已锁定采收" | 400 |
| A.end_time IS NOT NULL | "目标订单已结束" | 400 |
| **from_area_id == to_area_id (A 同一区域)** | "源区域与目标区域相同" | 400 |
| **目标区域 (A, area) 在 stocks 不存在** | 黄色软提示"目标区域未种该作物，建议先创建种植记录" | — |

**软提醒**（不阻断）：
- 弹窗检测 `(A.id, area) 是否在 stocks 表中存在`
- 不存在时弹黄色提示，但允许继续提交
- 提交后 stocks 表新增 (A.id, area, quantity=N) 行

**写入流程**（事务原子）：

```
BEGIN;
  1. 扣减 seed_sources.remaining_quantity
     - WHERE id = S.id AND source_type IN ('seed', 'seedling')
     - SET remaining_quantity = remaining_quantity - N, used_quantity = used_quantity + N
     - 注意：种源和种苗共享 seed_sources 表（按 source_type 区分）
  2. INSERT OR UPDATE planting_area_stocks (A.id, area, quantity += N)
     - 若存在：UPDATE quantity = quantity + N, update_time = now
     - 若不存在：INSERT 新行
  3. INSERT planting_move_records
     (id, planting_id=A.id, operation_type=move_in,
      from_area_id=S.area_id, from_area_name=S.source_name,
      to_area_id=area, to_area_name=area_name,
      source_type='seed'|'seedling', source_id=S.id, source_code=S.code,
      quantity=N, ...)
  4. INSERT material_flow_log (S → A, flow_type='seed_source→planting' 或 'seedling→planting')
COMMIT;
saveDatabase();
```

### 4.2 调出 (move_out)

**前置校验**：

| 校验项 | 错误信息 | HTTP |
|--------|---------|------|
| 调出方 A 存在 | "调出记录不存在" | 404 |
| A 状态校验（与调入相同 6 项） | "调出订单已结束/已采收" | 400 |
| from 区域 (A, from_area) 在 stocks 存在 | "调出区域未种该作物" | 404 |
| from area stock ≥ N | "调出区域当前只有 X 株，不足 Y 株" | 400 |
| 目标订单 C 存在 | "目标种植订单不存在" | 404 |
| to area 必填 | "请选择目标区域" | 400 |
| N > 0 | "数量必须 > 0" | 400 |
| **A.crop_code = C.crop_code** | "目标订单作物与本订单不一致" | 400 |
| **A.crop_variety = C.crop_variety** | "目标订单品种与本订单不一致" | 400 |
| **from_area_id == to_area_id (本订单同区域)** | "源区域与目标区域相同" | 400 |
| **to area (C, area) 不存在 stocks** | 黄色软提示"目标订单未在该区域种植，建议先创建种植记录" | — |

**写入流程**（事务原子）：

```
BEGIN;
  1. SELECT planting_area_stocks WHERE (A.id, from_area) FOR UPDATE;  -- 排他锁
  2. 校验 stock >= N
  3. UPDATE stocks (A, from_area) SET quantity = quantity - N
  4. INSERT OR UPDATE stocks (C, to_area) quantity += N
  5. INSERT planting_move_records (operation_type=move_out, from=A, to=C, ...)
  6. INSERT material_flow_log (A → C, flow_type='planting→planting' 新值)
COMMIT;
saveDatabase();
```

**注**：material_flow_log 暂用现有 flow_type 'planting→planting'（已存在）；若不存在需新增。

### 4.3 列表展示变化

**plantings 主行显示**：
- `plantingCount` = `SUM(stocks.quantity)`（订单总当前存活数）
- `areaName` = stocks 中 quantity 最大的那行 area_name（主区域）
- 一单多区场景下，列表只能看到主区域；明细通过"履历"或新增"区域分布"功能查看

---

## 5. 关键校验（P0 6 项 + P1 5 项）

### P0 必须实现

1. ✅ **作物编码一致**：`A.crop_code == S.crop_code`（调入）/ `A.crop_code == C.crop_code`（调出）
2. ✅ **品种一致**：`A.crop_variety == S.crop_variety` / `A.crop_variety == C.crop_variety`
3. ✅ **订单生命周期**：`status` 排除已结束/已废弃/已采收；`is_harvest_locked=true` 拒绝；`end_time` 非空拒绝
4. ✅ **并发锁**：事务内 `SELECT ... FOR UPDATE` 锁住 stocks 行（sql.js 同步执行保证）
5. ✅ **self-move 禁止**：同订单同区域不允许调入/调出
6. ✅ **变种路径一致**：`A.crop_code 完整路径 == S.crop_code 完整路径`（细化到亚种）

### P1 必须实现

1. ✅ **弹窗 source 可用量实时显示**：选完 S 后显示"总库存 X / 已用 Y / 剩余 Z / 即将使用 N"
2. ✅ **弹窗 from_area stock 实时显示**：选完 A.area 后显示"该区域当前 M 株 / 即将调出 N / 操作后剩余 M-N"
3. ✅ **剩余 stock 校验**：调出后 A.from_area 剩余 ≥ 0
4. ✅ **履历完整性**：move_records 必含 planting_id、source/target 完整信息
5. ✅ **source 状态校验**：S.status = 已用完/已废弃 → 拒绝

---

## 6. 错误处理总表

| 场景 | HTTP | error 消息 |
|------|------|-----------|
| 调入 N > S 可用 | 400 | "来源库存不足" |
| 调出 N > from area stock | 400 | "调出区域当前只有 X 株，不足 Y 株" |
| 调出 to area 订单不存在 | 404 | "目标种植订单不存在" |
| 调入 S 不存在 | 404 | "来源种源/育苗记录不存在" |
| S 状态异常 | 400 | "来源记录状态不可用" |
| A 状态异常 | 400 | "订单已结束/已采收，不能调入/调出" |
| A.is_harvest_locked | 400 | "订单已锁定采收" |
| 作物编码不一致 | 400 | "来源/目标订单作物不一致" |
| 品种不一致 | 400 | "来源/目标订单品种不一致" |
| self-move | 400 | "源区域与目标区域相同" |
| 数量 ≤ 0 | 400 | "数量必须 > 0" |
| 软提醒（区域无作物） | — | 黄色 Toast，不阻断 |

---

## 7. 数据迁移

### 7.1 自动迁移脚本（启动时执行）

放在 `server/src/db/fixMissingSchema.ts`，与现有 schema 同步机制一致：

```ts
export function migrateToAreaStocks(): void {
  const db = getDatabase();

  // 1. 建 stocks 表
  db.run(`CREATE TABLE IF NOT EXISTS planting_area_stocks (...)`);

  // 2. 给 move_records 加 target 字段（如果缺失）
  const cols = db.exec("PRAGMA table_info(planting_move_records)");
  if (!cols[0].values.some(c => c[1] === 'target_type')) {
    db.run("ALTER TABLE planting_move_records ADD COLUMN target_type TEXT");
    // ... 同 target_id, target_code
  }

  // 3. 从 plantings 迁移到 stocks（仅当 stocks 没数据）
  db.run(`
    INSERT INTO planting_area_stocks
      (id, planting_id, area_id, area_name, quantity, source_type, source_code, operation_date, create_time, update_time)
    SELECT
      'STK_migrate_' || p.id,
      p.id,
      COALESCE(p.area_id, ''),
      COALESCE(p.area_name, '未分配'),
      p.planting_quantity,
      'migrate',
      p.planting_code,
      COALESCE(p.planting_date, date('now')),
      COALESCE(p.create_time, datetime('now')),
      datetime('now')
    FROM plantings p
    WHERE p.planting_quantity > 0
      AND NOT EXISTS (SELECT 1 FROM planting_area_stocks s WHERE s.planting_id = p.id)
  `);

  saveDatabase();
}
```

### 7.2 污染数据处理

- 迁移脚本把当前 `plantings.planting_quantity` 全部搬入 stocks
- **测试污染数据保留**（如 ZZ20260620-001 = 400 株），反映你测试后的真实状态
- 如需手动修正，提供 SQL：
  ```sql
  -- 把 ZZ20260620-001 的 stocks 改为 500
  UPDATE planting_area_stocks SET quantity = 500
   WHERE planting_id = 'PL1781961634584';
  ```

### 7.3 启动顺序

```
initDatabase() → createMaterialFlowLogTable() → migrateToAreaStocks() → 
fixMissingSchema() → deduplicateDictionaries() → seedBasicData → seedData → saveDatabase()
```

---

## 8. 前端改造

### 8.1 PlantingMoveModal 改造点

| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| `operationType` | 保留 | 调入/调出 |
| `toAreaId` / `toAreaName` | 保留 | 但语义改为"目标区域" |
| `quantity` | 保留 | 但**调入时不能超过 source 可用，调出时不能超过 from stock** |
| `operationDate` | 保留 | |
| `remarks` | 保留 | |
| **无** | `sourceType` | 调入必填：'seed' \| 'seedling'（**注**：种源和种苗共享 `seed_sources` 表，按 `source_type` 字段区分，**不存在独立的 `seedling_records` 表**） |
| **无** | `sourceId` | 调入必填：种源/育苗批号 ID |
| **无** | `sourceCode` | 显示用 |
| **无** | `targetPlantingId` | 调出必填：目标种植订单 ID |
| **无** | `targetPlantingCode` | 调出显示用 |

### 8.2 弹窗布局

**调入 (move_in)**：
```
┌─────────────────────────────────────────┐
│ 移入到种植订单                          │
├─────────────────────────────────────────┤
│ 目标种植订单: [PL1781961634584 ▼]       │
│ 目标区域:       [一棚 > 02区 ▼]          │
│ 来源类型:       ( ) 种源  ( ) 育苗       │
│ 来源批号:       [SRC-SS-20260620-001 ▼] │
│ 数量:           [_____] 株               │
│   该来源总库存: 1000 / 已用: 200 /       │
│   剩余: 800 / 即将使用: 100             │
│ 业务日期:       [2026-06-21]             │
│ 备注:           [_________________]      │
│                                         │
│ ⚠ 目标区域未种该作物，建议先创建种植记录│
│                                         │
│           [取消]    [确认移入]           │
└─────────────────────────────────────────┘
```

**调出 (move_out)**：
```
┌─────────────────────────────────────────┐
│ 从种植订单调出                          │
├─────────────────────────────────────────┤
│ 调出订单:       [PL1781961634584]        │
│ 调出区域:       [一棚 > 01区 ▼]          │
│ 目标订单:       [ZZ20260619-002 ▼]       │
│ 目标区域:       [二棚 > 01区 ▼]          │
│ 数量:           [_____] 株               │
│   该区域当前: 500 株 / 即将调出: 100 /  │
│   操作后剩余: 400 株                     │
│ 业务日期:       [2026-06-21]             │
│ 备注:           [_________________]      │
│                                         │
│           [取消]    [确认调出]           │
└─────────────────────────────────────────┘
```

### 8.3 Service 层改造

`src/services/apiPlantingService.ts` 新增：

```ts
export interface MovePlantingInputV2 {
  operationType: 'move_in' | 'move_out';
  toAreaId?: string;
  toAreaName: string;
  fromAreaId?: string;       // 调出时必填
  quantity: number;
  operationDate: string;
  remarks?: string;
  // 调入必填
  sourceType?: 'seed' | 'seedling';
  sourceId?: string;
  sourceCode?: string;
  // 调出必填
  targetPlantingId?: string;
  targetPlantingCode?: string;
  targetAreaId?: string;
  targetAreaName?: string;
}

export async function movePlantingV2(
  plantingId: string,
  input: MovePlantingInputV2
): Promise<{ id: string; ... }> {
  // POST /api/plantings/:id/move
}
```

### 8.4 Store 改造

`usePlantingStore` 不动；`handleMoveSubmit` 在 `await movePlantingV2(...)` 后 `await loadItems()` 触发列表刷新。

### 8.5 列表展示

`plantings.areaName` / `plantingCount` 已经是 stocks 聚合后的值（由后端 SQL 提供），前端零改动。

---

## 9. 测试覆盖

### 9.1 单元测试（Vitest）

```ts
// server/src/__tests__/plantingMoveV2.test.ts
- 调入 source 可用校验
- 调出 stock 不足校验
- 作物编码不一致拒绝
- 品种不一致拒绝
- self-move 拒绝
- 订单已结束拒绝
- source 已废弃拒绝
- stocks 累加正确性
- stocks 扣减正确性
- 履历写入完整性
- material_flow_log 写入
```

### 9.2 集成测试

- POST /api/plantings/:id/move 调入 → 200 + stocks 更新
- POST /api/plantings/:id/move 调出 → 200 + 双方 stocks 更新
- GET /api/plantings 返回新 stocks 聚合

### 9.3 端到端（手动）

1. 创建订单 A，500 株，一棚 01 区
2. 调入 100 株到一棚 02 区
3. 验证 stocks: (A, 一棚 01, 500) + (A, 一棚 02, 100)
4. 验证列表 A.plantingCount = 600
5. 验证列表 A.areaName = 一棚 01 区（主区域）
6. 调出 50 株到 B 订单，二棚 01 区
7. 验证 stocks: (A, 一棚 01, 450) + (B, 二棚 01, 50)
8. 验证 A.plantingCount = 550（不是 450）
9. 验证 material_flow_log 4 条记录
10. 验证 move_records 2 条记录

### 9.4 数据迁移测试

- 在 5 条测试数据上跑迁移脚本
- 验证 stocks 行数 = plantings 行数
- 验证 plantingQuantity = stock quantity
- 验证 areaName 正确迁移

---

## 10. 不在本期范围（P2/P3）

| 维度 | 优先级 | 备注 |
|------|--------|------|
| 跨生产计划调拨校验 | P2 | 后续迭代 |
| 生长周期阶段匹配 | P2 | 后续迭代 |
| 季节匹配 | P2 | 后续迭代 |
| 区域-作物适配性 | P2 | 后续迭代 |
| 跨基地/跨农场 | P2 | 后续迭代 |
| 权限校验 | P2 | 后续迭代 |
| 撤销调入/调出 | P3 | 后续迭代 |
| 批量调拨 | P3 | 后续迭代 |
| 弹窗草稿保存 | P3 | 后续迭代 |
| 库存对账工具 | P3 | 后续迭代 |

---

## 11. 风险与回滚

### 11.1 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 迁移脚本出错 | 数据丢失 | 迁移用 `INSERT OR IGNORE` + 幂等；可重跑 |
| stocks 数量与 planting.quantity 不一致 | 列表显示错乱 | 迁移后立即 SELECT 校验 |
| 弹窗字段太多用户体验差 | 用户拒绝使用 | 分步骤弹窗（先选订单，再选区域，最后选 source） |
| sql.js 不支持真正的 SELECT FOR UPDATE | 并发安全 | sql.js 单线程同步执行，无并发风险 |
| 现有 90 条 plantings 数据迁移后行为变化 | 用户需要重新学习 | 提供 release notes |

### 11.2 回滚方案

如生产事故需回滚：
1. 备份当前 `yuanxingtu.db`
2. 执行回滚 SQL（删除 stocks 表；move_records 删除新加字段）
3. 恢复 `planting.ts:330` 旧逻辑（只更新 area，不动 quantity）
4. 前端回滚到 V1 PlantingMoveModal

---

## 12. 实施计划（待 writing-plans 技能生成）

本规格批准后，下一步：
1. 调用 `writing-plans` 技能生成详细实现计划
2. 计划覆盖：建表 → 迁移 → 后端路由 → 前端弹窗 → 测试

---

## 附录 A：受影响的文件清单

### 后端

- `server/src/db/schema.ts` — 新增 stocks 表
- `server/src/db/fixMissingSchema.ts` — 新增 migrateToAreaStocks()
- `server/src/routes/planting.ts` — 改 `POST /:id/move` + GET 列表 SQL
- `server/src/db/seedData.ts` — 种子数据同步加 stocks 行
- `server/src/db/plantingMoveRecords.ts` — move_records 表结构

### 前端

- `src/components/farm/planting/modals/PlantingMoveModal.tsx` — 改弹窗
- `src/services/apiPlantingService.ts` — 新增 movePlantingV2()
- `src/components/farm/planting/PlantingPage.tsx` — 改 handleMoveSubmit
- `src/stores/usePlantingStore.ts` — 必要时改 action

### 测试

- `server/src/__tests__/plantingMoveV2.test.ts` — 新建
- `src/components/farm/planting/__tests__/PlantingMoveModal.test.tsx` — 新建

### 文档

- 本文件：`docs/superpowers/specs/2026-06-21-planting-move-redesign-design.md`
