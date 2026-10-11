// 入职办理模块类型定义

// 2026-10-11 类型清理：入职记录统一使用 service 侧权威类型（apiOnboardingService.OnboardingRecord）
import type { OnboardingRecord as ApiOnboardingRecord } from '@/services/apiOnboardingService';

export type OnboardingStatus = '待入职' | '办理中' | '已入职';

/**
 * 入职记录
 *
 * 2026-10-11 类型清理：统一使用 service 侧权威类型，不再重复定义，
 * 避免与 useOnboarding 返回的数据类型互不兼容
 */
export type OnboardingRecord = ApiOnboardingRecord;

export type ContractType = '劳动合同' | '实习协议' | '劳务合同';

/**
 * 入职办理进度
 */
export interface OnboardingProgress {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: string;
  remark?: string;
}

/**
 * 入职表单数据
 */
export interface OnboardingFormData {
  name: string;
  idCard: string;
  phone: string;
  position: string;
  department: string;
  contractType: ContractType;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
  skillTags?: string[];
  workZones?: string[];
  insuranceType?: string;
  source?: string;
}

/**
 * 筛选条件
 */
export interface OnboardingFilters {
  status: OnboardingStatus | '';
  keyword: string;
}

/**
 * 分页信息
 */
export interface OnboardingPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}
