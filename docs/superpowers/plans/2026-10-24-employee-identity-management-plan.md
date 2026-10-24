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
| **D-B** | `users` 与 `employees` 的基数 | (a) 1:1（每人都有档案）；(b) 1:N（一人多账号）；(c) N:1（多档案共用账号） | **(b) 1:N** + `employees` 侧允许"有档案无账号"（纯现场工人不需要登录）。新增 `users.employee_id` 列（可空；SQLite `ALTER TABLE ADD COLUMN` 不支持 `REFERENCES` 子句，故走应用层校验 + 索引 + 契约） |
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

### E2 —— 考勤 / 假勤归一 ✅ **已完成（2026-10-24）**

原计划与实际执行的差异（立项时按估算写，实测有出入）：

| 表 | 立项估算 | 实测 | 执行结果 |
|---|---|---|---|
| `attendance_records` | 23 行：归一 6 / 归档 17 | 23 行 | **生效 10**（张三2/李四2/王五2/陆启闯4）+ **归档 13** |
| `overtime_records` | 9 行：归一部分 / `W00x` 归档 | 9 行 | **生效 3** + **归档 6** |
| `leave_records` | 16 行 | **19 行**（多 3 行） | **生效 3** + **归档 16** |

关键发现：
- `user-admin` / `EMP_98404` / `U001` 三者的姓名都是「陆启闯」，E1 的 `users.employee_id` 桥让它们能归一到 `EMP_007`（4 行），比原估算的 6 行归一多出 4 行
- `leave_records` 有 **8 行姓名为 U+FFFD 乱码**
- **`W00x` 系列 ID 跨表不一致**：`W002` 在考勤表是「杨过」、在加班表是「黄蓉」→ 只能按姓名归，不能按 ID 归
- 综合结果：生效行 100% 命中 `employees.id`；`schedules.staff_id ∩ attendance_records.worker_id` 由 **0 人 → 3 人**（排班对比卡片从恒失效变为可用）

归档策略（按计划执行）：不物理删除，加 `is_archived` + `archived_reason`，查询默认过滤。可随时改回 0 恢复。

未做（原计划的最后一项）：**未加 FK**。原因：`attendance_records.worker_id` 是 NOT NULL，归档行仍保留原历史 ID，无法满足 FK；而 SQLite 给已有表加 FK 需整表重建，风险大于收益。改走「应用层校验 + `is_archived` 隔离 + 契约文档」，与 `users.employee_id` 的处理一致。

⚠️ 实施事故（已修复，教训见 memory `schema-filter-must-ship-with-migration`）：
代码先落盘提交、迁移未跑，后端中途重启导致 `/api/attendance` 一度 500。正确顺序是
「停全部后端 → 迁移生产库 → 迁移基线库 → 重启 → 验证」，已在同一窗口修复。

### E3 —— 作业 / 工时记录归一 ✅ **已完成（2026-10-24）**

| 表 | 实测 | 执行结果 |
|---|---|---|
| `farm_operation_records` | 80 行，19 种 operator_id 取值 | **保留 17 / 归一 51 / 置空 12**（生效 68 行 100% 命中 employees.id） |
| `labor_records` | 4 行 | **归一 3 / 置空 1**（生效 3 行 100% 命中） |

**口径修正（原计划写 users.id，实测应�� employees.id）**：这两张表记录的是「员工干了多少活」，
6 名现场员工（张三/李四/王五/赵六/钱七/孙八）**只有员工档案、没有登录账号**，
归到 `users.id` 会让他们无法表示。而前端操作人下拉读的是登录账号（`users`），
故**写入路径在后端做归一转换**，前端零改动。

**「无法归一」用置 NULL 而非归档**（与 E2 不同）：
- 两列均可置 NULL（实测 notnull=0），NULL 语义 =「无归属员工的操作」
- `operator_name` 保留原显示名（「系统」/「验收员」/「访客01」…），界面照常可读
- 归档需给表加 `is_archived` 并改 20+ 个读取点（批次成本视图 / 合规报告 / 审批联动 /
  成本统计…），且《农产品质量安全法》要求生产记录保存 ≥2 年，归档会削弱法定存档
- 实测 `complianceReport` 按 `batch_code` 取数、`createBatchCostView` 只做 COUNT，
  **都不按 `operator_id` 过滤** ⇒ 置 NULL 无影响 ⇒ 零回归

**写入路径归一**（防止新数据再写脏 ID）：`farmOperationRecords.ts` POST、`labor.repository.ts` create、
`farmTask.ts` syncTaskOperationRecord（附带修正 `resolveHourlyRate` 取值 —— 它查 employees 表，
传 users.id 查不到，导致人工成本快照一直走 DEFAULT_HOURLY_RATE 回退）、`offlineSync.ts` 移动端同步。
`paperReport.ts` 两条 INSERT 只写 operator_name 不写 operator_id，本已合规。

**未加 FK**：与 E2 同理 —— `ALTER TABLE ADD COLUMN` 不支持 `REFERENCES`，
且这两张表是核心业务数据，不做整表重建。

### E4 —— 排班表人员归一 + 冲突维度修正 + 打通派工占用 ⚠️ **按修正后范围完成（2026-10-24）**

**原计划的「表结构降级合并」经实测否决。** 调查发现关键事实：

| 检查 | 实测 |
|---|---|
| `farm_task_schedules` 41 行能否按 `(worker, date, shift)` 匹配到 `schedules` | **0 / 41** |
| 两表日期区间交集 | **空集**（schedules 9/11–10/12；farm_task_schedules 9/22–11/10） |
| `schedules.staff_id` 覆盖的人 | EMP_001~EMP_005；**没有 EMP_007/008/009** |
| `farm_task_schedules` 41 行的人 | 40 行陆启闯（EMP_007）+ 1 行张三 |

⇒ 两表**不是同一实体的两种表示**，`schedule_id` 关联列加进去会是 100% NULL。
「降级合并」在数据上不成立，强行做只是把两张不相干的表用 NULL 列缝在一起。

**实际完成（三条，均为真缺陷修复）：**

1. **`farm_task_schedules.worker_id` 归一到 `employees.id`**
   38 行 `user-admin` → `EMP_007`，41/41 全部命中。该表声明了
   `FOREIGN KEY (worker_id) REFERENCES employees(id)`，但自 commit `2b382ba0`
   「执行人统一为系统登录账号」后实际存的是 `users.id` —— **声明与实际长期不符，
   38 行全是 FK 孤儿**，且 `PRAGMA foreign_keys=ON` 一直开着却没拦住
   （孤儿由未开 FK 的离线脚本写入）。归一后 FK 声明恢复成立。

2. **`checkConflicts` 补上班次维度**
   原实现只按「同一人 + 同一天」判冲突 → 同一人同一天安排**不同班次**
   （早班/中班/晚班）被误判冲突。一个人一天本就可以上多个班次，
   真正的冲突是「同一人 + 同一天 + 同班次」。5 处调用点全部传入班次。

3. **打通派工占用与冲突检测的两个 ID 空间**（两个长期静默失效的功能）
   - `PATCH /schedules/dispatch-tasks`：调用方传 `users.id`、`schedules.staff_id` 是
     `employees.id` → 查不到行 → 一直返回「无排班记录，未写入」。实测
     `schedules` **17/17 行 `dispatched_task_ids` 全是 `'[]'`**，派工占用从未写入过一次。
   - `GET /schedules/occupations`：返回 `employees.id`，前端拿 `users.id` 本地过滤
     → 永远 false → 派工冲突软警告（off_duty / no_schedule）**从未触发过**。
   两处均在服务端归一后修复；实测 `dispatch-tasks` 写入成功（`[]` → 有值 → 撤销回 `[]`）。

**留待独立评估**：`schedule_id` 关联列、唯一约束、`schedules.shift` 改 code。
理由：关联列 0% 可回填；唯一约束与 `checkConflicts` 口径需先统一（前者含班次、
后者原不含）；且 `schema.ts:2841` 那种 `try/catch + console.warn` 建索引的写法
**失败会被静默吞掉**，约束根本没建上而应用以为建上了。

### E5 —— 两套调班合并 ✅ **已完成（2026-10-24）**

`farm_task_swap_requests`（英文状态、**0 行**、**前端零引用**、双层嵌套路径
`/api/farm-task-swap-requests/swap-requests`）与 `swap_requests`（中文状态、4 行、
前端在用）两套并行实现。已**注销前者路由注册**（返回 404），统一以 `swap_requests`
为唯一实现。

**保守处理**：不 DROP 表、不删 `swapRequestService.ts` / `farmTaskSwapRequests.ts`
两个文件 —— 0 行无数据损失，但删表删文件属破坏性操作需明确授权；
且两文件可能被 V2.0 前端引用，需先确认。

### E6 —— 签到口径归并 ✅ **数据部分完成（2026-10-24）**

按 D-E：`attendance_records` 为准。
- `schedules.check_in/check_out` 现存 **2 行**有效值，而 `attendance_records`
  同日同人**无任何对应行** → 已复制为 `attendance_records` 记录
  （工时按签到/签退跨度计算，跨日 +24h；remarks 标注源 `schedules.id` 可反查）：
  - EMP_001 张三 2026-09-14 13:30-22:30（9h）
  - EMP_004 赵六 2026-10-08 05:00-17:00（12h）
- **未做**：写入侧（`CheckInModal`）改写 `attendance_records`。
  理由：这需要同步改造 ScheduleTable 的签到列展示，属 UI 行为变更，
  风险高于收益。当前已保证「历史签到数据有唯一权威副本」，
  双写现状保留待单独评估。

### E7 —— 班次名对齐 ✅ **数据部分完成（2026-10-24）；编码重构留待评估**

`Schedules.shift` 必须能在 `shifts.shift_name` 命中，否则
`teamAvailabilityService.ts:73` 的 `shiftHoursMap.get(shiftName)` 取不到 →
该员工当天工时按 0 算 → 班组可用工时虚高 → 派工冲突检测误判「还能排」。

实测 3 行异常：
- `'全天'` → `'全天班'`（1 行）：**确定修复**。字典里是「全天班」（SH004
  `status=deleted` 但仍保留 08:00-20:00，且 `teamAvailabilityService` 查 `shifts`
  时**不过滤 deleted**）⇒ 修后该行工时 12h 可正常计算。
- **U+FFFD 乱码（2 行，EMP_001/EMP_003 @2026-09-13）：原值不可逆推，不猜，只报告。**

**未做** `schedules.shift` 从「名称」改 `shift_code` 的全量重构（原 D-F）：
跨 7 个后端端点 + 6 个前端组件，且 `swap_requests.original_shift` 存量语义随之改变。
当前 3 行脏数据已修/已标记，重构收益远低于风险。

### E8 —— 清理坏端点与死代码 ✅ **主要部分完成（2026-10-24）**

- ✅ `attendanceIntegration.ts` 的坏列已修（`employee_id`→`worker_id`、
  `updated_at`→`update_time`、`created_at`→`create_time`、INSERT 补必填 `name`），
  三个端点实测 500 → 200
- ✅ `farm_task_swap_requests` 路由已下线（E5）
- ⬜ `src/hooks/useScheduledTasks.ts`（定时任务 cron hook）—— **零引用**，已确认是死代码；
  **未删**（项目规则：删文件需明确授权）
- ⬜ `src/pages/WorkerAttendance.tsx` —— 路由已重定向，**无任何 import 引用**；
  **未删**（同上）

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
