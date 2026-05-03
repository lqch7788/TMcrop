/**
 * 公告管理配置数据
 * 集中管理公告类型、优先级、状态等配置数据，避免硬编码
 */

// 公告类型
export const ANNOUNCEMENT_TYPES = [
  { name: '生产公告', color: 'from-blue-500 to-blue-600', icon: '🌱' },
  { name: '行政公告', color: 'from-purple-500 to-purple-600', icon: '📋' },
] as const;

// 公告分类
export const ANNOUNCEMENT_CATEGORIES = [
  '全部',
  '生产计划',
  '技术标准',
  '行政通知',
  '培训通知',
  '安全规范',
  '采购通知',
  '设备维护',
  '活动通知',
  '制度修订',
] as const;

// 优先级选项
export const PRIORITY_OPTIONS = ['高', '中', '低'] as const;

// 状态选项
export const STATUS_OPTIONS = {
  published: '已发布',
  pending: '审批中',
  draft: '草稿',
} as const;

// 状态颜色映射
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '已发布': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  '审批中': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  '草稿': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

// 优先级颜色映射
export const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '高': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  '中': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  '低': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};
