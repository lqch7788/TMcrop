/**
 * 灌溉控制 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Power, Gauge, Search, Play, Pause, RefreshCw, Home, ArrowLeft, Settings } from 'lucide-react';

const irrigationZones = [
  { id: 'zone-1', name: '1号大棚灌溉区', area: '2000㎡', status: 'running', soilMoisture: 45, flowRate: 120, pressure: 0.35, lastStart: '2025-01-15 09:30:00' },
  { id: 'zone-2', name: '2号大棚灌溉区', area: '1800㎡', status: 'idle', soilMoisture: 68, flowRate: 0, pressure: 0, lastStart: '2025-01-14 18:00:00' },
  { id: 'zone-3', name: '3号大棚灌溉区', area: '2200㎡', status: 'fault', soilMoisture: 32, flowRate: 0, pressure: 0, lastStart: '2025-01-14 06:00:00' },
  { id: 'zone-4', name: '露天灌溉区A', area: '5000㎡', status: 'running', soilMoisture: 52, flowRate: 280, pressure: 0.42, lastStart: '2025-01-15 10:00:00' },
  { id: 'zone-5', name: '露天灌溉区B', area: '4500㎡', status: 'idle', soilMoisture: 75, flowRate: 0, pressure: 0, lastStart: '2025-01-14 07:00:00' },
  { id: 'zone-6', name: '滴灌试验区', area: '500㎡', status: 'running', soilMoisture: 58, flowRate: 45, pressure: 0.28, lastStart: '2025-01-15 08:00:00' },
];

const statistics = { totalZones: 6, runningZones: 2, idleZones: 3, faultZones: 1, totalFlow: 445, avgMoisture: 55 };

export default function IrrigationControl() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredZones = irrigationZones.filter(z =>
    z.name.toLowerCase().includes(searchKeyword.toLowerCase()) && (statusFilter === 'all' || z.status === statusFilter)
  );

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      running: { bg: 'bg-green-100', text: 'text-green-700', label: '运行中' },
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待机' },
      fault: { bg: 'bg-red-100', text: 'text-red-700', label: '故障' },
    };
    const { bg, text, label } = map[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  const handleControl = (zoneId: string, action: 'start' | 'stop') => alert(`${action === 'start' ? '启动' : '停止'}灌溉区 ${zoneId}`);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/smart-center')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">灌溉控制</h1>
            <p className="text-gray-500 mt-1">灌溉系统监控与控制</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[
          { Icon: Droplets, bg: 'bg-blue-100', text: 'text-blue-600', label: '灌溉区域', value: statistics.totalZones, vc: 'text-gray-800' },
          { Icon: Power, bg: 'bg-green-100', text: 'text-green-600', label: '运行中', value: statistics.runningZones, vc: 'text-green-600' },
          { Icon: Pause, bg: 'bg-gray-100', text: 'text-gray-600', label: '待机', value: statistics.idleZones, vc: 'text-gray-600' },
          { Icon: Settings, bg: 'bg-red-100', text: 'text-red-600', label: '故障', value: statistics.faultZones, vc: 'text-red-600' },
          { Icon: Gauge, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '总流量(m³/h)', value: statistics.totalFlow, vc: 'text-cyan-600' },
          { Icon: Droplets, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '平均土壤湿度', value: `${statistics.avgMoisture}%`, vc: 'text-indigo-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}><c.Icon className={`w-5 h-5 ${c.text}`} /></div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.vc}`}>{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜索灌溉区域..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="running">运行中</option><option value="idle">待机</option><option value="fault">故障</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">区域名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">面积</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">土壤湿度</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">流量(m³/h)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">压力(MPa)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">最后启动</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredZones.map(zone => (
              <tr key={zone.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{zone.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.area}</td>
                <td className="px-4 py-3">{getStatusBadge(zone.status)}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${zone.soilMoisture < 40 ? 'bg-red-500' : zone.soilMoisture > 70 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${zone.soilMoisture}%` }} />
                    </div>
                    <span className="text-gray-600">{zone.soilMoisture}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.flowRate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.pressure || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{zone.lastStart}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {zone.status === 'running' ? (
                      <button onClick={() => handleControl(zone.id, 'stop')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="停止"><Pause size={16} /></button>
                    ) : zone.status !== 'fault' ? (
                      <button onClick={() => handleControl(zone.id, 'start')} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="启动"><Play size={16} /></button>
                    ) : (
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="维修"><Settings size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}