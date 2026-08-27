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
  Search, Plus, Download, MapPin, Cloud, RefreshCw, Sun, Wind,
  Droplets, Thermometer, Gauge, CloudRain, Compass, Filter, CloudSnow, CloudSun,
  CheckCircle, AlertTriangle, Calendar, X,
} from 'lucide-react';
import { useIotStore, useProductionPlanStore } from '@/stores';

import BaseTabs from '@/components/iot/EnvironmentMonitor/BaseTabs';
import DeviceStatusRow from '@/components/iot/EnvironmentMonitor/DeviceStatusRow';
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

// 当地天气预报（保留 V1.1 原有）
const weatherForecast = {
  location: '北京市通州区',
  currentTemp: 18,
  weather: '多云',
  date: '2024年3月15日 星期五',
  forecast: [
    { day: '周三', weather: '晴', icon: Sun, tempHigh: 21, tempLow: 7 },
    { day: '周四', weather: '晴', icon: CloudSun, tempHigh: 19, tempLow: 9 },
    { day: '周五', weather: '多云', icon: Cloud, tempHigh: 20, tempLow: 8 },
    { day: '周六', weather: '小雨', icon: CloudRain, tempHigh: 15, tempLow: 10 },
    { day: '周日', weather: '阴', icon: Cloud, tempHigh: 18, tempLow: 11 },
  ],
};

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

  // 区域 pill（保留 V1.1 筛选）
  const [selectedRegion, setSelectedRegion] = useState<string>('');

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

  useEffect(() => {
    fetchDevices();
    fetchPlans();
  }, [fetchDevices, fetchPlans]);

  // 派生：唯一大棚列表（保留 V1.1 筛选）
  const greenhouseList = useMemo(() => {
    const uniqueIds = Array.from(new Set(devices.map(s => s.greenhouseId)));
    return uniqueIds.map(id => {
      const sensor = devices.find(s => s.greenhouseId === id);
      return { id, name: sensor?.greenhouseName || '' };
    }).filter(gh => gh.name);
  }, [devices]);

  // 分区分页
  const totalZonePages = Math.ceil(greenhouseZones.length / zonesPerPage);
  const pagedZones = greenhouseZones.slice((zonePage - 1) * zonesPerPage, zonePage * zonesPerPage);

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
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> 新增监测点
            </button>
          </div>
        </div>
      </div>

      {/* 顶部基地 Tab */}
      <BaseTabs bases={bases} activeBase={activeBase} onChange={setActiveBase} />

      {/* 筛选区域（保留 V1.1 区域 pill + 搜索框） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">区域：</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedRegion('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedRegion === ''
                    ? 'bg-[#2B5D3A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部区域
              </button>
              {greenhouseList.map(gh => (
                <button
                  key={gh.id}
                  onClick={() => setSelectedRegion(gh.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRegion === gh.id
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {gh.name}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索区域名称..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 主区域三列布局 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 左列：外部气象站 + 天气预报（保留 V1.1 原有） */}
        <div className="col-span-3 space-y-4">
          {/* 天气预报 */}
          <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-100 relative">
            <button className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-gray-900">{weatherForecast.location}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Cloud className="w-12 h-12 text-gray-400" />
                <span className="text-4xl font-bold text-gray-900">{weatherForecast.currentTemp}°</span>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">{weatherForecast.weather}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-500 mb-4">{weatherForecast.date}</p>
            {/* 5天预报 */}
            <div className="border-t border-emerald-100 pt-3">
              <div className="grid grid-cols-5 gap-1">
                {weatherForecast.forecast.map((day, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xs text-gray-500 mb-1">{day.day}</p>
                    <day.icon className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-700">{day.tempLow}~{day.tempHigh}°</p>
                  </div>
                ))}
              </div>
            </div>
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

        {/* 中列：设备运行状态 + 棚内空气 + 棚内土壤 */}
        <div className="col-span-6 space-y-4">
          {/* 设备运行状态横栏（9 设备） */}
          <DeviceStatusRow devices={deviceStatusList} />

          {/* 棚内空气综合环境 */}
          <AirEnvironmentPanel params={airEnvParams} />

          {/* 棚内土壤综合环境 */}
          <SoilEnvironmentPanel params={soilEnvParams} />
        </div>

        {/* 右列：综合参数 + 分区列表 */}
        <div className="col-span-3 space-y-4">
          {/* 大棚综合参数 + 3D 占位 */}
          <GreenhouseOverviewCard info={greenhouseOverview} />

          {/* 大棚分区列表 */}
          <div className="h-[480px]">
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
