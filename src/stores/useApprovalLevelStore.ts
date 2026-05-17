/**
 * 分级审批 Store - Zustand 状态管理
 * 管理审批级别配置、金额阈值、类型规则三类数据
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getApprovalLevelConfigs,
  updateApprovalLevelConfig,
  getApprovalAmountThresholds,
  createApprovalAmountThreshold,
  updateApprovalAmountThreshold,
  deleteApprovalAmountThreshold,
  getApprovalTypeRules,
  updateApprovalTypeRule,
  type ApprovalLevelConfigItem,
  type ApprovalAmountThresholdItem,
  type ApprovalTypeRuleItem,
} from '../services/apiBasicDataService';
import { syncApprovalStoreData } from '../config/approvalHierarchy';

interface ApprovalLevelStore {
  // 审批级别配置
  levelConfigs: ApprovalLevelConfigItem[];
  // 金额阈值
  amountThresholds: ApprovalAmountThresholdItem[];
  // 类型规则
  typeRules: ApprovalTypeRuleItem[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载方法
  loadAll: () => Promise<void>;
  loadLevelConfigs: () => Promise<void>;
  loadAmountThresholds: () => Promise<void>;
  loadTypeRules: () => Promise<void>;

  // 级别配置操作（只读 + 编辑）
  updateLevelConfig: (id: number, data: Partial<ApprovalLevelConfigItem>) => Promise<void>;

  // 金额阈值操作（完整 CRUD）
  addAmountThreshold: (data: Partial<ApprovalAmountThresholdItem>) => Promise<ApprovalAmountThresholdItem>;
  updateAmountThreshold: (id: number, data: Partial<ApprovalAmountThresholdItem>) => Promise<void>;
  removeAmountThreshold: (id: number) => Promise<void>;

  // 类型规则操作（只读 + 编辑）
  updateTypeRule: (id: number, data: Partial<ApprovalTypeRuleItem>) => Promise<void>;

  // 刷新
  refreshAll: () => Promise<void>;
}

export const useApprovalLevelStore = create<ApprovalLevelStore>()(
  persist(
    (set, get) => ({
      levelConfigs: [],
      amountThresholds: [],
      typeRules: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadAll: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().levelConfigs.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const [levelConfigs, amountThresholds, typeRules] = await Promise.all([
            getApprovalLevelConfigs(),
            getApprovalAmountThresholds(),
            getApprovalTypeRules(),
          ]);
          set({ levelConfigs, amountThresholds, typeRules, loading: false, lastFetch: now });
          // 同步运行时数据到 approvalHierarchy 配置模块
          syncApprovalStoreData({ levelConfigs, amountThresholds, typeRules });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载分级审批数据失败', loading: false });
        }
      },

      loadLevelConfigs: async () => {
        try {
          const data = await getApprovalLevelConfigs();
          set({ levelConfigs: data });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载审批级别配置失败' });
        }
      },

      loadAmountThresholds: async () => {
        try {
          const data = await getApprovalAmountThresholds();
          set({ amountThresholds: data });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载金额阈值失败' });
        }
      },

      loadTypeRules: async () => {
        try {
          const data = await getApprovalTypeRules();
          set({ typeRules: data });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载审批类型规则失败' });
        }
      },

      updateLevelConfig: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateApprovalLevelConfig(id, data);
          set((state) => ({
            levelConfigs: state.levelConfigs.map((item) =>
              item.id === id ? { ...item, ...data } : item
            ),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新审批级别配置失败', loading: false });
          throw error;
        }
      },

      addAmountThreshold: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createApprovalAmountThreshold(data);
          // 重新加载以获取完整数据
          await get().loadAmountThresholds();
          set({ loading: false });
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建金额阈值失败', loading: false });
          throw error;
        }
      },

      updateAmountThreshold: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateApprovalAmountThreshold(id, data);
          set((state) => ({
            amountThresholds: state.amountThresholds.map((item) =>
              item.id === id ? { ...item, ...data } : item
            ),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新金额阈值失败', loading: false });
          throw error;
        }
      },

      removeAmountThreshold: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteApprovalAmountThreshold(id);
          set((state) => ({
            amountThresholds: state.amountThresholds.filter((item) => item.id !== id),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除金额阈值失败', loading: false });
          throw error;
        }
      },

      updateTypeRule: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateApprovalTypeRule(id, data);
          set((state) => ({
            typeRules: state.typeRules.map((item) =>
              item.id === id ? { ...item, ...data } : item
            ),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新审批类型规则失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => {
        set({ lastFetch: null });
        await get().loadAll();
      },
    }),
    {
      name: 'approval_level_store',
      partialize: (state) => ({
        levelConfigs: state.levelConfigs,
        amountThresholds: state.amountThresholds,
        typeRules: state.typeRules,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.levelConfigs.length > 0) {
          syncApprovalStoreData({
            levelConfigs: state.levelConfigs,
            amountThresholds: state.amountThresholds,
            typeRules: state.typeRules,
          });
        }
      },
    }
  )
);
