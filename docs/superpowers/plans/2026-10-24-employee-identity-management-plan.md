# 员工身份管理（Employee Identity Management）立项规划

> 版本：v1.0　编制日期：2026-10-24　状态：**待评审**
> 关联变更：2026-10-24「考勤排班移入人工管理 · 排班调度单页化」（commit `2bc5dbb6` / `baf50410`）
> 关联记忆：`task-assignee-vs-system-account-mismatch`、`two-schedule-tables-exist`、`worker-status-enum-mismatch`

---

## 1. 背景

2026-10-24 把「考勤排班」从农事管理移入人工管理 → 考勤管理后，IA 层已理顺，但**暴露**出一个一直存在、此前被模块边界掩盖的底层问题：

> **全站没有统一的「人」模型。「员工」在库里同时以 5 套互不相通的 ID 空间存在。**

这不是排班模块的问题，是**跨全站的员工身份治理问题**。之前每个模块各写各的映射逻辑（有的按 id 匹配、有的按姓名匹配、有的直接存自由文本），互不校验、互不同步。

### 1.1 实测的 5 套 ID 空间

只读查询 `server/data/yuanxingtu.db`（2026-10-24）：

| # | 体系 | 表 / 字段 | 实测值域 | 行数 | 与 `employees.id` 交集 |
|---|---|---|---|---|---|
| 1 | **员工档案**（主数据） | `employees.id` | `EMP_001`~`EMP_006`（张三/李四/王五/赵六/钱七/孙八，全 active） | 6 | — |
| 2 | **登录账号** | `users.id` | `user-admin`(陆启闯) / `user-manager`(张俊生) / `user-regular`(王建国) / 访客01 / 访客02 / `USER_ID_*` | 5 | **0** ❌ |
| 3 | **排班 / 班组** | `schedules.staff_id`、`team_members.worker_id` | `EMP_001`~`EMP_006` | 17 / 9 | **17/17、9/9** ✅ |
| 4 | **考勤 / 假勤** | `attendance_records.worker_id`、`overtime_records.worker_id`、`leave_records.worker_id` | `W001`~`W008`、`S001`~`S003`、`U001`、`WORKER_001`~`WORKER_004`、`EMP_63279`/`EMP_81035`/`EMP_98404` | 23 / 9 / 16 | **0** ❌ |
| 5 | **作业 / 工时** | `farm_operation_records.operator_id`、`labor_records.worker_id` | 21 种自由文本：`null`、空串、`EMP-999`、`EMP_VERIFY`、`EMP_W5`、`QA`、`demo_user`、`u`、`user-admin`、`USER_ADMIN_001`、`USR001`、`USR002`… | — | **0** ❌ |

**结论**：只有 #3（排班/班组）纪律良好。#4 #5 是重灾区。

### 1.2 已经造成的真实业务缺陷

| 缺陷 | 证据 | 业务后果 |
|---|---|---|
| **排班对比卡片恒失效** | `schedules.staff_id` ∩ `attendance_records.worker_id` = **0** | 「排班缺勤 / 临时到岗」恒等于全量人数，是假数字（`WorkerAttendancePage.tsx:100-116`） |
| **任务排班表 100% 孤儿** | `farm_task_schedules` 38/38 行 `worker_id` 不在 `employees.id`（全部是 `user-admin`） | 该表虽有 FK 声明，但 SQLite 未强制；且这 38 行**全是 admin 账号手工排的演示数据**，从无真实业务分布 |
| **考勤 23 行关联的是不存在的任务** | `attendance_records.task_id` 命中 `farm_tasks` = **0/23**（存的是 `T001`/`T004`/`B001` 等假编号） | 考勤记录与农事任务**从未闭环** |
| **签到台账双轨** | `schedules.check_in/check_out` 仅 2/17 有值；签到只写 `schedules`（`schedule.ts:1591`），**从不回灌** `attendance_records` | 用户签到与考勤表各记各的，工时/工资口径与签到完全脱节 |
| **考勤不参与工时/工资** | 工时走 `labor_records.work_hours`、工资走 `labor_records.total_amount`（`summary.ts:958`），与签到链路零关联 | 签到数据采集了但没被使用 |
| **两套调班并存** | `swap_requests`（中文状态，4 行，前端在用）/ `farm_task_swap_requests`（英文状态，0 行，前端零引用，路径双层嵌套） | 后者永远不会被用到 |
| **考勤接口 500** | `attendanceIntegration.ts:74/194/202/213` 引用不存在的列（`employee_id`/`created_at`/`updated_at`） | `POST /api/attendance/check-in` 必抛 `no such column` |
| **两套班次编码** | `schedules.shift` 存**名称**（早班/中班/晚班/全天）、`farm_task_schedules.shift_type` 存 **code**（SH001…）；`shifts` 表被两处用不同键 JOIN | 跨表比较必须手工换算；`schedules` 有 3 行指向乱码（U+FFFD）或已软删的 `SH004` |

---

## 2. 目标与非目标

### 2.1 目标

1. **确立唯一员工主数据源** = `employees` 表，全站业务表统一引用 `employees.id`
2. **打通 `users`（登录账号）↔ `employees`（员工档案）**：一个自然人可以同时是「登录账号」和「员工」，需要一个显式关联
3. **消除自由文本 ID**：`farm_operation_records.operator_id`、`labor_records.worker_id` 等列不再接受任意字符串
4. **存量数据归一或归档**：明确每一批历史数据的处置结论（归一 / 归档 / 标注测试数据），不留"两套都算"的中间态
5. **加数据库级约束**：外键、唯一键、业务不变量下沉到 schema 层，不再只靠应用层校验

### 2.2 非目标（本项目不做）

- 不重做人事/组织架构、薪酬计算逻辑
- 不做 SSO / LDAP 对接
- 不改 `employees` 表的现有字段语义（只做增量扩展）

---

## 3. 关键决策（需评审拍板）

| # | 议题 | 选项 | 建议 |
|---|---|---|---|
| **D-A** | 唯一主数据源 | (a) `employees` 为准，users 挂靠 employees；(b) users 为准，employees 挂靠 users | **(a)**。`employees` 已有 FK 声明与应用层校验（`schedule.ts:1382`）、有部门/岗位/在职状态，是业务语义完整的实体；`users` 只解决"能不能登录" |
| **D-B** | `users` 与 `employees` 的基数 | (a) 1:1（每人都有档案）；(b) 1:N（一人多账号）；(c) N:1（多档案共用账号） | **(b) 1:N** + `employees` 侧允许"有档案无账号"（纯现场工人不需要登录）。新增 `users.employee_id` 外键（可空） |
| **D-C** | `attendance_records` 23 行的处置 | (a) 全部归一到 employees（需补 10+ 人的档案）；(b) 按"纯 mock / 半真实"分流处置 | **(b)**。17 行是武侠人名 mock 且关联不存在的任务 → 归档；6 行 `WORKER_001/002/003`（张三/李四/王五）可按姓名无损归一到 `EMP_001/002/003` |
| **D-D** | `farm_task_schedules` 38 行的处置 | (a) 归一到 employees；(b) 标记为测试数据 | **(b)**。38 行全 `user-admin`，是联调期产物；归一后仍无业务价值。任务关联（`task_id` 38/38 命中）是真的，**归档时须保留 task 引用信息** |
| **D-E** | 签到口径（已在本轮确认） | (a) `attendance_records` 为准，`schedules.check_in` 废弃；(b) 反之 | **(a)**。`attendance_records` 已有 `status_class`（迟到/早退/请假/加班）、`hours`、`task_id`/`batch_id`（16/23 有），信息量更完整且已有 CRUD UI |
| **D-F** | 班次编码 | (a) 统一到 `shift_code`；(b) 统一到 `shift_name` | **(a)**。`shifts.shift_code` 是 `UNIQUE`，`shift_name` 不保证唯一；且 `farm_task_schedules` 已经是 code |

---

## 4. 分期实施

严格串行，每期独立可验收。

### E1 —— 身份建模（**阻塞项，无它后面都做不了**）

| 动作 | 内容 |
|---|---|
| E1-1 | `employees` 增补真实工人档案（至少覆盖 `WORKER_001/002/003` 三人，其余 mock 数据不补） |
| E1-2 | `users` 增 `employee_id` 列（可空，FK → `employees.id`），并给 5 个现有账号建立关联：陆启闯→?、张俊生→?、王建国→?、访客01/02→空 |
| E1-3 | 写明**员工 ID 契约**（落到 `CLAUDE.md` 或独立规范文档）：业务表的人员列一律存 `employees.id`，禁止姓名、自由文本、账号 id |
| E1-4 | `resolveEmployeeId`（`farmTaskScheduleService.ts:488-523`）的三段式判定（id 命中 → 否则 name+active 匹配 → 否则不写库）**提取为公共工具**，供所有写入路径复用 |

**产出**：`employees` 与 `users` 的关联表结构 + 公共归一工具 + ID 契约文档

### E2 —— 考勤 / 假勤归一

| 表 | 行数 | 动作 |
|---|---|---|
| `attendance_records` | 23 | 6 行 `WORKER_00x` → `EMP_001/002/003`；17 行 mock → 归档标记（不物理删，见下） |
| `overtime_records` | 9 | `WORKER_00x` → `EMP_00x`；`W00x` → 归档 |
| `leave_records` | 16 | 同上 |
| 全部三张表 | — | 加 FK `worker_id → employees.id` + 应用层校验 |

**归档策略**：不物理删除（memory: 审计行删除必须显式授权）。加 `is_archived` 标记列 + `archived_reason`，UI 默认过滤，`data-migration-principle` 要求的"不删原数据"得到满足。

### E3 —— 作业 / 工时记录归一

- `farm_operation_records.operator_id`：21 种自由文本 → 逐条判定（`EMP_00x` 可直接归一；`USER_ADMIN_001`/`user-admin`/`u` 等映射到对应 `users.employee_id`；`null`/空串/演示账号归档）
- `labor_records.worker_id`：空串 / `USR001` / `USR002` → 归一或归档
- 加 `operator_id` FK + 允许 NULL（历史无归属记录）

### E4 —— 两张排班表合并（**长期债，本项目最重的一块**）

现状：`schedules`（人×日期×班次）与 `farm_task_schedules`（任务×人×日期）**零 JOIN、零同步**，前端只靠"顺序发两个 HTTP 请求"造成联动的假象（`useDispatchScheduleBridge.ts:101` 与 `:118` 无共享 key、无回滚）。

方向：**以 `schedules` 为主表，`farm_task_schedules` 降级为"任务 ↔ 排班"的关联表**（`schedule_id` FK → `schedules.id`，承载 `task_id`/`plan_start`/`plan_end`/`shift_type`）。

这样：
- 唯一约束统一到 `schedules`（已有 `idx_schedules_staff_date_shift`），`farm_task_schedules` 补上缺口
- 班次编码统一到 `shift_code`（D-F）
- 派工占用、班组可用性、AI 派工 F7 三条读链路无需改表
- 调班只保留一套（E5）

### E5 —— 两套调班合并

`farm_task_swap_requests`（英文状态、0 行、前端零引用、双层嵌套路径）并入 `swap_requests`（中文状态、4 行、前端在用）。E4 完成后 `farm_task_swap_requests` 自然无数据。

### E6 —— 签到口径归一

按 D-E：`attendance_records` 为准。
- `schedules.check_in/check_out` 现有 2 行有效值回填到 `attendance_records`
- 之后 `schedules.check_in/check_out` 废弃（列保留但不再写），或改由 `attendance_records` 反向派生
- 排班页的「签到/签退」弹窗改为写 `attendance_records`（或在 E4 合并后直接下线该入口，由考勤页承担）

### E7 —— 班次编码统一

按 D-F：`schedules.shift` 由名称改存 code。
- 影响面：`schedule.ts` 全部读写点、`teamAvailabilityService.ts:49/73` 的 JOIN、`ShiftEditor` 下拉、`SwapRequestModal` 的 `original_shift` 匹配（唯一键含 shift，改编码后唯一键语义变化需同步）
- 顺带修 3 行乱码/已删班次数据（1 行指向已软删的 `SH004 全天班`）

### E8 —— 清理坏端点与死代码

- `attendanceIntegration.ts` 的 `employee_id`/`created_at`/`updated_at` 坏列 → 修列名或整段下线（`POST /api/attendance/check-in` 目前必 500）
- `farm_task_swap_requests` 路由（E5 后）
- `src/hooks/useScheduledTasks.ts`（定时任务 cron hook，零调用方）
- `src/pages/WorkerAttendance.tsx`（2026-10-24 路由已重定向，文件保留未删，待确认后清理）

---

## 5. 数据迁移纪律（不可协商）

| # | 纪律 | 依据 |
|---|---|---|
| 1 | **改盘前必须停服**，并先告知用户 | memory `running-server-overwrites-disk-edits` |
| 2 | 迁移脚本必须 **dry-run / apply 两段式**、自动备份、前后行数校验、JSON 报告 | 参考 `server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs` |
| 3 | **禁止**用脚本批量改全目录编码 / 行尾 / 缩进 | memory `no-batch-file-encoding-scripts`（2026-06-25 事故） |
| 4 | **不物理删除**业务数据，一律「归档标记」；审计行删除须用户逐条授权 | memory `data-migration-principle`、`audit-row-deletion-needs-explicit-auth` |
| 5 | 写端点必须显式 `saveDatabase()`（sql.js 只认显式调用） | memory `write-endpoints-missing-savedatabase` |
| 6 | 新增列必须**同时**改 `schema.ts` + `fixMissingSchema.ts` 的 `*ColumnsToAdd` 数组 | memory `fixmissingschema-harvest-form-omission` |
| 7 | 本地日期用 `todayLocal()`，禁止 `toISOString()` | memory `utc-timezone-id-bug` |

---

## 6. 风险清单

| 风险 | 影响 | 缓解 |
|---|---|---|
| 归一后历史排班与考勤对不上 | 用户看到"排班了但没打卡" | 与 D-C/D-D 分流：纯 mock 数据归档而非硬归一，从源头减少错配 |
| 加 FK 后 `farm_task_schedules` 写入失败 | 派工自动排班链路中断 | 先清孤儿数据再上约束；归一工具已有"匹配不到就不写库"的保护 |
| `employees` 从 6 人膨胀到 20+ 人 | 人工管理页列表变长、影响演示数据观感 | D-C 建议只补真实需要的 3 人；mock 不补档案直接归档 |
| E4 合并涉及两张核心表 + 8 条读链路 | 回归面大 | 严格串行 + 每期独立回归 4 条链路（memory `per-batch-regression-gate`） |
| 排班对比卡片在 E2 完成前一直显示假数字 | 用户误读 | 已在 2026-10-24 加口径说明警示（commit `baf50410`），E2 完成后移除警示 |

---

## 7. 验收标准

**E1**
- [ ] `users.employee_id` 列存在且 5 个账号已关联或明确留空
- [ ] ID 契约文档已落到仓库并被 CLAUDE.md 引用
- [ ] 公共归一工具有单测覆盖（id 命中 / name 匹配 / 匹配不到三种分支）

**E2**
- [ ] `attendance_records` / `overtime_records` / `leave_records` 的 `worker_id` 100% 命中 `employees.id`（或已归档）
- [ ] 排班对比卡片的「排班缺勤 / 临时到岗」在真实数据上口径正确

**E3**
- [ ] `farm_operation_records.operator_id` / `labor_records.worker_id` 无自由文本值

**E4**
- [ ] 两张排班表合并为一张主表 + 一张关联表
- [ ] `schedules` 与关联表均有 DB 级唯一约束
- [ ] 派工占用 / 班组可用性 / AI 派工 F7 三条读链路回归通过

**E5–E8**
- [ ] 全站仅一套调班实现、一套签到口径、一套班次编码
- [ ] `POST /api/attendance/check-in` 不再 500

---

## 8. 附录：本次实测证据

只读查询，未修改任何数据。

```
employees                                  6 行
users                                      5 行
schedules                                 17 行   staff_id ∩ employees = 17/17   check_in 有值 2/17
team_members                               9 行   worker_id ∩ employees = 9/9
attendance_records                        23 行   worker_id ∩ employees = 0/23   task_id ∩ farm_tasks = 0/23
farm_task_schedules                       38 行   worker_id ∩ employees = 0/38   task_id ∩ farm_tasks = 38/38
overtime_records                           9 行   混 3 套 ID 空间
leave_records                             16 行   混 3 套 ID 空间
farm_operation_records                    — 行   operator_id 21 种取值
swap_requests                              4 行   中文状态
farm_task_swap_requests                    0 行   英文状态，前端零引用
shifts                                     4 行   SH001/002/003 active，SH004 deleted
roles                                      4 行   ROLE_ADMIN / ROLE_MANAGER / ROLE_USER / 访客
roles_authority                         1585 行   action_oid 双编码（语义名 + ACT00x）
```

**关键代码位置**

| 主题 | 位置 |
|---|---|
| 建表 SQL | `server/src/db/schema.ts:2737`（employees）、`:1047`（attendance_records）、`:2766`（schedules）、`:865`（farm_task_schedules）、`:896`（farm_task_swap_requests）、`:3365`（shifts） |
| 员工存在性校验 | `server/src/routes/schedule.ts:1382` |
| 现成的归一逻辑（可复用） | `server/src/services/farmTaskScheduleService.ts:488-523` `resolveEmployeeId` |
| 排班占用（读 schedules） | `server/src/routes/schedule.ts:233` `GET /occupations` |
| 派工写占用（写 schedules） | `server/src/routes/schedule.ts:399` `PATCH /dispatch-tasks` |
| 班组日可用性（读 schedules） | `server/src/services/teamAvailabilityService.ts:49` → `team_daily_availability` → `routes/dispatch.ts:122` |
| AI 派工 F7（读 schedules） | `server/src/services/ai/dispatchRecommender.ts:142` |
| 签到写 schedules | `server/src/routes/schedule.ts:1591` |
| 坏列端点 | `server/src/routes/attendanceIntegration.ts:74/194/202/213` |
| 排班对比卡片（跨表差集） | `src/components/labor/attendance/WorkerAttendancePage.tsx:100-116` |
