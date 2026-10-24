# 员工身份契约（Employee Identity Contract）

> 版本：v1.0　生效日期：2026-10-24　状态：**生效**
> 决策来源：「员工身份管理」立项规划（`docs/superpowers/plans/2026-10-24-employee-identity-management-plan.md`）的 D-A / D-B / D-C
> 配套工具：`server/src/lib/employeeIdentity.ts`（`resolveEmployeeIdentity`）
> 实施计划：`docs/superpowers/plans/2026-10-24-employee-identity-e1-plan.md`

---

## 1. 目的

全站曾有 **5 套互不相通的员工 ID 空间**，导致「同一个人在不同表里是不同 id」，以及「按姓名哈希编造 ID」这类反模式（commit `2b382ba0` 的说明里自承曾把执行人哈希成 `EMP_98404`）。

本契约确立**唯一员工主数据源**与**每列的 ID 归属声明**，让任意两表的人员可以确定性地对上。

---

## 2. 两个体系的分工（互补，不是重复）

| | `employees`（员工档案） | `users`（登录账号） |
|---|---|---|
| 角色 | **业务主数据** —— 这个人在组织里是谁 | **认证身份** —— 这个人能不能登录系统 |
| 关键字段 | `employee_code`、`skills`、`hourly_rate`、`employee_type`、`hire_date`、离职字段 | `username`、`password_hash`、`org_oid`、`last_login` |
| 部门/岗位 | `department_name` + `position_name` | `department_name` + `position` |
| 关系 | 被引用方 | 通过 `users.employee_id` 挂靠到 `employees`（1:N，`employee_id` 可空） |

**为什么不能二选一**：`users` 有认证与组织归属但没有员工业务属性（工号、技能、时薪、在离职状态）；`employees` 有员工业务属性但没有登录能力。纯现场工人「有档案、无账号」是正常业务形态，因此 `users.employee_id` **允许为空**。

---

## 3. ID 归属声明（每列必须属于其中一类）

**新建或修改任何"人"的列时，必须在本表登记。**

| 表.列 | 引用 | 说明 | 状态 |
|---|---|---|---|
| `schedules.staff_id` | `employees.id` | 考勤排班的人 | ✅ 已合规（17/17 命中） |
| `team_members.worker_id` | `employees.id` | 班组成员 | ✅ 已合规（9/9 命中） |
| `farm_task_schedules.worker_id` | `employees.id` | 任务排班的人（表已声明 FK） | ✅ E4 已归一（41/41 命中，**38 行 FK 孤儿清零**） |
| `attendance_records.worker_id` | `employees.id` | 考勤记录的人 | ✅ E2 已归一（生效 10/10 命中；13 行 mock 已归档，保留原 ID 不参与业务） |
| `overtime_records.worker_id` | `employees.id` | 加班的人 | ✅ E2 已归一（生效 3/3；6 行归档） |
| `leave_records.worker_id` | `employees.id` | 请假的人 | ✅ E2 已归一（生效 3/3；16 行归档） |
| `farm_tasks.assignee_id` | `users.id` | 任务执行人（能登录的账号） | ✅ 已合规（216/216 命中，commit `2b382ba0`） |
| `farm_operation_records.operator_id` | `employees.id` | 谁做了这个作业操作 | ✅ E3 已归一（68/68 命中，12 行无法归一置 NULL） |
| `labor_records.worker_id` | `employees.id` | 谁干的这份工时 | ✅ E3 已归一（3/3 命中，1 行置 NULL） |

> **两套 id 并存不是问题，「没声明归属」和「混用」才是问题。**
> `users.id` 与 `employees.id` 之间的转换走 `users.employee_id`（确定性），不允许靠姓名猜。

---

## 4. 禁止项

| ❌ 禁止 | 为什么 | 正解 |
|---|---|---|
| 把姓名哈希成 ID（如 `EMP_98404`） | 哈希不可逆、不可校验，且与真实档案冲突 | 过 `resolveEmployeeIdentity` |
| 人员列存自由文本（如 `USER_ADMIN_001`、`demo_user`、`u`、`EMP-999`、`EMP_VERIFY`） | 无法关联到任何人，统计与追溯全断 | 只允许 `employees.id` 或 `users.id` |
| 人员列存 `users.username`（如「陆启闯」） | username 可改，不是稳定标识 | 存 `employees.id` 或 `users.id`（按 §3 归属） |
| 人员列存 `employees.name`（如「张三」） | 姓名不唯一，改名即断链 | 存 `employees.id` |
| 在写路径里"猜"一个 ID 落库 | 猜错就等于把数据挂到错的人身上 | 归一失败 → 该列置 NULL（人名列保留原显示名）或**不写库** + 明确报错 |

---

## 5. 写入路径规范

### 5.1 唯一入口

```ts
import { resolveEmployeeIdentity } from '../lib/employeeIdentity';

const r = resolveEmployeeIdentity(candidateId, candidateName);
// r = { employeeId, name, matchedBy } | null
```

判定顺序（命中即返回）：

| 顺序 | 条件 | `matchedBy` |
|---|---|---|
| 1 | `candidateId` 直接命中 `employees.id` 且 `status='active'` | `employee_id` |
| 2 | `candidateId` 命中 `users.id` → `users.employee_id` → `employees.id` | `user_employee_id` |
| 3 | `candidateName` **唯一**命中 `employees.name` 且 `status='active'` | `name` |
| 4 | 都不命中 | → `null` |

### 5.2 调用方义务

- **返回 `null` 时不得写库**，必须返回明确原因（例：`'执行人不在员工档案中，无法自动排班…'`）
- 不得绕过本工具自行 `SELECT ... WHERE name = ?`
- 第 3 步是**兜底**不是主路径：多命中一律视为「无法确定」，不得随便挑一个

### 5.3 数据库约束现状

- 本项目 SQLite 的**外键约束实际生效**（better-sqlite3 默认 ON；sql.js 由 `server/src/db/index.ts:178` 显式 ON）—— 实测两个运行时都拒绝孤儿插入
- 但 `ALTER TABLE ... ADD COLUMN` **不允许带 `REFERENCES` 子句** → `users.employee_id` 无法声明 FK，**走应用层校验 + 索引 + 本契约**
- `farm_task_schedules` 现存 38 行 `worker_id` 孤儿，是**表重建时临时关闭 FK** 带进来的历史遗留（标准 SQLite ALTER 流程要求如此）。这些行一旦 `UPDATE` 其 `worker_id` 就会触发 FK 失败 —— E4 合并时必须处理

---

## 6. 存量脏 ID 归口

| 脏 ID 形态 | 出现位置 | 归口期次 | 处置 |
|---|---|---|---|
| `W001`~`W008`、`S001`~`S003`、`U001` | `attendance_records` / `overtime_records` / `leave_records` | **E2** ✅ | 归档打标（`is_archived=1` + 原因），保留原 ID 不参与业务 |
| `EMP_63279`、`EMP_81035`、`EMP_98404` | 同上 + 姓名哈希产物 | **E2** ✅ | 同上（`EMP_98404` 在 `attendance_records` 因姓名「陆启闯」成功归一到 `EMP_007`） |
| `WORKER_001`~`WORKER_004`（张三/李四/王五） | 同上 | **E2** ✅ | 按姓名无损归一到 `EMP_001`~`EMP_003` |
| `user-admin` | `farm_task_schedules`（38 行）+ `farm_operation_records`（10 行） | **E3** ✅ / **E4** ⬜ | 作业记录已归一到 `EMP_007`；任务排班 38 行待 E4 两表合并 |
| `USER_ADMIN_001`、`u`、`demo_user`、`EMP-999`、`EMP_VERIFY`、`EMP_W5`、`QA`、`null`、空串 | `farm_operation_records` / `labor_records` | **E3** ✅ | 可归一的按姓名/账号桥归一（51 行）；无法归一的 **operator_id 置 NULL**（12 行），operator_name 保留原显示名 |
| `USR001`、`USR002` | `labor_records` | **E3** ✅ | 按姓名归一到 `EMP_001`/`EMP_002` |

> **两种"不参与业务"的处置方式**（都保留原数据、不物理删除）：
> - **归档打标**（E2 的三张考勤/假勤表）：加 `is_archived` + `archived_reason`，查询默认过滤
> - **置 NULL**（E3 的作业/工时表）：`operator_id` 置 NULL 表示"无归属员工的操作"，`operator_name` 保留原显示名
>
> 选置 NULL 而非归档的理由：作业/工时表有 20+ 处读取（批次成本视图 / 合规报告 / 审批联动 / 成本统计），
> 加归档列需改遍这些点且触及《农产品质量安全法》要求的 ≥2 年生产记录存档；实测那些查询都不按
> `operator_id` 过滤，置 NULL 无影响。

---

## 7. 变更登记要求

任何新增/修改"人"的列，必须同时做三件事：

1. 在本文件 §3 登记归属
2. 写入路径改走 `resolveEmployeeIdentity`
3. 若列值语义变化（档案 ↔ 账号），**同步更新 §3 的引用列 + 跑一次全表孤儿核对**

---

## 8. 相关文件

| 内容 | 位置 |
|---|---|
| 归一工具 | `server/src/lib/employeeIdentity.ts` |
| 工具单测（15 例） | `server/src/__tests__/employeeIdentity.test.ts` |
| 现行调用点（待 Task 4 改为委托） | `server/src/services/farmTaskScheduleService.ts:488-523` `resolveEmployeeId` |
| 员工存在性校验（既有） | `server/src/routes/schedule.ts:1382` |
| 立项规划 | `docs/superpowers/plans/2026-10-24-employee-identity-management-plan.md` |
| E1 实施计划 | `docs/superpowers/plans/2026-10-24-employee-identity-e1-plan.md` |
