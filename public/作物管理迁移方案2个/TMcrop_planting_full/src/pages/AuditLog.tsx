import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Eye, Download, AlertTriangle, ChevronLeft } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  description: string;
  ip: string;
  level: 'info' | 'warning' | 'error';
  details?: Record<string, string>;
}

const STORAGE_KEY = 'audit_log_data';

const DEFAULT_LOGS: AuditLog[] = [
  { id: '1', timestamp: '2024-03-15 10:30:45', user: 'admin', action: 'LOGIN', module: '系统', description: '用户登录系统', ip: '192.168.1.100', level: 'info' },
  { id: '2', timestamp: '2024-03-15 10:32:12', user: 'admin', action: 'CREATE', module: '生产计划', description: '创建生产计划 #P2024001', ip: '192.168.1.100', level: 'info' },
  { id: '3', timestamp: '2024-03-15 10:35:28', user: '张三', action: 'UPDATE', module: '物料管理', description: '更新物料 #M001 库存数量', ip: '192.168.1.101', level: 'info' },
  { id: '4', timestamp: '2024-03-15 10:40:15', user: 'system', action: 'ALERT', module: '环境监控', description: '温室温度超过阈值：32°C > 30°C', ip: '-', level: 'warning' },
  { id: '5', timestamp: '2024-03-15 10:42:30', user: '李四', action: 'APPROVE', module: '审批', description: '通过审批 #A2024001', ip: '192.168.1.102', level: 'info' },
  { id: '6', timestamp: '2024-03-15 10:45:00', user: 'system', action: 'ERROR', module: '设备', description: '灌溉控制器连接失败', ip: '-', level: 'error' },
  { id: '7', timestamp: '2024-03-15 10:50:22', user: 'admin', action: 'DELETE', module: '任务', description: '删除任务 #T001', ip: '192.168.1.100', level: 'warning' },
  { id: '8', timestamp: '2024-03-15 10:55:10', user: '王五', action: 'EXPORT', module: '报表', description: '导出生产报表', ip: '192.168.1.103', level: 'info' },
];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLogs(JSON.parse(saved));
    } else {
      setLogs(DEFAULT_LOGS);
    }
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.user.includes(searchTerm) || log.description.includes(searchTerm) || log.action.includes(searchTerm);
    const matchModule = filterModule === 'all' || log.module === filterModule;
    const matchLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchDate = !filterDate || log.timestamp.startsWith(filterDate);
    return matchSearch && matchModule && matchLevel && matchDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const exportLogs = () => {
    const csv = [
      ['时间', '用户', '操作', '模块', '描述', 'IP', '级别'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp, log.user, log.action, log.module, log.description, log.ip, log.level
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const modules = [...new Set(logs.map(l => l.module))];
  const stats = {
    total: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'bg-blue-100 text-blue-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelLabel = (level: string) => {
    const map = { info: '信息', warning: '警告', error: '错误' };
    return map[level] || level;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">日志总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
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
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索日志..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">全部模块</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">全部级别</option>
          <option value="info">信息</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            {paginatedLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-medium">
                      {log.user[0]}
                    </div>
                    <span className="text-sm text-gray-900">{log.user}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{log.action}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.module}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{log.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(log.level)}`}>
                    {getLevelLabel(log.level)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <button onClick={() => viewLogDetails(log)} className="p-1.5 hover:bg-gray-100 rounded">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">共 {filteredLogs.length} 条记录，第 {currentPage} / {totalPages} 页</p>
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
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">用户</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.user}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">操作</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">模块</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">IP地址</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.ip}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">级别</p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(selectedLog.level)}`}>
                      {getLevelLabel(selectedLog.level)}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">描述</p>
                <p className="text-sm text-gray-900 mt-1">{selectedLog.description}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <p className="text-xs text-gray-500">详细信息</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
