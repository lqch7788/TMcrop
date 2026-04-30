# 任务派发页面流转记录功能开发计划

## Context

**问题描述**：
用户反馈当前农事任务派发页面点击任务ID后只能看到任务基本信息，没有任务流转记录。而巡查管理页面已经有完整的流转信息展示功能，包括：派发、接受、进度提交、验收通过/驳回等完整流程记录。

**目标**：参照巡查管理页面的设计，为任务派发页面添加完整的流转记录展示功能。

**关键参考**：
- 巡查管理详情组件：`src/components/farm/inspection/modals/DetailInspectionModal.tsx`
- 通用时间线组件：`src/components/common/TaskFlowTimeline.tsx`
- 当前任务详情组件：`src/components/dispatch/components/shared/TaskDetail.tsx`
- 操作记录类型：`src/types/task.ts` 中的 `TaskRecord` 类型

---

## 一、现状分析

### 1.1 当前 TaskDetail 组件缺陷

| 缺陷 | 说明 |
|-----|------|
| 无流转记录区域 | 只展示基本信息，没有操作历史 |
| 未使用 TaskFlowTimeline | 通用时间线组件存在但未被复用 |
| 表格无详情按钮 | FarmTaskTable 只有编辑/派发/删除，没有查看详情 |
| 未获取操作记录 | 未调用 `getTaskRecordsByTaskId` 方法 |

### 1.2 已有可用资源

| 资源 | 路径 | 说明 |
|-----|------|------|
| TaskRecord 类型 | `src/types/task.ts` | 已包含完整的操作记录结构 |
| getTaskRecordsByTaskId | `useTasks.ts` | 已有的获取记录方法 |
| TaskFlowTimeline | `src/components/common/TaskFlowTimeline.tsx` | 时间线组件，但使用 ProblemFlowRecord |
| 巡查管理详情设计 | `DetailInspectionModal.tsx` | 流转记录展示参考 |

### 1.3 TaskRecord 数据结构

```typescript
interface TaskRecord {
  id: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  operatorId: string;
  operatorName: string;
  action: TaskAction;           // publish/accept/submit/reject/complete等
  actionName: string;
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  progress?: number;
  progressIncrement?: number;
  feedback?: {                  // 反馈数据
    text?: string;
    images?: string[];
    voiceNote?: string;
    gpsLocation?: { lat: number; lng: number };
    materials?: { name: string; qty: number; unit: string }[];
    laborCost?: number;
  };
  comment?: string;
  reason?: string;
  actionTime: string;
  createdAt: string;
}
```

---

## 二、任务流转节点设计

### 2.1 农事任务完整生命周期

```
草稿(draft) → 待接受(pending) → 已接受(accepted) → 处理中(in_progress)
                                                      ↓
                              待验收(waiting_acceptance) ← 提交进度(submit)
                                      ↓
                    验收通过(completed) ← 驳回(rejected) → 返工后继续 → in_progress
```

### 2.2 操作类型配置

| action | 操作 | 说明 |
|--------|-----|------|
| publish | 派发任务 | 草稿→待接受 |
| withdraw | 撤回任务 | 待接受→已取消 |
| cancel | 取消任务 | 已接受/处理中→已取消 |
| accept | 接单确认 | 待接受→已接受 |
| progress | 进度提交 | 已接受/处理中内部进度更新 |
| submit | 提交验收 | 处理中→待验收 |
| reject | 验收驳回 | 待验收→返工中(最多2次) |
| complete | 验收通过 | 待验收→已完成 |
| overtime_continue | 超时继续 | 超时后选择继续 |
| overtime_abandon | 超时放弃 | 超时后选择放弃 |
| reassign | 重新派发 | 失败/放弃后重新派发 |
| remind | 催办 | 发送催办提醒 |
| extend_deadline | 延期 | 延长截止日期 |

### 2.3 流转记录应展示的信息

每个流转节点应展示：
- **操作人**：谁执行了这个操作
- **操作类型**：发布的动作（派发/接受/提交等）
- **状态变化**：从XX状态 → 到XX状态
- **进度**：当前进度百分比（适用于进度提交）
- **反馈内容**：
  - 文字备注
  - 图片（作业前/作业后）
  - 语音
  - GPS定位
  - 物料使用
- **时间**：操作发生的准确时间

---

## 三、实现方案

### 3.1 新建 TaskRecordTimeline 组件

**文件**：`src/components/common/TaskRecordTimeline.tsx`

**功能**：复用 `TaskFlowTimeline.tsx` 的设计，但适配 `TaskRecord` 类型

**与 TaskFlowTimeline 的区别**：
| 差异点 | TaskFlowTimeline | TaskRecordTimeline |
|-------|-----------------|-------------------|
| 数据类型 | ProblemFlowRecord | TaskRecord |
| 状态显示 | 字符串状态 | 使用 TASK_STATUS_CONFIG 映射 |
| 操作类型 | 固定几种 | TaskAction 枚举 |
| 反馈数据 | feedbackData | feedback |

### 3.2 扩展 TaskDetail 组件

**文件**：`src/components/dispatch/components/shared/TaskDetail.tsx`

**修改内容**：
1. 添加 `taskRecords?: TaskRecord[]` prop
2. 添加流转记录展示区域（使用 TaskRecordTimeline）
3. 支持反馈内容的图片、GPS、语音等展示

### 3.3 表格添加详情按钮

**修改文件**：
- `FarmTaskTable.tsx` - 添加 `onView` prop 和详情按钮
- `TempTaskTable.tsx` - 同上
- `SmartTaskTable.tsx` - 同上

**修改内容**：
- 添加 `Eye` 图标按钮
- 传递 `onView: (task: Task) => void`

### 3.4 Tab组件添加详情状态管理

**修改文件**：
- `FarmDispatchTab.tsx`
- `TempTaskTab.tsx`
- `SmartDispatchTab.tsx`

**修改内容**：
1. 添加 `viewingTask: Task | null` 状态
2. 从 `useTasks()` 调用 `getTaskRecordsByTaskId` 获取记录
3. 将记录传递给 `TaskDetail` 组件

### 3.5 创建详情弹窗组件

**文件**：`src/components/dispatch/components/modals/TaskDetailModal.tsx`

**功能**：
- 弹窗形式展示任务详情+流转记录
- 可复用 `TaskDetail` 组件
- 添加关闭按钮

---

## 四、文件修改清单

| 序号 | 文件路径 | 操作 | 修改内容 |
|-----|---------|------|---------|
| 1 | `src/components/common/TaskRecordTimeline.tsx` | 新建 | 流转记录时间线组件（适配TaskRecord） |
| 2 | `src/components/dispatch/components/shared/TaskDetail.tsx` | 修改 | 扩展支持流转记录展示 |
| 3 | `src/components/dispatch/components/dispatch/FarmTaskTable.tsx` | 修改 | 添加onView prop和详情按钮 |
| 4 | `src/components/dispatch/components/dispatch/TempTaskTable.tsx` | 修改 | 添加onView prop和详情按钮 |
| 5 | `src/components/dispatch/components/dispatch/SmartTaskTable.tsx` | 修改 | 添加onView prop和详情按钮 |
| 6 | `src/components/dispatch/components/dispatch/FarmDispatchTab.tsx` | 修改 | 添加详情弹窗状态和逻辑 |
| 7 | `src/components/dispatch/components/dispatch/TempTaskTab.tsx` | 修改 | 添加详情弹窗状态和逻辑 |
| 8 | `src/components/dispatch/components/dispatch/SmartDispatchTab.tsx` | 修改 | 添加详情弹窗状态和逻辑 |
| 9 | `src/components/dispatch/components/modals/TaskDetailModal.tsx` | 新建 | 详情弹窗组件 |

---

## 五、TaskRecordTimeline 组件设计

### 5.1 组件接口

```typescript
interface TaskRecordTimelineProps {
  records: TaskRecord[];
  showStatusChange?: boolean;
  showFeedback?: boolean;  // 是否显示反馈内容（图片、GPS等）
}
```

### 5.2 动作配置

```typescript
const TASK_ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  publish: { icon: Send, color: 'text-blue-500', label: '派发任务' },
  withdraw: { icon: RotateCcw, color: 'text-gray-500', label: '撤回任务' },
  cancel: { icon: XCircle, color: 'text-red-500', label: '取消任务' },
  accept: { icon: CheckCircle, color: 'text-green-500', label: '接单确认' },
  progress: { icon: Clock, color: 'text-blue-500', label: '进度更新' },
  submit: { icon: Upload, color: 'text-amber-500', label: '提交验收' },
  reject: { icon: XCircle, color: 'text-red-500', label: '验收驳回' },
  complete: { icon: CheckCircle, color: 'text-emerald-500', label: '验收通过' },
  overtime_continue: { icon: Play, color: 'text-blue-500', label: '超时继续' },
  overtime_abandon: { icon: Square, color: 'text-red-500', label: '超时放弃' },
  reassign: { icon: Send, color: 'text-purple-500', label: '重新派发' },
  remind: { icon: Bell, color: 'text-orange-500', label: '催办提醒' },
  extend_deadline: { icon: Calendar, color: 'text-gray-500', label: '延期' },
};
```

### 5.3 反馈内容展示

```typescript
// 反馈内容展示区域
{record.feedback && (
  <div className="mt-2 space-y-2">
    {/* GPS位置 */}
    {record.feedback.gpsLocation && (
      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
        <span>📍</span>
        <span>位置打卡：{record.feedback.gpsLocation.lat.toFixed(6)}, {record.feedback.gpsLocation.lng.toFixed(6)}</span>
      </div>
    )}

    {/* 图片 */}
    {record.feedback.images && record.feedback.images.length > 0 && (
      <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
        <span>📷</span>
        <span>照片：{record.feedback.images.length}张</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {record.feedback.images.map((img, idx) => (
            <img key={idx} src={img} alt={`照片${idx + 1}`} className="w-10 h-10 object-cover rounded" />
          ))}
        </div>
      </div>
    )}

    {/* 文字备注 */}
    {record.feedback.text && (
      <div className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
        {record.feedback.text}
      </div>
    )}
  </div>
)}
```

---

## 六、验证计划

### 6.1 功能验证

1. **查看详情按钮**：表格中有点击可查看任务详情
2. **基本信息显示**：任务编号、标题、状态、执行人等信息正确
3. **流转记录显示**：完整展示所有操作记录，包括：
   - 派发记录
   - 接受记录
   - 进度更新记录（含进度百分比）
   - 提交验收记录
   - 验收通过/驳回记录
4. **反馈内容展示**：图片、GPS、语音等反馈内容正确显示
5. **状态变化显示**：每条记录显示状态从XX到XX

### 6.2 测试场景

| 场景 | 预期结果 |
|-----|---------|
| 点击任务编号 | 弹出详情弹窗 |
| 详情弹窗显示基本信息 | 任务编号、标题、状态等正确 |
| 详情弹窗显示流转记录 | 按时间顺序显示所有操作记录 |
| 进度提交记录显示进度条 | 显示当时的进度百分比 |
| 有驳回记录的显示驳回原因 | 显示验收驳回的原因 |
| 有图片的显示缩略图 | 显示反馈中包含的图片 |

---

## 七、注意事项

1. **组件复用**：优先复用 `TaskFlowTimeline.tsx` 的设计模式
2. **类型兼容**：确保 `TaskRecordTimeline` 与 `TaskFlowTimeline` 接口一致（除数据类型外）
3. **数据获取**：在 Tab 组件中正确调用 `getTaskRecordsByTaskId` 获取记录
4. **样式统一**：流转记录样式与巡查管理保持一致
