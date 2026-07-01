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
  | 'assign'          // 派发
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
    // 工作量确认
    workloadDays?: number;
    workloadHours?: number;
    workers?: number;
    // 物资编码
    materialCode?: string;
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
  teamId?: string;           // 关联班组ID（来自农事管理-班组分配）
  teamName?: string;         // 关联班组名称

  // 必填反馈项
  feedbackRequirements: FeedbackRequirement[];

  // 兼容字段（MyTasksPage 等使用 — 2026-06-30 tsc 兼容）
  requiredFeedback?: string[];     // = feedbackRequirements.map(f => f.type) 字符串版别名
  feedbackStatus?: string;         // 当前反馈状态

  // 版本控制（用于乐观锁）
  version: number;
  updatedAt: string;
  createdAt: string;

  // 派发模式（区分三个Tab：农事任务、临时任务、智能派工）
  dispatchMode?: 'farm' | 'tempTask' | 'smart' | 'problem' | 'inspection';

  // 智能派工相关
  recommendedExecutorName?: string;  // 推荐执行人姓名
  recommendScore?: number;           // 推荐评分
  selectedExecutor?: {
    id: string;
    name: string;
    recommendScore?: number;
  };

  // 扩展字段（兼容旧版本）
  priority?: 'urgent' | 'high' | 'normal';
  description?: string;
  remarks?: string;
  materials?: { name: string; qty: number; unit: string }[] | string[];
  tools?: { name: string; qty: number; unit: string }[] | string[];
  typeConfig?: Record<string, any>;     // 任务类型配置（FarmTaskHub 使用）
  sopContent?: string;                   // 标准作业流程内容
  workLocation?: string;                 // = location 别名
  cancelledReason?: string;              // 取消原因
  cancelledAt?: string;                  // 取消时间
  cancelledBy?: string;                  // 取消人
  sourceProblemId?: string;              // 问题处理任务关联
  sourceInspectionId?: string;           // 巡查反馈关联
  urgency?: 'urgent' | 'high' | 'normal'; // 紧急程度
  recordCode?: string;                   // 关联记录编号
  workDuration?: number;                 // 工时（小时）
  startDate?: string;                    // 任务开始日期
  rejectionReason?: string;              // 驳回原因
  rejectionCount?: number;               // 驳回次数
  toolsRemarks?: string;
  dispatchMode?: 'farm' | 'tempTask' | 'smart' | 'problem' | 'inspection';
  tools?: { name: string; qty: number; unit: string }[];  // 工具列表
  toolsRemarks?: string;      // 工具备注（当选择"其他"时使用）
  rejectReason?: string;
  executorRejectCount?: number;  // 执行人拒绝次数，达到2次后必须更换执行人
  subTasks?: SubTask[];

  // ========== 兼容旧界面字段 ==========
  types?: string[];        // 任务类型数组，与 type 字段对应
  typeLabel?: string;       // 类型显示名称
  field?: string;          // 地块/大棚名称（兼容 greenhouseName）
  assignee?: string;        // 执行人姓名（兼容 assigneeName）
  crop?: string;           // 作物名称（兼容 cropName）
  planStart?: string;      // 计划开始时间
  planEnd?: string;        // 计划结束时间
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
