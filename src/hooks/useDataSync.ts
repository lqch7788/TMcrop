/**
 * useDataSync - React Hook统一入口
 *
 * 借鉴V3架构核心设计
 * 页面组件通过此Hook访问数据，无需关心数据来源
 */

import { useState, useEffect, useCallback } from 'react';
import { dataRouter, DataRouteConfig } from '../services/dataRouter';

export interface UseDataSyncOptions<T> {
  key: string;
  apiRead?: () => Promise<T>;
  apiWrite?: (data: T) => Promise<T>;
  localRead?: () => T;
  localWrite?: (data: T) => void;
  defaultValue?: T;
}

export interface UseDataSyncReturn<T> {
  data: T | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  write: (data: T) => Promise<T>;
  refresh: () => Promise<void>;
}

/**
 * 统一数据Hook
 *
 * @example
 * // 订单管理页面改造示例
 * function OrderPage() {
 *   const { data: orders, isLoading, write } = useDataSync({
 *     key: 'orders',
 *     apiRead: () => cropOrderService.getOrders(),
 *     apiWrite: (data) => cropOrderService.createOrder(data),
 *   });
 *
 *   if (isLoading) return <Loading />;
 *   return <OrderList data={orders} />;
 * }
 */
export function useDataSync<T>({
  key,
  apiRead,
  apiWrite,
  localRead,
  localWrite,
  defaultValue,
}: UseDataSyncOptions<T>): UseDataSyncReturn<T> {
  const initialValue = defaultValue !== undefined ? defaultValue : null;
  const [data, setData] = useState<T | null>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始加载
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const config: DataRouteConfig<T> = {
          key,
          apiRead,
          apiWrite,
          localRead,
          localWrite,
        };

        const result = await dataRouter.read<T>(config);

        if (!cancelled) {
          // 确保 data 永不为 null
          const finalData = result ?? defaultValue ?? [];
          setData(finalData as T);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('数据加载失败'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // 订阅更新
    const unsubscribe = dataRouter.subscribe(key, (newData) => {
      setData(newData as T);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key]);

  // 写入数据
  const write = useCallback(async (newData: T): Promise<T> => {
    setIsSyncing(true);
    setError(null);

    try {
      const config: DataRouteConfig<T> = {
        key,
        apiRead,
        apiWrite,
        localRead,
        localWrite,
      };

      const result = await dataRouter.write<T>(config, newData);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('数据保存失败');
      setError(error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [key, apiRead, apiWrite, localRead, localWrite]);

  // 刷新数据
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      // 强制从本地读取最新数据（绕过缓存）
      if (localRead) {
        const localData = localRead();
        // 确保本地数据不为 null
        setData((localData ?? defaultValue ?? []) as T);
      }

      const config: DataRouteConfig<T> = {
        key,
        apiRead,
        apiWrite,
        localRead,
        localWrite,
      };

      const result = await dataRouter.read<T>(config);
      // 确保 data 永不为 null
      const finalData = result ?? defaultValue ?? [];
      setData(finalData as T);
    } catch (err) {
      // 刷新失败
    } finally {
      setIsLoading(false);
    }
  }, [key, apiRead, apiWrite, localRead, localWrite, defaultValue]);

  return {
    data,
    isLoading,
    isSyncing,
    error,
    write,
    refresh,
  };
}
