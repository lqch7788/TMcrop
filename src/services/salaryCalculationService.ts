/**
 * 薪酬计算服务 - 人工管理模块
 * 处理员工月度工资计算、请假扣款、全勤奖、加班费汇总等业务
 */

import { OvertimeSummary } from '../types/labor/overtime';
import { LeaveType } from '../types/labor/employee';
import { overtimeCalculationService } from './overtimeCalculationService';

// LocalStorage存储键名
const STORAGE_KEY = 'SALARY_RECORDS';

// 每月工作天数（标准月薪计算基数）
const WORK_DAYS_PER_MONTH = 21.75;

// 全勤奖金额（可根据公司政策调整）
const FULL_ATTENDANCE_BONUS = 500;

// 请假扣款比例配置
const LEAVE_DEDUCTION_RATES: Record<LeaveType, number> = {
  ANNUAL: 0,       // 年假：带薪，扣款0%
  SICK: 0.5,       // 病假：日薪 * 50%
  PERSONAL: 1.0,    // 事假：日薪 * 100%
  MARRIAGE: 0,      // 婚假：带薪，扣款0%
  MATERNITY: 0,     // 产假：带薪，扣款0%
  PATERNITY: 0,     // 陪产假：带薪，扣款0%
  FUNERAL: 0,       // 丧假：带薪，扣款0%
  WORK_INJURY: 0,   // 工伤假：带薪，扣款0%
};

/**
 * 请假扣款明细
 */
export interface LeaveDeduction {
  /** 请假类型 */
  leaveType: string;
  /** 请假天数 */
  days: number;
  /** 日薪 */
  dailyRate: number;
  /** 扣款金额 */
  deduction: number;
}

/**
 * 月度工资计算结果
 */
export interface SalaryCalculationResult {
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName: string;
  /** 月份（YYYY-MM） */
  month: string;
  /** 基本工资 */
  baseSalary: number;
  /** 实际工资 = 基本工资 - 请假扣款 + 加班费 + 全勤奖 */
  actualSalary: number;
  /** 应出勤天数 */
  workingDays: number;
  /** 实际出勤天数 */
  actualDays: number;
  /** 迟到扣款 */
  lateDeduction: number;
  /** 缺勤扣款 */
  absenceDeduction: number;
  /** 请假扣款明细列表 */
  leaveDeductions: LeaveDeduction[];
  /** 加班费 */
  overtimePay: number;
  /** 全勤奖 */
  fullAttendanceBonus: number;
  /** 总扣款 */
  totalDeduction: number;
  /** 最终工资 */
  finalSalary: number;
}

/**
 * 工资记录（用于LocalStorage存储）
 */
export interface SalaryRecord {
  /** 记录ID */
  id: string;
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName: string;
  /** 月份（YYYY-MM） */
  month: string;
  /** 基本工资 */
  baseSalary: number;
  /** 应出勤天数 */
  workingDays: number;
  /** 实际出勤天数 */
  actualDays: number;
  /** 迟到次数 */
  lateCount: number;
  /** 迟到扣款 */
  lateDeduction: number;
  /** 缺勤天数 */
  absenceDays: number;
  /** 缺勤扣款 */
  absenceDeduction: number;
  /** 请假记录列表（已批准的） */
  leaveRecords: Array<{
    leaveType: LeaveType;
    days: number;
    deduction: number;
  }>;
  /** 加班费 */
  overtimePay: number;
  /** 全勤奖 */
  fullAttendanceBonus: number;
  /** 总扣款 */
  totalDeduction: number;
  /** 最终工资 */
  finalSalary: number;
  /** 计算时间 */
  calculatedAt: string;
}

/**
 * 工资计算输入参数
 */
export interface SalaryCalculationParams {
  /** 员工ID */
  employeeId: string;
  /** 员工姓名 */
  employeeName: string;
  /** 月份（YYYY-MM） */
  month: string;
  /** 基本工资 */
  baseSalary: number;
  /** 应出勤天数 */
  workingDays: number;
  /** 实际出勤天数 */
  actualDays: number;
  /** 迟到次数 */
  lateCount: number;
  /** 缺勤天数 */
  absenceDays: number;
  /** 请假记录列表 */
  leaveRecords: Array<{
    leaveType: LeaveType;
    days: number;
  }>;
}

/**
 * 从LocalStorage获取工资记录列表
 */
function getStoredRecords(): SalaryRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('读取工资记录数据失败');
    return [];
  }
}

/**
 * 保存工资记录列表到LocalStorage
 */
function saveRecords(records: SalaryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存工资记录数据失败:', error);
  }
}

/**
 * 生成工资记录ID
 */
function generateRecordId(employeeId: string, month: string): string {
  return `SALARY-${employeeId}-${month}-${Date.now()}`;
}

/**
 * 计算日薪
 * 公式：月薪 / 21.75
 * @param baseSalary 基本工资
 * @returns 日薪
 */
function calculateDailyRate(baseSalary: number): number {
  if (baseSalary <= 0) return 0;
  return baseSalary / WORK_DAYS_PER_MONTH;
}

/**
 * 计算出勤率
 * @param actualDays 实际出勤天数
 * @param workingDays 应出勤天数
 * @returns 出勤率（百分比）
 */
function calculateAttendanceRate(actualDays: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return (actualDays / workingDays) * 100;
}

/**
 * 薪酬计算服务类
 */
export class SalaryCalculationService {
  /**
   * 计算日薪
   * 公式：月薪 / 21.75
   * @param baseSalary 基本工资
   * @returns 日薪
   */
  calculateDailyRate(baseSalary: number): number {
    return calculateDailyRate(baseSalary);
  }

  /**
   * 计算请假扣款
   * @param baseSalary 基本工资
   * @param leaveRecords 请假记录列表
   * @returns 请假扣款明细列表及总扣款
   */
  calculateLeaveDeductions(
    baseSalary: number,
    leaveRecords: Array<{ leaveType: LeaveType; days: number }>
  ): { deductions: LeaveDeduction[]; totalDeduction: number } {
    const dailyRate = calculateDailyRate(baseSalary);
    const deductions: LeaveDeduction[] = [];
    let totalDeduction = 0;

    leaveRecords.forEach(record => {
      const rate = LEAVE_DEDUCTION_RATES[record.leaveType] ?? 1.0;  // 默认按100%扣款
      const deduction = dailyRate * record.days * rate;

      deductions.push({
        leaveType: record.leaveType,
        days: record.days,
        dailyRate: Math.round(dailyRate * 100) / 100,
        deduction: Math.round(deduction * 100) / 100,
      });

      totalDeduction += deduction;
    });

    return {
      deductions,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
    };
  }

  /**
   * 计算全勤奖
   * 条件：出勤率 = 100%
   * @param actualDays 实际出勤天数
   * @param workingDays 应出勤天数
   * @returns 全勤奖金额
   */
  calculateFullAttendanceBonus(actualDays: number, workingDays: number): number {
    const attendanceRate = calculateAttendanceRate(actualDays, workingDays);
    return attendanceRate === 100 ? FULL_ATTENDANCE_BONUS : 0;
  }

  /**
   * 计算迟到扣款
   * 每次迟到扣款50元
   * @param lateCount 迟到次数
   * @returns 迟到扣款总额
   */
  calculateLateDeduction(lateCount: number): number {
    const LATE_DEDUCTION_PER_TIME = 50;  // 每次迟到扣款50元
    return lateCount * LATE_DEDUCTION_PER_TIME;
  }

  /**
   * 计算缺勤扣款
   * 缺勤一天扣一天工资
   * @param absenceDays 缺勤天数
   * @param baseSalary 基本工资
   * @returns 缺勤扣款总额
   */
  calculateAbsenceDeduction(absenceDays: number, baseSalary: number): number {
    const dailyRate = calculateDailyRate(baseSalary);
    return Math.round(absenceDays * dailyRate * 100) / 100;
  }

  /**
   * 获取员工月度加班费
   * 调用overtimeCalculationService计算月度加班费汇总
   * @param employeeId 员工ID
   * @param month 月份（YYYY-MM）
   * @returns 月度加班费汇总
   */
  getMonthlyOvertime(employeeId: string, month: string): OvertimeSummary {
    return overtimeCalculationService.calculateMonthlyOvertime(employeeId, month);
  }

  /**
   * 计算员工月度工资
   * 核心计算方法，整合各项工资组成部分
   * @param params 工资计算参数
   * @returns 工资计算结果
   */
  calculateMonthlySalary(params: SalaryCalculationParams): SalaryCalculationResult {
    const {
      employeeId,
      employeeName,
      month,
      baseSalary,
      workingDays,
      actualDays,
      lateCount,
      absenceDays,
      leaveRecords,
    } = params;

    // 1. 计算基本工资（实际出勤工资）
    // 公式：日薪 * 实际出勤天数 = 基本工资 / 21.75 * 实际出勤天数
    const dailyRate = calculateDailyRate(baseSalary);
    const baseSalaryForActualDays = dailyRate * actualDays;

    // 2. 计算请假扣款
    const { deductions: leaveDeductions, totalDeduction: totalLeaveDeduction } =
      this.calculateLeaveDeductions(baseSalary, leaveRecords);

    // 3. 获取月度加班费（只统计已批准的加班记录）
    const overtimeSummary = this.getMonthlyOvertime(employeeId, month);
    const overtimePay = overtimeSummary.totalPay;

    // 4. 计算全勤奖
    const fullAttendanceBonus = this.calculateFullAttendanceBonus(actualDays, workingDays);

    // 5. 计算迟到扣款
    const lateDeduction = this.calculateLateDeduction(lateCount);

    // 6. 计算缺勤扣款
    const absenceDeduction = this.calculateAbsenceDeduction(absenceDays, baseSalary);

    // 7. 计算总扣款
    const totalDeduction = Math.round(
      (totalLeaveDeduction + lateDeduction + absenceDeduction) * 100
    ) / 100;

    // 8. 计算实际工资
    // 实际工资 = 基本工资（按出勤比例）+ 加班费 + 全勤奖 - 总扣款
    const actualSalary = Math.round(
      (baseSalaryForActualDays + overtimePay + fullAttendanceBonus - totalDeduction) * 100
    ) / 100;

    // 9. 计算最终工资（实际工资不能为负数）
    const finalSalary = Math.max(0, actualSalary);

    return {
      employeeId,
      employeeName,
      month,
      baseSalary,
      actualSalary: finalSalary,
      workingDays,
      actualDays,
      lateDeduction,
      absenceDeduction,
      leaveDeductions,
      overtimePay,
      fullAttendanceBonus,
      totalDeduction,
      finalSalary,
    };
  }

  /**
   * 保存工资记录到LocalStorage
   * @param result 工资计算结果
   * @returns 保存的工资记录
   */
  saveSalaryRecord(result: SalaryCalculationResult): SalaryRecord {
    const records = getStoredRecords();

    // 检查是否已存在该员工该月的记录，有则覆盖
    const existingIndex = records.findIndex(
      r => r.employeeId === result.employeeId && r.month === result.month
    );

    const record: SalaryRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : generateRecordId(result.employeeId, result.month),
      employeeId: result.employeeId,
      employeeName: result.employeeName,
      month: result.month,
      baseSalary: result.baseSalary,
      workingDays: result.workingDays,
      actualDays: result.actualDays,
      lateCount: result.lateDeduction / 50,  // 反推迟到次数
      lateDeduction: result.lateDeduction,
      absenceDays: result.absenceDeduction / calculateDailyRate(result.baseSalary),
      absenceDeduction: result.absenceDeduction,
      leaveRecords: result.leaveDeductions.map(d => ({
        leaveType: d.leaveType as LeaveType,
        days: d.days,
        deduction: d.deduction,
      })),
      overtimePay: result.overtimePay,
      fullAttendanceBonus: result.fullAttendanceBonus,
      totalDeduction: result.totalDeduction,
      finalSalary: result.finalSalary,
      calculatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    saveRecords(records);
    return record;
  }

  /**
   * 获取员工指定月份的工资记录
   * @param employeeId 员工ID
   * @param month 月份（YYYY-MM）
   * @returns 工资记录，不存在则返回null
   */
  getSalaryRecord(employeeId: string, month: string): SalaryRecord | null {
    const records = getStoredRecords();
    return records.find(r => r.employeeId === employeeId && r.month === month) || null;
  }

  /**
   * 获取员工所有工资记录
   * @param employeeId 员工ID
   * @returns 工资记录列表
   */
  getEmployeeSalaryRecords(employeeId: string): SalaryRecord[] {
    const records = getStoredRecords();
    return records.filter(r => r.employeeId === employeeId);
  }

  /**
   * 获取指定月份所有员工的工资记录
   * @param month 月份（YYYY-MM）
   * @returns 工资记录列表
   */
  getMonthSalaryRecords(month: string): SalaryRecord[] {
    const records = getStoredRecords();
    return records.filter(r => r.month === month);
  }

  /**
   * 删除员工工资记录
   * @param employeeId 员工ID
   * @returns 删除的记录数
   */
  removeEmployeeSalaryRecords(employeeId: string): number {
    const records = getStoredRecords();
    const initialLength = records.length;
    const filteredRecords = records.filter(r => r.employeeId !== employeeId);
    saveRecords(filteredRecords);
    return initialLength - filteredRecords.length;
  }

  /**
   * 删除指定工资记录
   * @param recordId 记录ID
   * @returns 是否成功
   */
  deleteSalaryRecord(recordId: string): boolean {
    const records = getStoredRecords();
    const index = records.findIndex(r => r.id === recordId);

    if (index === -1) {
      console.error(`工资记录不存在: ${recordId}`);
      return false;
    }

    records.splice(index, 1);
    saveRecords(records);
    return true;
  }

  /**
   * 批量计算员工月度工资（简化版本，不含请假明细）
   * 用于快速计算多个员工的工资
   * @param employees 员工列表
   * @param month 月份
   * @param attendanceData 考勤数据映射（employeeId -> {actualDays, lateCount, absenceDays}）
   * @returns 工资计算结果列表
   */
  batchCalculateSalary(
    employees: Array<{ id: string; name: string; salary: number }>,
    month: string,
    attendanceData: Map<string, { actualDays: number; lateCount: number; absenceDays: number; leaveRecords: Array<{ leaveType: LeaveType; days: number }> }>,
    workingDays: number = 22
  ): SalaryCalculationResult[] {
    const results: SalaryCalculationResult[] = [];

    employees.forEach(emp => {
      const attendance = attendanceData.get(emp.id) || {
        actualDays: workingDays,
        lateCount: 0,
        absenceDays: 0,
        leaveRecords: [],
      };

      const result = this.calculateMonthlySalary({
        employeeId: emp.id,
        employeeName: emp.name,
        month,
        baseSalary: emp.salary,
        workingDays,
        actualDays: attendance.actualDays,
        lateCount: attendance.lateCount,
        absenceDays: attendance.absenceDays,
        leaveRecords: attendance.leaveRecords,
      });

      // 自动保存记录
      this.saveSalaryRecord(result);
      results.push(result);
    });

    return results;
  }
}

// 导出单例实例
export const salaryCalculationService = new SalaryCalculationService();
