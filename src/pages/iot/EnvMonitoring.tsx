/**
 * 从 V1.3 100% 一致复制（已删除返回按钮——原指向已删除的物联网监控中心页面）
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Droplets, Wind, Search, RefreshCw, Home, Download, Bell, TrendingUp, TrendingDown } from 'lucide-react';

// 环境监测数据
const envData = [
  { id: 'ENV-001', location: '1号温室-A区', temp: 25.2, humidity: 65, co2: 420, light: 48000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'ENV-002', location: '1号温室-B区', temp: 24.8, humidity: 68, co2: 415, light: 46000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'ENV-003', location: '2号温室-A区', temp: 28.5, humidity: 72, co2: 520, light: 52000, status: 'warning', updateTime: '2025-01-15 14:29:00' },
  { id: 'ENV-004', location: '2号温室-B区', temp: 26.1, humidity: 70, co2: 445, light: 44000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'ENV-005', location: '3号温室-A区', temp: 23.5, humidity: 62, co2: 398, light: 38000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'ENV-006', location: '3号温室-B区', temp: 31.2, humidity: 78, co2: 580, light: 55000, status: 'danger', updateTime: '2025-01-15 14:28:00' },
  { id: 'ENV-007', location: '露天监测点-1', temp: 22.8, humidity: 55, co2: 405, light: 62000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'ENV-008', location: '露天监测点-2', temp: 21.5, humidity: 52, co2: 400, light: 58000, status: 'normal', updateTime: '2025-01-15 14:30:00' },
];

const statistics = {
  totalPoints: 8, normalPoints: 6, warningPoints: 1, dangerPoints: 1,
  avgTemp: 25.5, avgHumidity: 65, avgCO2: 445,
};

export default function EnvMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredData = envData.filter(item => {
    const matchSearch = item.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
      warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: '预警' },
      danger: { bg: 'bg-red-100', text: 'text-red-700', label: '告警' },
    };
    const { bg, text, label } = statusMap[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">环境监测</h1>
            <p className="text-gray-500 mt-1">环境数据实时监测</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          { Icon: Thermometer, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测点', value: statistics.totalPoints, valColor: 'text-gray-800' },
          { Icon: Bell, bg: 'bg-green-100', text: 'text-green-600', label: '正常', value: statistics.normalPoints, valColor: 'text-green-600' },
          { Icon: TrendingUp, bg: 'bg-amber-100', text: 'text-amber-600', label: '预警', value: statistics.warningPoints, valColor: 'text-amber-600' },
          { Icon: TrendingDown, bg: 'bg-red-100', text: 'text-red-600', label: '告警', value: statistics.dangerPoints, valColor: 'text-red-600' },
          { Icon: Thermometer, bg: 'bg-orange-100', text: 'text-orange-600', label: '平均温度', value: `${statistics.avgTemp}°C`, valColor: 'text-orange-600' },
          { Icon: Droplets, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均湿度', value: `${statistics.avgHumidity}%`, valColor: 'text-cyan-600' },
          { Icon: Wind, bg: 'bg-emerald-100', text: 'text-emerald-600', label: '平均CO₂', value: statistics.avgCO2, valColor: 'text-emerald-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold ${card.valColor}`}>{card.value}</p>
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
              <input type="text" placeholder="搜索监测位置..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="normal">正常</option><option value="warning">预警</option><option value="danger">告警</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Download size={16} />导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">监测点ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">位置</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">温度(°C)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">湿度(%)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">CO₂(ppm)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">光照(Lux)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${item.temp > 30 ? 'text-red-600' : item.temp < 20 ? 'text-blue-600' : 'text-gray-800'}`}>{item.temp}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.humidity}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`${item.co2 > 500 ? 'text-red-600' : 'text-gray-600'}`}>{item.co2}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.light.toLocaleString()}</td>
                <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
