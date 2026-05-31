/**
 * API客户端 - 简化版（无缓存）
 *
 * 数据流：API → 内存（无缓存）
 * 特性：
 * - 直接 API 调用，无 IndexedDB 缓存
 * - 网络状态检测：online/offline事件监听
 * - 自动重试：指数退避
 */

import { storageGet } from './storageService';
import { getSystemConfigValueNumber } from '../config/systemConfigReader';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const FALLBACK_TIMEOUT = 30000;

interface ApiOptions {
  /** 重试次数 */
  retryCount?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime: number | null;
}

class EnhancedApiClient {
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine, lastOnlineTime: null };

  constructor() {
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

    // 0. 检查网络状态
    if (!this.networkStatus.isOnline) {
      throw new Error('NETWORK_OFFLINE: 网络不可用');
    }

    // 1. 尝试调用API（带重试）
    let lastError: Error | null = null;
    const maxRetries = options.retryCount ?? 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.fetch(fullUrl, method, data);
        return response as T;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[EnhancedApiClient] 请求失败 (${i + 1}/${maxRetries}):`, error);
        if (i < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, i); // 指数退避
          await this.delay(delay);
        }
      }
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

  async patch<T>(url: string, data?: unknown, options?: ApiOptions): Promise<T> {
    return this.request<T>({ url, method: 'PATCH', data }, options);
  }

  // ========== 原始响应方法（用于需要检查 HTTP 状态码的场景）==========

  /**
   * POST 请求，返回原始 Response 对象以便检查状态码
   */
  async rawPost(url: string, options?: { body?: string }): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    return this.rawFetch(fullUrl, 'POST', options?.body);
  }

  /**
   * PUT 请求，返回原始 Response 对象以便检查状态码
   */
  async rawPut(url: string, options?: { body?: string }): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    return this.rawFetch(fullUrl, 'PUT', options?.body);
  }

  /**
   * DELETE 请求，返回原始 Response 对象以便检查状态码
   */
  async rawDelete(url: string): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    return this.rawFetch(fullUrl, 'DELETE');
  }

  // ========== 网络监听 ==========

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[EnhancedApiClient] 网络恢复');
      this.networkStatus = { isOnline: true, lastOnlineTime: Date.now() };
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

    // 优先从状态管理读取最新token，其次从localStorage
    let token: string | null = null;
    try {
      // 延迟导入避免循环依赖
      const { useAuthStore } = await import('../stores/useAuthStore');
      token = useAuthStore.getState().token;
    } catch {
      // 导入失败则尝试从localStorage读取
    }
    if (!token) {
      token = storageGet('token');
    }
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

    const timeoutMs = getSystemConfigValueNumber('api.timeout', FALLBACK_TIMEOUT);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
        throw new Error(`请求超时（${timeoutMs}ms）`);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 原始 fetch 方法，返回未封装的 Response 对象
   * 用于需要检查 HTTP 状态码的场景（如 409 冲突）
   */
  private async rawFetch(url: string, method: string, data?: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 优先从状态管理读取最新token，其次从localStorage
    let token: string | null = null;
    try {
      const { useAuthStore } = await import('../stores/useAuthStore');
      token = useAuthStore.getState().token;
    } catch {
      // 导入失败则尝试从localStorage读取
    }
    if (!token) {
      token = storageGet('token');
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = data;
    }

    const timeoutMs = getSystemConfigValueNumber('api.timeout', FALLBACK_TIMEOUT);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时（${timeoutMs}ms）`);
      }
      throw error;
    }
  }
}

// 导出单例
export const enhancedApiClient = new EnhancedApiClient();

// 导出类型
export type { ApiOptions, NetworkStatus };
