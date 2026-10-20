# P0-4 领料单 ↔ 农事任务 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 领料申请可关联农事任务，出库单继承该关联，任务详情可反查领料单及物料。

**Architecture:** `material_requests` / `material_executes` 各加 `task_id`/`task_code`；申请弹窗加任务下拉；出库单从来源申请单继承（多任务混单则不继承）；任务详情按 `task_id` 反查。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.4 P0-4）

## Global Constraints

- **禁止主动 commit / push**
- **新增列两处同步**：`schema.ts` CREATE + `fixSchemaColumns.ts`
- **Fail Loud**：查询/写入失败必须报错
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## Task 1: 数据表加列

- [ ] `schema.ts`：`material_requests` 与 `material_executes` 的 CREATE 各加 `task_id TEXT, task_code TEXT,`
- [ ] `fixSchemaColumns.ts`：两表各补两列 + `idx_material_requests_task` / `idx_material_executes_task` 索引

## Task 2: 后端领料单

- [ ] `materialRequest.ts` POST：INSERT 列表与参数加 `task_id`、`task_code`（取 `req.body.task_id / task_code`）
- [ ] `materialRequest.ts` PUT：`ALLOWED_UPDATE_COLUMNS` 加 `task_id`、`task_code`
- [ ] `materialRequest.ts` GET：支持 `?task_id=` 过滤

## Task 3: 后端出库单

- [ ] `materialExecute.ts` POST：从来源申请单继承任务
  - 显式传 `task_id` 优先
  - 否则按 `source_application_codes` 查 `material_requests`，**仅当去重后只有 1 个 task_id** 时继承
- [ ] INSERT 加两列

## Task 4: 前端类型与 Store

- [ ] `src/types/materialReceiving.ts`：`MaterialReceivingRecord` 加 `taskId?: string; taskCode?: string;`
- [ ] `useMaterialRequestDataStore.ts`：`FIELD_MAP` 加 `taskId: 'taskId'`、`taskCode: 'taskCode'`；`WRITE_FIELD_MAP` 加 `taskId: 'task_id'`、`taskCode: 'task_code'`
- [ ] `addItem` body 兜底：`body.task_id = body.task_id ?? item.taskId ?? null`

## Task 5: 申请弹窗加任务下拉

- [ ] `useApplicationTab.ts`：`getDefaultAddForm()` 加 `taskId: ''`；提交载荷加 `taskId: addForm.taskId || ''`
- [ ] `ApplicationModals.tsx`：AddModal 加「关联农事任务」下拉（读 `useFarmTaskStore`），修复表单类型定义
- [ ] `materialReceiving/modals/DetailModal.tsx`：展示「关联农事任务」

## Task 6: 任务详情反查领料单

- [ ] `src/components/farm/hub/TaskDetailModal.tsx`：挂载时 `GET /material-requests?task_id=<id>`，展示「关联领料单」区块（单号/日期/状态/物料明细）
- [ ] 无关联时不渲染区块

## Task 7: 构建 + 测试 + 浏览器实测

- [ ] `npm run build` / `npx vitest run` / 后端测试
- [ ] 重启后端（先告知）
- [ ] 实测：新建领料单选任务 → 详情显示任务 → 出库后出库单继承任务 → 任务详情显示该领料单

## 执行记录（2026-10-20）

| 任务 | 状态 | 证据 |
|---|---|---|
| Task 1 数据表加列 | 完成 | 重启后 `PRAGMA table_info` 两表均含 `task_id`/`task_code` |
| Task 2 后端领料单 | 完成 | POST 落库、PUT 白名单、GET `?task_id=` 过滤；后端 tsc 无输出 |
| Task 3 后端出库单 | 完成 | INSERT 17 列 / 17 占位符；自动继承来源申请单任务 |
| Task 4 类型与 Store | 完成 | 读写映射双向；`addItem` 兜底 `task_id` |
| Task 5 申请弹窗 + 详情 | 完成 | 下拉可选任务；领料详情显示「关联农事任务」 |
| Task 6 任务详情反查 | 完成 | 新增「关联领料单（N）」区块，含单号/日期/状态/物料 |
| Task 7 构建/测试 | 完成 | build 成功；37 文件 / 488 用例通过 |

### 接口实测

| 场景 | 结果 |
|---|---|
| 领料单带 `taskId` 创建 | 201；`GET /material-requests?task_id=` 精确返回 1 条 |
| 由该申请单创建出库单 | 出库单 `taskId`/`taskCode` **自动继承**（无需前端传） |
| 出库单无来源申请单 | `taskId` 为 null（不猜测） |

### 浏览器实测

| 场景 | 结果 |
|---|---|
| 任务详情 | 显示「关联领料单（1）」与「复合肥 × 3袋」 |
| 领料单详情 | 显示「关联农事任务 QA-P04U-...」 |

### 说明

- 出库单继承规则：显式传值优先；否则按 `source_application_codes` 查申请单，**去重后仅有 1 个 task_id 才继承**（多任务混单不继承，避免错误归属）
- 清单页列表列未加「关联任务」列（仅在详情展示），避免改动表格列宽与导出格式

## 回滚方案

新增列 additive；不传 `taskId` 即回到原行为。
