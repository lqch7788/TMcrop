/**
 * 作物形态/类型英文 → 中文映射
 * 用途：兼容历史 seed_sources 表里英文字段值（'seed'/'seedling'/'plant'/'flower' 等）
 *       + 老 inventory_stock.productForm 英文字段值
 * 2026-07-09：列表 + 详情共用
 */
export const FORM_EN_TO_CN: Record<string, string> = {
  seed: '种子',
  seedling: '种苗',
  plant: '整株',
  flower: '花朵',
  fruit: '果实',
  leaf: '叶片',
  tuber: '块茎',
  bulb: '鳞茎',
  branch: '枝条',
  root: '块根',
  rhizome: '根茎',
  whole_plant: '整株',
  cutting: '穗条',
  spike: '穗条',
  other: '其他',
};

/**
 * 把英文字段值翻译为中文；已是中文则原样返回
 */
export function translateForm(value: string | null | undefined): string {
  if (!value) return '';
  return FORM_EN_TO_CN[value] || value;
}