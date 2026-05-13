/**
 * 技术方案数据 Zustand Store
 * 管理技术方案的完整 CRUD 数据流
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TechSolution } from '../services/techSolutionService';
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
  addSolution: (data: Omit<TechSolution, 'id'>) => Promise<TechSolution>;
  updateSolution: (id: string, updates: Partial<TechSolution>) => Promise<TechSolution | null>;
  deleteSolution: (id: string) => Promise<boolean>;
  deleteSolutions: (ids: string[]) => Promise<boolean>;
}

export const useTechSolutionStore = create<TechSolutionState>()(
  persist(
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
          console.error('[useTechSolutionStore] 获取技术方案失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addSolution: async (data) => {
        const result = await techService.addTechSolution(data);
        set((state) => ({ solutions: [result, ...state.solutions] }));
        return result;
      },

      updateSolution: async (id, updates) => {
        const result = await techService.updateTechSolution(id, updates);
        if (result) {
          set((state) => ({
            solutions: state.solutions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
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
    }),
    {
      name: 'tech-solution-storage',
      partialize: (state) => ({ solutions: state.solutions }),
    }
  )
);
