# 排班调度与智能派工双向联动 — 设计规格

**日期**：2026-07-29
**范围**：V1.1 农事管理模块
**入口页面**：智能任务中心（`/task-center`）的智能派工 Tab
**出口页面**：排班调度（`/schedule`）

---

## 1. 背景与目标

### 1.1 当前痛点

- 排班数据（schedule_records）与任务派发数据（farm_tasks / temp_tasks）相互独立
- 智能派工算法（`useComprehensiveDispatch.getRecommendations`）不知道员工当天是否在岗
- 主管排班后无法直观看到"该员工当天已派了几个任务"
- 派发冲突只能事后发现（员工拒绝接受时才知道他今天没排班）

### 1.2 目标

建立**双向闭环**：
- **派发侧**：智能派工时能看到员工当日排班状态，未排班员工置信度扣分 + 软警告二次确认
- **排班侧**：日历单元格显示员工当日已派任务数（角标 + 悬浮卡）
- **同步机制**：派发成功后自动同步 schedule_records.dispatched_task_ids

### 1.3 非目标（明确不做）

- ❌ WebSocket 实时推送
- ❌ 智能排班助手（自动生成排班建议）
- ❌ 自动重派（取消排班后）
- ❌ 历史排班分析报表
- ❌ 移动端响应式优化
- ❌ 国际化文案

---

## 2. 架构与组件结构

### 2.1 后端新增

```
server/src/
├── db/
│   ├── schema.ts                       # 修改 - 新增 dispatched_task_ids 字段
│   └── fixMissingSchema.ts             # 修改 - ALTER TABLE schedule_records ADD COLUMN
└── routes/
    └── dispatchOccupations.route.ts    # 新增 - 2 个 endpoint
```

### 2.2 接口契约

#### `GET /api/dispatch/occupations?date=YYYY-MM-DD`

**Query 参数**：
- `date`：必填，YYYY-MM-DD 格式

**Response**（200）：
```json
{
  "success": true,
  "data": {
    "date": "2026-07-29",
    "workers": [
      {
        "workerId": "S001",
        "workerName": "郭靖",
        "workZone": "A区",
        "scheduleStatus": "on_duty",
        "shift": "早班",
        "assignedTaskCount": 3,
        "totalAssignedHours": 6.5,
        "tasks": [
          {
            "taskId": "FT-001",
            "source": "farm",
            "taskCode": "NS20260729-001",
            "title": "温室A-番茄灌溉",
            "priority": "high",
            "status": "pending"
          }
        ]
      }
    ]
  }
}
```

**错误响应**：
- 400：date 参数格式错误
- 500：数据库异常

#### `PATCH /api/dispatch/schedule-records/dispatch`

**Body**：
```json
{
  "workerId": "S001",
  "taskId": "FT-001",
  "action": "add"
}
```

**Response**（200）：
```json
{ "success": true }
```

**特殊响应**（200 + warning）：
```json
{
  "success": true,
  "warning": "员工当日无排班记录，未写入 dispatched_task_ids"
}
```

**错误响应**：
- 400：参数缺失或 action 非法
- 500：数据库异常

### 2.3 前端新增/扩展

```
src/
├── hooks/
│   ├── useDispatchActions.ts           # 修改 - confirmDispatch 末尾同步 schedule
│   ├── useComprehensiveDispatch.ts     # 修改 - getRecommendations 加 scheduleStatus 字段
│   └── useDispatchOccupations.ts       # 新增 - 包装 GET 接口
├── stores/
│   └── scheduleStore.ts                # 扩展 - occupations state + 3 actions
└── components/
    ├── dispatch/
    │   ├── AIRecommendationPanel.tsx   # 修改 - 警告条 + 软警告触发
    │   └── ScheduleConflictWarning.tsx # 新增 - 软警告弹窗
    └── labor/schedule/
        ├── ScheduleCalendar.tsx        # 修改 - 单元格角标 + 悬浮
        └── OccupationHoverCard.tsx     # 新增 - 悬浮任务清单
```

### 2.4 数据流图

```
┌─────────────────────────────────────────────┐
│ 智能任务中心 (/task-center) → 智能派工 Tab    │
│   SmartDispatchPage                         │
│   └─ useComprehensiveDispatch                │
│      └─ getRecommendations(task)             │
│         └─ for each worker:                  │
│            ├─ calculateSkillMatch()          │
│            ├─ calculateLocationScore()       │
│            └─ ★ getWorkerScheduleStatus()    │
│                 └─ scheduleStore 缓存查/拉   │
│                                              │
│   └─ UI 渲染 → 警告条（if off_duty）        │
│   └─ [派发]点击 → 软警告弹窗（if off_duty） │
│      └─ [确认] → confirmDispatch +          │
│                   PATCH schedule-records    │
│                   + invalidateOccupations   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 排班调度 (/schedule) → ScheduleCalendar      │
│   └─ mount → fetchOccupations(selectedDate)  │
│   └─ 渲染单元格                              │
│      ├─ 角标 = assignedTaskCount              │
│      └─ hover → OccupationHoverCard          │
└─────────────────────────────────────────────┘
```

---

## 3. 数据流时序与 Zustand action 签名

### 3.1 派发侧时序

```
[1] getRecommendations(task)
    └─ for worker in workers:
       ├─ 原有 7 因子计算
       └─ ★ getWorkerScheduleStatus(workerId, task.dueDate || today)
          ├─ 查 store.occupations[date] 缓存
          └─ miss → GET /api/dispatch/occupations

[2] UI 渲染 WorkerRecommendation 卡片
    └─ if scheduleStatus === 'off_duty':
       └─ 红色警告条 + 文字

[3] [派发]点击
    └─ if scheduleStatus === 'off_duty' OR assignedTaskCount >= 3:
       └─ ScheduleConflictWarning 弹窗
          ├─ [取消] → return
          └─ [确认] → continue
    └─ else: 直接 confirmDispatch

[4] confirmDispatch(taskId, workerId, workerName)
    ├─ POST /api/farm-tasks/:id/dispatch
    └─ ★ PATCH /api/dispatch/schedule-records/dispatch
       Body: { workerId, taskId, action: 'add' }
    └─ scheduleStore.invalidateOccupations(today)
    └─ 重新拉取 occupations
```

### 3.2 排班侧时序

```
[1] SchedulePage mount → useSchedule()
    ├─ fetchSchedules()                         // 已有
    └─ ★ fetchOccupations(selectedDate)         // 新增

[2] ScheduleCalendar 渲染
    └─ for cell in (staffList × weekDateRange):
       ├─ cell.taskCountBadge = occupations.find(w => w.workerId === cell.staffId)?.assignedTaskCount ?? 0
       ├─ if taskCountBadge > 0 → 红色角标
       └─ hover → OccupationHoverCard

[3] 切换日期/视图
    └─ useEffect([selectedDate, viewMode]) → fetchOccupations(newDate)
```

### 3.3 Zustand 扩展签名

```typescript
// scheduleStore 新增 state
interface ScheduleOccupation {
  workerId: string;
  workerName: string;
  workZone: string;
  scheduleStatus: 'on_duty' | 'off_duty' | 'no_schedule';
  shift: string;
  assignedTaskCount: number;
  totalAssignedHours: number;
  tasks: Array<{
    taskId: string;
    source: 'farm' | 'tempTask';
    taskCode: string;
    title: string;
    priority: string;
    status: string;
  }>;
}

interface ScheduleStoreExtension {
  occupations: Record<string, ScheduleOccupation[]>;  // date → workers[]
  occupationsLoading: boolean;
  occupationsError: string | null;
  lastFetchedAt: Record<string, number>;  // date → timestamp（5min TTL）

  fetchOccupations: (date: string) => Promise<void>;
  getWorkerScheduleStatus: (
    workerId: string,
    date: string
  ) => { status: 'on_duty' | 'off_duty' | 'no_schedule'; assignedTaskCount: number };
  invalidateOccupations: (date: string) => void;
}
```

### 3.4 useDispatchOccupations Hook

```typescript
export function useDispatchOccupations(date: string) {
  const occupations = useScheduleStore(s => s.occupations[date] ?? []);
  const loading = useScheduleStore(s => s.occupationsLoading);
  const error = useScheduleStore(s => s.occupationsError);
  const fetchOccupations = useScheduleStore(s => s.fetchOccupations);

  useEffect(() => {
    fetchOccupations(date);
  }, [date]);

  return { occupations, loading, error, refetch: () => fetchOccupations(date) };
}
```

### 3.5 getRecommendations 加权逻辑

```typescript
// useComprehensiveDispatch.getRecommendations 内
const scheduleStatusInfo = scheduleStore.getWorkerScheduleStatus(
  worker.id,
  task.dueDate || today
);

const adjustedScore = scheduleStatusInfo.status === 'off_duty'
  ? Math.max(0, matchScore - 20)
  : matchScore;

return {
  ...rec,
  matchScore: adjustedScore,
  scheduleStatus: scheduleStatusInfo.status,
  assignedTaskCount: scheduleStatusInfo.assignedTaskCount,
};
```

---

## 4. 后端实现细节

### 4.1 数据库 Schema 变更

**目标表**：`schedule_records`

**新增字段**：
```sql
ALTER TABLE schedule_records ADD COLUMN dispatched_task_ids TEXT DEFAULT '[]';
```

**同步更新**：
- `server/src/db/schema.ts`：CREATE TABLE 语句补充字段
- `server/src/db/fixMissingSchema.ts`：追加到 `*ColumnsToAdd` 数组

**幂等保证**：`fixMissingSchema` 用 try/catch 吞 `duplicate column` 错误

### 4.2 新路由 `/api/dispatch/occupations`

文件：`server/src/routes/dispatchOccupations.route.ts`

**核心逻辑**：
1. 查当日 schedule_records（按 staff_id 分组）
2. 查当日 farm_tasks + temp_tasks（status IN pending/accepted/in_progress）
3. 合并：
   - 有排班行 → `scheduleStatus: on_duty | off_duty`（按排班 status 映射）
   - 无排班但有任务 → `scheduleStatus: no_schedule`
   - 任务列表从 dispatched_task_ids 解析 + 兜底从 farm_tasks/temp_tasks 实时聚合
4. 返回 `{date, workers[]}`

**PATCH endpoint**：
- 找当日该员工 schedule 行
- 找到 → 合并 dispatched_task_ids 数组（add/remove）
- 找不到 → 返回 200 + warning（不自动创建，避免数据噪音）

### 4.3 派发流程回调点

**改 `useDispatchActions.confirmDispatch`**：
```typescript
const confirmDispatch = async (task, workerId, workerName) => {
  // 1. 原有派发
  await api.confirmDispatch(task, workerId, workerName);

  // 2. ★ 同步 schedule
  await fetch('/api/dispatch/schedule-records/dispatch', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workerId,
      taskId: task.sourceId,
      action: 'add',
    }),
  });

  // 3. ★ 清缓存
  scheduleStore.invalidateOccupations(today);
};
```

### 4.4 边界处理

| 场景 | 处理 |
|---|---|
| 当日无 schedule 行 | 返回 `scheduleStatus: 'no_schedule'`，派发侧显示"无排班"警告 |
| 员工 ID 不在 staff 表 | 用 task.assignee_name 模糊匹配 schedule.staff_name |
| 任务跨天 | 仅按 plan_start 当日计入 |
| 任务已取消/已完成 | SQL WHERE 过滤 |
| dispatched_task_ids 损坏 | try/catch 兜底为 `[]` |

---

## 5. 前端组件实现

### 5.1 新组件 `ScheduleConflictWarning.tsx`

复用统一 Modal（size="sm"），与项目内所有警告弹窗风格一致：
- 标题：橙色 AlertTriangle 图标 + "排班冲突警告"
- 内容：员工姓名 + 状态描述 + 当前已派任务列表（最多 5 条）
- 按钮：[取消] [确认派发（橙色）]

### 5.2 扩展 `AIRecommendationPanel.tsx`

**改动 1**：WorkerRecommendation 卡片顶部条件渲染警告条
- off_duty → 红色背景 + AlertCircle 图标
- no_schedule → 琥珀色背景

**改动 2**：[派发] 按钮点击前判断
```tsx
if (rec.scheduleStatus === 'off_duty' || rec.assignedTaskCount >= 3) {
  setShowWarning(true);
} else {
  onDispatch(rec);
}
```

### 5.3 扩展 `ScheduleCalendar.tsx`

单元格组件内部：
- 右下角角标（红色圆形，min-w 18px）
- group-hover 显示悬浮卡
- 位置：absolute bottom-1 right-1

### 5.4 新组件 `OccupationHoverCard.tsx`

展示内容：
- 标题：{workerName} · {shift}
- 工时进度条：totalAssignedHours / 8h
  - > 8h → 红色
  - > 6h → 琥珀色
  - 否则 → 绿色
- 任务列表（最多 5 条，超出折叠）
- 底部：查看全部 N 个任务（点击穿透）

---

## 6. 测试策略

### 6.1 单元测试（vitest）

| 测试文件 | 覆盖点 |
|---|---|
| `useDispatchOccupations.test.ts` | hook fetch + refetch |
| `ScheduleConflictWarning.test.tsx` | 弹窗交互（取消/确认） |
| `OccupationHoverCard.test.tsx` | 工时条颜色阈值 |
| `scheduleStore.occupations.test.ts` | 缓存命中/失效/TTL |

### 6.2 集成测试（手动浏览器 E2E）

| 场景 | 期望 |
|---|---|
| **未排班员工派发** | 卡片红条 + 软警告弹窗 + 取消不派 |
| **软警告确认派发** | 派发成功 + schedule 同步 + toast |
| **排班角标显示** | 单元格右下角红色数字 |
| **悬浮卡显示** | hover 显示任务列表 + 工时条 |
| **切日期刷新** | 旧角标消失，新日期按需 fetch |
| **多任务占用** | 角标累加 + 工时条变红 |
| **置信度扣分** | 未排班员工综合分数 -20 |

### 6.3 验收标准

#### 功能
- [ ] 后端 2 个 endpoint 实现 + 数据库 migration 幂等
- [ ] WorkerRecommendation 卡片显示 scheduleStatus 警告条
- [ ] 软警告弹窗二次确认流程正常
- [ ] 派发成功后 schedule 自动追加任务 ID
- [ ] 排班日历单元格角标正确显示
- [ ] hover 悬浮卡显示任务列表 + 工时
- [ ] 未排班员工置信度扣 20 分生效
- [ ] 跨日期切视图重新拉取

#### 性能
- [ ] `/api/dispatch/occupations` 响应时间 < 200ms
- [ ] scheduleStore 缓存命中时不发请求
- [ ] 日历首屏（200 单元格）< 500ms

#### 质量
- [ ] `npx tsc --noEmit` 无错误
- [ ] ESLint 无 error
- [ ] 测试覆盖率 ≥ 80%
- [ ] 7 个 E2E 场景全部通过
- [ ] 不引入 WebSocket
- [ ] 不修改现有数据/接口契约

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| dispatched_task_ids 为 NULL（旧数据） | 接口崩溃 | 默认值 `'[]'` + parse 失败兜底 |
| 已派任务但 assignee_id 已清空 | 占用数据缺失 | WHERE 过滤 + 前端 fallback 模糊匹配 |
| 排班首屏慢 | 卡顿 | useMemo 缓存 + 按需 fetch |
| 并发派发冲突 | 写冲突 | 后端 JSON 合并（数组 Set 去重） |
| 跨天任务不准 | 统计偏差 | 仅按 plan_start 当日计入（决策已记录） |

---

## 8. 工作量估算

| 模块 | 工作量 |
|---|---|
| 后端 schema 扩展 | 0.5 天 |
| 后端 routes（2 endpoint） | 1 天 |
| 前端 scheduleStore 扩展 | 0.5 天 |
| 前端 useDispatchOccupations hook | 0.5 天 |
| 前端 useComprehensiveDispatch 扩展 | 0.5 天 |
| 前端 ScheduleConflictWarning 组件 | 0.5 天 |
| 前端 AIRecommendationPanel 改警告条 | 0.5 天 |
| 前端 ScheduleCalendar 角标 + 悬浮 | 0.5 天 |
| 前端 OccupationHoverCard 组件 | 0.5 天 |
| 测试（单测 + E2E 7 场景） | 1 天 |
| **合计** | **5-6 天** |

---

## 9. 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 联动入口 | 智能任务中心→智能派工 | 用户明确指定 |
| 联动出口 | /schedule | 唯一排班入口 |
| 冲突处理 | 软警告 | 兼顾效率与合规 |
| 数据流 | 客户端聚合 + 后端兜底 | V2.1 架构约束 |
| 后端改动 | 加聚合接口 + 加 1 字段 | 用户选择方案 B |
| 实时推送 | 不做 | 保持 V2.1 无 WebSocket |
| 缓存策略 | 5min TTL + invalidate | 平衡性能与一致性 |
| 跨天任务 | 按 plan_start 当日 | 简化边界 |
| 无排班记录 | 自动创建？ | **不创建**（避免噪音） |