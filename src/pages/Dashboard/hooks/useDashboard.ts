// Dashboard 页面状态和逻辑 Hook
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  tasks,
  iotSensors,
  messages,
  cropBatches,
  yieldStats,
  costAnalysis,
} from '../../../data/mockData';
import type {
  SelectedDetailType,
  GreenhouseEnvData,
} from '../types/dashboard.types';

export function useDashboard() {
  const navigate = useNavigate();

  // ==================== 状态定义 ====================
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'iot'>('overview');
  const [greenhousePage, setGreenhousePage] = useState(1);
  const [greenhousePageSize, setGreenhousePageSize] = useState(5);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<string | null>(null);
  const [greenhouseTableExpanded, setGreenhouseTableExpanded] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [fieldTableExpanded, setFieldTableExpanded] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetailType>(null);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);

  // 月度产量统计筛选
  const [yieldRegion, setYieldRegion] = useState('');
  const [yieldCrop, setYieldCrop] = useState('');

  // 成本构成分析筛选
  const [costPeriod, setCostPeriod] = useState('month');
  const [costCrop, setCostCrop] = useState('');
  const [costAreaType, setCostAreaType] = useState('');

  // ==================== useMemo 计算 ====================
  // 今日任务（未完成的）
  const todayTasks = useMemo(() => tasks.filter(t => t.status !== 'completed'), []);

  // 关键传感器
  const criticalSensors = useMemo(() => iotSensors.filter(s => s.status !== 'normal'), []);

  // 预警消息
  const alertMessages = useMemo(() => messages.filter(m => m.type === 'alert'), []);

  // 按区域筛选传感器
  const filteredSensors = useMemo(() =>
    selectedRegion
      ? iotSensors.filter(s => s.greenhouseId === selectedRegion)
      : iotSensors,
    [selectedRegion]
  );

  // 温室下拉列表
  const greenhouseList = useMemo(() =>
    Array.from(new Set(iotSensors.map(s => s.greenhouseId)))
      .map(ghId => {
        const sensor = iotSensors.find(s => s.greenhouseId === ghId);
        return { id: ghId, name: sensor?.greenhouseName || '' };
      }),
    []
  );

  // 筛选后的月度产量统计
  const filteredYieldStats = useMemo(() => yieldStats.filter(stat => {
    const regionMatch = !yieldRegion || stat.region === yieldRegion;
    const cropMatch = !yieldCrop || stat.crop === yieldCrop;
    return regionMatch && cropMatch;
  }), [yieldRegion, yieldCrop]);

  // 筛选后的成本构成分析
  const filteredCostAnalysis = useMemo(() => costAnalysis.filter(cost => {
    const periodMatch = !costPeriod || cost.period === costPeriod;
    const cropMatch = !costCrop || cost.crop === costCrop;
    const areaMatch = !costAreaType || cost.areaType === costAreaType;
    return periodMatch && cropMatch && areaMatch;
  }), [costPeriod, costCrop, costAreaType]);

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
  // 详情按钮点击
  const handleDetailClick = (greenhouseId: string) => {
    setSelectedGreenhouse(greenhouseId);
    setIsDetailModalOpen(true);
  };

  // 获取传感器数据
  const getDetailSensorData = (greenhouseId: string) => {
    return iotSensors.filter(s => s.greenhouseId === greenhouseId);
  };

  // 获取作物信息
  const getCropInfo = (greenhouseId: string) => {
    return cropBatches.find(b => b.greenhouseId === greenhouseId && b.status === 'in_progress');
  };

  // ==================== 返回值 ====================
  return {
    // 状态
    activeTab,
    greenhousePage,
    greenhousePageSize,
    selectedRegion,
    isDetailModalOpen,
    selectedGreenhouse,
    greenhouseTableExpanded,
    overviewExpanded,
    fieldTableExpanded,
    selectedDetail,
    enlargedImageIndex,
    yieldRegion,
    yieldCrop,
    costPeriod,
    costCrop,
    costAreaType,

    // setter
    setActiveTab,
    setGreenhousePage,
    setGreenhousePageSize,
    setSelectedRegion,
    setIsDetailModalOpen,
    setSelectedGreenhouse,
    setGreenhouseTableExpanded,
    setOverviewExpanded,
    setFieldTableExpanded,
    setSelectedDetail,
    setEnlargedImageIndex,
    setYieldRegion,
    setYieldCrop,
    setCostPeriod,
    setCostCrop,
    setCostAreaType,

    // 计算数据
    todayTasks,
    criticalSensors,
    alertMessages,
    filteredSensors,
    greenhouseList,
    filteredYieldStats,
    filteredCostAnalysis,
    greenhouseEnvData,
    totalGreenhousePages,
    paginatedGreenhouseData,

    // 函数
    handleDetailClick,
    getDetailSensorData,
    getCropInfo,
    navigate,
  };
}
