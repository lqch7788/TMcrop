# 农业管理系统 - 任务执行闭环详细设计方案（原型演示版）

生成时间: 2026/04/16
分支: planting-management
**重要说明**: 本版本为原型演示版，无真实数据库，所有数据使用 localStorage 暂存模拟

---

## 一、原型演示特别说明

### 1.1 数据暂存方案

由于是原型演示，数据流转全部在前端模拟：

| 数据层 | 存储方式 | 说明 |
|-------|---------|------|
| 任务数据 (Task) | localStorage | useTasks hook 管理 |
| 操作记录 (TaskOperationRecord) | localStorage | useTasks._operations 管理 |
| 工单数据 (WorkLogEntry) | localStorage | usePersistentWorkLogs 管理 |
| 考勤数据 (AttendanceEntry) | localStorage | usePersistentAttendance 管理 |
| 演示初始化数据 | mockData.ts | 预置各种状态的演示数据 |

### 1.2 演示数据要求

原型演示需要覆盖以下场景：

| 状态 | 演示场景 | 数量建议 |
|------|---------|---------|
| pending（待接受） | 新派发的任务，等待执行人接受 | 2-3条 |
| accepted（已接受） | 执行人已接受，等待开始执行 | 1-2条 |
| in_progress（进行中） | 执行人正在处理，进度 30%-80% | 2-3条 |
| waiting_acceptance（待验收） | 执行人提交完成，等待派发人验收 | 1-2条 |
| completed（已完成） | 派发人验收通过，任务关闭 | 3-5条 |
| rejected（已驳回） | 派发人驳回，执行人需要返工 | 1条 |

### 1.3 数据重置能力

演示环境需要支持数据重置：
- **一键重置**：恢复初始演示数据
- **状态刷新**：在不刷新页面的情况下更新数据状态

---

## 二、现状问题总结

### 2.1 数据流断点

```
农事任务派发 ──┐
               ├──→ 任务中心（执行）──→ 每日工单汇总
TaskDispatchPage    MyTasksPage        DailyWorkSummary
     │                  │                    │
     │ mockTasks        │ useTasks           │ useDailyWorkSummary
     │ (本地状态)       │ (localStorage)      │
     │                  │                    │
     └──────────────────┴────────────────────┘
              问题：两套数据模型 + 未打通
```

### 2.2 当前问题清单

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | TaskDispatchPage 用 mockTasks（内存），TasksPage 用 useTasks（localStorage） | 两套数据源 | 派发任务后执行页面看不到 |
| 2 | 任务派发表格缺少操作列 | TaskDispatchPage | 无法直接操作单个任务 |
| 3 | DailyWorkSummary 工时计算 BUG | useDailyWorkSummary.ts:45 | `a.worker` 字段不存在 |
| 4 | 任务与工单未自动同步 | useTasks.updateTaskProgress | 进度提交后工单没数据 |
| 5 | 缺少派发人验收流程 | MyTasksPage | 执行人提交后无人验收 |
| 6 | DailyWorkSummary 字段硬编码 | useDailyWorkSummary.ts | plannedArea/completedArea/workerCount/status 都是 0 或固定值 |

---

## 三、目标：三层闭环

```
┌─────────────────────────────────────────────────────────────────────┐
│                    农事任务派发 (创建任务)                             │
│                                                                     │
│  任务信息 ──► 选择执行人 ──► 设置时间/要求 ──► 确认派发              │
│                                                                     │
│  数据输出：Task (status: pending, sourceType: 'dispatch')           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    任务中心 (执行任务)                                │
│                                                                     │
│  ┌─ 派发人视角 ─────────────────────────────────────────────────┐  │
│  │  任务列表 ──► 查看详情 ──► 验收通过/驳回                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 执行人视角 ─────────────────────────────────────────────────┐  │
│  │  我的任务 ──► 接受 ──► 提交进度 ──► 待验收                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  数据输出：TaskOperationRecord + WorkLogEntry + AttendanceEntry       │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    每日工单汇总 (统计)                               │
│                                                                     │
│  按日期聚合 ──► 按部门/组/个人筛选 ──► 导出报表                     │
│                                                                     │
│  数据来源：WorkLogEntry + AttendanceEntry + Task                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、详细流程设计（演示版）

### 4.1 任务派发流程

```
农事任务派发 ────────────────────────────────────────────────────────
     │                                                              │
     ▼                                                              │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  任务信息   │    │  执行人员   │    │  时间要求   │              │
│             │    │             │    │             │              │
│ • 任务编号 │    │ • 执行人   │    │ • 开始时间  │              │
│ • 任务类型 │    │ • 期望完成 │    │ • 结束时间  │              │
│ • 作业区域 │    │ • 部门     │    │ • 优先级   │              │
│ • 作物     │    └─────────────┘    │ • 必填反馈 │              │
│ • 任务描述 │                          └─────────────┘              │
│ • SOP标准  │                                                     │
└─────────────┘                                                     │
                                                                     │
                    ┌─────────────────────────────┐                  │
                    │      确认派发              │                  │
                    │  ────────────────────────  │                  │
                    │  执行人: 张三               │                  │
                    │  期望完成: 2026-04-20       │                  │
                    │  必填反馈: GPS、照片、扫码  │                  │
                    │                             │                  │
                    │  [取消]  [确认派发]        │                  │
                    └─────────────────────────────┘                  │
                                                                     │
                              │                                       │
                              ▼                                       │
                    ┌─────────────────┐                             │
                    │ 创建 Task 记录   │                             │
                    │ status: pending  │                             │
                    │ + 演示数据更新   │                             │
                    └─────────────────┘                             │
```

**演示数据状态变化**：
- 新建任务 → status: `pending`
- 派发任务 → status: `accepted` + 创建 AttendanceEntry

### 4.2 任务接受流程

```
任务中心 ──────────────────────────────────────────────────────────
     │                                                              │
     ▼                                                              │
┌─────────────────────────────────────────────────────────────┐     │
│                     任务列表表格                               │     │
│                                                             │     │
│  任务编号 │ 执行人 │ 状态 │ 操作                          │     │
│  ────────────────────────────────────────────────────────  │     │
│  NT20260416-001 │ 张三 │ 待接受 │ [接受] [查看]           │     │
│  NT20260416-002 │ 李四 │ 进行中 │ [查看] [验收]           │     │
│  NT20260416-003 │ 王五 │ 待验收 │ [查看] [验收]           │     │
│                                                             │     │
└─────────────────────────────────────────────────────────────┘     │
                                                                     │
                    ┌─────────────────────────────┐                  │
                    │      任务详情弹窗           │                  │
                    │  ────────────────────────  │                  │
                    │  任务编号: NT20260416-001  │                  │
                    │  执行人: 张三              │                  │
                    │  派发人: 王主管            │                  │
                    │  状态: 待接受              │                  │
                    │  期望完成: 2026-04-20      │                  │
                    │                             │                  │
                    │  流转记录:                 │                  │
                    │  ● 2026-04-16 10:00 王主管派发任务    │     │
                    │                             │                  │
                    │  [取消]  [接受任务]        │                  │
                    └─────────────────────────────┘                  │
```

### 4.3 提交进度流程

```
执行人视角 ────────────────────────────────────────────────────────
     │                                                              │
     ▼                                                              │
┌─────────────────────────────────────────────────────────────┐     │
│                     我的任务列表                               │     │
│                                                             │     │
│  任务编号 │ 任务名称 │ 状态   │ 操作                       │     │
│  ────────────────────────────────────────────────────────  │     │
│  NT20260416-001 │ 施肥任务 │ 进行中 │ [提交进度]          │     │
│                                                             │     │
└─────────────────────────────────────────────────────────────┘     │
                                                                     │
                    ┌─────────────────────────────────┐              │
                    │        提交进度反馈弹窗           │              │
                    │  ─────────────────────────────  │              │
                    │  任务: 施肥任务 (NT20260416-001) │              │
                    │  执行人: 张三                    │              │
                    │  当前进度: ████████░░ 80%       │              │
                    │                                 │              │
                    │  ┌─ 必填反馈 ─────────────────┐ │              │
                    │  │ [√] GPS位置打卡  [位置图] │ │              │
                    │  │ [√] 作业前照片  [上传]    │ │              │
                    │  │ [√] 作业后照片  [上传]    │ │              │
                    │  └────────────────────────────┘ │              │
                    │                                 │              │
                    │  进展情况:                      │              │
                    │  ┌───────────────────────────┐ │              │
                    │  │ 已完成1号棚施肥，2号棚    │ │              │
                    │  │ 还有3号棚未完成...         │ │              │
                    │  └───────────────────────────┘ │              │
                    │                                 │              │
                    │  进度: [━━━━━━░░░░] 80%       │              │
                    │                                 │              │
                    │  [取消]  [提交进度]            │              │
                    └─────────────────────────────────┘              │
```

**演示数据变化**：
- 提交进度 → Task.progress 更新 + WorkLogEntry 同步
- 进度 100% → status: `waiting_acceptance`

### 4.4 验收流程

```
派发人视角 ────────────────────────────────────────────────────────
     │                                                              │
     ▼                                                              │
┌─────────────────────────────────────────────────────────────┐     │
│  待验收任务列表                                                │     │
│                                                             │     │
│  任务编号 │ 执行人 │ 提交时间 │ 操作                       │     │
│  ────────────────────────────────────────────────────────  │     │
│  NT20260416-001 │ 张三 │ 04-16 14:00 │ [验收] [驳回]     │     │
│                                                             │     │
└─────────────────────────────────────────────────────────────┘     │
                                                                     │
                    ┌─────────────────────────────────┐              │
                    │        验收确认弹窗             │              │
                    │  ─────────────────────────────  │              │
                    │  任务: 施肥任务 (NT20260416-001) │              │
                    │  执行人: 张三                    │              │
                    │  提交时间: 2026-04-16 14:00     │              │
                    │                                 │              │
                    │  执行结果:                       │              │
                    │  ┌───────────────────────────┐ │              │
                    │  │ 本次施肥已完成，请验收     │ │              │
                    │  └───────────────────────────┘ │              │
                    │                                 │              │
                    │  实际工时: 6.5 小时            │              │
                    │                                 │              │
                    │  [驳回]          [验收通过]    │              │
                    └─────────────────────────────────┘              │
```

**演示数据变化**：
- 验收通过 → status: `completed` + WorkLogEntry 标记完成
- 驳回 → status: `rejected` → `in_progress` + reworkCount++

### 4.5 每日工单汇总

```
每日工单汇总──────────────────────────────────────────────────────
     │                                                              │
     ▼                                                              │
┌─────────────────────────────────────────────────────────────┐     │
│  统计卡片                                                       │     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │     │
│  │ 工单总数│ │ 已作业 │ │ 进行中 │ │ 总工时 │                │     │
│  │   25   │ │   18   │ │   7    │ │ 156.5h │                │     │
│  └────────┘ └────────┘ └────────┘ └────────┘                │     │
└─────────────────────────────────────────────────────────────┘     │
                                                                     │
┌─────────────────────────────────────────────────────────────┐     │
│  筛选工具栏                                                    │     │
│  日期: [2026-04-16 ▼]  温室: [全部 ▼]  作业类型: [全部 ▼]   │     │
│                                                             │     │
│  [☑]  仅显示任务完成  [☑]  仅显示临时任务                     │     │
└─────────────────────────────────────────────────────────────┘     │
                                                                     │
┌─────────────────────────────────────────────────────────────┐     │
│  数据表格                                                       │     │
│                                                             │     │
│  日期   │ 任务编号 │ 温室 │ 作物 │ 作业内容 │ 工时 │ 状态   │     │
│  ────────────────────────────────────────────────────────  │     │
│  04-16 │ NT20260..│ 1号棚│ 番茄 │ 施肥      │ 6.5h │ 已完成 │     │
│  04-16 │ NT20260..│ 2号棚│ 黄瓜 │ 灌溉      │ 3.0h │ 进行中 │     │
│  04-16 │ ──────── │ ─── │ ─── │ 临时任务1 │ 4.0h │ 已完成 │     │
│                                                             │     │
└─────────────────────────────────────────────────────────────┘     │
```

---

## 五、数据模型设计（localStorage 存储）

### 5.1 Task 模型（演示版）

```typescript
// src/hooks/useTasks.ts
export interface Task {
  id: string;                    // TASK_时间戳_随机
  taskCode: string;              // NT+日期+序号

  // 任务定义
  title: string;                 // 任务标题
  type: string;                  // 任务类型值
  typeName: string;              // 任务类型名称
  description: string;           // 任务描述
  sopContent: string;            // SOP作业标准

  // 资源
  greenhouseId: string;          // 温室ID
  greenhouseName: string;        // 温室名称
  cropName: string;              // 作物名称
  materials: { name: string; qty: number; unit: string }[];
  tools: { name: string; qty: number; unit: string }[];

  // 优先级
  priority: 'normal' | 'high' | 'urgent';

  // 人员
  assigneeId: string;            // 执行人ID
  assigneeName: string;          // 执行人名称
  assignerId: string;           // 派发人ID
  assignerName: string;          // 派发人名称

  // 时间
  planStartDate: string;        // 计划开始日期
  planEndDate: string;          // 计划结束日期
  dueDate: string;              // 截止日期
  expectedCompletion?: string;    // 期望完成时间
  actualStartTime?: string;     // 实际开始时间
  actualEndTime?: string;       // 实际结束时间
  workDuration?: number;         // 工作时长（分钟）

  // 进度
  progress: number;              // 0-100
  status: TaskStatus;

  // 来源追溯
  sourceType: 'dispatch' | 'tempTask' | 'inspection';
  sourceId?: string;
  sourceCode?: string;

  // 反馈要求
  requiredFeedback: ('gps' | 'photo_before' | 'photo_after' | 'material_scan' | 'voice')[];

  // 驳回
  rejectReason?: string;
  reworkCount: number;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TaskStatus =
  | 'pending'       // 待接受
  | 'accepted'      // 已接受
  | 'in_progress'   // 进行中
  | 'waiting_acceptance'  // 待验收
  | 'completed'    // 已完成
  | 'rejected';    // 已驳回
```

### 5.2 TaskOperationRecord 模型

```typescript
export interface TaskOperationRecord {
  id: string;
  recordCode: string;            // OP+日期+序号

  // 关联任务
  taskId: string;
  taskCode: string;
  taskTitle: string;

  // 操作信息
  action: TaskAction;
  actionName: string;
  operatorId: string;
  operatorName: string;
  operationDate: string;
  operationTime: string;

  // 状态变化
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;

  // 进度
  progress: number;
  progressIncrement?: number;

  // 工作量
  workload?: number;
  workloadUnit?: string;

  // 反馈数据
  feedbackData?: {
    gpsLocation?: { lat: number; lng: number };
    photosBefore?: string[];
    photosAfter?: string[];
    materialCode?: string;
    voiceNote?: string;
    remarks?: string;
  };

  // 驳回原因
  rejectReason?: string;
}
```

### 5.3 WorkLogEntry 模型

```typescript
export interface WorkLogEntry {
  id: number;
  code: string;                  // WL+日期+序号

  // 基本信息
  date: string;                  // 作业日期
  worker: string;               // 执行人姓名
  workerId: string;             // 执行人ID
  dept: string;                 // 部门

  // 作业信息
  greenhouse: string;            // 温室
  crop: string;                 // 作物
  tasks: string;                // 作业内容

  // 生长状态
  growthStatus: '良好' | '一般';

  // 问题与方案
  problems: string;
  solutions: string;

  // 关联
  taskId?: string;
  batchId?: string;
  batchCode?: string;

  // 来源
  sourceType: 'dispatch' | 'tempTask' | 'inspection';
}
```

### 5.4 AttendanceEntry 模型

```typescript
export interface AttendanceEntry {
  id: number;
  workerId: string;
  name: string;
  dept: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: '进行中' | '已完成' | '请假' | '迟到' | '早退' | '加班';
  statusClass: string;
  taskId?: string;
  batchId?: string;
}
```

---

## 六、演示数据初始化设计

### 6.1 演示任务数据（INITIAL_TASKS）

覆盖所有状态的演示任务：

```typescript
// src/data/mockData.ts 或 src/hooks/useTasks.ts

const INITIAL_TASKS: Task[] = [
  // ========== 待接受 (pending) ==========
  {
    id: 'TASK_001',
    taskCode: 'NT20260416-001',
    title: '1号棚番茄施肥任务',
    type: 'fertilization',
    typeName: '施肥',
    description: '对1号棚番茄进行追肥',
    greenhouseId: 'GH001',
    greenhouseName: '1号棚',
    cropName: '番茄',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'pending',
    priority: 'normal',
    progress: 0,
    planStartDate: '2026-04-16',
    planEndDate: '2026-04-16',
    dueDate: '2026-04-16',
    expectedCompletion: '2026-04-16 18:00',
    sourceType: 'dispatch',
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    reworkCount: 0,
    materials: [{ name: '复合肥', qty: 50, unit: 'kg' }],
    tools: [],
    createdAt: '2026-04-16T08:00:00Z',
    updatedAt: '2026-04-16T08:00:00Z',
  },
  {
    id: 'TASK_002',
    taskCode: 'NT20260416-002',
    title: '2号棚黄瓜灌溉任务',
    type: 'irrigation',
    typeName: '灌溉',
    description: '对2号棚黄瓜进行滴灌',
    greenhouseId: 'GH002',
    greenhouseName: '2号棚',
    cropName: '黄瓜',
    assigneeId: 'W002',
    assigneeName: '李四',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'pending',
    priority: 'high',
    progress: 0,
    planStartDate: '2026-04-16',
    planEndDate: '2026-04-16',
    dueDate: '2026-04-16',
    expectedCompletion: '2026-04-16 12:00',
    sourceType: 'dispatch',
    requiredFeedback: ['gps'],
    reworkCount: 0,
    materials: [],
    tools: [],
    createdAt: '2026-04-16T08:30:00Z',
    updatedAt: '2026-04-16T08:30:00Z',
  },

  // ========== 已接受/进行中 (accepted/in_progress) ==========
  {
    id: 'TASK_003',
    taskCode: 'NT20260415-003',
    title: '3号棚番茄修剪任务',
    type: 'pruning',
    typeName: '修剪',
    description: '对3号棚番茄进行侧枝修剪',
    greenhouseId: 'GH003',
    greenhouseName: '3号棚',
    cropName: '番茄',
    assigneeId: 'W003',
    assigneeName: '王五',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'in_progress',
    priority: 'normal',
    progress: 60,
    planStartDate: '2026-04-15',
    planEndDate: '2026-04-15',
    dueDate: '2026-04-15',
    expectedCompletion: '2026-04-15 18:00',
    actualStartTime: '2026-04-15T08:00:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['photo_before', 'photo_after'],
    reworkCount: 0,
    materials: [],
    tools: [{ name: '剪刀', qty: 2, unit: '把' }],
    createdAt: '2026-04-15T08:00:00Z',
    updatedAt: '2026-04-15T10:30:00Z',
  },
  {
    id: 'TASK_004',
    taskCode: 'NT20260414-004',
    title: '4号棚辣椒植保任务',
    type: 'plant_protection',
    typeName: '植保',
    description: '对4号棚辣椒进行病虫害防治',
    greenhouseId: 'GH004',
    greenhouseName: '4号棚',
    cropName: '辣椒',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'in_progress',
    priority: 'urgent',
    progress: 80,
    planStartDate: '2026-04-14',
    planEndDate: '2026-04-14',
    dueDate: '2026-04-14',
    expectedCompletion: '2026-04-14 17:00',
    actualStartTime: '2026-04-14T07:30:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['gps', 'photo_before', 'photo_after', 'material_scan'],
    reworkCount: 0,
    materials: [{ name: '多菌灵', qty: 20, unit: '包' }],
    tools: [],
    createdAt: '2026-04-14T07:00:00Z',
    updatedAt: '2026-04-14T14:00:00Z',
  },

  // ========== 待验收 (waiting_acceptance) ==========
  {
    id: 'TASK_005',
    taskCode: 'NT20260415-005',
    title: '5号棚茄子采摘任务',
    type: 'harvest',
    typeName: '采收',
    description: '对5号棚茄子进行成熟采摘',
    greenhouseId: 'GH005',
    greenhouseName: '5号棚',
    cropName: '茄子',
    assigneeId: 'W002',
    assigneeName: '李四',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'waiting_acceptance',
    priority: 'high',
    progress: 100,
    planStartDate: '2026-04-15',
    planEndDate: '2026-04-15',
    dueDate: '2026-04-15',
    expectedCompletion: '2026-04-15 16:00',
    actualStartTime: '2026-04-15T07:00:00Z',
    actualEndTime: '2026-04-15T15:00:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['photo_before', 'photo_after'],
    reworkCount: 0,
    materials: [{ name: '采摘筐', qty: 10, unit: '个' }],
    tools: [],
    createdAt: '2026-04-15T07:00:00Z',
    updatedAt: '2026-04-15T15:30:00Z',
    completedAt: '2026-04-15T15:30:00Z',
  },

  // ========== 已完成 (completed) ==========
  {
    id: 'TASK_006',
    taskCode: 'NT20260414-006',
    title: '6号棚番茄定植任务',
    type: 'planting',
    typeName: '定植',
    description: '对6号棚新苗进行定植',
    greenhouseId: 'GH006',
    greenhouseName: '6号棚',
    cropName: '番茄',
    assigneeId: 'W003',
    assigneeName: '王五',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'completed',
    priority: 'normal',
    progress: 100,
    planStartDate: '2026-04-14',
    planEndDate: '2026-04-14',
    dueDate: '2026-04-14',
    expectedCompletion: '2026-04-14 18:00',
    actualStartTime: '2026-04-14T08:00:00Z',
    actualEndTime: '2026-04-14T17:00:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['gps', 'photo_before', 'photo_after'],
    reworkCount: 0,
    materials: [{ name: '番茄苗', qty: 500, unit: '株' }],
    tools: [],
    createdAt: '2026-04-14T08:00:00Z',
    updatedAt: '2026-04-14T17:30:00Z',
    completedAt: '2026-04-14T17:30:00Z',
  },
  {
    id: 'TASK_007',
    taskCode: 'NT20260413-007',
    title: '1号棚除草任务',
    type: 'weeding',
    typeName: '除草',
    description: '对1号棚进行除草作业',
    greenhouseId: 'GH001',
    greenhouseName: '1号棚',
    cropName: '番茄',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'completed',
    priority: 'normal',
    progress: 100,
    planStartDate: '2026-04-13',
    planEndDate: '2026-04-13',
    dueDate: '2026-04-13',
    expectedCompletion: '2026-04-13 17:00',
    actualStartTime: '2026-04-13T08:00:00Z',
    actualEndTime: '2026-04-13T16:00:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['gps'],
    reworkCount: 0,
    materials: [],
    tools: [{ name: '除草机', qty: 1, unit: '台' }],
    createdAt: '2026-04-13T08:00:00Z',
    updatedAt: '2026-04-13T16:30:00Z',
    completedAt: '2026-04-13T16:30:00Z',
  },

  // ========== 已驳回 (rejected) ==========
  {
    id: 'TASK_008',
    taskCode: 'NT20260412-008',
    title: '2号棚灌溉任务',
    type: 'irrigation',
    typeName: '灌溉',
    description: '对2号棚进行滴灌系统检查',
    greenhouseId: 'GH002',
    greenhouseName: '2号棚',
    cropName: '黄瓜',
    assigneeId: 'W002',
    assigneeName: '李四',
    assignerId: 'M001',
    assignerName: '王主管',
    status: 'in_progress',  // 驳回后回退到进行中
    priority: 'normal',
    progress: 50,
    planStartDate: '2026-04-12',
    planEndDate: '2026-04-12',
    dueDate: '2026-04-12',
    expectedCompletion: '2026-04-12 17:00',
    actualStartTime: '2026-04-12T08:00:00Z',
    sourceType: 'dispatch',
    requiredFeedback: ['gps', 'photo_after'],
    reworkCount: 1,  // 被驳回过一次
    rejectReason: '3号分支滴灌管堵塞，需要先维修',
    materials: [],
    tools: [],
    createdAt: '2026-04-12T08:00:00Z',
    updatedAt: '2026-04-12T15:00:00Z',
  },
];
```

### 6.2 演示考勤数据（INITIAL_ATTENDANCE）

```typescript
const INITIAL_ATTENDANCE: AttendanceEntry[] = [
  // 已完成任务的考勤
  { id: 1, workerId: 'W003', name: '王五', dept: '生产部', date: '2026-04-14', checkIn: '08:00', checkOut: '17:00', hours: 9, status: '已完成', statusClass: 'normal', taskId: 'TASK_006' },
  { id: 2, workerId: 'W001', name: '张三', dept: '生产部', date: '2026-04-13', checkIn: '08:00', checkOut: '16:30', hours: 8.5, status: '已完成', statusClass: 'normal', taskId: 'TASK_007' },
  { id: 3, workerId: 'W002', name: '李四', dept: '生产部', date: '2026-04-15', checkIn: '07:00', checkOut: '15:30', hours: 8.5, status: '已完成', statusClass: 'normal', taskId: 'TASK_005' },

  // 进行中任务的考勤
  { id: 4, workerId: 'W003', name: '王五', dept: '生产部', date: '2026-04-15', checkIn: '08:00', checkOut: '10:30', hours: 2.5, status: '进行中', statusClass: 'info', taskId: 'TASK_003' },
  { id: 5, workerId: 'W001', name: '张三', dept: '生产部', date: '2026-04-14', checkIn: '07:30', checkOut: '14:00', hours: 6.5, status: '进行中', statusClass: 'info', taskId: 'TASK_004' },

  // 待验收任务（刚提交）
  { id: 6, workerId: 'W002', name: '李四', dept: '生产部', date: '2026-04-15', checkIn: '07:00', checkOut: '15:00', hours: 8, status: '已完成', statusClass: 'normal', taskId: 'TASK_005' },

  // 驳回任务的考勤
  { id: 7, workerId: 'W002', name: '李四', dept: '生产部', date: '2026-04-12', checkIn: '08:00', checkOut: '15:00', hours: 7, status: '进行中', statusClass: 'info', taskId: 'TASK_008' },
];
```

### 6.3 演示工单数据（INITIAL_WORK_LOGS）

```typescript
const INITIAL_WORK_LOGS: WorkLogEntry[] = [
  {
    id: 1,
    code: 'WL20260414-001',
    date: '2026-04-14',
    worker: '王五',
    workerId: 'W003',
    dept: '生产部',
    greenhouse: '6号棚',
    crop: '番茄',
    tasks: '定植',
    growthStatus: '良好',
    problems: '',
    solutions: '已完成6号棚500株番茄苗定植',
    taskId: 'TASK_006',
    batchCode: 'PC202604-001',
    sourceType: 'dispatch',
  },
  {
    id: 2,
    code: 'WL20260413-001',
    date: '2026-04-13',
    worker: '张三',
    workerId: 'W001',
    dept: '生产部',
    greenhouse: '1号棚',
    crop: '番茄',
    tasks: '除草',
    growthStatus: '良好',
    problems: '',
    solutions: '已完成1号棚除草作业',
    taskId: 'TASK_007',
    batchCode: 'PC202604-001',
    sourceType: 'dispatch',
  },
  {
    id: 3,
    code: 'WL20260415-001',
    date: '2026-04-15',
    worker: '李四',
    workerId: 'W002',
    dept: '生产部',
    greenhouse: '5号棚',
    crop: '茄子',
    tasks: '采收',
    growthStatus: '良好',
    problems: '',
    solutions: '已完成5号棚茄子采收，共采收约200kg',
    taskId: 'TASK_005',
    batchCode: 'PC202604-002',
    sourceType: 'dispatch',
  },
  // 临时任务（不关联任务）
  {
    id: 4,
    code: 'WL20260415-002',
    date: '2026-04-15',
    worker: '赵六',
    workerId: 'W006',
    dept: '生产部',
    greenhouse: '3号棚',
    crop: '番茄',
    tasks: '临时补苗',
    growthStatus: '一般',
    problems: '部分番茄苗枯萎',
    solutions: '补种新苗50株',
    batchCode: 'PC202604-001',
    sourceType: 'tempTask',
  },
];
```

---

## 七、页面表格字段设计

### 7.1 农事任务派发页面（TaskDispatchPage）

**表格列**：

| # | 列名 | 字段 | 宽度 | 说明 |
|---|------|------|------|------|
| 1 | 任务编号 | taskCode | 140px | NT+日期+序号 |
| 2 | 任务类型 | typeName | 100px | 施肥/灌溉/... |
| 3 | 作业区域 | greenhouseName | 80px | 1号棚 |
| 4 | 作物 | cropName | 80px | 番茄 |
| 5 | 执行人 | assigneeName | 80px | 张三 |
| 6 | 计划开始 | planStartDate | 100px | 日期 |
| 7 | 计划结束 | planEndDate | 100px | 日期 |
| 8 | 工时 | workDuration | 80px | 分钟转小时 |
| 9 | 进度 | progress | 100px | 百分比+进度条 |
| 10 | 优先级 | priority | 80px | 普通/高/紧急 Badge |
| 11 | 状态 | status | 100px | 状态 Badge |
| 12 | 操作 | - | 120px | [详情][派发][删除] |

**状态 Badge 样式**：

| 状态 | Badge 样式 |
|------|----------|
| pending（待接受） | `bg-gray-100 text-gray-700` |
| accepted（已接受） | `bg-blue-100 text-blue-700` |
| in_progress（进行中） | `bg-blue-100 text-blue-700` |
| waiting_acceptance（待验收） | `bg-amber-100 text-amber-700` |
| completed（已完成） | `bg-green-100 text-green-700` |
| rejected（已驳回） | `bg-red-100 text-red-700` |

### 7.2 任务中心 - 执行人视角（MyTasksPage）

**表格列**：

| # | 列名 | 字段 | 宽度 | 说明 |
|---|------|------|------|------|
| 1 | 任务编号 | taskCode | 140px | - |
| 2 | 任务名称 | title | 150px | - |
| 3 | 作业区域 | greenhouseName | 80px | - |
| 4 | 作物 | cropName | 80px | - |
| 5 | 执行人 | assigneeName | 80px | 固定为当前用户 |
| 6 | 计划开始 | planStartDate | 100px | - |
| 7 | 计划结束 | planEndDate | 100px | - |
| 8 | 工时 | workDuration | 80px | 预计 |
| 9 | 进度 | progress | 100px | 百分比+进度条 |
| 10 | 优先级 | priority | 80px | - |
| 11 | 状态 | status | 100px | Badge |
| 12 | 操作 | - | 150px | 根据状态动态显示 |

**状态与操作按钮**：

| 状态 | 可执行操作 |
|------|----------|
| pending（待接受） | [接受任务] [拒绝任务] [查看详情] |
| accepted（已接受） | [提交进度] [查看详情] |
| in_progress（进行中） | [提交进度] [查看详情] |
| waiting_acceptance（待验收） | [查看详情] |
| completed（已完成） | [查看详情] |
| rejected（已驳回） | [重新处理] [查看详情] |

### 7.3 任务中心 - 派发人视角（TasksPage）

**表格列**：

| # | 列名 | 字段 | 宽度 | 说明 |
|---|------|------|------|------|
| 1 | 任务编号 | taskCode | 140px | - |
| 2 | 任务名称 | title | 150px | - |
| 3 | 执行人 | assigneeName | 80px | - |
| 4 | 作业区域 | greenhouseName | 80px | - |
| 5 | 作物 | cropName | 80px | - |
| 6 | 派发时间 | createdAt | 140px | - |
| 7 | 期望完成 | expectedCompletion | 100px | - |
| 8 | 进度 | progress | 100px | 百分比+进度条 |
| 9 | 状态 | status | 100px | Badge |
| 10 | 操作 | - | 150px | 根据状态显示 |

**状态与操作按钮**：

| 状态 | 可执行操作 |
|------|----------|
| pending（待接受） | [催单] [撤回] [查看详情] |
| accepted（已接受） | [查看详情] |
| in_progress（进行中） | [查看详情] |
| waiting_acceptance（待验收） | [验收通过] [驳回] [查看详情] |
| completed（已完成） | [查看详情] |

### 7.4 每日工单汇总页面（DailyWorkSummary）

**表格列**：

| # | 列名 | 字段 | 宽度 | 说明 |
|---|------|------|------|------|
| 1 | 日期 | date | 100px | 筛选条件 |
| 2 | 任务编号 | taskCode | 140px | 关联任务编号 |
| 3 | 来源 | sourceType | 80px | 任务/临时任务 Badge |
| 4 | 温室 | greenhouse | 80px | 筛选条件 |
| 5 | 作物 | crop | 80px | - |
| 6 | 作业内容 | tasks | 150px | 作业描述 |
| 7 | 执行人 | worker | 80px | 来自WorkLogEntry |
| 8 | 工时 | hours | 80px | 来自AttendanceEntry |
| 9 | 完成率 | completionRate | 100px | 来自Task.progress |
| 10 | 状态 | status | 100px | Badge |

**统计卡片**：

| 卡片 | 图标 | 数值来源 |
|------|------|---------|
| 工单总数 | 📋 | WorkLogEntry.length |
| 已完成 | ✓ | Task.status='completed' count |
| 进行中 | ⟳ | Task.status in (accepted,in_progress,waiting_acceptance) count |
| 总工时 | ∑ | AttendanceEntry.hours sum |

---

## 八、弹窗设计（演示版）

### 8.1 派发任务弹窗

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 任务编号 | 只读 | - | 自动生成 |
| 任务类型 | 只读 | - | - |
| 作业区域 | 只读 | - | - |
| 执行人 | 下拉 | ✓ | **选择执行人** |
| 期望完成时间 | 日期+快捷 | ✓ | 今天/明天/3天内/本周/自定义 |
| 优先级 | 单选 | ✓ | 普通/高/紧急 |
| 必填反馈 | 多选 | - | GPS/照片前/照片后/扫码/语音 |

### 8.2 提交进度弹窗

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 当前进度 | 只读 | - | 显示当前进度 |
| GPS位置 | 地图选择 | 条件 | requiredFeedback包含gps |
| 作业前照片 | 上传 | 条件 | requiredFeedback包含photo_before |
| 作业后照片 | 上传 | 条件 | requiredFeedback包含photo_after |
| 物资扫码 | 扫码输入 | 条件 | requiredFeedback包含material_scan |
| 语音备注 | 录音 | 条件 | requiredFeedback包含voice |
| 进展情况/处理结果 | 多行文本 | ✓ | - |
| 实际工作量 | 数字+单位 | 进度100%时 | 天/小时 |
| 新进度 | 滑块0-100% | ✓ | **必填** |

### 8.3 验收确认弹窗

| 字段 | 类型 | 说明 |
|------|------|------|
| 任务编号 | 只读 | - |
| 执行人 | 只读 | - |
| 提交时间 | 只读 | - |
| 处理结果 | 只读 | 执行人填写 |
| 实际工时 | 只读 | 计算得出 |
| 流转记录 | 时间线 | 展示完整操作历史 |

**操作**：左侧 [驳回] / 右侧 [验收通过]

### 8.4 驳回原因弹窗

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 警告提示 | 文本 | - | 驳回后将通知执行人重新处理 |
| 驳回原因 | 多行文本 | ✓ | **必填** |

---

## 九、实施步骤

### Phase 1: 数据模型统一 + Bug修复

1. **修复 useDailyWorkSummary.ts:45 BUG**
   - `a.worker` → `a.name`

2. **添加演示数据**
   - 在 useTasks 中添加 INITIAL_TASKS
   - 在 usePersistentAttendance 中添加 INITIAL_ATTENDANCE
   - 在 usePersistentWorkLogs 中添加 INITIAL_WORK_LOGS

3. **统一 TaskDispatchPage 使用 useTasks**
   - 不再用 mockTasks 本地状态
   - 直接使用 useTasks 返回的 tasks

4. **添加 TaskDispatchPage 行级操作**
   - 每行增加 [派发] [详情] 按钮
   - 派发按钮打开 DispatchModal

### Phase 2: 任务流转闭环

5. **实现 acceptTask 创建考勤记录**
   - useTasks.acceptTask() 调用 usePersistentAttendance.addAttendance()

6. **实现 submitProgress 同步到工单**
   - 完善 syncWorkLogFromTask 逻辑
   - 确保工时正确计算

7. **实现 approveTask/rejectTask**
   - 验收通过/驳回的状态变更
   - 对应的操作记录

### Phase 3: 每日工单汇总完善

8. **修复汇总数据关联**
   - 按 taskId + date 正确关联 WorkLogEntry 和 AttendanceEntry
   - 从 Task 获取真实进度和状态

9. **添加临时任务功能**
   - 允许不关联任务直接添加工单
   - sourceType = 'tempTask'

### Phase 4: UI/UX 优化

10. **统一表格列设计**
    - 三个页面表格列对齐

11. **完善弹窗交互**
    - 参考巡查管理的问题处理弹窗

---

## 十、验收标准（演示版）

### 10.1 功能验收

| # | 验收项 | 演示预期结果 |
|---|--------|--------------|
| 1 | 查看任务列表 | 能看到所有状态的任务（pending/accepted/in_progress/waiting_acceptance/completed/rejected） |
| 2 | 创建新任务 | 新任务出现在列表，status='pending' |
| 3 | 派发任务 | status 变为 'accepted'，考勤表出现记录 |
| 4 | 接受任务 | 考勤记录 checkIn 时间更新 |
| 5 | 提交进度(50%) | Task.progress=50%，WorkLogEntry 更新 |
| 6 | 提交进度(100%) | status 变为 'waiting_acceptance' |
| 7 | 验收通过 | status 变为 'completed'，工时汇总完成 |
| 8 | 驳回任务 | status 先变 rejected 再变 in_progress，reworkCount++ |
| 9 | 每日工单汇总 | 统计数据正确显示，包含任务和临时任务 |
| 10 | 工时计算 | AttendanceEntry.hours 正确 |
| 11 | 临时任务 | 可直接添加工单，不关联任务，在汇总中显示 |

### 10.2 演示场景覆盖

| 场景 | 演示步骤 |
|------|---------|
| 正常流程 | 派发 → 接受 → 执行(分次进度) → 提交验收 → 验收通过 |
| 驳回流程 | 派发 → 接受 → 执行 → 提交验收 → 驳回 → 重新执行 → 再次提交 → 验收通过 |
| 多任务并行 | 执行人同时有多个任务，可以切换查看和提交进度 |
| 临时任务 | 直接在汇总页面添加临时工单，不走任务派发流程 |

---

## 十一、关键文件清单

| 文件 | 作用 |
|------|------|
| src/hooks/useTasks.ts | 统一任务管理核心 + INITIAL_TASKS |
| src/hooks/usePersistentWorkLogs.ts | 工单持久化 + INITIAL_WORK_LOGS |
| src/hooks/usePersistentAttendance.ts | 考勤持久化 + INITIAL_ATTENDANCE |
| src/hooks/useDailyWorkSummary.ts | 每日工单汇总 |
| src/components/farm/taskDispatch/TaskDispatchPage.tsx | 任务派发页面 |
| src/components/labor/tasks/TasksPage.tsx | 任务中心-派发人视角 |
| src/components/labor/myTasks/MyTasksPage.tsx | 任务中心-执行人视角 |
| src/pages/farm/DailyWorkSummary.tsx | 每日工单汇总页面 |
| src/components/common/TaskFlowTimeline.tsx | 流转记录时间线 |
| src/components/common/FeedbackInput.tsx | 反馈输入组件 |
