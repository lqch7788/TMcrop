import { useState } from 'react';
import {
  Search, Plus, Eye, AlertTriangle, Thermometer, Droplets, Sun, Wind,
  MapPin, Calendar, User, Camera, Filter, X, Gauge, CloudRain, Compass, ChevronLeft, ChevronRight, CloudSnow, CloudSun, Cloud, RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { iotSensors, greenhouses, cropBatches } from '../data/mockData';
import { Modal } from '../components/ui/Modal';

const sensorTrend = [
  { time: '06:00', temp: 18, humi: 75 },
  { time: '08:00', temp: 20, humi: 70 },
  { time: '10:00', temp: 24, humi: 65 },
  { time: '12:00', temp: 28, humi: 58 },
  { time: '14:00', temp: 30, humi: 52 },
  { time: '16:00', temp: 28, humi: 55 },
  { time: '18:00', temp: 25, humi: 62 },
];

// 降雨量数据，用于判断雨雪状态
const rainfallValue = 0;

// 当地天气预报数据
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
  ]
};

const externalEnvParams = [
  { id: 1, name: '大气温度', value: 18.5, unit: '°C', icon: Thermometer, color: 'bg-red-500' },
  { id: 2, name: '大气湿度', value: 65, unit: '%RH', icon: Droplets, color: 'bg-blue-500' },
  { id: 3, name: '光照强度', value: 35000, unit: 'Lux', icon: Sun, color: 'bg-amber-500' },
  { id: 4, name: '风速', value: 2.1, unit: 'm/s', icon: Wind, color: 'bg-cyan-500' },
  { id: 5, name: '风向', value: '东南风', unit: '', icon: Compass, color: 'bg-teal-500' },
  { id: 6, name: '降雨量', value: rainfallValue, unit: 'mm', icon: CloudRain, color: 'bg-indigo-500' },
  { id: 7, name: '大气压力', value: 1013.2, unit: 'hPa', icon: Gauge, color: 'bg-purple-500' },
  { id: 8, name: 'PM2.5', value: 45, unit: 'μg/m³', icon: Filter, color: 'bg-orange-500' },
  { id: 9, name: '雨雪状态', value: rainfallValue > 0 ? '有' : '无', unit: '', icon: CloudSnow, color: 'bg-cyan-400' },
  { id: 10, name: '紫外线强度', value: 3, unit: 'UV Index', icon: Sun, color: 'bg-pink-500' },
];

export default function EnvironmentMonitor() {
  // Region filter state
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<string>('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
      case 'attention':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
      case 'critical':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">告警</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'air_temp': return <Thermometer className="w-5 h-5" />;
      case 'air_humidity': return <Droplets className="w-5 h-5" />;
      case 'soil_moisture': return <Droplets className="w-5 h-5" />;
      case 'soil_temp': return <Thermometer className="w-5 h-5" />;
      case 'soil_ec': return <Gauge className="w-5 h-5" />;
      case 'soil_ph': return <Filter className="w-5 h-5" />;
      case 'light': return <Sun className="w-5 h-5" />;
      case 'co2': return <Wind className="w-5 h-5" />;
      default: return <Thermometer className="w-5 h-5" />;
    }
  };

  // Get unique greenhouse list for filter
  const greenhouseList = Array.from(new Set(iotSensors.map(s => s.greenhouseId)))
    .map(id => {
      const sensor = iotSensors.find(s => s.greenhouseId === id);
      return { id, name: sensor?.greenhouseName || '' };
    })
    .filter(gh => gh.name);

  // Filter sensors by selected region
  const filteredSensors = selectedRegion
    ? iotSensors.filter(s => s.greenhouseId === selectedRegion)
    : iotSensors;

  // Group sensors by greenhouse
  const greenhouseEnvData = Array.from(new Set(filteredSensors.map(s => s.greenhouseId)))
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

      // Determine overall status
      let status = 'normal';
      if (sensors.some(s => s.status === 'critical')) status = 'critical';
      else if (sensors.some(s => s.status === 'warning')) status = 'warning';

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
        status,
      };
    });

  // Pagination
  const totalGreenhousePages = Math.ceil(greenhouseEnvData.length / pageSize);
  const paginatedGreenhouseData = greenhouseEnvData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Get crop info for a greenhouse
  const getCropInfo = (greenhouseId: string) => {
    return cropBatches.find(b => b.greenhouseId === greenhouseId && b.status === 'in_progress');
  };

  // Handle detail button click
  const handleDetailClick = (greenhouseId: string) => {
    setSelectedGreenhouse(greenhouseId);
    setIsDetailModalOpen(true);
  };

  // Get sensor data for detail modal
  const getDetailSensorData = (greenhouseId: string) => {
    return filteredSensors.filter(s => s.greenhouseId === greenhouseId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">环境监测</h1>
              <p className="text-gray-500">IoT传感器数据监控和环境监测记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 当地天气预报和外部气象站环境参数 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 当地天气预报 - 左侧 */}
            <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-100 relative">
              <button className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600">
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

              {/* 5天天气预报 */}
              <div className="border-t border-gray-100 pt-3">
                <div className="grid grid-cols-5 gap-1">
                  {weatherForecast.forecast.map((day, index) => (
                    <div key={index} className="text-center">
                      <p className="text-xs text-gray-500 mb-1">{day.day}</p>
                      <day.icon className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-700">
                        {day.tempLow}~{day.tempHigh}°
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 外部气象站环境参数 - 右侧 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">外部气象站环境参数</h3>
              </div>

              {/* 外部环境参数卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {externalEnvParams.map((param) => (
                  <div key={param.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${param.color} flex items-center justify-center`}>
                        <param.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{param.name}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">
                        {param.value}<span className="text-xs font-normal text-gray-500 ml-1">{param.unit}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

      {/* 温室内环境参数表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">温室内环境参数表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center text-base font-bold text-gray-900">区域选择</th>
                    <th className="px-4 py-3 text-center text-base font-bold text-gray-900" colSpan={4}>空气环境参数</th>
                    <th className="px-1 py-3"></th>
                    <th className="px-4 py-3 text-center text-base font-bold text-gray-900" colSpan={4}>土壤环境参数</th>
                    <th className="px-4 py-3 text-center text-base font-bold text-gray-900">状态</th>
                    <th className="px-4 py-3 text-center text-base font-bold text-gray-900">更新时间</th>
                    <th className="px-4 py-3 text-center text-base font-bold text-gray-900">详情</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2">
                      <select
                        value={selectedRegion}
                        onChange={(e) => { setSelectedRegion(e.target.value); setCurrentPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        <option value="">全部区域</option>
                        {greenhouseList.map(gh => (
                          <option key={gh.id} value={gh.id}>{gh.name}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">温度(°C)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">湿度(%)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">光照度(Lux)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">CO2(ppm)</th>
                    <th className="px-1 py-2"></th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">温度(°C)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">湿度(%)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">EC值</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">PH值</th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedGreenhouseData.map((gh) => (
                    <tr key={gh.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-gray-900">{gh.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.airTemp?.status === 'normal' ? 'text-gray-900' : gh.airTemp?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.airTemp?.value ?? '-'}{gh.airTemp?.unit ? ` ${gh.airTemp.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.airHumidity?.status === 'normal' ? 'text-gray-900' : gh.airHumidity?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.airHumidity?.value ?? '-'}{gh.airHumidity?.unit ? ` ${gh.airHumidity.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.light?.status === 'normal' ? 'text-gray-900' : gh.light?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.light?.value ?? '-'}{gh.light?.unit ? ` ${gh.light.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.co2?.status === 'normal' ? 'text-gray-900' : gh.co2?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.co2?.value ?? '-'}{gh.co2?.unit ? ` ${gh.co2.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-1 py-3"></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.soilTemp?.status === 'normal' ? 'text-gray-900' : gh.soilTemp?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilTemp?.value ?? '-'}{gh.soilTemp?.unit ? ` ${gh.soilTemp.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.soilMoisture?.status === 'normal' ? 'text-gray-900' : gh.soilMoisture?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilMoisture?.value ?? '-'}{gh.soilMoisture?.unit ? ` ${gh.soilMoisture.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.soilEc?.status === 'normal' ? 'text-gray-900' : gh.soilEc?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilEc?.value ?? '-'}{gh.soilEc?.unit ? ` ${gh.soilEc.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${gh.soilPh?.status === 'normal' ? 'text-gray-900' : gh.soilPh?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilPh?.value ?? '-'}{gh.soilPh?.unit ? ` ${gh.soilPh.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(gh.status)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{gh.lastUpdate}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDetailClick(gh.id)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-500">条</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">共 {greenhouseEnvData.length} 条</span>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm">{currentPage} / {totalGreenhousePages || 1}</span>
                <button onClick={() => setCurrentPage(Math.min(totalGreenhousePages, currentPage + 1))} disabled={currentPage >= totalGreenhousePages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

      {/* 温室内环境参数详情弹窗 */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedGreenhouse ? `${greenhouseEnvData.find(g => g.id === selectedGreenhouse)?.name} - 温室内环境参数` : '温室内环境参数'}
        size="lg"
      >
        {selectedGreenhouse && (
          <div className="space-y-6">
            {/* 更新时间 */}
            <div className="text-sm text-gray-500">
              更新时间: {greenhouseEnvData.find(g => g.id === selectedGreenhouse)?.lastUpdate}
            </div>

            {/* 空气环境参数 */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">空气环境参数</h4>
              <div className="grid grid-cols-2 gap-4">
                {['air_temp', 'air_humidity', 'light', 'co2'].map(type => {
                  const sensor = getDetailSensorData(selectedGreenhouse).find(s => s.type === type);
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        {type === 'air_temp' ? '温度' :
                         type === 'air_humidity' ? '湿度' :
                         type === 'light' ? '光照度' : 'CO2含量'}
                      </span>
                      <span className={`text-sm font-medium ${
                        sensor?.status === 'normal' ? 'text-gray-900' :
                        sensor?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {sensor?.value ?? '-'}{sensor?.unit ? ` ${sensor.unit}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 土壤环境参数 */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">土壤环境参数</h4>
              <div className="grid grid-cols-2 gap-4">
                {['soil_temp', 'soil_moisture', 'soil_ec', 'soil_ph'].map(type => {
                  const sensor = getDetailSensorData(selectedGreenhouse).find(s => s.type === type);
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        {type === 'soil_temp' ? '土壤温度' :
                         type === 'soil_moisture' ? '土壤湿度' :
                         type === 'soil_ec' ? '土壤EC值' : '土壤PH值'}
                      </span>
                      <span className={`text-sm font-medium ${
                        sensor?.status === 'normal' ? 'text-gray-900' :
                        sensor?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {sensor?.value ?? '-'}{sensor?.unit ? ` ${sensor.unit}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 区域内作物 */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">区域内作物</h4>
              {getCropInfo(selectedGreenhouse) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">作物名称</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.cropName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">种植区域</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.greenhouseName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">批次</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.batchCode}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">品种</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.variety}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">生育期</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.stageName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">种植面积</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.plantingArea} ㎡</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg col-span-2">
                    <span className="text-sm text-gray-600">负责人</span>
                    <span className="text-sm font-medium text-gray-900">{getCropInfo(selectedGreenhouse)?.responsiblePerson}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                  该区域暂无进行中的作物
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
