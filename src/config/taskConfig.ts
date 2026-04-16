/**
 * 农事任务配置
 * 包含超时配置、延期限制、催办限制等
 */

// ============================================
// 超时配置
// ============================================
export const OVERTIME_CONFIG = {
  // 接受超时阈值
  acceptWarningHours: 12,      // 接受超时预警：12小时
  acceptCriticalHours: 24,     // 接受超时危急：24小时

  // 执行超时阈值
  executionWarningHours: 24,    // 执行超时预警：24小时
  executionCriticalHours: 48,   // 执行超时危急：48小时

  // 验收超时阈值
  acceptanceWarningHours: 24,   // 验收超时预警：24小时
  acceptanceCriticalHours: 48,  // 验收超时危急：48小时

  // 检测间隔（毫秒）
  checkIntervalMs: 5 * 60 * 1000,  // 5分钟检测一次
} as const;

// ============================================
// 延期限制配置
// ============================================
export const DEADLINE_CONFIG = {
  maxExtensions: 3,             // 最多延期3次
  maxExtensionHours: 72,        // 每次最多延期72小时（3天）
  totalMaxExtensionHours: 168,  // 总计最多延期168小时（7天）
} as const;

// ============================================
// 催办限制配置
// ============================================
export const REMINDER_CONFIG = {
  minIntervalMinutes: 60,       // 催办间隔至少60分钟
  maxRemindersPerDay: 5,        // 每天最多催办5次
  autoReminderHours: 12,        // 自动催办阈值（派发12小时后未接受）
} as const;

// ============================================
// 操作权限矩阵
// ============================================
export const TASK_PERMISSIONS = {
  // 撤回：仅pending状态，管理员可操作
  withdraw: { roles: ['admin'] as const, statuses: ['pending'] as const },

  // 取消：accepted/in_progress状态，管理员可操作
  cancel: { roles: ['admin'] as const, statuses: ['accepted', 'in_progress'] as const },

  // 重新派发：failed/abandoned状态，管理员可操作
  reassign: { roles: ['admin'] as const, statuses: ['failed', 'abandoned'] as const },

  // 接受任务：仅pending状态，执行人可操作
  accept: { roles: ['assignee'] as const, statuses: ['pending'] as const },

  // 验收：waiting_acceptance状态，验收人（派发人/管理员）可操作
  verify: { roles: ['assigner', 'admin'] as const, statuses: ['waiting_acceptance'] as const },

  // 继续执行：rejected状态，保持原执行人
  continue: { roles: ['assignee'] as const, statuses: ['rejected'] as const },

  // 提交进度：accepted/in_progress状态，执行人可操作
  submitProgress: { roles: ['assignee'] as const, statuses: ['accepted', 'in_progress'] as const },

  // 催办：所有状态，管理员可操作
  remind: { roles: ['admin'] as const, statuses: ['*'] as const },
} as const;

// ============================================
// 状态转换限制
// ============================================
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['waiting_acceptance', 'cancelled', 'abandoned'],
  waiting_acceptance: ['completed', 'rejected'],
  rejected: ['in_progress', 'failed'],
  failed: ['pending'],
  abandoned: ['pending'],
  cancelled: [],
  completed: [],
};

// ============================================
// 状态配置
// ============================================
export const TASK_STATUS_CONFIG = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  accepted: { label: '已接受', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '返工中', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: '任务失败', color: 'text-purple-600', bg: 'bg-purple-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
  abandoned: { label: '已放弃', color: 'text-red-400', bg: 'bg-red-50' },
} as const;

// ============================================
// 操作行为配置
// ============================================
export const TASK_ACTION_CONFIG = {
  create: { label: '创建任务', color: 'text-blue-600', bg: 'bg-blue-50' },
  publish: { label: '派发任务', color: 'text-blue-600', bg: 'bg-blue-50' },
  withdraw: { label: '撤回任务', color: 'text-gray-600', bg: 'bg-gray-50' },
  cancel: { label: '取消任务', color: 'text-gray-600', bg: 'bg-gray-50' },
  accept: { label: '接受任务', color: 'text-green-600', bg: 'bg-green-50' },
  start: { label: '开始执行', color: 'text-green-600', bg: 'bg-green-50' },
  progress: { label: '提交进度', color: 'text-blue-600', bg: 'bg-blue-50' },
  submit: { label: '申请验收', color: 'text-orange-600', bg: 'bg-orange-50' },
  overtime_continue: { label: '超时继续', color: 'text-amber-600', bg: 'bg-amber-50' },
  overtime_abandon: { label: '超时放弃', color: 'text-red-600', bg: 'bg-red-50' },
  complete: { label: '验收通过', color: 'text-green-600', bg: 'bg-green-50' },
  reject: { label: '验收驳回', color: 'text-red-600', bg: 'bg-red-50' },
  continue: { label: '继续执行', color: 'text-blue-600', bg: 'bg-blue-50' },
  reassign: { label: '重新派发', color: 'text-purple-600', bg: 'bg-purple-50' },
  remind: { label: '催办', color: 'text-red-600', bg: 'bg-red-50' },
  extend_deadline: { label: '延期', color: 'text-amber-600', bg: 'bg-amber-50' },
} as const;

// ============================================
// 返工规则
// ============================================
export const REWORK_CONFIG = {
  maxReworkCount: 2,  // 最多驳回2次
} as const;

// ============================================
// 存储容量配置
// ============================================
export const STORAGE_CONFIG = {
  maxRecordsPerTask: 100,     // 每个任务最多100条记录
  archiveAfterDays: 90,       // 90天后归档
  warnThreshold: 0.8,        // 80%时警告
  criticalThreshold: 0.95,     // 95%时清理旧数据
} as const;
