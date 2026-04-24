# 设计文档：农业管理系统 - 完整闭环追踪系统

生成时间: 2026/04/16
分支: planting-management
模式: Startup (定制开发)

## 问题陈述

农业生产主管最关心的是「任务执行追踪」——派发任务后能实时知道执行到哪一步了。

**已确认的问题（代码审查发现）：**

1. **AttendanceEntry 字段不存在** — `useDailyWorkSummary.ts:45` 用 `a.worker` 匹配，但 `AttendanceEntry` 类型定义的字段是 `name` 而非 `worker`，导致工时匹配逻辑失效

2. **useTasks 未导入 usePersistentAttendance** — 要实现"接受任务时自动创建考勤记录"，需要在 `useTasks.ts` 中引入 `usePersistentAttendance`

3. **工时统计逻辑割裂** — `syncWorkLogFromTask` 只同步工单，不同步考勤。两个数据源独立更新，没有形成闭环

---

## 目标用户

**张三，32岁，某中型农场生产主管**
- 每天派发10-20个农事任务给不同工人
- 需要知道每个任务的执行状态（已接受/进行中/待验收/已完成）
- 需要统计每天每个工人的工时
- 需要追踪田间问题从发现到解决的全流程
- 没有系统前靠微信群追踪，消息刷屏后经常漏掉

---

## 现状分析

### 当前数据流（有断点）

| 功能 | 数据写入 | 读取位置 | 断点问题 |
|------|---------|---------|---------|
| 任务派发 | useTasks.addTask() | Task[] | ✓ 正常 |
| 任务接受 | useTasks.acceptTask() | TaskOperationRecord | **缺失：未创建考勤记录** |
| 任务进度 | useTasks.updateTaskProgress() | TaskOperationRecord + WorkLogEntry | ✓ 已同步，但工时计算可能不准确 |
| 任务验收 | useTasks.acceptTaskCompletion() | TaskOperationRecord | **缺失：未同步更新考勤状态** |
| 每日工单 | useDailyWorkSummary | WorkLogEntry | **Bug: 工时匹配用 a.worker 但字段是 a.name** |
| 考勤记录 | usePersistentAttendance | AttendanceEntry | 独立运转，未与任务关联 |

### 关键文件与实际字段

| 文件 | 关键字段 | 问题 |
|------|---------|------|
| useTasks.ts | assigneeName, assigneeId | 不导出考勤相关方法 |
| usePersistentWorkLogs.ts | worker, taskId | syncWorkLogFromTask 已实现 |
| usePersistentAttendance.ts | **name**, workerId, taskId | 字段是 `name` 不是 `worker` |
| useDailyWorkSummary.ts:45 | `a.worker` | **Bug: 字段不存在，应为 a.name** |

### 状态流转（实际代码）

```
pending → accepted → in_progress → waiting_acceptance → completed
                                     ↓
                                 rejected → in_progress (驳回后回退)
```

注意：`acceptTask` 设置 `status: 'accepted'`，第一次 `updateTaskProgress` 才推进到 `in_progress`。

---

## 完整闭环追踪系统设计

### 核心业务流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        任务生命周期                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  创建任务 ──→ 派发 ──→ 接受 ──→ 执行 ──→ 提交进度 ──→ 验收    │
│    │              │        │       │        │          │        │
│    │              │        │       │        │          ↓        │
│    └──────────────┴────────┴───────┴────────┴───────→ 完成    │
│                                                   ↑             │
│                                                   │ 驳回        │
│                                          驳回 ────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        工单自动生成                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  任务接受时 ──→ 生成考勤记录（开始时间）                         │
│  每次进度提交 ──→ 更新考勤记录（工作量、工时）                   │
│  验收通过时 ──→ 完成考勤记录 + 工单汇总记录                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 实现方案

### 1. 修复 Bug: useDailyWorkSummary.ts:45

**问题**：`a.worker` 字段不存在，`AttendanceEntry` 的字段是 `name`

**修复**：将 `dayAttendance.find(a => a.worker === log.worker)` 改为 `dayAttendance.find(a => a.name === log.worker)`

### 2. 任务接受 → 工时开始记录

当工人点击「接受任务」时：
- 调用 `usePersistentAttendance` 的 `addAttendance()` 创建考勤记录

```typescript
// useTasks.acceptTask() 改动
// 需要新增导入
import { usePersistentAttendance } from './usePersistentAttendance';

const acceptTask = (id: string, remarks?: string) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  // ... 现有逻辑（创建操作记录）...

  // 新增：创建考勤记录
  const { addAttendance } = usePersistentAttendance();
  addAttendance({
    workerId: task.assigneeId,
    name: task.assigneeName,
    dept: '生产部', // TODO: 从用户配置获取
    date: today,
    checkIn: timeStr,
    checkOut: '', // 待结算
    hours: 0,
    status: '进行中',
    statusClass: 'info',
    taskId: task.id,
    batchId: task.batchId,
  });

  // ... 现有逻辑（更新任务状态）...
};
```

### 3. 任务进度提交 → 工时更新

每次 updateTaskProgress 时：
- 如果有 startTime/endTime，计算工时增量
- 查找对应考勤记录并更新

```typescript
// 每次进度提交时，计算工时
if (options?.startTime && options?.endTime) {
  const [sh, sm] = options.startTime.split(':').map(Number);
  const [eh, em] = options.endTime.split(':').map(Number);
  const hoursWorked = (eh * 60 + em) - (sh * 60 + sm);

  // 更新考勤记录的 checkOut 和 hours
  const { attendance, updateAttendance } = usePersistentAttendance();
  const attendanceRecord = attendance.find(a => a.taskId === task.id && a.date === today);
  if (attendanceRecord) {
    updateAttendance(attendanceRecord.id, {
      checkOut: options.endTime,
      hours: hoursWorked / 60,
    });
  }
}
```

### 4. 任务验收通过 → 工单汇总确认

acceptTaskCompletion 时：
- 标记 AttendanceEntry 为已完成

### 5. 问题分派 → 关联任务

问题分派时：
- 通过 `sourceTaskId` 字段关联任务（已有字段）
- 问题处理完成后更新 sourceTask 的相关状态

---

## 改动范围

| 文件 | 改动类型 | 改动内容 |
|------|---------|---------|
| src/hooks/useDailyWorkSummary.ts | Bug修复 | a.worker → a.name |
| src/hooks/useTasks.ts | 扩展 | import usePersistentAttendance，acceptTask 添加考勤创建 |
| src/hooks/usePersistentAttendance.ts | 不改 | 已有的 addAttendance/updateAttendance 方法 |
| src/hooks/usePersistentWorkLogs.ts | 不改 | syncWorkLogFromTask 已就绪 |
| src/pages/farm/TaskCenter.tsx | 优化 | 添加工时显示、状态统计 |

---

## 验收标准（量化）

1. **任务接受后**：
   - 考勤表中新增一条记录，workerId/name 与任务 assigneeId/assigneeName 一致
   - checkIn 字段为接受任务的时间
   - 可通过 `attendance.find(a => a.taskId === taskId)` 查到

2. **进度提交后**：
   - 工时 = (endTime - startTime)，单位为小时
   - 考勤记录的 checkOut 和 hours 字段更新
   - 工单汇总中该任务的 workHours 正确显示

3. **验收通过后**：
   - 考勤记录的 status 变为 "已完成"
   - 每日工单汇总显示状态为 "已完成"

4. **驳回后**：
   - 任务状态变为 'in_progress'（不是 'rejected'）
   - 考勤记录保留，不删除

5. **问题分派**：
   - 可在问题记录中填写 sourceTaskId
   - 每日工单汇总可按 taskId 关联查询问题

---

## 技术约束

1. 使用 localStorage 持久化（当前架构）
2. 不引入后端服务（纯前端 MVP）
3. 数据模型保持向后兼容

---

## 待解决问题（设计决策）

1. **多任务并行**：同一工人同时接多个任务时，工时应按任务比例分配还是独立记录？
   - **推荐方案**：独立记录，每个任务创建独立的考勤行，通过 taskId 关联

2. **工时来源**：工时是按打卡时间自动计算，还是由工人手动填写？
   - **推荐方案**：先按 startTime/endTime 自动计算，未来可扩展为支持手动调整

3. **驳回场景**：驳回后任务回退到 in_progress，但考勤记录如何处理？
   - **推荐方案**：考勤记录保留（不删除），继续累加工时直到最终验收

---

## 实现步骤

### Step 1: 修复 useDailyWorkSummary.ts Bug
- 文件：`src/hooks/useDailyWorkSummary.ts:45`
- 改动：`a.worker` → `a.name`

### Step 2: 在 useTasks 中引入 usePersistentAttendance
- 文件：`src/hooks/useTasks.ts`
- 改动：添加 import，从 Hook 返回值中获取 addAttendance

### Step 3: 修改 acceptTask 创建考勤记录
- 文件：`src/hooks/useTasks.ts`
- 改动：在 acceptTask 方法中调用 addAttendance

### Step 4: 修改 updateTaskProgress 更新工时
- 文件：`src/hooks/useTasks.ts`
- 改动：查找对应考勤记录，更新 checkOut 和 hours

### Step 5: 修改 acceptTaskCompletion 标记考勤完成
- 文件：`src/hooks/useTasks.ts`
- 改动：更新考勤记录的 status 为 "已完成"

### Step 6: 验证测试
- 创建任务 → 接受任务 → 检查考勤表有记录
- 提交进度 → 检查工时正确累加
- 验收通过 → 检查考勤状态为已完成

---

## 关于这个项目的笔记

你选择了定制开发模式为农业企业构建管理系统。这是一个"服务即软件"的创业模式，优势是：
- 定制化程度高，客户愿意付费
- 真实需求驱动，不是「假设」的需求

关键是要确保交付的系统真的能解决协作问题，而不是另一个「用起来麻烦」的系统中。
