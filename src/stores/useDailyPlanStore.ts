/**
 * 每日计划 Zustand Store (V2.1 架构)
 * 管理每日计划的完整数据流
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { DailyPlan, DailyPlanRecord } from '../types/planning';
import * as dailyPlanService from '../services/apiDailyPlanService';

interface DailyPlanState {
  // 数据
  plans: Record<string, DailyPlanRecord>;  // key 为日期 (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;

  // 数据 Actions
  fetchPlans: () => Promise<void>;
  fetchPlanByDate: (date: string) => Promise<DailyPlan | null>;
  savePlan: (date: string, plan: DailyPlan) => Promise<boolean>;
  deletePlan: (date: string) => Promise<boolean>;
  getPlan: (date: string) => DailyPlan | null;
}

export const useDailyPlanStore = create<DailyPlanState>()(
  (set, get) => ({
    plans: {},
    isLoading: false,
    error: null,

    fetchPlans: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await dailyPlanService.getDailyPlans();
        const plansMap: Record<string, DailyPlanRecord> = {};
        data.forEach((record) => {
          if (record.planDate) {
            plansMap[record.planDate] = record;
          }
        });
        set({ plans: plansMap, isLoading: false });
      } catch (error) {
        // logger.error('[useDailyPlanStore] 获取每日计划失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    fetchPlanByDate: async (date: string) => {
      try {
        const record = await dailyPlanService.getDailyPlanByDate(date);
        if (record && record.planData) {
          set((state) => ({
            plans: { ...state.plans, [date]: record },
          }));
          return record.planData;
        }
        return null;
      } catch (error) {
        // logger.error('[useDailyPlanStore] 获取每日计划详情失败:', error);
        return null;
      }
    },

    savePlan: async (date: string, plan: DailyPlan) => {
      try {
        const planRecord: DailyPlanRecord = {
          planDate: date,
          planData: plan,
        };
        const savedRecord = await dailyPlanService.saveDailyPlan(planRecord);
        set((state) => ({
          plans: { ...state.plans, [date]: savedRecord },
        }));
        return true;
      } catch (error) {
        // logger.error('[useDailyPlanStore] 保存每日计划失败:', error);
        return false;
      }
    },

    deletePlan: async (date: string) => {
      try {
        const success = await dailyPlanService.deleteDailyPlanByDate(date);
        if (success) {
          set((state) => {
            const newPlans = { ...state.plans };
            delete newPlans[date];
            return { plans: newPlans };
          });
        }
        return success;
      } catch (error) {
        // logger.error('[useDailyPlanStore] 删除每日计划失败:', error);
        return false;
      }
    },

    getPlan: (date: string) => {
      const { plans } = get();
      const record = plans[date];
      return record?.planData || null;
    },
  })
);
