/**
 * v0.3 SOP 库 API 服务
 */
import { enhancedApiClient } from '@/lib/apiClient';

export interface SopStep {
  id?: string;
  stepOrder: number;
  stepTitle: string;
  stepContent?: string;
  stepImages?: string[];
  stepVideoUrl?: string;
  pesticideCode?: string;
  dosage?: string;
  dilutionRatio?: string;
  estimatedMinutes?: number;
  safetyNotes?: string;
}

export interface Sop {
  id: string;
  sopCode: string;
  sopName: string;
  cropCode?: string;
  cropVariety?: string;
  growthStage?: string;
  taskType: string;
  version?: number;
  effectiveDate?: string;
  expiryDate?: string;
  status?: string;
  description?: string;
  warningNotes?: string;
  creatorId?: string;
  creatorName?: string;
  steps?: SopStep[];
}

export interface SopCreateRequest {
  sopCode: string;
  sopName: string;
  cropCode?: string;
  growthStage?: string;
  taskType: string;
  description?: string;
  steps?: SopStep[];
}

export async function listSop(params?: { cropCode?: string; taskType?: string }): Promise<Sop[]> {
  // 注意：enhancedApiClient GET 不支持 params，必须 URLSearchParams 拼 URL
  // 后端 query 参数是 snake_case（crop_code / task_type），不会被 camelCase 中间件转换
  const qs = new URLSearchParams();
  if (params?.cropCode) qs.append('crop_code', params.cropCode);
  if (params?.taskType) qs.append('task_type', params.taskType);
  const url = `/sop${qs.toString() ? `?${qs.toString()}` : ''}`;
  return enhancedApiClient.get<Sop[]>(url);
}

export async function getSop(id: string): Promise<Sop> {
  return enhancedApiClient.get<Sop>(`/sop/${encodeURIComponent(id)}`);
}

export async function createSop(data: SopCreateRequest): Promise<{ id: string; sopCode: string }> {
  // snake_case（后端已兼容两种，此处保持与后端默认一致）
  return enhancedApiClient.post<{ id: string; sopCode: string }>('/sop', {
    sop_code: data.sopCode,
    sop_name: data.sopName,
    crop_code: data.cropCode ?? null,
    growth_stage: data.growthStage ?? null,
    task_type: data.taskType,
    description: data.description ?? null,
    steps: data.steps?.map((s) => ({
      step_order: s.stepOrder,
      step_title: s.stepTitle,
      step_content: s.stepContent ?? null,
      step_images: s.stepImages ? JSON.stringify(s.stepImages) : null,
      step_video_url: s.stepVideoUrl ?? null,
      pesticide_code: s.pesticideCode ?? null,
      dosage: s.dosage ?? null,
      dilution_ratio: s.dilutionRatio ?? null,
      estimated_minutes: s.estimatedMinutes ?? null,
      safety_notes: s.safetyNotes ?? null,
    })) ?? [],
  });
}

export async function updateSop(id: string, data: Partial<Sop>): Promise<void> {
  await enhancedApiClient.put<void>(`/sop/${encodeURIComponent(id)}`, {
    sop_name: data.sopName,
    crop_variety: data.cropVariety,
    growth_stage: data.growthStage,
    description: data.description,
    warning_notes: data.warningNotes,
    status: data.status,
    effective_date: data.effectiveDate,
    expiry_date: data.expiryDate,
  });
}

export async function deleteSop(id: string): Promise<void> {
  await enhancedApiClient.delete<void>(`/sop/${encodeURIComponent(id)}`);
}

export async function recommendSop(cropCode: string, taskType?: string): Promise<Sop[]> {
  const qs = new URLSearchParams();
  qs.append('crop_code', cropCode);
  if (taskType) qs.append('task_type', taskType);
  return enhancedApiClient.get<Sop[]>(`/sop/recommend/list?${qs.toString()}`);
}

/**
 * P0-7：新增 SOP 步骤
 * 后端：POST /api/sop/:id/steps
 * 注意：camelCaseRequest 中间件未启用，req.body 保持原样 → 这里发 snake_case
 */
export async function addSopStep(sopId: string, step: SopStep): Promise<{ id: string }> {
  return enhancedApiClient.post<{ id: string }>(
    `/sop/${encodeURIComponent(sopId)}/steps`,
    {
      step_order: step.stepOrder,
      step_title: step.stepTitle,
      step_content: step.stepContent ?? null,
      step_images: step.stepImages ? JSON.stringify(step.stepImages) : null,
      step_video_url: step.stepVideoUrl ?? null,
      pesticide_code: step.pesticideCode ?? null,
      dosage: step.dosage ?? null,
      dilution_ratio: step.dilutionRatio ?? null,
      estimated_minutes: step.estimatedMinutes ?? null,
      safety_notes: step.safetyNotes ?? null,
    },
  );
}

/**
 * P0-7：删除 SOP 步骤
 * 后端：DELETE /api/sop/steps/:id
 */
export async function deleteSopStep(stepId: string): Promise<void> {
  await enhancedApiClient.delete<void>(`/sop/steps/${encodeURIComponent(stepId)}`);
}

/**
 * P0-7：任务 ↔ SOP 绑定
 * 后端：POST /api/sop/bind-task（body 用 snake_case，服务端解构后按原样使用）
 */
export async function bindSopToTask(
  sopId: string,
  taskId: string,
  bindingType: 'recommended' | 'mandatory' = 'recommended',
  boundBy?: string,
): Promise<{ id: string }> {
  return enhancedApiClient.post<{ id: string }>('/sop/bind-task', {
    sop_id: sopId,
    task_id: taskId,
    binding_type: bindingType,
    bound_by: boundBy,
  });
}

/**
 * P0-7：解除任务 ↔ SOP 绑定
 */
export async function unbindSopFromTask(bindingId: string): Promise<void> {
  await enhancedApiClient.delete<void>(`/sop/bind-task/${encodeURIComponent(bindingId)}`);
}

/** P0-7：任务绑定的 SOP（含步骤） */
export interface SopTaskBinding {
  bindingId: string;
  bindingType: string;
  boundAt?: string;
  boundBy?: string;
  sopId: string;
  sopCode: string;
  sopName: string;
  taskType?: string;
  growthStage?: string;
  version?: number;
  warningNotes?: string;
  steps?: SopStep[];
}

export async function getSopBindings(taskId: string): Promise<SopTaskBinding[]> {
  const qs = new URLSearchParams();
  qs.append('task_id', taskId);
  return enhancedApiClient.get<SopTaskBinding[]>(`/sop/bindings?${qs.toString()}`);
}
