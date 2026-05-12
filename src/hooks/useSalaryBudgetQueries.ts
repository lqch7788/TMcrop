/**
 * 工资预算管理 Query Hooks
 * 使用 React Query 管理工资预算数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as salaryBudgetService from '../services/apiSalaryBudgetService';
import type {
  SalaryBudgetRecord,
  CreateSalaryBudgetParams,
  UpdateSalaryBudgetParams,
} from '../services/apiSalaryBudgetService';

// ==================== 工资预算记录查询 ====================

/**
 * 获取工资预算记录列表
 */
export function useSalaryBudgetRecords(
  filters?: {
    deptId?: string;
    budgetMonth?: string;
    status?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['salary-budget', 'records', filters, pagination],
    queryFn: () => salaryBudgetService.getSalaryBudgetRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个工资预算记录
 */
export function useSalaryBudgetRecord(id: string) {
  return useQuery<SalaryBudgetRecord | null>({
    queryKey: ['salary-budget', 'record', id],
    queryFn: () => salaryBudgetService.getSalaryBudgetById(id),
    enabled: !!id,
  });
}

// ==================== 工资预算记录 Mutations ====================

/**
 * 创建工资预算记录
 */
export function useCreateSalaryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budget: CreateSalaryBudgetParams) =>
      salaryBudgetService.createSalaryBudgetRecord(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-budget'] });
    },
  });
}

/**
 * 更新工资预算记录
 */
export function useUpdateSalaryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateSalaryBudgetParams }) =>
      salaryBudgetService.updateSalaryBudgetRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-budget'] });
    },
  });
}

/**
 * 删除工资预算记录
 */
export function useDeleteSalaryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salaryBudgetService.deleteSalaryBudgetRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-budget'] });
    },
  });
}
