/**
 * 操作日志 API 服务
 * 对接后端 /api/operation-logs
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

/**
 * 操作日志
 */
export interface OperationLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  module: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'warning' | 'error' | 'info';
  level?: 'info' | 'warning' | 'error';
  errorMessage?: string;
  createdAt: string;
}

/**
 * 操作日志统计
 */
export interface OperationLogStats {
  total: number;
  today: number;
  info: number;
  warning: number;
  error: number;
}

/**
 * 操作日志筛选条件
 */
export interface OperationLogFilters {
  module?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  user?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 操作日志分页结果
 */
export interface OperationLogResult {
  data: OperationLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// 操作日志 API
// ============================================

/**
 * 获取操作日志列表（支持分页和筛选）
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getOperationLogs(filters?: OperationLogFilters): Promise<OperationLogResult> {
  const params: Record<string, string> = {};

  if (filters) {
    if (filters.module && filters.module !== 'all') params.module = filters.module;
    if (filters.level && filters.level !== 'all') params.level = filters.level;
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    if (filters.user) params.user = filters.user;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
  }

  // 构建查询参数字符串（enhancedApiClient.get 不支持 params，需要手动拼接）
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/operation-logs?${queryString}` : '/operation-logs';
  const data = await enhancedApiClient.get<OperationLogResult>(url);
  return data;
}

/**
 * 获取单个操作日志详情
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getOperationLogById(id: string): Promise<OperationLog | null> {
  try {
    const data = await enhancedApiClient.get<OperationLog>(`/operation-logs/${id}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * 获取操作日志统计
 * 网络策略：API 直连（V2.1 铁律：无缓存）
 */
export async function getOperationLogStats(): Promise<OperationLogStats> {
  const data = await enhancedApiClient.get<OperationLogStats>('/operation-logs/stats/summary');
  return data;
}

/**
 * 删除操作日志
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteOperationLog(id: string): Promise<void> {
  await enhancedApiClient.delete(`/operation-logs/${id}`);
}

/**
 * 创建操作日志（用于记录用户操作）
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function createOperationLog(log: {
  userId?: string;
  username?: string;
  action: string;
  module?: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  errorMessage?: string;
}): Promise<{ id: string; createdAt: string }> {
  // 转换为 snake_case 格式（后端数据库使用 snake_case）
  const snakeCaseLog: Record<string, unknown> = {
    user_id: log.userId,
    username: log.username,
    action: log.action,
    module: log.module,
    resource_type: log.resourceType,
    resource_id: log.resourceId,
    description: log.description,
    old_value: log.oldValue,
    new_value: log.newValue,
    status: log.status,
    error_message: log.errorMessage,
  };
  const result = await enhancedApiClient.post<{ id: string; createdAt: string }>('/operation-logs', snakeCaseLog);
  return result;
}
