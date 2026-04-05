// 合同管理模块类型定义

export type ContractType = '劳动合同' | '实习协议' | '劳务合同';
export type ContractStatus = '生效中' | '即将到期' | '已到期' | '已终止';

/**
 * 合同记录
 */
export interface Contract {
  id: string;
  contractCode: string;      // 合同编号 HT-YYYYMMDD-XXX
  staffId: string;          // 员工ID
  staffName: string;        // 员工姓名
  idCard: string;          // 身份证号
  contractType: ContractType; // 合同类型
  startDate: string;        // 合同开始日期
  endDate: string;         // 合同结束日期
  status: ContractStatus;
  monthlySalary?: number;   // 月薪（劳动合同）
  dailyWage?: number;      // 日工资（劳务合同）
  hourlyWage?: number;     // 时工资（实习协议）
  signingDate?: string;    // 签订日期
  attachments?: string[];   // 附件列表
  remarks?: string;        // 备注
  createdAt: string;
  updatedAt: string;
}

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
