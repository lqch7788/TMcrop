/**
 * 请假管理配置数据
 * 集中管理请假类型、状态等配置数据，避免硬编码
 */

// 请假类型选项
export const LEAVE_TYPE_OPTIONS = [
  { value: '年假', label: '年假' },
  { value: '病假', label: '病假' },
  { value: '事假', label: '事假' },
  { value: '婚假', label: '婚假' },
  { value: '产假', label: '产假' },
  { value: '陪产假', label: '陪产假' },
  { value: '丧假', label: '丧假' },
  { value: '工伤假', label: '工伤假' },
] as const;

// 请假状态筛选选项
export const LEAVE_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
  { value: '已取消', label: '已取消' },
] as const;

// 请假状态颜色映射
export const LEAVE_STATUS_COLORS: Record<string, string> = {
  '待审批': 'bg-amber-100 text-amber-700',
  '已通过': 'bg-emerald-100 text-emerald-700',
  '已拒绝': 'bg-red-100 text-red-700',
  '已撤回': 'bg-gray-100 text-gray-600',
  '已取消': 'bg-gray-100 text-gray-500',
};
