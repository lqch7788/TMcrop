/**
 * 环境监测 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer, Droplets, Wind, Search, Home, Download, Plus, Bell, TrendingUp, TrendingDown,
  CheckCircle, Clock, AlertCircle, Calendar,
} from 'lucide-react';

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

// 状态筛选（与表格徽章标签一一对应）
const statuses = ['全部', '正常', '预警', '告警'];

export default function EnvMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = envData.filter(item => {
    const matchSearch = item.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = item.status === 'normal' ? '正常' : item.status === 'warning' ? '预警' : '告警';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致（rounded-full + icon）
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '正常' };
      case 'warning':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" />, label: '预警' };
      case 'danger':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" />, label: '告警' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: '未知' };
    }
  };

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">环境监测</h1>
              <p className="text-gray-500 mt-1">环境数据实时监测</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={() => alert('新增环境监测点')}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 新增监测点
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          { Icon: Thermometer, bg: 'bg-blue-100', text: 'text-blue-600', label: '监测点', value: statistics.totalPoints, valColor: 'text-gray-800' },
          { Icon: Bell, bg: 'bg-green-100', text: 'text-green-600', label: '正常', value: statistics.normalPoints, valColor: 'text-green-600' },
          { Icon: TrendingUp, bg: 'bg-yellow-100', text: 'text-yellow-600', label: '预警', value: statistics.warningPoints, valColor: 'text-yellow-600' },
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">温度(°C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">湿度(%)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">CO₂(ppm)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">光照(Lux)</th>
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
                    <span className={`font-medium ${item.temp > 30 ? 'text-red-600' : item.temp < 20 ? 'text-blue-600' : 'text-gray-800'}`}>{item.temp}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.humidity}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`${item.co2 > 500 ? 'text-red-600' : 'text-gray-600'}`}>{item.co2}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.light.toLocaleString()}</td>
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
