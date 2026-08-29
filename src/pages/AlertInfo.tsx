/**
 * 预警信息中心 — 表格 UI 与订单管理（market/OrderManagement）保持一致
 * 2026-08-28：导出按钮从顶部卡片移到统计卡片行右侧，按钮 UI 用项目 @/components/ui/Button，
 *           导出逻辑用项目标准 @/services/exporters（csv/xlsx/word），弹窗用 ExportFormatModal
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Search, Download, AlertTriangle, Thermometer, Info, CheckCircle,
  XCircle, Clock, Eye, Edit, Trash2, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import { todayLocal } from '@/lib/dateUtils';
import { useIotAlertStore, STATUS_LABEL as ALERT_STATUS_LABEL, type IotAlert } from '@/stores';

// 状态筛选（与表格徽章标签一一对应）
const STATUS_OPTIONS = [
  { label: '全部', value: '全部' },
  { label: ALERT_STATUS_LABEL.pending, value: 'pending' },
  { label: ALERT_STATUS_LABEL.processing, value: 'processing' },
  { label: ALERT_STATUS_LABEL.processed, value: 'processed' },
];

export default function AlertInfo() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 2026-08-28：导出复选框模式（与种植管理 PestControlPage 模式一致）
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');

  // 2026-08-29：从 Store 读 IoT 预警（V2.1 铁律：纯内存，无 IndexedDB / localStorage）
  const alerts = useIotAlertStore((s) => s.alerts);
  const alertsLoading = useIotAlertStore((s) => s.loading);
  const alertsError = useIotAlertStore((s) => s.error);
  const fetchAlerts = useIotAlertStore((s) => s.fetchAlerts);

  // 进入页面拉一次（10 分钟内存缓存）
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter((alert: IotAlert) => {
    const matchSearch = !searchKeyword ||
      alert.alertCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      alert.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (alert.message && alert.message.toLowerCase().includes(searchKeyword.toLowerCase()));
    const matchStatus = statusFilter === '全部' || alert.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  /**
   * 进入导出模式（点击"导出"按钮）
   * - 与种植管理 PestControlPage 模式一致：进入后表格首列显示复选框
   * - 进入时默认全选当前筛选后的所有 ID
   */
  const handleEnterExportMode = useCallback(() => {
    setExportMode(true);
    setSelectedIds(filteredAlerts.map(a => a.id));
  }, [filteredAlerts]);

  /** 取消导出模式 + 清空选择 */
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedIds([]);
  }, []);

  /** 单条复选框切换 */
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  /** 当前页全选/全不选 */
  const toggleSelectPage = useCallback(() => {
    const pageIds = paginatedAlerts.map(a => a.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev =>
      allSelected
        ? prev.filter(id => !pageIds.includes(id))  // 当前页全取消
        : Array.from(new Set([...prev, ...pageIds]))  // 当前页全选
    );
  }, [paginatedAlerts, selectedIds]);

  /**
   * 确认导出（弹窗中点"导出"）
   * - 范围：仅选中行（selectedIds），不是全部
   * - 列：告警ID/标题/内容/类型/级别/告警时间/处理状态
   * - 文件名：预警记录_YYYY-MM-DD.{xls|csv|doc}
   * - 复用项目 @/services/exporters（带 BOM、防公式注入、saveFilePicker 降级 Blob）
   */
  const handleExportConfirm = useCallback(async () => {
    const headers = ['告警ID', '告警标题', '告警内容', '类型', '级别', '告警时间', '处理状态'];
    const levelText = (level: string) => {
      switch (level) {
        case 'error': return '紧急';
        case 'warning': return '警告';
        case 'info': return '提示';
        default: return '其他';
      }
    };
    const selected = filteredAlerts.filter(a => selectedIds.includes(a.id));
    const rows = selected.map(a => ({
      '告警ID': a.id,
      '告警标题': a.title,
      '告警内容': a.message,
      '类型': a.type,
      '级别': levelText(a.level),
      '告警时间': a.time,
      '处理状态': a.status,
    }));
    const filename = `预警记录_${todayLocal()}`;
    if (exportFormat === 'csv') {
      await exportCsv({ filename: `${filename}.csv`, headers, rows });
    } else if (exportFormat === 'word') {
      await exportWord({ filename: `${filename}.doc`, headers, rows });
    } else {
      await exportXlsx({ filename: `${filename}.xls`, headers, rows });
    }
    setShowExportModal(false);
    handleCancelExport();
  }, [filteredAlerts, exportFormat, selectedIds, handleCancelExport]);

  // 告警级别徽章（带 icon）
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: '紧急' };
      case 'warning':
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <AlertTriangle className="w-3 h-3" />, label: '警告' };
      case 'info':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Info className="w-3 h-3" />, label: '提示' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Info className="w-3 h-3" />, label: '其他' };
    }
  };

  // 处理状态徽章（2026-08-29：改为接收英文 enum）
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" /> };
      case 'processing': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> };
      case 'processed': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3 h-3" /> };
    }
  };

  return (
    <div className="pt-0 px-6 pb-6 space-y-6">
      {/* 页面标题 - 带大图标卡（与订单管理设计标准一致） */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">预警信息中心</h1>
              <p className="text-gray-500 mt-1">实时监控各类异常告警信息</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片（2026-08-28 二次调整：导出按钮移到筛选区右上角，统计卡片恢复原结构） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">紧急告警</p>
              <p className="text-xl font-bold text-gray-800">3</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">警告</p>
              <p className="text-xl font-bold text-gray-800">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">提示</p>
              <p className="text-xl font-bold text-gray-800">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已处理</p>
              <p className="text-xl font-bold text-gray-800">45</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区域 + 导出按钮（2026-08-28 二次调整：导出按钮放筛选区右上角，UI 与订单管理完全一致） */}
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
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索告警ID、标题或内容..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/20 focus:border-[#2B5D3A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2026-08-28：列表右上方单独一行 — 标题 + 导出按钮/确认导出+取消
          - 初始态：单个绿色"导出"按钮（与订单管理"确认导出"色一致：bg-emerald-600）
          - 点击后：原位置变两个按钮"确认导出(绿)" + "取消选择(灰白底)"
       */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">预警列表</h3>
        <div className="flex items-center gap-3">
          {!exportMode ? (
            <button
              onClick={handleEnterExportMode}
              disabled={filteredAlerts.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={handleCancelExport}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                取消选择
              </button>
            </>
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1E6FD9] to-[#3B8DE0]">
            <tr>
              {/* 2026-08-28：导出模式下显示复选框列（全选/单选） */}
              {exportMode && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={paginatedAlerts.length > 0 && paginatedAlerts.every(a => selectedIds.includes(a.id))}
                    onChange={toggleSelectPage}
                    aria-label="全选当前页"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">告警ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">告警标题</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">告警内容</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">类型</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">级别</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">告警时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">处理状态</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedAlerts.map(alert => {
              const levelBadge = getLevelBadge(alert.level);
              const statusBadge = getStatusBadge(alert.status);
              const isSelected = selectedIds.includes(alert.id);
              return (
                <tr
                  key={alert.id}
                  className={`hover:bg-gray-50 transition-colors ${exportMode && isSelected ? 'bg-blue-50/50' : ''}`}
                >
                  {/* 2026-08-28：导出模式下显示行复选框 */}
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(alert.id)}
                        aria-label={`选择 ${alert.id}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{alert.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{alert.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[280px] truncate">{alert.message}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {alert.typeName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${levelBadge.bg} ${levelBadge.text}`}>
                      {levelBadge.icon}
                      {levelBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{alert.time}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      {alert.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-[#2B5D3A] hover:bg-[#2B5D3A]/10 rounded transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="处理">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">共 {filteredAlerts.length} 条记录</p>
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

      {/* 2026-08-28：导出格式选择弹窗（项目标准 @/components/common/ExportFormatModal） */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCount={filteredAlerts.length}
        exportFormat={exportFormat}
        onFormatChange={(f) => setExportFormat(f as 'excel' | 'csv' | 'word')}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
