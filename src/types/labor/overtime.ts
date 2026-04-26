/**
 * 加班类型定义 - 人工管理模块
 * 包含加班相关类型定义和枚举
 */

/**
 * 加班类型枚举
 * - WORKDAY: 工作日加班 1.5倍
 * - WEEKEND: 周末加班 2倍
 * - HOLIDAY: 法定节假日加班 3倍
 */
export enum OvertimeType {
  WORKDAY = 'workday',    // 工作日加班 1.5倍
  WEEKEND = 'weekend',    // 周末加班 2倍
  HOLIDAY = 'holiday'     // 法定节假日加班 3倍
}

/**
 * 加班记录状态枚举
 */
export type OvertimeStatus = 'pending' | 'approved' | 'rejected';

/**
 * 加班记录
 * 记录员工每次加班的详细信息
 */
export interface OvertimeRecord {
  /** 记录ID */
  id: string;
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName: string;
  /** 加班日期，格式：YYYY-MM-DD */
  date: string;
  /** 开始时间，格式：HH:mm */
  startTime: string;
  /** 结束时间，格式：HH:mm */
  endTime: string;
  /** 加班小时数 */
  hours: number;
  /** 加班类型 */
  type: OvertimeType;
  /** 基本工资 */
  baseSalary: number;
  /** 时薪（计算得出） */
  hourlyRate: number;
  /** 费率倍数：1.5, 2.0, 3.0 */
  rate: number;
  /** 加班费总额 = hours * hourlyRate * rate */
  totalPay: number;
  /** 审批状态 */
  status: OvertimeStatus;
  /** 创建时间（ISO格式） */
  createdAt: string;
}

/**
 * 月度加班费汇总
 */
export interface OvertimeSummary {
  /** 员工ID */
  employeeId: string;
  /** 月份，格式：YYYY-MM */
  month: string;
  /** 总加班小时数 */
  totalHours: number;
  /** 工作日加班小时数 */
  workdayHours: number;
  /** 周末加班小时数 */
  weekendHours: number;
  /** 法定节假日加班小时数 */
  holidayHours: number;
  /** 加班费总额 */
  totalPay: number;
  /** 加班记录列表 */
  records: OvertimeRecord[];
}

/**
 * 加班记录创建参数
 * 创建时不需要填写计算得出的字段
 */
export interface CreateOvertimeRecordParams {
  /** 员工ID */
  employeeId: string;
  /** 加班日期 */
  date: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 加班小时数 */
  hours: number;
  /** 加班类型 */
  type: OvertimeType;
  /** 基本工资 */
  baseSalary: number;
  /** 审批状态（默认pending） */
  status?: OvertimeStatus;
}

/**
 * 加班记录更新参数
 */
export interface UpdateOvertimeRecordParams {
  /** 加班日期 */
  date?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 加班小时数 */
  hours?: number;
  /** 加班类型 */
  type?: OvertimeType;
  /** 基本工资 */
  baseSalary?: number;
  /** 审批状态 */
  status?: OvertimeStatus;
}

/**
 * 月度加班统计查询参数
 */
export interface OvertimeQueryParams {
  /** 员工ID（可选，不传则查询所有员工） */
  employeeId?: string;
  /** 月份，格式：YYYY-MM */
  month: string;
  /** 加班状态筛选 */
  status?: OvertimeStatus;
}
