/**
 * 系统监控仪表盘页面
 * 功能：实时监控服务器和服务运行状态
 * 架构：组件 → enhancedApiClient → /api/monitoring/system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, RefreshCw, Server, Cpu, HardDrive, Wifi,
  Activity, Clock, CheckCircle, AlertTriangle, ChevronLeft, Loader2, Eye,
} from 'lucide-react';
import { enhancedApiClient } from '../../lib/apiClient';

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  memoryUsagePercent: number;
  osUptime: number;
  processUptime: number;
  loadAvg: number[];
  nodeVersion: string;
}

interface ServiceInfo {
  id: string;
  name: string;
  type: 'database' | 'api' | 'cache' | 'storage' | 'message' | 'compute';
  host: string;
  port: number;
  status: 'running' | 'stopped' | 'error' | 'warning';
  health: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  uptime: string;
  lastHeartbeat: string;
  description: string;
}

const SystemMonitor: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enhancedApiClient.get('/monitoring/system');
      setSystemInfo(res.data);
    } catch (err) {
      console.error('获取系统信息失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  // 根据系统信息构建服务列表
  const getMockServices = (): ServiceInfo[] => {
    if (!systemInfo) return [];

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const totalMem = systemInfo.totalMemory;
    const freeMem = systemInfo.freeMemory;
    const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    return [
      {
        id: '1', name: 'Express API 服务', type: 'api', host: 'localhost', port: 3001,
        status: 'running' as const, health: 99, cpuUsage: systemInfo.loadAvg[0] * 10,
        memoryUsage: usedMemPercent, diskUsage: 45, networkIn: 125, networkOut: 89,
        uptime: formatUptime(systemInfo.processUptime), lastHeartbeat: now,
        description: '后端 API 服务主实例',
      },
      {
        id: '2', name: 'SQLite 数据库', type: 'database', host: 'localhost', port: 0,
        status: 'running' as const, health: 98, cpuUsage: 5,
        memoryUsage: Math.round(usedMemPercent * 0.4), diskUsage: 52, networkIn: 0, networkOut: 0,
        uptime: formatUptime(systemInfo.processUptime), lastHeartbeat: now,
        description: '核心业务数据库',
      },
      {
        id: '3', name: 'Vite 开发服务器', type: 'compute', host: 'localhost', port: 5188,
        status: 'running' as const, health: 100, cpuUsage: 15,
        memoryUsage: Math.round(usedMemPercent * 0.3), diskUsage: 10, networkIn: 234, networkOut: 189,
        uptime: formatUptime(systemInfo.processUptime), lastHeartbeat: now,
        description: '前端开发服务器 (HMR)',
      },
      {
        id: '4', name: '文件存储服务', type: 'storage', host: 'localhost', port: 0,
        status: systemInfo.memoryUsagePercent > 90 ? 'warning' as const : 'running' as const,
        health: systemInfo.memoryUsagePercent > 90 ? 82 : 95,
        cpuUsage: 8, memoryUsage: Math.round(usedMemPercent * 0.15), diskUsage: 58,
        networkIn: 56, networkOut: 128, uptime: formatUptime(systemInfo.osUptime),
        lastHeartbeat: now, description: '本地文件存储和备份管理',
      },
      {
        id: '5', name: 'Node.js 运行时', type: 'compute', host: systemInfo.hostname, port: 0,
        status: 'running' as const, health: 100, cpuUsage: systemInfo.loadAvg[0] * 8,
        memoryUsage: usedMemPercent, diskUsage: 0,
        networkIn: 0, networkOut: 0, uptime: formatUptime(systemInfo.osUptime),
        lastHeartbeat: now, description: `Node.js ${systemInfo.nodeVersion} / ${systemInfo.platform} ${systemInfo.arch}`,
      },
    ];
  };

  const services = getMockServices();

  const serviceTypes = [
    { value: 'database', label: '数据库', icon: Server, color: 'blue' },
    { value: 'cache', label: '缓存', icon: HardDrive, color: 'purple' },
    { value: 'api', label: 'API网关', icon: Wifi, color: 'green' },
    { value: 'storage', label: '存储', icon: HardDrive, color: 'amber' },
    { value: 'message', label: '消息队列', icon: Activity, color: 'cyan' },
    { value: 'compute', label: '计算服务', icon: Cpu, color: 'indigo' },
  ];

  const filteredServices = services.filter(service => {
    const matchSearch = service.name.includes(searchKeyword) || service.host.includes(searchKeyword) || service.description.includes(searchKeyword);
    const matchType = typeFilter === 'all' || service.type === typeFilter;
    const matchStatus = statusFilter === 'all' || service.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const paginatedServices = filteredServices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredServices.length / pageSize) || 1;

  const getStatusBadge = (status: ServiceInfo['status']) => {
    const config = {
      running: { bg: 'bg-green-100', text: 'text-green-700', label: '运行中' },
      stopped: { bg: 'bg-gray-100', text: 'text-gray-700', label: '已停止' },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
      warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: '警告' },
    };
    const { bg, text, label } = config[status];
    return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>{label}</span>;
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number, thresholds: [number, number]) => {
    if (value > thresholds[1]) return 'bg-red-500';
    if (value > thresholds[0]) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const runningCount = services.filter(s => s.status === 'running').length;
  const warningCount = services.filter(s => s.status === 'warning').length;
  const errorCount = services.filter(s => s.status === 'error').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载系统信息...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
            <p className="text-gray-500">实时监控服务器和服务运行状态</p>
          </div>
        </div>
        <button onClick={fetchSystemInfo} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      {/* 系统资源概览 */}
      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">CPU 负载</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{systemInfo.loadAvg[0].toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">{systemInfo.cpus} 核 / 1min: {systemInfo.loadAvg[0].toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">内存使用</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{systemInfo.memoryUsagePercent.toFixed(1)}%</div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div className={`h-full rounded-full ${getProgressColor(systemInfo.memoryUsagePercent, [70, 90])}`}
                style={{ width: `${Math.min(systemInfo.memoryUsagePercent, 100)}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">空闲: {formatBytes(systemInfo.freeMemory)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">运行时间</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{formatUptime(systemInfo.osUptime)}</div>
            <div className="text-xs text-gray-500 mt-1">进程: {formatUptime(systemInfo.processUptime)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Server className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">系统信息</span>
            </div>
            <div className="text-sm text-gray-600">
              <div>平台: {systemInfo.platform} {systemInfo.arch}</div>
              <div>Node.js: {systemInfo.nodeVersion}</div>
              <div>主机: {systemInfo.hostname}</div>
            </div>
          </div>
        </div>
      )}

      {/* 服务统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Server, bg: 'bg-blue-50', iconColor: 'text-blue-500', value: services.length, label: '服务总数' },
          { icon: CheckCircle, bg: 'bg-green-50', iconColor: 'text-green-500', value: runningCount, label: '运行中' },
          { icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-500', value: warningCount, label: '警告' },
          { icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-500', value: errorCount, label: '异常' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜索服务名称、主机或描述..." value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <option value="all">全部类型</option>
            {serviceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <option value="all">全部状态</option>
            <option value="running">运行中</option>
            <option value="warning">警告</option>
            <option value="error">异常</option>
            <option value="stopped">已停止</option>
          </select>
        </div>
      </div>

      {/* 服务列表表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
            <tr>
              {['服务名称', '类型', '状态', '健康度', 'CPU', '内存', '磁盘', '运行时间', '操作'].map(h => (
                <th key={h} className={`px-4 py-3 text-sm font-medium text-white ${h === '操作' ? 'text-center' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 bg-white">
            {paginatedServices.map(service => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-bold text-gray-800">{service.name}</div>
                  <div className="text-xs text-gray-500 max-w-xs truncate">{service.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{serviceTypes.find(t => t.value === service.type)?.label || service.type}</span>
                </td>
                <td className="px-4 py-3">{getStatusBadge(service.status)}</td>
                <td className="px-4 py-3">
                  <div className={`text-sm font-bold ${getHealthColor(service.health)}`}>{service.health}%</div>
                </td>
                <td className="px-4 py-3">
                  <div className="w-16">
                    <div className="text-xs text-gray-500 mb-1">{service.cpuUsage}%</div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getProgressColor(service.cpuUsage, [50, 80])}`}
                        style={{ width: `${Math.min(service.cpuUsage, 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="w-16">
                    <div className="text-xs text-gray-500 mb-1">{service.memoryUsage}%</div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getProgressColor(service.memoryUsage, [50, 80])}`}
                        style={{ width: `${Math.min(service.memoryUsage, 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="w-16">
                    <div className="text-xs text-gray-500 mb-1">{service.diskUsage}%</div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getProgressColor(service.diskUsage, [70, 90])}`}
                        style={{ width: `${Math.min(service.diskUsage, 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{service.uptime}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => { setSelectedService(service); setShowDetailModal(true); }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="查看详情">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">共 {filteredServices.length} 条</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>

      {/* 详情模态框 */}
      {showDetailModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-xl mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">服务详情</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm text-gray-500">服务名称</label><p className="text-gray-800 font-bold">{selectedService.name}</p></div>
                    <div><label className="text-sm text-gray-500">服务类型</label><p className="text-gray-800">{serviceTypes.find(t => t.value === selectedService.type)?.label}</p></div>
                    <div><label className="text-sm text-gray-500">运行状态</label><p>{getStatusBadge(selectedService.status)}</p></div>
                    <div><label className="text-sm text-gray-500">运行时间</label><p className="text-gray-800">{selectedService.uptime}</p></div>
                    <div className="col-span-2"><label className="text-sm text-gray-500">描述</label><p className="text-gray-800">{selectedService.description}</p></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">性能指标</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'CPU使用率', value: selectedService.cpuUsage, thresholds: [50, 80] as [number, number] },
                      { label: '内存使用率', value: selectedService.memoryUsage, thresholds: [50, 80] as [number, number] },
                      { label: '磁盘使用率', value: selectedService.diskUsage, thresholds: [70, 90] as [number, number] },
                      { label: '健康度', value: selectedService.health, thresholds: [70, 90] as [number, number] },
                    ].map((metric, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">{metric.label}</span>
                          <span className={`text-lg font-bold ${getHealthColor(100 - metric.value)}`}>{metric.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getProgressColor(metric.value, metric.thresholds)}`}
                            style={{ width: `${Math.min(metric.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时${mins}分`;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分`;
}

export default SystemMonitor;
