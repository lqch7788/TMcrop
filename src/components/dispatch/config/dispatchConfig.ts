/**
 * 任务派发配置
 * 包含推荐算法权重、超时配置等
 */

/**
 * 派工决策因素权重配置
 */
export const DISPATCH_WEIGHTS = {
  // 农事任务模式（3因子简化版）
  farm: {
    workload: 0.5,    // 工作量/负荷 50%
    skill: 0.3,       // 技能匹配度 30%
    location: 0.2,    // 地理位置 20%
  },
  // 智能派工模式（5因子完整版）
  smart: {
    skillMatch: 0.30,          // 技能匹配度 30%
    location: 0.25,            // 地理位置 25%
    currentLoad: 0.20,         // 当前负荷 20%
    historicalPerformance: 0.15, // 历史表现 15%
    urgency: 0.10,            // 紧急程度 10%
  },
} as const;

/**
 * 超时配置
 */
export const OVERTIME_CONFIG = {
  // 接受超时阈值
  acceptWarningHours: 12,      // 接受超时预警：12小时
  acceptCriticalHours: 24,     // 接受超时危急：24小时

  // 执行超时阈值
  executionWarningHours: 24,   // 执行超时预警：24小时

  // 验收超时阈值
  acceptanceWarningHours: 24,  // 验收超时预警：24小时
  acceptanceCriticalHours: 48, // 验收超时危急：48小时

  // 延期限制
  maxExtensions: 3,           // 最多延期3次
  maxExtensionHours: 72,       // 每次最多延期72小时
  totalMaxExtensionHours: 168, // 总计最多延期168小时
} as const;

/**
 * 催办配置
 */
export const REMINDER_CONFIG = {
  reminderMinIntervalMinutes: 60,  // 催办间隔至少60分钟
  maxRemindersPerDay: 5,          // 每天最多催办5次
} as const;

/**
 * 返工配置
 */
export const REWORK_CONFIG = {
  maxReworkCount: 2,  // 最多返工2次
} as const;

/**
 * 优先级配置
 */
export const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'red', weight: 100 },
  high: { label: '高', color: 'orange', weight: 80 },
  normal: { label: '普通', color: 'blue', weight: 60 },
  low: { label: '低', color: 'gray', weight: 40 },
} as const;

/**
 * 状态配置
 */
export const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待接受', color: 'gray' },
  accepted: { label: '已接受', color: 'blue' },
  in_progress: { label: '处理中', color: 'blue' },
  waiting_acceptance: { label: '待验收', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '返工中', color: 'red' },
  failed: { label: '任务失败', color: 'purple' },
  cancelled: { label: '已取消', color: 'gray' },
  abandoned: { label: '已放弃', color: 'red' },
} as const;
