/**
 * 问题状态工具（2026-09-21 新增）
 *
 * 【为什么需要这个文件】
 * 问题状态在 DB 与 store 中统一是英文枚举（pending / in_progress /
 * waiting_acceptance / completed），但前端有 20+ 处直接拿中文去比对，
 * 例如 `problem.status === '已处理'` —— 条件恒为 false，导致一连串功能失效：
 *
 *   · 巡查详情弹窗的「问题验收」按钮永不渲染（DetailInspectionModal）
 *   · 日报统计的 pending / in_progress / resolved 恒为 0（useDailyProblemSummary）
 *   · 状态徽章颜色全部落到 fallback 分支（ProblemTab / DetailInspectionModal / BatchEditModal）
 *
 * 更麻烦的是同一个组件里并存两种写法：有的先经 getStatusCN() 转换再比（正确），
 * 有的直接比（错误）；而 getStatusCN 本身还在 ProblemTab 与 ProblemTable 里各抄了一份
 * （各自的 STATUS_CN_MAP 也有细微出入）。
 *
 * 本文件作为唯一真相源。调用方不要再自行维护状态映射表。
 */

/** 英文枚举 → 中文标签（含若干历史别名，读到脏数据时也不至于把英文原样显示给用户） */
const STATUS_CN_MAP: Record<string, string> = {
  pending: '待处理',
  in_progress: '处理中',
  waiting_acceptance: '待验收',
  completed: '已处理',
  // 别名：历史上不同模块写入过不同取值
  processing: '处理中',
  resolved: '已处理',
  waitingAcceptance: '待验收',
  pending_acceptance: '待验收',
  pendingAcceptance: '待验收',
};

/** 中文标签 → 英文枚举 */
const STATUS_EN_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '待验收': 'waiting_acceptance',
  '已处理': 'completed',
};

/** 问题标准状态（英文枚举） */
export type ProblemStatus = 'pending' | 'in_progress' | 'waiting_acceptance' | 'completed';

/**
 * 状态 → 中文标签；无法识别时原样返回（避免显示空白）
 */
export function problemStatusToCN(status?: string): string {
  if (!status) return '';
  return STATUS_CN_MAP[status] || status;
}

/**
 * 状态 → 英文枚举；无法识别时原样返回
 */
export function problemStatusToEN(status?: string): string {
  if (!status) return '';
  return STATUS_EN_MAP[status] || status;
}

/**
 * 判断状态是否命中目标值 —— 中英文写法都接受，避免调用方踩枚举不一致的坑。
 *
 * @example isProblemStatus(p.status, 'waiting_acceptance')
 *          // 传入 'waiting_acceptance' 或 '待验收' 都返回 true
 */
export function isProblemStatus(status: string | undefined, target: ProblemStatus): boolean {
  return problemStatusToEN(status) === target;
}

/**
 * 是否处于「待验收」状态（决定「问题验收」按钮是否渲染）
 * 兼容多种历史写法，比 isProblemStatus 更宽松
 */
const AWAITING_ACCEPTANCE_VALUES = [
  'waiting_acceptance',
  'waitingAcceptance',
  'pending_acceptance',
  'pendingAcceptance',
  '待验收',
];

export function isProblemAwaitingAcceptance(status?: string): boolean {
  return !!status && AWAITING_ACCEPTANCE_VALUES.includes(status);
}
