/**
 * 招聘申请类型定义
 */

/** 用工类型选项 */
export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '正式工', label: '正式工' },
  { value: '临时工', label: '临时工' },
  { value: '季节工', label: '季节工' },
  { value: '实习生', label: '实习生' },
] as const;

/** 优先级选项 */
export const PRIORITY_OPTIONS = [
  { value: '紧急', label: '紧急', color: 'red' },
  { value: '高', label: '高', color: 'orange' },
  { value: '普通', label: '普通', color: 'blue' },
  { value: '低', label: '低', color: 'gray' },
] as const;

/** 招聘记录状态 */
export type RecruitmentStatus = '待审批' | '已通过' | '已拒绝' | '已撤回';

/**
 * 招聘记录
 */
export interface RecruitmentRecord {
  id: string;
  recruitmentCode: string;
  deptId: string;
  deptName: string;
  positionId: string;
  position: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  priority: string;
  status: RecruitmentStatus;
  reason: string;
  remarks?: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
}

/**
 * 筛选条件
 */
export interface RecruitmentFilters {
  recruitmentCode: string;
  deptId: string;
  position: string;
  status: RecruitmentStatus | '';
  priority: string;
}

/**
 * 表单数据
 */
export interface RecruitmentFormData {
  deptId: string;
  positionId: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  priority: string;
  reason: string;
  remarks: string;
}

/**
 * 分页状态
 */
export interface RecruitmentPagination {
  current: number;
  pageSize: number;
  total: number;
}

/**
 * 状态选项
 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已撤回', label: '已撤回' },
] as const;
