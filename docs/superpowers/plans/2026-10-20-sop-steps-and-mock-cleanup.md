# P0-7 SOP 步骤编辑 + 任务绑定 / P0-9 静态 mock 清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `sop_steps`（0 行）/ `sop_task_bindings`（0 行）两张表真正可用；清理农事相关页面的硬编码假数据。

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.7 P0-7、§3.9 P0-9）

## 根因

| 现象 | 根因 |
|---|---|
| SOP 卡片看不到步骤 | `GET /api/sop` 列表端点不返回 steps → 前端 `sop.steps` 恒为 undefined |
| 步骤加不进去 | `camelCaseRequest` 中间件**未注册**，req.body 保持前端原样；后端读 snake_case、前端发 camelCase → `step_title` undefined → NOT NULL 失败 500 |
| SOP 新建/编辑也是坏的 | 同上（`POST /api/sop`、`PUT /api/sop/:id` 读 snake，前端发 camel） |
| 步骤删不掉 | 无 `DELETE /api/sop/steps/:id` 端点 |

## Global Constraints

- 禁止主动 commit / push；禁止删除文件（只重定向路由）
- 新增列两处同步；失败必须弹窗
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## Task 1: SOP 后端补齐（P0-7）
- [x] 列表端点带出 steps（一次查询 + 内存按 sop_id 分组）
- [x] 新增 `GET /api/sop/bindings?task_id=`（**必须注册在 `GET /:id` 之前**）
- [x] `POST /:id/steps`、`POST /`、`PUT /:id` 增加 camel/snake 双读兼容
- [x] 新增 `DELETE /api/sop/steps/:id`

## Task 2: SOP 前端（P0-7）
- [x] `apiSopLibraryService` 补 `addSopStep` / `deleteSopStep` / `bindSopToTask` / `unbindSopFromTask` / `getSopBindings`；`createSop`/`updateSop` 统一发 snake_case
- [x] `SopLibraryPage`：每张卡片加「添加步骤」「绑定任务」按钮 + 两个 Modal + 步骤删除按钮
- [x] `TaskDetailModal`：新增「作业标准」区块（显示绑定 SOP 的步骤清单）

## Task 3: 静态 mock 清理（P0-9）
- [x] `/iot/weather` 气象页：接 `useWeatherStore`（真 Open-Meteo），统计由真数据计算；错误显式提示；假按钮改「刷新」
- [x] `/manage/cost` → 重定向 `/summary/business-analysis`（真成本分析页）
- [x] `/traceability/*` 6 页 → 重定向 `/crop/material-flow`（真流转追溯页）
- [x] `GrowthAnalysis.tsx` 长势页：加显著「演示数据」横幅
- [x] `useEquipmentStore.ts`：文件头标注「前端种子数据，无后端表」

## 执行记录（2026-10-20）

### 实测

| 场景 | 结果 |
|---|---|
| SOP 列表带 steps | `GET /api/sop` 返回 `steps: []`（数组存在，非 undefined）|
| 添加步骤（接口） | 201，`sop_steps` 新增 1 行 |
| 绑定任务（接口） | `sop_task_bindings` 新增 1 行；`GET /api/sop/bindings?task_id=` 返回该 SOP 且 `steps: 1` |
| 添加步骤（浏览器） | 提示「步骤已添加」，卡片折叠区显示「查看 1 个步骤」|
| 删除步骤（浏览器） | 提示「步骤已删除」，`sop_steps` 归 0 |
| 数据清理 | `sop_steps` / `sop_task_bindings` 均归 0 |
| 构建 / 全量测试 | 成功 / 37 文件 488 用例通过 |

### 关键发现

**`camelCaseRequest` 中间件未在 `index.ts` 注册** —— 这是 SOP 新建/编辑/加步骤三处 500 的共同根因。已改为后端双读兼容（snake + camel），前端统一发 snake_case。

### 已知现状

- 气象页用浏览器定位，失败时回退北京默认坐标（`useWeatherStore` 既有行为，页面已标注）
- 溯源 6 页与成本页的原文件**保留未删**，仅路由重定向
