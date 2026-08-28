/**
 * 天气路由 — Open-Meteo + Nominatim 反向地理（免 Key）
 *
 * 端点：
 * - GET /api/weather/now?lat=&lon=     当前实况
 * - GET /api/weather/forecast?lat=&lon= 7 天预报
 * - GET /api/weather/current?lat=&lon= 合并 now + 7d（前端环境监测卡片一次拿全）
 *
 * 入参：lat/lon（必填，WGS84 十进制度）
 * 出参：统一 { success, data }，错误时 { success: false, error, code }
 */

import { Router, Request, Response } from 'express';
import { getCurrentWeather, getWeatherNow, getWeatherForecast7d } from '../services/weather.service';
import { WeatherError } from '../services/weather-error';

const router = Router();

/** 解析经纬度参数（强制必填 + 范围校验） */
function parseCoords(req: Request): { lat: number; lon: number } {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new WeatherError('WEATHER_BAD_COORDS', 'lat/lon 必须为数字', 400);
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new WeatherError('WEATHER_BAD_COORDS', 'lat/lon 超出有效范围', 400);
  }
  return { lat, lon };
}

/** 统一错误处理 */
function sendError(res: Response, error: unknown): void {
  if (error instanceof WeatherError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error('[weather] 未预期错误:', error);
  res.status(500).json({ success: false, error: `天气服务异常: ${message}`, code: 'WEATHER_UNKNOWN' });
}

/** GET /now */
router.get('/now', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = parseCoords(req);
    const now = await getWeatherNow(lat, lon);
    res.json({ success: true, data: now });
  } catch (error) {
    sendError(res, error);
  }
});

/** GET /forecast — 7 天预报 */
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = parseCoords(req);
    const daily = await getWeatherForecast7d(lat, lon);
    res.json({ success: true, data: daily });
  } catch (error) {
    sendError(res, error);
  }
});

/** GET /current — 当前 + 7 天合并（前端一次拿全） */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = parseCoords(req);
    const data = await getCurrentWeather(lat, lon);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;