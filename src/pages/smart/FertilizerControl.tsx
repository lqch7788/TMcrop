/**
 * 施肥控制 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Power, FlaskConical, Search, Play, Pause, RefreshCw, Home, ArrowLeft, Settings } from 'lucide-react';

const fertilizerZones = [
  { id: 'fert-1', name: '1号大棚施肥区', tank: 'A罐(氮磷钾)', status: 'running', concentration: 2.5, flowRate: 80, remaining: 450, lastStart: '2025-01-15 09:30:00' },
  { id: 'fert-2', name: '2号大棚施肥区', tank: 'B罐(微量元素)', status: 'idle', concentration: 0, flowRate: 0, remaining: 800, lastStart: '2025-01-14 18:00:00' },
  { id: 'fert-3', name: '3号大棚施肥区', tank: 'A罐(氮磷钾)', status: 'fault', concentration: 0, flowRate: 0, remaining: 120, lastStart: '2025-01-14 06:00:00' },
  { id: 'fert-4', name: '露天施肥区A', tank: 'C罐(有机肥)', status: 'running', concentration: 3.2, flowRate: 120, remaining: 680, lastStart: '2025-01-15 10:00:00' },
  { id: 'fert-5', name: '露天施肥区B', tank: 'B罐(微量元素)', status: 'idle', concentration: 0, flowRate: 0, remaining: 550, lastStart: '2025-01-14 07:00:00' },
  { id: 'fert-6', name: '试验田施肥区', tank: 'D罐(定制配方)', status: 'running', concentration: 1.8, flowRate: 30, remaining: 200, lastStart: '2025-01-15 08:00:00' },
];

const statistics = { totalZones: 6, runningZones: 3, idleZones: 2, faultZones: 1, totalFlow: 230, avgConcentration: 2.5 };

export default function FertilizerControl() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = fertilizerZones.filter(z =>
    (z.name.toLowerCase().includes(searchKeyword.toLowerCase()) || z.tank.toLowerCase().includes(searchKeyword.toLowerCase())) &&
    (statusFilter === 'all' || z.status === statusFilter)
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

  const handleControl = (id: string, action: 'start' | 'stop') => alert(`${action === 'start' ? '启动' : '停止'}施肥区 ${id}`);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/smart-center')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">施肥控制</h1>
            <p className="text-gray-500 mt-1">施肥系统监控与控制</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { Icon: Leaf, bg: 'bg-green-100', text: 'text-green-600', label: '施肥区域', value: statistics.totalZones, vc: 'text-gray-800' },
          { Icon: Power, bg: 'bg-green-100', text: 'text-green-600', label: '运行中', value: statistics.runningZones, vc: 'text-green-600' },
          { Icon: Pause, bg: 'bg-gray-100', text: 'text-gray-600', label: '待机', value: statistics.idleZones, vc: 'text-gray-600' },
          { Icon: Settings, bg: 'bg-red-100', text: 'text-red-600', label: '故障', value: statistics.faultZones, vc: 'text-red-600' },
          { Icon: FlaskConical, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '总流量(L/h)', value: statistics.totalFlow, vc: 'text-cyan-600' },
          { Icon: Leaf, bg: 'bg-emerald-100', text: 'text-emerald-600', label: '平均浓度', value: `${statistics.avgConcentration}%`, vc: 'text-emerald-600' },
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
              <input type="text" placeholder="搜索施肥区域或肥料罐..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">肥料罐</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">浓度(%)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">流量(L/h)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">剩余量(L)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">最后启动</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(zone => (
              <tr key={zone.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{zone.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.tank}</td>
                <td className="px-4 py-3">{getStatusBadge(zone.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.concentration || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{zone.flowRate}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${zone.remaining < 200 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(zone.remaining / 1000) * 100}%` }} />
                    </div>
                    <span className="text-gray-600">{zone.remaining}</span>
                  </div>
                </td>
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