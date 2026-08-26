/**
 * 控制日志 — 从 V1.3 100% 一致复制，path 适配 V1.1
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollText, Power, Search, RefreshCw, Home, ArrowLeft, Download, Clock, Play, Pause, Settings } from 'lucide-react';

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

const actionMap: Record<string, { icon: React.ReactNode; color: string }> = {
  启动: { icon: <Play size={14} />, color: 'text-green-600 bg-green-50' },
  停止: { icon: <Pause size={14} />, color: 'text-amber-600 bg-amber-50' },
};

export default function ControlLog() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const devices = ['全部', '通风机', '灌溉系统', '遮阳帘', '施肥系统', '加热器', '补光灯', 'CO2发生器'];

  const filteredLogs = controlLogs.filter(log => {
    const matchSearch = log.device.toLowerCase().includes(searchKeyword.toLowerCase()) || log.trigger.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchDevice = deviceFilter === 'all' || log.device.includes(deviceFilter);
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchDevice && matchAction;
  });

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/smart-center')} className="p-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">控制日志</h1>
            <p className="text-gray-500 mt-1">控制操作记录查询</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#6366F1] hover:bg-gray-50 rounded-lg transition-colors">
          <Home className="w-5 h-5" /><span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { Icon: ScrollText, bg: 'bg-indigo-100', text: 'text-indigo-600', label: '今日控制', value: statistics.todayTotal, valColor: 'text-gray-800' },
          { Icon: Settings, bg: 'bg-green-100', text: 'text-green-600', label: '自动控制', value: statistics.autoControl, valColor: 'text-green-600' },
          { Icon: Power, bg: 'bg-amber-100', text: 'text-amber-600', label: '手动控制', value: statistics.manualControl, valColor: 'text-amber-600' },
          { Icon: Clock, bg: 'bg-cyan-100', text: 'text-cyan-600', label: '平均运行时长', value: statistics.avgDuration, valColor: 'text-cyan-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}><card.Icon className={`w-5 h-5 ${card.text}`} /></div>
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
              <input type="text" placeholder="搜索设备或触发条件..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent" />
            </div>
          </div>
          <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            {devices.map(device => (<option key={device} value={device === '全部' ? 'all' : device}>{device}</option>))}
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent">
            <option value="all">全部操作</option><option value="启动">启动</option><option value="停止">停止</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={16} />刷新</button>
          <button onClick={() => alert('正在导出控制日志...')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Download size={16} />导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">触发条件</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">运行时长</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作者</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500"><div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" />{log.time}</div></td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.device}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${actionMap[log.action]?.color}`}>
                    {actionMap[log.action]?.icon}{log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.trigger}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.duration}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{log.operator}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLogs.length)} 条，共 {filteredLogs.length} 条</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded ${currentPage === page ? 'bg-[#6366F1] text-white' : 'border hover:bg-gray-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}