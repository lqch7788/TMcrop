/**
 * 生产退料 API 服务
 * 对接后端 /api/material-returns
 *
 * 2026-09-28 审核修复：enhancedApiClient 已自动解包响应体的 data 字段
 * （见 src/lib/apiClient.ts:248 `return (result as {data?}).data ?? result`），
 * 此前的 `resp?.data` / `resp?.success && resp?.data` 多层 fallback 恒不生效且类型报错。
 */
import { enhancedApiClient } from '../lib/apiClient';

export interface MaterialReturnRecord {
  id: string | number;
  code: string;
  date: string;
  type: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  status: string;
  statusClass: string;
  remark?: string;
  operator?: string;
  reviewer?: string;
  reviewDate?: string;
  rejectReason?: string;
  materials: MaterialReturnItem[];
  createBy?: string;
  createTime?: string;
  updateTime?: string;
}

export interface MaterialReturnItem {
  sourceApplicationCode: string;
  materialCode: string;
  category: string;
  materialName: string;
  spec: string;
  unit: string;
  returnQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  reason: string;
  remark: string;
}

/** 获取退料列表（enhancedApiClient 已解包，返回即为数组） */
export async function getMaterialReturns(params?: Record<string, string>): Promise<MaterialReturnRecord[]> {
  let url = '/material-returns';
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const resp = await enhancedApiClient.get<MaterialReturnRecord[]>(url);
  return Array.isArray(resp) ? resp : [];
}

/** 创建退料记录（后端返回完整记录） */
export async function createMaterialReturn(data: Omit<MaterialReturnRecord, 'id'>): Promise<MaterialReturnRecord | null> {
  const result = await enhancedApiClient.post<MaterialReturnRecord>('/material-returns', data);
  // enhancedApiClient 已解包 data，result 即为记录本身
  return result ?? null;
}

/** 更新退料记录（后端返回更新后的完整记录） */
export async function updateMaterialReturn(
  id: string | number,
  updates: Partial<MaterialReturnRecord>
): Promise<MaterialReturnRecord | boolean> {
  const result = await enhancedApiClient.put<MaterialReturnRecord>(`/material-returns/${id}`, updates);
  return result ?? true;
}

/**
 * 作废退料单（2026-09-28 新增）
 * 语义：把状态置为「已作废」并记录作废原因。后端 PUT 会按状态感知逻辑
 * 自动回收此前恢复的库存（有效态 → 非有效态触发 undo）。
 */
export async function voidMaterialReturn(
  id: string | number,
  reason: string
): Promise<MaterialReturnRecord | boolean> {
  const result = await enhancedApiClient.put<MaterialReturnRecord>(`/material-returns/${id}`, {
    status: '已作废',
    rejectReason: reason,
  });
  return result ?? true;
}

/** 删除退料记录 */
export async function deleteMaterialReturn(id: string | number): Promise<boolean> {
  await enhancedApiClient.delete(`/material-returns/${id}`);
  return true;
}

/**
 * 批量删除退料记录（2026-09-28 修复）
 * 改用后端单事务端点：全部成功或全部回滚，不再 Promise.all 并发逐条删除
 * （此前任一条失败会造成"部分已删、部分未删"的状态分裂）。
 */
export async function deleteMaterialReturns(ids: (string | number)[]): Promise<boolean> {
  await enhancedApiClient.post('/material-returns/batch-delete', { ids });
  return true;
}

// ==================== 审批相关（2026-09-28 审批流接入）====================

/** 退料单关联的审批单摘要 */
export interface ReturnApprovalSummary {
  id: string;
  code?: string;
  status: string;
}

/**
 * 查询退料单关联的审批单
 * 后端端点：GET /api/approvals/by-business/return/:requestId
 * 查不到（未提交过审批或已被清理）返回 null，不抛错。
 */
export async function getReturnApproval(returnId: string | number): Promise<ReturnApprovalSummary | null> {
  try {
    const resp = await enhancedApiClient.get<unknown>(`/approvals/by-business/return/${returnId}`);
    // 后端返回 { success, data: [...] }，enhancedApiClient 解包后可能是数组（多条审批，如驳回后重提）；
    // 统一归一化为「取第一条（最新）」——此前只按单对象处理，数组场景恒返回 null 导致撤回找不到审批单
    const raw = (resp as { data?: unknown })?.data ?? resp;
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (first && typeof first === 'object' && (first as { id?: unknown }).id) {
      const rec = first as { id: string; code?: string; status?: string };
      return { id: String(rec.id), code: rec.code, status: String(rec.status || '') };
    }
    return null;
  } catch {
    // 无关联审批单属正常情况（如历史数据），不视为错误
    return null;
  }
}

/** 撤回审批（作废审批单，申请人撤回后单据回到草稿态） */
export async function cancelReturnApproval(approvalId: string, comment = '申请人撤回'): Promise<void> {
  await enhancedApiClient.patch(`/approvals/${approvalId}/action`, { action: 'cancel', comment });
}
