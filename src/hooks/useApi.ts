/**
 * React Query API Hook 示例
 * 展示如何使用 React Query 进行数据获取和缓存管理
 *
 * 使用方法：
 * 1. 在组件中导入需要的 hook
 * 2. 调用 hook 获取数据
 * 3. 使用返回的 data, isLoading, error 等状态
 *
 * 示例：
 * ```tsx
 * const { data, isLoading, error, refetch } = useLaborList({ page: 1, limit: 10 });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

/**
 * 人工记录列表 Hook 示例
 * @param params 查询参数
 */
export function useLaborList(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['labor', 'list', params],
    queryFn: () => apiClient.get<unknown>('/labor', params),
    enabled: !!params, // 按需加载
  });
}

/**
 * 作物品种列表 Hook 示例
 */
export function useCropVarietyList() {
  return useQuery({
    queryKey: ['crop-varieties', 'list'],
    queryFn: () => apiClient.get<unknown>('/crop-varieties'),
  });
}

/**
 * 库存列表 Hook 示例
 */
export function useInventoryList(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['inventory', 'list', params],
    queryFn: () => apiClient.get<unknown>('/inventory', params),
  });
}

/**
 * 供应商列表 Hook 示例
 */
export function useSupplierList() {
  return useQuery({
    queryKey: ['suppliers', 'list'],
    queryFn: () => apiClient.get<unknown>('/suppliers'),
  });
}

/**
 * 通用数据查询 Hook
 * @param key 缓存 key
 * @param endpoint API 端点
 * @param params 查询参数
 */
export function useApiQuery<T>(key: string[], endpoint: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<T>(endpoint, params),
    enabled: !!endpoint,
  });
}

/**
 * 通用数据创建 Mutation Hook
 * @param key 缓存 key（用于更新）
 */
export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method: 'post' | 'put' | 'delete' = 'post',
  queryKeyToInvalidate?: string[]
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => {
      if (method === 'post') {
        return apiClient.post<TData>(endpoint, variables);
      } else if (method === 'put') {
        return apiClient.put<TData>(endpoint, variables);
      } else {
        return apiClient.delete<TData>(endpoint);
      }
    },
    onSuccess: () => {
      // 操作成功后使相关缓存失效
      if (queryKeyToInvalidate) {
        queryKeyToInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    },
  });
}
