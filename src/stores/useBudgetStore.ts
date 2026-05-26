/**
 * 预算状态 Store - Zustand 替代 useBudgetStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新预算状态
 */
import { create } from 'zustand';export interface BudgetStatusUpdate {
  budgetId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  updatedAt: string;
  updatedBy?: string;
}

export interface Budget {
  id: string;
  budgetCode: string;
  budgetName: string;
  departmentId: string;
  departmentName: string;
  period: string;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  category: 'operating' | 'capital' | 'research' | 'marketing';
  items: BudgetItem[];
  remark?: string;
}

export interface BudgetItem {
  itemCode: string;
  itemName: string;
  budgetAmount: number;
  usedAmount: number;
}

interface BudgetStore {
  statusUpdates: Record<string, BudgetStatusUpdate>;
  updateBudgetStatus: (budgetId: string, status: BudgetStatusUpdate['status'], updatedBy?: string) => void;
  getBudgetWithStatus: (budget: Budget) => Budget;
  getStatusUpdates: () => Record<string, BudgetStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useBudgetStore = create<BudgetStore>()(
  (set, get)=> ({
      statusUpdates: {},

      updateBudgetStatus: (budgetId, status, updatedBy) => {
        const update: BudgetStatusUpdate = {
          budgetId,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [budgetId]: update },
        }));
      },

      getBudgetWithStatus: (budget) => {
        const update = get().statusUpdates[budget.id];
        return update ? { ...budget, status: update.status } : budget;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    })
);
