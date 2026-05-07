/**
 * 设备管理配置数据
 * 集中管理设备类型等配置数据，避免硬编码
 */

// 设备类型选项
export const DEVICE_TYPES = [
  '传感器',
  '摄像头',
  '控制器',
  '气象站',
  '灌溉设备',
  '施肥设备',
  '其他',
] as const;

// 设备状态
export const DEVICE_STATUS = {
  online: '在线',
  offline: '离线',
  maintenance: '维护中',
} as const;

// 设备状态颜色
export const DEVICE_STATUS_COLORS: Record<string, string> = {
  online: 'bg-emerald-100 text-emerald-700',
  offline: 'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-100 text-amber-700',
};
