# P1-1 / P1-2 / P1-3 合规三批 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md`（§3.12 / §3.13 / §3.14）

## Global Constraints

- 禁止主动 commit / push；禁止删除文件
- 新增列两处同步（schema.ts + fixSchemaColumns.ts）
- 合规记录不可物理删除（软删除留痕）
- 类型检查：前端 `npx tsc -p tsconfig.app.json --noEmit`；后端 `npx tsc --noEmit`

---

## P1-1 合规生产档案

**依据**：《农产品质量安全法》第 27 条 —— 生产记录须含
①投入品名称/来源/用法/用量/使用与停用日期 ②病虫害发生与防治情况 ③收获日期；保存 ≥2 年。

| 改动 | 内容 |
|---|---|
| 列 | `fertilizer_records` / `pesticide_records` 各加 `source` / `stop_use_date` |
| 后端写入 | 施肥/农药的 Zod schema、record 构造、repository INSERT 全链路支持 |
| 前端表单 | 施肥/用药新增弹窗各加「投入品来源」「停用日期」 |
| 合规报告 | 新增 `productionRecord` 段：`fertilizerUsage` / `pesticideUsage` / `pestOccurrences` / `harvests` + `retentionUntil`（最早记录 +2 年） |
| 导出 | 合规报告页新增「导出 Excel」→ 真 xlsx（4 sheet：投入品使用 / 病虫害防治 / 收获记录 / 留存说明） |

## P1-2 记录不可静默修改

| 改动 | 内容 |
|---|---|
| 列 | `farm_operation_records` / `fertilizer_records` / `pesticide_records` 各加 `deleted_at` / `deleted_by` / `delete_reason`；`harvest_records` 补 `deleted_by` / `delete_reason` |
| 作业记录删除 | 改为软删除；**已验收（completed）记录禁止删除** → 409 + 法条说明 |
| 作业记录读取 | 默认 `deleted_at IS NULL` |
| 施肥/农药删除 | `deleteById` 改为软删除；`findAll` / `findById` 默认排除已删除 |
| 库存 | 删除仍按原逻辑恢复库存（软删除不改变账务语义） |

## P1-3 承诺达标合格证

**依据**：《农产品质量安全承诺达标合格证管理办法》（2026-02-01 施行）
- 第 8 条按生产批次开具、做好开具记录
- 第 14 条内容项
- 二维码须显著标明「承诺达标合格证」字样
- 开具记录留存 ≥6 个月

| 改动 | 内容 |
|---|---|
| 表 | `compliance_certificates` + `compliance_certificate_items`（启动时 `CREATE TABLE IF NOT EXISTS`） |
| 编号 | `HGB{YYYYMMDD}-{4位当日序号}`，禁止随机数 |
| 接口 | `GET /`（支持 batch_code/status 过滤）、`GET /:id`、`POST /`（开具）、`POST /:id/void`（作废不删除，原因必填） |
| 页面 | `/agronomy/compliance-certificates`：开具表单 + 分项明细 + 列表 + 预览（**真实二维码** `qrcode.react`，非占位图）+ 打印 |
| 菜单 | 农事管理 → 承诺达标合格证；`processRouteMap` 挂 `PROC_FARM` |

---

## 执行记录（2026-10-20）

| 项 | 结果 |
|---|---|
| 后端类型检查 | 无输出 |
| 前端类型检查 | 涉及文件无新增错误 |
| 构建 | 成功（36.9s）|
| 全量前端测试 | 37 文件 / 488 用例通过 |

### 重启后端后的端到端验证（19 项通过 / 20 项，1 项暴露真实缺陷已修）

| # | 场景 | 结果 |
|---|---|---|
| 1 | 合规报告可生成 | PASS |
| 2 | `sectionsErrors` 字段存在且能报错 | PASS（初次跑时报出 `problems.created_at` 不存在）|
| 3 | 巡查段列名修正 | PASS（`check_date`）|
| 4 | 问题段 | **初次 FAIL** → 实为 `problems.created_at` 不存在（实列 `create_time`）；修复后 9 段全齐、`sectionsErrors: []` |
| 5 | 合规生产档案段 | PASS |
| 6 | 留存期字段 | PASS |
| 7 | 合法转移 draft→pending | PASS 200 |
| 8 | 非法转移 pending→completed | **PASS 409**「允许：accepted/cancelled/draft」|
| 9 | 合法链走到 completed | PASS |
| 10 | 已完成任务回退 | **PASS 409**「允许：无」|
| 11 | 验收后生成作业记录 | PASS |
| 12 | 已验收记录禁止删除 | **PASS 409** |
| 13 | 非验收记录可软删除 | PASS 200 |
| 14 | 软删除后列表不可见 | PASS |
| 15 | 施肥记录含 `source`/`stopUseDate` 字段位 | PASS |
| 16 | 合格证可开具 | PASS（`HGB20261020-0001`）|
| 17 | 二维码含「承诺达标合格证」字样 | PASS |
| 18 | 合格证列表带明细 | PASS（items=1）|
| 19 | 合格证可作废 | PASS |
| 20 | 重复作废拦截 | PASS 409 |

> **P0-10 的 `sectionsErrors` 机制在本轮验证中发挥了作用**：它没有让报告"静默空白"，而是直接把 `no such column: p.created_at` 报了出来，使缺陷在验证阶段即被发现并修复。

### 遗留测试数据（需用户授权后清理）

验证过程产生了 3 条测试数据，其中 2 条受 P1-2 保护无法通过 API 删除：

| 表 | 记录 | 状态 |
|---|---|---|
| `farm_operation_records` | `OP20261020-0001` | completed（**已验收禁删**）|
| `farm_operation_records` | `QA-OP-1792474848033` | 软删除（列表不可见，物理保留）|
| `compliance_certificates` | `HGB20261020-0001` | voided（测试主体）|

清理需停服后定向删除这 3 行。

## 已知取舍

- `harvest_records` 已有 `deleted_at`，本次只补 `deleted_by`/`delete_reason`，其删除路由未改软删除（避免影响既有采收撤回逻辑）
- 合格证二维码内容为 JSON（含「承诺达标合格证」标题字段），未与 `traceability_code` 动态合并（后续可整合）
