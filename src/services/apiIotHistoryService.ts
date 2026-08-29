/**
 * IoT 历史数据 API Service（2026-08-29）
 * 对接后端 /api/iot-history
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 历史数据类型 */
export type HistoryDataType = '温湿度' | '土壤' | '气象' | '能耗';

/** 历史数据原始（后端 camelCase） */
export interface IotHistoryRaw {
  id: string;
  recordCode: string;
  sensorCode: string;
  sensorName: string;
  dataType: HistoryDataType;
  temp?: number | null;
  humidity?: number | null;
  co2?: number | null;
  soilMoisture?: number | null;
  soilTemp?: number | null;
  ph?: number | null;
  ec?: number | null;
  windSpeed?: number | null;
  power?: number | null;
  voltage?: number | null;
  currentValue?: number | null;
  timestamp: string;
}

/** 历史数据前端展示数据（前端表格只展示 temp/humidity/co2 + 其他列） */
export interface IotHistory {
  id: string;
  recordCode: string;
  sensorCode: string;
  sensorName: string;
  dataType: HistoryDataType;
  /** 显示用温度：温湿度/气象 取 temp，土壤 取 soilTemp */
  tempDisplay: number | null;
  /** 显示用湿度：温湿度/气象 取 humidity，土壤 取 soilMoisture */
  humidityDisplay: number | null;
  /** 显示用其他：能耗=power+kW, 气象=windSpeed, 土壤=ec, 温湿度=co2 */
  otherDisplay: string;
  timestamp: string;
}

function buildOtherDisplay(raw: IotHistoryRaw): string {
  if (raw.dataType === '能耗') {
    return raw.power != null ? `${raw.power}kW` : '-';
  }
  if (raw.dataType === '气象') {
    return raw.windSpeed != null ? `${raw.windSpeed}km/h` : '-';
  }
  if (raw.dataType === '土壤') {
    return raw.ec != null ? `EC:${raw.ec}` : '-';
  }
  // 温湿度
  return raw.co2 != null ? `${raw.co2}ppm` : '-';
}

function normalize(raw: IotHistoryRaw): IotHistory {
  const isSoil = raw.dataType === '土壤';
  return {
    id: raw.id,
    recordCode: raw.recordCode,
    sensorCode: raw.sensorCode,
    sensorName: raw.sensorName,
    dataType: raw.dataType,
    tempDisplay: isSoil ? raw.soilTemp ?? null : raw.temp ?? null,
    humidityDisplay: isSoil ? raw.soilMoisture ?? null : raw.humidity ?? null,
    otherDisplay: buildOtherDisplay(raw),
    timestamp: raw.timestamp,
  };
}

export async function getIotHistory(dataType?: HistoryDataType): Promise<IotHistory[]> {
  const qs = dataType && dataType !== '全部' ? `?dataType=${encodeURIComponent(dataType)}` : '';
  const raws = await enhancedApiClient.get<IotHistoryRaw[]>(`/iot-history${qs}`);
  return raws.map(normalize);
}