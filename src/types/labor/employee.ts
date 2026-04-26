/**
 * 员工类型定义 - 人工管理模块
 * 包含员工主数据模型及相关类型定义
 */

// 员工类型枚举
export type EmployeeType = 'FULL_TIME' | 'PART_TIME' | 'TEMPORARY' | 'INTERNSHIP';

// 员工状态枚举
export type EmployeeStatus = 'ON_BOARD' | 'PROBATION' | 'LEAVED';

/**
 * 员工主数据模型
 * 用于存储员工基本信息
 */
export interface Employee {
  /** 员工ID，格式: EMP-YYYYMMDD-XXX */
  id: string;
  /** 员工姓名 */
  name: string;
  /** 部门ID */
  deptId: string;
  /** 岗位ID */
  positionId: string;
  /** 联系电话 */
  phone: string;
  /** 电子邮箱 */
  email: string;
  /** 入职日期，格式: YYYY-MM-DD */
  hireDate: string;
  /** 员工类型：全职、兼职、临时工、实习 */
  employeeType: EmployeeType;
  /** 员工状态：在编、试用期、离职 */
  status: EmployeeStatus;
  /** 基本工资 */
  salary: number;
}

/**
 * 员工查询过滤器
 */
export interface EmployeeFilter {
  /** 部门ID筛选 */
  deptId?: string;
  /** 岗位ID筛选 */
  positionId?: string;
  /** 员工类型筛选 */
  employeeType?: EmployeeType;
  /** 员工状态筛选 */
  status?: EmployeeStatus;
  /** 姓名关键字搜索 */
  name?: string;
}

/**
 * 员工创建参数
 */
export interface CreateEmployeeParams {
  name: string;
  deptId: string;
  positionId: string;
  phone: string;
  email: string;
  hireDate: string;
  employeeType: EmployeeType;
  salary: number;
}

/**
 * 员工更新参数
 */
export interface UpdateEmployeeParams {
  name?: string;
  deptId?: string;
  positionId?: string;
  phone?: string;
  email?: string;
  employeeType?: EmployeeType;
  status?: EmployeeStatus;
  salary?: number;
}

/**
 * 请假类型枚举
 */
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MARRIAGE' | 'MATERNITY' | 'PATERNITY' | 'FUNERAL' | 'WORK_INJURY';

/**
 * 请假额度记录
 */
export interface LeaveQuota {
  /** 员工ID */
  employeeId: string;
  /** 请假类型 */
  leaveType: LeaveType;
  /** 年度总天数 */
  totalDays: number;
  /** 已使用天数 */
  usedDays: number;
  /** 冻结天数（申请中） */
  frozenDays: number;
  /** 剩余可用天数 */
  availableDays: number;
  /** 年度 */
  year: number;
}

/**
 * 请假申请记录
 */
export interface LeaveRecord {
  /** 记录ID */
  id: string;
  /** 员工ID */
  employeeId: string;
  /** 请假类型 */
  leaveType: LeaveType;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 天数 */
  days: number;
  /** 申请状态 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  /** 申请时间 */
  applyTime: string;
  /** 审批时间 */
  approveTime?: string;
  /** 审批人ID */
  approverId?: string;
  /** 审批备注 */
  remark?: string;
}
