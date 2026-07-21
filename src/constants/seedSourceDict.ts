/**
 * 种源管理 UI 字典 & 共享配置
 *
 * - SOURCE_ORIGINS: 9 枚举 source_origin 中文标签
 * - SOURCE_TYPES: 9 枚举 source_type 中文标签
 * - SEED_SOURCE_FILTER_DEFAULTS: 筛选栏初始值（SeedSourcePage + handleReset 共用）
 * - SEED_SOURCE_EXPORT_HEADERS: 导出 Excel 表头（SeedSourcePage 用）
 */

/**
 * 9 种 source_origin 中文标签
 */
export const SOURCE_ORIGINS = [
  { value: 'external_purchase', label: '外购种子' },
  { value: 'direct_seedling', label: '外购种苗' },
  { value: 'tissue_culture', label: '组培繁育' },
  { value: 'grafting', label: '嫁接繁育' },
  { value: 'internal_seed', label: '内部留种' },
  { value: 'seedling_split', label: '分株繁殖' },
  { value: 'cutting', label: '扦插繁殖' },
  { value: 'direct_planting', label: '直接播种' },
  { value: 'external_harvest', label: '外购成品' },
] as const

/**
 * 9 种 source_type 形态中文标签
 */
export const SOURCE_TYPES = [
  { value: 'seed', label: '种子' },
  { value: 'seedling', label: '实生苗' },
  { value: 'cutting', label: '扦插苗' },
  { value: 'grafting', label: '嫁接苗' },
  { value: 'tissue_culture', label: '组培苗' },
  { value: 'split', label: '分株苗' },
  { value: 'bulb', label: '种球' },
  { value: 'self_produced', label: '自繁苗' },
  { value: 'external', label: '外购' },
] as const

// 2026-07-01 P2-1：种源类型 → 供应商类型缩写（AddModal 专用，EditModal 类型不同）
export const ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE: Record<string, string | null> = {
  seed: 'SP',              // 种子 → 原材料供应
  seedling: 'SP',          // 种苗 → 原材料供应
  cutting: 'SP',           // 扦插苗 → 原材料供应
  grafting: 'SP',          // 嫁接苗 → 原材料供应
  tissue_culture: 'SP',    // 组培苗 → 原材料供应
  split: 'SP',             // 分株苗 → 原材料供应
  bulb: 'SP',              // 种球 → 原材料供应
  other: null,             // 其他 → 显示全部供应商
};

// 2026-07-01 P2-12：种源形态 → 简化标签（DetailModal 重复定义）
export const PROPAGATION_FORM_LABELS: Record<string, string> = {
  seed: '种子',
  seedling: '种苗',
  cutting: '扦插苗',
  grafting: '嫁接苗',
  tissue_culture: '组培苗',
  split: '分株苗',
  bulb: '种球',
  flower: '花朵',
  scion: '穗条',
  branch: '枝条',
  root: '块根',
  stem: '块茎',
  bulb_scale: '鳞茎',
  leaf: '叶片',
  whole_plant: '整株',
  other: '其他',
};

// 2026-07-14：筛选默认值抽到共享常量（SeedSourcePage useState + handleReset 共用，避免字段漂移）
export const SEED_SOURCE_FILTER_DEFAULTS = {
  cropCategory: '',
  cropName: '',
  seedCode: '',
  sourceType: '',
  supplierName: '',
  startDate: '',
  endDate: '',
  status: '',
  createBy: '',
  cropType: '',
  orgId: '',
  recorderId: '',
  surplusMin: undefined as number | undefined,
  surplusMax: undefined as number | undefined,
  propagationType: undefined as string | undefined,
  propagationStatus: undefined as string | undefined,
  // 2026-07-21：回流合并筛选（列表已删除回流次数字段，移到筛选器）
  reflowFilter: '' as 'has_reflow' | 'no_reflow' | '',
};

// 2026-07-14：导出 Excel 表头抽到共享常量（避免硬编码在组件内）
export const SEED_SOURCE_EXPORT_HEADERS = [
  '种源图片（链接）', '种源批号', '种源类型', '作物类别',
  '作物品种（最细化）', '作物品种（细分品种）', '品种路径',
  '供应商', '采购日期', '采购数量', '单位', '单价(元)', '总金额(元)',
  '初始数量', '可用数量', '库存状态', '溯源码', '创建人', '创建时间', '备注',
] as const;
