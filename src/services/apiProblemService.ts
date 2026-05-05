/**
 * 问题管理 API 服务
 * 对接后端 /api/problems
 */

import { apiClient } from './apiClient';

// 问题类型定义（基于 farm/common.ts 中的定义）
export interface Problem {
  id: number;
  problemCode: string;
  // 基本信息
  title: string;
  description: string;
  category: 'disease' | 'pest' | 'environment' | 'growth' | 'equipment' | 'other';
  severity: '轻微' | '中等' | '严重';
  status: '待处理' | '处理中' | '已处理';
  // 位置信息
  greenhouseId?: string;
  greenhouseName?: string;
  batchId?: string;
  batchCode?: string;
  locationCode?: string;
  locationName?: string;
  // 来源信息
  sourceType: 'inspection' | 'task' | 'manual';
  sourceId?: string;
  sourceCode?: string;
  // 巡查记录关联
  inspectionId?: string;
  inspectionCode?: string;
  // 反馈人员
  feedbackUsers?: string[];
  // 期望完成时间
  expectedCompletion?: string;
  // 处理信息
  handlerId?: string;
  handlerName?: string;
  handleTime?: string;
  handleResult?: string;
  // 图片
  photos?: string[];
  // 创建信息
  creatorId: string;
  creatorName: string;
  createTime: string;
  updateTime: string;
}

// 导入本地服务作为回退（暂未实现，将来的本地服务）
// import * as localService from './problemService';

/**
 * 获取所有问题记录
 */
export async function getAllProblems(): Promise<Problem[]> {
  return apiClient.get<Problem[]>('/problems');
}

/**
 * 根据ID获取问题
 */
export async function getProblemById(id: number): Promise<Problem | undefined> {
  return apiClient.get<Problem>(`/problems/${id}`);
}

/**
 * 根据问题编码获取问题
 */
export async function getProblemByCode(problemCode: string): Promise<Problem | undefined> {
  return apiClient.get<Problem>(`/problems/code/${problemCode}`);
}

/**
 * 获取问题列表（支持筛选）
 */
export async function getProblems(filters?: {
  status?: string;
  category?: string;
  severity?: string;
  greenhouseId?: string;
  batchId?: string;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}): Promise<Problem[]> {
  const params: Record<string, string> = {};
  if (filters) {
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.severity) params.severity = filters.severity;
    if (filters.greenhouseId) params.greenhouseId = filters.greenhouseId;
    if (filters.batchId) params.batchId = filters.batchId;
    if (filters.sourceType) params.sourceType = filters.sourceType;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.keyword) params.keyword = filters.keyword;
  }
  return apiClient.get<Problem[]>('/problems', params);
}

/**
 * 创建问题
 */
export async function createProblem(problem: Omit<Problem, 'id' | 'problemCode' | 'createTime' | 'updateTime'>): Promise<Problem> {
  return apiClient.post<Problem>('/problems', problem);
}

/**
 * 更新问题
 */
export async function updateProblem(id: number, updates: Partial<Problem>): Promise<Problem | null> {
  return apiClient.put<Problem>(`/problems/${id}`, updates);
}

/**
 * 删除问题
 */
export async function deleteProblem(id: number): Promise<boolean> {
  await apiClient.delete(`/problems/${id}`);
  return true;
}

/**
 * 批量删除问题
 */
export async function deleteProblems(ids: number[]): Promise<boolean> {
  await apiClient.delete(`/problems/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 分派问题
 */
export async function assignProblem(id: number, handlerId: string, handlerName: string): Promise<Problem | null> {
  return apiClient.post<Problem>(`/problems/${id}/assign`, { handlerId, handlerName });
}

/**
 * 开始处理问题
 */
export async function startProcessing(id: number): Promise<Problem | null> {
  return apiClient.post<Problem>(`/problems/${id}/start-processing`);
}

/**
 * 标记问题为已处理
 */
export async function resolveProblem(id: number, handleResult?: string): Promise<Problem | null> {
  return apiClient.post<Problem>(`/problems/${id}/resolve`, { handleResult });
}

/**
 * 根据大棚获取问题列表
 */
export async function getProblemsByGreenhouse(greenhouseId: string): Promise<Problem[]> {
  return apiClient.get<Problem[]>(`/problems/greenhouse/${greenhouseId}`);
}

/**
 * 根据批次获取问题列表
 */
export async function getProblemsByBatch(batchId: string): Promise<Problem[]> {
  return apiClient.get<Problem[]>(`/problems/batch/${batchId}`);
}

/**
 * 根据来源获取问题列表
 */
export async function getProblemsBySource(sourceType: string, sourceId: string): Promise<Problem[]> {
  return apiClient.get<Problem[]>(`/problems/source/${sourceType}/${sourceId}`);
}

/**
 * 获取待处理的问题列表
 */
export async function getPendingProblems(): Promise<Problem[]> {
  return apiClient.get<Problem[]>('/problems/pending');
}

/**
 * 获取处理中的问题列表
 */
export async function getProcessingProblems(): Promise<Problem[]> {
  return apiClient.get<Problem[]>('/problems/processing');
}

/**
 * 获取已处理的问题列表
 */
export async function getResolvedProblems(): Promise<Problem[]> {
  return apiClient.get<Problem[]>('/problems/resolved');
}

/**
 * 获取严重问题列表
 */
export async function getSeriousProblems(): Promise<Problem[]> {
  return apiClient.get<Problem[]>('/problems/serious');
}

/**
 * 生成问题编码
 */
export async function generateProblemCode(): Promise<string> {
  return apiClient.get<string>('/problems/generate-code');
}

/**
 * 获取问题统计
 */
export async function getProblemStats(filters?: {
  startDate?: string;
  endDate?: string;
  greenhouseId?: string;
}): Promise<{
  total: number;
  pending: number;
  processing: number;
  resolved: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}> {
  return apiClient.get('/problems/stats');
}

/**
 * 关联任务
 */
export async function linkTask(problemId: number, taskId: string, taskCode: string): Promise<boolean> {
  await apiClient.post(`/problems/${problemId}/link-task`, { taskId, taskCode });
  return true;
}

/**
 * 添加问题处理记录
 */
export async function addProblemHandleRecord(problemId: number, record: {
  handlerId: string;
  handlerName: string;
  action: string;
  description?: string;
}): Promise<boolean> {
  await apiClient.post(`/problems/${problemId}/handle-records`, record);
  return true;
}
