/**
 * v0.3 P0-2：任务进度跟踪 API 服务
 *
 * 路径：
 *   POST /api/farm-tasks/:id/progress
 *   POST /api/farm-tasks/:id/complete
 *   POST /api/farm-tasks/:id/start
 *   POST /api/farm-tasks/:id/pause
 *   POST /api/farm-tasks/:id/resume
 *
 * V0.3 UI 暴露范围：
 *   - 仅"完成"按钮（其他按钮隐藏在管理后台）
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface ProgressUpdateResponse {
  progressPct: number;
  autoCompleted: boolean;
}

export interface PauseRequest {
  reason: string;
}

/**
 * 增量更新任务进度
 */
export async function updateTaskProgress(
  taskId: string,
  pct: number
): Promise<ProgressUpdateResponse> {
  return enhancedApiClient.post<ProgressUpdateResponse>(
    `/farm-tasks/${encodeURIComponent(taskId)}/progress`,
    { pct }
  );
}

/**
 * 直接标记任务完成
 */
export async function completeTask(
  taskId: string
): Promise<ProgressUpdateResponse> {
  return enhancedApiClient.post<ProgressUpdateResponse>(
    `/farm-tasks/${encodeURIComponent(taskId)}/complete`,
    {}
  );
}

/**
 * 任务开始（最小进度 5%）
 */
export async function startTask(
  taskId: string
): Promise<ProgressUpdateResponse> {
  return enhancedApiClient.post<ProgressUpdateResponse>(
    `/farm-tasks/${encodeURIComponent(taskId)}/start`,
    {}
  );
}

/**
 * 暂停任务
 */
export async function pauseTask(
  taskId: string,
  reason: string
): Promise<void> {
  await enhancedApiClient.post<void>(
    `/farm-tasks/${encodeURIComponent(taskId)}/pause`,
    { reason }
  );
}

/**
 * 恢复暂停任务
 */
export async function resumeTask(taskId: string): Promise<void> {
  await enhancedApiClient.post<void>(
    `/farm-tasks/${encodeURIComponent(taskId)}/resume`,
    {}
  );
}
