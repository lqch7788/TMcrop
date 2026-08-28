/**
 * 天气 API 服务
 * 对接后端 /api/weather/*（后端代理 Open-Meteo + Nominatim，2026-08-28 从和风天气迁移）
 *
 * 数据流：组件 → Store → apiWeatherService → enhancedApiClient → 后端
 * V2.1 铁律：禁用 IndexedDB / localStorage / persist 兜底
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 当前实况（Open-Meteo current 字段 + reverse geocode 名称） */
export interface WeatherNow {
  temp: string;
  feelsLike: string;
  weather: string;         // 中文描述（如"晴"）
  weatherCode: number;     // WMO 数字码，前端用 code → lucide 图标映射
  windSpeed: string;       // km/h
  humidity: string;        // %
  pressure: string;        // hPa
  obsTime: string;
  locationName: string;    // 如"浙江省 舟山市"
}

/** 7 天预报单日数据 */
export interface WeatherForecastDay {
  date: string;            // YYYY-MM-DD
  tempMax: string;
  tempMin: string;
  weather: string;         // 中文描述
  weatherCode: number;
}

/** 当前 + 7 天合并响应 */
export interface WeatherCurrentResponse {
  now: WeatherNow;
  forecast: WeatherForecastDay[];
}

/**
 * 获取当前 + 7 天合并数据（前端环境监测卡片一次拿全）
 * @param lat 纬度（WGS84）
 * @param lon 经度（WGS84）
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherCurrentResponse> {
  // 注意：enhancedApiClient.get 不支持 params 对象，必须用 URLSearchParams 拼到 URL
  // 教训：2026-06-27 育苗入库记录 0 条 1 小时调试
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) }).toString();
  return await enhancedApiClient.get<WeatherCurrentResponse>(`/weather/current?${qs}`);
}

/**
 * 仅获取当前实况
 */
export async function getWeatherNowOnly(lat: number, lon: number): Promise<WeatherNow> {
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) }).toString();
  return await enhancedApiClient.get<WeatherNow>(`/weather/now?${qs}`);
}

/**
 * 仅获取 7 天预报
 */
export async function getWeatherForecastOnly(lat: number, lon: number): Promise<WeatherForecastDay[]> {
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) }).toString();
  return await enhancedApiClient.get<WeatherForecastDay[]>(`/weather/forecast?${qs}`);
}

/**
 * WMO 天气代码 → lucide 图标组件名
 * 与后端 server/src/services/weather.service.ts 的 WMO_WEATHER.icon 保持一致
 * 前端拿组件名后用 React.lazy 或 switch 映射到 lucide 图标组件
 */
export type WeatherIconName =
  | 'Sun' | 'CloudSun' | 'Cloud' | 'CloudRain' | 'CloudSnow';

export const WMO_CODE_TO_ICON: Record<number, WeatherIconName> = {
  0: 'Sun',
  1: 'CloudSun', 2: 'CloudSun', 3: 'Cloud',
  45: 'Cloud', 48: 'Cloud',
  51: 'CloudRain', 53: 'CloudRain', 55: 'CloudRain',
  56: 'CloudSnow', 57: 'CloudSnow',
  61: 'CloudRain', 63: 'CloudRain', 65: 'CloudRain',
  66: 'CloudSnow', 67: 'CloudSnow',
  71: 'CloudSnow', 73: 'CloudSnow', 75: 'CloudSnow', 77: 'CloudSnow',
  80: 'CloudRain', 81: 'CloudRain', 82: 'CloudRain',
  85: 'CloudSnow', 86: 'CloudSnow',
  95: 'CloudRain', 96: 'CloudRain', 99: 'CloudRain',
};