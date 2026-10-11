/**
 * 技术方案数据 Zustand Store (V2.1 架构)
 * 管理技术方案的完整 CRUD 数据流
 *
 * 数据流：API → enhancedApiClient（无缓存）→ Store → 页面组件
 * - L1：Store 内存数据
 * - L2：（未使用）无 API
 * - L3：（未使用）techSolution 页面不读取 localStorage
 */
import { create } from 'zustand';
// 使用 import type 确保类型导入在编译时被擦除，不会出现在运行时 ESM 中
import type { TechSolution } from '../types/techSolution';
import * as techService from '../services/apiTechSolutionService';

interface TechSolutionFilters {
  code?: string;
  crop?: string;
  status?: string;
  author?: string;
  keyword?: string;
}

interface TechSolutionState {
  // 数据
  solutions: TechSolution[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSolutions: (filters?: TechSolutionFilters) => Promise<void>;
  // 2026-10-11：写操作入参改为"写载荷"（页面按后端字段 solutionCode/solutionTitle/cropName/scopeNames… 组装）
  addSolution: (data: techService.TechSolutionPayload) => Promise<TechSolution>;
  updateSolution: (id: string, updates: Partial<techService.TechSolutionPayload>) => Promise<TechSolution | null>;
  deleteSolution: (id: string) => Promise<boolean>;
  deleteSolutions: (ids: string[]) => Promise<boolean>;
}

export const useTechSolutionStore = create<TechSolutionState>()(
  (set) => ({
    solutions: [],
    isLoading: false,
    error: null,

    fetchSolutions: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await techService.getTechSolutions();
        set({ solutions: data || [], isLoading: false });
      } catch (error) {
        // logger.error('[useTechSolutionStore] 获取技术方案失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addSolution: async (data) => {
      const result = await techService.addTechSolution(data);
      // 使用后端返回的完整数据，如果失败则使用前端数据作为降级
      // 2026-10-11：入参为写载荷形态，降级分支仅在后端不回完整记录时启用（addTechSolution 的兜底已构造完整对象）
      const solutionData: TechSolution = result || (data as unknown as TechSolution);
      set((state) => ({ solutions: [solutionData, ...state.solutions] }));
      return solutionData;
    },

    updateSolution: async (id, updates) => {
      const result = await techService.updateTechSolution(id, updates);
      if (result) {
        // 使用后端返回的完整数据（merge 模式），避免前端传参不完整
        set((state) => ({
          solutions: state.solutions.map((s) => (s.id === id ? { ...s, ...result } : s)),
        }));
      }
      return result;
    },

    deleteSolution: async (id) => {
      const result = await techService.deleteTechSolution(id);
      if (result) {
        set((state) => ({ solutions: state.solutions.filter((s) => s.id !== id) }));
      }
      return result;
    },

    deleteSolutions: async (ids) => {
      const result = await techService.deleteTechSolutions(ids);
      if (result) {
        set((state) => ({ solutions: state.solutions.filter((s) => !ids.includes(s.id)) }));
      }
      return result;
    },
  })
);
