/**
 * 入库弹窗表单 → InventoryInboundInput 映射适配器
 *
 * AddStockModal（页面级，含 cropSelector）和
 * InventoryInboundModal（行级，作物来自 sourceRecord）共用此适配器。
 *
 * 设计原则：
 * - 字段映射集中，避免两个弹窗各自拼 payload 时漂移
 * - 未知字段原样透传，方便扩展（如 stockType=seed 时的额外字段）
 * - 不做业务校验（校验由 validateBySourceType 负责）
 */

import type {
  InventoryInboundInput,
  SourceType,
  StockType,
  InboundSourceRecord,
} from '@/types/inventoryInbound';

export interface OperatorInfo {
  operatorName?: string;
  operatorId?: string;
}

/**
 * 从 useAuthStore.currentUser 提取 operatorInfo。
 * 兼容多种用户对象：{name} / {realName} / {username} 都按优先级取值。
 * 避免 inventoryInbound 弹窗里手写 `{ operatorName: user.realName || 'system' }`。
 */
export function buildOperatorInfo(
  currentUser:
    | { name?: string; realName?: string; username?: string }
    | null
    | undefined,
): OperatorInfo {
  return {
    operatorName:
      currentUser?.name || currentUser?.realName || currentUser?.username || 'system',
  };
}

/**
 * 把通用 formData 拍平为 InventoryInboundInput。
 *
 * 入参：
 * - formData: 表单状态（Record<string, any>，包含 COMMON_FIELDS + 来源专属字段）
 * - sourceType: 当前来源类型
 * - sourceRecord: 行级弹窗携带的源记录（页面级弹窗可为 null）
 * - operator: 操作人信息（buildOperatorInfo 的输出）
 * - extra: 弹窗级别的固定入参，如 stockType / businessId
 */
export function toPayload(
  formData: Record<string, any>,
  sourceType: SourceType,
  sourceRecord: InboundSourceRecord | null,
  operator: OperatorInfo,
  extra: { stockType: StockType; businessId?: string },
): InventoryInboundInput {
  // 数值字段统一 Number()（去空串 / undefined）
  const num = (v: any) => (v === '' || v === null || v === undefined ? 0 : Number(v));
  // 字符串字段统一 trim 一下（去纯空白）
  const str = (v: any) => (v === null || v === undefined ? undefined : String(v).trim() || undefined);

  return {
    // 来源信息（行级弹窗从 sourceRecord，页面级弹窗默认 'manual' 标识 + 空 sourceId）
    // 2026-07-08 P0 修复：原 'planting' 兜底会让后端 InboundSchema 误判为"行级种植入库"并要求 sourceId
    //                  改为 'manual' 标识 + 空 sourceId 后，后端 fetchSourceRow 短路返回 null
    sourceModule: sourceRecord?.module ?? 'manual',
    sourceId: sourceRecord?.id ?? '',
    sourceType,
    stockType: extra.stockType,

    // 仓库 + 入库日期
    warehouseId: String(formData.warehouseId ?? ''),
    warehouseName: str(formData.warehouseName),
    recordDate: str(formData.recordDate),

    // 行级弹窗作物字段从 sourceRecord 注入（页面级弹窗可走 formData.cropSelector）
    cropId: str(formData.cropId) ?? sourceRecord?.id,
    cropCode: str(formData.cropCode) ?? sourceRecord?.cropCode,
    cropName: str(formData.cropName) ?? sourceRecord?.cropName,
    varietyName: str(formData.varietyName) ?? sourceRecord?.cropVariety,

    // 数量 + 单位 + 价格
    quantity: num(formData.quantity),
    unit: str(formData.unit) ?? sourceRecord?.unit ?? '克',
    unitPrice: num(formData.unitPrice),
    totalAmount: num(formData.totalAmount),
    qualityGrade: str(formData.qualityGrade),

    // 供应商 / 赠送 / 委托 / 调拨 / 手动 / 自产
    supplierId: str(formData.supplierId),
    supplierName: str(formData.supplierName),
    // 2026-07-08 T13 Bug 3：移除 supplierPhone（弹窗不再收集，supplier 实体的电话字段在 supplier 表维护）
    // supplierPhone: str(formData.supplierPhone),  // 删除
    giftFrom: str(formData.giftFrom),
    consignor: str(formData.consignor),
    sourceWarehouseName: str(formData.sourceWarehouseName),
    stocktakeNo: str(formData.stocktakeNo),
    baseId: str(formData.baseId),
    baseName: str(formData.baseName),
    // 2026-07-08 T13 Bug 2：作物形态（crop_form）— 6 套 FIELD_CONFIG 都已加此字段
    cropForm: str(formData.cropForm),

    // 行级弹窗联动溯源字段
    productionPlanId: str(formData.productionPlanId) ?? sourceRecord?.productionPlanId,
    productionPlanCode: str(formData.productionPlanCode) ?? sourceRecord?.productionPlanCode,
    businessId: extra.businessId,

    notes: str(formData.notes),
    operatorName: operator.operatorName,
  };
}
