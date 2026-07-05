/**
 * 2026-07-05: 操作列图标样式统一 token
 *
 * 解决：种源 / 育苗 / 种植三个表格的同语义按钮颜色不一致问题
 * 原则：每个 variant 对应一个"业务语义"，颜色按"语义即颜色"映射
 * 用法：与 ActionIconButton 组件搭配使用（见 src/components/ui/ActionIconButton.tsx）
 *
 * 多状态分支（如 isEnded / isCancelled）：通过 ActionIconButton 的 className 覆盖
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ACTION_ICON_TOKENS = {
  // 通用动作
  edit:     'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
  view:     'text-gray-700 hover:text-blue-600 hover:bg-blue-50',
  delete:   'text-red-600 hover:text-red-700 hover:bg-red-50',

  // 记录类（每日记录 / 育种 / 留种）
  record:   'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
  breeding: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
  seedSave: 'text-amber-600 hover:text-amber-700 hover:bg-amber-50',

  // 仓库类（种源特有：标签 / 调拨 / 入库 / 退库）
  tag:      'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
  transfer: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
  inbound:  'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
  return_:  'text-amber-600 hover:text-amber-700 hover:bg-amber-50',

  // 状态类（采收 / 结束）
  harvest:  'text-orange-500 hover:text-orange-600 hover:bg-orange-50',
  end:      'text-gray-600 hover:text-gray-700 hover:bg-gray-50',

  // 多状态分支专用（用于 isEnded / isCancelled 覆盖）
  cancelled: 'text-gray-400 hover:text-gray-500 hover:bg-gray-50',
  disabled:  'text-gray-400 cursor-not-allowed opacity-40',
} as const;

export type ActionIconVariant = keyof typeof ACTION_ICON_TOKENS;