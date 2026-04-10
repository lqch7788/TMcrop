/**
 * 每日问题汇总表页面
 * 使用 useDailyProblemSummary Hook 获取动态数据
 */

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../components/summary';
import { useDailyProblemSummary } from '../hooks';
import type { ProblemEntry } from '../hooks/usePersistentProblems';

export default function DailyProblemSummary() {
  // 筛选状态
  const [dateFilter, setDateFilter] = useState('');
  const [greenhouseFilter, setGreenhouseFilter] = useState('');

  // 获取每日问题汇总数据
  const { summaries, statCards, loading, filterOptions } = useDailyProblemSummary({
    date: dateFilter || undefined,
    greenhouse: greenhouseFilter || undefined,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(summaries.length || 1);
  const paginatedData = summaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    data: ProblemEntry | null;
  }>({ isOpen: false, data: null });

  // 导出 Hook
  const exportHook = useExport({
    data: summaries.map((p) => ({
      日期: p.date,
      温室: p.greenhouse,
      作物: p.crop,
      上报人: p.worker,
      问题类型: p.problemType,
      问题描述: p.description,
      严重程度: p.severity,
      状态: p.status,
      处理人: p.handler,
    })),
    headers: ['日期', '温室', '作物', '上报人', '问题类型', '问题描述', '严重程度', '状态', '处理人'],
    filenamePrefix: '每日问题汇总',
  });

  // 筛选配置
  const filterSelects = [
    {
      key: 'greenhouse',
      label: '温室',
      options: filterOptions.greenhouses,
      value: greenhouseFilter,
      onChange: (value: string) => {
        setGreenhouseFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置
  const columns = [
    { key: 'date', label: '日期', width: '120px' },
    { key: 'greenhouse', label: '温室', width: '80px' },
    { key: 'crop', label: '作物', width: '80px' },
    { key: 'worker', label: '上报人', width: '80px' },
    { key: 'problemType', label: '问题类型', width: '80px' },
    {
      key: 'description',
      label: '问题描述',
      width: '200px',
      render: (value: string, record: unknown) => {
        const row = record as { _problemData?: ProblemEntry };
        return (
          <span
            className="max-w-[150px] truncate block cursor-pointer text-blue-600 hover:text-blue-800"
            onClick={() => row._problemData && setDetailModal({ isOpen: true, data: row._problemData })}
            title="点击查看详情"
          >
            {value}
          </span>
        );
      },
    },
    {
      key: 'severity',
      label: '严重程度',
      width: '100px',
      render: (value: string) => {
        const severity = value;
        const className = severity === '严重' ? 'bg-red-100 text-red-700' : severity === '中等' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
        return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}>{severity}</span>;
      },
    },
    {
      key: 'status',
      label: '状态',
      width: '100px',
      render: (value: string) => {
        const status = value;
        const className = status === '已处理' ? 'bg-green-100 text-green-700' : status === '处理中' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700';
        return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${className}`}>{status}</span>;
      },
    },
    { key: 'handler', label: '处理人', width: '80px' },
  ];

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={<AlertTriangle className="w-6 h-6 text-white" />}
        title="每日问题汇总表"
        description="每日生产问题记录与处理情况"
      />

      {/* 统计卡片 - 使用 Hook 返回的动态数据 */}
      <StatCards cards={statCards} />

      {/* 筛选工具栏 */}
      <Filters
        filters={{
          date: { key: 'date', label: '日期', value: dateFilter, onChange: setDateFilter },
          selects: filterSelects,
        }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      {/* 数据表格 */}
      <SummaryTable
        columns={columns}
        data={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(summaries.map((s) => s.id))}
        onSelectRow={(id) => exportHook.handleSelectRow(id as string)}
        onView={(record) => {
          const r = record as { _problemData?: ProblemEntry };
          if (r._problemData) {
            setDetailModal({ isOpen: true, data: r._problemData });
          }
        }}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={exportHook.showExportModal}
        selectedCount={exportHook.selectedRows.length}
        exportFormat={exportHook.exportFormat}
        onFormatChange={exportHook.setExportFormat}
        onClose={() => exportHook.setShowExportModal(false)}
        onConfirm={exportHook.handleDoExport}
      />

      {/* 详情弹窗 */}
      {detailModal.isOpen && detailModal.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">问题详情</h3>
              <button
                onClick={() => setDetailModal({ isOpen: false, data: null })}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* 基本信息区域 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">温室</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.greenhouseName}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">作物</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.cropName}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">巡检日期</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.checkDate} {detailModal.data.checkTime}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">巡检员</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.inspectorName}</div>
                  </div>
                </div>
              </div>

              {/* 环境信息区域 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">环境信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-blue-500 mb-1">天气</div>
                    <div className="text-sm font-medium text-blue-700">{detailModal.data.weather}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-xs text-orange-500 mb-1">温度</div>
                    <div className="text-sm font-medium text-orange-700">{detailModal.data.temperature}°C</div>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded-lg">
                    <div className="text-xs text-cyan-500 mb-1">湿度</div>
                    <div className="text-sm font-medium text-cyan-700">{detailModal.data.humidity}%</div>
                  </div>
                </div>
              </div>

              {/* 作物状态 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">作物状态</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      detailModal.data.cropStatus === '良好' ? 'bg-green-100 text-green-700' :
                      detailModal.data.cropStatus === '一般' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {detailModal.data.cropStatus}
                    </span>
                    {detailModal.data.plantHeight && (
                      <span className="text-sm text-gray-600">株高: {detailModal.data.plantHeight}cm</span>
                    )}
                    {detailModal.data.leafCount && (
                      <span className="text-sm text-gray-600">叶片数: {detailModal.data.leafCount}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 问题描述 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">问题描述</h4>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      detailModal.data.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                      detailModal.data.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {detailModal.data.issueSeverity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{detailModal.data.issueText}</p>
                </div>
              </div>

              {/* 问题照片 */}
              {detailModal.data.images && detailModal.data.images.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">问题照片</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {detailModal.data.images.slice(0, 6).map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 处理信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">处理信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <div className="text-sm font-medium">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        detailModal.data.status === '已处理' ? 'bg-green-100 text-green-700' :
                        detailModal.data.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {detailModal.data.status}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">处理人</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.data.handler || '-'}</div>
                  </div>
                  {detailModal.data.handleDate && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">处理日期</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.data.handleDate}</div>
                    </div>
                  )}
                  {detailModal.data.handleResult && (
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <div className="text-xs text-gray-500 mb-1">处理结果</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.data.handleResult}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 备注 */}
              {detailModal.data.remarks && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">备注</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{detailModal.data.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
