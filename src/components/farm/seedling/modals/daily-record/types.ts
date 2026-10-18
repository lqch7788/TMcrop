/**
 * 育苗每日记录弹窗 — 表单数据类型
 * 2026-10-18：从 DailyRecordModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { FeedRecordItem } from '../FeedRecordCard';

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
  // 2026-06-28：浇水方式 + 浇水量（PR1）
  watering: boolean;
  wateringMethod: string | undefined;
  wateringAmount: number | undefined;
  wateringUnit: string | undefined;
  // 2026-06-28：施肥/用药记录子表（1:N 嵌套，存储到 daily_records.data JSON）
  fertilizerRecords: FeedRecordItem[];
  pesticideRecords: FeedRecordItem[];
  abnormality: string;
  survivalCountChange: number | undefined;
  lossCountChange: number | undefined;
  runnerIncreaseCount: number | undefined;
  replantChange: number | undefined;
  remarks: string;
  operator: string;
  // 兼容字段：母株/小苗数量统计别名（2026-06-30 tsc 兼容）
  motherLossCount: number | undefined;
  replantCount: number | undefined;
  expandedPlantCount: number | undefined;
  seedlingLossCount: number | undefined;
}
