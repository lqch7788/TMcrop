/**
 * 从 V1.3 100% 一致复制
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Leaf, Search, RefreshCw, Home, Download, AlertTriangle, CheckCircle } from 'lucide-react';

const soilWaterData = [
  { id: 'SW-001', location: '1号大棚-1区', soilMoisture: 45, soilTemp: 18.5, ph: 6.8, ec: 2.2, waterLevel: 85, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'SW-002', location: '1号大棚-2区', soilMoisture: 38, soilTemp: 19.2, ph: 6.5, ec: 2.5, waterLevel: 72, status: 'warning', updateTime: '2025-01-15 14:30:00' },
  { id: 'SW-003', location: '2号大棚-1区', soilMoisture: 52, soilTemp: 17.8, ph: 7.0, ec: 1.8, waterLevel: 90, status: 'normal', updateTime: '2025-01-15 14:29:00' },
  { id: 'SW-004', location: '2号大棚-2区', soilMoisture: 62, soilTemp: 18.0, ph: 6.9, ec: 2.0, waterLevel: 95, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'SW-005', location: '3号大棚-1区', soilMoisture: 28, soilTemp: 20.5, ph: 6.2, ec: 3.2, waterLevel: 45, status: 'danger', updateTime: '2025-01-15 14:28:00' },
  { id: 'SW-006', location: '露天试验田', soilMoisture: 35, soilTemp: 16.5, ph: 7.2, ec: 1.5, waterLevel: 60, status: 'warning', updateTime: '2025-01-15 14:30:00' },
  { id: 'SW-007', location: '滴灌示范区', soilMoisture: 55, soilTemp: 17.2, ph: 6.7, ec: 2.1, waterLevel: 88, status: 'normal', updateTime: '2025-01-15 14:30:00' },
  { id: 'SW-008', location: '水培区', waterTemp: 22.0, ph: 6.4, ec: 2.8, dissolvedO2: 8.5, turbidity: 12, status: 'normal', updateTime: '2025-01-15 14:30:00' },
];

const statistics = { totalPoints: 8, normalPoints: 5, warningPoints: 2, dangerPoints: 1, avgMoisture: 47, avgPH: 6.7 };

export default function SoilWater() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredData = soilWaterData.filter(item => {
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
            <h1 className="text-2xl font-bold text-gray-800">土壤水质</h1>
            <p className="text-gray-500 mt-1">土壤水质监测</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { Icon: Droplets, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测点', value: statistics.totalPoints, valColor: 'text-gray-800' },
          { Icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600', label: '正常', value: statistics.normalPoints, valColor: 'text-green-600' },
          { Icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-600', label: '预警', value: statistics.warningPoints, valColor: 'text-amber-600' },
          { Icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-600', label: '告警', value: statistics.dangerPoints, valColor: 'text-red-600' },
          { Icon: Droplets, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均湿度', value: `${statistics.avgMoisture}%`, valColor: 'text-cyan-600' },
          { Icon: Leaf, bg: 'bg-emerald-100', text: 'text-emerald-600', label: '平均pH', value: statistics.avgPH, valColor: 'text-emerald-600' },
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">土壤湿度(%)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">土壤温度(°C)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">pH值</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">EC值</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">水位/溶解氧</th>
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
                  {item.soilMoisture !== undefined ? (
                    <span className={`font-medium ${item.soilMoisture < 35 ? 'text-red-600' : item.soilMoisture < 45 ? 'text-amber-600' : 'text-gray-800'}`}>{item.soilMoisture}</span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.soilTemp !== undefined ? item.soilTemp : item.waterTemp !== undefined ? item.waterTemp : '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`${item.ph < 6.0 || item.ph > 7.5 ? 'text-amber-600' : 'text-gray-600'}`}>{item.ph}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.ec}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.waterLevel !== undefined ? `${item.waterLevel}%` : item.dissolvedO2 !== undefined ? `${item.dissolvedO2}mg/L` : '-'}
                </td>
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
