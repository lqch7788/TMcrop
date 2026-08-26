/**
 * 土壤水质 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Leaf, Search, Home, Download, AlertTriangle, CheckCircle, Clock, Calendar,
} from 'lucide-react';

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

// 状态筛选（与表格徽章标签一一对应）
const statuses = ['全部', '正常', '预警', '告警'];

export default function SoilWater() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = soilWaterData.filter(item => {
    const matchSearch = item.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = item.status === 'normal' ? '正常' : item.status === 'warning' ? '预警' : '告警';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '正常' };
      case 'warning':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" />, label: '预警' };
      case 'danger':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" />, label: '告警' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: '未知' };
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">土壤水质</h1>
          <p className="text-gray-500 mt-1">土壤水质监测</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> 返回主页
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { Icon: Droplets, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测点', value: statistics.totalPoints, valColor: 'text-gray-800' },
          { Icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600', label: '正常', value: statistics.normalPoints, valColor: 'text-green-600' },
          { Icon: AlertTriangle, bg: 'bg-yellow-100', text: 'text-yellow-600', label: '预警', value: statistics.warningPoints, valColor: 'text-yellow-600' },
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

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
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
              placeholder="搜索监测位置..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">监测点ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">位置</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">土壤湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">土壤温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">pH值</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">EC值</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">水位/溶解氧</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map(item => {
              const badge = getStatusBadge(item.status);
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.location}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.soilMoisture !== undefined ? (
                      <span className={`font-medium ${item.soilMoisture < 35 ? 'text-red-600' : item.soilMoisture < 45 ? 'text-yellow-600' : 'text-gray-800'}`}>{item.soilMoisture}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.soilTemp !== undefined ? item.soilTemp : item.waterTemp !== undefined ? item.waterTemp : '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`${item.ph < 6.0 || item.ph > 7.5 ? 'text-yellow-600' : 'text-gray-600'}`}>{item.ph}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.ec}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.waterLevel !== undefined ? `${item.waterLevel}%` : item.dissolvedO2 !== undefined ? `${item.dissolvedO2}mg/L` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.updateTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
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
