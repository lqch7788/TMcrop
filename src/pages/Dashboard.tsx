import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Link } from 'react-router-dom';
import {
  Sprout, ClipboardList, CheckSquare, AlertTriangle, TrendingUp,
  Thermometer, Droplets, Sun, Wind, CloudRain, ChevronRight,
  LayoutDashboard, Activity, Package, Calendar, Clock, RefreshCw, MapPin,
  Compass, Gauge, CloudSnow, Eye, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  dashboardStats, tasks, iotSensors, messages, cropBatches,
  temperatureTrend, costAnalysis, yieldStats, equipmentStats,
  energyConsumption, productionProgress, inventoryAlerts,
  todayTasksBreakdown, alertsBreakdown
} from '../data/mockData';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatCard({ icon: Icon, label, value, trend, trendUp, color, small }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color: string;
  small?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${small ? 'p-3' : 'p-6'}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded-lg ${color} ${small ? 'p-2' : 'p-3'}`}>
          <Icon className={`text-white ${small ? 'w-4 h-4' : 'w-6 h-6'}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${!trendUp && 'rotate-180'}`} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className={`font-bold text-gray-900 ${small ? 'text-xl' : 'text-3xl'}`}>{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function EquipmentStatusCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-cyan-500 to-teal-600">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">设备状态</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">自动运行</span>
          <span className="font-medium text-emerald-600">{equipmentStats.autoMode}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">手动模式</span>
          <span className="font-medium text-amber-600">{equipmentStats.manualMode}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">设备故障</span>
          <span className="font-medium text-red-600">{equipmentStats.faults}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">离线传感器</span>
          <span className="font-medium text-gray-600">{equipmentStats.offlineSensors}个</span>
        </div>
      </div>
    </div>
  );
}

function InventoryAlertCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-orange-500 to-red-600">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">库存预警</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-red-500">{inventoryAlerts.lowStockCount}</span>
          <span className="text-sm text-gray-500">种物料库存不足</span>
        </div>
        <p className="text-xs text-gray-400">低于安全库存，请及时采购</p>
      </div>
    </div>
  );
}

function ProductionProgressCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-purple-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">生产进度</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-violet-600">{productionProgress.harvestReady}</span>
          <span className="text-sm text-gray-500">个批次进入采收期</span>
        </div>
        <div className="space-y-1 mt-2">
          {productionProgress.batches.map((batch, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{batch.name}</span>
              <span className="text-xs text-gray-400">{batch.daysLeft}天后</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnergyCard() {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <span className="text-red-500">↑{trend}%</span>;
    if (trend < 0) return <span className="text-emerald-500">↓{Math.abs(trend)}%</span>;
    return <span className="text-gray-400">→</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-yellow-500 to-orange-600">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">今日能耗</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">水</span>
          <span className="font-medium">{energyConsumption.water}m³ {getTrendIcon(energyConsumption.waterTrend)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">电</span>
          <span className="font-medium">{energyConsumption.electricity}kWh {getTrendIcon(energyConsumption.electricityTrend)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">气</span>
          <span className="font-medium">{energyConsumption.gas}m³ {getTrendIcon(energyConsumption.gasTrend)}</span>
        </div>
      </div>
    </div>
  );
}

function TodayTasksCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-blue-500 to-indigo-600">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">今日待办</span>
        </div>
        <span className="text-2xl font-bold text-blue-600">{todayTasksBreakdown.total}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-500" />
            农事任务
          </span>
          <span className="font-medium">{todayTasksBreakdown.farming}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-500" />
            设备维护
          </span>
          <span className="font-medium">{todayTasksBreakdown.equipment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" />
            采收处理
          </span>
          <span className="font-medium">{todayTasksBreakdown.harvest}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-orange-500" />
            待办审批
          </span>
          <span className="font-medium">{todayTasksBreakdown.approval}</span>
        </div>
      </div>
    </div>
  );
}

function AlertsCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-red-500 to-rose-600">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">告警数量</span>
        </div>
        <span className="text-2xl font-bold text-red-600">{alertsBreakdown.total}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-red-500" />
            环境告警
          </span>
          <span className="font-medium">{alertsBreakdown.environment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-orange-500" />
            设备故障
          </span>
          <span className="font-medium">{alertsBreakdown.equipment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Eye className="w-3 h-3 text-yellow-500" />
            病虫害告警
          </span>
          <span className="font-medium">{alertsBreakdown.pest}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-500" />
            农事告警
          </span>
          <span className="font-medium">{alertsBreakdown.farming}</span>
        </div>
      </div>
    </div>
  );
}

function WeatherWidget() {
  const [weatherTab, setWeatherTab] = useState<'forecast' | 'station'>('station');

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Tab 选择 */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setWeatherTab('forecast')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            weatherTab === 'forecast'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          天气预报
        </button>
        <button
          onClick={() => setWeatherTab('station')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            weatherTab === 'station'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          本地气象站
        </button>
      </div>

      {/* 天气预报内容 */}
      {weatherTab === 'forecast' && (
        <div className="bg-[#F2F6FA] p-4 text-gray-900">
          {/* 当天天气 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">18°</p>
              <p className="text-gray-600 mt-1">晴转多云</p>
              <p className="text-sm text-gray-500 mt-2">上海市崇明区 · 3月18日</p>
            </div>
            <div className="flex items-start gap-2 -mt-4 -mr-2">
              <div className="text-center">
                <Sun className="w-12 h-12 text-yellow-500" />
              </div>
              <button className="p-1 hover:bg-gray-200 rounded">
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 mt-4 pt-3 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">今天</p>
              <Sun className="w-6 h-6 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">18°</p>
              <p className="text-xs text-gray-500">晴</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">明天</p>
              <CloudRain className="w-6 h-6 mx-auto text-blue-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">15°</p>
              <p className="text-xs text-gray-500">小雨</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周四</p>
              <CloudRain className="w-6 h-6 mx-auto text-gray-400 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">12°</p>
              <p className="text-xs text-gray-500">中雨</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周五</p>
              <Sun className="w-6 h-6 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">16°</p>
              <p className="text-xs text-gray-500">晴</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">周六</p>
              <Sun className="w-6 h-6 mx-auto text-yellow-500 mt-1" />
              <p className="text-sm font-medium text-gray-900 mt-1">19°</p>
              <p className="text-xs text-gray-500">晴</p>
            </div>
          </div>
        </div>
      )}

      {/* 本地气象站内容 */}
      {weatherTab === 'station' && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stationParams.map((param) => (
              <div key={param.id} className="bg-[#F2F6FA] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${param.color} flex items-center justify-center`}>
                    <param.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{param.name}</span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
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

function IoTSensorCard({ sensor }: { sensor: typeof iotSensors[0] }) {
  const getIcon = () => {
    switch (sensor.type) {
      case 'air_temp': return <Thermometer className="w-5 h-5" />;
      case 'air_humidity': return <Droplets className="w-5 h-5" />;
      case 'soil_moisture': return <Droplets className="w-5 h-5" />;
      case 'light': return <Sun className="w-5 h-5" />;
      case 'co2': return <Wind className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (sensor.status) {
      case 'normal': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg text-gray-600">
          {getIcon()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{sensor.typeName}</p>
          <p className="text-xs text-gray-500">{sensor.greenhouseName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">
          {sensor.value}<span className="text-xs text-gray-500 ml-1">{sensor.unit}</span>
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor()}`}>
          {sensor.status === 'normal' ? '正常' : sensor.status === 'warning' ? '预警' : '告警'}
        </span>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: typeof tasks[0] }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待执行';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '一般'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{task.greenhouseName}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.workDuration}小时
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
            {getStatusText(task.status)}
          </span>
          <span className="text-xs text-gray-500">{task.assigneeName}</span>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ message }: { message: typeof messages[0] }) {
  if (message.type !== 'alert') return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-900">{message.title}</p>
        <p className="text-xs text-red-600 mt-0.5 truncate">{message.content}</p>
      </div>
      <span className="text-xs text-red-400">{message.sendTime.split(' ')[1]}</span>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'iot'>('overview');
  const [greenhousePage, setGreenhousePage] = useState(1);
  const [greenhousePageSize, setGreenhousePageSize] = useState(5);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<string | null>(null);
  const [greenhouseTableExpanded, setGreenhouseTableExpanded] = useState(false);
  const [fieldTableExpanded, setFieldTableExpanded] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{type: string; data: any} | null>(null);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  // 月度产量统计筛选
  const [yieldRegion, setYieldRegion] = useState('');
  const [yieldCrop, setYieldCrop] = useState('');

  // 成本构成分析筛选
  const [costPeriod, setCostPeriod] = useState('month');
  const [costCrop, setCostCrop] = useState('');
  const [costAreaType, setCostAreaType] = useState('');

  const todayTasks = tasks.filter(t => t.status !== 'completed');
  const criticalSensors = iotSensors.filter(s => s.status !== 'normal');
  const alertMessages = messages.filter(m => m.type === 'alert');

  // Filter sensors by selected region
  const filteredSensors = selectedRegion
    ? iotSensors.filter(s => s.greenhouseId === selectedRegion)
    : iotSensors;

  // Get unique greenhouse list for dropdown
  const greenhouseList = Array.from(new Set(iotSensors.map(s => s.greenhouseId)))
    .map(ghId => {
      const sensor = iotSensors.find(s => s.greenhouseId === ghId);
      return { id: ghId, name: sensor?.greenhouseName || '' };
    });

  // 筛选后的月度产量统计
  const filteredYieldStats = yieldStats.filter(stat => {
    const regionMatch = !yieldRegion || stat.region === yieldRegion;
    const cropMatch = !yieldCrop || stat.crop === yieldCrop;
    return regionMatch && cropMatch;
  });

  // 筛选后的成本构成分析
  const filteredCostAnalysis = costAnalysis.filter(cost => {
    const periodMatch = !costPeriod || cost.period === costPeriod;
    const cropMatch = !costCrop || cost.crop === costCrop;
    const areaMatch = !costAreaType || cost.areaType === costAreaType;
    return periodMatch && cropMatch && areaMatch;
  });

  // Group sensors by greenhouse for greenhouse environmental data
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
    });

  const totalGreenhousePages = Math.ceil(greenhouseEnvData.length / greenhousePageSize);
  const paginatedGreenhouseData = greenhouseEnvData.slice((greenhousePage - 1) * greenhousePageSize, greenhousePage * greenhousePageSize);

  // Handle detail button click
  const handleDetailClick = (greenhouseId: string) => {
    setSelectedGreenhouse(greenhouseId);
    setIsDetailModalOpen(true);
  };

  // Get sensor data for detail modal
  const getDetailSensorData = (greenhouseId: string) => {
    return iotSensors.filter(s => s.greenhouseId === greenhouseId);
  };

  // Get crop info for a greenhouse
  const getCropInfo = (greenhouseId: string) => {
    return cropBatches.find(b => b.greenhouseId === greenhouseId && b.status === 'in_progress');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">基地总览</h1>
              <p className="text-gray-500">实时监控农业生产运营状况</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - First Row */}
      <div className="grid grid-cols-6 gap-4">
        <TodayTasksCard />
        <AlertsCard />
        <EquipmentStatusCard />
        <InventoryAlertCard />
        <ProductionProgressCard />
        <EnergyCard />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* 天气预报 */}
          <WeatherWidget />

          {/* 崇明岛基地概况 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-base font-semibold text-gray-900">崇明岛基地概况</h3>
                <div className="flex items-center gap-6 text-sm">
                  <span><span className="text-gray-500">总面积：</span><span className="font-medium text-gray-900">1500亩</span></span>
                  <span><span className="text-gray-500">温室大棚：</span><span className="font-medium text-gray-900">12个 (80000㎡)</span></span>
                  <span><span className="text-gray-500">大田面积：</span><span className="font-medium text-gray-900">700亩</span></span>
                  <span className="text-gray-500">启用时间：2020年3月</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-6">
              {/* 温室大棚表格 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold text-gray-900">温室大棚</p>
                  <button
                    onClick={() => setGreenhouseTableExpanded(!greenhouseTableExpanded)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${greenhouseTableExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                {greenhouseTableExpanded && (
                  <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F2F6FA] sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">棚号</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">作物</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">面积(㎡)</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">温室类型</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">种植状态</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">种植时间</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700">详情</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#F2F6FA]">
                        <tr><td className="px-2 py-2">1号棚</td><td className="px-2 py-2">番茄</td><td className="px-2 py-2">6500</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-01-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '1号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">2号棚</td><td className="px-2 py-2">番茄</td><td className="px-2 py-2">6500</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-01-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '2号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">3号棚</td><td className="px-2 py-2">番茄</td><td className="px-2 py-2">6500</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-01-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '3号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">4号棚</td><td className="px-2 py-2">黄瓜</td><td className="px-2 py-2">7000</td><td className="px-2 py-2">玻璃温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-02-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '4号棚', crop: '黄瓜', area: '7000', type: '玻璃温室', status: '生长中', plantedDate: '2024-02-01', expectedHarvest: '2024-05-15', manager: '李明轩'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">5号棚</td><td className="px-2 py-2">黄瓜</td><td className="px-2 py-2">7000</td><td className="px-2 py-2">玻璃温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-sm">育苗中</span></td><td className="px-2 py-2">2024-03-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '5号棚', crop: '黄瓜', area: '7000', type: '玻璃温室', status: '育苗中', plantedDate: '2024-03-01', expectedHarvest: '2024-06-01', manager: '李明轩'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">6号棚</td><td className="px-2 py-2">草莓</td><td className="px-2 py-2">6000</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2023-11-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '6号棚', crop: '草莓', area: '6000', type: '薄膜温室', status: '生长中', plantedDate: '2023-11-01', expectedHarvest: '2024-03-30', manager: '王建国'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">7号棚</td><td className="px-2 py-2">草莓</td><td className="px-2 py-2">6000</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2023-11-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '7号棚', crop: '草莓', area: '6000', type: '薄膜温室', status: '生长中', plantedDate: '2023-11-01', expectedHarvest: '2024-03-30', manager: '王建国'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">8号棚</td><td className="px-2 py-2">辣椒</td><td className="px-2 py-2">5500</td><td className="px-2 py-2">玻璃温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-02-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '8号棚', crop: '辣椒', area: '5500', type: '玻璃温室', status: '生长中', plantedDate: '2024-02-15', expectedHarvest: '2024-06-30', manager: '赵俊杰'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">9号棚</td><td className="px-2 py-2">辣椒</td><td className="px-2 py-2">5500</td><td className="px-2 py-2">玻璃温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-sm">待种植</span></td><td className="px-2 py-2">-</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '9号棚', crop: '辣椒', area: '5500', type: '玻璃温室', status: '待种植', plantedDate: '-', expectedHarvest: '-', manager: '赵俊杰'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">10号棚</td><td className="px-2 py-2">生菜</td><td className="px-2 py-2">5000</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-03-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '10号棚', crop: '生菜', area: '5000', type: '薄膜温室', status: '生长中', plantedDate: '2024-03-01', expectedHarvest: '2024-04-15', manager: '钱文涛'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">11号棚</td><td className="px-2 py-2">生菜</td><td className="px-2 py-2">5000</td><td className="px-2 py-2">薄膜温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-03-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '11号棚', crop: '生菜', area: '5000', type: '薄膜温室', status: '生长中', plantedDate: '2024-03-01', expectedHarvest: '2024-04-15', manager: '钱文涛'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">12号棚</td><td className="px-2 py-2">西瓜</td><td className="px-2 py-2">7000</td><td className="px-2 py-2">玻璃温室</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">采收中</span></td><td className="px-2 py-2">2024-01-20</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'greenhouse', data: {no: '12号棚', crop: '西瓜', area: '7000', type: '玻璃温室', status: '采收中', plantedDate: '2024-01-20', expectedHarvest: '2024-03-18', manager: '孙晓峰'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <hr className="my-4 border-gray-300" />
              {/* 大田表格 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold text-gray-900">大田</p>
                  <button
                    onClick={() => setFieldTableExpanded(!fieldTableExpanded)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${fieldTableExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                {fieldTableExpanded && (
                  <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F2F6FA] sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">地块号</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">作物</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">面积(亩)</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">田地类型</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">种植状态</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">种植时间</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700">详情</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#F2F6FA]">
                        <tr><td className="px-2 py-2">A1地块</td><td className="px-2 py-2">水稻</td><td className="px-2 py-2">100</td><td className="px-2 py-2">水田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-03-05</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'A1地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">A2地块</td><td className="px-2 py-2">水稻</td><td className="px-2 py-2">100</td><td className="px-2 py-2">水田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-03-05</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'A2地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">A3地块</td><td className="px-2 py-2">水稻</td><td className="px-2 py-2">100</td><td className="px-2 py-2">水田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2024-03-05</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'A3地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">B1地块</td><td className="px-2 py-2">小麦</td><td className="px-2 py-2">100</td><td className="px-2 py-2">旱田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2023-11-20</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'B1地块', crop: '小麦', area: '100', fieldType: '旱田', status: '生长中', plantedDate: '2023-11-20', expectedHarvest: '2024-05-30', manager: '郑十'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">B2地块</td><td className="px-2 py-2">小麦</td><td className="px-2 py-2">100</td><td className="px-2 py-2">旱田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-sm">返青期</span></td><td className="px-2 py-2">2023-11-20</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'B2地块', crop: '小麦', area: '100', fieldType: '旱田', status: '返青期', plantedDate: '2023-11-20', expectedHarvest: '2024-05-30', manager: '郑十'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">C1地块</td><td className="px-2 py-2">油菜</td><td className="px-2 py-2">80</td><td className="px-2 py-2">旱田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2023-10-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'C1地块', crop: '油菜', area: '80', fieldType: '旱田', status: '生长中', plantedDate: '2023-10-15', expectedHarvest: '2024-04-20', manager: '吴十一'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">C2地块</td><td className="px-2 py-2">油菜</td><td className="px-2 py-2">70</td><td className="px-2 py-2">旱田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-sm">生长中</span></td><td className="px-2 py-2">2023-10-15</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'C2地块', crop: '油菜', area: '70', fieldType: '旱田', status: '生长中', plantedDate: '2023-10-15', expectedHarvest: '2024-04-20', manager: '吴十一'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                        <tr><td className="px-2 py-2">D1地块</td><td className="px-2 py-2">蔬菜</td><td className="px-2 py-2">50</td><td className="px-2 py-2">旱田</td><td className="px-2 py-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">采收中</span></td><td className="px-2 py-2">2024-02-01</td><td className="px-2 py-2 text-center"><button onClick={() => setSelectedDetail({type: 'field', data: {no: 'D1地块', crop: '蔬菜', area: '50', fieldType: '旱田', status: '采收中', plantedDate: '2024-02-01', expectedHarvest: '2024-03-18', manager: '郑十'}})}><Eye className="w-4 h-4 text-emerald-600" /></button></td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 温室内环境参数表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">温室内环境参数表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">区域选择</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap" colSpan={4}>空气环境参数</th>
                    <th className="px-1 py-3"></th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap" colSpan={4}>土壤环境参数</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">详情</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2">
                      <select
                        value={selectedRegion}
                        onChange={(e) => { setSelectedRegion(e.target.value); setGreenhousePage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        <option value="">全部区域</option>
                        {greenhouseList.map(gh => (
                          <option key={gh.id} value={gh.id}>{gh.name}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">温度(°C)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">湿度(%)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">光照度(Lux)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">CO2(ppm)</th>
                    <th className="px-1 py-2"></th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">温度(°C)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">湿度(%)</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">EC值</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">PH值</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {paginatedGreenhouseData.map((gh) => (
                    <tr key={gh.id} className="hover:bg-blue-100 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-gray-900">{gh.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.airTemp?.status === 'normal' ? 'text-gray-900' : gh.airTemp?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.airTemp?.value ?? '-'}{gh.airTemp?.unit ? ` ${gh.airTemp.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.airHumidity?.status === 'normal' ? 'text-gray-900' : gh.airHumidity?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.airHumidity?.value ?? '-'}{gh.airHumidity?.unit ? ` ${gh.airHumidity.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.light?.status === 'normal' ? 'text-gray-900' : gh.light?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.light?.value ?? '-'}{gh.light?.unit ? ` ${gh.light.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.co2?.status === 'normal' ? 'text-gray-900' : gh.co2?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.co2?.value ?? '-'}{gh.co2?.unit ? ` ${gh.co2.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-1 py-3"></td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.soilTemp?.status === 'normal' ? 'text-gray-900' : gh.soilTemp?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilTemp?.value ?? '-'}{gh.soilTemp?.unit ? ` ${gh.soilTemp.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.soilMoisture?.status === 'normal' ? 'text-gray-900' : gh.soilMoisture?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilMoisture?.value ?? '-'}{gh.soilMoisture?.unit ? ` ${gh.soilMoisture.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.soilEc?.status === 'normal' ? 'text-gray-900' : gh.soilEc?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilEc?.value ?? '-'}{gh.soilEc?.unit ? ` ${gh.soilEc.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-sm font-medium ${gh.soilPh?.status === 'normal' ? 'text-gray-900' : gh.soilPh?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {gh.soilPh?.value ?? '-'}{gh.soilPh?.unit ? ` ${gh.soilPh.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDetailClick(gh.id)} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
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
                  value={greenhousePageSize}
                  onChange={(e) => { setGreenhousePageSize(Number(e.target.value)); setGreenhousePage(1); }}
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span className="text-sm text-gray-500">条</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">共 {greenhouseEnvData.length} 条</span>
                <button onClick={() => setGreenhousePage(Math.max(1, greenhousePage - 1))} disabled={greenhousePage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <span className="text-sm">{greenhousePage} / {totalGreenhousePages || 1}</span>
                <button onClick={() => setGreenhousePage(Math.min(totalGreenhousePages, greenhousePage + 1))} disabled={greenhousePage >= totalGreenhousePages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Today's Tasks Table */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">今日任务</h3>
              <Link to="/tasks" className="text-sm text-emerald-600 hover:text-emerald-700">
                查看全部
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr className="border-b border-blue-600">
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">任务名称</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">区域</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">优先级</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">负责人</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">计划时长</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">截止日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {todayTasks.slice(0, 4).map((task) => {
                    const getPriorityColor = (priority: string) => {
                      switch (priority) {
                        case 'high': return 'text-red-600 bg-red-50';
                        case 'medium': return 'text-yellow-600 bg-yellow-50';
                        case 'low': return 'text-gray-600 bg-gray-50';
                        default: return 'text-gray-600 bg-gray-50';
                      }
                    };
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'pending': return 'text-gray-600 bg-gray-100';
                        case 'in_progress': return 'text-blue-600 bg-blue-100';
                        case 'completed': return 'text-emerald-600 bg-emerald-100';
                        default: return 'text-gray-600 bg-gray-100';
                      }
                    };
                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'pending': return '待执行';
                        case 'in_progress': return '进行中';
                        case 'completed': return '已完成';
                        default: return status;
                      }
                    };
                    const getPriorityText = (priority: string) => {
                      switch (priority) {
                        case 'high': return '紧急';
                        case 'medium': return '重要';
                        case 'low': return '一般';
                        default: return priority;
                      }
                    };
                    return (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-blue-100 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.greenhouseName}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {getPriorityText(task.priority)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.assigneeName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.workDuration}小时</td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.dueDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Batches */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">活跃种植批次</h3>
              <Link to="/production" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                查看全部 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr className="text-left text-sm font-semibold whitespace-nowrap">
                    <th className="pb-3">批次号</th>
                    <th className="pb-3">作物</th>
                    <th className="pb-3">区域</th>
                    <th className="pb-3">生长阶段</th>
                    <th className="pb-3">进度</th>
                    <th className="pb-3">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {cropBatches.slice(0, 5).map((batch) => {
                    const stageProgress = {
                      seedling: 15,
                      vegetative: 40,
                      flowering: 65,
                      fruiting: 85,
                      harvest: 100
                    };
                    return (
                      <tr key={batch.id} className="hover:bg-blue-100 transition-colors">
                        <td className="py-3 font-medium text-gray-900 whitespace-nowrap">{batch.batchCode}</td>
                        <td className="py-3 text-gray-600 whitespace-nowrap">{batch.cropName}</td>
                        <td className="py-3 text-gray-600 whitespace-nowrap">{batch.greenhouseName}</td>
                        <td className="py-3 text-gray-600 whitespace-nowrap">{batch.stageName}</td>
                        <td className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${stageProgress[batch.stage as keyof typeof stageProgress]}%` }}
                              />
                            </div>
                            <span className="text-gray-500">{stageProgress[batch.stage as keyof typeof stageProgress]}%</span>
                          </div>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                            进行中
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Widgets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Yield Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">月度产量统计</h3>
            <div className="flex gap-4 mb-4">
              <select
                value={yieldRegion}
                onChange={(e) => setYieldRegion(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">全部区域</option>
                <option value="G001">玻璃温室A区</option>
                <option value="G002">玻璃温室B区</option>
                <option value="G003">玻璃温室C区</option>
                <option value="G004">日光温室1号</option>
              </select>
              <select
                value={yieldCrop}
                onChange={(e) => setYieldCrop(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">全部作物</option>
                <option value="C001">番茄</option>
                <option value="C002">黄瓜</option>
                <option value="C003">辣椒</option>
                <option value="C004">草莓</option>
              </select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredYieldStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}kg`, '产量']}
                  />
                  <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} label={{ position: 'top', fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">成本构成分析</h3>
            <div className="flex gap-4 mb-4">
              <select
                value={costPeriod}
                onChange={(e) => setCostPeriod(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="month">本月</option>
                <option value="quarter">本季度</option>
                <option value="year">本年</option>
              </select>
              <select
                value={costCrop}
                onChange={(e) => setCostCrop(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">全部作物</option>
                <option value="C001">番茄</option>
                <option value="C002">黄瓜</option>
                <option value="C003">辣椒</option>
              </select>
              <select
                value={costAreaType}
                onChange={(e) => setCostAreaType(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">全部区域类型</option>
                <option value="greenhouse">大棚</option>
                <option value="field">大田</option>
              </select>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredCostAnalysis}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={true}
                    label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="#6b7280" fontSize={12} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {filteredCostAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {filteredCostAnalysis.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-xs text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
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

      {/* 基地详情弹窗 */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title={selectedDetail?.type === 'greenhouse' ? `${selectedDetail?.data.no}详情` : `${selectedDetail?.data.no}详情`}
        size="lg"
        headerAction={
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            进入&gt;&gt;
          </button>
        }
      >
        {selectedDetail && (
          <div className="p-6">
            {/* 基本信息 */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">基本信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">种植状态</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.data.status}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">作物名称</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.data.crop}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">种植面积</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.type === 'greenhouse' ? `${selectedDetail.data.area}㎡` : `${selectedDetail.data.area}亩`}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">种植日期</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.data.plantedDate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">预计采收</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.data.expectedHarvest}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">负责人</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDetail.data.manager}</span>
                </div>
              </div>
            </div>

            {/* 生长参数 */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">生长参数</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">当前阶段</span>
                  <span className="text-sm font-medium text-gray-900">开花结果期</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">株龄</span>
                  <span className="text-sm font-medium text-gray-900">78天</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">土壤湿度</span>
                  <span className="text-sm font-medium text-gray-900">45%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">土壤温度</span>
                  <span className="text-sm font-medium text-gray-900">22°C</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">光照强度</span>
                  <span className="text-sm font-medium text-gray-900">45000Lux</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                  <span className="text-sm text-gray-600">空气温度</span>
                  <span className="text-sm font-medium text-gray-900">28°C</span>
                </div>
              </div>
            </div>

            {/* 空气湿度单独一行 */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-[#F2F6FA] rounded-lg">
                <span className="text-sm text-gray-600">空气湿度</span>
                <span className="text-sm font-medium text-gray-900">65%</span>
              </div>
            </div>

            {/* 作物图片 */}
            <div className="mt-6">
              <h4 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">作物图片</h4>
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    onClick={() => setEnlargedImageIndex(index)}
                    className="aspect-square bg-[#F2F6FA] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 mx-auto mb-1 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-lg">📷</span>
                      </div>
                      <span className="text-xs">图片{index}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 确定按钮 */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                确定
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 图片放大查看弹窗 */}
      {enlargedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
          onClick={() => setEnlargedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center p-4">
            {/* 关闭按钮 */}
            <button
              onClick={() => setEnlargedImageIndex(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-2xl z-10"
            >
              ×
            </button>
            {/* 图片显示区域 */}
            <div className="bg-[#F2F6FA] rounded-lg w-full h-full max-h-[80vh] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-5xl">📷</span>
                </div>
                <p className="text-xl">图片 {enlargedImageIndex}</p>
                <p className="text-sm mt-2">（当前为占位图片）</p>
              </div>
            </div>
            {/* 图片计数器 */}
            <div className="mt-4 text-white text-sm">
              {enlargedImageIndex} / 5
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
