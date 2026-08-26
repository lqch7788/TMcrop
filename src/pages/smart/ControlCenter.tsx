/**
 * 智能控制中心 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Thermometer, Droplets, Sun, Wind, Zap, Radio, ChevronLeft, ChevronRight, Home, ArrowLeft } from 'lucide-react';

const controlStats = [
  { label: '温室控制器', value: 48, unit: '台', icon: Thermometer, color: 'from-red-500 to-orange-500' },
  { label: '灌溉控制器', value: 32, unit: '套', icon: Droplets, color: 'from-blue-500 to-cyan-500' },
  { label: '施肥控制器', value: 24, unit: '套', icon: Settings, color: 'from-green-500 to-emerald-500' },
  { label: '联动策略', value: 16, unit: '个', icon: Zap, color: 'from-purple-500 to-violet-500' },
];

const deviceStatus = [
  { id: 'C001', name: '1号温室温控器', type: '温室控制', status: '运行中', base: '北京基地1号', temp: 25.2, humidity: 68 },
  { id: 'C002', name: '2号温室温控器', type: '温室控制', status: '运行中', base: '北京基地2号', temp: 24.8, humidity: 65 },
  { id: 'C003', name: '3号温室温控器', type: '温室控制', status: '告警', base: '山东寿光基地', temp: 35.2, humidity: 85 },
  { id: 'C004', name: '1号灌溉控制器', type: '灌溉控制', status: '运行中', base: '河南新乡基地', flow: 120, pressure: 0.45 },
  { id: 'C005', name: '2号灌溉控制器', type: '灌溉控制', status: '运行中', base: '江苏南京基地', flow: 98, pressure: 0.38 },
  { id: 'C006', name: '1号施肥控制器', type: '施肥控制', status: '运行中', base: '山东青岛基地', ec: 2.4, ph: 6.5 },
  { id: 'C007', name: '2号施肥控制器', type: '施肥控制', status: '待机', base: '云南昆明基地', ec: 2.2, ph: 6.3 },
  { id: 'C008', name: '温室群联动控制器', type: '联动控制', status: '运行中', base: '云南大理基地', linked: 8 },
];

export default function ControlCenter() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(deviceStatus.length / pageSize);
  const paginatedData = deviceStatus.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      '运行中': 'bg-green-100 text-green-700',
      '告警': 'bg-red-100 text-red-700',
      '待机': 'bg-gray-100 text-gray-600',
      '离线': 'bg-gray-100 text-gray-500',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">智能控制中心</h1>
              <p className="text-gray-500">温室环境与灌溉施肥设备智能控制</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {controlStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}<span className="text-xs text-gray-500 ml-1">{stat.unit}</span></p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-gray-900">控制器状态概览</h3></div>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备编号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">设备类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">所属基地</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">主要参数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{device.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{device.base}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(device.status)}`}>{device.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {'temp' in device && `温度${device.temp}°C`}
                  {'humidity' in device && `湿度${device.humidity}%`}
                  {'flow' in device && `流量${device.flow}L/h`}
                  {'pressure' in device && `压力${device.pressure}MPa`}
                  {'ec' in device && `EC${device.ec}`}
                  {'ph' in device && `pH${device.ph}`}
                  {'linked' in device && `联动${device.linked}台`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="text-sm text-gray-500">共 {deviceStatus.length} 条记录，第 {currentPage}/{totalPages} 页</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-medium ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/smart-greenhouse')} className="p-4 rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left">
              <Thermometer className="w-6 h-6 text-emerald-600 mb-2" />
              <p className="font-medium text-gray-900">温室控制</p>
              <p className="text-xs text-gray-500">温度湿度调控</p>
            </button>
            <button onClick={() => navigate('/smart-irrigation')} className="p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left">
              <Droplets className="w-6 h-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">灌溉控制</p>
              <p className="text-xs text-gray-500">灌溉策略管理</p>
            </button>
            <button onClick={() => navigate('/smart-fertilizer')} className="p-4 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors text-left">
              <Settings className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">施肥控制</p>
              <p className="text-xs text-gray-500">水肥一体化</p>
            </button>
            <button onClick={() => navigate('/smart-linkage')} className="p-4 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors text-left">
              <Zap className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">联动控制</p>
              <p className="text-xs text-gray-500">设备联动策略</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Radio className="w-4 h-4 text-white" /></div>
                <span className="font-medium text-gray-900">系统运行</span>
              </div>
              <span className="text-green-600 text-sm">正常</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><Wind className="w-4 h-4 text-white" /></div>
                <span className="font-medium text-gray-900">通信链路</span>
              </div>
              <span className="text-blue-600 text-sm">稳定</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center"><Sun className="w-4 h-4 text-white" /></div>
                <span className="font-medium text-gray-900">今日告警</span>
              </div>
              <span className="text-amber-600 text-sm">3条</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}