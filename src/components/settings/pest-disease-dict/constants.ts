/**
 * 病虫害字典共享常量（2026-08-15）
 * 消除 AddPestDiseaseModal / EditPestDiseaseModal 中的重复定义
 * 修复：两个弹窗类型选项不一致（Add 7 类缺「调节剂」、Edit 8 类），统一为 8 类
 */

/** 药剂类型筛选选项（对齐药剂库字典 dict_code，含 2026-07-17 新增的调节剂） */
export const PESTICIDE_TYPE_OPTIONS = [
  { code: 'insecticide', label: '杀虫剂', emoji: '🐛', active: 'bg-red-500', idle: 'bg-red-50 text-red-600 border-red-200' },
  { code: 'fungicide', label: '杀菌剂', emoji: '🦠', active: 'bg-cyan-500', idle: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { code: 'herbicide', label: '除草剂', emoji: '🌿', active: 'bg-emerald-500', idle: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { code: 'acaricide', label: '杀螨剂', emoji: '🕷️', active: 'bg-purple-500', idle: 'bg-purple-50 text-purple-600 border-purple-200' },
  { code: 'plant_growth_regulator', label: '调节剂', emoji: '🌱', active: 'bg-violet-500', idle: 'bg-violet-50 text-violet-600 border-violet-200' },
  { code: 'protective', label: '保护剂', emoji: '🛡️', active: 'bg-blue-500', idle: 'bg-blue-50 text-blue-600 border-blue-200' },
  { code: 'adjuvant', label: '助剂', emoji: '💧', active: 'bg-amber-500', idle: 'bg-amber-50 text-amber-600 border-amber-200' },
  { code: 'other', label: '其他', emoji: '📦', active: 'bg-gray-500', idle: 'bg-gray-50 text-gray-600 border-gray-200' },
] as const;

export type PesticideTypeCode = typeof PESTICIDE_TYPE_OPTIONS[number]['code'];
