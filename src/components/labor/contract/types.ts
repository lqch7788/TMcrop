// 合同管理模块类型定义

export type ContractType = '劳动合同' | '实习协议' | '劳务合同';
export type ContractStatus = '生效中' | '即将到期' | '已到期' | '已终止';

/**
 * 合同记录：直接复用 service 的 ContractData（数据源唯一，避免两套字段名/必填性漂移）
 */
export type { ContractData as Contract } from '../../../services/apiContractService';

/**
 * 合同表单数据
 */
export interface ContractFormData {
  staffName: string;
  idCard: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  remarks?: string;
}

/**
 * 合同筛选条件
 */
export interface ContractFilters {
  status: ContractStatus | '';
  contractType: ContractType | '';
  keyword: string;
}

/**
 * 合同分页
 */
export interface ContractPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}
