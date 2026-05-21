/**
 * 技术方案数据 API 服务
 * 对接后端 /api/tech-solutions
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { TechSolution } from './techSolutionService';

// 后端返回的数据字段类型
interface BackendTechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  stage: string;
  version: string;
  content: string;
  author: string;
  authorId: string;
  createDate: string;
  updateTime: string;
  status: string;
  batchStatus: string;
  statusClass: string;
  approveStatus: string;
  approvalCode: string;
  approvalDate: string;
  approver: string;
  relatedBatchCode: string;
  planDetailFileName: string;
  priority: string;
  remarks: string;
  lastSubmitTime: string;
  isValid: string;
  [key: string]: unknown;
}

/**
 * 将后端返回的数据转换为前端格式
 */
function transformTechSolution(data: BackendTechSolution | BackendTechSolution[]): TechSolution | TechSolution[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformSingle(item: BackendTechSolution): TechSolution {
  return {
    id: item.id,
    code: item.code || '',
    title: item.title || '',
    crop: item.crop || '',
    cropCode: item.cropCode || '',
    plantingMode: item.plantingMode || '',
    stage: item.stage || '',
    version: item.version || 'V1.0',
    content: item.content || '',
    author: item.author || '',
    authorId: item.authorId || '',
    createDate: item.createDate ? item.createDate.split('T')[0] : '',
    updateTime: item.updateTime || '',
    status: item.status || '草稿',
    batchStatus: item.batchStatus || 'draft',
    statusClass: item.statusClass || 'draft',
    approveStatus: item.approveStatus || '待审批',
    approvalCode: item.approvalCode || '',
    approvalDate: item.approvalDate || '',
    approver: item.approver || '',
    relatedBatchCode: item.relatedBatchCode || '',
    planDetailFileName: item.planDetailFileName || '',
    priority: item.priority || 'normal',
    remarks: item.remarks || '',
    lastSubmitTime: item.lastSubmitTime || '',
    isValid: item.isValid || '有效',
  };
}

/**
 * 获取所有技术方案
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTechSolutions(): Promise<TechSolution[]> {
  const data = await enhancedApiClient.get<BackendTechSolution[]>('/tech-solutions');
  return transformTechSolution(data) as TechSolution[];
}

/**
 * 根据ID获取单个技术方案
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTechSolutionById(id: string): Promise<TechSolution | undefined> {
  const data = await enhancedApiClient.get<BackendTechSolution>(`/tech-solutions/${id}`);
  return transformTechSolution(data) as TechSolution;
}

/**
 * 创建技术方案
 * 降级策略：API → 离线队列
 */
export async function addTechSolution(solution: Omit<TechSolution, 'id'>): Promise<TechSolution> {
  const result = await enhancedApiClient.post<{ id: string }>('/tech-solutions', solution);
  return { ...solution, id: result.id } as TechSolution;
}

/**
 * 更新技术方案
 * 降级策略：API → 离线队列
 */
export async function updateTechSolution(id: string, updates: Partial<TechSolution>): Promise<TechSolution | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/tech-solutions/${id}`, updates);
  return result ? { ...updates, id } as TechSolution : null;
}

/**
 * 删除技术方案
 * 降级策略：API → 离线队列
 */
export async function deleteTechSolution(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/tech-solutions/${id}`);
  return true;
}

/**
 * 批量删除技术方案
 * 降级策略：API → 离线队列
 */
export async function deleteTechSolutions(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/tech-solutions/batch-delete', { ids });
  return true;
}

/**
 * 重置技术方案（仅调用后端，不做降级）
 */
export async function resetTechSolutions(): Promise<void> {
  await enhancedApiClient.post('/tech-solutions/reset');
}
