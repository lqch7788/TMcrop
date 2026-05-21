/**
 * 审批流程配置 API 服务
 * 对接后端 /api/approval-workflows
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

/**
 * 审批节点条件
 */
export interface NodeCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: string | number | string[] | number[];
}

/**
 * 审批节点
 */
export interface ApprovalNode {
  id: string;
  nodeName: string;
  name?: string; // 兼容旧格式
  approverType: 'role' | 'user' | 'department_head' | 'direct_manager';
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  conditions?: NodeCondition[];
  timeoutHours?: number;
  autoApproveOnTimeout?: boolean;
  requireComment?: boolean;
  parallelApprovers?: boolean;
  notifyOnTimeout?: boolean;
}

/**
 * 审批工作流
 */
export interface ApprovalWorkflow {
  id: string;
  name: string;
  code: string;
  description?: string;
  module: string;
  businessType: string;
  triggerCondition?: string;
  nodes: ApprovalNode[];
  status: 'active' | 'inactive';
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 节点模板
 */
export interface NodeTemplate {
  type: string;
  name: string;
  description: string;
  fields: string[];
}

// ============================================
// 审批工作流 API
// ============================================

/**
 * 获取所有审批工作流
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkflows(): Promise<ApprovalWorkflow[]> {
  const data = await enhancedApiClient.get<ApprovalWorkflow[]>('/approval-workflows');
  return data || [];
}

/**
 * 根据业务类型获取工作流
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkflowsByType(businessType: string): Promise<ApprovalWorkflow[]> {
  const data = await enhancedApiClient.get<ApprovalWorkflow[]>(`/approval-workflows/by-type/${encodeURIComponent(businessType)}`);
  return data || [];
}

/**
 * 获取单个审批工作流
 * 降级策略：API → IndexedDB 缓存
 */
export async function getWorkflowById(id: string): Promise<ApprovalWorkflow | null> {
  try {
    const data = await enhancedApiClient.get<ApprovalWorkflow>(`/approval-workflows/${id}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * 创建审批工作流
 * 降级策略：API → 离线队列
 */
export async function createWorkflow(workflow: Partial<ApprovalWorkflow>): Promise<ApprovalWorkflow> {
  const result = await enhancedApiClient.post<ApprovalWorkflow>('/approval-workflows', workflow);
  return result;
}

/**
 * 更新审批工作流
 * 降级策略：API → 离线队列
 */
export async function updateWorkflow(id: string, workflow: Partial<ApprovalWorkflow>): Promise<void> {
  await enhancedApiClient.put(`/approval-workflows/${id}`, workflow);
}

/**
 * 删除审批工作流
 * 降级策略：API → 离线队列
 */
export async function deleteWorkflow(id: string): Promise<void> {
  await enhancedApiClient.delete(`/approval-workflows/${id}`);
}

/**
 * 切换审批工作流状态
 * 降级策略：API → 离线队列
 */
export async function toggleWorkflow(id: string): Promise<string> {
  const result = await enhancedApiClient.patch<{ status: string }>(`/approval-workflows/${id}/toggle`);
  return result.status;
}

/**
 * 复制审批工作流
 * 降级策略：API → 离线队列
 */
export async function cloneWorkflow(id: string, newCode?: string, newName?: string): Promise<{ id: string }> {
  const result = await enhancedApiClient.post<{ id: string }>(`/approval-workflows/${id}/clone`, { newCode, newName });
  return result;
}

/**
 * 验证审批条件
 * 降级策略：API
 */
export async function evaluateConditions(id: string, context: Record<string, unknown>): Promise<{
  workflowId: string;
  matchedNodes: ApprovalNode[];
  totalNodes: number;
  matchedCount: number;
}> {
  const result = await enhancedApiClient.post<{
    workflowId: string;
    matchedNodes: ApprovalNode[];
    totalNodes: number;
    matchedCount: number;
  }>(`/approval-workflows/${id}/evaluate-conditions`, { context });
  return result;
}

// ============================================
// 节点模板 API
// ============================================

/**
 * 获取节点模板列表
 * 降级策略：API → IndexedDB 缓存
 */
export async function getNodeTemplates(): Promise<NodeTemplate[]> {
  const data = await enhancedApiClient.get<NodeTemplate[]>('/approval-workflows/node-templates/list');
  return data || [];
}
