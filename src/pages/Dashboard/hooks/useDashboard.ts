// Dashboard 页面状态和逻辑 Hook
// 2026-10-11 数据真实化：温室/大田表格 ← greenhouses 表；产量图 ← /summary/yield-stats；
//                        成本图 ← /summary/cost-stats（替代原 farmData mock 数组）
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmTaskStore, useIotStore } from '../../../stores';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { useGreenhouseStore } from '../../../stores/useGreenhouseStore';
import { getCostTypeLabel } from '../../../components/summary/constants';
import type { Greenhouse } from '../../../services/apiBasicDataService';
import type {
  SelectedDetailType,
  GreenhouseEnvData,
  GreenhouseRow,
  MapZones,
  BaseOverviewStats,
} from '../types/dashboard.types';

// ==================== greenhouses 表真实数据 → 页面行 ====================

/** 温室类型英文码 → 中文（表内英文码/中文两种值并存，中文值原样返回） */
const GREENHOUSE_TYPE_LABELS: Record<string, string> = {
  glass: '玻璃温室',
  glass_house: '玻璃温室',
  film_greenhouse: '连栋薄膜温室',
  solar: '日光温室',
  plastic: '塑料大棚',
  seedling: '育苗温室',
  open: '露天种植区',
};

/** 作物英文码 → 中文（中文值原样返回） */
const CROP_CODE_LABELS: Record<string, string> = {
  fruit: '果树',
  vegetable: '蔬菜',
  grain: '粮食作物',
};

/** 是否露天/大田类型 */
function isOpenFieldType(t?: string): boolean {
  return (t || '').toLowerCase() === 'open';
}

/** 温室类型码 → 中文 */
function greenhouseTypeLabel(t?: string): string {
  if (!t) return '-';
  return GREENHOUSE_TYPE_LABELS[t] || t;
}

/** 作物值 → 中文 */
function cropLabel(c?: string): string {
  if (!c) return '-';
  return CROP_CODE_LABELS[c] || c;
}

/** greenhouses 表记录 → 页面行 */
function toGreenhouseRow(g: Greenhouse): GreenhouseRow {
  return {
    id: g.id,
    no: g.name || '-',
    crop: cropLabel(g.crop),
    area: Number(g.area) || 0,
    unit: g.unit || '',
    type: greenhouseTypeLabel(g.greenhouseType),
    status: g.status === 'active' ? '启用中' : '停用',
    plantedDate: (g.createdAt || '').slice(0, 10) || '-',
    manager: g.manager || '-',
    greenhouseType: (g.greenhouseType || '').toLowerCase(),
  };
}

export function useDashboard() {
  const navigate = useNavigate();

  // ==================== Zustand Store 数据 ====================
  const batchStats = useDashboardStore((s) => s.batchStats);
  const fetchBatchStats = useDashboardStore((s) => s.fetchBatchStats);
  const fetchDashboardStats = useDashboardStore((s) => s.fetchDashboardStats);
  const rawYieldStats = useDashboardStore((s) => s.yieldStats);
  const yieldByCrop = useDashboardStore((s) => s.yieldByCrop);
  const costStats = useDashboardStore((s) => s.costStats);
  const fetchYieldStats = useDashboardStore((s) => s.fetchYieldStats);
  const fetchCostStats = useDashboardStore((s) => s.fetchCostStats);
  // 任务 → useFarmTaskStore；IoT 传感器 → useIotStore；温室档案 → useGreenhouseStore
  const tasks = useFarmTaskStore((s) => s.tasks);
  const fetchTasks = useFarmTaskStore((s) => s.fetchTasks);
  const devices = useIotStore((s) => s.devices);
  const fetchDevices = useIotStore((s) => s.fetchDevices);
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDashboardStats();
    fetchBatchStats({ limit: '100' });
    fetchCostStats();
    loadGreenhouses();
    if (tasks.length === 0) fetchTasks();
    if (devices.length === 0) fetchDevices();
  }, [fetchDashboardStats, fetchBatchStats, fetchCostStats, loadGreenhouses, tasks.length, fetchTasks, devices.length, fetchDevices]);

  // ==================== 状态定义 ====================
  const [greenhousePage, setGreenhousePage] = useState(1);
  const [greenhousePageSize, setGreenhousePageSize] = useState(5);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<string | null>(null);
  const [greenhouseTableExpanded, setGreenhouseTableExpanded] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [fieldTableExpanded, setFieldTableExpanded] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetailType>(null);

  // 月度产量统计筛选（作物）
  const [yieldCrop, setYieldCrop] = useState('');

  // 成本构成分析筛选（周期：全部 / 近3月 / 近12月）
  const [costPeriod, setCostPeriod] = useState('all');

  // ==================== 产量统计（真实数据） ====================
  // 作物筛选联动：切换后重新拉月度和数据
  useEffect(() => {
    fetchYieldStats({ crop_name: yieldCrop || undefined });
  }, [yieldCrop, fetchYieldStats]);

  // 月度产量图数据：{ month: '06月', yield: 30784 }（端点按月份 DESC → 反转为时间正序）
  const filteredYieldStats = useMemo(() =>
    [...rawYieldStats].reverse().map((d) => ({
      month: d.name?.includes('-') ? `${d.name.slice(5)}月` : (d.name || ''),
      yield: Number(d.value) || 0,
      crop: '',
      region: '',
    })),
    [rawYieldStats]);

  // 作物筛选下拉选项（来自 group_by=crop 的真实数据）
  const yieldCropOptions = useMemo(() =>
    yieldByCrop.map((d) => d.name).filter(Boolean),
    [yieldByCrop]);

  // ==================== 成本统计（真实数据聚合） ====================
  // 人工/物料/能源按类别归并 + 周期过滤（全部 / 近3月 / 近12月）
  const filteredCostAnalysis = useMemo(() => {
    if (!costStats) return [];
    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let minMonth = '';
    if (costPeriod === 'quarter') minMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    else if (costPeriod === 'year') minMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    const inRange = (month?: string) => !minMonth || (month || '') >= minMonth;

    const groups = new Map<string, number>();
    const add = (name: string, amount: number) => groups.set(name, (groups.get(name) || 0) + amount);
    costStats.labor.filter((i) => inRange(i.month)).forEach((i) => add('人工成本', Number(i.totalAmount) || 0));
    costStats.material.filter((i) => inRange(i.month)).forEach((i) => add(getCostTypeLabel(i.costType), Number(i.totalAmount) || 0));
    costStats.energy.filter((i) => inRange(i.month)).forEach((i) => add(getCostTypeLabel(i.costType), Number(i.totalAmount) || 0));

    return Array.from(groups.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [costStats, costPeriod]);

  // ==================== greenhouses 真实档案数据 ====================
  const activeGreenhouses = useMemo(
    () => greenhouses.filter((g) => g.status === 'active'),
    [greenhouses]
  );

  // 温室区域行（非露天类型）
  const greenhouseRows = useMemo(
    () => activeGreenhouses.filter((g) => !isOpenFieldType(g.greenhouseType)).map(toGreenhouseRow),
    [activeGreenhouses]
  );

  // 大田区域行（露天类型）
  const fieldRows = useMemo(
    () => activeGreenhouses.filter((g) => isOpenFieldType(g.greenhouseType)).map(toGreenhouseRow),
    [activeGreenhouses]
  );

  // 基地概况统计（真实聚合）
  const overviewStats = useMemo((): BaseOverviewStats => ({
    totalArea: activeGreenhouses.reduce((s, g) => s + (Number(g.area) || 0), 0),
    greenhouseCount: greenhouseRows.length,
    fieldArea: fieldRows.reduce((s, g) => s + (Number(g.area) || 0), 0),
  }), [activeGreenhouses, greenhouseRows, fieldRows]);

  // 总览图 4 分区（按类型匹配真实区域记录）
  const mapZones = useMemo((): MapZones => {
    const find = (types: string[]) =>
      activeGreenhouses.find((g) => types.includes((g.greenhouseType || '').toLowerCase()));
    const toZone = (g?: Greenhouse) =>
      g ? { name: g.name || '', area: Number(g.area) || 0, unit: g.unit || '' } : undefined;
    return {
      glass: toZone(find(['glass', 'glass_house'])),
      film: toZone(find(['film_greenhouse'])),
      solar: toZone(find(['solar'])),
      open: toZone(find(['open'])),
    };
  }, [activeGreenhouses]);

  // ==================== useMemo 计算（任务/传感器/批次） ====================
  // 状态 → 生长阶段映射（后端 status → 前端 stage / stageName）
  const statusToStage: Record<string, { stage: string; stageName: string }> = {
    planning: { stage: 'seedling', stageName: '播种期' },
    planted: { stage: 'vegetative', stageName: '生长期' },
    in_progress: { stage: 'fruiting', stageName: '结果期' },
    completed: { stage: 'harvest', stageName: '采收期' },
    default: { stage: 'seedling', stageName: '播种期' },
  };

  // 将后端 BatchStatItem 映射为 ActiveBatchesTable 需要的格式
  const mappedBatches = useMemo(() =>
    batchStats.map((item) => {
      const stageInfo = statusToStage[item.status] || statusToStage.default;
      return {
        id: String(item.id),
        batchCode: item.batchCode,
        cropName: item.cropName,
        greenhouseName: item.greenhouse || '',
        stage: stageInfo.stage,
        stageName: stageInfo.stageName,
      };
    }),
    [batchStats]
  );

  // 今日任务（未完成的）— 2026-10-11 修复：原依赖数组为 []，tasks 异步加载后不重算导致表格恒空
  const todayTasks = useMemo(() => tasks.filter(t => t.status !== 'completed'), [tasks]);

  // 按区域筛选传感器 — 2026-10-11 修复：devices 加入依赖，加载完成后可重算
  const filteredSensors = useMemo(() =>
    selectedRegion
      ? devices.filter(s => s.greenhouseId === selectedRegion)
      : devices,
    [selectedRegion, devices]
  );

  // 温室下拉列表 — 2026-10-11 修复：原依赖数组为 []，devices 加载后不重算
  const greenhouseList = useMemo(() =>
    Array.from(new Set(devices.map(s => s.greenhouseId)))
      .map(ghId => {
        const sensor = devices.find(s => s.greenhouseId === ghId);
        return { id: ghId, name: sensor?.greenhouseName || '' };
      }),
    [devices]
  );

  // 温室环境数据分组
  const greenhouseEnvData = useMemo((): GreenhouseEnvData[] =>
    Array.from(new Set(filteredSensors.map(s => s.greenhouseId)))
      .map(ghId => {
        const sensors = filteredSensors.filter(s => s.greenhouseId === ghId);
        const airTemp = sensors.find(s => s.type === 'air_temp');
        const airHumidity = sensors.find(s => s.type === 'air_humidity');
        const light = sensors.find(s => s.type === 'light');
        const co2 = sensors.find(s => s.type === 'co2');
        const soilTemp = sensors.find(s => s.type === 'soil_temp');
        const soilMoisture = sensors.find(s => s.type === 'soil_moisture');
        const soilEc = sensors.find(s => s.type === 'soil_ec');
        const soilPh = sensors.find(s => s.type === 'soil_ph');

        return {
          id: ghId,
          name: sensors[0]?.greenhouseName || '',
          lastUpdate: sensors[0]?.lastUpdate || '',
          airTemp: airTemp ? { value: airTemp.value, unit: airTemp.unit, status: airTemp.status } : null,
          airHumidity: airHumidity ? { value: airHumidity.value, unit: airHumidity.unit, status: airHumidity.status } : null,
          light: light ? { value: light.value, unit: light.unit, status: light.status } : null,
          co2: co2 ? { value: co2.value, unit: co2.unit, status: co2.status } : null,
          soilTemp: soilTemp ? { value: soilTemp.value, unit: soilTemp.unit, status: soilTemp.status } : null,
          soilMoisture: soilMoisture ? { value: soilMoisture.value, unit: soilMoisture.unit, status: soilMoisture.status } : null,
          soilEc: soilEc ? { value: soilEc.value, unit: soilEc.unit, status: soilEc.status } : null,
          soilPh: soilPh ? { value: soilPh.value, unit: soilPh.unit, status: soilPh.status } : null,
        };
      }),
    [filteredSensors]
  );

  // 分页数据
  const totalGreenhousePages = useMemo(() =>
    Math.ceil(greenhouseEnvData.length / greenhousePageSize),
    [greenhouseEnvData.length, greenhousePageSize]
  );

  const paginatedGreenhouseData = useMemo(() =>
    greenhouseEnvData.slice((greenhousePage - 1) * greenhousePageSize, greenhousePage * greenhousePageSize),
    [greenhouseEnvData, greenhousePage, greenhousePageSize]
  );

  // ==================== 处理函数 ====================
  // 详情按钮点击（环境参数表 → 温室环境详情弹窗）
  const handleDetailClick = (greenhouseId: string) => {
    setSelectedGreenhouse(greenhouseId);
    setIsDetailModalOpen(true);
  };

  // 获取传感器数据
  const getDetailSensorData = (greenhouseId: string) => {
    return devices.filter(s => s.greenhouseId === greenhouseId);
  };

  // 获取作物信息（使用 batchStats 从 store 获取数据）
  const getCropInfo = (greenhouseId: string) => {
    // 先从传感器数据找到温室名称
    const sensor = devices.find(s => s.greenhouseId === greenhouseId);
    const greenhouseName = sensor?.greenhouseName || '';
    return batchStats.find(b => b.greenhouse === greenhouseName && b.status === 'in_progress');
  };

  // ==================== 返回值 ====================
  return {
    // 状态
    greenhousePage,
    greenhousePageSize,
    selectedRegion,
    isDetailModalOpen,
    selectedGreenhouse,
    greenhouseTableExpanded,
    overviewExpanded,
    fieldTableExpanded,
    selectedDetail,
    yieldCrop,
    costPeriod,

    // setter
    setGreenhousePage,
    setGreenhousePageSize,
    setSelectedRegion,
    setIsDetailModalOpen,
    setSelectedGreenhouse,
    setGreenhouseTableExpanded,
    setOverviewExpanded,
    setFieldTableExpanded,
    setSelectedDetail,
    setYieldCrop,
    setCostPeriod,

    // 计算数据
    todayTasks,
    filteredSensors,
    greenhouseList,
    filteredYieldStats,
    yieldCropOptions,
    filteredCostAnalysis,
    greenhouseEnvData,
    totalGreenhousePages,
    paginatedGreenhouseData,
    mappedBatches,
    greenhouseRows,
    fieldRows,
    overviewStats,
    mapZones,

    // 函数
    handleDetailClick,
    getDetailSensorData,
    getCropInfo,
    navigate,
  };
}
