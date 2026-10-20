# P0-8 工时口径统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 任务验收的真实工时进入 `labor_records`（可按任务追溯），批次成本视图读真实人工成本，亩均成本可算。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.8 P0-8）

## 现状（实测）

| 项 | 现状 |
|---|---|
| `labor_records` | 3 行，无 `task_id`；`hourly_rate=50` 来自种子数据 |
| `employees.hourly_rate` | **6 人全为 NULL** |
| 系统工时单价约定 | 50 元/小时（`useOvertime.ts:164` 注明"临时默认值"）|
| `farm_operation_records.labor_cost_snapshot` | 列存在，**从未被写入** |
| `batch_cost_aggregation` 视图 | 存在但 **labor_cost / task_count 全为 0** |

## 口径决策

- **工时单价**：`employees.hourly_rate` 优先；为空时回退 **50**（沿用系统既有约定），实际取值写入 `labor_records.hourly_rate` 作为快照。
- **写入时机**：任务验收通过（`POST /farm-tasks/:id/complete`）时，与状态变更**同事务**写入。
- **幂等**：同一任务只允许一条 `labor_records`（按 `task_id` 去重），重复验收不重复计工时。
- **作业面积**：`farm_tasks.actual_area`（亩），验收时由前端可选输入；缺省不影响工时记录。

## Global Constraints

- 禁止主动 commit / push；禁止删除文件
- 新增列两处同步：`schema.ts` + `fixSchemaColumns.ts`
- 事务内写入，失败整体 ROLLBACK
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## Task 1: 列补齐
- [ ] `labor_records` 加 `task_id`、`task_code`、`area`；`farm_tasks` 加 `actual_area`
- [ ] `fixSchemaColumns.ts` 同步补列

## Task 2: 后端验收写工时
- [ ] `farmTask.ts` 抽出 `resolveHourlyRate(db, workerId)` 与 `syncLaborRecord(db, task, {actualHours, actualArea})`
- [ ] `/:id/complete` 事务内调用；同任务幂等（按 `task_id` 查重）
- [ ] `syncTaskOperationRecord` 补写 `worker_hourly_rate_snapshot` / `labor_cost_snapshot`

## Task 3: 成本视图读真实值
- [ ] `createBatchCostView.ts` 视图改：人工成本取 `labor_records`（按 task_id ↔ batch_code 关联），加 `actual_area` 汇总与 `cost_per_mu`
- [ ] 重建视图脚本执行（DROP + CREATE，视图非表，无数据风险）

## Task 4: 前端
- [ ] 验收弹窗加「作业面积（亩）」可选输入并随 complete 请求提交
- [ ] 任务详情显示实际工时与作业面积

## Task 5: 验证
- [ ] 构建 / 全量测试 / 后端测试
- [ ] 重启后端
- [ ] 接口实测：验收 → labor_records 新增一条带 task_id → 视图 labor_cost > 0
- [ ] 浏览器实测

## 执行记录（2026-10-20）

### 落地内容

| 项 | 内容 |
|---|---|
| 列补齐 | `labor_records` 加 `task_id`/`task_code`/`area`；`farm_tasks` 加 `actual_area` |
| 后端 | 新增 `resolveHourlyRate()`（`employees.hourly_rate` → 回退 50）与 `syncLaborRecord()`（幂等，同任务只一条）|
| 验收链路 | `POST /farm-tasks/:id/complete` 事务内写工时；实际工时回退读 `task.actual_hours`（`ActualHoursRecorder` 已写入该列）|
| 成本快照 | 作业记录写 `worker_hourly_rate_snapshot` / `labor_cost_snapshot`（此前两列从未被写入）|
| 成本视图 | `batch_cost_aggregation` 重写：人工成本改读 `labor_records`；标量子查询替代 `LEFT JOIN + SUM(DISTINCT)`（消除笛卡尔积重复计数）；新增 `actual_area` 与 `cost_per_mu` |
| 前端 | 验收弹窗加「作业面积（亩）」选填；`TaskAcceptanceAdapter` → `useTasks.acceptCompletion` → 请求体透传 `actual_area` |

### 实测

| 场景 | 结果 |
|---|---|
| 验收（2.5h / 1.5 亩） | 200；`labor_records` 新增 `LB20261020-0001`：2.5h × 50 = 125 元、area 1.5、`task_id` 正确、status=completed |
| 重复验收（9h） | **仍只有 1 条**（更新非新增），工时更新为 9 —— 幂等生效 |
| 成本视图 | `laborCost=450`、`costPerUnit=0.18`、`actualArea=1.5`、`costPerMu=300` —— 真实数据 |
| 视图重建 | `node server/src/db/createBatchCostView.ts`（需停服；better-sqlite3 写盘，sql.js 重启后加载）|
| 构建 / 全量测试 | 成功 / 37 文件 488 用例通过 |
| 清理 | 测试数据全删，`labor_records` 恢复 3 条种子数据 |

### 实施中的修正

首次实现时 `farm_operation_records` 的 INSERT 占位符多写 2 个 → 验收 500（事务已 ROLLBACK，无脏数据）。
**教训**：先前用的核对正则把 `VALUES (?, ?, 'task', ...)` 里的字面量漏计，误判为匹配。已改用专用脚本 `check-insert.cjs`（按括号配平 + `?` 计数 + 字面量计数），并把该 INSERT 改为全占位符（不再用 `'task'` 字面量）以消除歧义。

### 已知现状

- 视图覆盖 86 个批次，但当前 `laborCost>0` 的为 0 —— 历史任务的 `batch_code` 已在 P0-5 迁移中清空（原值是无效的 `PC-` 自造值），**新任务**选中种植区域后才有真实批次与成本。
- `employees.hourly_rate` 6 人全为 NULL，实际取用的是系统默认 50 元/小时（沿用 `useOvertime.ts` 的既有约定）。

## 回滚

新增列 additive；视图重建脚本可回退到旧定义（git 里有原文件）。
