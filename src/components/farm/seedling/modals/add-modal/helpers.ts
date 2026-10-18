/**
 * 育苗新增弹窗 — 共享样式与格式化工具
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import { SEED_FORM_OPTIONS } from '../../../../../constants/seedFormDict';
import { SOURCE_TYPE_MAP } from '../../../../../constants/cropConstants';

// 深度输入框样式
export const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/**
 * 种源形态兜底翻译（2026-07-23）
 * - DB 可能是中文（product_form「花朵/果实/种子」12 选）或英文（stock_type fallback「seed/seedling/...」）
 * - 已在 SEED_FORM_OPTIONS 中文词典 → 原样返回
 * - 英文 → 走 SOURCE_TYPE_MAP 翻译
 * - 无匹配 → 原样回显（保留透明度）
 */
export function formatSeedFormDisplay(sf: string | null | undefined): string {
  if (!sf) return '';
  if (SEED_FORM_OPTIONS.some(opt => opt.value === sf)) return sf;
  return SOURCE_TYPE_MAP[sf] || sf;
}
