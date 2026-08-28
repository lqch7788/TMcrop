/**
 * 天气 Store（环境监测页用）
 *
 * 架构：组件 → useWeatherStore → apiWeatherService → enhancedApiClient → 后端
 * 数据流符合 V2.1 铁律（无 IndexedDB / localStorage / persist 兜底）
 *
 * 行为：
 * - 首次加载：调用浏览器 Geolocation API 获取经纬度；拒绝/失败时降级到默认坐标（北京 116.40, 39.90）
 * - 拿到经纬度后并发拉当前天气 + 5 天预报（合并端点 /api/weather/current）
 * - 10 分钟内不重复拉（短时内存缓存，不违反 V2.1 铁律）
 * - 错误状态：error 字段暴露给 UI 显示
 *
 * 注意：经纬度本身只缓存到内存，刷新即重新申请定位（合理：用户可能移动）
 */

import { create } from 'zustand';
import {
  getCurrentWeather,
  WeatherCurrentResponse,
} from '@/services/apiWeatherService';

/** 默认坐标（北京天安门，定位失败时的兜底） */
const DEFAULT_LAT = 39.9042;
const DEFAULT_LON = 116.4074;
const DEFAULT_CITY = '默认位置（北京）';

/** 内存缓存时长（10 分钟） */
const CACHE_TTL = 10 * 60 * 1000;

/** 定位来源 */
export type LocationSource = 'geolocation' | 'default' | 'denied' | 'unsupported';

interface WeatherState {
  /** 当前实况 */
  now: WeatherCurrentResponse['now'] | null;
  /** 5 天预报 */
  forecast: WeatherCurrentResponse['forecast'];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息（API Key 缺失、网络失败等都通过这里暴露给 UI） */
  error: string | null;
  /** 当前经纬度 */
  lat: number | null;
  lon: number | null;
  /** 定位来源：geolocation=浏览器授权 / default=使用默认 / denied=用户拒绝 / unsupported=浏览器不支持 */
  locationSource: LocationSource;
  /** 最后一次成功拉取时间戳（用于缓存） */
  lastFetch: number | null;

  /**
   * 触发天气加载（自动处理定位 + 拉取）
   * - 已缓存 10 分钟内不重复
   * - force=true 强制刷新
   */
  loadWeather: (force?: boolean) => Promise<void>;
  /** 手动刷新（顶部刷新按钮） */
  refresh: () => Promise<void>;
  /** 重置状态 */
  reset: () => void;
}

export const useWeatherStore = create<WeatherState>()((set, get) => ({
  now: null,
  forecast: [],
  loading: false,
  error: null,
  lat: null,
  lon: null,
  locationSource: 'default',
  lastFetch: null,

  loadWeather: async (force = false) => {
    const { lastFetch, now, forecast } = get();
    // 缓存命中：10 分钟内 + 数据已存在 + 非强制刷新
    if (!force && lastFetch && now && forecast.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }

    set({ loading: true, error: null });

    // 1. 获取经纬度
    const { lat, lon, source } = await resolveLocation();

    // 2. 拉天气（合并端点：now + 5d）
    try {
      const data = await getCurrentWeather(lat, lon);
      set({
        now: data.now,
        forecast: data.forecast,
        lat,
        lon,
        locationSource: source,
        loading: false,
        error: null,
        lastFetch: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({
        loading: false,
        error: message,
        // 拉取失败时仍记录定位信息（让 UI 知道是哪里失败）
        lat,
        lon,
        locationSource: source,
      });
    }
  },

  refresh: async () => {
    await get().loadWeather(true);
  },

  reset: () => {
    set({
      now: null,
      forecast: [],
      loading: false,
      error: null,
      lat: null,
      lon: null,
      locationSource: 'default',
      lastFetch: null,
    });
  },
}));

/**
 * 解析浏览器位置
 * 失败链：浏览器不支持 → 用户拒绝 → 超时/错误 → 全部走默认坐标
 */
async function resolveLocation(): Promise<{ lat: number; lon: number; source: LocationSource }> {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    return { lat: DEFAULT_LAT, lon: DEFAULT_LON, source: 'unsupported' };
  }

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        // 5 秒超时；启用高精度会拖慢且无必要（城市级即可）
        timeout: 5000,
        maximumAge: 10 * 60 * 1000, // 接受 10 分钟内的缓存位置
        enableHighAccuracy: false,
      });
    });
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      source: 'geolocation',
    };
  } catch (error) {
    // GeolocationPositionError.PERMISSION_DENIED = 1
    // GeolocationPositionError.POSITION_UNAVAILABLE = 2
    // GeolocationPositionError.TIMEOUT = 3
    const code = (error as GeolocationPositionError)?.code;
    const source: LocationSource = code === 1 ? 'denied' : 'default';
    // 静默降级，不抛错给 UI
    void DEFAULT_CITY; // 保留常量引用避免 lint 警告
    return { lat: DEFAULT_LAT, lon: DEFAULT_LON, source };
  }
}