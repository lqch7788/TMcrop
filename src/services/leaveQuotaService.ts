/**
 * 请假余额服务 - 人工管理模块
 * 处理员工请假额度查询、冻结、扣减、释放等业务
 */

import { LeaveQuota, LeaveType } from '../types/labor/employee';

// LocalStorage存储键名
const STORAGE_KEY = 'LEAVE_QUOTAS';

/**
 * 请假额度配置
 * 定义各类型请假的年度默认天数
 */
export const LEAVE_QUOTA_CONFIG: Record<LeaveType, number> = {
  ANNUAL: 15,       // 年假
  SICK: 10,         // 病假
  PERSONAL: 5,      // 事假
  MARRIAGE: 3,      // 婚假
  MATERNITY: 98,    // 产假
  PATERNITY: 10,    // 陪产假
  FUNERAL: 3,       // 丧假
  WORK_INJURY: 0,   // 工伤假（按实际情况）
};

/**
 * 从LocalStorage获取请假额度列表
 */
function getStoredQuotas(): LeaveQuota[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('读取请假额度数据失败');
    return [];
  }
}

/**
 * 保存请假额度列表到LocalStorage
 */
function saveQuotas(quotas: LeaveQuota[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotas));
  } catch (error) {
    console.error('保存请假额度数据失败:', error);
  }
}

/**
 * 生成额度记录ID
 */
function generateQuotaId(employeeId: string, leaveType: LeaveType, year: number): string {
  return `QUOTA-${employeeId}-${leaveType}-${year}`;
}

/**
 * 获取当前年份
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * 请假余额服务类
 */
export class LeaveQuotaService {
  /**
   * 初始化员工请假额度
   * 在员工入职时调用，为员工创建各类型请假额度
   * @param employeeId 员工ID
   * @param hireDate 入职日期
   */
  initEmployeeQuotas(employeeId: string, hireDate: string): void {
    const quotas = getStoredQuotas();
    const hireYear = new Date(hireDate).getFullYear();
    const currentYear = getCurrentYear();

    // 为入职当年和当前年份创建额度
    for (const year of [hireYear, currentYear]) {
      Object.entries(LEAVE_QUOTA_CONFIG).forEach(([type, days]) => {
        // 检查是否已存在
        const exists = quotas.some(
          q => q.employeeId === employeeId &&
               q.leaveType === type &&
               q.year === year
        );

        if (!exists && days > 0) {
          // 计算当年可用天数（按入职月份比例）
          const startMonth = year === hireYear ? new Date(hireDate).getMonth() + 1 : 1;
          const monthsRemaining = 12 - startMonth + 1;
          const proRatedDays = Math.floor((days / 12) * monthsRemaining);

          quotas.push({
            employeeId,
            leaveType: type as LeaveType,
            totalDays: proRatedDays,
            usedDays: 0,
            frozenDays: 0,
            availableDays: proRatedDays,
            year,
          });
        }
      });
    }

    saveQuotas(quotas);
  }

  /**
   * 获取员工指定类型的请假余额
   * @param employeeId 员工ID
   * @param leaveType 请假类型
   * @param year 年份（默认当前年份）
   * @returns 可用天数，-1表示记录不存在
   */
  getLeaveQuota(employeeId: string, leaveType: LeaveType, year?: number): number {
    const targetYear = year || getCurrentYear();
    const quotas = getStoredQuotas();

    const quota = quotas.find(
      q => q.employeeId === employeeId &&
           q.leaveType === leaveType &&
           q.year === targetYear
    );

    return quota ? quota.availableDays : -1;
  }

  /**
   * 获取员工所有请假额度
   * @param employeeId 员工ID
   * @param year 年份（默认当前年份）
   * @returns 请假额度列表
   */
  getAllQuotas(employeeId: string, year?: number): LeaveQuota[] {
    const targetYear = year || getCurrentYear();
    const quotas = getStoredQuotas();

    return quotas.filter(
      q => q.employeeId === employeeId && q.year === targetYear
    );
  }

  /**
   * 冻结请假额度（申请请假时调用）
   * @param employeeId 员工ID
   * @param leaveType 请假类型
   * @param days 冻结天数
   * @returns 是否成功
   */
  freezeQuota(employeeId: string, leaveType: LeaveType, days: number): boolean {
    const quotas = getStoredQuotas();
    const targetYear = getCurrentYear();

    const index = quotas.findIndex(
      q => q.employeeId === employeeId &&
           q.leaveType === leaveType &&
           q.year === targetYear
    );

    if (index === -1) {
      console.error(`请假额度记录不存在: ${employeeId}-${leaveType}-${targetYear}`);
      return false;
    }

    if (quotas[index].availableDays < days) {
      console.error(`可用余额不足: ${quotas[index].availableDays} < ${days}`);
      return false;
    }

    // 冻结：可用天数减少，冻结天数增加
    quotas[index] = {
      ...quotas[index],
      availableDays: quotas[index].availableDays - days,
      frozenDays: quotas[index].frozenDays + days,
    };

    saveQuotas(quotas);
    return true;
  }

  /**
   * 扣减请假额度（审批通过时调用）
   * @param employeeId 员工ID
   * @param leaveType 请假类型
   * @param days 扣减天数
   * @returns 是否成功
   */
  deductQuota(employeeId: string, leaveType: LeaveType, days: number): boolean {
    const quotas = getStoredQuotas();
    const targetYear = getCurrentYear();

    const index = quotas.findIndex(
      q => q.employeeId === employeeId &&
           q.leaveType === leaveType &&
           q.year === targetYear
    );

    if (index === -1) {
      console.error(`请假额度记录不存在: ${employeeId}-${leaveType}-${targetYear}`);
      return false;
    }

    // 扣减：已使用天数增加，冻结天数减少
    quotas[index] = {
      ...quotas[index],
      usedDays: quotas[index].usedDays + days,
      frozenDays: quotas[index].frozenDays - days,
    };

    saveQuotas(quotas);
    return true;
  }

  /**
   * 释放请假额度（审批拒绝或取消时调用）
   * 将冻结的额度返还到可用余额
   * @param employeeId 员工ID
   * @param leaveType 请假类型
   * @param days 释放天数
   * @returns 是否成功
   */
  releaseQuota(employeeId: string, leaveType: LeaveType, days: number): boolean {
    const quotas = getStoredQuotas();
    const targetYear = getCurrentYear();

    const index = quotas.findIndex(
      q => q.employeeId === employeeId &&
           q.leaveType === leaveType &&
           q.year === targetYear
    );

    if (index === -1) {
      console.error(`请假额度记录不存在: ${employeeId}-${leaveType}-${targetYear}`);
      return false;
    }

    // 释放：冻结天数减少，可用天数增加
    quotas[index] = {
      ...quotas[index],
      frozenDays: quotas[index].frozenDays - days,
      availableDays: quotas[index].availableDays + days,
    };

    saveQuotas(quotas);
    return true;
  }

  /**
   * 年度额度重置（每年1月1日调用）
   * 将去年的余额状态结转到新的一年
   * @param employeeId 员工ID
   */
  resetYearlyQuota(employeeId: string): void {
    const quotas = getStoredQuotas();
    const lastYear = getCurrentYear() - 1;
    const currentYear = getCurrentYear();

    // 获取去年各类型额度
    const lastYearQuotas = quotas.filter(
      q => q.employeeId === employeeId && q.year === lastYear
    );

    // 为新年度创建额度
    lastYearQuotas.forEach(lastQuota => {
      const configDays = LEAVE_QUOTA_CONFIG[lastQuota.leaveType];
      if (configDays > 0) {
        // 年假可结转最多5天
        let carriedDays = 0;
        if (lastQuota.leaveType === 'ANNUAL') {
          carriedDays = Math.min(lastQuota.availableDays, 5);
        }

        const newTotal = configDays + carriedDays;

        quotas.push({
          employeeId,
          leaveType: lastQuota.leaveType,
          totalDays: newTotal,
          usedDays: 0,
          frozenDays: 0,
          availableDays: newTotal,
          year: currentYear,
        });
      }
    });

    saveQuotas(quotas);
  }

  /**
   * 删除员工所有额度记录（员工离职时调用）
   * @param employeeId 员工ID
   */
  removeEmployeeQuotas(employeeId: string): void {
    let quotas = getStoredQuotas();
    quotas = quotas.filter(q => q.employeeId !== employeeId);
    saveQuotas(quotas);
  }

  /**
   * 获取额度详情
   * @param employeeId 员工ID
   * @param leaveType 请假类型
   * @param year 年份
   * @returns 额度详情
   */
  getQuotaDetail(employeeId: string, leaveType: LeaveType, year?: number): LeaveQuota | null {
    const targetYear = year || getCurrentYear();
    const quotas = getStoredQuotas();

    return quotas.find(
      q => q.employeeId === employeeId &&
           q.leaveType === leaveType &&
           q.year === targetYear
    ) || null;
  }
}

// 导出单例实例
export const leaveQuotaService = new LeaveQuotaService();
