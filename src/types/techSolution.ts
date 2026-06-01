/**
 * 技术方案数据类型定义
 * 唯一类型来源（V2.1 架构）
 *
 * 数据流：API → enhancedApiClient（无缓存，仅3次重试）→ Store → 组件
 * - 无 IndexedDB 缓存
 * - 无 localStorage 兜底（TechSolution 页面不读取 localStorage 中的方案数据）
 * - 无离线队列（apiClient 不支持）
 */

// 技术方案（前端 camelCase 字段）
export interface TechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  cropCode?: string;
  plantingMode: string;
  stage: string;
  author: string;
  authorId?: string;
  createDate: string;
  updateTime?: string;
  status: string;
  batchStatus?: string;
  statusClass?: 'normal' | 'pending' | 'draft';
  version: string;
  content: string;
  approvalDate?: string;
  approver?: string;
  approvalCode?: string;
  approveStatus?: string;
  relatedBatchCode?: string;
  planDetailFileName?: string;
  priority?: string;
  remarks?: string;
  lastSubmitTime?: string;
  isValid?: string;
}

// batch_status 枚举（与后端保持一致）
export const TechSolutionStatus = {
  Draft: 'draft',
  Pending: 'pending',
  Published: 'published',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type TechSolutionStatusValue = typeof TechSolutionStatus[keyof typeof TechSolutionStatus];
