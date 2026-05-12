import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Eye, Download, AlertTriangle, ChevronLeft } from 'lucide-react';
import {
  getOperationLogs,
  getOperationLogStats,
  OperationLog,
  OperationLogStats,
} from '../services/apiOperationLogService';

export default function AuditLog() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [stats, setStats] = useState<OperationLogStats>({ total: 0, today: 0, info: 0, warning: 0, error: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  // 获取日志列表
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getOperationLogs({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        module: filterModule !== 'all' ? filterModule : undefined,
        level: filterLevel !== 'all' ? filterLevel : undefined,
        startDate: filterDate || undefined,
      });

      setLogs(result.data);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterModule, filterLevel, filterDate]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const data = await getOperationLogStats();
      setStats(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // 筛选后的日志（前端再做一次筛选，因为API可能没有返回所有数据）
  const filteredLogs = logs.filter(log => {
    const matchSearch = !searchTerm ||
      (log.username && log.username.includes(searchTerm)) ||
      (log.description && log.description.includes(searchTerm)) ||
      (log.action && log.action.includes(searchTerm));
    return matchSearch;
  });

  const viewLogDetails = (log: OperationLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const exportLogs = () => {
    const csv = [
      ['时间', '用户', '操作', '模块', '描述', 'IP', '级别'].join(','),
      ...filteredLogs.map(log => [
        log.created_at, log.username, log.action, log.module, log.description, log.ip_address || '-', log.status || log.level || 'info'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))];

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

  const getLevelLabel = (status: string | undefined) => {
    const map: Record<string, string> = {
      info: '信息',
      success: '信息',
      warning: '警告',
      error: '错误'
    };
    return map[status || 'info'] || status || '信息';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">操作日志审计</h2>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          导出日志
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">日志总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">今日</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.today}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-blue-600">信息</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.info}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-yellow-600">警告</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.warning}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-red-600">错误</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.error}</p>
        </div>
      </div>

      {/* 过滤 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="搜索日志..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
          />
        </div>
        <select
          value={filterModule}
          onChange={(e) => {
            setFilterModule(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">全部模块</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => {
            setFilterLevel(e.target.value);
            setCurrentPage(1);
          }}
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
          onChange={(e) => {
            setFilterDate(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => fetchLogs()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          刷新
        </button>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无日志数据</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-medium">
                        {(log.username || 'S')[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-900">{log.username || '系统'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.module || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.description}>
                    {log.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(log.status || log.level)}`}>
                      {getLevelLabel(log.status || log.level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => viewLogDetails(log)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="查看详情"
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

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {filteredLogs.length} 条记录，第 {currentPage} / {totalPages} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 日志详情弹窗 */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">日志详情</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">时间</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('zh-CN') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">用户</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.username || '系统'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">操作</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.action || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">模块</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.module || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">IP地址</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">级别</p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(selectedLog.status || selectedLog.level)}`}>
                      {getLevelLabel(selectedLog.status || selectedLog.level)}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">描述</p>
                <p className="text-sm text-gray-900 mt-1">{selectedLog.description || '-'}</p>
              </div>
              {selectedLog.old_value && (
                <div>
                  <p className="text-xs text-gray-500">原值</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{selectedLog.old_value}</pre>
                  </div>
                </div>
              )}
              {selectedLog.new_value && (
                <div>
                  <p className="text-xs text-gray-500">新值</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{selectedLog.new_value}</pre>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
