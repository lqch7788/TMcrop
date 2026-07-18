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
  unit?: string;
  dilutionRatio?: string;
  applicationMethod?: string;
  remarks?: string;
}