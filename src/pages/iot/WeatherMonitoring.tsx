/**
 * 气象监测 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 *
 * 2026-10-20 P0-9：接入真实气象数据（此前为 8 条硬编码假数据）
 * 数据流：组件 → useWeatherStore → apiWeatherService → /api/weather → Open-Meteo
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Cloud, Wind, Droplets, Snowflake, Thermometer, Search, Home, Download, Plus, Eye, Calendar,
} from 'lucide-react';
import { useWeatherStore } from '@/stores/useWeatherStore';

// 天气状况徽章映射（含 icon 和背景色）
const conditionMap: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  sunny: { icon: <Sun className="w-3 h-3" />, bg: 'bg-yellow-100', text: 'text-yellow-700', label: '晴' },
  cloudy: { icon: <Cloud className="w-3 h-3" />, bg: 'bg-gray-100', text: 'text-gray-700', label: '多云' },
  windy: { icon: <Wind className="w-3 h-3" />, bg: 'bg-blue-100', text: 'text-blue-700', label: '大风' },
  foggy: { icon: <Cloud className="w-3 h-3" />, bg: 'bg-slate-100', text: 'text-slate-700', label: '雾' },
  rainy: { icon: <Droplets className="w-3 h-3" />, bg: 'bg-indigo-100', text: 'text-indigo-700', label: '雨' },
  snowy: { icon: <Snowflake className="w-3 h-3" />, bg: 'bg-cyan-100', text: 'text-cyan-700', label: '雪' },
  dusty: { icon: <Wind className="w-3 h-3" />, bg: 'bg-amber-100', text: 'text-amber-700', label: '沙尘' },
};

// WMO 天气代码 → 徽章 key（Open-Meteo 返回的数字码）
const WMO_TO_CONDITION: Record<number, string> = {
  0: 'sunny',
  1: 'sunny',
  2: 'cloudy',
  3: 'cloudy',
  45: 'foggy',
  48: 'foggy',
  51: 'rainy',
  53: 'rainy',
  55: 'rainy',
  56: 'rainy',
  57: 'rainy',
  61: 'rainy',
  63: 'rainy',
  65: 'rainy',
  66: 'rainy',
  67: 'rainy',
  71: 'snowy',
  73: 'snowy',
  75: 'snowy',
  77: 'snowy',
  80: 'rainy',
  81: 'rainy',
  82: 'rainy',
  85: 'snowy',
  86: 'snowy',
  95: 'windy',
  96: 'windy',
  99: 'windy',
};

/** 天气状况筛选（与表格徽章标签一一对应） */
const conditions = ['全部', '晴', '多云', '大风', '雾', '雨', '雪', '沙尘'];

// condition code → 筛选标签 反向映射
const conditionToLabel = (code: string) => conditionMap[code]?.label ?? code;

/** 页面行数据（实况 + 预报） */
interface WeatherRow {
  id: string;
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  pressure: number;
  visibility: number;
  condition: string;
  updateTime: string;
}

export default function WeatherMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [conditionFilter, setConditionFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // P0-9：真实气象数据（useWeatherStore → /api/weather → Open-Meteo）
  const now = useWeatherStore((s) => s.now);
  const forecast = useWeatherStore((s) => s.forecast);
  const weatherLoading = useWeatherStore((s) => s.loading);
  const weatherError = useWeatherStore((s) => s.error);
  const loadWeather = useWeatherStore((s) => s.loadWeather);
  const locationSource = useWeatherStore((s) => s.locationSource);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  /** 真实数据 → 表格行 */
  const weatherData: WeatherRow[] = useMemo(() => {
    const rows: WeatherRow[] = [];
    if (now) {
      rows.push({
        id: '实况',
        location: now.locationName || '当前位置',
        temp: Number(now.temp),
        feelsLike: Number(now.feelsLike),
        humidity: Number(now.humidity),
        windSpeed: Number(now.windSpeed),
        windDir: '—',
        pressure: Number(now.pressure),
        visibility: 0,
        condition: WMO_TO_CONDITION[now.weatherCode] ?? 'cloudy',
        updateTime: now.obsTime || '—',
      });
    }
    forecast.forEach((d, i) => {
      rows.push({
        id: `预报${i + 1}`,
        location: now?.locationName || '当前位置',
        temp: Number(d.tempMax),
        feelsLike: Number(d.tempMin),
        humidity: 0,
        windSpeed: 0,
        windDir: '—',
        pressure: 0,
        visibility: 0,
        condition: WMO_TO_CONDITION[d.weatherCode] ?? 'cloudy',
        updateTime: d.date,
      });
    });
    return rows;
  }, [now, forecast]);

  /** 统计（由真实数据计算） */
  const statistics = useMemo(() => {
    const temps = weatherData.map((r) => r.temp).filter((n) => Number.isFinite(n));
    const hums = weatherData.map((r) => r.humidity).filter((n) => n > 0);
    const winds = weatherData.map((r) => r.windSpeed).filter((n) => n > 0);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const extreme = weatherData.filter((r) => r.temp <= 0 || r.temp >= 35).length;
    return {
      totalStations: weatherData.length,
      avgTemp: Number(avg(temps).toFixed(1)),
      avgHumidity: Math.round(avg(hums)),
      avgWindSpeed: Number(avg(winds).toFixed(1)),
      extremeWeather: extreme,
    };
  }, [weatherData]);

  const filteredData = weatherData.filter(item => {
    const matchSearch = item.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchCondition = conditionFilter === '全部' || conditionToLabel(item.condition) === conditionFilter;
    return matchSearch && matchCondition;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">气象监测</h1>
              <p className="text-gray-500 mt-1">
                气象数据监测
                {locationSource === 'default' && <span className="ml-2 text-xs text-amber-600">（未授权定位，使用默认坐标）</span>}
                {locationSource === 'geolocation' && <span className="ml-2 text-xs text-gray-400">（当前定位）</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadWeather(true)}
              disabled={weatherLoading}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {weatherLoading ? '刷新中…' : '刷新'}
            </button>
            <button
              onClick={() => void loadWeather(true)}
              disabled={weatherLoading}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> 刷新实况
            </button>
          </div>
        </div>
      </div>

      {/* 加载/错误提示：真实数据失败必须显式报错，不能显示成"暂无数据" */}
      {weatherError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          气象数据获取失败：{weatherError}
          <button className="ml-3 underline" onClick={() => void loadWeather(true)}>重试</button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {[
          { Icon: Eye, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测站', value: statistics.totalStations, valColor: 'text-gray-800' },
          { Icon: Thermometer, bg: 'bg-orange-100', text: 'text-orange-600', label: '平均温度', value: `${statistics.avgTemp}°C`, valColor: 'text-orange-600' },
          { Icon: Droplets, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均湿度', value: `${statistics.avgHumidity}%`, valColor: 'text-cyan-600' },
          { Icon: Wind, bg: 'bg-blue-100', text: 'text-blue-600', label: '平均风速', value: `${statistics.avgWindSpeed}km/h`, valColor: 'text-blue-600' },
          { Icon: Cloud, bg: 'bg-red-100', text: 'text-red-600', label: '极端天气', value: statistics.extremeWeather, valColor: 'text-red-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.valColor}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">天气：</span>
            <div className="flex gap-2 flex-wrap">
              {conditions.map(condition => (
                <button
                  key={condition}
                  onClick={() => setConditionFilter(condition)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    conditionFilter === condition
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索监测站点..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">站点ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">位置</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">天气</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">体感温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">风速(km/h)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">风向</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">气压(hPa)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">能见度(km)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map(item => {
              const badge = conditionMap[item.condition];
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.location}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
                      {badge?.icon}
                      {badge?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${item.temp < 0 ? 'text-blue-600' : item.temp > 30 ? 'text-red-600' : 'text-gray-800'}`}>{item.temp}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.feelsLike}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.humidity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.windSpeed}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.windDir}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.pressure}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.visibility}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page
                  ? 'bg-[#2B5D3A] text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
