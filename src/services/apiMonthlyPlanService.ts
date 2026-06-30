/**
 * 月度计划数据 API 服务
 * 对接后端 /api/monthly-plans
 */

import { enhancedApiClient } from '../lib/apiClient';
import { MonthlyPlan, MonthlyPlanRecord } from '../types/planning';

// 后端返回的数据类型
interface BackendMonthlyPlan {
  id: string;
  plan_month: string;
  plan_data: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  planData?: MonthlyPlan | null;
}

/**
 * 将后端返回的数据转换为前端格式
 */
function transformMonthlyPlan(data: BackendMonthlyPlan | BackendMonthlyPlan[]): MonthlyPlanRecord | MonthlyPlanRecord[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformSingle(item: BackendMonthlyPlan): MonthlyPlanRecord {
  let planData: MonthlyPlan | null = null;
  if (item.plan_data) {
    try {
      planData = JSON.parse(item.plan_data) as MonthlyPlan;
    } catch (e) {
      // logger.warn(`[apiMonthlyPlanService] 解析 plan_data 失败:`, e);
      planData = null;
    }
  } else if (item.planData) {
    planData = item.planData;
  }

  return {
    id: item.id,
    planMonth: item.plan_month,
    planData: planData,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * 获取所有月度计划
 */
export async function getMonthlyPlans(): Promise<MonthlyPlanRecord[]> {
  const data = await enhancedApiClient.get<BackendMonthlyPlan[]>('/monthly-plans');
  return transformMonthlyPlan(data) as MonthlyPlanRecord[];
}

/**
 * 获取指定月份的月度计划
 */
export async function getMonthlyPlanByMonth(month: string): Promise<MonthlyPlanRecord | null> {
  const data = await enhancedApiClient.get<BackendMonthlyPlan>(`/monthly-plans/${month}`);
  if (!data) return null;
  return transformMonthlyPlan(data) as MonthlyPlanRecord;
}

/**
 * 保存月度计划
 */
export async function saveMonthlyPlan(planRecord: MonthlyPlanRecord): Promise<MonthlyPlanRecord> {
  const result = await enhancedApiClient.post<{ id: string; planMonth: string; createdAt?: string; updatedAt?: string }>(
    '/monthly-plans',
    {
      id: planRecord.id,
      planMonth: planRecord.planMonth,
      planData: planRecord.planData,
      createdBy: planRecord.createdBy,
    }
  );

  // 返回带有完整数据的记录
  return {
    ...planRecord,
    id: result.id || planRecord.id,
    planMonth: result.planMonth || planRecord.planMonth,
    createdAt: result.createdAt || planRecord.createdAt || new Date().toISOString(),
    updatedAt: result.updatedAt || new Date().toISOString(),
  };
}

/**
 * 删除月度计划
 */
export async function deleteMonthlyPlan(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/monthly-plans/${id}`);
  return true;
}

/**
 * 根据月份删除月度计划
 */
export async function deleteMonthlyPlanByMonth(month: string): Promise<boolean> {
  await enhancedApiClient.delete(`/monthly-plans/month/${month}`);
  return true;
}
