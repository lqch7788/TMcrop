/**
 * 每日工单汇总表页面
 * 使用 useDailyWorkSummary Hook 获取动态数据
 */

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../components/summary';
import { useDailyWorkSummary } from '../hooks';

export default function DailyWorkSummary() {
  // 筛选状态
  const [dateFilter, setDateFilter] = useState('');
  const [greenhouseFilter, setGreenhouseFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');

  // 获取每日工单汇总数据
  const { summaries, statCards, loading, filterOptions } = useDailyWorkSummary({
    date: dateFilter || undefined,
    greenhouse: greenhouseFilter || undefined,
    taskType: taskTypeFilter || undefined,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(summaries.length / pageSize);
  const paginatedData = summaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出 Hook
  const exportHook = useExport({
    data: summaries.map((s) => {
      const parts = [];
      if (s.workloadDays) parts.push(`${s.workloadDays}天`);
      if (s.workloadHours) parts.push(`${s.workloadHours}小时`);
      if (s.workers) parts.push(`${s.workers}人`);
      return {
        日期: s.date,
        温室: s.greenhouse,
        作物: s.crop,
        作业类型: s.taskType,
        '计划面积(亩)': s.plannedArea,
        '完成面积(亩)': s.completedArea,
        工作量: parts.length > 0 ? parts.join('') : '-',
        状态: s.status,
        完成率: s.completionRate,
      };
    }),
    headers: ['日期', '温室', '作物', '作业类型', '计划面积(亩)', '完成面积(亩)', '工作量', '状态', '完成率'],
    filenamePrefix: '每日工单汇总',
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
    {
      key: 'taskType',
      label: '作业类型',
      options: filterOptions.taskTypes,
      value: taskTypeFilter,
      onChange: (value: string) => {
        setTaskTypeFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置
  const columns = [
    { key: 'date', label: '日期', width: '120px' },
    { key: 'greenhouse', label: '温室', width: '100px' },
    { key: 'crop', label: '作物', width: '80px' },
    { key: 'taskType', label: '作业类型', width: '150px' },
    {
      key: 'workload',
      label: '工作量',
      width: '120px',
      render: (_: any, row: any) => {
        const days = row.workloadDays;
        const hours = row.workloadHours;
        const workers = row.workers;
        const parts = [];
        if (days) parts.push(`${days}天`);
        if (hours) parts.push(`${hours}小时`);
        if (workers) parts.push(`${workers}人`);
        return parts.length > 0 ? parts.join('') : '-';
      },
    },
    {
      key: 'status',
      label: '状态',
      width: '100px',
      render: (value: string) => {
        const isCompleted = value === '已完成';
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'completionRate',
      label: '完成率',
      width: '100px',
      render: (value: string) => {
        const rate = value;
        const rateNum = parseInt(rate);
        const colorClass = rate === '100%' ? 'text-green-600' : rateNum >= 80 ? 'text-amber-600' : 'text-red-600';
        return <span className={`font-medium ${colorClass}`}>{rate}</span>;
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
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        title="每日工单汇总表"
        description="每日农事工单执行情况汇总"
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
