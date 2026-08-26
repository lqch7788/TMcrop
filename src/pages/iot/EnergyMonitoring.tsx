/**
 * 从 V1.3 100% 一致复制
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Search, RefreshCw, Home, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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

export default function EnergyMonitoring() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredData = energyData.filter(item => {
    const matchSearch = item.deviceName.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      running: { bg: 'bg-green-100', text: 'text-green-700', label: '运行中' },
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待机' },
      fault: { bg: 'bg-red-100', text: 'text-red-700', label: '故障' },
    };
    const { bg, text, label } = statusMap[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">能耗监测</h1>
            <p className="text-gray-500 mt-1">设备能耗监测</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜索设备名称..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部状态</option><option value="running">运行中</option><option value="idle">待机</option><option value="fault">故障</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Download size={16} />导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">功率(kW)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">电压(V)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">电流(A)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">功率因数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">今日用电(kWh)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.deviceName}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${item.power > 30 ? 'text-amber-600' : 'text-gray-800'}`}>{item.power}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.voltage}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.current}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`${item.powerFactor < 0.85 ? 'text-amber-600' : 'text-gray-600'}`}>{item.powerFactor}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.todayUsage}</td>
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
