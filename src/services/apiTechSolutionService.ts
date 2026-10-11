/**
 * 技术方案数据 API 服务
 * 对接后端 /api/tech-solutions
 *
 * 数据流：API → enhancedApiClient（无缓存，仅 3 次重试）→ 组件
 *
 * 缓存策略（已确认无三级缓存）：
 * - L1：Zustand Store 内存数组
 * - L2：（未使用）无 API
 * - L3：（未使用）techSolution 页面不读取 localStorage 中的方案数据
 *
 * 网络策略：
 * - GET 请求：API 直接调用，失败时 3 次指数退避重试
 * - POST/PUT/DELETE：API 直接调用，无离线队列（apiClient 不支持）
 */

import { enhancedApiClient } from '../lib/apiClient';
// 使用 `import type` 告诉 TS 这些是类型导入，编译时会被擦除，不会出现在运行时 ESM 中
import type { TechSolution, TechSolutionStatusValue } from '../types/techSolution';
import { logger } from '../lib/logger';
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
  // 2026-10-11：与 TechSolution.statusClass 字面量联合对齐（transformSingle 直接透传该字段）
  statusClass: 'normal' | 'pending' | 'draft';
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
    // 2026-06-05: V9.0 scopes 数组必须保留（关联表 tech_solution_scopes），否则表格回退到 stage 显示
    scopes: Array.isArray((item as Record<string, unknown>).scopes)
      ? ((item as Record<string, unknown>).scopes as string[])
      : [],
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
 * 2026-10-11：技术方案"写入载荷"（与后端 techSolution 路由读取的字段一致）。
 *
 * 说明：读接口返回前端模型 TechSolution（code/title/crop/createDate/status…），
 * 写接口（POST/PUT）收的是 solutionCode/solutionTitle/cropName/cropCode/plantingMode/stage/scopeNames/…
 * —— 此前写接口复用了 TechSolution 模型，导致页面按后端字段组装的对象无法通过类型检查。
 */
export interface TechSolutionPayload {
  /** 方案编号（后端兼容 code / solutionCode 两种写法） */
  code?: string;
  solutionCode?: string;
  solutionTitle?: string;
  cropName?: string;
  cropCode?: string;
  plantingMode?: string;
  stage?: string;
  /** V9.0：适用范围 scopes（后端落库为 scope_names） */
  scopeNames?: string[];
  version?: string;
  content?: string;
  remarks?: string;
  author?: string;
  authorId?: string;
  relatedBatchCode?: string;
  planDetailFileName?: string;
  priority?: string;
  batchStatus?: string;
  /** 其余后端字段原样透传（如 lastSubmitTime / isValid / approvalCode 等） */
  [key: string]: unknown;
}

/**
 * 创建技术方案
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function addTechSolution(solution: TechSolutionPayload): Promise<TechSolution> {
  // H-6 修复：enhancedApiClient.request 已自动解包 result.data（apiClient.ts:215），
  // 此处返回的就是后端写入的完整记录，无需再访问 .data
  // 2026-10-11：泛型改为 TechSolution（客户端已解包 data，原先声明 {success,data} 与实际返回不符）
  const result = await enhancedApiClient.post<TechSolution>('/tech-solutions', solution);
  // 兜底：万一后端未来不返回完整记录，使用前端构造数据
  if (result && typeof result === 'object' && 'id' in result) {
    return result;
  }
  // 运行时与原先一致（{...入参, id}），仅因入参是写载荷需显式转型
  return { ...solution, id: (result as any).id } as unknown as TechSolution;
}

/**
 * 更新技术方案
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function updateTechSolution(id: string, updates: Partial<TechSolutionPayload>): Promise<TechSolution | null> {
  // H-6 修复：enhancedApiClient.request 已自动解包 result.data（apiClient.ts:215），
  // 此处返回的就是后端更新后的完整记录
  // 2026-10-11：泛型改为 TechSolution（客户端已解包 data，原先声明 {success,data} 与实际返回不符）
  const result = await enhancedApiClient.put<TechSolution>(`/tech-solutions/${id}`, updates);
  if (result && typeof result === 'object' && 'id' in result) {
    return result;
  }
  return null;
}

/**
 * 删除技术方案
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
 */
export async function deleteTechSolution(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/tech-solutions/${id}`);
  return true;
}

/**
 * 批量删除技术方案
 * 网络策略：API 直连 + enhancedApiClient 3 次重试（V2.1 铁律：无离线队列）
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

/**
 * C2 新增：调用后端生成技术方案编码（避免前端 Math.random 兜底违规）
 * 后端按 TS+YYYYMMDD+3位流水号 规则生成
 */
export async function generateTechSolutionCode(): Promise<string> {
  const data = await enhancedApiClient.get<{ code: string }>('/tech-solutions/generate-code');
  return (data && (data as { code?: string }).code) || '';
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
    logger.error('获取技术方案审批记录失败', error);
    return [];
  }
}
