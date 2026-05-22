import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Eye, Download, AlertTriangle, ArrowLeft, ChevronRight, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui';
import { enhancedApiClient } from '../lib/apiClient';

interface OperationLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  module: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  level?: string;
  errorMessage?: string;
  created_at: string;
}

interface LogStats {
  total: number;
  today: number;
  info: number;
  warning: number;
  error: number;
}

const EMPTY_STATS: LogStats = { total: 0, today: 0, info: 0, warning: 0, error: 0 };

export default function AuditLog() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [stats, setStats] = useState<LogStats>(EMPTY_STATS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取日志列表和统计数据
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));
      if (searchTerm) params.set('search', searchTerm);
      if (filterUser) params.set('username', filterUser);
      if (filterModule !== 'all') params.set('module', filterModule);
      if (filterLevel !== 'all') params.set('level', filterLevel);
      if (filterDate) params.set('start_date', filterDate);

      const [logsResult, statsResult] = await Promise.allSettled([
        enhancedApiClient.get<any>(`/operation-logs?${params.toString()}`, { useCache: false }),
        enhancedApiClient.get<any>('/operation-logs/stats/summary', { useCache: true }),
      ]);

      // 处理日志列表
      if (logsResult.status === 'fulfilled') {
        const data = logsResult.value;
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data && Array.isArray(data.data)) {
          setLogs(data.data);
          setTotalPages(data.meta?.totalPages || data.totalPages || 1);
        } else {
          setLogs([]);
        }
      } else {
        console.error('获取日志失败:', logsResult.reason);
        setLogs([]);
      }

      // 处理统计数据
      if (statsResult.status === 'fulfilled') {
        const data = statsResult.value;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setStats({
            total: data.total ?? 0,
            today: data.today ?? 0,
            info: data.info ?? 0,
            warning: data.warning ?? 0,
            error: data.error ?? 0,
          });
        }
      } else {
        console.error('获取统计失败:', statsResult.reason);
      }
    } catch (err) {
      console.error('AuditLog fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterUser, filterModule, filterLevel, filterDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 前端二次筛选
  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      !searchTerm ||
      (log.username && log.username.includes(searchTerm)) ||
      (log.description && log.description.includes(searchTerm)) ||
      (log.action && log.action.includes(searchTerm));
    const matchUser =
      !filterUser ||
      (log.username && log.username.includes(filterUser));
    return matchSearch && matchUser;
  });

  const modules = [...new Set(logs.map((l) => l.module).filter(Boolean))];

  const getLevelColor = (status: string | undefined) => {
    const level = status || 'info';
    switch (level) {
      case 'info':
      case 'success':
        return 'bg-blue-100 text-blue-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelLabel = (s: string | undefined) => {
    const map: Record<string, string> = { info: '信息', success: '信息', warning: '警告', error: '错误' };
    return map[s || 'info'] || s || '信息';
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('登录')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('CREATE') || action.includes('新建')) return 'bg-blue-100 text-blue-700';
    if (action.includes('UPDATE') || action.includes('编辑')) return 'bg-amber-100 text-amber-700';
    if (action.includes('DELETE') || action.includes('删除')) return 'bg-red-100 text-red-700';
    if (action.includes('APPROVE') || action.includes('审批')) return 'bg-purple-100 text-purple-700';
    if (action.includes('EXPORT') || action.includes('导出')) return 'bg-cyan-100 text-cyan-700';
    return 'bg-gray-100 text-gray-700';
  };

  const exportLogs = () => {
    const csv = [
      ['时间', '用户', '操作', '模块', '描述', 'IP', '级别'].join(','),
      ...filteredLogs
        .map((log) =>
          [
            log.created_at,
            log.username,
            log.action,
            log.module,
            log.description,
            log.ipAddress || '-',
            log.level || log.status || 'info',
          ].join(',')
        ),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
              <p className="text-gray-500">记录用户操作行为，用于安全审计与问题追溯</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '日志总数', value: stats.total, color: 'text-gray-900' },
          { label: '今日', value: stats.today, color: 'text-emerald-600' },
          { label: '信息', value: stats.info, color: 'text-blue-600' },
          { label: '警告', value: stats.warning, color: 'text-yellow-600' },
          { label: '错误', value: stats.error, color: 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 过滤栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="搜索日志..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </div>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}
              placeholder="搜索用户..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => { setFilterModule(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部模块</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filterLevel}
            onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部级别</option>
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button size="sm" onClick={fetchData}>
            刷新
          </Button>
          <Button size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4" />
            导出日志
          </Button>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            加载中...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            暂无日志数据
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">用户</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">模块</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">级别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 bg-white">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-medium">
                        {(log.username || 'S')[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-900">{log.username || '系统'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.module || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={log.description}>
                    {log.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(log.level || log.status)}`}>
                      {getLevelLabel(log.level || log.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 — 与生产计划表格一致 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { setCurrentPage(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredLogs.length} 条</span>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="ghost"
            size="icon"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{currentPage} / {totalPages || 1}</span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={currentPage >= totalPages}
            variant="ghost"
            size="icon"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 日志详情弹窗 */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">日志详情</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="时间" value={selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('zh-CN') : '-'} />
                <DetailField label="用户" value={selectedLog.username || '系统'} />
                <DetailField label="操作" value={selectedLog.action || '-'} />
                <DetailField label="模块" value={selectedLog.module || '-'} />
                <DetailField label="IP地址" value={selectedLog.ipAddress || '-'} />
                <div>
                  <p className="text-xs text-gray-500">级别</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${getLevelColor(selectedLog.level || selectedLog.status)}`}>
                    {getLevelLabel(selectedLog.level || selectedLog.status)}
                  </span>
                </div>
              </div>
              <DetailField label="描述" value={selectedLog.description || '-'} />
              {selectedLog.oldValue && (
                <div>
                  <p className="text-xs text-gray-500">原值</p>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs whitespace-pre-wrap">{selectedLog.oldValue}</pre>
                </div>
              )}
              {selectedLog.newValue && (
                <div>
                  <p className="text-xs text-gray-500">新值</p>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs whitespace-pre-wrap">{selectedLog.newValue}</pre>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 mt-1">{value}</p>
    </div>
  );
}
