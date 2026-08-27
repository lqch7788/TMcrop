/**
 * 控制日志 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText, Power, Search, Home, ArrowLeft, Download, Clock, Play, Pause, Settings,
  CheckCircle, AlertCircle,
} from 'lucide-react';

const controlLogs = [
  { id: 'log-1', time: '2025-01-15 14:30:25', device: '通风机-1号', action: '启动', trigger: '温度 > 30°C', duration: '2小时30分', operator: '系统自动' },
  { id: 'log-2', time: '2025-01-15 14:25:10', device: '灌溉系统-2号区', action: '停止', trigger: '土壤湿度达标', duration: '45分', operator: '系统自动' },
  { id: 'log-3', time: '2025-01-15 14:20:00', device: '遮阳帘-1号', action: '启动', trigger: '光照 > 80000 lux', duration: '运行中', operator: '系统自动' },
  { id: 'log-4', time: '2025-01-15 13:45:30', device: '施肥系统-1号区', action: '启动', trigger: '定时任务', duration: '1小时', operator: '系统自动' },
  { id: 'log-5', time: '2025-01-15 12:00:00', device: '通风机-2号', action: '启动', trigger: 'CO2 > 800ppm', duration: '1小时15分', operator: '系统自动' },
  { id: 'log-6', time: '2025-01-15 11:30:00', device: '补光灯-试验区', action: '启动', trigger: '定时任务', duration: '4小时', operator: '系统自动' },
  { id: 'log-7', time: '2025-01-15 10:00:00', device: '灌溉系统-1号区', action: '启动', trigger: '定时任务', duration: '30分', operator: '系统自动' },
  { id: 'log-8', time: '2025-01-15 09:30:00', device: '加热器-3号棚', action: '停止', trigger: '温度回升', duration: '3小时', operator: '系统自动' },
  { id: 'log-9', time: '2025-01-15 08:00:00', device: 'CO2发生器', action: '启动', trigger: 'CO2 < 400ppm', duration: '8小时', operator: '系统自动' },
  { id: 'log-10', time: '2025-01-14 18:00:00', device: '灌溉系统-2号区', action: '启动', trigger: '定时任务', duration: '1小时', operator: '系统自动' },
  { id: 'log-11', time: '2025-01-14 16:30:00', device: '通风机-1号', action: '停止', trigger: '温度 < 25°C', duration: '4小时', operator: '系统自动' },
  { id: 'log-12', time: '2025-01-14 14:00:00', device: '遮阳帘-2号', action: '停止', trigger: '光照 < 60000 lux', duration: '6小时', operator: '系统自动' },
];

const statistics = { todayTotal: 9, autoControl: 12, manualControl: 0, avgDuration: '2小时15分' };

// 操作类型徽章映射
const actionMap: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  启动: { icon: <Play className="w-3 h-3" />, bg: 'bg-green-100', text: 'text-green-700', label: '启动' },
  停止: { icon: <Pause className="w-3 h-3" />, bg: 'bg-amber-100', text: 'text-amber-700', label: '停止' },
};

// 设备分类筛选（带"全部"）
const deviceCategories = ['全部', '通风机', '灌溉系统', '遮阳帘', '施肥系统', '加热器', '补光灯', 'CO2发生器'];

// 操作筛选（带"全部"）
const actionCategories = ['全部', '启动', '停止'];

// 设备分类 → 筛选关键字
const deviceToKeyword: Record<string, string> = {
  '通风机': '通风机',
  '灌溉系统': '灌溉',
  '遮阳帘': '遮阳',
  '施肥系统': '施肥',
  '加热器': '加热器',
  '补光灯': '补光灯',
  'CO2发生器': 'CO2',
};

export default function ControlLog() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('全部');
  const [actionFilter, setActionFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLogs = controlLogs.filter(log => {
    const matchSearch = searchKeyword === '' ||
      log.device.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      log.trigger.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchDevice = deviceFilter === '全部' || log.device.includes(deviceToKeyword[deviceFilter] || deviceFilter);
    const matchAction = actionFilter === '全部' || log.action === actionFilter;
    return matchSearch && matchDevice && matchAction;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="pt-0 px-6 pb-6">
      {/* 页面标题 — 大图标卡（与订单管理风格一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">控制日志</h1>
              <p className="text-gray-500 mt-1">控制操作记录查询</p>
            </div>
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
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: ScrollText, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '今日控制', value: statistics.todayTotal, valColor: 'text-gray-800' },
          { Icon: Settings, bg: 'bg-green-100', text: 'text-green-600', label: '自动控制', value: statistics.autoControl, valColor: 'text-green-600' },
          { Icon: Power, bg: 'bg-amber-100', text: 'text-amber-600', label: '手动控制', value: statistics.manualControl, valColor: 'text-amber-600' },
          { Icon: Clock, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均运行时长', value: statistics.avgDuration, valColor: 'text-cyan-600' },
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
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">设备：</span>
            <div className="flex gap-2 flex-wrap">
              {deviceCategories.map(device => (
                <button
                  key={device}
                  onClick={() => { setDeviceFilter(device); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deviceFilter === device
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {device}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索设备或触发条件..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-gray-600">操作：</span>
          <div className="flex gap-2">
            {actionCategories.map(action => (
              <button
                key={action}
                onClick={() => { setActionFilter(action); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  actionFilter === action
                    ? 'bg-[#2B5D3A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">触发条件</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">运行时长</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">操作者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedLogs.map(log => {
              const badge = actionMap[log.action];
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {log.time}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.device}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.icon}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.trigger}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.duration}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.operator}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredLogs.length} 条记录</p>
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
