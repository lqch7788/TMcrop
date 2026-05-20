/**
 * React Query 客户端配置 — V3.0 Phase 5 动态参数化
 *
 * 默认值从系统配置动态读取（API→IndexedDB→localStorage 三级降级）
 * 首次加载时使用硬编码兜底，Store就绪后调用 configureQueryClient() 更新
 */

import { QueryClient } from '@tanstack/react-query';
import { getSystemConfigValueNumber } from '../config/systemConfigReader';

// 兜底默认值（Store未就绪时使用）
const STALE_TIME_FALLBACK = 5 * 60 * 1000;    // 5分钟
const GC_TIME_FALLBACK = 10 * 60 * 1000;      // 10分钟
const RETRY_FALLBACK = 2;

// 创建 QueryClient 实例（先用兜底值初始化）
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_FALLBACK,
      gcTime: GC_TIME_FALLBACK,
      retry: RETRY_FALLBACK,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * ★ V3.0 Phase 5: 从系统配置动态更新 QueryClient 默认选项
 * 在 useSystemConfigStore 就绪后调用（App.tsx useEffect 中触发）
 */
export function configureQueryClient(): void {
  const staleTime = getSystemConfigValueNumber('query.stale-time', STALE_TIME_FALLBACK);
  const gcTime = getSystemConfigValueNumber('query.gc-time', GC_TIME_FALLBACK);
  const retry = getSystemConfigValueNumber('query.retry', RETRY_FALLBACK);

  queryClient.setDefaultOptions({
    queries: {
      staleTime,
      gcTime,
      retry,
      refetchOnWindowFocus: false,
    },
  });
}
