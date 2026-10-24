# E1 员工身份建模 —— 详细实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Goal:** 建立「员工档案（`employees`）」与「登录账号（`users`）」的显式关联，把员工 ID 归一收敛到单一主数据源，消灭"按姓名哈希编造 ID"这类反模式。
>
> **Parent:** `docs/superpowers/plans/2026-10-24-employee-identity-management-plan.md`（立项规划，含 E1~E8 全期）
>
> **状态：** ✅ **已实施并验证完成**（2026-10-24）　**编制日期：** 2026-10-24
>
> **运行手册：** `docs/superpowers/plans/2026-10-24-employee-identity-e1-runbook.md`

---

## 0. 已拍板的决策

| 决策 | 结论 |
|---|---|
| **D-A** 唯一员工主数据源 | `employees` 为准；`users` 增 `employee_id` 挂靠过去 |
| **D-B** `users` ↔ `employees` 基数 | **1:N**，`users.employee_id` **可空**（允许"有档案无账号"的纯现场工人） |
| **D-C** 存量人员档案 | **补全部真实员工**：陆启闯 / 张俊生 / 王建国 建为正式档案；武侠人名 mock 归档。`employees` 6 人 → **9 人** |

---

## 1. 前置事实（实施前已实测，勿重复调研）

### 1.1 两个体系的实际结构（互补，不是重复）

| 维度 | `employees`（员工档案） | `users`（登录账号） |
|---|---|---|
| 行数 | 6 | 5 |
| 必填列 | `employee_code` *、`name` *、`tenant_id` * | `oid` *、`username` * |
| 业务字段 | `skills`、`hourly_rate`、`employee_type`、`hire_date`、`leave_date`、`resigned_at`、`transferred_at`、`approval_code`、`gender`、`id_card` | `password_hash`、`org_oid`、`last_login`、`avatar` |
| 部门/岗位 | `department_name` + `position_name` | `department_name` + `position` |
| 人员 | EMP_001~006 张三/李四/王五/赵六/钱七/孙八 | user-admin 陆启闯(管理层/系统管理员)、user-manager 张俊生(生产部/生产经理)、user-regular 王建国(生产部/农艺师)、访客01/02（无部门无岗位） |
| `tenant_id` | 全部 = 1 | **无该列** |
| 外键 | 无 | 无 |

> **结论：两个体系各持一半业务数据，互补。** `users` 有认证与组织归属但无员工业务属性；`employees` 有员工业务属性但无登录能力。D-A 的"employees 为准"必须以**关联**落地，不能理解为"users 是冗余的"。

### 1.2 与 `2b382ba0`「执行人统一为系统登录账号」的关系（**本期的核心价值**）

commit `2b382ba0`（2026-10-24 08:59，本会话前数小时）刚把农事任务执行人 ID 统一为 `users.id`：

```
farm_tasks.assignee_id 实际值：user-admin 216 行、空串 9 行、null 1 行
assignee_id ∩ users.id = 216 / 216   ← 全部命中
```

但排班侧的 `farm_task_schedules.worker_id` 声明 FK → `employees.id`，而 `resolveEmployeeId`（`server/src/services/farmTaskScheduleService.ts:488-523`）的兜底是**按姓名匹配**。

> **`2b382ba0` 与排班域之间目前没有确定性转换通道。** 该 commit 的说明里已自承："提交时把姓名哈希成 `EMP_98404` 编造 ID"——这就是按姓名匹配兜底的恶果。
>
> **E1-2 的 `users.employee_id` 就是这条通道。** 有了它，`users.id → employees.id` 变成一次确定性的列读取，可以彻底删掉"哈希编造 ID"的路径。

### 1.3 SQLite 外键现状（决定约束落地方式）

```
PRAGMA foreign_key_list(users)              → []   （无 FK）
PRAGMA foreign_key_list(employees)          → []   （无 FK）
PRAGMA foreign_key_list(schedules)          → []   （无 FK）
PRAGMA foreign_key_list(farm_task_schedules)→ worker_id→employees.id, task_id→farm_tasks.id
```
`farm_task_schedules` 声明了 FK 却存着 38 行孤儿。

> **2026-10-24 实测更正（初稿误判）**：初稿据此推断"SQLite FK 未强制"，**该归因错误**。
> 用合成内存库复刻同款 DDL 实测：
> - better-sqlite3（迁移脚本运行时）：`PRAGMA foreign_keys` 默认 = **1**，孤儿插入被拒绝（`FOREIGN KEY constraint failed`）
> - sql.js（服务运行时）+ `db.run('PRAGMA foreign_keys = ON')`（`server/src/db/index.ts:178`）：= **1**，孤儿插入同样被拒绝
>
> ⇒ **FK 实际是强制生效的。** 38 行孤儿是**表重建时**带进来的 —— SQLite 标准 ALTER 流程（12 步法）要求重建期间临时 `PRAGMA foreign_keys = OFF`，重建脚本照做，孤儿行随之保留。这些行如今**一旦 `UPDATE` 其 `worker_id` 就会触发 FK 失败**，是潜在地雷，E4 合并时必须处理。

⇒ **结论（不变，但理由更准确）**：`users.employee_id` 的约束仍走「应用层校验 + 索引 + 文档契约」，理由是 **SQLite `ALTER TABLE ADD COLUMN` 不允许带 `REFERENCES` 子句**，而给核心表 `users` 做重建加 FK 的风险远大于收益。**并非因为 FK 不生效。**

### 1.4 其它已核实事实

| 事实 | 位置 / 值 |
|---|---|
| `employees` 工号生成规则 | `labor.service.ts:504` `generateEmployeeCode()` → `EMP{YY}{MM}{4位随机}`，如 `EMP26101234`。现有 6 人是老格式 `EMP001`~`EMP006` |
| `employees` 对外 API | `/labor/workers/*`（`server/src/routes/labor.ts:19-42`），人事/考勤/薪资都走它 |
| 启动路径的**破坏性**自愈逻辑 | `fixMissingSchema.ts:4771-4791`：检测到 `team_members` 孤儿就**删表重建**。当前 9 行无孤儿 → 跳过。**E1 不得把一次性迁移放进启动路径**（memory: `running-server-overwrites-disk-edits` + 2026-09-17 事故） |
| `team_members` 重建依赖 employees 分布 | 同上，重建按 `employees.department_name` round-robin 分桶。E1 新增 3 人（管理层/生产部/生产部）后，仅在出现孤儿时才会触发重建 —— 当前无孤儿，**不受影响**，但列入 E1 验证项 |
| `schedules` / `attendance_records` / `team_members` 人员列 | 全部已是 `employees.id` 且 100% 命中 ✅ |
| 约定 | 本地日期用 `todayLocal()`；新列必须**同时**改 `schema.ts` + `fixMissingSchema.ts` |

---

## 2. 目标态

```
                    ┌──────────────────────┐
                    │  employees (档案主数据)│  ← D-A 唯一员工主数据源
                    │  9 人：EMP_001~009    │
                    └───────────┬──────────┘
                                │ 1:N (users.employee_id 可空)
                    ┌───────────┴──────────┐
                    │  users (登录账号)      │  5 个账号
                    │  user-admin → EMP_007 │
                    │  user-manager → EMP_008│
                    │  user-regular → EMP_009│
                    │  访客01/02 → NULL      │
                    └──────────────────────┘

业务表人员列的 ID 契约（每列必须声明引用哪张表）：
  schedules.staff_id              → employees.id   ✅ 已合规
  team_members.worker_id          → employees.id   ✅ 已合规
  farm_task_schedules.worker_id   → employees.id   ✅ 已合规
  attendance_records.worker_id    → employees.id   ✅ 已合规
  farm_tasks.assignee_id          → users.id       ✅ 已合规（2b382ba0）
  farm_operation_records.operator_id → users.id     ⬜ E3 待归一
  labor_records.worker_id         → users.id       ⬜ E3 待归一
```

---

## 3. 任务分解

### Task 1 —— 公共归一工具（**先做，无副作用，可独立验证**）

**新增** `server/src/lib/employeeIdentity.ts`

```ts
/**
 * 员工身份归一工具（全站唯一入口）
 *
 * 背景：全站曾有 5 套互不相通的员工 ID 空间，导致"按姓名哈希编造 ID"
 *   （如 EMP_98404）这类反模式。2026-10-24 起以 employees.id 为唯一员工主数据源
 *   （决策 D-A），users.employee_id 作为登录账号 → 员工档案的确定性通道（决策 D-B）。
 *
 * 判定顺序（严格按此顺序，命中即返回）：
 *   1. candidateId 直接命中 employees.id 且 status='active'      → 档案直引
 *   2. candidateId 命中 users.id → 读 users.employee_id → 命中 employees.id → 账号转档案
 *   3. candidateName 唯一命中 employees.name 且 status='active'  → 姓名兜底（唯一命中才用）
 *   4. 否则                                                          → null（调用方不得写库）
 *
 * 第 3 步是兜底而非主路径：多命中或零命中一律返回 null，避免把数据挂到错的人身上。
 */

/** 归一结果 */
export interface ResolvedEmployee {
  /** 员工档案主键 employees.id */
  employeeId: string;
  /** 员工姓名（employees.name） */
  name: string;
  /** 命中路径，供日志与排障使用 */
  matchedBy: 'employee_id' | 'user_employee_id' | 'name';
}

/**
 * 归一任意来源的人员标识为 employees.id
 * @param candidateId 候选 ID（可能是 employees.id 或 users.id）
 * @param candidateName 候选姓名（仅作兜底）
 * @returns 归一结果；无法确定时返回 null
 */
export function resolveEmployeeIdentity(
  candidateId: string | null | undefined,
  candidateName?: string | null,
): ResolvedEmployee | null;
```

**接口约定（必须遵守）**
- 输入的 `candidateId` **允许**是 `users.id`（2b382ba0 之后农事任务执行人就是它）
- 返回 `null` 时，调用方**不得**写库（沿用 `farmTaskScheduleService` 现有语义：`reason: '执行人不在员工档案中，无法自动排班…'`）
- 纯函数，不抛异常；DB 访问失败时返回 `null` 并由调用方决定是否上报

**新增测试** `server/src/__tests__/employeeIdentity.test.ts`

| 用例 | 断言 |
|---|---|
| 传 `employees.id` | 返回该员工，`matchedBy='employee_id'` |
| 传 `users.id`（有档案关联） | 返回其 `employee_id` 对应员工，`matchedBy='user_employee_id'` |
| 传 `users.id`（`employee_id` 为 NULL，访客） | 返回 `null` |
| 传 `users.id`（`employee_id` 指向已不存在的档案） | 返回 `null` |
| 传未知 ID + 唯一重名 | 返回该员工，`matchedBy='name'` |
| 传未知 ID + 多人重名 | 返回 `null`（不得随便挑一个） |
| 传未知 ID + 无姓名 | 返回 `null` |
| 传入职状态非 active 的员工 ID | 返回 `null` |

> **验收**：覆盖 3 条判定分支 + 4 类边界；禁止只断言"不抛错"（Rule 9）。

---

### Task 2 —— `users` 表增 `employee_id` 列

**改 3 处（缺一不可）**

| # | 文件 | 改动 |
|---|---|---|
| 2-1 | `server/src/db/schema.ts` | `users` 的 `CREATE TABLE IF NOT EXISTS` 中加 `employee_id TEXT,`（放在 `status` 附近，附注释说明可空语义） |
| 2-2 | `server/src/db/fixMissingSchema.ts` | 新增 `const usersColumnsToAdd: Array<{ table: string; name: string; sql: string }> = [{ table: 'users', name: 'employee_id', sql: 'employee_id TEXT' }]` + 对应循环（照抄同文件 `farmTaskColumnsToAdd` 的写法） |
| 2-3 | `server/src/db/fixMissingSchema.ts` | 同一处加索引：`CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id)` |

> ⚠️ **漏掉 2-2 会导致老库上 `users.employee_id` 不存在** —— 这是本项目反复踩过的坑（memory: `fixmissingschema-harvest-form-omission`）。`CREATE TABLE IF NOT EXISTS` 不会给已存在的表加列。

---

### Task 3 —— 迁移脚本：补 3 个员工档案 + 回填 `users.employee_id`

**新增** `server/scripts/db-migrations/migrateEmployeeIdentity.cjs`

沿用 `server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs` 的既有骨架（dry-run / apply / 自动备份 / 行数校验 / JSON 报告 / 停服检查）。

#### 3-1 补 3 个员工档案（D-C）

| 新 id | employee_code | name | department_name | position_name | employee_type | status | tenant_id | 来源 |
|---|---|---|---|---|---|---|---|---|
| `EMP_007` | `EMP2610XXXX`（生成器产出，写脚本时确定并硬编码，保证幂等） | 陆启闯 | 管理层 | 系统管理员 | 正式 | active | 1 | `users.user-admin` |
| `EMP_008` | `EMP2610XXXX` | 张俊生 | 生产部 | 生产经理 | 正式 | active | 1 | `users.user-manager` |
| `EMP_009` | `EMP2610XXXX` | 王建国 | 生产部 | 农艺师 | 正式 | active | 1 | `users.user-regular` |

- `hire_date` 取 `users.created_at` 的日期部分（不是今天 —— 账号创建日才是入职近似值）
- `create_by` 写 `'migration'`
- **幂等**：`INSERT ... WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = ? OR employee_code = ?)`
- **不覆盖**：若 `EMP_007` 等 id 已被占用（换机/重跑），脚本必须**报错退出**而不是覆盖
- `employee_code` 用 `EMP2610XXXX` 形式，**不与现有 `EMP001~EMP006` 冲突**（格式不同，天然不冲突）

#### 3-2 回填 `users.employee_id`

| users.id | → employee_id |
|---|---|
| `user-admin` | `EMP_007` |
| `user-manager` | `EMP_008` |
| `user-regular` | `EMP_009` |
| `USER_ID_1778894576568`（访客01） | NULL（保持） |
| `USER_ID_1778894607144`（访客02） | NULL（保持） |

- **幂等**：`UPDATE users SET employee_id = ? WHERE id = ? AND (employee_id IS NULL OR employee_id = '')`
- 回填前**校验**：`employees` 中该 id 存在且 `status='active'`，否则跳过并在报告里列出

#### 3-3 脚本纪律

```
--dry-run（默认）：只输出将执行的 SQL 与影响行数，不落盘
--apply：实际执行
```
执行前置检查（缺一即中止）：
1. **停服检查** —— 检测 3001 端口是否被占用；被占用则中止并提示"先停服"
2. **自动备份** —— `yuanxingtu.db` → `yuanxingtu.db.bak.<timestamp>`
3. **前置行数校验** —— `employees` 6 行、`users` 5 行、`team_members` 9 行，记录到报告
4. **后置行数校验** —— `employees` 应为 9 行；`users.employee_id` 非空应为 3 行；`team_members` 应仍为 9 行且无孤儿

> ⚠️ **禁止**把本脚本的逻辑放进 `fixMissingSchema.ts` 的启动路径（1.4 节已述）。

---

### Task 4 —— `resolveEmployeeId` 改为委托公共工具

**改** `server/src/services/farmTaskScheduleService.ts:488-523`

- 现有本地 `resolveEmployeeId(workerId, workerName)` 改为薄封装，委托 `lib/employeeIdentity.resolveEmployeeIdentity`
- 保留导出名 `resolveEmployeeId`（调用点 `farmTaskScheduleService.ts:543-556` 不用改），避免大范围改动
- **行为变化（必须记录）**：新增「`users.id` → `users.employee_id` → `employees.id`」这条确定性分支。
  - 影响：派工自动排班时，assignee 是 `user-admin` → 现在能正确归一到 `EMP_007`（此前按姓名"陆启闯"匹配 employees 必然失败，因为 employees 里没有陆启闯）
  - **正向影响**：这正是 `2b382ba0` 之后自动排班一直失败的原因

**改** `server/src/services/farmTaskScheduleService.ts:552` 的 `reason` 文案 —— 已在上轮 commit `baf50410` 更新过路径指引，本期不动。

---

### Task 5 —— ID 契约文档

**新增** `docs/superpowers/specs/2026-10-24-employee-identity-contract.md`

核心内容：

1. **两套 ID 的分工**：`employees` = 员工档案（业务事实）；`users` = 登录账号（认证身份）
2. **每列必须声明引用哪张表** —— 列出 §2 的对照表，并规定新增列时必须同步登记
3. **禁止项**：
   - ❌ 禁止把姓名哈希成 ID（如 `EMP_98404`）
   - ❌ 禁止在人员列存自由文本（如 `USER_ADMIN_001`、`demo_user`、`u`、`EMP-999`）
   - ❌ 禁止在人员列存 `users.username`（应存 `users.id`）
   - ❌ 禁止在人员列存 `employees.name`（应存 `employees.id`）
4. **写入路径必须过 `lib/employeeIdentity.resolveEmployeeIdentity`**，返回 `null` 时不得写库
5. **存量脏 ID 的历史成因与归口期次**（W001/S001/EMP_63279 等 → E2；operator_id/labor_records → E3）

**改** `CLAUDE.md`（项目根 + `V1.1/CLAUDE.md`）加一节「员工身份契约」，指向该 spec。

---

### Task 6 —— 全量验证与回归

| # | 检查 | 命令 / 方法 | 通过标准 |
|---|---|---|---|
| 1 | 后端类型检查 | `cd server && npx tsc --noEmit` | EXIT=0 |
| 2 | 后端单测 | `cd server && npm run test:run` | 与 baseline 对比无新增失败（**已知基线有既有失败项，先 stash 对比** —— memory `backend-test-baseline-has-existing-failures`） |
| 3 | 新增单测 | `server/src/__tests__/employeeIdentity.test.ts` | 8 个用例全绿 |
| 4 | 数据核对（只读） | 见下方 SQL | 全部符合预期 |
| 5 | 浏览器回归 | `/browse` | 见 §4 清单 |

**数据核对 SQL（apply 后执行，只读）**
```sql
-- 期望：9 / 9
SELECT COUNT(*) FROM employees;
-- 期望：3（非空）
SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL AND employee_id <> '';
-- 期望：0（无指向不存在档案的关联）
SELECT COUNT(*) FROM users u WHERE u.employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = u.employee_id);
-- 期望：3 / 3（3 个真实账号均能归一到档案）
SELECT COUNT(*) FROM users u JOIN employees e ON e.id = u.employee_id WHERE u.status='active';
-- 期望：9 / 9 未被破坏
SELECT COUNT(*) FROM team_members tm JOIN employees e ON e.id = tm.worker_id;
-- 期望：0（启动自愈未误触发）
SELECT COUNT(*) FROM team_members tm
 WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = tm.team_id)
    OR NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = tm.worker_id);
```

---

## 4. 浏览器回归清单

| # | 场景 | 期望 |
|---|---|---|
| 1 | 人工管理 → 人事管理（`/labor/personnel`） | 员工列表从 6 → 9 人，出现陆启闯/张俊生/王建国 |
| 2 | 人工管理 → 考勤管理 → 工人考勤 | 下拉名单同步变 9 人 |
| 3 | 农事任务中心 → 选执行人 | **仍显示 5 个登录账号**（2b382ba0 的 users 名单，不受本期影响） |
| 4 | 农事任务中心 → 派工 → 自动排班 | `farm_task_schedules` 新增行的 `worker_id` 是 `EMP_007`（**不再是 user-admin**）—— 这是本期最关键的验证点 |
| 5 | 排班调度 → 已排班任务 | 执行人列显示员工姓名（经 `worker_name`） |
| 6 | 人工管理 → 考勤管理 → 排班 → 班次设置 | 3 个班次正常，无异常 |

> ⚠️ 场景 4 涉及**写库**。执行前先查 `operation_logs` 最近 15 分钟无他人写操作（memory `browser-automation-conflicts-with-live-user`）；验证后核对 `farm_task_schedules` 新增行并确认无残留测试数据。

---

## 5. 风险与回滚

| 风险 | 概率 | 影响 | 缓解 / 回滚 |
|---|---|---|---|
| `users.employee_id` 忘记同步 `fixMissingSchema.ts` | 中 | 老库启动后该列不存在，所有查询报错 | Task 2 强制三处同改；Task 6 检查项 4 会暴露 |
| 迁移脚本在服务运行时执行 | 低 | 内存快照全量落盘覆盖外部改盘 | 脚本内置停服检查；或按纪律手动停服执行 |
| 启动路径的 `team_members` 自愈被误触发 | 低 | 用户手动分配的班组成员丢失 | Task 6 SQL 显式核对 `team_members` 孤儿数 = 0；当前 9 行无孤儿，新增 employees 不改变孤儿判定 |
| `resolveEmployeeId` 行为变化影响现有自动排班 | 中 | 原本失败的现在成功（正向），但需确认无回归 | Task 4 保留原导出名与调用点；Task 6 场景 4 验证 |
| employees 增加 3 人后人事页列表变化 | 确定 | 观感变化 | D-C 已拍板接受 |
| FK 未强制 | ~~确定~~ **已更正** | —— | **实测 FK 是生效的**（§1.3）。真正的约束缺口是 `users.employee_id` 无法用 `ALTER TABLE ADD COLUMN` 声明 FK（SQLite 限制），故走应用层校验 + 索引 + 契约文档；`farm_task_schedules` 的 38 行历史孤儿是表重建时带进来的，E4 处理 |

**回滚**：`yuanxingtu.db.bak.<timestamp>` 备份 + `git checkout` 源码。源码改动 ≤ 6 个文件，回滚成本低。

---

## 6. 本期不做（明确划界）

| 项 | 归口 |
|---|---|
| `attendance_records` 23 行 / `overtime_records` / `leave_records` 的 ID 归一与归档 | **E2** |
| `farm_operation_records.operator_id` / `labor_records.worker_id` 归一 | **E3** |
| `farm_task_schedules` 38 行孤儿 + 两张排班表合并 | **E4** |
| 两套调班合并 | **E5** |
| 签到口径归一（`schedules.check_in` 废弃） | **E6** |
| 班次编码统一（`schedules.shift` 名 → code） | **E7** |
| `attendanceIntegration.ts` 坏列端点 | **E8** |
| 开启 SQLite `PRAGMA foreign_keys` | **不需要** —— 实测已生效（§1.3）。真正的待办是清理 `farm_task_schedules` 的 38 行历史孤儿，归 E4 |

---

## 7. 执行顺序建议

```
Task 1（公共工具 + 单测）      ← 纯新增，零风险，可立即做
   ↓
Task 2（users.employee_id 列） ← 结构变更，需停服窗口
   ↓
Task 3（迁移脚本 apply）        ← 需停服窗口，与 Task 2 合并执行
   ↓
Task 4（resolveEmployeeId 委托）← 需 Task 3 的数据支撑才能验证场景 4
   ↓
Task 5（契约文档 + CLAUDE.md）  ← 可与 Task 1 并行
   ↓
Task 6（全量验证与回归）
```

**建议把 Task 1 + Task 5 作为第一个 commit**（纯代码与文档，零数据风险，可独立评审），Task 2 + 3 作为第二个 commit（停服窗口内的结构 + 数据变更），Task 4 作为第三个 commit。

---

## 8. 实施记录（2026-10-24 已全部完成）

### 8.1 提交清单

| commit | 内容 |
|---|---|
| `925e9f97` | Task 1 归一工具 `resolveEmployeeIdentity` + 15 例单测 |
| `81a9c09d` | Task 2/3 `users.employee_id` 三处同改 + 迁移脚本 |
| `6920ca7b` | Task 5 员工身份契约 spec + CLAUDE.md 指针 + FK 归因更正 |
| `2adefc6e` | Task 4 `resolveEmployeeId` 改委托 + 10 例集成测试 |
| `d53394ff` | 人事管理性别/年龄降级渲染 + E1 迁移 Runbook |
| `2d6f66b0` | 集成测试元组类型修正 |

### 8.2 生产库迁移执行结果

| 项 | 迁移前 | 迁移后 |
|---|---|---|
| `employees` 行数 | 6 | **9** |
| `users` 已挂靠 `employee_id` | 0 | **3** |
| 悬挂引用 | — | **0** |
| `team_members` 行数 / 孤儿 | 9 / 0 | **9 / 0**（未受影响） |
| `users.employee_id` 列 | 不存在 | **已添加 + 索引** |

备份：`server/data/backups/yuanxingtu.db.bak-employee-identity-<ts>`
报告：`server/data/employee-identity-report.<ts>.json`（已 gitignore）

### 8.3 停服窗口发现的问题

执行时发现**同时跑着 5 个 `tsx watch src/index.ts` 实例**（只有 1 个占着 3001）。其余 4 个各持一份迁移前的**内存 DB 快照** —— 任何一个写盘都会覆盖迁移结果。已全部停下（node 进程 60 → 49，释放 443 MB），Vite 前端保留未动。

> 这是 memory `zombie-processes-db-conflict` 的同类问题，已写入 Runbook 步骤 1。

### 8.4 端到端证据（Task 4 收口）

迁移 + 重启后端后，**用户在系统里真实派工**产生的排班行：

```
id=1792819268909_mtt9qmh  task_id=NS20261024-394
worker_id=EMP_007  worker_name=陆启闯  created_at=2026-10-24T05:21:08Z
```

链路：派工 → `syncAfterDispatch` → `auto-assign` → `resolveEmployeeId`（委托）→ `resolveEmployeeIdentity` → `users.employee_id` → `employees.id` → `EMP_007`。

历史 38 行仍是 `user-admin`（迁移前遗留，归 E4 处理）。

### 8.5 迁移脚本的实测缺陷（已修）

用**合成库**跑 `--apply` 全路径时拦下一个真 bug：`users` 的时间列是 `updated_at`，而 `employees` 是 `update_time` —— 第一版写成 `update_time` 直接 `no such column`。事务正确回滚（列未残留、行数未变），修正后重跑通过。

> 教训：迁移脚本必须在合成库上跑通 `--apply` 全路径，不能只跑 `--dry-run`。

### 8.6 3 个新员工档案的字段完整度（用户已确认保留）

| 字段 | 状态 | 说明 |
|---|---|---|
| `phone` | ✅ 3/3 已回填 | 源 `users.phone`，无损映射 |
| `remarks` | ✅ 3/3 已标注 | 记录账号关联 + 待补录项 |
| `gender` / `id_card` / `skills` | ⬜ 保留空值 | **全库无任何来源**（已核实 `users` 无这三列，`onboarding_records`/`contracts` 也无这些人），用户确认不编造 |

已知副作用：回填手机号后出现 2 对重复（张俊生=张三 `13800138001`、王建国=李四 `13800138002`），因 `users` 与 `employees` 两套演示数据序列撞车。用户确认保留（演示数据，手机号无唯一约束、不参与任何流程）。

### 8.7 顺带修掉的既有缺陷

| 缺陷 | 位置 | 处置 |
|---|---|---|
| 员工姓名行渲染出孤立的「岁」 | `PersonnelTable.tsx:122` / `PersonnelDetailModal.tsx:29` | 缺 gender/age 时按项过滤，不再渲染空单位 |
| 人事管理「员工信息」页错误挂载农事 AI 面板 | `StaffManagementPage.tsx:267` `<AIPanel context="员工管理" />` | 已移除（AIPanel 正位是智能任务中心，另有 3 处引用不受影响） |

### 8.8 发现但**未修**的既有问题（不在 E1 范围）

| 问题 | 说明 |
|---|---|
| `getSkillTags` 永远返回空 | `employees.skills` 实际存逗号分隔（`"种植,采收,施肥"`），但 `labor.repository.ts:593` 用 `JSON.parse` 解析 → 必然抛错被 `catch` 静默丢弃 |
| 人事「技能档案」Tab 无后端 | `useSkillStore` 用 mock 种子 + localStorage 持久化，违反项目「禁止 localStorage 兜底」铁律，且无对应后端表 |
| 部门 ID 三套互不相通 | `employees.department_id` 用 `DEPT_001~005`（主表里不存在）、`users.department_oid` 用 `ORG001/002`、`departments` 主表用 `D001~D005`。现有 6 人的部门筛选同样失效 |
| 人事列表部门/班组/岗位列显示空 | 影响全部 9 人，非本次引入 |
