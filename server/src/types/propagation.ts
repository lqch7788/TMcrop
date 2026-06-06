/**
 * 繁殖阶段常量（C6: 强约束）
 *
 * 注意：本文件是运行时 .ts（不是 .d.ts），必须能产出实际 JS 值供运行时使用。
 * .d.ts 文件只能放 type/interface，运行时 const 必须放在 .ts 中。
 */

/** 允许的繁殖阶段枚举值 */
export const PROPAGATION_STAGES = [
  'planned',
  'in_progress',
  'harvested',
  'quality_checked',
  'completed',
  'failed',
] as const;

/** 阶段字面量联合类型 */
export type PropagationStage = typeof PROPAGATION_STAGES[number];

/**
 * 推进阶段时允许的合法 next_stage 集合（C6: 禁止跳跃/倒回）
 * 任何状态都可显式跳到 'failed'，终态（completed/failed）不可再变更。
 */
export const PROPAGATION_NEXT_STAGES: Record<PropagationStage, PropagationStage[]> = {
  planned: ['in_progress', 'failed'],
  in_progress: ['harvested', 'failed'],
  harvested: ['quality_checked', 'failed'],
  quality_checked: ['completed', 'failed'],
  completed: [],
  failed: [],
};
