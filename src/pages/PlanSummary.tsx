/**
 * 生产计划汇总表页面
 * 使用 useBatchSummary Hook 获取动态数据
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../components/summary';
import { useBatchSummary, useBatchFilterOptions } from '../hooks';
import type { BatchSummaryRow } from '../types/views';

export default function PlanSummary() {
  // 筛选状态
  const [cropFilter, setCropFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [greenhouseFilter, setGreenhouseFilter] = useState('');

  // 获取筛选选项
  const { cropNames, statuses, greenhouses } = useBatchFilterOptions();

  // 获取批次汇总数据
  const { summaries, statCards, loading } = useBatchSummary({
    cropName: cropFilter || undefined,
    status: statusFilter || undefined,
    greenhouse: greenhouseFilter || undefined,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(summaries.length / pageSize);
  const paginatedData = summaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出 Hook
  const exportHook = useExport({
    data: summaries.map((s) => ({
      批次编号: s.batchCode,
      作物: s.cropName,
      品种: s.variety,
      温室: s.greenhouse,
      '面积(亩)': s.plantingArea,
      目标产量: s.targetYield,
      实际产量: s.actualYield,
      完成率: s.completionRate,
      状态: getStatusLabel(s.status),
    })),
    headers: ['批次编号', '作物', '品种', '温室', '面积(亩)', '目标产量', '实际产量', '完成率', '状态'],
    filenamePrefix: '生产计划汇总',
  });

  // 筛选配置
  const filterSelects = [
    {
      key: 'crop',
      label: '作物',
      options: cropNames,
      value: cropFilter,
      onChange: (value: string) => {
        setCropFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'status',
      label: '状态',
      options: statuses,
      value: statusFilter,
      onChange: (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'greenhouse',
      label: '温室',
      options: greenhouses,
      value: greenhouseFilter,
      onChange: (value: string) => {
        setGreenhouseFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置
  const columns = [
    { key: 'batchCode', label: '计划编号', width: '120px' },
    { key: 'cropName', label: '作物', width: '100px' },
    { key: 'variety', label: '品种', width: '120px' },
    { key: 'greenhouse', label: '温室', width: '100px' },
    { key: 'plantingArea', label: '面积(亩)', width: '80px' },
    { key: 'targetYield', label: '目标产量', width: '100px' },
    { key: 'actualYield', label: '实际产量', width: '100px' },
    {
      key: 'completionRate',
      label: '完成率',
      width: '140px',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: value }}
            />
          </div>
          <span className="text-sm text-gray-600">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: '状态',
      width: '100px',
      render: (value: string) => {
        const config = getStatusConfig(value);
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
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
        icon={<FileText className="w-6 h-6 text-white" />}
        title="生产计划汇总"
        description="查看所有生产批次的进度、产量和成本汇总"
      />

      {/* 统计卡片 - 使用 Hook 返回的动态数据 */}
      <StatCards cards={statCards} />

      {/* 筛选工具栏 */}
      <Filters
        filters={{ selects: filterSelects }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      {/* 数据表格 */}
      <SummaryTable
        title="生产计划汇总表"
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
    </div>
  );
}

/**
 * 获取状态标签
 */
function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    planning: '规划中',
    planned: '计划中',
    published: '已发布',
    in_progress: '进行中',
    planted: '已种植',
    growing: '生长中',
    harvesting: '采收中',
    completed: '已完成',
    cancelled: '已取消',
    suspended: '已暂停',
  };
  return statusMap[status] || status;
}

/**
 * 获取状态样式配置
 */
function getStatusConfig(status: string): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
    planning: { label: '规划中', className: 'bg-gray-100 text-gray-600' },
    planned: { label: '计划中', className: 'bg-blue-50 text-blue-700' },
    published: { label: '已发布', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
    planted: { label: '已种植', className: 'bg-green-50 text-green-700' },
    growing: { label: '生长中', className: 'bg-green-100 text-green-700' },
    harvesting: { label: '采收中', className: 'bg-orange-100 text-orange-700' },
    completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
    cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
    suspended: { label: '已暂停', className: 'bg-amber-100 text-amber-700' },
  };
  return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
}
