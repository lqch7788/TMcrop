/**
 * 通用单位常量
 * 用于病虫害防治、药剂、肥料等模块的单位选择
 * 包含简单单位和复合单位
 */

// ============================================
// 简单单位（常用于药剂/叶面肥的用量）
// ============================================
export const SIMPLE_UNITS = [
  { value: '克', label: '克 (g)' },
  { value: '千克', label: '千克 (kg)' },
  { value: '毫升', label: '毫升 (mL)' },
  { value: '升', label: '升 (L)' },
  { value: '袋', label: '袋' },
  { value: '瓶', label: '瓶' },
];

// ============================================
// 复合单位（常用于药剂规格的用量单位）
// ============================================
export const COMPOUND_UNITS = [
  { value: 'g/桶', label: 'g/桶' },
  { value: 'kg/桶', label: 'kg/桶' },
  { value: 'mL/桶', label: 'mL/桶' },
  { value: 'L/桶', label: 'L/桶' },
  { value: 'g/亩', label: 'g/亩' },
  { value: 'kg/亩', label: 'kg/亩' },
  { value: 'mL/亩', label: 'mL/亩' },
  { value: 'L/亩', label: 'L/亩' },
  { value: 'g/hm²', label: 'g/hm²' },
  { value: 'kg/hm²', label: 'kg/hm²' },
  { value: '倍液', label: '倍液' },
  { value: '其他', label: '其他' },
];

// ============================================
// 所有单位（合并简单单位 + 复合单位）
// ============================================
export const ALL_UNITS = [
  ...SIMPLE_UNITS,
  ...COMPOUND_UNITS,
];

// ============================================
// 推荐的用量单位（用于病虫害防治页面）
// 包含简单单位和常用复合单位
// ============================================
export const DOSAGE_UNITS = [
  // 简单单位
  { value: '克', label: '克 (g)' },
  { value: '千克', label: '千克 (kg)' },
  { value: '毫升', label: '毫升 (mL)' },
  { value: '升', label: '升 (L)' },
  { value: '袋', label: '袋' },
  { value: '瓶', label: '瓶' },
  // 复合单位
  { value: 'g/桶', label: 'g/桶' },
  { value: 'kg/桶', label: 'kg/桶' },
  { value: 'mL/桶', label: 'mL/桶' },
  { value: 'L/桶', label: 'L/桶' },
  { value: 'g/亩', label: 'g/亩' },
  { value: 'kg/亩', label: 'kg/亩' },
  { value: 'mL/亩', label: 'mL/亩' },
  { value: 'L/亩', label: 'L/亩' },
  { value: 'g/hm²', label: 'g/hm²' },
  { value: 'kg/hm²', label: 'kg/hm²' },
  { value: '倍液', label: '倍液' },
  { value: '其他', label: '其他' },
];

// ============================================
// 药剂规格单位（用于药剂库规格编辑器）
// ============================================
export const PESTICIDE_SPEC_UNITS = COMPOUND_UNITS;
