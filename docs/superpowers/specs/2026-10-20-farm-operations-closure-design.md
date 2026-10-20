# 农事管理模块：闭环修复与功能域规划（设计文档）

> 日期：2026-10-20 ｜ 状态：待评审 ｜ 分支基线：`planting-management`
> 调研方式：4 路并行代码盘点（前端路由/组件、后端 API+表、相邻模块覆盖度、行业功能域）+ 实库 194 张表逐表统计 + 人工抽查

---

## 0. 决策摘要

### 0.1 已确认的三个前提（本轮规划据此收敛）

| 前提 | 选择 | 对规划的直接约束 |
|---|---|---|
| 方案主线 | **闭环修复优先** | 不新建业务模块；先把已建但断裂的能力接线 |
| 使用场景 | **自有单基地** | 不做多租户、不做作业轨迹核验、不做社会化服务结算 |
| 合规目标 | **国内基本合规** | 满足《农产品质量安全法》第 27 条生产记录（≥2 年）+ 承诺达标合格证；不追求 GlobalGAP 地块编码统一 |

### 0.2 一句话结论

> **农事管理不缺功能，缺的是"接线"。**
> 50+ 张表、35+ 个后端路由、16+ 个前端页面、AI 派工 / 工时预测 / 移动端离线上报 / 批次时间线 / 合规报告都已建成；
> 但实库里 **4 张核心表 0 行、6 个外键列全库 0 条有值、1 个字段语义完全错乱**。
> 农事管理当前处于"骨架齐全、血肉未接"的状态——先接线，再谈扩张。

### 0.3 现状硬数据（实库实测，非推测）

```
farm_operation_records   0 行    ← 46 列作业记录表，页面读 localStorage，表只写不读
sop_steps                0 行    ← SOP 步骤表，前端只读不可编辑
sop_task_bindings        0 行    ← SOP↔任务绑定表，无绑定 UI
fertilizer_records.farm_task_id 有值 = 0    ← 列+索引+服务端写入逻辑齐备，前端从不传
plantings.production_plan_code 有值 = 0      ← 种植↔生产计划 0 关联
plantings.growth_status 空 = 83/86          ← 生育期未持久化
labor_records            3 行    ← 任务.actual_hours 与人工工时表未打通
farm_task_schedules     14 行    ← 表+路由+hook 齐全，前端零引用
farm_tasks.batch_code    34 条分类：PC-自造 22 / YM·JZ 育苗种子源批次 7 / 空 5
                           与 plantings.planting_code(ZZ 前缀) 交集 = 0
```

### 0.4 为什么不新建模块

10 个关键能力**已存在、可直接复用**，重建即重复建设：

1. `farm_operation_records` 46 列（工时/工作量/物料/GPS/前后照片/语音/工价快照/子记录）—— 作业结果记录模型现成
2. `fertilizer_records` / `pesticide_records` / `watering_records` —— "谁在何时对哪块地施了什么"字段完备，**只差挂 `farm_task_id`**
3. `src/types/farm/taskTypeConfig.ts` 任务类型动态表单引擎（`multiEntry` 混合配比）—— 施肥任务已能录多肥料配比
4. `sop_library`（60 条，18 个物候期）+ `useCropGrowthEngine` —— 物候期规则已有
5. `batch_timeline_view` 视图（5 表 UNION）—— 批次时间线不用新建
6. 巡查→问题→任务→操作记录闭环 —— **全系统最完整的农事闭环**，新分支可直接沿用 `source_problem_id` 模式
7. `batch_cost_aggregation` 视图 + `farm_operation_records.labor_cost_snapshot` —— 成本归集不用新建表
8. 基地→温室→区域→地块 5 级空间主数据（`bases/greenhouses/zones/blocks`）—— 地块下拉不用新建
9. `farm_tasks` 80 列 + `task_operation_records` 421 条事件流 —— 任务生命周期不用重做
10. 移动端 PWA + `POST /api/offline-sync`（clientId 幂等）—— 现场上报不用新建

---

## 1. 现状基线

### 1.1 农事管理实际能力全景

| 层 | 实际已有（超出菜单露出的 5 项） |
|---|---|
| **菜单** | 5 项：农事任务中心 / 智能任务中心 / 排班调度 / 班组分配 / 每日工单汇总 |
| **路由可达页面** | 16+：`/work-log` `/temp-task` `/my-tasks` `/dispatch` `/smart-dispatch` `/monthly-planning` `/daily-planning` `/inspection` `/problem-dispatch` `/agriculture-record` + **9 个 `/agronomy/*` 工具页** + **移动端 `/m/operation-report`** |
| **后端农事路由** | 35+（farmTask / taskProgress / farmTaskSchedules / farmTaskSwapRequests / schedule / dispatch / inspection / problem / issueTracking / attendance / workLog / tempTask / farmOperationRecords / team* ×6 / sopLibrary / offlineSync / paperReport / reminders / batchTimeline / complianceReport / batchCost / dailyPlans / monthlyPlans / harvest / planting / summary / productionPlan / material* / ai/* ×7） |
| **AI 能力** | 派工推荐（7 因子评分）、智能排班（硬/软约束）、工时预测（MAPE 12.93%，n=965 真实工时）、出勤异常检测（4 类 + z-threshold）、资源优化、审批建议、语音（**V1 为假解码**） |
| **真闭环** | 巡查→问题→任务 **双向关联**（`source_problem_id`/`source_inspection_id`）、任务状态机 10 态 + 事件流、审批联动（4 类 QUICK 单人）、SOP 绑定任务、批次统一时间线、合规报告、移动端离线补传 |
| **半成品** | SOP 库（表空）/ 任务排班（前端零引用）/ 作业记录（表空）/ 农事计划（`farm_activities` 表只写种子零读取）/ 农机具（无后端表）/ 气象（真 API 已有，页面 mock） |

### 1.2 17 个行业功能域 → 本项目覆盖映射

| 域 | 业界术语 | 必要性 | 本项目状态 | 结论 |
|---|---|---|---|---|
| A 基础主数据与空间档案 | Field/Block Registry | 必须 | **已有** 5 级空间模型 | 需补：任务挂地块（P2 记为技术债） |
| B 农事计划与排程 | Crop Plan / Calendar | 必须 | **半成品** `farm_activities` 孤儿表 + 硬编码 `CROP_STAGE_TASK_CONFIG` | P2 规划 |
| C 作业标准 / SOP | Work Instruction | 应该 | **空壳** `sop_steps`/`sop_task_bindings` 0 行 | P0-7 补最小可用 |
| D 作业执行与工单派发 | Work Order / Dispatch | 必须 | **已有且完整** | — |
| E 巡田巡查与田间观察 | Crop Scouting | 必须 | **已有且最完整** | 缺阈值判定（P2） |
| F 投入品使用记录 | Spray/Application Log | 必须 | **数据全有，闭环缺** | P0-3 补 |
| G 农资与库存 | Input Stock | 应该 | **两套独立账不通** | 记为 P2 |
| H 农机具与设备 | Fleet Management | 应该 | **无表** | P2（自有单基地可先不做） |
| I 人员/班组/工时/计件 | Crew / Piece Rate | 应该 | **已有** 7 张班组表 + 考勤 | P0-8 补工时口径 |
| J 成本核算与作业成本 | Job Costing | 应该 | **视图有、数据空** | P0-8 + P0-9 |
| K 采收与地块绩效 | Harvest / Yield | 必须 | **已有** 136 条采收记录 | — |
| L 农事档案/追溯/合格证 | Traceability / 合格证 | 必须 | **部分** 流转追溯真、合格证无 | P1-1 / P1-3 |
| M 气象与农事窗口 | Spray Window | 可选 | 真 API 有、页面 mock、无预警 | P0-9 修页面；P2 做规则 |
| N 物候期/生育期 | BBCH / Phenology | 应该 | **未持久化** | P2 |
| O 物联网与农情监测 | 四情监测 | 可选 | **已有** iot_* 表 | — |
| P 经营分析与 KPI | Cost per Hectare | 应该 | 汇总看板真、成本页 mock | P0-9 + P2 |
| Q 移动端/离线/多基地 | Offline-first | 必须(移动) / 可选(多基地) | **移动端已有**；多基地不做 | — |

### 1.3 17 个孤儿能力清单（实库证据）

| # | 孤儿 | 断点 | 证据 | 批次 |
|---|---|---|---|---|
| O1 | `farm_operation_records` 作业记录 | 页面读 localStorage，表只写不读 | `useOperationRecords.ts:652`；实库 0 行 | P0-1 |
| O2 | `fertilizer_records.farm_task_id` | 服务端会写，前端从不传 | `fertilizer.service.ts:546`；实库 0 条 | P0-3 |
| O3 | `pesticide_records` ↔ 任务 | **连列都没有** | `PRAGMA table_info` 无 task 字段 | P0-3 |
| O4 | 农资库存 ↔ 物资库存 | 两套账（`fertilizer_specs.stock_quantity` vs `inventory_stock`） | `fertilizer.repository.ts:397` vs `routes/inventory.ts` | P2 |
| O5 | 领料单 ↔ 农事任务 | 无 `task_id`、无任务下拉 | `material_requests` 列清单 | P0-4 |
| O6 | 种植实例 ↔ 农事任务 | `plantings.production_plan_code` 实库 0；建任务弹窗选了种植区域却丢弃 id | `CreateTaskModal.tsx:160-180` | P0-5 |
| O7 | `farm_tasks.batch_code` 语义错乱 | 34 条混装 3 种语义：PC-自造 22 / YM·JZ 育苗种子源批次 7 / 空 5；与 planting_code 交集 0 | 实库 join 校验 | P0-5 |
| O8 | SOP → 任务 | 步骤表/绑定表 0 行，无编辑器、无绑定 UI | 实库 0 行 | P0-7 |
| O9 | `farm_task_schedules` 农事任务排班 | 前端零引用 | `grep farm_task_schedules src/` 仅注释 | P0-6 |
| O10 | `daily_records` ↔ 作业记录 | 90 条真实记录，但无 farm-task 类型，两套体系互不相通 | `record_type` 只有 planting/seedling | P0-2 |
| O11 | `farm_tasks.materials` 任务用料 | 自由 JSON，不查物料主数据、不扣库存、不回写领料 | `CreateTaskModal.tsx:52` | P0-3/P0-4 |
| O12 | `/manage/cost` 成本核算 | 纯静态 mock 数组 | `CostAccounting.tsx:11` | P0-9 |
| O13 | `/traceability/*` 6 页 | 全部 V1.3 静态页 | `TraceCode.tsx` 写"页面开发中" | P0-9 |
| O14 | `/iot/weather` 气象页 | 静态 8 条假数据（真 API 在 `/api/weather`） | `WeatherMonitoring.tsx:11` | P0-9 |
| O15 | 农机具台账 / 设备折旧 | 无后端表，折旧硬编码 0 | `createBatchCostView.ts` | P2 |
| O16 | 提醒规则 | `reminder_rules` 仅 1 条（任务超期） | 实库 1 行 | P2 |
| O17 | `farm_tasks.actual_hours` ↔ 工时 | 与 `labor_records`（3 行）未打通 | `labor_records` 无 task_id | P0-8 |

### 1.4 假成功与静默失败缺陷（必须修，违反 Fail Loud）

| 位置 | 现象 |
|---|---|
| `AgricultureRecordPage.tsx:189` `handleConfirmDelete` | 注释写"实际删除逻辑"但函数体**只关弹窗**，数据没删 —— 用户以为删了 |
| `AgricultureRecordPage.tsx:214` `handleConfirmExport` | 同样空实现，**不导出任何文件** |
| `AgricultureRecordPage.tsx:240` `handleRejectRecord` | task 类型弹"任务驳回功能暂未实现" |
| `complianceReport.ts:106-142` | `inspections` 查询用 `inspection_date`/`problem_description`（实为 `check_date`/`issue_text`）；`problems` 查询用 `batch_code`/`rectification_progress`/`recheck_result`（**三列不存在**）。全部包在 `catch {}` 里 → **巡查段与问题段永远为空，且不报错** |
| `server/src/routes/farmTask.ts` 17 个流转端点 | 直接 `UPDATE ... SET status`，**无状态守卫**；转移表只存在于前端 `src/config/taskConfig.ts:138`。直调 API 可把 `completed` 改回 `pending` |
| `server/src/constants/index.ts:26-32` | `TaskStatus` 枚举只有 5 态，实际 10 态；`overdue` 是派生值不落库 |
| `src/pages/business/CostAccounting.tsx` | 10 条硬编码成本记录冒充真实数据 |
| `src/pages/diagnosis/GrowthAnalysis.tsx` | 12 条写死长势记录 |

### 1.5 高危技术债（影响本轮实施）

| # | 问题 | 影响 |
|---|---|---|
| T1 | 后端状态转移零守卫 | 加守卫时会挡住现有前端流程（前端 10 态 vs 后端 5 态） |
| T2 | `farm_tasks` 表结构分裂三处（CREATE 33 列 / schema ALTER / fixMissingSchema / migrations SQL），运行时真实 ~70 列 | 新建库与老库漂移风险；新增列必须**同时**改 `schema.ts` + `fixMissingSchema.ts` 的 `*ColumnsToAdd` 数组 |
| T3 | `farmTask.ts` 在 `routes/index.ts:219` 与 `:226` **重复挂载** | 路由行为不可预期 |
| T4 | `farmTask.service.ts`（175 行，影子实现，字段命名还不一致）路由未引用 | 误导后续开发 |
| T5 | `approvalLinkage.ts` 与 `approvalLinkage.service.ts` 双 `updateFarmTask` 语义不一致（后者不清空 assignee） | 审批驳回后执行人残留 |
| T6 | 两套换班实现并存（`swap_requests` 中文状态 / `farm_task_swap_requests` 英文状态），路径双层嵌套 `/api/farm-task-swap-requests/swap-requests` | — |
| T7 | `sql.js` 全量落盘：批量排班 100 条 = 100 次写盘 ≈ 2.2GB | 批量写端点必须合并落盘 |
| T8 | `team_members` 与 `worker_team_assignments` 不同步 → 班组可用性永不刷新，派工按过期工时评分 | 派工推荐质量 |
| T9 | 枚举三处重复冲突：`FARM_OPERATION_TYPES`(12) vs `TASK_TYPES`(10) vs `MyTasksPage` 副本(10)；`PRIORITY_OPTIONS`(high/medium/low) vs 实际用 `urgent/high/normal` | 显示错乱 |
| T10 | `components/farm/hub/` 与 `components/farm/taskDispatch/` ~14 个同名同功能文件 | 改一处漏一处 |

---

## 2. 目标架构

### 2.1 农事管理 IA 重构（P0-11 落地形态）

```
农事管理（侧边栏实际菜单）
├─ 农事任务中心        /farm-hub
├─ 智能任务中心        /task-center
├─ 任务派工排班        /farm-task-schedule   ← P0-6 新建
├─ 排班调度            /schedule            （名称保持不变）
├─ 班组分配            /team
└─ 每日工单汇总        /daily-work-summary

系统设置 → 运营管理（/settings/operations，8 个 Tab）
├─ SOP 标准库          /agronomy/sop-library
├─ 问题整改            /agronomy/issue-board
├─ 提醒规则            /agronomy/reminders
├─ 批次成本            /agronomy/batch-cost
├─ 合规报告            /agronomy/compliance-report
├─ 承诺达标合格证      /agronomy/compliance-certificates  ← P1-3 新增（与合规报告同组）
├─ 数据备份            /agronomy/backup-center
├─ 快速完成            /agronomy/quick-complete
└─ 纸单录入            /agronomy/paper-report

其它入口（不在侧边栏）
- 农事操作记录 /agriculture-record（顶级菜单「农事管理」落地页）
- 我的任务 /my-tasks、工作日志 /work-log、生产领料 /material-receiving 等
- 批次时间线 /agronomy/batch-timeline/:batchCode（从种植页行级跳转）
- 手机端 田间作业上报 /m/operation-report
P2 规划：农事计划与日历 /farm-plan、农机具台账 /farm-equipment
```

> ⚠️ **2026-10-20 修正**：本设计初稿曾计划把上述 8 个工具页「归位」到农事管理菜单，
> 实施后被用户否决 —— **它们的既定位置就是「系统设置 → 运营管理」，不得移动**。
> P0-11 中该部分已回退。

**命名消歧原则**（对应 T9）：同一系统内不得出现两处"排班"、两处"任务中心"、两处"成本"，靠路径与副标题区分。

### 2.2 数据模型补齐

**新增列**（每列必须三处同步：`schema.ts` + `fixMissingSchema.ts` 的 `*ColumnsToAdd` + 必要时 `migrations/`）

| 表 | 新增列 | 用途 | 批次 |
|---|---|---|---|
| `farm_operation_records` | `task_id TEXT` + idx | 作业记录↔任务强关联 | P0-2 |
| `pesticide_records` | `farm_task_id TEXT` + idx | 用药记录回链任务 | P0-3 |
| `material_requests` | `task_id TEXT`, `task_code TEXT` + idx | 领料单回链任务 | P0-4 |
| `material_executes` | `task_id TEXT` + idx | 出库执行回链任务 | P0-4 |
| `farm_tasks` | `planting_id TEXT`, `production_plan_id TEXT` | 任务回链种植实例/生产计划 | P0-5 |
| `farm_tasks` | `seedling_code TEXT`, `seed_source_code TEXT` | 承接原 `batch_code` 混装的育苗/种源批次语义（7 条） | P0-5 |
| `farm_tasks` | `actual_area REAL` | 作业面积（亩）→ 亩均成本/作业量 | P0-8 |
| `labor_records` | `task_id TEXT` + idx | 工时回链任务 | P0-8 |
| `fertilizer_records` | `source TEXT`, `stop_use_date TEXT` | 合规：投入品来源/停用日期 | P1-1 |
| `pesticide_records` | `source TEXT`, `stop_use_date TEXT` | 合规：同上 | P1-1 |

**新增表**（P1）

| 表 | 关键列 |
|---|---|
| `compliance_certificates` | `certificate_no`, `batch_code`, `product_name`, `quantity`, `unit`, `origin`, `issued_at`, `issuer_name`, `issuer_contact`, `cert_type`, `qr_content`, `status`, `created_at` |
| `compliance_certificate_items` | `certificate_id`, `item_name`, `quantity`, `unit`, `grade` |
| `production_record_archive`（可选） | 若需固化 ≥2 年留存快照：`record_no`, `batch_code`, `record_type`, `content JSON`, `retention_until` |

> **不做**：不为 P1-1 单独建"生产记录表"。三类内容已分散在 `fertilizer_records`/`pesticide_records`/`watering_records`/`inspections`/`problems`/`harvest_records`，P1-1 应做**聚合查询 + 导出层**，避免第五套账。

**数据修正**（P0-5，需停服改盘）

```
farm_tasks.batch_code 当前 34 条（实库分类）：
  PC-自造   22 条   例 "PC-NS20260612-395"  = "PC-" + 自身 task_code，无外部含义
  YM/JZ      7 条   "YM2026-012"×4 "YM2026-015"×2 "JZ2026-016"×1
                      —— 分别是育苗批次码与种源批次码（不是种植批次）
  空         5 条
  参考：plantings.planting_code 形如 "ZZ20260315-001"（ZZ = 种植批次）
  结论：batch_code 一个字段混装了 3 种语义，且与 planting_code 无交集

修正脚本逻辑（按分类分治，禁止一刀切置空）：
  1. PC-自造 22 条：剥 "PC-" 前缀还原为 task_code 本身
       → 用还原值去 plantings.planting_code(ZZ 前缀) 匹配
       → 匹配上：写回真实 planting_code
       → 匹配不上：batch_code 置 NULL + 写 migration_log（禁止瞎造）
  2. YM/JZ 7 条：语义是育苗/种源批次，**不是种植批次**
       → 新建 farm_tasks.seedling_code / seed_source_code 两列承接
       → batch_code 置 NULL
  3. 空 5 条：保持空
  4. 校验：SELECT COUNT(*) FROM farm_tasks t JOIN plantings p ON t.batch_code=p.planting_code
       修正后应 > 0；且 batch_timeline_view 能查出真实批次任务
  5. 迁移日志条数 = 被改写 + 被置空的条数（逐条可核，不允许静默丢数据）
```

### 2.3 关键接口变更

| 端点 | 变更 | 批次 |
|---|---|---|
| `POST /api/farm-tasks/:id/complete` | 事务内：① 更新任务状态 ② 写 `farm_operation_records`（source_type='task', task_id, source_id）③ 按 `task_type` 分流写 `fertilizer_records`/`pesticide_records`/`watering_records` ④ 写 `labor_records`（actual_hours）⑤ 调 `saveDatabase()` | P0-2/P0-3/P0-8 |
| `POST /api/farm-tasks/:id/progress` | 同上，追加一条作业记录（进行中） | P0-2 |
| `POST /api/farm-tasks` / `PUT /:id` | 接受 `plantingId` / `productionPlanId` / `actualArea` | P0-5 |
| `POST /api/material-requests` | 接受 `taskId` / `taskCode` | P0-4 |
| `GET /api/compliance-report/:batchCode` | 修列名；响应新增 `sectionsErrors[]`；**禁止空 catch** | P0-10 |
| 17 个状态流转端点 | 加 `assertTransition(current, next)` 守卫，非法转移返回 409 | P0-10 |
| `GET /api/farm-task-schedules/*` | 保持不变，新增前端消费 | P0-6 |

### 2.4 单一真相源整改（对应 T1/T9）

| 主题 | 现状 | 目标 |
|---|---|---|
| 任务状态枚举 | 4 处定义（`types/task.ts`、`useTasks.TASK_STATUS_CONFIG`、`constants_taskDispatch.TASK_STATUS_MAP`、`server/constants.TaskStatus`），后端只有 5 态 | 后端 `server/src/constants` 成为权威 10 态；前端三处改为从 API/常量包引用 |
| 状态转移表 | 只在前端 `src/config/taskConfig.ts:138` | 迁移到后端 `server/src/constants`，前端从 API 拉取（可 `system_config` 覆盖） |
| 任务类型 | 3 份副本且不一致（`pesticide` vs `pest_control`） | 统一到 `src/types/farm/common.ts` 的 `FARM_OPERATION_TYPES`，其余改为引用 |
| 优先级 | `PRIORITY_OPTIONS`(high/medium/low) vs 实际 `urgent/high/normal` | 统一为 `urgent/high/normal` |

---

## 3. 实施路线

### 3.0 批次总表与依赖

| 批次 | 名称 | 依赖 | 规模 | 风险 |
|---|---|---|---|---|
| **P0-1** | 作业记录去 localStorage，服务端权威 | — | 中 | 中（历史数据迁移） |
| **P0-2** | 任务↔作业记录强关联 + 修假成功 | P0-1 | 中 | 中 |
| **P0-3** | 投入品回链任务（施肥/农药/浇水） | P0-2 | 中 | 中 |
| **P0-4** | 领料单↔农事任务 | P0-2 | 小 | 低 |
| **P0-5** | 任务↔种植实例 + batch_code 语义修正 | — | 中 | **高（数据迁移）** |
| **P0-6** | 农事任务排班页面 | — | 中 | 低 |
| **P0-7** | SOP 步骤编辑 + 任务绑定 | — | 中 | 低 |
| **P0-8** | 工时口径统一（actual_hours→labor_records→成本） | P0-2 | 小 | 低 |
| **P0-9** | 静态 mock 清理 | — | 小 | 低 |
| **P0-10** | 合规报告静默失败 + 后端状态机守卫 + 枚举统一 | — | 中 | **中（守卫会挡现有流程）** |
| **P0-11** | IA 重构 + 权限 + 命名 | P0-6/P0-7 | 中 | 低 |
| **P1-1** | 合规生产档案（聚合查询 + 导出 + 留存） | P0-3 | 中 | 低 |
| **P1-2** | 记录不可静默修改（软删除 + 留痕） | P0-2 | 中 | 中 |
| **P1-3** | 承诺达标合格证（按批次 + 二维码） | P1-1 | 中 | 中 |
| **P2-x** | 农事计划 / 农机具 / 气象预警 / 作业成本模型 | P0 全量 | — | 本轮只出方案不实施 |

> 建议执行顺序：**P0-1 → P0-2 → P0-3 → P0-4 → P0-5 → P0-8 → P0-6 → P0-7 → P0-9 → P0-10 → P0-11**
> P0-5（数据迁移）单独安排窗口；P0-10（状态机守卫）放在枚举统一之后。

### 3.1 P0-1 农事执行记录：localStorage → 服务端权威

**问题**：`useOperationRecords.ts:652` 数据源是 `useLocalStorage('yuanxingtu_operationRecords')`；后端 `farm_operation_records` 表只被 fire-and-forget 双写（`:687`），全站无组件消费 `useFarmOperationRecordStore`；实库 0 行 → 跨设备不可见，刷新丢失风险由 localStorage 兜底。

**改动**
1. `src/hooks/useOperationRecords.ts` 数据源切到 `useFarmOperationRecordStore`（已 API-backed：`GET/POST/PUT/DELETE /farm-operation-records`）
2. 一次性迁移：把 localStorage 已有记录 POST 到后端（**迁移后不删除原 localStorage 数据**，只打 `migrated` 标记 —— 遵循项目既有纪律"localStorage 数据必须迁移到后端，禁止删除原有数据"）
3. 清理 `useOperationRecords` 与 `useFarmOperationRecordStore` 的双写，避免两条真相源

**验收**
- `SELECT COUNT(*) FROM farm_operation_records` > 0，且等于迁移前 localStorage 记录数
- A 浏览器新建记录 → B 浏览器刷新可见
- 刷新页面记录不丢

**回滚**：后端表数据保留（不回滚）；前端切回 localStorage 读路径即可（不删数据）

### 3.2 P0-2 任务↔作业记录强关联 + 修假成功

**改动**
1. `farm_operation_records` 加 `task_id` + 索引
2. `POST /farm-tasks/:id/complete` 与 `/:id/progress` 事务内写作业记录（含 `duration`/`workload`/`materials`/`gps`/`photos_before/after`/`voice_note`/`labor_cost_snapshot`）
3. 修 `AgricultureRecordPage.tsx`：
   - `handleConfirmDelete` → 调 store 删除，失败显式报错（**不静默成功**）
   - `handleConfirmExport` → 接 `useExport` 真出文件
   - `handleRejectRecord` task 分支 → 接 `rejectTask`
4. `daily_records` 与作业记录互写（P0-2 附带：任务执行时同步写一条 `daily_records`（record_type='farm_task')）

**验收**
- 任务验收 → 「农事操作记录」立即出现该条，来源=任务，关联任务号正确
- 批量删除真删（刷新后不回来）
- 导出真出 xlsx（文件可打开、内容对）
- 任务驳回真落 `rejected` 状态

### 3.3 P0-3 投入品回链任务

**改动**
1. `pesticide_records` 加 `farm_task_id` + 索引
2. `fertilizer_records.farm_task_id` 前端真正传值（`useFertilizerStore` 已有 `farm_task_id → farmTaskId` 映射，只是没人传）
3. 任务验收弹窗「物料使用」反馈按 `task_type` 分流落库：
   - `fertilization` → `fertilizer_records`
   - `pest_control` / `plant_protection` → `pesticide_records`
   - `irrigation` → `watering_records`
4. **不重复扣库存**：`fertilizer.repository.ts:397 decreaseStock` 已有扣减逻辑，沿用不重写
5. `farm_tasks.materials` 从自由 JSON 升级为受控结构（引用物料主数据 `materials`/`fertilizer_specs`/`pesticide_specs`，带 `specId`）

**验收**
- 施肥任务验收 → 施肥记录页按任务号可查（`farm_task_id` 有值）
- 用药任务验收 → 用药记录页按任务号可查
- 施用后对应 `*_specs.stock_quantity` 正确减少（且只减一次）
- 库存不足时显式报错，不静默跳过（Fail Loud）

### 3.4 P0-4 领料单 ↔ 农事任务

**改动**
1. `material_requests` / `material_executes` 加 `task_id` / `task_code`
2. 领料申请弹窗加「关联农事任务」下拉（数据源 `farm_tasks`，按当前用户/基地/日期过滤；显示任务号+类型+计划日期+执行人）
3. 领料出库执行时回链任务；任务详情可反查关联领料单
4. **修正文档**：`docs/操作说明书/写作文档/06-物资管理/6.4-生产领料.md` 当前声称"关联任务下拉"，实现里没有 —— 以实现为准改文档

**验收**
- 领料单可选任务并落库 `task_id`
- 任务详情能看到关联领料单及其物料
- 领料出库后 `inventory_stock` 扣减且可追溯到任务

### 3.5 P0-5 任务 ↔ 种植实例 + batch_code 语义修正

**改动**
1. `farm_tasks` 加 `planting_id` / `production_plan_id`
2. `CreateTaskModal.tsx:160-180, 262-297` 选"种植区域"后**丢弃了 planting.id** —— 改为携带 `plantingId`/`batchCode`/`batchId`
3. **数据修正脚本**（停服窗口执行，见 §7 纪律）：按 §2.2 的三类分治逻辑处理 34 条 `batch_code`（PC-自造 22 / YM·JZ 7 / 空 5）；备份 `yuanxingtu.db` → `yuanxingtu.db.bak.<date>`
4. 同步修 `docs/操作说明书/05-农事管理/` 中关于 batch_code 口径的描述

**验收**
- `SELECT COUNT(*) FROM farm_tasks t JOIN plantings p ON t.batch_code=p.planting_code` > 0
- 原 7 条 YM/JZ 任务的 `seedling_code`/`seed_source_code` 有值且不丢
- `batch_timeline_view` 能查出任一真实批次的任务
- 新建任务选种植区域后 `planting_id` 有值
- 迁移日志条数 = 22 + 7 = 29 条被改写记录（可逐条核对，不允许静默丢数据）

### 3.6 P0-6 农事任务排班页面

**改动**
1. 新建 `/farm-task-schedule`：左栏待排班任务（`GET /farm-task-schedules/unscheduled`），右栏按日期×班次的排班矩阵
2. 复用现成 `useFarmTaskSchedule` hook（**当前全站零引用**）与 `farm_task_schedules`（14 行数据）
3. 排班冲突校验：同一执行人同日重叠时段（后端已有 409 语义，前端给提示）
4. 新页命名「任务派工排班」；**「排班调度」名称保持不变**（用户明确要求，勿改名）

**验收**
- 待排班任务能排到人+日期+时段
- 排班后该任务在执行人「我的任务」中带出时段
- 重叠排班被拦截并给出明确原因
- 换班走 `farm_task_swap_requests`（不动老 `swap_requests`）

### 3.7 P0-7 SOP 步骤编辑 + 任务绑定

**改动**
1. `sop_steps` 步骤编辑器（步骤序号/内容/耗时/负责人角色/检查点）
2. `sop_task_bindings` 绑定 UI（SOP ↔ 任务类型/任务）
3. 建任务时选 SOP → 带出步骤清单；执行时按步骤打勾，进度按步骤完成率计算
4. `apiSopLibraryService` 补 `createStep` / `updateSteps` / `bindTask` / `unbindTask`（当前 service 无这些方法）

**验收**
- 能给 SOP 加步骤并保存（`sop_steps` 行数 > 0）
- 任务能绑定 SOP，详情页展示步骤清单
- 执行打勾后进度同步变化

### 3.8 P0-8 工时口径统一

**改动**
1. `labor_records` 加 `task_id` + 索引
2. 任务验收时写 `labor_records`（worker / work_date / work_hours / hourly_rate / task_id / batch_code）
3. `batch_cost_aggregation` 视图人工成本改读 `labor_records` 真实值（当前靠 `farm_operation_records.labor_cost_snapshot`，快照为空则成本为 0）
4. `farm_tasks.actual_area` 落地 → 亩均成本可算

**验收**
- 任务验收后 `labor_records` 行数增加且带 `task_id`
- 批次成本页的人工成本 > 0 且与人工记录一致
- 亩均成本 = 总成本 / 面积（面积取 `actual_area` 合计）

### 3.9 P0-9 静态 mock 清理

**处置清单**（三选一：接真数据 / 标注 mock + 显眼横幅 / 下架路由）

| 位置 | 现状 | 处置 |
|---|---|---|
| `/manage/cost` `CostAccounting.tsx:11` | 10 条硬编码 | 接 `batch_cost_aggregation` 视图真实数据 |
| `/iot/weather` `WeatherMonitoring.tsx:11` | 静态 8 条 | 接 `/api/weather`（真 API 已存在） |
| `/traceability/*` 6 页 | V1.3 静态页 | 重定向到 `/crop/material-flow`（真页面）；`/traceability/code` 现写"页面开发中" |
| `src/pages/WorkOrders.tsx` | 未挂路由 + mock | 下架（**删文件需用户授权**，本批只做路由下架） |
| `src/pages/diagnosis/GrowthAnalysis.tsx` | 12 条 mock | 下架或接真实长势数据 |
| `src/stores/useEquipmentStore.ts` | 8 条前端 seed，无后端表 | 明确标注 demo 数据（农机具实体列入 P2） |
| `src/pages/farm/FarmApproval.tsx` | 农事审批页已下线（重定向 `/material-approval`），文件保留 | 保留（重定向已生效） |

**验收**
- 全站扫描：农事相关页面无"写死数组冒充真实数据"
- 每个 mock 页面都有显著标注，或已接真数据

### 3.10 P0-10 合规报告修复 + 后端状态机守卫 + 枚举统一

**A. 合规报告静默失败修复**
- `complianceReport.ts`：`inspections` 查询 `inspection_date → check_date`、`problem_description → issue_text`
- `problems` 查询：`batch_code`/`rectification_progress`/`recheck_result` 三列不存在 → **加列**（P1-2 一起做）或**从查询中移除并改用 `problem_flow_records`**
- 所有 `catch {}` 改为：`catch (e) { sectionsErrors.push({section, message}) }`，并在响应里返回
- 前端 `ComplianceReportPage` 展示"本报告有 N 段数据缺失"提示

**B. 后端状态机守卫**
- 把 `src/config/taskConfig.ts:138` 的 `STATUS_TRANSITIONS` 迁移到 `server/src/constants`，后端成为权威
- 17 个流转端点加 `assertTransition(current, next)`，非法转移 → 409 + 明确消息
- 保留 `system_config` 可覆盖（与现有 `task.status-transitions` 机制一致）

**C. 枚举统一**
- `server/src/constants/index.ts` `TaskStatus` 5 态 → 10 态
- 前端三处副本改为引用 `types/farm/common.ts`
- `PRIORITY_OPTIONS` 统一为 `urgent/high/normal`

**验收**
- 直接 `PUT /farm-tasks/:id` 试图把 `completed` 改回 `pending` → 409
- 合规报告的巡查段/问题段有数据（或明确报"该段缺失"而非静默空）
- 全站状态标签与后端一致，任务类型下拉无重复/遗漏

> ⚠️ **顺序约束**：必须先做 C（枚举统一），再上 B（守卫）。否则后端 5 态会把前端 10 态流程挡死。

### 3.11 P0-11 IA 重构 + 权限 + 命名

**改动**
1. ~~9 个 `/agronomy/*` 工具页从 `/settings/operations` 迁回农事管理~~ ❌ **已回退**
   （2026-10-20 用户明确要求：这批页面的位置就是「系统设置 → 运营管理」，不得移动。
     仅新增的「承诺达标合格证」作为第 9 个 Tab 加入运营管理）
2. `Sidebar.tsx` 「人工管理」→ `/labor/task-center` **断链**（该路由不存在）→ 修为 `/labor/attendance`
3. 新菜单项「任务派工排班」需在 `processRouteMap` 登记 `PROC_FARM`
4. 命名消歧：**「排班调度」名称保持不变**（用户明确要求）

**验收**
- 农事管理菜单仅含：农事任务中心 / 智能任务中心 / 任务派工排班 / 排班调度 / 班组分配 / 每日工单汇总
- 运营管理保持 9 个 Tab（原 8 个 + 承诺达标合格证）
- 非 admin 账号按权限显示/隐藏正确
- 全站无指向不存在路由的菜单项

### 3.12 P1-1 合规生产档案

**目标**：《农产品质量安全法》第 27 条 —— 生产记录须含：①投入品名称/来源/用法/用量/使用与停用日期 ②病虫害发生与防治情况 ③收获日期；保存 ≥2 年。

**改动**
1. `fertilizer_records` / `pesticide_records` 加 `source`（来源）、`stop_use_date`（停用日期）
2. 新建「合规生产档案」聚合查询页（按批次/温室/日期区间），聚合上述三类内容 + 巡查问题 + 采收记录
3. 一键导出（Excel + PDF）
4. 留存策略：`retention_until = 记录日期 + 2 年`，早于此日期的记录禁止物理删除
5. 修正合规报告：改用本聚合层作为数据源（消除多段 SQL 各查各的）

**验收**
- 任一批次能导出含三类内容的生产记录
- 导出内容与库内数据一致
- 2 年内记录无法被物理删除（API 拒绝并说明原因）

### 3.13 P1-2 记录不可静默修改

**改动**
1. 关键表（`farm_operation_records` / `fertilizer_records` / `pesticide_records` / `harvest_records`）删除改软删除（`deleted_at` + `deleted_by` + `delete_reason`）
2. 复用 `server/src/services/entityHistory.service.ts` 记录字段级修改留痕
3. 已验收（`completed`）的作业记录禁止删除，只允许作废（`voided` + 原因）
4. 修正既有纪律"审计行删除必须显式授权"：所有删除接口需 `operator_id` + `reason`，且校验目标 ID 存在

**验收**
- 已验收记录删不掉（API 明确拒绝）
- 修改记录后能查到"谁在何时改了哪个字段"
- 批量删除不再有 LIKE 模式误伤

### 3.14 P1-3 承诺达标合格证

**依据**：《农产品质量安全承诺达标合格证管理办法》（2026-02-01 施行）第 8 条按生产批次开具、第 14 条内容项、二维码须显著标明"承诺达标合格证"字样；开具记录留存 ≥6 个月。

**改动**
1. 新建 `compliance_certificates` / `compliance_certificate_items`
2. 开具界面：从批次拉取品名/数量/产地/收获日期，填承诺事项与依据，生成带二维码的合格证
3. 二维码整合现有 `plantings.traceability_code` / `plant_labels`（**不新建第二套码**）
4. 开具记录留存策略（≥6 个月）

**验收**
- 能按批次开具合格证并打印/下载
- 二维码扫码内容含"承诺达标合格证"字样与批次信息
- 合格证内容与批次实际采收/施用数据一致

### 3.15 P2（只出方案，本轮不实施）

| 域 | 需先解决的前置 | 方案要点 |
|---|---|---|
| **农事计划与农事历** | `plantings.growth_status` 持久化（现 83/86 空） | 复用 `farm_activities` 表（有 `block_oid`）；把硬编码 `CROP_STAGE_TASK_CONFIG` 落到 DB 可配；计划→任务一键生成（现预测任务只显示不落库） |
| **农机具台账 + 设备折旧** | 无 | 新建 equipment 主表 + 任务绑定 + 作业量/油耗回写；`batch_cost_aggregation.equipment_depreciation_cost` 去掉硬编码 0 |
| **气象预警规则** | `reminder_rules` 仅 1 条 | 规则引擎（高温/霜冻/暴雨/大风 → 建议改期/禁止作业）；接现成 `/api/weather` |
| **作业成本模型（ABC/亩）** | P0-8 真实工时 | 成本科目 → 按作业归集 → 分摊到批次/作物 → 亩均成本 + 预算 vs 实际偏差 |
| **农资库存与物资库存统一** | — | 决定保留哪套账（`fertilizer_specs`/`pesticide_specs` vs `materials`/`inventory_stock`） |

---

## 4. 验收与回归纪律

1. **每批次独立验收**：按批次小节"验收"逐条过，不通过不进入下一批
2. **每批次全面回归**（项目既有铁律，优先级绝对）：批次完成后回归原有功能 —— 农事任务中心 4 Tab、智能派工、我的任务、每日工单汇总、移动端上报、巡查/问题闭环、物料领退料
3. **浏览器实测强制**：`src/components/**` 的改动必须浏览器实测一次（历史事故：单测 + curl + build 全通过，但浏览器白屏 —— `enhancedApiClient` 动态 import 错用 `.default`）
4. **类型检查用 `tsc -p tsconfig.app.json`**（根 `tsconfig.json` 是 `files:[]` 的 solution 配置，零检查直接 EXIT=0 假通过；实测前端积压 1301 个类型错误）
5. **构建只是下限**：`npm run build` 只能证明语法正确，不能证明功能正确
6. **弹窗改动后硬刷新**：HMR 残留会混用新旧代码导致误判

---

## 5. 明确不做（YAGNI）

| 不做项 | 理由 |
|---|---|
| 多租户 / 多基地数据隔离 | 场景已定为自有单基地（`tenant_id` 列已存在但不做隔离） |
| 农业社会化服务：作业面积/轨迹核验、补贴结算、投诉信用 | 场景不适用 |
| 完整 BBCH 物候期建模 | 自有单基地用简化生育期枚举 + `crop_varieties` 周期字典足够 |
| 地块编码全局统一（GlobalGAP Critical 项） | 用户定档为"国内基本合规"；**记为技术债**，保留 `greenhouse_id` + 批次链路 |
| 语音识别真实推理 | `server/src/services/ai/voice.ts` V1 为假解码，本轮不接模型 |
| 完整 SOP 培训/资质/PPE 体系 | 只做步骤 + 绑定（P0-7 最小可用） |
| 遥感产量图 / NDVI / 品种小区对比 | 自有单基地 ROI 低 |
| 农产品销售 / 订单 / 电商 | 与农事管理无关 |
| 看板大屏 / BI 独立产品化 | 汇总看板已覆盖 |
| 重建 `farmTask.service.ts` 影子实现 | 路线文件已直写 SQL；P0-10 顺手标记废弃即可，**不重写** |

---

## 6. 风险登记

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | P0-5 / P0-1 数据迁移写坏 | 批次链路断裂、记录丢失 | 停服 → 备份 → 改盘 → 校验 → 重启；迁移日志逐条可核；行数缩水 >30% 立即回滚（既有事故：1.8M 行缩水 DB） |
| R2 | 跨模块回归面大（改 `farm_tasks` 影响 10+ 页面） | 既有功能退化 | 每批次回归清单固定；不顺手"改好"无关代码 |
| R3 | P0-10 状态守卫挡住现有前端流程 | 任务流断裂 | 先统一枚举（C）再上守卫（B）；守卫返回明确 409 消息；分状态灰度 |
| R4 | `sql.js` 全量落盘 | 批量操作卡死/写盘冲突 | 批量写端点合并落盘；`DB_LOG_VERBOSE` 开关；操作前查进程（既有事故：67 个 tsx watch 争用 SQLite） |
| R5 | 移动端离线队列与新增字段不兼容 | 老队列同步失败 | `offline-sync` 兼容处理：`task_id` 等新字段可空；同步失败项显式返回 `failed` + 原因（不静默丢弃） |
| R6 | 枚举统一牵动面广 | 显示错乱回归 | 统一后跑一次全站状态/类型标签快照对比 |
| R7 | P1-2 软删除改动面大 | 删除相关功能退化 | 只对 4 张关键表启用；保留硬删回滚开关一个版本 |

---

## 7. 工程纪律（本项目特有，来自既有事故教训）

1. **停服前必须先告知用户**（`tsx watch` 只对 `src/index.ts` 敏感 → 改 routes/services 必须手动重启后端；启动会跑迁移）
2. **数据修复 = 停服 → 改盘 → 校验 → 重启**（运行中服务内存快照全量落盘会覆盖外部改盘）
3. `sql.js` **只有显式 `saveDatabase()` 才落盘** → 所有新增写端点必须调
4. **严禁**脚本遍历全目录改编码/格式/行尾；改完用 `git diff --shortstat` 验证变更行数合理
5. **禁止主动 commit / push** —— 必须用户明确说"提交"
6. 新增列必须**三处同步**：`schema.ts` + `fixMissingSchema.ts` 的 `*ColumnsToAdd` + `migrations/`（`CREATE TABLE IF NOT EXISTS` 不会给已存在的表加列）
7. 弹窗加 `key` 重挂载会杀死关闭（取消/ESC/X/遮罩全失效且零渲染）→ 重置表单用 `useEffect[record]`
8. 数值输入：`NumberInput` 必须 `useEffect` 同步 prop + `key={itemId}` 强制 remount
9. 业务编码生成：禁止 `Math.random()`；按当日自增
10. 日期一律用本地日期工具，**严禁 `toISOString()`**（UTC 跨天导致中国早上 0:00-8:00 显示昨天）
11. 列表排序用 `ORDER BY id DESC`（新建项排最前可见）
12. `enhancedApiClient.get` **不支持 params 对象** → GET 过滤条件必须用 `URLSearchParams` 拼 URL
13. 响应已自动解包 `data` → service 层不能再 `result?.data` 二层访问

---

## 8. 后续流程

1. 本文档评审 → 用户确认批次范围与优先级
2. 每批次写独立 spec（`docs/superpowers/specs/`）→ 实施 → 回归 → 独立评审
3. P2 各域按需再走一轮 brainstorm → spec
4. 全程不主动 commit / push

---

## 附：关键文件速查

| 用途 | 路径 |
|---|---|
| 路由总表（180 条 Route） | `src/App.tsx:333-649` |
| 侧边栏菜单 | `src/components/layout/Sidebar.tsx:28-118` |
| 表结构定义 | `server/src/db/schema.ts`（+ `server/src/db/fixMissingSchema.ts`） |
| 农事任务路由 / 服务 | `server/src/routes/farmTask.ts`（1759 行）/ `server/src/services/farmTask.service.ts`（175 行，影子实现） |
| 农事操作记录 | `server/src/routes/farmOperationRecords.ts` / `src/hooks/useOperationRecords.ts` / `src/stores/useFarmOperationRecordStore.ts` |
| 农事任务中心 4 Tab | `src/pages/farm/FarmTaskHub.tsx:47-51` |
| 状态转移表（现仅前端） | `src/config/taskConfig.ts:138-149` |
| 作物阶段任务配置（硬编码） | `src/data/cropStageTaskConfig.ts:36` |
| 合规报告 | `server/src/routes/complianceReport.ts` |
| 批次成本视图 / 时间线视图 | `server/src/db/createBatchCostView.ts` / `createTimelineView.ts` |
| 操作说明书（口径权威，含已知不一致） | `docs/操作说明书/写作文档/05-农事管理/`、`06-物资管理/` |
| 孤儿路由盘点 | `docs/操作说明书/00-规划与进度/孤儿路由盘点.md` |
