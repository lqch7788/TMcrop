/**
 * 2026-07-18 P2-M3：抽共用 PesticidePoolItem 接口（Add + Edit 共用）
 * 防止两个弹窗定义漂移导致字段兼容 bug
 */

export interface PesticidePoolItem {
  pesticideId?: string;
  pesticideName: string;
  pesticideCode?: string;
  pesticideTypes?: string[];
  specId?: string;
  specContent?: string;
  formulation?: string;
  manufacturer?: string;
  brandName?: string;
  dosage?: string;
  // 2026-08-15：建议用量（药剂库规格自带，只读展示；与 dosage=用户实际用量 区分）
  suggestedDosage?: string;
  unit?: string;
  dilutionRatio?: string;
  applicationMethod?: string;
  remarks?: string;
  // 2026-07-26：库存信息（对照肥料池 FertilizerPoolItem，下拉和池内行展示剩余用量）
  stockQuantity?: number;
  stockUnit?: string;
  unitPrice?: number;
}