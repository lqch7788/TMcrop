/**
 * 人工管理配置数据
 * 集中管理人工管理相关页面的配置数据，避免硬编码
 */

// ============================================
// 通用状态选项
// ============================================

export const LABOR_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
] as const;

export const LABOR_STATUS_COLORS: Record<string, string> = {
  '待审批': 'bg-amber-100 text-amber-700',
  '已通过': 'bg-emerald-100 text-emerald-700',
  '已拒绝': 'bg-red-100 text-red-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

// ============================================
// 请假相关
// ============================================

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

// ============================================
// 加班相关
// ============================================

export const OVERTIME_TYPE_OPTIONS = [
  { value: '工作日加班', label: '工作日加班' },
  { value: '休息日加班', label: '休息日加班' },
  { value: '节假日加班', label: '节假日加班' },
] as const;

// ============================================
// 考勤补卡相关
// ============================================

export const REPAIR_REASON_OPTIONS = [
  { value: '忘打卡', label: '忘打卡' },
  { value: '设备故障', label: '设备故障' },
  { value: '外出办公', label: '外出办公' },
  { value: '其他', label: '其他' },
] as const;

// ============================================
// 合同相关
// ============================================

export const CONTRACT_PERIOD_OPTIONS = [
  { value: '1年', label: '1年' },
  { value: '2年', label: '2年' },
  { value: '3年', label: '3年' },
  { value: '5年', label: '5年' },
  { value: '无固定期限', label: '无固定期限' },
] as const;

// ============================================
// 入职相关
// ============================================

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '试用期', label: '试用期' },
  { value: '正式员工', label: '正式员工' },
  { value: '临时工', label: '临时工' },
  { value: '外包', label: '外包' },
] as const;

// ============================================
// 招聘相关
// ============================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '全职', label: '全职' },
  { value: '兼职', label: '兼职' },
  { value: '实习', label: '实习' },
  { value: '外包', label: '外包' },
] as const;

export const RECRUITMENT_PRIORITY_OPTIONS = [
  { value: '紧急', label: '紧急', color: 'red' },
  { value: '高', label: '高', color: 'orange' },
  { value: '中', label: '中', color: 'blue' },
  { value: '低', label: '低', color: 'gray' },
] as const;

// ============================================
// 离职相关
// ============================================

export const RESIGNATION_TYPE_OPTIONS = [
  { value: '主动离职', label: '主动离职' },
  { value: '被动离职', label: '被动离职' },
  { value: '合同到期', label: '合同到期' },
  { value: '退休', label: '退休' },
] as const;

// ============================================
// 调薪相关
// ============================================

export const ADJUSTMENT_TYPE_OPTIONS = [
  { value: '晋升调薪', label: '晋升调薪' },
  { value: '年度调薪', label: '年度调薪' },
  { value: '绩效调薪', label: '绩效调薪' },
  { value: '市场调薪', label: '市场调薪' },
  { value: '其他', label: '其他' },
] as const;
