/**
 * 统一 API 客户端
 * 基于 fetch，含错误处理、超时、Content-Type 自动设置
 */

const BASE = import.meta.env.VITE_API_BASE || '/api';
const TIMEOUT = 10000;

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = BASE + path;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  opts.signal = controller.signal;

  try {
    const res = await fetch(url, opts);
    clearTimeout(timer);
    if (!res.ok) {
      let errMsg = res.statusText;
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch { /* noop */ }
      throw new Error('[' + res.status + '] ' + errMsg);
    }
    // 204 No Content
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout: ' + url);
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

// 通用分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
