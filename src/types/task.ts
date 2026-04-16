/**
 * 农事任务类型定义
 * 统一管理任务相关的类型、枚举、接口
 */

// ============================================
// 任务状态枚举（10种）
// ============================================
export type TaskStatus =
  | 'draft'           // 草稿
  | 'pending'         // 已发布（待接受）
  | 'accepted'        // 已接受
  | 'in_progress'     // 处理中
  | 'waiting_acceptance' // 待验收
  | 'completed'       // 已完成
  | 'rejected'        // 返工中（验收驳回）
  | 'failed'          // 任务失败（超过2次返工）
  | 'cancelled'       // 已取消
  | 'abandoned';     // 已放弃

// ============================================
// 操作行为枚举
// ============================================
export type TaskAction =
  | 'create'           // 创建
  | 'publish'         // 发布
  | 'withdraw'        // 撤回
  | 'cancel'          // 取消
  | 'accept'          // 接受
  | 'start'           // 开始执行
  | 'progress'        // 提交进度
  | 'submit'          // 申请验收
  | 'overtime_continue'  // 超时继续
  | 'overtime_abandon'   // 超时放弃
  | 'complete'        // 验收通过
  | 'reject'          // 验收驳回
  | 'continue'        // 继续执行（返工后）
  | 'reassign'        // 重新派发
  | 'remind'          // 催办
  | 'extend_deadline'; // 延期

// ============================================
// 必填反馈类型
// ============================================
export type FeedbackType = 'text' | 'image_before' | 'image_after' | 'voice' | 'gps' | 'materials';

// ============================================
// 必填反馈配置
// ============================================
export interface FeedbackRequirement {
  type: FeedbackType;
  label: string;
  required: boolean;
}

// ============================================
// 超时信息
// ============================================
export interface TaskTimeout {
  type: 'accept' | 'execution' | 'acceptance';
  severity: 'warning' | 'critical';  // warning=预警，critical=危急
  startedAt: string;
  deadline: string;
}

// ============================================
// 延期记录
// ============================================
export interface DeadlineExtension {
  id: string;
  originalDeadline: string;
  newDeadline: string;
  reason: string;
  extendedBy: string;
  extendedAt: string;
}

// ============================================
// 返工记录
// ============================================
export interface ReworkRecord {
  reworkCount: number;
  reworkReason: string;
  reworkBy: string;
  reworkAt: string;
  taskStatusBeforeRework: TaskStatus;
}

// ============================================
// 统一操作记录（替代 TaskFlowRecord + TaskOperationRecord）
// ============================================
export interface TaskRecord {
  id: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;

  // 操作人
  operatorId: string;
  operatorName: string;
  action: TaskAction;
  actionName: string;

  // 状态变更
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;

  // 进度
  progress?: number;
  progressIncrement?: number;

  // 反馈内容
  feedback?: {
    text?: string;
    images?: string[];
    voiceNote?: string;
    gpsLocation?: { lat: number; lng: number };
    materials?: { name: string; qty: number; unit: string }[];
    laborCost?: number;
  };

  // 扩展信息
  comment?: string;
  reason?: string;

  actionTime: string;
  createdAt: string;
}

// ============================================
// 催办记录
// ============================================
export interface ReminderRecord {
  id: string;
  taskId: string;
  taskCode: string;
  remindedBy: string;
  remindedByName: string;
  remindedTo: string;
  remindedToName: string;
  remindType: 'manual' | 'auto';
  message?: string;
  remindedAt: string;
  acknowledgedAt?: string;
}

// ============================================
// 任务主体接口
// ============================================
export interface Task {
  // 基础信息
  id: string;
  taskCode: string;
  title: string;
  type: string;
  typeName: string;
  status: TaskStatus;

  // 任务来源
  sourceType: 'dispatch' | 'tempTask' | 'inspection';
  sourceId?: string;
  sourceCode?: string;

  // 返工相关
  reworkCount: number;
  reworkHistory: ReworkRecord[];

  // 验收记录
  acceptanceRecord?: {
    acceptedBy: string;
    acceptedByName: string;
    acceptedAt: string;
    comments?: string;
  };

  // 执行信息
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;

  // 进度
  progress: number;

  // 时间计划
  dueDate?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  acceptedAt?: string;
  completedAt?: string;
  startTime?: string;
  endTime?: string;

  // 延期记录
  deadlineExtensions: DeadlineExtension[];

  // 超时状态（通过计算得出，非独立状态）
  timeout?: TaskTimeout;

  // 放弃相关
  abandonedReason?: string;
  abandonedAt?: string;

  // 取消相关
  cancelledReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;

  // 关联
  batchId?: string;
  batchCode?: string;
  productionPlanCode?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  cropName?: string;

  // 必填反馈项
  feedbackRequirements: FeedbackRequirement[];

  // 版本控制（用于乐观锁）
  version: number;
  updatedAt: string;
  createdAt: string;

  // 扩展字段（兼容旧版本）
  priority?: 'urgent' | 'high' | 'normal';
  description?: string;
  remarks?: string;
  materials?: { name: string; qty: number; unit: string }[];
  rejectReason?: string;
  subTasks?: SubTask[];
}

// ============================================
// 子任务
// ============================================
export interface SubTask {
  id: string;
  title: string;
  area?: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
}

// ============================================
// 任务查询过滤参数
// ============================================
export interface TaskFilters {
  status?: TaskStatus[];
  sourceType?: 'dispatch' | 'tempTask' | 'inspection';
  assigneeId?: string;
  assignerId?: string;
  greenhouseId?: string;
  batchId?: string;
  priority?: 'urgent' | 'high' | 'normal';
  dateRange?: {
    start: string;
    end: string;
  };
  keyword?: string;
}

// ============================================
// 任务统计
// ============================================
export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  waitingAcceptance: number;
  completed: number;
  overdue: number;
}

// ============================================
// 状态配置（从 taskConfig 导入）
// ============================================
export { TASK_STATUS_CONFIG, TASK_ACTION_CONFIG } from '../config/taskConfig';
