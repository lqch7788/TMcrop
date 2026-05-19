/**
 * 工程调试页面 — iAGS ProjectDebug 集成
 * HMI版本查询、数据库测试、系统诊断工具
 * Phase 6 完整实现
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bug, Server, Database, Cpu, Clock, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Terminal } from 'lucide-react';
import { enhancedApiClient } from '../../lib/apiClient';

const API_BASE = '/api/debug';

export default function ProjectDebugManagement() {
  // HMI / 诊断状态
  const [hmi, setHmi] = useState<any>(null);
  const [diag, setDiag] = useState<any>(null);
  const [dbTestResult, setDbTestResult] = useState<{ status: string; duration: number } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState({ hmi: false, diag: false, db: false, logs: false });

  // 加载函数
  const fetchHmi = useCallback(async () => {
    setLoading(l => ({ ...l, hmi: true }));
    try { const r = await enhancedApiClient.get<{ success: boolean; data: any }>(`${API_BASE}/hmi`); setHmi(r.data); } catch (e) {}
    setLoading(l => ({ ...l, hmi: false }));
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(l => ({ ...l, diag: true }));
    try { const r = await enhancedApiClient.get<{ success: boolean; data: any }>(`${API_BASE}/diagnostics`); setDiag(r.data); } catch (e) {}
    setLoading(l => ({ ...l, diag: false }));
  }, []);

  const testDb = useCallback(async () => {
    setLoading(l => ({ ...l, db: true }));
    setDbTestResult(null);
    try { const r = await enhancedApiClient.post<{ success: boolean; data: any }>(`${API_BASE}/db-test`, {}); setDbTestResult(r.data); } catch (e) { setDbTestResult({ status: '失败', duration: 0 }); }
    setLoading(l => ({ ...l, db: false }));
    setTimeout(() => fetchLogs(), 500);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(l => ({ ...l, logs: true }));
    try { const r = await enhancedApiClient.get<{ success: boolean; data: any[] }>(`${API_BASE}/logs`); setLogs(Array.isArray(r.data) ? r.data : []); } catch (e) {}
    setLoading(l => ({ ...l, logs: false }));
  }, []);

  const clearLogs = useCallback(async () => {
    try { await enhancedApiClient.delete(`${API_BASE}/logs`); setLogs([]); } catch (e) {}
  }, []);

  useEffect(() => { fetchHmi(); fetchDiagnostics(); fetchLogs(); }, [fetchHmi, fetchDiagnostics, fetchLogs]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="p-2 bg-emerald-100 rounded-lg"><Bug className="w-6 h-6 text-emerald-600" /></div>
        <div><h1 className="text-xl font-semibold text-gray-900">工程调试</h1><p className="text-sm text-gray-500">HMI版本查询、数据库连接测试和系统诊断工具</p></div>
      </div>

      {/* 工具卡片网格 */}
      <div className="grid grid-cols-2 gap-4">
        {/* HMI 版本 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Server className="w-5 h-5 text-emerald-600" /><h3 className="font-semibold text-gray-900">HMI 版本信息</h3></div>
            <button onClick={fetchHmi} disabled={loading.hmi} className="p-1 hover:bg-gray-100 rounded"><RefreshCw className={`w-4 h-4 ${loading.hmi ? 'animate-spin text-emerald-500' : 'text-gray-400'}`} /></button>
          </div>
          {hmi ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">版本</span><span className="font-mono text-gray-900">{hmi.version}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">构建日期</span><span className="text-gray-900">{hmi.buildDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Node.js</span><span className="font-mono text-gray-600">{hmi.nodeVersion}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">平台</span><span className="text-gray-600">{hmi.platform} ({hmi.arch})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">进程 PID</span><span className="font-mono text-gray-600">{hmi.pid}</span></div>
            </div>
          ) : <div className="py-4 text-center text-sm text-gray-400">点击刷新加载版本信息</div>}
        </div>

        {/* 系统诊断 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Cpu className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">系统诊断</h3></div>
            <button onClick={fetchDiagnostics} disabled={loading.diag} className="p-1 hover:bg-gray-100 rounded"><RefreshCw className={`w-4 h-4 ${loading.diag ? 'animate-spin text-emerald-500' : 'text-gray-400'}`} /></button>
          </div>
          {diag ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">数据库表数</span><span className="font-semibold text-gray-900">{diag.database?.tableCount || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">堆内存使用</span><span className="text-gray-900">{diag.memory?.heapUsed || 0} / {diag.memory?.heapTotal || 0} MB</span></div>
              <div className="flex justify-between"><span className="text-gray-500">运行时间</span>
                <span className="text-gray-600">{diag.uptime ? `${Math.floor(diag.uptime / 3600)}h ${Math.floor((diag.uptime % 3600) / 60)}m` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">诊断时间</span><span className="text-gray-600 text-xs">{diag.timestamp ? new Date(diag.timestamp).toLocaleString('zh-CN') : '-'}</span></div>
              {/* 表行数概览 */}
              {diag.database?.tableRows && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">表行数概览 (Top 8)</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(diag.database.tableRows as Record<string,number>).slice(0,8).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-xs"><span className="text-gray-500 truncate max-w-[120px]">{name}</span><span className="font-mono text-gray-700">{count}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <div className="py-4 text-center text-sm text-gray-400">点击刷新加载诊断数据</div>}
        </div>

        {/* 数据库测试 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Database className="w-5 h-5 text-purple-600" /><h3 className="font-semibold text-gray-900">数据库连接测试</h3></div>
          </div>
          <div className="py-3 text-center">
            {dbTestResult ? (
              <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${dbTestResult.status === '连接正常' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {dbTestResult.status === '连接正常' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-medium">{dbTestResult.status}</span>
                {dbTestResult.duration > 0 && <span className="text-xs text-gray-500 ml-2">({dbTestResult.duration}ms)</span>}
              </div>
            ) : <p className="text-sm text-gray-400">点击按钮测试数据库连接</p>}
            <button onClick={testDb} disabled={loading.db}
              className="mt-3 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center gap-2 mx-auto">
              {loading.db ? <><Loader2 className="w-4 h-4 animate-spin" /> 测试中...</> : <><Database className="w-4 h-4" /> 开始测试</>}
            </button>
          </div>
        </div>

        {/* 运行时间 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-orange-600" /><h3 className="font-semibold text-gray-900">服务状态</h3></div>
          {diag ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> 运行中</span>
                <span className="text-sm text-gray-500">已运行 {diag.uptime ? `${Math.floor(diag.uptime / 3600)}小时${Math.floor((diag.uptime % 3600) / 60)}分钟` : '-'}</span>
              </div>
              <div className="text-xs text-gray-400">
                <p>进程 PID: {diag.hmi?.pid || '-'}</p>
                <p>Node.js: {diag.hmi?.nodeVersion || '-'}</p>
              </div>
            </div>
          ) : <div className="py-4 text-center text-sm text-gray-400">加载中...</div>}
        </div>
      </div>

      {/* 调试日志 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Terminal className="w-5 h-5 text-gray-500" /> 调试日志 {logs.length > 0 && <span className="text-sm text-gray-400 font-normal">({logs.length})</span>}</h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchLogs} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-3.5 h-3.5" /> 刷新</button>
            {logs.length > 0 && <button onClick={clearLogs} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> 清空</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50"><th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 w-24">类型</th><th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500">测试目标</th><th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 w-24">结果</th><th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 w-20">耗时</th><th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 w-40">时间</th></tr></thead>
            <tbody>
              {loading.logs ? <tr><td colSpan={5} className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr> :
               logs.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">暂无调试日志</td></tr> :
               logs.map((log, i) => (
                <tr key={log.oid || i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-4"><span className="inline-flex px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700">{log.debug_type}</span></td>
                  <td className="py-2 px-4 text-gray-600">{log.test_target || '-'}</td>
                  <td className="py-2 px-4"><span className={`text-xs font-medium ${log.test_result === 'SUCCESS' ? 'text-green-600' : log.test_result === 'FAILED' ? 'text-red-600' : 'text-gray-600'}`}>{log.test_result || '-'}</span></td>
                  <td className="py-2 px-4 text-gray-500">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                  <td className="py-2 px-4 text-gray-400 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
