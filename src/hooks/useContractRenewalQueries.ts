/**
 * 合同续签管理 Query Hooks
 * 使用 React Query 管理合同续签数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contractRenewalService from '../services/apiContractRenewalService';
import type {
  ContractRenewalRecord,
  CreateContractRenewalParams,
  UpdateContractRenewalParams,
} from '../services/apiContractRenewalService';

// ==================== 合同续签记录查询 ====================

/**
 * 获取合同续签记录列表
 */
export function useContractRenewalRecords(
  filters?: {
    employeeName?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['contract-renewal', 'records', filters, pagination],
    queryFn: () => contractRenewalService.getContractRenewalRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个合同续签记录
 */
export function useContractRenewalRecord(id: string) {
  return useQuery<ContractRenewalRecord | null>({
    queryKey: ['contract-renewal', 'record', id],
    queryFn: () => contractRenewalService.getContractRenewalById(id),
    enabled: !!id,
  });
}

// ==================== 合同续签记录 Mutations ====================

/**
 * 创建合同续签记录
 */
export function useCreateContractRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (renewal: CreateContractRenewalParams) =>
      contractRenewalService.createContractRenewalRecord(renewal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-renewal'] });
    },
  });
}

/**
 * 更新合同续签记录
 */
export function useUpdateContractRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateContractRenewalParams }) =>
      contractRenewalService.updateContractRenewalRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-renewal'] });
    },
  });
}

/**
 * 删除合同续签记录
 */
export function useDeleteContractRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractRenewalService.deleteContractRenewalRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-renewal'] });
    },
  });
}
