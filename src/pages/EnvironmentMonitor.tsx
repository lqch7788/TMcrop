/**
 * 环境监测总览页面 — 重构版（基于 D:\iAGS 设计参考 + V1.1 现有功能集成）
 *
 * 布局：
 * - 顶部：标题 + Tab 切换（基地）+ 导出/新增按钮
 * - 筛选区：区域 pill（保留 V1.1 筛选）+ 搜索框
 * - 主区域三列布局：
 *   - 左列：外部气象站 + 天气预报（保留）
 *   - 中列：设备运行状态 + 棚内空气 + 棚内土壤
 *   - 右列：综合参数 + 大棚分区列表
 * - 详情弹窗：8 环境参数 + 6 时序趋势图
 */
import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Cloud, RefreshCw, Sun, Wind,
  Droplets, Thermometer, Gauge, CloudRain, Compass, Filter, CloudSnow, CloudSun,
  CheckCircle, AlertTriangle, Calendar, X, Loader2, AlertCircle,
} from 'lucide-react';
import { useIotStore, useProductionPlanStore, useWeatherStore } from '@/stores';

import BaseTabs from '@/components/iot/EnvironmentMonitor/BaseTabs';
import AirEnvironmentPanel from '@/components/iot/EnvironmentMonitor/AirEnvironmentPanel';
import SoilEnvironmentPanel from '@/components/iot/EnvironmentMonitor/SoilEnvironmentPanel';
import GreenhouseOverviewCard from '@/components/iot/EnvironmentMonitor/GreenhouseOverviewCard';
import ZonesPanel from '@/components/iot/EnvironmentMonitor/ZonesPanel';
import GreenhouseDetailModal from '@/components/iot/EnvironmentMonitor/GreenhouseDetailModal';
import {
  bases,
  deviceStatusList,
  airEnvParams,
  soilEnvParams,
  greenhouseOverview,
  greenhouseZones,
  ZoneInfo,
} from '@/components/iot/EnvironmentMonitor/mockData';

// 外部气象站 10 项参数（保留 V1.1 原有）
const rainfallValue = 0;
const externalEnvParams = [
  { id: 1, name: '空气温度', value: 27.0, unit: '℃', icon: Thermometer, color: 'bg-red-500' },
  { id: 2, name: '空气湿度', value: 83, unit: '%', icon: Droplets, color: 'bg-blue-500' },
  { id: 3, name: '光照强度', value: 0, unit: 'lx', icon: Sun, color: 'bg-amber-500' },
  { id: 4, name: '风速', value: 2.1, unit: 'm/s', icon: Wind, color: 'bg-cyan-500' },
  { id: 5, name: '风向', value: '北', unit: '1级', icon: Compass, color: 'bg-teal-500' },
  { id: 6, name: '降雨量', value: rainfallValue, unit: 'mm/24h', icon: CloudRain, color: 'bg-indigo-500' },
  { id: 7, name: '大气压', value: 1013.2, unit: 'hPa', icon: Gauge, color: 'bg-purple-500' },
  { id: 8, name: 'PM2.5', value: 45, unit: 'μg/m³', icon: Filter, color: 'bg-orange-500' },
  { id: 9, name: '雨雪状态', value: rainfallValue > 0 ? '降雨' : '无', unit: '', icon: CloudSnow, color: 'bg-cyan-400' },
  { id: 10, name: '紫外线', value: 3, unit: 'UV', icon: Sun, color: 'bg-pink-500' },
];

export default function EnvironmentMonitor() {
  // 顶部基地 Tab
  const [activeBase, setActiveBase] = useState(bases[0].id);

  // 分区列表分页
  const [zonePage, setZonePage] = useState(1);
  const zonesPerPage = 3;

  // 详情弹窗
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);

  // Zustand Stores（保留 V1.1 集成）
  const devices = useIotStore((s) => s.devices);
  const fetchDevices = useIotStore((s) => s.fetchDevices);
  const plans = useProductionPlanStore((s) => s.batches);
  const fetchPlans = useProductionPlanStore((s) => s.fetchPlans);

  // 天气 Store（2026-08-28 改造：原硬编码 weatherForecast 改为真实和风天气）
  const weatherNow = useWeatherStore((s) => s.now);
  const weatherForecast = useWeatherStore((s) => s.forecast);
  const weatherLoading = useWeatherStore((s) => s.loading);
  const weatherError = useWeatherStore((s) => s.error);
  const weatherLocationSource = useWeatherStore((s) => s.locationSource);
  const loadWeather = useWeatherStore((s) => s.loadWeather);
  const refreshWeather = useWeatherStore((s) => s.refresh);

  useEffect(() => {
    fetchDevices();
    fetchPlans();
    // 进入页面拉一次天气（内部有 10 分钟缓存）
    loadWeather();
  }, [fetchDevices, fetchPlans, loadWeather]);

  // 分区分页
  const totalZonePages = Math.ceil(greenhouseZones.length / zonesPerPage);
  const pagedZones = greenhouseZones.slice((zonePage - 1) * zonesPerPage, zonePage * zonesPerPage);

  // 天气图标映射（WMO 数字码 → lucide 图标）
  // 2026-08-28：从字符串匹配改为 code 映射，与后端 WMO_WEATHER.icon 对应
  const weatherIconFor = (code: number) => {
    const map: Record<number, typeof Cloud> = {
      0: Sun,
      1: CloudSun, 2: CloudSun, 3: Cloud,
      45: Cloud, 48: Cloud,
      51: CloudRain, 53: CloudRain, 55: CloudRain,
      56: CloudSnow, 57: CloudSnow,
      61: CloudRain, 63: CloudRain, 65: CloudRain,
      66: CloudSnow, 67: CloudSnow,
      71: CloudSnow, 73: CloudSnow, 75: CloudSnow, 77: CloudSnow,
      80: CloudRain, 81: CloudRain, 82: CloudRain,
      85: CloudSnow, 86: CloudSnow,
      95: CloudRain, 96: CloudRain, 99: CloudRain,
    };
    return map[code] ?? Cloud;
  };

  // 5 天预报展示数据（取前 5 天，今天是 day 0）
  const forecastDays = useMemo(() => {
    return weatherForecast.slice(0, 5).map((d) => {
      // 日期 → "周一" 等显示
      const dt = new Date(d.date);
      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayLabel = isNaN(dt.getTime())
        ? d.date.slice(5) // 兜底：YYYY-MM-DD → MM-DD
        : `${weekMap[dt.getDay()]} ${d.date.slice(5)}`;
      return {
        ...d,
        dayLabel,
        icon: weatherIconFor(d.weatherCode),
      };
    });
  }, [weatherForecast]);

  // 当前显示文案
  const todayLabel = useMemo(() => {
    const now = new Date();
    const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekMap[now.getDay()]}`;
  }, []);

  // 定位来源说明
  const locationHint = {
    geolocation: null,
    denied: '已拒绝定位权限，显示默认城市',
    unsupported: '当前浏览器不支持定位，显示默认城市',
    default: '定位失败，显示默认城市',
  }[weatherLocationSource];

  return (
    <div className="pt-0 px-6 pb-6 space-y-4">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">环境监测总览</h1>
              <p className="text-gray-500 mt-1">IoT 传感器数据实时监控与大棚环境分析</p>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部基地 Tab */}
      <BaseTabs bases={bases} activeBase={activeBase} onChange={setActiveBase} />

      {/* 主区域三列布局 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 左列：外部气象站 + 天气预报（保留 V1.1 原有） */}
        <div className="col-span-3 space-y-4">
          {/* 天气预报（2026-08-28 改造：和风天气真实数据） */}
          <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-100 relative">
            <button
              onClick={() => refreshWeather()}
              disabled={weatherLoading}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="刷新天气"
            >
              <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* 城市名 + 定位来源提示 */}
            <div className="flex items-center gap-2 mb-3 pr-6">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-900 truncate">
                {weatherNow?.locationName || '加载中...'}
              </span>
            </div>

            {/* 错误状态 */}
            {weatherError ? (
              <div className="flex items-start gap-2 py-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <p className="font-medium text-gray-800 mb-1">天气获取失败</p>
                  <p>{weatherError}</p>
                </div>
              </div>
            ) : !weatherNow ? (
              /* 加载中状态 */
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">正在获取天气...</span>
              </div>
            ) : (
              /* 正常状态 */
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = weatherIconFor(weatherNow.weatherCode);
                      return <Icon className="w-12 h-12 text-gray-500" />;
                    })()}
                    <span className="text-4xl font-bold text-gray-900">{weatherNow.temp}°</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-gray-900">{weatherNow.weather}</p>
                    <p className="text-xs text-gray-500 mt-0.5">体感 {weatherNow.feelsLike}°</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-500 mb-1">{todayLabel}</p>
                {locationHint && (
                  <p className="text-xs text-amber-600 mb-3">{locationHint}</p>
                )}
                {/* 5天预报 */}
                <div className="border-t border-emerald-100 pt-3">
                  <div className="grid grid-cols-5 gap-1">
                    {forecastDays.map((day, idx) => (
                      <div key={idx} className="text-center">
                        <p className="text-xs text-gray-500 mb-1 truncate" title={day.dayLabel}>
                          {idx === 0 ? '今天' : day.dayLabel.split(' ')[0]}
                        </p>
                        <day.icon className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-700">{day.tempMin}~{day.tempMax}°</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 外部气象站参数 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full" />
              大棚外部气象站
            </h3>
            <div className="space-y-2">
              {externalEnvParams.map(param => {
                const Icon = param.icon;
                return (
                  <div key={param.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-6 h-6 rounded ${param.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 flex-1">{param.name}</span>
                    <span className="font-medium text-gray-800">
                      {param.value}<span className="text-gray-400 ml-0.5">{param.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 中列：综合参数 + 棚内空气 + 棚内土壤（2026-08-28 改为 flex，让 SoilEnvironmentPanel flex-1 与右列 ZonesPanel 等高对齐） */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          {/* 大棚综合参数 + 3D 占位（2026-08-28 从右列移到中列顶部） */}
          <GreenhouseOverviewCard info={greenhouseOverview} />

          {/* 棚内空气综合环境 */}
          <AirEnvironmentPanel params={airEnvParams} />

          {/* 棚内土壤综合环境 */}
          <SoilEnvironmentPanel params={soilEnvParams} />
        </div>

        {/* 右列：分区列表（2026-08-28 设备卡已移到顶部整行） */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          {/* 大棚分区列表：flex-1 填满中列底部剩余空间，与棚内土壤卡片底部齐平 */}
          <div className="flex-1 min-h-0">
            <ZonesPanel
              zones={pagedZones}
              zonePage={zonePage}
              totalZonePages={totalZonePages}
              onZonePageChange={setZonePage}
              onMoreClick={(zone) => setSelectedZone(zone)}
            />
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedZone && (
        <GreenhouseDetailModal
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
        />
      )}
    </div>
  );
}
