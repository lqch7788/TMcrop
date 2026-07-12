/**
 * 药剂库共享常量
 * 2026-07-12：扁平化重构，提取共享选项避免 Add/Edit 弹窗重复定义
 */

// 农药剂型选项（完整列表）
export const FORMULATION_OPTIONS = [
  { value: '可湿性粉剂', label: '可湿性粉剂 (WP)' },
  { value: '水分散粒剂', label: '水分散粒剂 (WDG)' },
  { value: '悬浮剂', label: '悬浮剂 (SC)' },
  { value: '乳油', label: '乳油 (EC)' },
  { value: '水剂', label: '水剂 (AS)' },
  { value: '可溶性粉剂', label: '可溶性粉剂 (SP)' },
  { value: '颗粒剂', label: '颗粒剂 (GR)' },
  { value: '微胶囊悬浮剂', label: '微胶囊悬浮剂 (CS)' },
  { value: '油剂', label: '油剂 (OL)' },
  { value: '粉剂', label: '粉剂 (DP)' },
  { value: '片剂', label: '片剂 (WT)' },
  { value: '烟剂', label: '烟剂 (FU)' },
  { value: '气雾剂', label: '气雾剂 (AE)' },
  { value: '蚊香', label: '蚊香 (CO)' },
  { value: '饵剂', label: '饵剂 (RB)' },
  { value: '胶饵', label: '胶饵 (GL)' },
  { value: '悬浮种衣剂', label: '悬浮种衣剂 (FS)' },
  { value: '种子处理悬浮剂', label: '种子处理悬浮剂 (SS)' },
  { value: '泡腾片剂', label: '泡腾片剂 (EB)' },
  { value: '水乳剂', label: '水乳剂 (EW)' },
  { value: '微乳剂', label: '微乳剂 (ME)' },
  { value: '悬乳剂', label: '悬乳剂 (SE)' },
  { value: '可分散油悬浮剂', label: '可分散油悬浮剂 (OD)' },
  { value: '乳粒剂', label: '乳粒剂 (EG)' },
  { value: '缓释剂', label: '缓释剂 (BR)' },
  { value: '可分散液剂', label: '可分散液剂 (DC)' },
  { value: '可湿性粒剂', label: '可湿性粒剂 (WG)' },
  { value: '可溶液剂', label: '可溶液剂 (SL)' },
  { value: '膏剂', label: '膏剂 (PA)' },
  { value: '其他', label: '其他' },
] as const;

// 库存单位选项（对齐肥料库）
export const STOCK_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg（千克）' },
  { value: 'g', label: 'g（克）' },
  { value: 't', label: 't（吨）' },
  { value: 'L', label: 'L（升）' },
  { value: 'mL', label: 'mL（毫升）' },
  { value: '袋', label: '袋' },
  { value: '包', label: '包' },
  { value: '桶', label: '桶' },
  { value: '瓶', label: '瓶' },
  { value: '块', label: '块' },
] as const;
