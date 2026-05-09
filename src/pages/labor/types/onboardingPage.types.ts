/**
 * 入职办理页面类型定义
 */
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';

/** 入职记录状态 */
export type OnboardingStatus = '待入职' | '入职中' | '已完成' | '已取消';

/** 入职记录 */
export interface OnboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  expectedStartDate: string;
  actualStartDate?: string;
  status: OnboardingStatus;
  education?: string;
  major?: string;
  contactPhone?: string;
  emergencyContact?: string;
  idCard?: string;
  bankCard?: string;
  remarks?: string;
}

/** 筛选条件 */
export interface OnboardingFilters {
  employeeName: string;
  department: string;
  status: string;
  startDate: string;
}

/** 表单数据 */
export interface OnboardingFormData {
  employeeName: string;
  department: string;
  position: string;
  expectedStartDate: string;
  education: string;
  major: string;
  contactPhone: string;
  emergencyContact: string;
  idCard: string;
  bankCard: string;
  remarks: string;
}

/** 批量操作模式 */
export type BatchMode = 'none' | 'approve' | 'reject' | 'export';

/** 分页状态 */
export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

/** 在职状态选项 */
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '试用期', label: '试用期' },
  { value: '正式', label: '正式' },
];

/** 状态筛选选项 */
export const ONBOARDING_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待入职', label: '待入职' },
  { value: '入职中', label: '入职中' },
  { value: '已完成', label: '已完成' },
  { value: '已取消', label: '已取消' },
];

/** 状态映射 - 将ApprovalStatus转换为OnboardingStatus */
export function mapOnboardingStatus(status: ApprovalStatus): OnboardingStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待入职';
    case ApprovalStatus.APPROVED: return '已完成';
    case ApprovalStatus.REJECTED: return '已取消';
    case ApprovalStatus.CANCELLED: return '已取消';
    default: return '待入职';
  }
}

/** 状态配置映射 */
export const STATUS_CONFIG_MAP: Record<string, { label: string; status: string }> = {
  '待入职': { label: '待入职', status: 'pending' },
  '入职中': { label: '入职中', status: 'in_progress' },
  '已完成': { label: '已完成', status: 'completed' },
  '已取消': { label: '已取消', status: 'cancelled' },
};
