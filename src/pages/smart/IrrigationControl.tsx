/**
 * 灌溉控制 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Power, Gauge, Search, Play, Pause, Home, Settings, CheckCircle, AlertCircle, Calendar,
} from 'lucide-react';

const irrigationZones = [
  { id: 'zone-1', name: '1号大棚灌溉区', area: '2000㎡', status: 'running', soilMoisture: 45, flowRate: 120, pressure: 0.35, lastStart: '2025-01-15 09:30:00' },
  { id: 'zone-2', name: '2号大棚灌溉区', area: '1800㎡', status: 'idle', soilMoisture: 68, flowRate: 0, pressure: 0, lastStart: '2025-01-14 18:00:00' },
  { id: 'zone-3', name: '3号大棚灌溉区', area: '2200㎡', status: 'fault', soilMoisture: 32, flowRate: 0, pressure: 0, lastStart: '2025-01-14 06:00:00' },
  { id: 'zone-4', name: '露天灌溉区A', area: '5000㎡', status: 'running', soilMoisture: 52, flowRate: 280, pressure: 0.42, lastStart: '2025-01-15 10:00:00' },
  { id: 'zone-5', name: '露天灌溉区B', area: '4500㎡', status: 'idle', soilMoisture: 75, flowRate: 0, pressure: 0, lastStart: '2025-01-14 07:00:00' },
  { id: 'zone-6', name: '滴灌试验区', area: '500㎡', status: 'running', soilMoisture: 58, flowRate: 45, pressure: 0.28, lastStart: '2025-01-15 08:00:00' },
];

const statistics = { totalZones: 6, runningZones: 2, idleZones: 3, faultZones: 1, totalFlow: 445, avgMoisture: 55 };

// 状态筛选（带"全部"）
const statuses = ['全部', '运行中', '待机', '故障'];

export default function IrrigationControl() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredZones = irrigationZones.filter(z => {
    const matchSearch = z.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = z.status === 'running' ? '运行中' : z.status === 'idle' ? '待机' : '故障';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredZones.length / pageSize));
  const paginatedZones = filteredZones.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '运行中' };
      case 'idle': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Pause className="w-3 h-3" />, label: '待机' };
      case 'fault': return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" />, label: '故障' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Pause className="w-3 h-3" />, label: '未知' };
    }
  };

  const handleControl = (zoneId: string, action: 'start' | 'stop') => alert(`${action === 'start' ? '启动' : '停止'}灌溉区 ${zoneId}`);

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 — 大图标卡（与订单管理风格一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">灌溉控制</h1>
              <p className="text-gray-500 mt-1">灌溉系统监控与控制</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" /> 返回主页
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
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
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.Icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.vc}`}>{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索灌溉区域..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">区域名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">面积</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">土壤湿度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">流量(m³/h)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">压力(MPa)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最后启动</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedZones.map(zone => {
              const badge = getStatusBadge(zone.status);
              return (
                <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{zone.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{zone.area}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </td>
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
                    <div className="flex items-center justify-center gap-1">
                      {zone.status === 'running' ? (
                        <button
                          onClick={() => handleControl(zone.id, 'stop')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="停止"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : zone.status !== 'fault' ? (
                        <button
                          onClick={() => handleControl(zone.id, 'start')}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="启动"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="维修"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredZones.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredZones.length} 条记录</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page
                  ? 'bg-[#2B5D3A] text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
