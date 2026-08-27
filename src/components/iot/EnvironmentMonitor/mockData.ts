/**
 * 环境监测总览页面 mock 数据
 * - 设计参考：D:\iAGS\tm.iags_web\app\iAGS\3D\getData.ejs 棚内环境监测数据结构
 * - V1.1 集成：useIotStore / useProductionPlanStore 有数据时优先用真实数据，否则用 mock
 */

import { LucideIcon, Droplets, Wind, Sun, RefreshCw, Square, RectangleHorizontal } from 'lucide-react';

// 基地列表（顶部 Tab 切换）
export interface BaseInfo {
  id: string;
  name: string;
  location: string;
}
export const bases: BaseInfo[] = [
  { id: 'base-strawberry', name: '宁波小港草莓大棚', location: '宁波' },
  { id: 'base-vegetable', name: '蔬菜大棚', location: '通州' },
];

// 9 种设备状态（运行状态横栏）
export interface DeviceStatusItem {
  id: string;
  name: string;
  icon: LucideIcon;
  status: 'running' | 'idle' | 'fault';
  count: string;
}
export const deviceStatusList: DeviceStatusItem[] = [
  { id: 'fertigation', name: '水肥一体化系统', icon: Droplets, status: 'idle', count: '1/1' },
  { id: 'fan', name: '负压风机', icon: Wind, status: 'idle', count: '2/2' },
  { id: 'inner-loop', name: '内循环', icon: RefreshCw, status: 'running', count: '4/4' },
  { id: 'shade', name: '外遮阳', icon: Sun, status: 'running', count: '1/2' },
  { id: 'spray', name: '喷雾系统', icon: Droplets, status: 'idle', count: '2/2' },
  { id: 'irrigation', name: '滴灌系统', icon: Droplets, status: 'idle', count: '1/1' },
  { id: 'roof-window', name: '天窗', icon: Square, status: 'running', count: '2/2' },
  { id: 'side-window', name: '侧面通风窗', icon: RectangleHorizontal, status: 'idle', count: '1/4' },
  { id: 'wet-curtain', name: '湿帘系统', icon: Droplets, status: 'idle', count: '1/1' },
];

// 棚内空气综合环境（4 参数）
export interface EnvParam {
  type: 'air_temp' | 'air_humidity' | 'light' | 'co2' | 'soil_temp' | 'soil_moisture' | 'soil_ph' | 'soil_ec';
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  minScale: number;
  maxScale: number;
  warning: boolean;
}
export const airEnvParams: EnvParam[] = [
  { type: 'air_temp', label: '空气温度', value: 29.4, unit: '℃', min: 10, max: 30, minScale: 0, maxScale: 40, warning: false },
  { type: 'air_humidity', label: '空气湿度', value: 83.6, unit: '%', min: 40, max: 80, minScale: 0, maxScale: 100, warning: true },
  { type: 'light', label: '光照度', value: 4578, unit: 'lx', min: 10000, max: 25000, minScale: 0, maxScale: 50000, warning: true },
  { type: 'co2', label: 'CO₂含量', value: 459.5, unit: 'ppm', min: 300, max: 900, minScale: 0, maxScale: 2000, warning: false },
];

// 棚内土壤综合环境（4 参数）
export const soilEnvParams: EnvParam[] = [
  { type: 'soil_temp', label: '土壤温度', value: 28.7, unit: '℃', min: 10, max: 30, minScale: 0, maxScale: 40, warning: false },
  { type: 'soil_moisture', label: '土壤湿度', value: 25.5, unit: '%', min: 20, max: 60, minScale: 0, maxScale: 100, warning: false },
  { type: 'soil_ph', label: '土壤PH值', value: 6, unit: 'pH', min: 5.5, max: 6.5, minScale: 3, maxScale: 9, warning: false },
  { type: 'soil_ec', label: '土壤EC值', value: 0.5, unit: 'dS/m', min: 0.2, max: 1, minScale: 0, maxScale: 2, warning: false },
];

// 大棚综合参数（中部右侧）
export interface GreenhouseOverviewInfo {
  controlMode: string;
  area: string;
  type: string;
  utilization: string;
  enableDate: string;
}
export const greenhouseOverview: GreenhouseOverviewInfo = {
  controlMode: 'A',
  area: '704㎡',
  type: '单栋薄膜温室',
  utilization: '66.8%(470.0㎡)',
  enableDate: '2025/09/21',
};

// 大棚分区列表（右侧滚动列表）
export interface ZoneInfo {
  id: string;
  name: string;
  cropName: string;
  variety?: string;
  stage: string;
  area: string;
  plantDate?: string;
  dayCount?: number;
}
export const greenhouseZones: ZoneInfo[] = [
  {
    id: 'zone-1-1', name: '一棚-01区_01',
    cropName: '五色绥纷', variety: 'JUN11-124', stage: '结果期',
    area: '50㎡', plantDate: '2026/03/29', dayCount: 151,
  },
  {
    id: 'zone-1-2', name: '一棚-01区_02',
    cropName: '迷迭香', stage: '育苗期',
    area: '160㎡', plantDate: '2026/07/17', dayCount: 41,
  },
  {
    id: 'zone-2-1', name: '一棚-02区_03',
    cropName: '草莓', variety: '13-6', stage: '结果期',
    area: '50㎡',
  },
];

// 详情弹窗用：完整 8 个环境参数（含状态）
export interface DetailEnvParam extends Omit<EnvParam, 'minScale' | 'maxScale' | 'warning'> {
  status: 'normal' | 'warning' | 'critical';
}
export const detailEnvParams: DetailEnvParam[] = [
  { type: 'air_temp', label: '空气温度', value: 28.0, unit: '℃', min: 10, max: 30, status: 'normal' },
  { type: 'air_humidity', label: '空气湿度', value: 85.5, unit: '%', min: 40, max: 80, status: 'warning' },
  { type: 'light', label: '光照度', value: 2333, unit: 'lx', min: 10000, max: 25000, status: 'critical' },
  { type: 'co2', label: 'CO₂含量', value: 452, unit: 'ppm', min: 300, max: 900, status: 'normal' },
  { type: 'soil_temp', label: '土壤温度', value: 30.3, unit: '℃', min: 10, max: 30, status: 'warning' },
  { type: 'soil_moisture', label: '土壤湿度', value: 48.3, unit: '%', min: 20, max: 60, status: 'normal' },
  { type: 'soil_ph', label: '土壤PH值', value: 6.3, unit: 'pH', min: 5.5, max: 6.5, status: 'normal' },
  { type: 'soil_ec', label: '土壤EC值', value: 0.9, unit: 'dS/m', min: 0.2, max: 1.0, status: 'normal' },
];

// 24h 时序趋势数据生成器（围绕基准值波动）
export function generateTrendData(value: number, _min: number, _max: number): Array<{ time: string; value: number; isAlert?: boolean }> {
  const data: Array<{ time: string; value: number; isAlert?: boolean }> = [];
  for (let i = 0; i < 12; i++) {
    const hour = i * 2;
    const variance = (Math.sin(i * 0.7) * 0.15) + (Math.random() - 0.5) * 0.08;
    const itemValue = Number((value * (1 + variance)).toFixed(2));
    data.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      value: itemValue,
      isAlert: false,
    });
  }
  return data;
}
