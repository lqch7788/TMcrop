# P0-6 农事任务排班页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `farm_task_schedules` 这张有 14 行数据、后端服务与路由齐全的表真正有前端入口。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.6 P0-6）

## 根因

`useFarmTaskSchedule` 的接口类型定义为 **snake_case**，而服务端 `/api` 有全局 camelCase 响应中间件 → 实际返回 camelCase，类型与数据不匹配。这是该 Hook 从未被任何页面使用的原因。

## 命名消歧

| 页面 | 路径 | 排什么 |
|---|---|---|
| 任务派工排班（新增） | `/farm-task-schedule` | 哪条农事任务在什么时候由谁做 |
| 排班调度（保持不变） | `/schedule` | 工人考勤班次 |

## Global Constraints

- 禁止主动 commit / push
- 类型检查：`npx tsc -p tsconfig.app.json --noEmit`
- 失败必须弹窗，不静默

---

## Task 1: 修 Hook 字段映射
- [x] `useFarmTaskSchedule.ts` 类型改 camelCase（`planDate`/`workerName`/`taskId`/`shiftType`…）
- [x] `loadRecords` 增加 `filters` 参数（按日期/执行人/班组过滤）
- [x] `addSchedule` / `updateSchedule` / `deleteSchedule` 保持原样
- [x] 导出 `FARM_TASK_SHIFT_TYPES` 班次常量

## Task 2: 新建排班页
- [x] `src/pages/farm/TaskSchedulePage.tsx`
  - 左侧：待排班任务列表（可点选）
  - 右侧上：新增排班表单（执行人/班次/起止时间/备注）
  - 右侧下：当日排班列表（可删除）
  - 日期切换（前一天/日期选择/后一天）
- [x] 路由 `/farm-task-schedule`
- [x] 菜单：农事管理下新增「任务派工排班」；**原有「排班调度」名称保持不变**（2026-10-20 用户明确要求，勿改名）

## Task 3: 验证
- [x] 构建 / 全量前端测试
- [x] 浏览器实测：选任务 → 选执行人 → 保存 → 当日排班出现
- [x] 删除排班 → 列表清空、待排班恢复

## 执行记录（2026-10-20）

| 场景 | 结果 |
|---|---|
| 页面加载 | 待排班 3 条、当日排班 0 条；菜单显示「任务派工排班」「排班调度」 |
| 保存排班 | 提示「排班已保存」；待排班 3→2；当日排班新增 `NS20261010-509 / 白班 / 08:00~12:00 / 张三` |
| 删除排班 | 当日排班 1→0，待排班 2→3 |
| 构建 / 测试 | 成功 / 37 文件 488 用例通过 |

## 回滚

删除路由与菜单项即可；后端接口与表保持不动。
