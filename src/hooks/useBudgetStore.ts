// ============================================================
// 预算状态管理Store
// 文件路径：src/hooks/useBudgetStore.ts
// 用于审批联动：审批通过后更新预算状态
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'budget_status_updates';

export interface BudgetStatusUpdate {
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

function getStatusUpdates(): Record<string, BudgetStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: BudgetStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.budgetId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateBudgetStatus(
  budgetId: string,
  status: BudgetStatusUpdate['status'],
  updatedBy?: string
): void {
  const update: BudgetStatusUpdate = {
    budgetId,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('budgetStatusChanged', {
    detail: { budgetId, status }
  }));
}

export function getBudgetWithStatus(budget: Budget): Budget {
  const updates = getStatusUpdates();
  const update = updates[budget.id];
  if (update) {
    return { ...budget, status: update.status };
  }
  return budget;
}

export function useBudgetStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('budgetStatusChanged', handleChange);
    return () => window.removeEventListener('budgetStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateBudgetStatus,
    getBudgetWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
