/**
 * 设备监控中心 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 * 2026-08-29：接入 API，对接 monitoring_devices 表（替换原 mockData）
 */
import { useState, useEffect } from 'react';
import {
  Search, Power, Wifi, XCircle, CheckCircle, AlertCircle, Calendar, FileText,
  Monitor, Loader2,
} from 'lucide-react';
import { useMonitoringDeviceStore, type MonitoringDevice, type MonitoringDeviceStatus } from '@/stores';

// 状态筛选（与表格徽章标签一一对应）
const STATUS_OPTIONS = [
  { value: '全部', key: undefined as MonitoringDeviceStatus | undefined },
  { value: '运行中', key: 'running' as MonitoringDeviceStatus },
  { value: '待机', key: 'idle' as MonitoringDeviceStatus },
  { value: '离线', key: 'offline' as MonitoringDeviceStatus },
];

// 状态值 → 中文显示
const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  idle: '待机',
  offline: '离线',
};

export default function DeviceMonitor() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Zustand Store（V2.1 铁律：纯内存，无 IndexedDB / localStorage / persist）
  const devices = useMonitoringDeviceStore((s) => s.devices);
  const loading = useMonitoringDeviceStore((s) => s.loading);
  const error = useMonitoringDeviceStore((s) => s.error);
  const fetchDevices = useMonitoringDeviceStore((s) => s.fetchDevices);

  // 进入页面拉数据（store 内部 10 分钟缓存）
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // 前端筛选（搜索 + 状态）
  const filteredDevices = devices.filter((device: MonitoringDevice) => {
    const matchSearch = !searchKeyword ||
      device.deviceCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.deviceName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.deviceType.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      device.location.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === '全部' || STATUS_LABEL[device.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 统计（从 devices 实时计算，不再写死）
  const stats = {
    running: devices.filter(d => d.status === 'running').length,
    idle: devices.filter(d => d.status === 'idle').length,
    offline: devices.filter(d => d.status === 'offline').length,
    // 告警统计：在线=离线状态设备数（离线即告警）
    alert: devices.filter(d => d.status === 'offline').length,
  };

  // 运行状态徽章
  const getRunStatusBadge = (status: MonitoringDeviceStatus) => {
    switch (status) {
      case 'running': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
      case 'idle': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
      case 'offline': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Power className="w-3 h-3" /> };
    }
  };

  // 在线状态徽章
  const getOnlineBadge = (online: boolean) => {
    return online
      ? { bg: 'bg-green-100', text: 'text-green-700', icon: <Wifi className="w-3 h-3" />, label: '在线' }
      : { bg: 'bg-red-100', text: 'text-red-700', icon: <Wifi className="w-3 h-3" />, label: '离线' };
  };

  return (
    <div className="pt-0 px-6 pb-6 space-y-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">设备监控中心</h1>
              <p className="text-gray-500 mt-1">实时监控温室各类设备运行状态</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片（实时从 devices 计算） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Power className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">运行中</p>
              <p className="text-xl font-bold text-gray-800">{stats.running}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待机</p>
              <p className="text-xl font-bold text-gray-800">{stats.idle}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">离线</p>
              <p className="text-xl font-bold text-gray-800">{stats.offline}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">告警</p>
              <p className="text-xl font-bold text-gray-800">{stats.alert}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === opt.value
                      ? 'bg-[#2B5D3A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.value}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">设备类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">安装位置</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">运行状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">在线状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">最后更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* 加载中 */}
            {loading && devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-[#2B5D3A] mx-auto mb-3 animate-spin" />
                  <p className="text-gray-500">加载中...</p>
                </td>
              </tr>
            )}
            {/* 错误 */}
            {error && devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-1">设备数据加载失败</p>
                  <p className="text-gray-500 text-sm">{error}</p>
                </td>
              </tr>
            )}
            {/* 数据 */}
            {!loading && !error && paginatedDevices.map(device => {
              const runBadge = getRunStatusBadge(device.status);
              const onlineBadge = getOnlineBadge(device.online);
              return (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{device.deviceCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{device.deviceName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.deviceType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.location}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${runBadge.bg} ${runBadge.text}`}>
                      {runBadge.icon}
                      {STATUS_LABEL[device.status] || device.status}
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

        {!loading && !error && filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
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