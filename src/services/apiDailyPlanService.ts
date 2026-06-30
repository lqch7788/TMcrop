/**
 * 每日计划数据 API 服务
 * 对接后端 /api/daily-plans
 */

import { enhancedApiClient } from '../lib/apiClient';
import { DailyPlan, DailyPlanRecord } from '../types/planning';

// 后端返回的数据类型
interface BackendDailyPlan {
  id: string;
  plan_date: string;
  plan_data: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  planData?: DailyPlan | null;
}

/**
 * 将后端返回的数据转换为前端格式
 */
function transformDailyPlan(data: BackendDailyPlan | BackendDailyPlan[]): DailyPlanRecord | DailyPlanRecord[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformSingle(item: BackendDailyPlan): DailyPlanRecord {
  let planData: DailyPlan | null = null;
  if (item.plan_data) {
    try {
      planData = JSON.parse(item.plan_data) as DailyPlan;
    } catch (e) {
      // logger.warn(`[apiDailyPlanService] 解析 plan_data 失败:`, e);
      planData = null;
    }
  } else if (item.planData) {
    planData = item.planData;
  }

  return {
    id: item.id,
    planDate: item.plan_date,
    planData: planData,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * 获取所有每日计划
 */
export async function getDailyPlans(): Promise<DailyPlanRecord[]> {
  const data = await enhancedApiClient.get<BackendDailyPlan[]>('/daily-plans');
  return transformDailyPlan(data) as DailyPlanRecord[];
}

/**
 * 获取指定日期的每日计划
 */
export async function getDailyPlanByDate(date: string): Promise<DailyPlanRecord | null> {
  const data = await enhancedApiClient.get<BackendDailyPlan>(`/daily-plans/${date}`);
  if (!data) return null;
  return transformDailyPlan(data) as DailyPlanRecord;
}

/**
 * 保存每日计划
 */
export async function saveDailyPlan(planRecord: DailyPlanRecord): Promise<DailyPlanRecord> {
  const result = await enhancedApiClient.post<{ id: string; planDate: string; createdAt?: string; updatedAt?: string }>(
    '/daily-plans',
    {
      id: planRecord.id,
      planDate: planRecord.planDate,
      planData: planRecord.planData,
      createdBy: planRecord.createdBy,
    }
  );

  // 返回带有完整数据的记录
  return {
    ...planRecord,
    id: result.id || planRecord.id,
    planDate: result.planDate || planRecord.planDate,
    createdAt: result.createdAt || planRecord.createdAt || new Date().toISOString(),
    updatedAt: result.updatedAt || new Date().toISOString(),
  };
}

/**
 * 删除每日计划
 */
export async function deleteDailyPlan(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/daily-plans/${id}`);
  return true;
}

/**
 * 根据日期删除每日计划
 */
export async function deleteDailyPlanByDate(date: string): Promise<boolean> {
  await enhancedApiClient.delete(`/daily-plans/date/${date}`);
  return true;
}
