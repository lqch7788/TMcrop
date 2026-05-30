/**
 * 月度计划 Zustand Store (V2.1 架构)
 * 管理月度计划的完整数据流
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { MonthlyPlan, MonthlyPlanRecord } from '../types/planning';
import * as monthlyPlanService from '../services/apiMonthlyPlanService';

interface MonthlyPlanState {
  // 数据
  plans: Record<string, MonthlyPlanRecord>;  // key 为月份 (YYYY-MM)
  isLoading: boolean;
  error: string | null;

  // 数据 Actions
  fetchPlans: () => Promise<void>;
  fetchPlanByMonth: (month: string) => Promise<MonthlyPlan | null>;
  savePlan: (month: string, plan: MonthlyPlan) => Promise<boolean>;
  deletePlan: (month: string) => Promise<boolean>;
  getPlan: (month: string) => MonthlyPlan | null;
}

export const useMonthlyPlanStore = create<MonthlyPlanState>()(
  (set, get) => ({
    plans: {},
    isLoading: false,
    error: null,

    fetchPlans: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await monthlyPlanService.getMonthlyPlans();
        const plansMap: Record<string, MonthlyPlanRecord> = {};
        data.forEach((record) => {
          if (record.planMonth) {
            plansMap[record.planMonth] = record;
          }
        });
        set({ plans: plansMap, isLoading: false });
      } catch (error) {
        console.error('[useMonthlyPlanStore] 获取月度计划失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    fetchPlanByMonth: async (month: string) => {
      try {
        const record = await monthlyPlanService.getMonthlyPlanByMonth(month);
        if (record && record.planData) {
          set((state) => ({
            plans: { ...state.plans, [month]: record },
          }));
          return record.planData;
        }
        return null;
      } catch (error) {
        console.error('[useMonthlyPlanStore] 获取月度计划详情失败:', error);
        return null;
      }
    },

    savePlan: async (month: string, plan: MonthlyPlan) => {
      try {
        const planRecord: MonthlyPlanRecord = {
          planMonth: month,
          planData: plan,
        };
        const savedRecord = await monthlyPlanService.saveMonthlyPlan(planRecord);
        set((state) => ({
          plans: { ...state.plans, [month]: savedRecord },
        }));
        return true;
      } catch (error) {
        console.error('[useMonthlyPlanStore] 保存月度计划失败:', error);
        return false;
      }
    },

    deletePlan: async (month: string) => {
      try {
        const success = await monthlyPlanService.deleteMonthlyPlanByMonth(month);
        if (success) {
          set((state) => {
            const newPlans = { ...state.plans };
            delete newPlans[month];
            return { plans: newPlans };
          });
        }
        return success;
      } catch (error) {
        console.error('[useMonthlyPlanStore] 删除月度计划失败:', error);
        return false;
      }
    },

    getPlan: (month: string) => {
      const { plans } = get();
      const record = plans[month];
      return record?.planData || null;
    },
  })
);
