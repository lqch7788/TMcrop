/**
 * 技术方案数据 API 服务
 * 对接后端 /api/tech-solutions
 *
 * 数据流：API → enhancedApiClient（无缓存，仅 3 次重试）→ 组件
 *
 * 缓存策略（已确认无三级缓存）：
 * - L1：Zustand Store 内存数组
 * - L2：（未使用）无 IndexedDB 缓存
 * - L3：（未使用）techSolution 页面不读取 localStorage 中的方案数据
 *
 * 网络策略：
 * - GET 请求：API 直接调用，失败时 3 次指数退避重试
 * - POST/PUT/DELETE：API 直接调用，无离线队列（apiClient 不支持）
 */

import { enhancedApiClient } from '../lib/apiClient';
// 使用 `import type` 告诉 TS 这些是类型导入，编译时会被擦除，不会出现在运行时 ESM 中
import type { TechSolution, TechSolutionStatusValue } from '../types/techSolution';
import { TechSolutionStatus } from '../types/techSolution';

// 重新导出类型（让其他模块仍可从 apiTechSolutionService 导入）
export type { TechSolution, TechSolutionStatusValue };
export { TechSolutionStatus };

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
 * 直接 API 调用（无缓存），失败时 3 次指数退避重试
 */
export async function getTechSolutions(): Promise<TechSolution[]> {
  const data = await enhancedApiClient.get<BackendTechSolution[]>('/tech-solutions');
  return transformTechSolution(data) as TechSolution[];
}

/**
 * 根据ID获取单个技术方案
 * 直接 API 调用（无缓存），失败时 3 次指数退避重试
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
  const result = await enhancedApiClient.post<{ success: boolean; data?: TechSolution }>('/tech-solutions', solution);
  // 返回后端转换后的完整数据（包含正确的字段映射）
  if (result.data) {
    return result.data as TechSolution;
  }
  // 降级：使用前端构建的数据
  return { ...solution, id: (result as any).id } as TechSolution;
}

/**
 * 更新技术方案
 * 降级策略：API → 离线队列
 */
export async function updateTechSolution(id: string, updates: Partial<TechSolution>): Promise<TechSolution | null> {
  const result = await enhancedApiClient.put<{ success: boolean; data?: TechSolution }>(`/tech-solutions/${id}`, updates);
  if (result?.data) {
    return transformTechSolution(result.data) as TechSolution;
  }
  return null;
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

// ============================================================
// 审批记录相关
// ============================================================

import { ApprovalRecord } from '@/types/approval';

/**
 * 审批记录数据结构（用于技术方案详情展示）
 */
export interface TechSolutionApproval {
  id: string;
  code: string;
  title: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  records: ApprovalRecord[];
  createdAt: string;
}

/**
 * 获取技术方案的审批记录
 * @param techSolutionId 技术方案ID
 */
export async function getTechSolutionApprovals(techSolutionId: string): Promise<TechSolutionApproval[]> {
  try {
    const response = await fetch(
      `/api/approvals/by-business/tech_solution/${techSolutionId}`
    );
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        status: item.status,
        currentStep: item.currentStep,
        totalSteps: item.totalSteps,
        records: item.records || [],
        createdAt: item.created_at,
      }));
    }
    return [];
  } catch (error) {
    console.error('获取技术方案审批记录失败:', error);
    return [];
  }
}
