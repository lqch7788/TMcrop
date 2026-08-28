/**
 * 天气服务 — Open-Meteo + Nominatim 反向地理（完全免 Key）
 *
 * 架构：
 * 浏览器 Geolocation → 经纬度 → /api/weather/current?lat=&lon=
 *   ↓
 * 1. Nominatim reverse geocode：经纬度 → "浙江省舟山市定海区"
 * 2. Open-Meteo forecast：当前天气 + 7 天预报（中文文案映射）
 *   ↓
 * 前端
 *
 * 优势：
 * - 完全免 Key，无注册、无配额限制（Open-Meteo 商用 OK，CC BY 4.0）
 * - Nominatim 限 1 req/s（reverse 极少用，无压力）
 * - 经纬度直查，省去 geo lookup 中转
 */

import { WeatherError } from './weather-error';

/**
 * WMO 天气代码 → 中文描述 + lucide 图标名
 * 来源：https://open-meteo.com/en/docs#weathervariables
 * 前端 weatherIconFor 需对应同步（src/pages/EnvironmentMonitor.tsx）
 */
export const WMO_WEATHER: Record<number, { desc: string; icon: string }> = {
  0: { desc: '晴', icon: 'Sun' },
  1: { desc: '晴间多云', icon: 'CloudSun' },
  2: { desc: '多云', icon: 'CloudSun' },
  3: { desc: '阴', icon: 'Cloud' },
  45: { desc: '雾', icon: 'Cloud' },
  48: { desc: '雾凇', icon: 'Cloud' },
  51: { desc: '毛毛雨', icon: 'CloudRain' },
  53: { desc: '毛毛雨', icon: 'CloudRain' },
  55: { desc: '强毛毛雨', icon: 'CloudRain' },
  56: { desc: '冻毛毛雨', icon: 'CloudSnow' },
  57: { desc: '强冻毛毛雨', icon: 'CloudSnow' },
  61: { desc: '小雨', icon: 'CloudRain' },
  63: { desc: '中雨', icon: 'CloudRain' },
  65: { desc: '大雨', icon: 'CloudRain' },
  66: { desc: '冻雨', icon: 'CloudSnow' },
  67: { desc: '强冻雨', icon: 'CloudSnow' },
  71: { desc: '小雪', icon: 'CloudSnow' },
  73: { desc: '中雪', icon: 'CloudSnow' },
  75: { desc: '大雪', icon: 'CloudSnow' },
  77: { desc: '雪粒', icon: 'CloudSnow' },
  80: { desc: '阵雨', icon: 'CloudRain' },
  81: { desc: '强阵雨', icon: 'CloudRain' },
  82: { desc: '暴阵雨', icon: 'CloudRain' },
  85: { desc: '阵雪', icon: 'CloudSnow' },
  86: { desc: '强阵雪', icon: 'CloudSnow' },
  95: { desc: '雷阵雨', icon: 'CloudRain' },
  96: { desc: '雷雨夹冰雹', icon: 'CloudRain' },
  99: { desc: '强雷雨夹冰雹', icon: 'CloudRain' },
};

/** 兜底：未知 code */
const WMO_DEFAULT = { desc: '未知', icon: 'Cloud' };

/**
 * 通用 fetch：超时 + 错误捕获 + 日志
 */
async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Open-Meteo 推荐加 UA（避免被限速）
        'User-Agent': 'yuanxingtu-farm-mgmt/1.0',
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new WeatherError(
        'WEATHER_UPSTREAM_ERROR',
        `天气上游 ${res.status}: ${text || res.statusText}`,
        502
      );
    }
    return (await res.json()) as T;
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof WeatherError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WeatherError('WEATHER_TIMEOUT', '天气请求超时', 504);
    }
    throw new WeatherError(
      'WEATHER_NETWORK_ERROR',
      `天气网络错误: ${error instanceof Error ? error.message : String(error)}`,
      502
    );
  }
}

/**
 * 百度地图逆地理：经纬度 → "浙江省宁波市北仑区"
 *
 * 申请：https://lbsyun.baidu.com/apiconsole/key
 * 应用类型选"服务端"，coordtype=wgs84ll（直接吃浏览器原生坐标，无需转换）
 * 个人开发者免费 6000 次/天，足够天气卡片使用
 *
 * 兜底：百度 API 失败（Key 失效/额度满/网络）→ 经纬度字符串
 */
const BAIDU_AK = process.env.BAIDU_MAP_AK;

interface AddressCacheEntry {
  name: string;
  expireAt: number;
}
const ADDRESS_CACHE = new Map<string, AddressCacheEntry>();
const ADDRESS_CACHE_TTL = 10 * 60 * 1000;

/**
 * 经纬度 → "39.90°N, 116.41°E" 格式字符串（兜底显示）
 */
function formatCoordsFallback(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

/**
 * 百度逆地理编码（服务端代理，Key 不暴露给前端）
 * 百度 location 参数是 lat,lon（注意纬度在前）
 * 返回"省 + 市 + 区/县"拼接字符串
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = ADDRESS_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.name;
  }

  const fallback = formatCoordsFallback(lat, lon);

  // Key 未配置 → 直接兜底
  if (!BAIDU_AK) {
    ADDRESS_CACHE.set(cacheKey, { name: fallback, expireAt: Date.now() + ADDRESS_CACHE_TTL });
    return fallback;
  }

  // 百度逆地理 API（coordtype=wgs84ll 浏览器原生 WGS84 坐标）
  // 精度 radius=1000 米，确保能拿到区级信息
  const url =
    `https://api.map.baidu.com/reverse_geocoding/v3/` +
    `?ak=${BAIDU_AK}&output=json&coordtype=wgs84ll` +
    `&location=${lat},${lon}&radius=1000`;

  try {
    const data = await fetchJson<{
      status?: number;
      result?: {
        addressComponent?: {
          province?: string;
          city?: string;
          district?: string;
          street?: string;
        };
        formatted_address?: string;
      };
    }>(url, 4000);

    if (data.status !== 0 || !data.result) {
      ADDRESS_CACHE.set(cacheKey, { name: fallback, expireAt: Date.now() + ADDRESS_CACHE_TTL });
      return fallback;
    }

    const a = data.result.addressComponent || {};
    // 拼接"省 + 市 + 区"
    // 直辖市处理：province/city 同名时去重（北京/上海/天津/重庆）
    const parts: string[] = [];
    if (a.province) parts.push(a.province);
    if (a.city && a.city !== a.province) parts.push(a.city);
    if (a.district) parts.push(a.district);

    const name = parts.join('') || data.result.formatted_address || fallback;
    ADDRESS_CACHE.set(cacheKey, { name, expireAt: Date.now() + ADDRESS_CACHE_TTL });
    return name;
  } catch {
    ADDRESS_CACHE.set(cacheKey, { name: fallback, expireAt: Date.now() + ADDRESS_CACHE_TTL });
    return fallback;
  }
}

/** 当前实况（前端 UI 用） */
export interface WeatherNow {
  temp: string;            // 当前温度（℃）
  feelsLike: string;       // 体感温度（℃）
  weather: string;         // 中文描述（如"晴"）
  weatherCode: number;     // WMO 数字码（前端 icon 映射用）
  windSpeed: string;       // 风速（km/h）
  humidity: string;        // 湿度（%）
  pressure: string;        // 大气压（hPa）
  obsTime: string;         // 观测时间（ISO）
  locationName: string;    // 反向地理结果（如"浙江省 舟山市"）
}

/** 7 天预报单日（前端 UI 用） */
export interface WeatherForecastDay {
  date: string;
  tempMax: string;
  tempMin: string;
  weather: string;
  weatherCode: number;
}

interface OpenMeteoCurrent {
  temperature_2m?: number;
  apparent_temperature?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  relative_humidity_2m?: number;
  surface_pressure?: number;
  time?: string;
}

interface OpenMeteoDaily {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
  timezone?: string;
}

/**
 * 当前 + 7 天合并
 */
export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<{ now: WeatherNow; forecast: WeatherForecastDay[] }> {
  const currentFields = [
    'temperature_2m',
    'apparent_temperature',
    'weather_code',
    'wind_speed_10m',
    'relative_humidity_2m',
    'surface_pressure',
  ].join(',');
  const dailyFields = ['weather_code', 'temperature_2m_max', 'temperature_2m_min'].join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=${currentFields}` +
    `&daily=${dailyFields}` +
    `&forecast_days=7` +
    `&timezone=auto` +
    `&wind_speed_unit=kmh`;

  const [data, locationName] = await Promise.all([
    fetchJson<OpenMeteoResponse>(url),
    reverseGeocode(lat, lon), // 内部有兜底，不再 catch
  ]);

  const c = data.current || {};
  const wmo = c.weather_code ?? -1;
  const meta = WMO_WEATHER[wmo] || WMO_DEFAULT;

  const now: WeatherNow = {
    temp: typeof c.temperature_2m === 'number' ? c.temperature_2m.toFixed(1) : '--',
    feelsLike: typeof c.apparent_temperature === 'number' ? c.apparent_temperature.toFixed(1) : '--',
    weather: meta.desc,
    weatherCode: wmo,
    windSpeed: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m.toFixed(1) : '--',
    humidity: typeof c.relative_humidity_2m === 'number' ? String(c.relative_humidity_2m) : '--',
    pressure: typeof c.surface_pressure === 'number' ? c.surface_pressure.toFixed(0) : '--',
    obsTime: c.time || '',
    locationName,
  };

  const forecast: WeatherForecastDay[] = (data.daily?.time || []).map((date, i) => {
    const code = data.daily?.weather_code?.[i] ?? -1;
    const m = WMO_WEATHER[code] || WMO_DEFAULT;
    return {
      date,
      tempMax: typeof data.daily?.temperature_2m_max?.[i] === 'number'
        ? data.daily!.temperature_2m_max![i].toFixed(1) : '--',
      tempMin: typeof data.daily?.temperature_2m_min?.[i] === 'number'
        ? data.daily!.temperature_2m_min![i].toFixed(1) : '--',
      weather: m.desc,
      weatherCode: code,
    };
  });

  return { now, forecast };
}

/** 仅当前实况（路由单独用） */
export async function getWeatherNow(lat: number, lon: number): Promise<WeatherNow> {
  return (await getCurrentWeather(lat, lon)).now;
}

/** 仅 7 天预报（路由单独用） */
export async function getWeatherForecast7d(lat: number, lon: number): Promise<WeatherForecastDay[]> {
  return (await getCurrentWeather(lat, lon)).forecast;
}