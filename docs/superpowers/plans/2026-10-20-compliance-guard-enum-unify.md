# P0-10 合规报告修复 + 后端状态机守卫 + 枚举统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让合规报告不再"静默为空"；让后端成为任务状态机的权威；消除三份互相冲突的任务类型/优先级枚举。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.10 P0-10）

## Global Constraints

- 禁止主动 commit / push；禁止删除文件
- 失败必须抛错/返回错误/弹窗
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## A. 合规报告静默失败

### 实测列名错配

| 报告里的 SQL | 真实列 | 结果 |
|---|---|---|
| `plantings WHERE batch_code = ?` | 表中是 `planting_code` | 段恒空 |
| `inspections` 的 `inspection_date` | `check_date` | 段恒空 |
| `inspections` 的 `problem_description` | `issue_text` | 段恒空 |
| `problems WHERE batch_code = ?` | **无 `batch_code` 列** | 段恒空 |

全部被 `catch {}` 吞掉 → 报告"看起来正常但永远空白"。

### 改动
- [x] `plantings` 查询改 `planting_code`（3 处）
- [x] `inspections` 改 `check_date` / `issue_text`，补充 `record_code`/`check_time`/`check_result`/`issue_severity`
- [x] `problems` 改走 `source_task_id IN (SELECT id FROM farm_tasks WHERE batch_code = ?)`
- [x] 所有段查询改用 `runSection()` 包装，失败收集到 `sectionsErrors[]` 并随响应返回（**禁止 `catch {}`**）
- [x] download 端点同样不再静默
- [x] `farm_tasks` 段补 `completed_at` / `actual_hours` / `actual_area`

## B. 后端状态机守卫

- [x] `server/src/constants/index.ts`：`TaskStatus` 由 5 态补全为 12 态（含派生 overdue）
- [x] 新增 `TASK_STATUS_TRANSITIONS`（后端权威，此前只在前端 `src/config/taskConfig.ts`）
- [x] 新增 `assertTaskTransition(from, to)`：自转移放行、未知源状态仅告警、非法转移抛错
- [x] `farmTask.ts` 新增 `guardTransition(res, from, to)` → 非法转移返回 **409** + 明确文案
- [x] 接入 **12 个**流转端点：publish / withdraw / accept / start / progress / submit-acceptance / complete / reject / continue / cancel / abandon / overtime-abandon
- [x] `overtime-continue` 不改状态，无需守卫

## C. 枚举统一

| 位置 | 问题 | 处理 |
|---|---|---|
| `types/farm/common.ts` `PRIORITY_OPTIONS` | `high/medium/low`，实际用 `urgent/high/normal` → 选「中」写入 `medium`，列表显示空白 | 改为 `urgent/high/normal` |
| `taskDispatchConstants.ts` `TASK_TYPES` | 第二份副本，含 `pesticide`/`rootIrrigation` | 从 `FARM_OPERATION_TYPES` 派生，仅补图标颜色 |
| `hub/constants_taskDispatch.ts` `TASK_TYPES` | 第三份副本 | 同上 |
| `myTasks/constants.ts` `TASK_TYPES` | 第四份副本 | 同上 |
| `myTasks/MyTasksPage.tsx` `taskTypes` | 第五份副本 | 同上 |
| `dispatch/FarmTaskForm.tsx` `TASK_TYPES` | 第六份副本 | 同上 |

> 问题（`problems`）域的 `high/medium/low` **保持不变** —— 与任务优先级是不同的业务语义。

## D. 执行记录（2026-10-20）

| 项 | 结果 |
|---|---|
| 后端守卫数量 | 12 个调用点 + 1 个 `guardTransition` 定义 |
| 类型检查 | 前后端均无新增错误 |
| 构建 | 成功（43.8s）|
| 全量前端测试 | 37 文件 / 488 用例通过 |

### 验证状态

- **未做**：重启后端后的 409 实测（后端进程因系统内存偏低被自动停止，未擅自重启）
- 需在下次启动后端后验证：`PUT /farm-tasks/:id` 把 `completed` 改回 `pending` 应返回 409

## 回滚

- 枚举统一：恢复各文件原数组即可（无数据迁移）
- 状态守卫：删除 `guardTransition` 调用行即可回到无守卫（不推荐）
- 合规报告：仅列名修正，可单独回退
