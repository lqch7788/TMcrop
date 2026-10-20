# 任务派工排班 并入排班调度 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「任务派工排班」（原独立路由 `/farm-task-schedule`）合并进「排班调度」（`/schedule`）的 Tab 结构，侧边栏农事管理从 6 项减到 5 项，同时统一两套班次字典、修掉班组分配页的断链按钮。

**Architecture:** 保留 `farm_task_schedules` 表与 `/api/farm-task-schedules/*` 接口不变，**只做 UI 层合并 + 班次字典统一**。`/schedule` 路由改为自建 Tab 容器（不用 `@/components/ui` 的 Tabs），两个面板都用 CSS `hidden` 保持挂载。`/farm-task-schedule` 保留为重定向路由，防旧书签/外链 404。

**Tech Stack:** React 18 + TypeScript 5.6 + Vite 6 + Zustand 5 + React Router v6；后端 Express 4 + sql.js；迁移脚本 Node CJS（better-sqlite3）

**Spec:** `docs/superpowers/specs/2026-10-20-farm-operations-closure-design.md` §3.6（P0-6 任务派工排班）—— 本计划是 P0-6 的收口批次

**上游决策记录:** 用户已确认「合并到排班调度」+「Step 1-4 完整批次」。

---

## Global Constraints

- **班次字典唯一数据源 = `shifts` 表**（`SH001 早班 06:00-14:00` / `SH002 中班 14:00-22:00` / `SH003 晚班 22:00-06:00`；`SH004 全天班` status='deleted'，API 已过滤）。新代码**禁止**再出现 `day` / `night` / `morning` / `afternoon` 硬编码枚举。
- **禁止 Radix Select 卸载风暴**：Tab 切换**不得**卸载面板。`@/components/ui` 的 `TabsContent` 对非选中项 `return null`（`src/components/ui/tabs.tsx:127`），直接用它会在切换时一次性卸载考勤排班面板里几十个 Radix Select，复现已验证过的卡死事故（memory: `radix-select-unmount-freeze`）。**必须自建 Tab 容器 + CSS hidden。**
- **本地日期一律用 `todayLocal()`**（`src/lib/dateUtils`），**禁止 `new Date().toISOString().slice(0,10)`**（UTC bug，中国 0-8 点会算出昨天；memory: `utc-timezone-id-bug`）。
- **改盘前必须停服**：sql.js 的 `saveDatabase()` 会用内存快照全量重写文件，运行中的服务会覆盖外部改盘（memory: `running-server-overwrites-disk-edits`）。**停服前必须先告知用户。**
- **写端点必须显式 `saveDatabase()`**：sql.js 只有显式调用才落盘（memory: `write-endpoints-missing-savedatabase`）。
- **不删任何文件**，不擅自改菜单名/页面位置（用户已明确两次纠正过 IA 变更）。
- **组件 → Store → enhancedApiClient → API**，禁止组件直调 `fetch` / `apiService`；禁止 `localStorage` 兜底。
- **中文注释**；导出函数必须有 docstring。
- **每批次回归**：本计划 4 个 Task 完成后必须整体回归排班调度 + 任务排班 + 班组分配 + 农事任务中心 4 条链路（memory: `per-batch-regression-gate`）。

---

## 关键事实（实施前已核实，勿重复调研）

| 项 | 实测值 | 来源 |
|---|---|---|
| `farm_task_schedules` 行数 | **14** | 只读查 `server/data/yuanxingtu.db` |
| 14 行的 `shift_type` | **全部 `'day'`** | 同上 |
| 14 行的 `plan_start` / `plan_end` | **全部 `null`** | 同上 |
| 14 行的 `status` | **全部 `'scheduled'`** | 同上 |
| `shifts` 有效行 | 3（SH001/SH002/SH003，SH004 已 deleted） | `GET /basic-data/shifts` 有 `WHERE status != 'deleted'` |
| `schedules.shift` 存的 | 班次**名称**（'早班'），不是 code | `server/src/db/schema.ts:2698` |
| `farm_task_schedules.shift_type` 存的 | 枚举码（'day'），要改成 shift_code | `server/src/db/schema.ts:866` |

**遗留（不在本计划范围，单独记）：** 14 行里有 6 行（`task_id='NS20260316-001'` 那批）`worker_name` 是 U+FFFD×4 的**真实乱码脏数据**（hex `EFBFBD`×4），不是控制台编码问题。来源是种子数据写坏。**本计划不修它**（涉及"审计行删除必须显式授权"的红线），但迁移脚本的报告里要标出来。

---

## Task 1: 排班调度页 Tab 容器

**Files:**
- Modify: `src/pages/Schedule.tsx`（当前 7 行，重写为 Tab 容器）
- Test: 无新增单测（纯容器组件；靠 Task 5 的浏览器实测覆盖）

**Interfaces:**
- Consumes: `SchedulePage`（`src/components/labor/schedule/index.ts:2` 已导出）、`TaskSchedulePage`（`src/pages/farm/TaskSchedulePage.tsx` 默认导出）
- Produces: `default export function Schedule()` —— 签名不变，App.tsx 无需改 import

- [ ] **Step 1: 重写 `src/pages/Schedule.tsx`**

```tsx
/**
 * 排班调度页（Tab 容器）
 *
 * 2026-10-20：把「任务派工排班」（原独立路由 /farm-task-schedule）合并进来。
 *
 * 为什么合并到排班调度而不是班组分配：
 *   排班调度的主键是「人 × 日期 × 班次」，与任务排班的「任务 × 人 × 日期」同轴；
 *   班组分配是组织维度（谁归哪个班组长管），与时间轴维度错配。
 *
 * 为什么自己写 Tab 而不用 @/components/ui 的 Tabs：
 *   TabsContent 对非选中面板 return null（卸载）。考勤排班面板内含大量 Radix Select，
 *   切 Tab 时一次性卸载会触发已验证的「Radix Select 卸载风暴卡死」
 *   （见 memory: radix-select-unmount-freeze）。因此两个面板都保持挂载，只用 CSS 隐藏。
 */
import { useSearchParams } from 'react-router-dom';
import { SchedulePage } from '../components/labor/schedule';
import TaskSchedulePage from './farm/TaskSchedulePage';

const TAB_ATTENDANCE = 'attendance';
const TAB_FARM_TASK = 'farm-task';

export default function Schedule() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab 状态落在 URL 上：可分享、可前进后退
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === TAB_FARM_TASK ? TAB_FARM_TASK : TAB_ATTENDANCE;

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === TAB_FARM_TASK) {
      params.set('tab', TAB_FARM_TASK);
    } else {
      params.delete('tab');
    }
    setSearchParams(params, { replace: true });
  };

  const tabClass = (active: boolean) =>
    active
      ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-white text-emerald-600 shadow-sm transition-colors'
      : 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors';

  return (
    <div className="space-y-4">
      {/* Tab 切换条 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => handleTabChange(TAB_ATTENDANCE)}
            data-state={activeTab === TAB_ATTENDANCE ? 'active' : 'inactive'}
            className={tabClass(activeTab === TAB_ATTENDANCE)}
          >
            考勤排班
          </button>
          <button
            type="button"
            onClick={() => handleTabChange(TAB_FARM_TASK)}
            data-state={activeTab === TAB_FARM_TASK ? 'active' : 'inactive'}
            className={tabClass(activeTab === TAB_FARM_TASK)}
          >
            任务排班
          </button>
        </div>
      </div>

      {/* 两个面板都保持挂载，只用 CSS 隐藏 —— 避免 Radix Select 卸载风暴 */}
      <div className={activeTab === TAB_ATTENDANCE ? 'block' : 'hidden'}>
        <SchedulePage />
      </div>
      <div className={activeTab === TAB_FARM_TASK ? 'block' : 'hidden'}>
        <TaskSchedulePage />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 跑类型检查**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: 不新增错误（注意：根 `tsconfig.json` 是 `files:[]` 的 solution 配置，直接 `tsc -p tsconfig.json` 零检查假通过，**必须用 `tsconfig.app.json`**；本仓库历史积压约 1301 个类型错误，**只核对本次改动文件不新增错误**）

- [ ] **Step 3: 提交**

```bash
git add src/pages/Schedule.tsx
git commit -m "feat(schedule): 排班调度页改造成双 Tab 容器，任务排班并入"
```

---

## Task 2: 路由重定向 + 删侧边栏条目 + 权限映射

**Files:**
- Modify: `src/App.tsx:133`（删 import）、`src/App.tsx:577-578`（路由改重定向）
- Modify: `src/components/layout/Sidebar.tsx:103`（删「任务派工排班」条目）
- Modify: `src/lib/processRouteMap.ts:41-42`（删 `/farm-task-schedule` 条目）

**Interfaces:**
- Consumes: `Navigate`（`src/App.tsx:2` 已从 react-router-dom 导入，无需加 import）
- Produces: `/farm-task-schedule` → 302 到 `/schedule?tab=farm-task`；侧边栏农事管理 5 项

- [ ] **Step 1: `src/App.tsx` 改路由**

第 133 行删掉 `import TaskSchedulePage from './pages/farm/TaskSchedulePage';`（TaskSchedulePage 现在由 `src/pages/Schedule.tsx` 引用，App.tsx 不再直接用）。

第 577-578 行替换为：

```tsx
          {/* 2026-10-20：任务派工排班已并入排班调度 Tab，旧路由重定向（保旧书签/外链） */}
          <Route path="/farm-task-schedule" element={<Navigate to="/schedule?tab=farm-task" replace />} />
```

- [ ] **Step 2: `src/components/layout/Sidebar.tsx` 删条目**

删掉第 103 行：

```tsx
  { icon: CalendarDays, label: '任务派工排班', path: '/farm-task-schedule' },
```

并在第 104 行「排班调度」上方留一行注释说明合并去向：

```tsx
  // 2026-10-20：原「任务派工排班」(/farm-task-schedule) 已并入「排班调度」的「任务排班」Tab，
  //   侧边栏不再单列（避免两个"排班"同名项 + 同图标 CalendarDays 造成混淆）。
```

- [ ] **Step 3: `src/lib/processRouteMap.ts` 删条目**

把第 41-42 行：

```ts
  // 2026-10-20 P0-6：任务派工排班（在农事管理菜单内，需要权限映射）
  '/farm-task-schedule': 'PROC_FARM',
```

替换为：

```ts
  // 2026-10-20：原 '/farm-task-schedule'（任务派工排班）已并入 '/schedule' 的「任务排班」Tab，
  //   不再是独立路由，权限统一走 '/schedule' 的 PROC_SCHEDULE。
```

- [ ] **Step 4: 类型检查 + 提交**

```bash
npx tsc -p tsconfig.app.json --noEmit
git add src/App.tsx src/components/layout/Sidebar.tsx src/lib/processRouteMap.ts
git commit -m "feat(schedule): 任务派工排班路由重定向到排班调度，删侧边栏重复条目"
```

---

## Task 3: 班次字典统一（shifts 表为唯一数据源）

### 3a. 后端：`shift_type` 存 shift_code，并 JOIN 出班次名

**Files:**
- Modify: `server/src/services/farmTaskScheduleService.ts`

**Interfaces:**
- Produces: `getSchedules()` / `getScheduleById()` 返回行新增 `shift_name` 字段（camelCase 中间件转成 `shiftName`）；`createSchedule()` 的 `shiftType` 接受 shift_code

- [ ] **Step 1: 改 `getSchedules` 的 SQL**（`farmTaskScheduleService.ts:77-81`）

```sql
      SELECT fts.*, ft.title as task_title, ft.task_code, s.shift_name
      FROM farm_task_schedules fts
      LEFT JOIN farm_tasks ft ON fts.task_id = ft.id
      LEFT JOIN shifts s ON fts.shift_type = s.shift_code
      WHERE 1=1
```

- [ ] **Step 2: 改 `getScheduleById` 的 SQL**（`farmTaskScheduleService.ts:158-162`）—— 同样加 `LEFT JOIN shifts s ON fts.shift_type = s.shift_code` 和 `s.shift_name`

- [ ] **Step 3: 改 `createSchedule` 的班次默认值**（`farmTaskScheduleService.ts:205`）

`input.shiftType || 'day'` → `input.shiftType || null`

理由：`'day'` 不是合法 shift_code，留着会往库里写脏值；前端已保证必传。

- [ ] **Step 4: `FarmTaskSchedule` 接口补 `shift_name`**（`farmTaskScheduleService.ts:24-39`）

在 `shift_type: string;` 后加一行 `shift_name?: string | null;`

### 3b. 前端 hook：从 `useShiftStore` 取班次

**Files:**
- Modify: `src/hooks/useFarmTaskSchedule.ts`

**Interfaces:**
- Consumes: `useShiftStore`（`src/stores/useShiftStore.ts`，已从 `src/stores/index.ts:207` 导出），`shifts: Shift[]`（`Shift` 含 `shiftCode` / `shiftName` / `startTime` / `endTime`）
- Produces: `useFarmTaskSchedule()` 返回值新增 `shifts: Shift[]`；**删除导出** `FARM_TASK_SHIFT_TYPES`（唯一使用方是 TaskSchedulePage）

- [ ] **Step 1: 改 import 与常量**

删掉：

```ts
// 班次类型（与服务端 shift_type 对应）
export const FARM_TASK_SHIFT_TYPES = [
  { value: 'day', label: '白班' },
  { value: 'night', label: '夜班' },
  { value: 'morning', label: '早班' },
  { value: 'afternoon', label: '午班' },
] as const;
```

加（用**直接路径**而非 `../stores` 桶文件，避免 barrel 循环依赖）：

```ts
import { useShiftStore } from '../stores/useShiftStore';
```

- [ ] **Step 2: hook 内取班次**

在 `useFarmTaskSchedule` 函数体内加：

```ts
  // 班次字典：shifts 表是唯一数据源（ShiftEditor 维护），不再用硬编码枚举
  const shifts = useShiftStore((s) => s.shifts);
  const loadShifts = useShiftStore((s) => s.loadShifts);

  useEffect(() => {
    if (shifts.length === 0) void loadShifts();
  }, [shifts.length, loadShifts]);
```

- [ ] **Step 3: 返回值加 `shifts`**

在 `return { schedules, unscheduledTasks, ... }` 里加 `shifts,`

### 3c. 前端页面：班次下拉改用 shifts，选中自动带出起止时间

**Files:**
- Modify: `src/pages/farm/TaskSchedulePage.tsx`

**Interfaces:**
- Consumes: `useFarmTaskSchedule()` 的 `shifts`
- Produces: 表单 `shiftType` 存 shift_code；`planStart`/`planEnd` 默认取班次起止时间

- [ ] **Step 1: 删 FARM_TASK_SHIFT_TYPES 相关的 import 与常量**

删掉：

```tsx
import { useFarmTaskSchedule, FARM_TASK_SHIFT_TYPES } from '../../hooks/useFarmTaskSchedule';
```

```tsx
const SHIFT_LABEL: Record<string, string> = Object.fromEntries(
  FARM_TASK_SHIFT_TYPES.map((s) => [s.value, s.label]),
);
```

- [ ] **Step 2: hook 解构加 `shifts`，表单初始 shiftType 改空串**

```tsx
  const { schedules, unscheduledTasks, shifts, loading, error, createSchedule, deleteSchedule, refresh } =
    useFarmTaskSchedule({ date });
```

```tsx
  const [form, setForm] = useState({ workerId: '', planStart: '08:00', planEnd: '12:00', shiftType: '', remarks: '' });
```

- [ ] **Step 3: 班次 Select 改用 shifts**

替换「班次」那一格：

```tsx
                <div>
                  <Label className="text-xs text-gray-600">班次</Label>
                  <Select
                    value={form.shiftType || '__none__'}
                    onValueChange={(v) => {
                      const code = v === '__none__' ? '' : v;
                      const cfg = shifts.find((s) => s.shiftCode === code);
                      setForm((f) => ({
                        ...f,
                        shiftType: code,
                        // 选中班次自动带出该班次的起止时间（可再手动改）
                        planStart: cfg?.startTime || f.planStart,
                        planEnd: cfg?.endTime || f.planEnd,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择班次" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">选择班次</SelectItem>
                      {shifts.map((s) => (
                        <SelectItem key={s.shiftCode} value={s.shiftCode}>
                          {s.shiftName}（{s.startTime}-{s.endTime}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
```

- [ ] **Step 4: 保存前校验班次必填**

在 `handleCreate` 的校验块里（`form.workerId` 校验之后）加：

```tsx
    if (!form.shiftType) {
      await showAlert('请选择班次');
      return;
    }
```

- [ ] **Step 5: 「当日排班」列表的班次显示改为查 shifts**

原来：

```tsx
                          {SHIFT_LABEL[s.shiftType] || s.shiftType}
```

改为：

```tsx
                          {s.shiftName || shifts.find((x) => x.shiftCode === s.shiftType)?.shiftName || s.shiftType}
```

（`s.shiftName` 来自后端 JOIN，camelCase 中间件已转）

### 3d. 数据迁移：`shift_type` 从枚举值改成 shift_code

**Files:**
- Create: `server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs`
- Modify（执行时）: `server/data/yuanxingtu.db`

**Interfaces:**
- Consumes: `server/data/yuanxingtu.db`（运行时库）
- Produces: 14 行 `shift_type` 全部为 `SH001`；`plan_start`/`plan_end` 为 NULL 的行回填 `06:00`/`14:00`；JSON 报告写到 `server/data/`

- [ ] **Step 1: 写迁移脚本**

参照 `server/scripts/db-migrations/migrateTaskBatchSemantics.cjs` 的既有模式（`--dry-run` / `--apply`、自动备份、JSON 报告、行数校验）：

```js
/**
 * 迁移：farm_task_schedules.shift_type 从硬编码枚举（day/night/morning/afternoon）
 *      改为 shifts 表的 shift_code（SH001/SH002/SH003）。
 *
 * 用法：
 *   node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --dry-run
 *   node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --apply
 *
 * ⚠️ 执行 --apply 前必须先停掉后端（sql.js 的 saveDatabase() 会用内存快照覆盖磁盘）。
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../../data/yuanxingtu.db');
const APPLY = process.argv.includes('--apply');
const REPORT_DIR = path.resolve(__dirname, '../../data');

// 旧枚举 → shifts.shift_code 映射
const LEGACY_SHIFT_MAP = {
  day: 'SH001',
  morning: 'SH001',
  afternoon: 'SH002',
  night: 'SH003',
};

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  const before = db.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;
  const beforeRows = db.prepare('SELECT id, shift_type, plan_start, plan_end FROM farm_task_schedules').all();

  const unmapped = beforeRows.filter(
    (r) => r.shift_type && !LEGACY_SHIFT_MAP[r.shift_type] && !/^SH\d+$/.test(r.shift_type),
  );
  if (unmapped.length > 0) {
    console.error('存在无法映射的 shift_type，终止迁移：');
    console.error(unmapped);
    db.close();
    process.exit(1);
  }

  // 计划：只处理仍为旧枚举的行；plan_start/plan_end 只回填 NULL 的（不覆盖人工填的值）
  const plans = beforeRows
    .filter((r) => LEGACY_SHIFT_MAP[r.shift_type])
    .map((r) => {
      const code = LEGACY_SHIFT_MAP[r.shift_type];
      const shift = db.prepare('SELECT start_time, end_time FROM shifts WHERE shift_code = ?').get(code);
      return {
        id: r.id,
        from: r.shift_type,
        to: code,
        planStart: r.plan_start ?? shift?.start_time ?? null,
        planEnd: r.plan_end ?? shift?.end_time ?? null,
      };
    });

  if (APPLY) {
    // 自动备份
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const backup = path.join(REPORT_DIR, 'yuanxingtu.db.bak.' + stamp);
    fs.copyFileSync(DB_PATH, backup);
    console.log('已备份 → ' + backup);

    const upd = db.prepare(
      'UPDATE farm_task_schedules SET shift_type = ?, plan_start = ?, plan_end = ? WHERE id = ?',
    );
    const run = db.transaction((list) => {
      for (const p of list) upd.run(p.to, p.planStart, p.planEnd, p.id);
    });
    run(plans);
    db.close();

    // 重新打开校验行数
    const db2 = new Database(DB_PATH, { readonly: true });
    const after = db2.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;
    const leftovers = db2
      .prepare("SELECT COUNT(*) AS c FROM farm_task_schedules WHERE shift_type NOT LIKE 'SH%'")
      .get().c;
    db2.close();

    const report = {
      appliedAt: new Date().toISOString(),
      rowsBefore: before,
      rowsAfter: after,
      migrated: plans.length,
      leftoverNonShiftCode: leftovers,
      details: plans,
    };
    const reportPath = path.join(
      REPORT_DIR,
      'farm-task-schedule-shift-report.' + stamp + '.json',
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('迁移完成：');
    console.log('  行数 ' + before + ' → ' + after + (before === after ? '（一致）' : '（❌ 不一致）'));
    console.log('  已迁移 ' + plans.length + ' 行；残留非 SH 编码 ' + leftovers + ' 行');
    console.log('  报告 → ' + reportPath);
    if (before !== after || leftovers !== 0) process.exit(2);
  } else {
    console.log('[dry-run] 计划迁移 ' + plans.length + ' 行（总行数 ' + before + '）：');
    console.log(JSON.stringify(plans, null, 2));
    console.log('[dry-run] 未写盘。加 --apply 执行。');
    db.close();
  }
}

main();
```

- [ ] **Step 2: dry-run**

Run: `node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --dry-run`
Expected: 输出 14 条待迁移明细，**不写盘**，`git status` 不应出现 `yuanxingtu.db` 变更

- [ ] **Step 3: 【停服】告知用户后停后端**

**停服前必须先告知用户**（memory: `tsx-watch-not-reloading` + `running-server-overwrites-disk-edits`）。后端由后台任务 `bqwk5je65` 承载（`npm run dev --prefix server`），用 TaskStop 停掉。

- [ ] **Step 4: apply + 校验**

Run: `node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --apply`
Expected:
- 备份文件生成
- 输出「行数 14 → 14（一致）」「已迁移 14 行；残留非 SH 编码 0 行」
- 退出码 0

再只读复查：

```bash
cd server && node -e "
const Database=require('better-sqlite3');
const db=new Database('data/yuanxingtu.db',{readonly:true});
console.log(db.prepare('SELECT shift_type, plan_start, plan_end, COUNT(*) c FROM farm_task_schedules GROUP BY shift_type, plan_start, plan_end').all());
db.close();"
```
Expected: 唯一一行 `{ shift_type: 'SH001', plan_start: '06:00', plan_end: '14:00', c: 14 }`

- [ ] **Step 5: 重启后端**

用后台任务重新起 `npm run dev --prefix "D:/TMcrop/yuanxingtu/V1.1/server"`，确认无启动报错。

- [ ] **Step 6: 提交（只提交脚本，不提交 db/备份/报告）**

```bash
git add server/src/services/farmTaskScheduleService.ts server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs src/hooks/useFarmTaskSchedule.ts src/pages/farm/TaskSchedulePage.tsx
git commit -m "feat(schedule): 任务排班班次字典统一到 shifts 表，含数据迁移脚本"
```

**不要 `git add server/data/`**（运行时库 + 备份 + 报告都不入库）。

---

## Task 4: 修班组分配页断链 + URL 参数贯通

**Files:**
- Modify: `src/components/labor/team/TeamTable.tsx:94-102`（`handleBatchSchedule`）
- Modify: `src/pages/farm/TaskSchedulePage.tsx`（消费 `date` / `teamId` URL 参数 + 新增班组下拉）

**Interfaces:**
- Consumes: `useTeamManageStore` 的 `teams`（`Team` 含 `id` / `name` / `memberIds`）；URL `?tab=farm-task&date=YYYY-MM-DD&teamId=xxx`
- Produces: 班组分配页「为该班组批量排班」按钮 → 跳 `/schedule?tab=farm-task&teamId=<id>&date=<today>`，落地页预选该班组、预填该日期

- [ ] **Step 1: `TeamTable.tsx` 修跳转（顺带修 UTC bug）**

把第 94-102 行：

```tsx
  // ★ Task 15：跳到排班页 + 预填班组/日期/班次（url-deep-link-modal-pattern）
  const handleBatchSchedule = (team: Team) => {
    const today = new Date().toISOString().slice(0, 10);
    navigate(
      `/schedule?teamId=${encodeURIComponent(team.id)}` +
        `&prefillDate=${today}` +
        `&prefillShift=${encodeURIComponent('早班')}`,
    );
  };
```

改为：

```tsx
  /**
   * 跳到「排班调度 → 任务排班」Tab，并预填班组 + 日期。
   *
   * 2026-10-20 修复：
   *  1. 原实现跳 /schedule?teamId=..&prefillDate=..&prefillShift=..，但排班调度页
   *     只读 teamId —— prefillDate / prefillShift 无人消费，预填形同虚设。
   *     现改为跳 /schedule?tab=farm-task&teamId=..&date=..，由任务排班 Tab 真正消费。
   *  2. 原用 new Date().toISOString().slice(0,10) 取当天 —— UTC，中国 0-8 点会算出昨天。
   *     改用 todayLocal()（memory: utc-timezone-id-bug）。
   */
  const handleBatchSchedule = (team: Team) => {
    const today = todayLocal();
    navigate(
      `/schedule?tab=farm-task&teamId=${encodeURIComponent(team.id)}&date=${today}`,
    );
  };
```

补 import（检查文件顶部，`src/lib/dateUtils` 的 `todayLocal`）：

```tsx
import { todayLocal } from '@/lib/dateUtils';
```

- [ ] **Step 2: `TaskSchedulePage.tsx` 消费 URL 参数**

顶部加：

```tsx
import { useSearchParams } from 'react-router-dom';
```

在组件内（`useFarmTaskSchedule` 调用附近）：

```tsx
  // URL 参数：date（初始日期）/ teamId（预选班组），由班组分配页跳转带进来
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  const urlTeamId = searchParams.get('teamId');
```

把 `useState(todayLocal())` 改为：

```tsx
  const [date, setDate] = useState(urlDate || todayLocal());
```

- [ ] **Step 3: 新增班组下拉 + 执行人按班组过滤**

在「新增排班」表单的网格里加一格「班组」（放在「执行人」上方）：

```tsx
                <div>
                  <Label className="text-xs text-gray-600">班组</Label>
                  <Select
                    value={form.teamId || '__none__'}
                    onValueChange={(v) => {
                      const id = v === '__none__' ? '' : v;
                      const t = teams.find((x) => x.id === id);
                      setForm((f) => ({
                        ...f,
                        teamId: id,
                        teamName: t?.name || '',
                        // 切班组时清掉执行人（人可能不属于新班组）
                        workerId: '',
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择班组（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不指定班组</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
```

`form` 初始值加两个字段：

```tsx
  const [form, setForm] = useState({
    workerId: '',
    teamId: '',
    teamName: '',
    planStart: '08:00',
    planEnd: '12:00',
    shiftType: '',
    remarks: '',
  });
```

班组数据源（组件内）：

```tsx
  // 班组列表（来源：班组分配页同一 Store）
  const teams = useTeamManageStore((s) => s.teams);
  const fetchTeamData = useTeamManageStore((s) => s.fetchData);

  useEffect(() => {
    if (teams.length === 0) void fetchTeamData();
  }, [teams.length, fetchTeamData]);
```

import：

```tsx
import { useTeamManageStore } from '../../stores/useTeamManageStore';
```

> ⚠️ 已核实：`useTeamManageStore` 的加载 action 名是 **`fetchData`**（`src/stores/useTeamManageStore.ts:188`），**不是** `loadTeams`。该 action 内部有模块级 in-flight Promise 锁（`:218`），并发调用安全。

- [ ] **Step 4: 执行人下拉按所选班组过滤**

把「执行人」那格的 Select 内容改为：

```tsx
                    <SelectContent>
                      <SelectItem value="__none__">选择执行人</SelectItem>
                      {workerOptions.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
```

并在组件内派生 `workerOptions`：

```tsx
  // 选了班组就只列该班组成员；没选班组列全部
  const workerOptions = useMemo(() => {
    if (!form.teamId) return workers;
    const team = teams.find((t) => t.id === form.teamId);
    if (!team) return workers;
    const memberIds = new Set(team.memberIds || []);
    return workers.filter((w) => memberIds.has(w.id));
  }, [workers, teams, form.teamId]);
```

- [ ] **Step 5: URL 带 teamId 时预选班组**

在 `useEffect` 里（URL 参数 effect）：

```tsx
  // 从 URL 预选班组（班组分配页跳转过来）
  useEffect(() => {
    if (!urlTeamId) return;
    const t = teams.find((x) => x.id === urlTeamId);
    if (!t) return;
    setForm((f) => (f.teamId === t.id ? f : { ...f, teamId: t.id, teamName: t.name }));
  }, [urlTeamId, teams]);
```

- [ ] **Step 6: 保存时带上 teamId / teamName**

`handleCreate` 里的 `createSchedule({...})` 加两个字段：

```tsx
        taskId: selectedTask.id,
        workerId: form.workerId,
        workerName: worker?.name || '',
        teamId: form.teamId || null,
        teamName: form.teamName || null,
```

- [ ] **Step 7: 类型检查 + 提交**

```bash
npx tsc -p tsconfig.app.json --noEmit
git add src/components/labor/team/TeamTable.tsx src/pages/farm/TaskSchedulePage.tsx
git commit -m "fix(schedule): 修班组分配页批量排班断链，任务排班支持班组维度"
```

---

## Task 5: 整体回归（4 条链路）

**Files:** 无代码改动，浏览器实测。

- [ ] **Step 1: 启动前后端**

后端已在 Task 3 Step 5 启动。前端 `npm run dev`（端口 5188）。用 gstack `$B`（Windows 无 Aside，走 headless fallback）打开 `http://localhost:5188`。

- [ ] **Step 2: 链路 A — 排班调度 Tab 化**

- 侧边栏「农事管理」应只有 **5 项**：农事任务中心 / 智能任务中心 / **排班调度** / 班组分配 / 每日工单汇总
- 点「排班调度」→ 默认「考勤排班」Tab，日历/表格/签到/调班/班次设置**全部照常**
- 切到「任务排班」Tab → 显示待排班任务 / 新增排班 / 当日排班
- 切回「考勤排班」→ 之前的筛选状态还在（面板未卸载）
- **控制台无错误**（`$B console --errors`）

- [ ] **Step 3: 链路 B — 班次字典**

- 任务排班 Tab 的班次下拉应显示 **早班（06:00-14:00）/ 中班（14:00-22:00）/ 晚班（22:00-06:00）** 三项（不是 白班/夜班/早班/午班）
- 选「中班」→ 开始时间自动变 14:00、结束时间自动变 22:00
- 当日排班列表里已排的 14 条显示 **早班** 徽标

- [ ] **Step 4: 链路 C — 班组分配 → 任务排班 贯通**

- 「班组分配」页某个班组行点日历图标 → 跳到 `/schedule?tab=farm-task&teamId=xxx&date=<今天>`
- 任务排班 Tab 打开，**班组已预选**、日期已是今天
- 执行人下拉**只列该班组成员**
- 选执行人 + 班次 + 保存 → 「当日排班」出现新记录，班次显示中文名
- **刷新页面后记录仍在**（已落盘，验证 `saveDatabase()` 生效）

- [ ] **Step 5: 链路 D — 农事任务中心不回归**

- `/farm-hub` 打开，任务列表正常，「选择执行人」「重新派发」「批量分配」三个按钮都能打开
- 「批量分配」弹窗提交后，任务排班 Tab 的「当日排班」能看到新记录（`/farm-task-schedules/batch-assign` 路径未被合并破坏）

- [ ] **Step 6: 冲突规则复测**

- 同一执行人同一天再排一条 → 弹「该执行人在同日已有排班」（409）

- [ ] **Step 7: 提交（如有修复）**

```bash
git add -A src/ server/src/
git commit -m "fix(schedule): 任务排班并入排班调度回归修复"
```

---

## 不在本批次范围（明确排除）

1. **派工 → 排班自动联动**：农事任务中心派工成功后自动落一条 `farm_task_schedules`（用户已批准列为 Step 5，单独一批）。当前仍需手动排班。
2. **数据层彻底合并**：废弃 `farm_task_schedules`，任务排班改写成 `schedules` 的结构化关联。工作量大、风险高，等 UI 合并跑顺再评估。
3. **`farm_task_schedules.status` 与 `farm_tasks` 状态机联动**：目前恒为 `'scheduled'`。
4. **`worker_name` 乱码脏数据**：6 行 `NS20260316-001` 的 `worker_name` 是 U+FFFD×4，属种子数据写入损坏，修复需授权。
5. **「排班调度」页面名**：合并后它同时管考勤排班和任务排班，但**不改名**（用户已明确要求保持该名称）。
