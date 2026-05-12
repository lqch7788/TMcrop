/**
 * 问题管理 API 服务
 * 对接后端 /api/problems
 * API失败时降级到 localStorage
 */

import { enhancedApiClient } from '../lib/apiClient';

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

// localStorage 配置
const STORAGE_KEY = 'yuanxingtu_problems';

// 默认空数据
const defaultProblems: Problem[] = [];

// 从 localStorage 读取数据
function getStoredProblems(): Problem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultProblems;
  } catch {
    return defaultProblems;
  }
}

// 保存数据到 localStorage
function saveToStorage(data: Problem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 获取所有问题记录（带localStorage降级）
 */
export async function getAllProblems(): Promise<Problem[]> {
  try {
    const data = await apiClient.get<Problem[]>('/problems');
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[问题API] 获取列表失败，降级到localStorage:', error);
    return getStoredProblems();
  }
}

/**
 * 根据ID获取问题（带localStorage降级）
 */
export async function getProblemById(id: number): Promise<Problem | undefined> {
  try {
    return await apiClient.get<Problem>(`/problems/${id}`);
  } catch (error) {
    console.warn('[问题API] 获取单个失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.find(p => p.id === id);
  }
}

/**
 * 根据问题编码获取问题（带localStorage降级）
 */
export async function getProblemByCode(problemCode: string): Promise<Problem | undefined> {
  try {
    return await apiClient.get<Problem>(`/problems/code/${problemCode}`);
  } catch (error) {
    console.warn('[问题API] 获取单个失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.find(p => p.problemCode === problemCode);
  }
}

/**
 * 获取问题列表（支持筛选）（带localStorage降级）
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
  try {
    const data = await apiClient.get<Problem[]>('/problems', params);
    saveToStorage(data);
    return data;
  } catch (error) {
    console.warn('[问题API] 获取列表失败，降级到localStorage:', error);
    return getStoredProblems();
  }
}

/**
 * 创建问题（带localStorage降级）
 */
export async function createProblem(problem: Omit<Problem, 'id' | 'problemCode' | 'createTime' | 'updateTime'>): Promise<Problem> {
  try {
    const result = await apiClient.post<Problem>('/problems', problem);
    // 同步到 localStorage
    const stored = getStoredProblems();
    stored.unshift(result);
    saveToStorage(stored);
    return result;
  } catch (error) {
    console.warn('[问题API] 创建失败，降级到localStorage:', error);
    const localProblem: Problem = {
      ...problem,
      id: Date.now(),
      problemCode: `P${Date.now()}`,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    const stored = getStoredProblems();
    stored.unshift(localProblem);
    saveToStorage(stored);
    return localProblem;
  }
}

/**
 * 更新问题（带localStorage降级）
 */
export async function updateProblem(id: number, updates: Partial<Problem>): Promise<Problem | null> {
  try {
    const result = await apiClient.put<Problem>(`/problems/${id}`, updates);
    // 同步到 localStorage
    const stored = getStoredProblems();
    const index = stored.findIndex(p => p.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
    }
    return result;
  } catch (error) {
    console.warn('[问题API] 更新失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    const index = stored.findIndex(p => p.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveToStorage(stored);
      return stored[index];
    }
    return null;
  }
}

/**
 * 删除问题（带localStorage降级）
 */
export async function deleteProblem(id: number): Promise<boolean> {
  try {
    await apiClient.delete(`/problems/${id}`);
    // 从 localStorage 移除
    const stored = getStoredProblems();
    const filtered = stored.filter(p => p.id !== id);
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[问题API] 删除失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    const filtered = stored.filter(p => p.id !== id);
    saveToStorage(filtered);
    return true;
  }
}

/**
 * 批量删除问题（带localStorage降级）
 */
export async function deleteProblems(ids: number[]): Promise<boolean> {
  try {
    await apiClient.delete(`/problems/batch?ids=${ids.join(',')}`);
    // 从 localStorage 移除
    const stored = getStoredProblems();
    const filtered = stored.filter(p => !ids.includes(p.id));
    saveToStorage(filtered);
    return true;
  } catch (error) {
    console.warn('[问题API] 批量删除失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    const filtered = stored.filter(p => !ids.includes(p.id));
    saveToStorage(filtered);
    return true;
  }
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
 * 根据大棚获取问题列表（带localStorage降级）
 */
export async function getProblemsByGreenhouse(greenhouseId: string): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>(`/problems/greenhouse/${greenhouseId}`);
  } catch (error) {
    console.warn('[问题API] 按大棚获取失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.greenhouseId === greenhouseId);
  }
}

/**
 * 根据批次获取问题列表（带localStorage降级）
 */
export async function getProblemsByBatch(batchId: string): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>(`/problems/batch/${batchId}`);
  } catch (error) {
    console.warn('[问题API] 按批次获取失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.batchId === batchId);
  }
}

/**
 * 根据来源获取问题列表（带localStorage降级）
 */
export async function getProblemsBySource(sourceType: string, sourceId: string): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>(`/problems/source/${sourceType}/${sourceId}`);
  } catch (error) {
    console.warn('[问题API] 按来源获取失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.sourceType === sourceType && p.sourceId === sourceId);
  }
}

/**
 * 获取待处理的问题列表（带localStorage降级）
 */
export async function getPendingProblems(): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>('/problems/pending');
  } catch (error) {
    console.warn('[问题API] 获取待处理问题失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.status === '待处理');
  }
}

/**
 * 获取处理中的问题列表（带localStorage降级）
 */
export async function getProcessingProblems(): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>('/problems/processing');
  } catch (error) {
    console.warn('[问题API] 获取处理中问题失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.status === '处理中');
  }
}

/**
 * 获取已处理的问题列表（带localStorage降级）
 */
export async function getResolvedProblems(): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>('/problems/resolved');
  } catch (error) {
    console.warn('[问题API] 获取已处理问题失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.status === '已处理');
  }
}

/**
 * 获取严重问题列表（带localStorage降级）
 */
export async function getSeriousProblems(): Promise<Problem[]> {
  try {
    return await apiClient.get<Problem[]>('/problems/serious');
  } catch (error) {
    console.warn('[问题API] 获取严重问题失败，降级到localStorage:', error);
    const stored = getStoredProblems();
    return stored.filter(p => p.severity === '严重');
  }
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
