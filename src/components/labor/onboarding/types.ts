// 入职办理模块类型定义

export type OnboardingStatus = '待入职' | '办理中' | '已入职';

/**
 * 入职记录
 */
export interface OnboardingRecord {
  id: string;
  recruitmentId?: string;      // 关联的招聘记录ID
  requestCode?: string;       // 招聘申请编号
  name: string;               // 姓名
  idCard: string;             // 身份证号
  phone: string;              // 联系电话
  position: string;           // 岗位
  department: string;          // 部门
  contractType: ContractType; // 合同类型
  dailyWage?: number;         // 日工资（临时工）
  hourlyWage?: number;        // 时工资
  joinDate: string;           // 入职日期
  status: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
  operatorId: string;
  operatorName: string;
  // 办理进度
  progress?: OnboardingProgress[];
}

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
