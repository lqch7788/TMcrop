/**
 * 作物库存调拨申请单 Service（2026-10-09）
 *
 * AddStockModal 的 sourceType='transfer' 走这个端点
 * 审批通过后由 approvalLinkage case 'material_transfer' 真做跨仓库：源扣减 + 目标加 + 流水
 *
 * ⚠️ 重要：enhancedApiClient 已自动解包后端响应的 `data` 字段，
 *    所以这里直接返回解包后的值，不能再 `res.data` 二次访问。
 */

import { enhancedApiClient } from '@/lib/apiClient';

/** POST /api/inventory-transfer-applications 申请单 payload */
export interface TransferApplicationPayload {
  // 双仓库
  sourceWarehouseId: string;
  sourceWarehouseName?: string;
  targetWarehouseId: string;
  targetWarehouseName?: string;
  // 源库存（可选；如果前端能定位具体源库存实例 ID 则传，后端会做扣减）
  sourceStockId?: string;
  sourceStockCode?: string;
  // 物料
  materialId?: string;
  materialCode?: string;
  materialName: string;
  category?: string;
  specification?: string;
  quantity: number;
  unit: string;
  // 业务字段
  transferReason: string;
  transferType?: string;
  expectedDate?: string;
  notes?: string;
  // 申请人
  applicantId?: string;
  applicantName: string;
  applicantDepartment?: string;
  operatorName?: string;
}

/** POST /api/inventory-transfer-applications */
export async function submitTransferApplication(
  payload: TransferApplicationPayload,
): Promise<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }> {
  return await enhancedApiClient.post<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }>(
    '/inventory-transfer-applications',
    payload,
  );
}