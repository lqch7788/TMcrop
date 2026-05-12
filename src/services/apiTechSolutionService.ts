/**
 * 技术方案数据 API 服务
 * 对接后端 /api/tech-solutions
 * API失败时降级到 localStorage (techSolutionService)
 */

import { enhancedApiClient } from '../lib/apiClient';
import { TechSolution } from './techSolutionService';
import * as techSolutionService from './techSolutionService';

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

// ==================== API 函数（降级到localStorage）====================

export async function getTechSolutions(): Promise<TechSolution[]> {
  try {
    const data = await apiClient.get<BackendTechSolution[]>('/tech-solutions');
    return transformTechSolution(data) as TechSolution[];
  } catch (error) {
    console.warn('[技术方案API] 获取失败，降级到localStorage:', error);
    return techSolutionService.getTechSolutions();
  }
}

export async function getTechSolutionById(id: string): Promise<TechSolution | undefined> {
  try {
    const data = await apiClient.get<BackendTechSolution>(`/tech-solutions/${id}`);
    return transformTechSolution(data) as TechSolution;
  } catch (error) {
    console.warn('[技术方案API] 获取单个失败，降级到localStorage:', error);
    return techSolutionService.getTechSolutionById(id);
  }
}

export async function addTechSolution(solution: Omit<TechSolution, 'id'>): Promise<TechSolution> {
  try {
    const result = await apiClient.post<{ id: string }>('/tech-solutions', solution);
    return { ...solution, id: result.id } as TechSolution;
  } catch (error) {
    console.warn('[技术方案API] 创建失败，降级到localStorage:', error);
    return techSolutionService.addTechSolution(solution);
  }
}

export async function updateTechSolution(id: string, updates: Partial<TechSolution>): Promise<TechSolution | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/tech-solutions/${id}`, updates);
    return result ? { ...updates, id } as TechSolution : null;
  } catch (error) {
    console.warn('[技术方案API] 更新失败，降级到localStorage:', error);
    return techSolutionService.updateTechSolution(id, updates);
  }
}

export async function deleteTechSolution(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/tech-solutions/${id}`);
    return true;
  } catch (error) {
    console.warn('[技术方案API] 删除失败，降级到localStorage:', error);
    return techSolutionService.deleteTechSolution(id);
  }
}

export async function deleteTechSolutions(ids: string[]): Promise<boolean> {
  try {
    await apiClient.post('/tech-solutions/batch-delete', { ids });
    return true;
  } catch (error) {
    console.warn('[技术方案API] 批量删除失败，降级到localStorage:', error);
    return techSolutionService.deleteTechSolutions(ids);
  }
}

export async function resetTechSolutions(): Promise<void> {
  try {
    await apiClient.post('/tech-solutions/reset');
  } catch (error) {
    console.warn('[技术方案API] 重置失败，降级到localStorage:', error);
  }
  techSolutionService.resetTechSolutions();
}
