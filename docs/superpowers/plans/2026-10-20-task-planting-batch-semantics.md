# P0-5 任务 ↔ 种植实例 + batch_code 语义修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让农事任务能回链种植实例与生产计划，并清除历史 `batch_code` 中的自造/混装值。

**Architecture:** `farm_tasks` 新增 `planting_id` / `production_plan_id` / `production_plan_code`；后端不再编造 `PC-` 批次；建任务弹窗把已选种植区域的 `id/code` 一并提交；历史数据用独立脚本（停服 + 备份）一次性迁移。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.5 P0-5）

## Global Constraints

- **禁止主动 commit / push**
- **数据迁移必须停服**：运行中的服务会用内存快照覆盖磁盘
- **迁移前必须备份**，且保留逐条报告
- 新增列两处同步：`schema.ts` CREATE + `fixSchemaColumns.ts`
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## 调研更正（相对原 Spec）

原 Spec 假设 `YM/JZ` 批次码是「育苗/种源批次」。实测更正：

| 事实 | 证据 |
|---|---|
| `JZ2026-016` = `production_plans.plan_code` | `PP1780229703300 / JZ2026-016` |
| `YM2026-012/015` 对应计划 id 已不存在 | `PP1779551268993`、`PP1778710515276` 在 production_plans 中查无 |
| `PC-` 前缀**不是用户填写** | 后端 `farmTask.ts` 原逻辑 `batch_code || batchCode || \`PC-${newId}\`` |
| `batch_id` 默认=任务自身 id | 同上：`batch_id || batchId || newId` |

因此迁移规则改为：生产计划关联 → `production_plan_id/code`；`PC-` 自造 → 清空。**不新增 `seedling_code`/`seed_source_code`**（无数据支撑）。

---

## Task 1: 数据表加列

- [x] `schema.ts`：`farm_tasks` 加 `planting_id`、`production_plan_id`、`production_plan_code`
- [x] `fixSchemaColumns.ts`：补三列 + `idx_farm_tasks_planting` / `idx_farm_tasks_plan`

## Task 2: 后端去掉编造批次

- [x] `farmTask.ts` POST：`batch_id`/`batch_code` 缺省改为 `null`（原为自身 id / `PC-{id}`）
- [x] POST 接受 `plantingId` / `productionPlanId` / `productionPlanCode` 并落库
- [x] INSERT 列数/占位符 48:48

## Task 3: 前端字段打通

- [x] `farmTaskStore.Task`、`types/task.ts` 加三个字段
- [x] `useTasks.createTask` 透传
- [x] `CreateTaskModal`：选中种植区域后提交 `plantingId` + `batchCode`（此前丢弃 id）

## Task 4: 数据迁移脚本

- [x] 新建 `server/scripts/db-migrations/migrateTaskBatchSemantics.cjs`
  - `--dry-run` / `--apply`
  - 自动备份 `<db>.bak.<timestamp>`
  - 逐条报告到 `server/data/task-batch-migration-report.<timestamp>.json`
  - 行数变化校验

## Task 5: 执行与验证

- [x] 停服 → dry-run → apply → 校验 → 重启

---

## 执行记录（2026-10-20）

### 迁移前数据分类（实测 34 条）

| 分类 | 数量 | 处理 |
|---|---|---|
| 生产计划关联（`batch_id LIKE 'PP%'`） | 7 | 迁到 `production_plan_id/code`，清空 `batch_id/batch_code` |
| `PC-` 自造 | 22 | 清空 `batch_id/batch_code` |
| 空 | 5 | 不动 |

### 迁移结果

| 校验项 | 结果 |
|---|---|
| 任务总数 | 34 → 34（不变） |
| 残留 `batch_code LIKE 'PC-%'` | 0 |
| 残留 `batch_id LIKE 'PP%'` | 0 |
| 计划关联已迁移 | 7 条（YM2026-012×4 / YM2026-015×2 / JZ2026-016×1） |
| 关键表行数 | plantings 86 / inventory_stock 101 / material_requests 21（均无变化） |
| 备份 | `server/data/yuanxingtu.db.bak.20261020-085601` |
| 报告 | `server/data/task-batch-migration-report.20261020-085601.json` |

### 新任务验证

| 场景 | 结果 |
|---|---|
| 不传批次建任务 | `batch_id=null, batch_code=null`（**不再编造 `PC-`**） |
| 传 `plantingId` + `batchCode` | `planting_id=PL1792154785270`、`batch_code=ZZ20261016-001` 正确落库 |
| 构建 / 前端全量测试 | 成功 / 37 文件 488 用例通过 |
| `/farm-hub` 回归 | 页面正常加载 |

## 回滚方案

- 迁移前的完整备份：`server/data/yuanxingtu.db.bak.20261020-085601`
- 代码回滚后新列保留无影响（additive）
- 被清空的 `PC-` 批次无业务含义，不需要恢复
