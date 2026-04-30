/**
 * 每日工单汇总表页面
 * 从 usePersistentWorkLogs 获取工作日志数据，展示每日工单汇总
 */

import { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../../components/summary';
import { usePersistentWorkLogs, WorkLogEntry } from '../../hooks/usePersistentWorkLogs';
import { useTasks } from '../../hooks/useTasks';

// 汇总行数据类型
interface DailySummaryRow {
  id: number;
  code: string;
  taskCode: string;
  taskTypeName: string;
  greenhouse: string;
  crop: string;
  worker: string;
  tasks: string;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  progress?: number;
  status: string;
  submitTime?: string;
}

export default function DailyWorkSummary() {
  // 从 usePersistentWorkLogs 获取工作日志数据
  const { workLogs } = usePersistentWorkLogs();
  const { tasks } = useTasks();

  // 筛选状态
  const [dateFilter, setDateFilter] = useState<string>('');
  const [greenhouseFilter, setGreenhouseFilter] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('');

  // 将工作日志数据转换为汇总行
  const summaries = useMemo((): DailySummaryRow[] => {
    return workLogs.map(log => {
      // 获取任务状态
      let status = '已完成';
      if (log.taskId) {
        const task = tasks.find(t => t.id === log.taskId);
        if (task) {
          if (task.status === 'completed') {
            status = '已完成';
          } else if (task.status === 'in_progress' || task.status === 'accepted') {
            status = '进行中';
          } else if (task.status === 'waiting_acceptance') {
            status = '待验收';
          } else if (task.status === 'rejected') {
            status = '已驳回';
          }
        }
      }

      return {
        id: log.id,
        code: log.code,
        taskCode: log.taskCode || '-',
        taskTypeName: log.taskTypeName || '-',
        greenhouse: log.greenhouse,
        crop: log.crop,
        worker: log.worker,
        tasks: log.tasks,
        workloadDays: log.workloadDays,
        workloadHours: log.workloadHours,
        workers: log.workers,
        progress: log.progress,
        status,
        submitTime: log.submitTime,
      };
    });
  }, [workLogs, tasks]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (dateFilter && s.code.startsWith(`WL${dateFilter.replace(/-/g, '')}`) === false) {
        // 按日期筛选
        const logDate = workLogs.find(w => w.id === s.id)?.date;
        if (logDate !== dateFilter) return false;
      }
      if (greenhouseFilter && greenhouseFilter !== '全部' && s.greenhouse !== greenhouseFilter) return false;
      if (taskTypeFilter && taskTypeFilter !== '全部' && s.taskTypeName !== taskTypeFilter) return false;
      return true;
    });
  }, [summaries, dateFilter, greenhouseFilter, taskTypeFilter, workLogs]);

  // 计算统计卡片
  const statCards = useMemo(() => {
    const total = filteredSummaries.length;
    const completed = filteredSummaries.filter(s => s.status === '已完成').length;
    const inProgress = filteredSummaries.filter(s => s.status === '进行中').length;
    const waitingAcceptance = filteredSummaries.filter(s => s.status === '待验收').length;

    return [
      { label: '工单总数', value: total, icon: '📋', iconBgColor: 'bg-blue-500' },
      { label: '已完成', value: completed, icon: '✓', iconBgColor: 'bg-green-500' },
      { label: '进行中', value: inProgress, icon: '⟳', iconBgColor: 'bg-amber-500' },
      { label: '待验收', value: waitingAcceptance, icon: '⏳', iconBgColor: 'bg-orange-500' },
    ];
  }, [filteredSummaries]);

  // 获取筛选选项
  const filterOptions = useMemo(() => {
    // 日期选项
    const dates = [...new Set(workLogs.map(w => w.date))].sort((a, b) => b.localeCompare(a));
    const dateOptions = [
      { value: '', label: '全部' },
      ...dates.map(d => ({ value: d, label: d })),
    ];

    // 工作区域选项
    const greenhouses = [...new Set(workLogs.map(w => w.greenhouse))];
    const greenhouseOptions = [
      { value: '', label: '全部' },
      ...greenhouses.map(g => ({ value: g, label: g })),
    ];

    // 任务类型选项
    const taskTypes = [...new Set(workLogs.map(w => w.taskTypeName).filter(Boolean))];
    const taskTypeOptions = [
      { value: '', label: '全部' },
      ...taskTypes.map(t => ({ value: t || '', label: t || '' })),
    ];

    return {
      dates: dateOptions,
      greenhouses: greenhouseOptions,
      taskTypes: taskTypeOptions,
    };
  }, [workLogs]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredSummaries.length / pageSize);
  const paginatedData = filteredSummaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出 Hook
  const exportHook = useExport({
    data: filteredSummaries.map((s) => {
      const parts = [];
      if (s.workloadDays) parts.push(`${s.workloadDays}天`);
      if (s.workloadHours) parts.push(`${s.workloadHours}小时`);
      if (s.workers) parts.push(`${s.workers}人`);
      return {
        '日志编号': s.code,
        '任务编号': s.taskCode,
        '任务类型': s.taskTypeName,
        '工作区域': s.greenhouse,
        '作物': s.crop,
        '执行人': s.worker,
        '工作内容': s.tasks,
        '工作量': parts.length > 0 ? parts.join('') : '-',
        '进度': s.progress !== undefined ? `${s.progress}%` : '-',
        '状态': s.status,
      };
    }),
    headers: ['日志编号', '任务编号', '任务类型', '工作区域', '作物', '执行人', '工作内容', '工作量', '进度', '状态'],
    filenamePrefix: '每日工单汇总',
  });

  // 筛选配置
  const filterSelects = [
    {
      key: 'date',
      label: '日期',
      options: filterOptions.dates,
      value: dateFilter,
      onChange: (value: string) => {
        setDateFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'greenhouse',
      label: '工作区域',
      options: filterOptions.greenhouses,
      value: greenhouseFilter,
      onChange: (value: string) => {
        setGreenhouseFilter(value);
        setCurrentPage(1);
      },
    },
    {
      key: 'taskType',
      label: '任务类型',
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
    { key: 'code', label: '日志编号', width: '130px' },
    { key: 'taskCode', label: '任务编号', width: '130px' },
    { key: 'taskTypeName', label: '任务类型', width: '80px' },
    { key: 'greenhouse', label: '工作区域', width: '80px' },
    { key: 'crop', label: '作物', width: '80px' },
    { key: 'worker', label: '执行人', width: '80px' },
    {
      key: 'workload',
      label: '工作量',
      width: '120px',
      render: (_: any, row: DailySummaryRow) => {
        const parts = [];
        if (row.workloadDays) parts.push(`${row.workloadDays}天`);
        if (row.workloadHours) parts.push(`${row.workloadHours}小时`);
        if (row.workers) parts.push(`${row.workers}人`);
        return parts.length > 0 ? parts.join('') : '-';
      },
    },
    {
      key: 'progress',
      label: '进度',
      width: '80px',
      render: (value?: number) => value !== undefined ? `${value}%` : '-',
    },
    {
      key: 'status',
      label: '状态',
      width: '90px',
      render: (value: string) => {
        const isCompleted = value === '已完成';
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        title="每日工单汇总"
        description="工作日志汇总展示"
      />

      {/* 统计卡片 */}
      <StatCards cards={statCards} />

      {/* 筛选工具栏 */}
      <Filters
        filters={{
          selects: filterSelects,
        }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      {/* 表格标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">每日工单汇总表</h3>
        <span className="text-sm text-gray-500">共 {filteredSummaries.length} 条记录</span>
      </div>

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
        onSelectAll={() => exportHook.handleSelectAll(filteredSummaries.map((s) => s.id.toString()))}
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
