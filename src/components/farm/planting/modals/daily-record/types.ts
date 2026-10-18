/**
 * 种植每日记录弹窗 — 表单数据类型
 * 2026-10-18：从 DailyRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { FeedRecordItem } from '@/components/farm/seedling/modals/FeedRecordCard';

export interface DailyFormData {
  recordDate: string;
  // 2026-08-21：环境参数 8 字段
  airTemperature: number | undefined;
  airHumidity: number | undefined;
  lightIntensity: number | undefined;
  co2: number | undefined;
  soilTemperature: number | undefined;
  soilHumidity: number | undefined;
  soilPhValue: number | undefined;
  soilEcValue: number | undefined;
  watering: boolean;
  wateringMethod: string | undefined;
  wateringAmount: number | undefined;
  wateringUnit: string | undefined;
  fertilizerRecords: FeedRecordItem[];
  pesticideRecords: FeedRecordItem[];
  abnormality: string;
  // 2026-06-28：种植单池 — 只有损耗/补栽 2 个字段
  lossChange: number | undefined;
  supplementChange: number | undefined;
  remarks: string;
  operator: string;
}
