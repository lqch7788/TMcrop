/**
 * 区块管理配置数据
 * 集中管理土壤类型、灌溉方式等配置数据，避免硬编码
 */

// 土壤类型选项
export const SOIL_TYPES = [
  { value: 'clay', label: '粘土' },
  { value: 'sandy', label: '沙土' },
  { value: 'loam', label: '壤土' },
  { value: 'silt', label: '粉砂土' },
  { value: 'peat', label: '泥炭土' },
  { value: 'sandLoam', label: '沙壤土' },
  { value: 'redSoil', label: '红壤' },
  { value: 'nutrientSoil', label: '营养土' },
];

// 灌溉方式选项
export const IRRIGATION_METHODS = [
  { value: 'drip', label: '滴灌' },
  { value: 'sprinkler', label: '喷灌' },
  { value: 'flood', label: '漫灌' },
  { value: 'furrow', label: '沟灌' },
  { value: 'center_pivot', label: '中心支轴式灌溉' },
  { value: 'manual', label: '人工灌溉' },
  { value: 'microSpray', label: '微喷灌溉' },
  { value: 'subsurface', label: '地下灌溉' },
];

// 区块状态选项
export const BLOCK_STATUS = {
  active: 'active',
  inactive: 'inactive',
} as const;

export type BlockStatus = typeof BLOCK_STATUS[keyof typeof BLOCK_STATUS];

// 区块状态显示配置
export const BLOCK_STATUS_CONFIG = {
  [BLOCK_STATUS.active]: { label: '正常', color: 'emerald' },
  [BLOCK_STATUS.inactive]: { label: '停用', color: 'gray' },
} as const;
