# E1 员工身份建模 —— 生产库迁移 Runbook

> 版本：v1.0　编制日期：2026-10-24
> 关联：`2026-10-24-employee-identity-e1-plan.md`（实施计划）、`2026-10-24-employee-identity-management-plan.md`（立项规划）
> 适用场景：把 `users.employee_id` 列与 3 个真实员工档案落到生产库，并让后端加载新结构

---

## ⚠️ 动手前必读

**sql.js 是内存快照模型**：后端进程持有整库副本，任何一次 `saveDatabase()` 都会把内存里的快照整库写回磁盘。

因此本 runbook 有两条硬约束：

1. **改盘前必须停服** —— 否则迁移脚本写进磁盘的数据会被运行中的后端用旧快照覆盖
2. **必须清掉所有 tsx watch 实例** —— 同一个项目跑着多个 `tsx watch src/index.ts` 时，每个实例都持有一份独立快照。哪怕只有一个占着 3001，其余的僵尸实例也可能写盘覆盖结果

---

## 步骤 0 —— 摸清现场

```bash
# 谁占着 3001
netstat -ano | grep ":3001 " | grep LISTENING

# 有几个 tsx watch 实例（每一个都是独立的 DB 快照持有者）
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'tsx.*watch src/index.ts' } | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | Format-Table -AutoSize | Out-String -Width 200"
```

> **判读**：若实例数 > 1，先全部记下 PID（步骤 1 要全停），并把"实例数"记进报告。

---

## 步骤 1 —— 停服（含清理僵尸实例）

```bash
# 1a. 停掉所有 tsx watch 实例（按 PID 逐个停，含 cmd 包装进程）
#     先停子进程再停父进程，避免 cmd 包装器把它们重新拉起
taskkill //PID <cli.mjs 的 PID> //T //F
taskkill //PID <cmd.exe 的 PID> //T //F

# 1b. 确认 3001 已释放
netstat -ano | grep ":3001 " | grep LISTENING
#    期望：无输出

# 1c. 确认没有残留的 tsx watch
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'tsx.*watch src/index.ts' } | Measure-Object | Select-Object -ExpandProperty Count"
#    期望：0
```

> **不要动 Vite 前端进程**（`vite.js`）—— 前端只通过 API 写库，不停它不影响迁移，反而停掉会中断你的浏览器会话。
> 注意本机可能同时跑着 **V2.0** 项目的 vite，确认路径是 `V1.1` 再动手。

---

## 步骤 2 —— 执行迁移

```bash
node server/scripts/db-migrations/migrateEmployeeIdentity.cjs --dry-run    # 先预演
node server/scripts/db-migrations/migrateEmployeeIdentity.cjs --apply      # 再执行
```

**预期输出（--dry-run）**
```
users.employee_id 列：不存在 → 需要 ALTER TABLE 添加
employees 行数：6 → 预计 9
users 行数：5（不变）
team_members 行数：9，当前孤儿数：0（本脚本不触碰）

迁移计划：
  insert  EMP_007  陆启闯  工号=EMP26100001  管理层/系统管理员  ← 账号 user-admin
  insert  EMP_008  张俊生  工号=EMP26100002  生产部/生产经理    ← 账号 user-manager
  insert  EMP_009  王建国  工号=EMP26100003  生产部/农艺师      ← 账号 user-regular
```

**预期输出（--apply 末段）**
```
=== 迁移后复核 ===
  employees 行数 6 → 9
  已挂靠账号数 3；悬挂引用（指向不存在的档案）0 条
  team_members 行数 9 → 9；孤儿 0 → 0
  账号 → 档案映射：
    USER_ID_1 (访客01) → （无档案）
    USER_ID_2 (访客02) → （无档案）
    user-admin (陆启闯) → EMP_007 陆启闯 [EMP26100001]
    user-manager (张俊生) → EMP_008 张俊生 [EMP26100002]
    user-regular (王建国) → EMP_009 王建国 [EMP26100003]
✓ 复核通过
```

**脚本自带的保护**
- 3001 端口在监听 → 拒绝 `--apply`（EXIT=1）
- 目标 id 已被占用且姓名不一致 → 拒绝覆盖并打印"库内姓名 vs 期望姓名"
- 单事务：任一步失败整体回滚
- 自动备份到 `server/data/backups/yuanxingtu.db.bak-employee-identity-<ts>`
- JSON 报告写到 `server/data/employee-identity-report.<ts>.json`

---

## 步骤 3 —— 重启后端（**只启一个**）

```bash
cd server && npm run dev
```

> **关键**：改 `services/` 不会触发 `tsx watch` 热重载（只改 `src/index.ts` 才会），所以必须**重启**才能让 Task 4 的委托逻辑生效。
> 启完确认 3001 只有一个监听者：
> ```bash
> netstat -ano | grep ":3001 " | grep LISTENING
> ```

---

## 步骤 4 —— 验证

### 4.1 数据库层（只读）

```sql
-- 期望 9
SELECT COUNT(*) FROM employees;
-- 期望 3
SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL AND employee_id <> '';
-- 期望 0（无指向不存在档案的悬挂引用）
SELECT COUNT(*) FROM users u WHERE u.employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = u.employee_id);
-- 期望 9（班组成员未被破坏）
SELECT COUNT(*) FROM team_members tm JOIN employees e ON e.id = tm.worker_id;
```

### 4.2 业务层（E1 的收口证据）

**派工一次 → 看 `farm_task_schedules` 新增行的 `worker_id`**

```sql
-- 派工前记录当前最大值
SELECT MAX(created_at) FROM farm_task_schedules;
-- 派工后查最新一行
SELECT id, task_id, worker_id, worker_name, plan_date, status, created_at
  FROM farm_task_schedules ORDER BY created_at DESC LIMIT 3;
```

**期望**：最新行的 `worker_id = 'EMP_007'`（而不是 `'user-admin'`）。

- 若仍是 `user-admin` → 说明 Task 4 的委托没生效（后端没重启 / 改 services 未生效）
- 若为 `NULL` 或空 → 归一失败被静默跳过，看 `reason` 字段

### 4.3 UI 层

| 页面 | 期望 |
|---|---|
| 人工管理 → 人事管理 | 员工列表 6 → **9 人**，含陆启闯/张俊生/王建国 |
| 人工管理 → 考勤管理 → 工人考勤 | 名单同步变 9 人 |
| 农事任务中心 → 选执行人 | 仍是 **5 个登录账号**（users 名单，不受本期影响） |

---

## 回滚

### 数据回滚
```bash
# 用步骤 2 自动生成的备份覆盖回去（需先停服）
cp server/data/backups/yuanxingtu.db.bak-employee-identity-<ts> server/data/yuanxingtu.db
```

### 代码回滚
```bash
git revert <commit>          # 或 git checkout <commit>^ -- <files>
```
四个相关 commit（按先后）：
```
925e9f97  Task 1  归一工具 + 单测
81a9c09d  Task 2/3 users.employee_id 列 + 迁移脚本
6920ca7b  Task 5  契约文档 + CLAUDE.md 指针 + FK 更正
2adefc6e  Task 4  resolveEmployeeId 改委托
```

> ⚠️ 回滚代码后**必须重启后端**（services 不热重载）。

---

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `--apply` 报「检测到后端服务仍在 3001 端口运行」 | 没停服 | 执行步骤 1；注意可能有僵尸实例仍占着端口 |
| 迁移后数据又变回旧值 | 有僵尸 tsx watch 实例写盘覆盖 | 停掉**所有** tsx watch 实例后重新迁移 |
| `no such column: update_time` | users 的时间列是 `updated_at`（employees 才是 `update_time`） | 用 `updated_at` |
| 派工后 `worker_id` 仍是 `user-admin` | 后端没重启，Task 4 未生效 | 重启后端 |
| 派工后 `worker_id` 为空 | 归一失败被跳过 | 看接口返回的 `reason`；检查 `users.employee_id` 是否已回填 |
