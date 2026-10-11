/**
 * 基地总览 - 气象信息卡片
 * 2026-10-11：天气预报 tab 接入真实数据（useWeatherStore → /api/weather/current，
 * 与智能环境监测页同一数据源：浏览器定位 + Open-Meteo，10 分钟内存缓存）
 * 本地气象站 tab 保持原静态展示（代表棚外气象站硬件读数，暂未接入）
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Thermometer, Droplets, Sun, Wind, CloudRain, Compass, Gauge, CloudSnow, RefreshCw,
  Cloud, CloudSun, Loader2, AlertCircle,
} from 'lucide-react';
import { useWeatherStore } from '@/stores';
import { WMO_CODE_TO_ICON, type WeatherIconName } from '@/services/apiWeatherService';

/** WMO 图标名 → lucide 组件（与后端 weather.service.ts 的 WMO_WEATHER.icon 对应） */
const ICON_BY_NAME: Record<WeatherIconName, typeof Cloud> = {
  Sun, CloudSun, Cloud, CloudRain, CloudSnow,
};

/** WMO 数字码 → lucide 图标组件（未知码兜底 Cloud） */
function weatherIconFor(code: number): typeof Cloud {
  return ICON_BY_NAME[WMO_CODE_TO_ICON[code]] ?? Cloud;
}

export function WeatherWidget() {
  const [weatherTab, setWeatherTab] = useState<'forecast' | 'station'>('station');

  // 天气 Store（数据流：Store → apiWeatherService → enhancedApiClient → 后端）
  const weatherNow = useWeatherStore((s) => s.now);
  const weatherForecast = useWeatherStore((s) => s.forecast);
  const weatherLoading = useWeatherStore((s) => s.loading);
  const weatherError = useWeatherStore((s) => s.error);
  const loadWeather = useWeatherStore((s) => s.loadWeather);
  const refreshWeather = useWeatherStore((s) => s.refresh);

  // 进入页面拉一次天气（store 内部有 10 分钟内存缓存，跨页不重复请求）
  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // 5 天预报展示数据（今天/明天/周X + 图标 + 高低温）
  const forecastDays = useMemo(() => {
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weatherForecast.slice(0, 5).map((d, idx) => {
      const dt = new Date(d.date);
      const label = idx === 0 ? '今天' : idx === 1 ? '明天'
        : isNaN(dt.getTime()) ? d.date.slice(5) : weekMap[dt.getDay()];
      return { ...d, label, icon: weatherIconFor(d.weatherCode) };
    });
  }, [weatherForecast]);

  // 当天日期（如 10月11日）
  const todayLabel = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }, []);

  // 外部气象站参数（不含PM2.5和紫外线）
  const stationParams = [
    { id: 1, name: '大气温度', value: 18.5, unit: '°C', icon: Thermometer, color: 'bg-red-500' },
    { id: 2, name: '大气湿度', value: 65, unit: '%RH', icon: Droplets, color: 'bg-blue-500' },
    { id: 3, name: '光照强度', value: 35000, unit: 'Lux', icon: Sun, color: 'bg-amber-500' },
    { id: 4, name: '风速', value: 2.1, unit: 'm/s', icon: Wind, color: 'bg-cyan-500' },
    { id: 5, name: '风向', value: '东南风', unit: '', icon: Compass, color: 'bg-teal-500' },
    { id: 6, name: '降雨量', value: 0, unit: 'mm', icon: CloudRain, color: 'bg-indigo-500' },
    { id: 7, name: '大气压力', value: 1013.2, unit: 'hPa', icon: Gauge, color: 'bg-purple-500' },
    { id: 8, name: '雨雪状态', value: '无', unit: '', icon: CloudSnow, color: 'bg-cyan-400' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 overflow-hidden">
      {/* Tab 选择 */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setWeatherTab('forecast')}
          className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${
            weatherTab === 'forecast'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          天气预报
        </button>
        <button
          onClick={() => setWeatherTab('station')}
          className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${
            weatherTab === 'station'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          本地气象站
        </button>
      </div>

      {/* 天气预报内容（实时真实数据） */}
      {weatherTab === 'forecast' && (
        <div className="bg-[#F2F6FA] p-3 text-gray-900">
          {weatherError ? (
            /* 错误状态 */
            <div className="flex items-start gap-2 py-4">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 leading-relaxed">
                <p className="font-medium text-gray-800 mb-0.5">天气获取失败</p>
                <p>{weatherError}</p>
              </div>
            </div>
          ) : !weatherNow ? (
            /* 加载中状态 */
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">正在获取天气...</span>
            </div>
          ) : (
            <>
              {/* 当天天气 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{weatherNow.temp}°</p>
                  <p className="text-sm text-gray-600">{weatherNow.weather}</p>
                  <p className="text-xs text-gray-500 mt-1">{weatherNow.locationName} · {todayLabel}</p>
                </div>
                <div className="flex items-start gap-2 -mt-2">
                  {(() => {
                    const Icon = weatherIconFor(weatherNow.weatherCode);
                    return <Icon className="w-10 h-10 text-gray-500" />;
                  })()}
                  <button
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                    onClick={() => refreshWeather()}
                    disabled={weatherLoading}
                    title="刷新天气"
                  >
                    <RefreshCw className={`w-3 h-3 text-gray-600 ${weatherLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              {/* 5 天预报 */}
              <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t border-gray-200">
                {forecastDays.map((day) => (
                  <div key={day.date} className="text-center">
                    <p className="text-xs text-gray-500">{day.label}</p>
                    <day.icon className="w-5 h-5 mx-auto text-gray-400 mt-1" />
                    <p className="text-xs font-medium text-gray-900 mt-1">{day.tempMin}~{day.tempMax}°</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 本地气象站内容 */}
      {weatherTab === 'station' && (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {stationParams.map((param) => (
              <div key={param.id} className="bg-[#F2F6FA] rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded ${param.color} flex items-center justify-center`}>
                    <param.icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-gray-600">{param.name}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">
                    {param.value}<span className="text-xs font-normal text-gray-500 ml-1">{param.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
