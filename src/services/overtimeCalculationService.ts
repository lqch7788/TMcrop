/**
 * 加班费计算服务 - 人工管理模块
 * 处理员工加班费计算、记录查询、月度汇总等业务
 */

import { OvertimeRecord, OvertimeSummary, OvertimeType } from '../types/labor/overtime';
import { getSystemConfigValueNumber } from '../config/systemConfigReader';

// LocalStorage存储键名
const STORAGE_KEY = 'OVERTIME_RECORDS';

/** 获取每月计薪天数（从系统配置读取，兜底21.75） */
function getWorkDaysPerMonth(): number {
  return getSystemConfigValueNumber('labor.work-days-per-month', 21.75);
}

/** 获取每日标准工时（从系统配置读取，兜底8） */
function getHoursPerDay(): number {
  return getSystemConfigValueNumber('labor.work-hours-per-day', 8);
}

/**
 * 从LocalStorage获取加班记录列表
 */
function getStoredRecords(): OvertimeRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('读取加班记录数据失败');
    return [];
  }
}

/**
 * 保存加班记录列表到LocalStorage
 */
function saveRecords(records: OvertimeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存加班记录数据失败:', error);
  }
}

/**
 * 生成加班记录ID
 */
function generateRecordId(): string {
  return `OT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从API获取员工姓名（异步）
 * @param employeeId 员工ID
 * @returns 员工姓名
 */
async function getWorkerNameAsync(employeeId: string): Promise<string> {
  try {
    // 动态导入避免循环依赖
    const { getWorkerNameById } = await import('./apiWorkerService');
    return await getWorkerNameById(employeeId);
  } catch (error) {
    console.error('获取员工姓名失败:', error);
    return '未知员工';
  }
}

/**
 * 加班费计算服务类
 */
export class OvertimeCalculationService {
  /**
   * 计算时薪
   * 公式：基本工资 / 21.75 / 8
   * @param baseSalary 基本工资
   * @returns 时薪
   */
  calculateHourlyRate(baseSalary: number): number {
    if (baseSalary <= 0) return 0;
    return baseSalary / getWorkDaysPerMonth() / getHoursPerDay();
  }

  /**
   * 获取加班类型对应的费率倍数
   * @param type 加班类型
   * @returns 费率倍数（1.5/2.0/3.0）
   */
  getOvertimeTypeRate(type: OvertimeType): number {
    switch (type) {
      case OvertimeType.WORKDAY:
        return 1.5;  // 工作日加班 1.5倍
      case OvertimeType.WEEKEND:
        return 2.0;  // 周末加班 2倍
      case OvertimeType.HOLIDAY:
        return 3.0;  // 法定节假日加班 3倍
      default:
        return 1.0;
    }
  }

  /**
   * 计算单次加班费
   * 公式：加班小时数 * 时薪 * 费率倍数
   * @param baseSalary 基本工资
   * @param hours 加班小时数
   * @param type 加班类型
   * @returns 加班费金额
   */
  calculateOvertimePay(baseSalary: number, hours: number, type: OvertimeType): number {
    if (baseSalary <= 0 || hours <= 0) return 0;

    const hourlyRate = this.calculateHourlyRate(baseSalary);
    const rate = this.getOvertimeTypeRate(type);

    return hours * hourlyRate * rate;
  }

  /**
   * 添加加班记录（异步）
   * @param record 加班记录（不含id、hourlyRate、rate、totalPay、createdAt）
   * @returns 创建的完整加班记录
   */
  async addOvertimeRecord(record: Omit<OvertimeRecord, 'id' | 'hourlyRate' | 'rate' | 'totalPay' | 'createdAt'>): Promise<OvertimeRecord> {
    const records = getStoredRecords();

    // 计算时薪和加班费
    const hourlyRate = this.calculateHourlyRate(record.baseSalary);
    const rate = this.getOvertimeTypeRate(record.type);
    const totalPay = record.hours * hourlyRate * rate;

    // 获取员工姓名（异步）
    const employeeName = await getWorkerNameAsync(record.employeeId);

    const newRecord: OvertimeRecord = {
      ...record,
      id: generateRecordId(),
      employeeName,
      hourlyRate: Math.round(hourlyRate * 100) / 100,  // 保留两位小数
      rate,
      totalPay: Math.round(totalPay * 100) / 100,  // 保留两位小数
      createdAt: new Date().toISOString(),
    };

    records.push(newRecord);
    saveRecords(records);

    return newRecord;
  }

  /**
   * 获取指定员工的加班记录
   * @param employeeId 员工ID
   * @param month 可选的月份筛选（格式：YYYY-MM）
   * @returns 加班记录列表
   */
  getEmployeeRecords(employeeId: string, month?: string): OvertimeRecord[] {
    const records = getStoredRecords();

    return records.filter(record => {
      if (record.employeeId !== employeeId) return false;
      if (month) {
        const recordMonth = record.date.substring(0, 7);  // 提取YYYY-MM
        return recordMonth === month;
      }
      return true;
    });
  }

  /**
   * 更新加班记录状态
   * @param recordId 记录ID
   * @param status 新状态
   * @returns 是否成功
   */
  updateRecordStatus(recordId: string, status: 'pending' | 'approved' | 'rejected'): boolean {
    const records = getStoredRecords();
    const index = records.findIndex(r => r.id === recordId);

    if (index === -1) {
      console.error(`加班记录不存在: ${recordId}`);
      return false;
    }

    records[index] = {
      ...records[index],
      status,
    };

    saveRecords(records);
    return true;
  }

  /**
   * 删除加班记录
   * @param recordId 记录ID
   * @returns 是否成功
   */
  deleteRecord(recordId: string): boolean {
    const records = getStoredRecords();
    const index = records.findIndex(r => r.id === recordId);

    if (index === -1) {
      console.error(`加班记录不存在: ${recordId}`);
      return false;
    }

    records.splice(index, 1);
    saveRecords(records);
    return true;
  }

  /**
   * 计算员工月度加班费汇总
   * @param employeeId 员工ID
   * @param month 月份（格式：YYYY-MM）
   * @returns 月度加班费汇总信息
   */
  calculateMonthlyOvertime(employeeId: string, month: string): OvertimeSummary {
    const records = this.getEmployeeRecords(employeeId, month);

    // 按加班类型分类统计
    let workdayHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let totalPay = 0;

    records.forEach(record => {
      totalPay += record.totalPay;

      switch (record.type) {
        case OvertimeType.WORKDAY:
          workdayHours += record.hours;
          break;
        case OvertimeType.WEEKEND:
          weekendHours += record.hours;
          break;
        case OvertimeType.HOLIDAY:
          holidayHours += record.hours;
          break;
      }
    });

    return {
      employeeId,
      month,
      totalHours: Math.round((workdayHours + weekendHours + holidayHours) * 100) / 100,
      workdayHours: Math.round(workdayHours * 100) / 100,
      weekendHours: Math.round(weekendHours * 100) / 100,
      holidayHours: Math.round(holidayHours * 100) / 100,
      totalPay: Math.round(totalPay * 100) / 100,
      records,
    };
  }

  /**
   * 获取所有加班记录（支持月份筛选）
   * @param month 可选的月份筛选（格式：YYYY-MM）
   * @returns 加班记录列表
   */
  getAllRecords(month?: string): OvertimeRecord[] {
    const records = getStoredRecords();

    if (!month) return records;

    return records.filter(record => {
      const recordMonth = record.date.substring(0, 7);
      return recordMonth === month;
    });
  }

  /**
   * 批量审批加班记录
   * @param recordIds 记录ID列表
   * @param status 目标状态
   * @returns 成功更新的记录数
   */
  batchUpdateStatus(recordIds: string[], status: 'pending' | 'approved' | 'rejected'): number {
    const records = getStoredRecords();
    let updatedCount = 0;

    recordIds.forEach(recordId => {
      const index = records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        records[index] = {
          ...records[index],
          status,
        };
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      saveRecords(records);
    }

    return updatedCount;
  }

  /**
   * 删除员工所有加班记录（员工离职时调用）
   * @param employeeId 员工ID
   * @returns 删除的记录数
   */
  removeEmployeeRecords(employeeId: string): number {
    const records = getStoredRecords();
    const initialLength = records.length;

    const filteredRecords = records.filter(r => r.employeeId !== employeeId);
    saveRecords(filteredRecords);

    return initialLength - filteredRecords.length;
  }

  /**
   * 根据日期范围获取加班记录
   * @param startDate 开始日期（YYYY-MM-DD）
   * @param endDate 结束日期（YYYY-MM-DD）
   * @returns 加班记录列表
   */
  getRecordsByDateRange(startDate: string, endDate: string): OvertimeRecord[] {
    const records = getStoredRecords();

    return records.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });
  }
}

// 导出单例实例
export const overtimeCalculationService = new OvertimeCalculationService();
