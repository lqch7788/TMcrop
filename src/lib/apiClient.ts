/**
 * API客户端 - 增强版
 *
 * Phase 0 基础设施：为Zustand Store提供统一API调用
 * 特性：
 * - 三级降级：API → IndexedDB缓存 → localStorage
 * - 离线队列：pendingSync支持
 * - 网络状态检测：online/offline事件监听
 * - 自动重试：指数退避
 *
 * 保留原有 services/apiClient.ts 不变，此文件为新建
 */

import Dexie from 'dexie';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = 30000;

interface ApiOptions {
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 是否开启离线队列 */
  offlineQueue?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 缓存策略 */
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  timestamp: number;
  retries: number;
}

interface CacheEntry {
  url: string;
  data: unknown;
  timestamp: number;
}

interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime: number | null;
}

// IndexedDB 数据库 - 使用 Dexie 4.x API
class ApiCacheDB extends Dexie {
  cache!: Dexie.Table<CacheEntry, string>;
  'offline-queue'!: Dexie.Table<QueuedRequest, string>;

  constructor() {
    super('yuanxingtu-api-cache');
    this.version(1).stores({
      cache: 'url',
      'offline-queue': 'id',
    });
  }
}

class EnhancedApiClient {
  private db: ApiCacheDB;
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine, lastOnlineTime: null };

  constructor() {
    this.db = new ApiCacheDB();
    this.setupNetworkListeners();
  }

  // ========== 网络状态 ==========

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  // ========== 核心请求方法 ==========

  /**
   * 统一请求方法
   * @param config 请求配置
   * @param options 选项
   */
  async request<T>(
    config: { url: string; method: string; data?: unknown },
    options: ApiOptions = {}
  ): Promise<T> {
    const { url, method, data } = config;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const cacheKey = `${method}:${fullUrl}`;

    // 0. 检查网络状态
    if (!this.networkStatus.isOnline) {
      if (options.useCache) {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached) {
          console.warn(`[EnhancedApiClient] 离线模式，使用缓存: ${fullUrl}`);
          return { ...cached, _fromCache: true, _offline: true } as T;
        }
      }
      if (options.offlineQueue) {
        await this.addToOfflineQueue({ url: fullUrl, method, data });
        throw new Error('OFFLINE_QUEUED: 已加入离线队列，联网后将自动同步');
      }
      throw new Error('NETWORK_OFFLINE: 网络不可用');
    }

    // 1. 检查缓存（可选）
    if (options.useCache && options.cacheStrategy === 'cache-first') {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) {
        return { ...cached, _fromCache: true } as T;
      }
    }

    // 2. 尝试调用API（带重试）
    let lastError: Error | null = null;
    const maxRetries = options.retryCount ?? 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.fetch(fullUrl, method, data);

        // 更新缓存
        if (options.useCache) {
          await this.saveToCache(cacheKey, response);
        }

        return response as T;
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, i); // 指数退避
          console.warn(`[EnhancedApiClient] 请求失败，${delay}ms后重试 (${i + 1}/${maxRetries})`);
          await this.delay(delay);
        }
      }
    }

    // 3. API全部失败，尝试降级到缓存
    if (options.useCache) {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) {
        console.warn(`[EnhancedApiClient] API失败，使用缓存: ${fullUrl}`);
        return { ...cached, _fromCache: true } as T;
      }
    }

    // 4. 加入离线队列
    if (options.offlineQueue) {
      await this.addToOfflineQueue({ url: fullUrl, method, data });
      console.warn(`[EnhancedApiClient] 加入离线队列: ${fullUrl}`);
      throw new Error('OFFLINE_QUEUED: 已加入离线队列，联网后将自动同步');
    }

    throw lastError;
  }

  // ========== HTTP方法便捷调用 ==========

  async get<T>(url: string, options?: ApiOptions): Promise<T> {
    return this.request<T>({ url, method: 'GET' }, options);
  }

  async post<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request<T>({ url, method: 'POST', data }, options);
  }

  async put<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data }, options);
  }

  async delete<T>(url: string, options?: ApiOptions): Promise<T> {
    return this.request<T>({ url, method: 'DELETE' }, options);
  }

  // ========== 缓存方法 ==========

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.db.cache.get(key);
      if (!cached) return null;

      // 检查缓存是否过期（默认1小时）
      const maxAge = 60 * 60 * 1000;
      if (Date.now() - cached.timestamp > maxAge) {
        await this.db.cache.delete(key);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.warn('[EnhancedApiClient] 读取缓存失败:', error);
      return null;
    }
  }

  private async saveToCache(key: string, data: unknown): Promise<void> {
    try {
      await this.db.cache.put({ url: key, data, timestamp: Date.now() });
    } catch (error) {
      console.warn('[EnhancedApiClient] 保存缓存失败:', error);
    }
  }

  /**
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    try {
      await this.db.cache.clear();
      console.log('[EnhancedApiClient] 缓存已清除');
    } catch (error) {
      console.warn('[EnhancedApiClient] 清除缓存失败:', error);
    }
  }

  // ========== 离线队列 ==========

  private async addToOfflineQueue(request: { url: string; method: string; data?: unknown }): Promise<void> {
    try {
      await this.db['offline-queue'].add({
        id: crypto.randomUUID(),
        ...request,
        timestamp: Date.now(),
        retries: 0,
      });
    } catch (error) {
      console.warn('[EnhancedApiClient] 加入离线队列失败:', error);
    }
  }

  /**
   * 获取离线队列
   */
  async getOfflineQueue(): Promise<QueuedRequest[]> {
    try {
      return await this.db['offline-queue'].toArray();
    } catch {
      return [];
    }
  }

  /**
   * 获取待同步数量
   */
  async getPendingSyncCount(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  /**
   * 处理离线队列（联网后自动调用）
   */
  async processOfflineQueue(): Promise<void> {
    if (!this.networkStatus.isOnline) return;

    try {
      const queue = await this.db['offline-queue'].toArray();
      if (queue.length === 0) return;

      console.log(`[EnhancedApiClient] 开始处理离线队列，共 ${queue.length} 条`);

      for (const item of queue) {
        try {
          await this.fetch(item.url, item.method, item.data);
          await this.db['offline-queue'].delete(item.id);
          console.log(`[EnhancedApiClient] 同步成功: ${item.url}`);
        } catch {
          item.retries++;
          if (item.retries >= 3) {
            console.warn(`[EnhancedApiClient] 同步失败超过3次，放弃: ${item.url}`);
            await this.db['offline-queue'].delete(item.id);
          } else {
            await this.db['offline-queue'].put(item);
            console.warn(`[EnhancedApiClient] 同步失败，重试 (${item.retries}/3): ${item.url}`);
          }
        }
      }
    } catch (error) {
      console.error('[EnhancedApiClient] 处理离线队列失败:', error);
    }
  }

  /**
   * 手动触发同步
   */
  async forcSync(): Promise<void> {
    if (!this.networkStatus.isOnline) {
      console.warn('[EnhancedApiClient] 网络不可用');
      return;
    }
    await this.processOfflineQueue();
  }

  // ========== 网络监听 ==========

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[EnhancedApiClient] 网络恢复');
      this.networkStatus = { isOnline: true, lastOnlineTime: Date.now() };
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[EnhancedApiClient] 网络断开');
      this.networkStatus = { isOnline: false, lastOnlineTime: null };
    });
  }

  // ========== 内部方法 ==========

  private async fetch(url: string, method: string, data?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorResult = await response.json();
          if (errorResult?.error) {
            errorMessage = errorResult.error;
          }
        } catch {
          // 忽略解析错误
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // 统一响应格式处理
      if (result && typeof result === 'object' && 'success' in result) {
        if (!(result as { success: boolean }).success) {
          throw new Error((result as { error?: string }).error || 'API request failed');
        }
        return (result as { data?: unknown }).data ?? result;
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时（${DEFAULT_TIMEOUT}ms）`);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const enhancedApiClient = new EnhancedApiClient();

// 导出类型
export type { ApiOptions, QueuedRequest, NetworkStatus };
