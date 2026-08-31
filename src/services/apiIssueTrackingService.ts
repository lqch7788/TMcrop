/**
 * v0.3 问题整改追踪 API 服务
 */
import { enhancedApiClient } from '@/lib/apiClient';

export interface Issue {
  id: string;
  problemType?: string;
  severity?: string;
  status?: string;
  description?: string;
  rectificationProgress?: number;
  recheckRequired?: number;
  recheckResult?: string;
  recheckAt?: string;
  recheckerId?: string;
  recurrenceCount?: number;
  relatedBatchCode?: string;
  createTime?: string;
}

export interface IssueBoard {
  pending: Issue[];
  inProgress: Issue[];
  recheckPending: Issue[];
  closed: Issue[];
  recurrence: Issue[];
}

export interface IssueBoardResponse {
  board: IssueBoard;
  counts: {
    pending: number;
    inProgress: number;
    recheckPending: number;
    closed: number;
    recurrence: number;
    total: number;
  };
}

export async function getIssueBoard(params?: {
  assigneeId?: string;
  batchCode?: string;
  severity?: string;
}): Promise<IssueBoardResponse> {
  // 后端 query 参数是 snake_case（不会被 camelCase 中间件转换）
  const qs = new URLSearchParams();
  if (params?.assigneeId) qs.append('assignee_id', params.assigneeId);
  if (params?.batchCode) qs.append('batch_code', params.batchCode);
  if (params?.severity) qs.append('severity', params.severity);
  const url = `/issues/board${qs.toString() ? `?${qs.toString()}` : ''}`;
  return enhancedApiClient.get<IssueBoardResponse>(url);
}

export async function getIssue(id: string): Promise<Issue> {
  return enhancedApiClient.get<Issue>(`/issues/${encodeURIComponent(id)}`);
}

export async function rectifyIssue(
  id: string,
  data: { progress: number; remark?: string; actor_id?: string }
): Promise<void> {
  await enhancedApiClient.post<void>(`/issues/${encodeURIComponent(id)}/rectify`, data);
}

export async function recheckIssue(
  id: string,
  data: { result: 'pass' | 'fail'; comment?: string; actor_id?: string }
): Promise<void> {
  await enhancedApiClient.post<void>(`/issues/${encodeURIComponent(id)}/recheck`, data);
}

export async function getBatchIssues(batchCode: string): Promise<Issue[]> {
  return enhancedApiClient.get<Issue[]>(`/issues/by-batch/${encodeURIComponent(batchCode)}`);
}
