/**
 * React Query 客户端配置
 * 统一数据获取和缓存管理
 */

import { QueryClient } from '@tanstack/react-query';

// 创建 QueryClient 实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5分钟内数据被视为新鲜
      gcTime: 10 * 60 * 1000,      // 10分钟后垃圾回收缓存数据
      retry: 2,                     // 失败重试2次
      refetchOnWindowFocus: false,  // 窗口聚焦时不自动重新获取
    },
  },
});
