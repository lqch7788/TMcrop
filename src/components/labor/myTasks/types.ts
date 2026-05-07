/**
 * 我的任务页面类型定义
 */

// 任务扩展类型 - 统一任务管理中的任务可能包含 TaskDispatchTask 中没有的额外字段
export interface TaskWithExtras {
  id: string;
  taskCode?: string;
  title?: string;
  types?: string[];
  typeName?: string;
  typeLabel?: string;
  field?: string;
  greenhouseName?: string;
  crop?: string;
  cropName?: string;
  cropRemarks?: string;
  assignee?: string;
  assigneeName?: string;
  assigneeId?: string;
  planStart?: string;
  planEnd?: string;
  progress?: number;
  status?: string;
  priority?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  dueDate?: string;
  startDate?: string;
  requiredFeedback?: string[];
  feedbackRequirements?: string[];
  remarks?: string;
  typeConfig?: Record<string, unknown>;
  sopContent?: string;
  materials?: Array<{ name: string; qty: number; unit: string }>;
  tools?: Array<{ name: string; qty: number; unit: string }>;
  // 临时任务特有字段
  sourceType?: string;
  sourceProblemId?: string;
  workLocation?: string;
  urgency?: string;
  tempTaskType?: string;
  workerCount?: number;
  totalEstimatedHours?: number;
  // 巡查反馈特有字段
  sourceId?: string;
  recordCode?: string;
  inspectionType?: string;
  submitterId?: string;
  submitterName?: string;
  assignerName?: string;
  location?: string;
  checkDate?: string;
  checkTime?: string;
  checkResult?: string;
  issueCategories?: string[];
  issueSeverity?: string;
  issueText?: string;
  photos?: string[];
  feedbackStatus?: string;
  feedbackUsers?: Array<{ id: string; name: string }>;
  processProgress?: number;
  inspectorId?: string;
  inspectorName?: string;
  createdAt?: string;
  [key: string]: unknown;  // 允许访问任何额外属性
}

// 任务物资类型
export interface TaskMaterial {
  name: string;
  qty: number;
  unit: string;
  code?: string;
  [key: string]: unknown;
}

// 反馈表单数据类型
export interface FeedbackFormData {
  resultStatus: '' | '全部完成' | '部分完成' | '延迟完成' | '其他';
  resultText: string;
  progressText: string;
  workloadDays: string;
  workloadHours: string;
  workloadConfirm: { days: number; hours: number; workers: number } | null;
  photosBefore: string[];
  photosAfter: string[];
  gpsLocation: { lat: number; lng: number } | null;
  materialCode: string;
  voiceNote: string;
  cannotContinue: boolean;
  cannotContinueReason: string;
}

// 弹窗状态类型
export interface ModalState<T = null> {
  isOpen: boolean;
  task: T | null;
}

// 任务筛选类型
export type TaskFilterType = 'all' | 'problem' | 'production' | 'temp';

// 任务类型配置项
export interface TaskTypeConfig {
  value: string;
  label: string;
  color: string;
}

// 状态配置项
export interface StatusConfig {
  bg: string;
  color: string;
  label: string;
}

// 优先级配置项
export interface PriorityConfig {
  color: string;
  label: string;
}
