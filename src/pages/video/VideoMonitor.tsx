/**
 * 视频监控中心 — 表格 UI 与设备监控中心（DeviceMonitor）100% 一致
 */
import { useState } from 'react';
import {
  Search, Plus, Download, Video, Power, Wifi, XCircle, CheckCircle, AlertCircle, Calendar,
  Camera, Monitor,
} from 'lucide-react';

const deviceData = [
  { id: 'V001', name: '温室1号球机', type: '球机', location: '1号温室-A区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 1 },
  { id: 'V002', name: '温室1号枪机', type: '枪机', location: '1号温室-B区', status: '运行中', online: true, lastUpdate: '2026-03-14 10:28', channel: 2 },
  { id: 'V003', name: '温室2号球机', type: '球机', location: '2号温室', status: '待机', online: true, lastUpdate: '2026-03-14 10:30', channel: 3 },
  { id: 'V004', name: '大棚1号枪机', type: '枪机', location: '1号大棚', status: '离线', online: false, lastUpdate: '2026-03-14 09:15', channel: 4 },
  { id: 'V005', name: '大棚2号球机', type: '球机', location: '2号大棚', status: '运行中', online: true, lastUpdate: '2026-03-14 10:29', channel: 5 },
  { id: 'V006', name: '办公区球机', type: '球机', location: '办公楼', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 6 },
  { id: 'V007', name: '仓库枪机', type: '枪机', location: '仓库', status: '告警', online: true, lastUpdate: '2026-03-14 10:25', channel: 7 },
  { id: 'V008', name: '大门口球机', type: '球机', location: '大门口', status: '运行中', online: true, lastUpdate: '2026-03-14 10:30', channel: 8 },
];

// 状态筛选（与表格徽章标签一一对应）
const statuses = ['全部', '运行中', '待机', '告警', '离线'];

export default function VideoMonitor() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredDevices = deviceData.filter(device => {
    const matchSearch = !searchKeyword ||
      device.id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.type.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === '全部' || device.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 运行状态徽章（与 DeviceMonitor 一致：带 icon）
  const getRunStatusBadge = (status: string) => {
    switch (status) {
      case '运行中': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
      case '待机': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
      case '告警': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3" /> };
      case '离线': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
    }
  };

  // 在线状态徽章（与 DeviceMonitor 一致）
  const getOnlineBadge = (online: boolean) => {
    return online
      ? { bg: 'bg-green-100', text: 'text-green-700', icon: <Wifi className="w-3 h-3" />, label: '在线' }
      : { bg: 'bg-red-100', text: 'text-red-700', icon: <Wifi className="w-3 h-3" />, label: '离线' };
  };

  // 统计卡片（与 DeviceMonitor 完全一致）
  const stats = [
    { icon: <Power className="w-5 h-5 text-green-600" />, bg: 'bg-green-100', label: '运行中', value: deviceData.filter(d => d.status === '运行中').length },
    { icon: <Wifi className="w-5 h-5 text-gray-600" />, bg: 'bg-gray-100', label: '待机', value: deviceData.filter(d => d.status === '待机').length },
    { icon: <XCircle className="w-5 h-5 text-red-600" />, bg: 'bg-red-100', label: '离线', value: deviceData.filter(d => d.status === '离线').length },
    { icon: <AlertCircle className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-100', label: '告警', value: deviceData.filter(d => d.status === '告警').length },
  ];

  return (
    <div className="pt-0 px-6 pb-6 space-y-6">
      {/* 页面标题 - 带大图标卡（与 DeviceMonitor 一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">视频监控中心</h1>
              <p className="text-gray-500 mt-1">实时监控全场视频设备运行状态</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出
            </button>
            <button className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg text-sm font-medium hover:bg-[#245038] transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> 添加设备
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片（与 DeviceMonitor 完全一致：bg-100/600 + text-xl + label 在上） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选区域（与 DeviceMonitor 完全一致：pill + 搜索框） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2 flex-wrap">
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
              placeholder="搜索设备ID、名称、类型或位置..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
            />
          </div>
        </div>
      </div>

      {/* 数据表格（与 DeviceMonitor 完全一致：蓝渐变白字表头 + 徽章） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备名称</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">安装位置</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">通道号</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">运行状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">在线状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最后更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedDevices.map(device => {
              const runBadge = getRunStatusBadge(device.status);
              const onlineBadge = getOnlineBadge(device.online);
              return (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{device.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{device.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">CH-{device.channel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${runBadge.bg} ${runBadge.text}`}>
                      {runBadge.icon}
                      {device.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${onlineBadge.bg} ${onlineBadge.text}`}>
                      {onlineBadge.icon}
                      {onlineBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{device.lastUpdate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页（与 DeviceMonitor 完全一致：共 X 条 + 每页选择器 + 上一页/页码/下一页） */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredDevices.length} 条记录</p>
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
