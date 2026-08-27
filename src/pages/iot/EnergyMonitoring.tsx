/**
 * 能耗监测 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Search, Home, Download, Plus, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, XCircle, Calendar,
} from 'lucide-react';

const energyData = [
  { id: 'EN-001', deviceName: '1号温室空调系统', power: 45.2, voltage: 380, current: 68.5, powerFactor: 0.92, todayUsage: 320, status: 'running', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-002', deviceName: '2号温室空调系统', power: 38.5, voltage: 380, current: 58.2, powerFactor: 0.91, todayUsage: 285, status: 'running', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-003', deviceName: '灌溉系统-1号区', power: 12.8, voltage: 220, current: 58.2, powerFactor: 0.88, todayUsage: 156, status: 'running', updateTime: '2025-01-15 14:29:00' },
  { id: 'EN-004', deviceName: '施肥系统', power: 8.5, voltage: 220, current: 38.6, powerFactor: 0.85, todayUsage: 95, status: 'idle', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-005', deviceName: '通风机-1号', power: 22.0, voltage: 380, current: 33.5, powerFactor: 0.90, todayUsage: 180, status: 'running', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-006', deviceName: '通风机-2号', power: 18.5, voltage: 380, current: 28.2, powerFactor: 0.89, todayUsage: 150, status: 'fault', updateTime: '2025-01-15 14:28:00' },
  { id: 'EN-007', deviceName: '补光灯系统', power: 35.0, voltage: 220, current: 159.1, powerFactor: 0.95, todayUsage: 420, status: 'running', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-008', deviceName: 'CO2发生器', power: 5.5, voltage: 220, current: 25.0, powerFactor: 0.82, todayUsage: 65, status: 'idle', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-009', deviceName: '水泵站', power: 15.0, voltage: 380, current: 22.8, powerFactor: 0.88, todayUsage: 220, status: 'running', updateTime: '2025-01-15 14:30:00' },
  { id: 'EN-010', deviceName: '办公区用电', power: 8.2, voltage: 220, current: 37.3, powerFactor: 0.90, todayUsage: 120, status: 'running', updateTime: '2025-01-15 14:30:00' },
];

const statistics = { totalDevices: 10, runningDevices: 6, idleDevices: 3, faultDevices: 1, totalPower: 208.7, todayTotalUsage: 2011, avgPowerFactor: 0.89 };

// 状态筛选（与表格徽章标签一一对应）
const statuses = ['全部', '运行中', '待机', '故障'];

export default function EnergyMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = energyData.filter(item => {
    const matchSearch = item.deviceName.toLowerCase().includes(searchKeyword.toLowerCase());
    const statusLabel = item.status === 'running' ? '运行中' : item.status === 'idle' ? '待机' : '故障';
    const matchStatus = statusFilter === '全部' || statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 状态徽章：与订单管理风格一致
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: '运行中' };
      case 'idle':
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" />, label: '待机' };
      case 'fault':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: '故障' };
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
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">能耗监测</h1>
              <p className="text-gray-500 mt-1">设备能耗监测</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button
              onClick={() => alert('新增能耗设备')}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 新增设备
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[
          { Icon: Zap, bg: 'bg-amber-100', text: 'text-amber-600', label: '设备总数', value: statistics.totalDevices, valColor: 'text-gray-800' },
          { Icon: TrendingUp, bg: 'bg-green-100', text: 'text-green-600', label: '运行中', value: statistics.runningDevices, valColor: 'text-green-600' },
          { Icon: TrendingDown, bg: 'bg-gray-100', text: 'text-gray-600', label: '待机', value: statistics.idleDevices, valColor: 'text-gray-600' },
          { Icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-600', label: '故障', value: statistics.faultDevices, valColor: 'text-red-600' },
          { Icon: Zap, bg: 'bg-orange-100', text: 'text-orange-600', label: '总功率(kW)', value: statistics.totalPower, valColor: 'text-orange-600' },
          { Icon: Zap, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '今日用电(kWh)', value: statistics.todayTotalUsage, valColor: 'text-indigo-600' },
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
              placeholder="搜索设备名称..."
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">功率(kW)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">电压(V)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">电流(A)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">功率因数</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">今日用电(kWh)</th>
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
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.deviceName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${item.power > 30 ? 'text-amber-600' : 'text-gray-800'}`}>{item.power}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.voltage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.current}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`${item.powerFactor < 0.85 ? 'text-amber-600' : 'text-gray-600'}`}>{item.powerFactor}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.todayUsage}</td>
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
