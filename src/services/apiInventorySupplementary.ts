/**
 * 作物库存补录申请单 Service（2026-10-09）
 *
 * AddStockModal 的 sourceType='self_produced' 走这个端点
 * 审批通过后由 approvalLinkage case 'crop_storage' 真正入库
 *
 * ⚠️ 重要：enhancedApiClient 已自动解包后端响应的 `data` 字段，
 *    所以这里直接返回解包后的值，不能再 `res.data` 二次访问。
 */

import { enhancedApiClient } from '@/lib/apiClient';

/** POST /api/inventory-supplementary-applications 申请单 payload */
export interface SupplementaryApplicationPayload {
  // 来源
  sourceId: string;
  sourceModule: string;
  sourceCode?: string;
  // 物料
  stockType: 'seed' | 'seedling' | 'product';
  cropId?: string;
  cropCode?: string;
  cropName: string;
  varietyName?: string;
  plantingMode?: string;
  quantity: number;
  unit: string;
  qualityGrade?: string;
  // 仓库
  warehouseId: string;
  warehouseName?: string;
  // 业务字段
  supplementaryReason: string;
  unitPrice?: number;
  supplierId?: string;
  supplierName?: string;
  productionPlanId?: string;
  productionPlanCode?: string;
  notes?: string;
  // 申请人
  applicantId?: string;
  applicantName: string;
  applicantDepartment?: string;
  operatorName?: string;
}

/** POST /api/inventory-supplementary-applications */
export async function submitSupplementaryApplication(
  payload: SupplementaryApplicationPayload,
): Promise<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }> {
  return await enhancedApiClient.post<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }>(
    '/inventory-supplementary-applications',
    payload,
  );
}