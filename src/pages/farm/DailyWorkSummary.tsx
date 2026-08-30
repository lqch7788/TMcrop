/**
 * 每日工单汇总表页面
 *
 * 数据源（升级方案V1.0）：
 * - 主数据源：useTasks（来自 farmTaskStore），聚合所有任务
 * - 补充数据：usePersistentWorkLogs，用于获取实际工时/人数
 *
 * 每个活跃任务作为一行，展示任务状态、执行人、进度等信息。
 */

import { useState, useMemo } from 'react';
import { ClipboardList, Layers, Mail, Clock, CheckCircle, Loader, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  useExport,
} from '../../components/summary';
import { useTasks, TASK_STATUS_CONFIG } from '../../hooks/useTasks';
import { usePersistentWorkLogs } from '../../hooks/usePersistentWorkLogs';
import type { Task } from '../../hooks/useTasks';
import { DailyWorkDetailModal } from '../../components/planning/DailyWorkDetailModal';
import { getOperationTypeName } from '../../types/farm/common';

// 汇总行数据类型（以任务为主体）
interface DailySummaryRow {
  id: string;
  taskCode: string;
  taskTypeName: string;
  greenhouse: string;
  crop: string;
  worker: string;
  tasks: string;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  progress: number;
  status: string;
  dueDate?: string;
  // 2026-08-30：用于按"最新时间"排序（最新活动排最前）
  updateTime?: string;
}

export default function DailyWorkSummary() {
  const { tasks } = useTasks();
  const { workLogs } = usePersistentWorkLogs();

  // 任务详情弹窗状态
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 筛选状态
  const [dateFilter, setDateFilter] = useState<string>('');
  const [greenhouseFilter, setGreenhouseFilter] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('');

  // 主数据源：任务列表（任务 → 汇总行）
  const summaries = useMemo((): DailySummaryRow[] => {
    const rows = tasks
      // 2026-08-30：过滤临时任务（TT 开头）+ 巡查任务，问题任务
      //   每日工单汇总 = 农事任务中心的工单，只显示农事任务（dispatchMode='farm'）
      //   临时任务（TT）在"临时任务"模块看，巡查/问题在对应模块看
      .filter(task => task.id && task.title && task.dispatchMode !== 'tempTask' && !task.id?.startsWith('TT'))
      // 2026-08-30：只显示 dispatchMode='farm' 的农事任务（problem/inspection/smart 等在各自模块看）
      .filter(task => !task.dispatchMode || task.dispatchMode === 'farm')
      .map(task => {
        // 从工作日志中查找关联记录，用于补充工时/人数
        const matchedLogs = workLogs.filter(
          w => w.taskId === task.id || w.taskCode === task.taskCode
        );
        const totalHours = matchedLogs.reduce((sum, w) => sum + (w.workloadHours || 0), 0);
        const totalDays = matchedLogs.reduce((sum, w) => sum + (w.workloadDays || 0), 0);
        const totalWorkers = matchedLogs.length > 0
          ? Math.max(...matchedLogs.map(w => w.workers || 0))
          : 0;

        // 状态标签
        const statusConfig = TASK_STATUS_CONFIG[task.status];
        const status = statusConfig?.label || task.status;

        return {
          id: task.id,
          taskCode: task.taskCode || task.id || '-',
          // 任务类型：优先用中文 label，typeName 缺失或为英文时用 getOperationTypeName 翻译
          taskTypeName: getOperationTypeName(task.typeName || task.type || ''),
          greenhouse: task.greenhouseName || '-',
          crop: task.cropName || '-',
          worker: task.assigneeName || '-',
          tasks: task.title || '-',
          workloadDays: totalDays || undefined,
          workloadHours: totalHours || undefined,
          workers: totalWorkers || undefined,
          progress: task.progress || 0,
          status,
          // 2026-08-30：日期字段用"完成日期"优先于"计划到期日期"
          //   旧实现用 task.dueDate，但任务实际完成日期可能远晚于 dueDate
          //   例：NS20260829-001 due_date='2026-08-04'，但 2026-08-29 完成 → 按 dueDate 查 8-29 看不到
          //   优先级：completedAt（已完成日期） > dueDate（计划到期）
          dueDate: (task.completedAt ? task.completedAt.slice(0, 10) : '') || task.dueDate || undefined,
          // 2026-08-30：透传 updatedAt 用于按"最新时间"排序
          updateTime: task.updatedAt || task.createdAt || '',
        };
      });

    // 2026-08-30：按任务编号（taskCode）字符串 DESC 排序
    //   用户诉求："任务编号按照最新时间的排在最前面"
    //   解读：NS+yyyyMMdd-NNN 格式编码里日期部分决定排序，NS20260829 > NS20260317
    //   按 updateTime DESC 会被 cancel/accept 等操作打乱顺序（NS20260317-002 因 8-29 cancel 排第 1）
    //   按 taskCode DESC 才是稳定可预期的"最新任务编号排最前"
    rows.sort((a, b) => b.taskCode.localeCompare(a.taskCode));

    return rows;
  }, [tasks, workLogs]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (dateFilter && s.dueDate !== dateFilter) return false;
      if (greenhouseFilter && greenhouseFilter !== '全部' && s.greenhouse !== greenhouseFilter) return false;
      if (taskTypeFilter && taskTypeFilter !== '全部' && s.taskTypeName !== taskTypeFilter) return false;
      return true;
    });
  }, [summaries, dateFilter, greenhouseFilter, taskTypeFilter]);

  // 统计卡片（基于任务状态）
  const statCards = useMemo(() => {
    const total = summaries.length;
    const completed = summaries.filter(s => s.status === '已完成').length;
    const inProgress = summaries.filter(s =>
      ['已接受', '处理中', '返工中'].includes(s.status)
    ).length;
    const waitingAcceptance = summaries.filter(s => s.status === '待验收').length;
    const pending = summaries.filter(s => s.status === '待接受').length;

    return [
      { label: '任务总数', value: total, icon: <Layers className="w-4 h-4 text-white" />, iconBgColor: 'from-blue-500 to-blue-600' },
      { label: '待接受', value: pending, icon: <Mail className="w-4 h-4 text-white" />, iconBgColor: 'from-gray-500 to-gray-600' },
      { label: '进行中', value: inProgress, icon: <Loader className="w-4 h-4 text-white" />, iconBgColor: 'from-amber-500 to-amber-600' },
      { label: '待验收', value: waitingAcceptance, icon: <Clock className="w-4 h-4 text-white" />, iconBgColor: 'from-orange-500 to-orange-600' },
      { label: '已完成', value: completed, icon: <CheckCircle className="w-4 h-4 text-white" />, iconBgColor: 'from-green-500 to-green-600' },
    ];
  }, [summaries]);

  // 筛选选项（从 tasks 提取）
  const filterOptions = useMemo(() => {
    // 日期选项：从完成日期提取（与汇总行的 dueDate 字段同源，保持一致）
    const taskDates = tasks.map(t => t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate);
    const dates = [...new Set(taskDates.filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
    const dateOptions = [
      { value: '', label: '全部' },
      ...dates.map(d => ({ value: d || '', label: d || '' })),
    ];

    // 工作区域选项
    const greenhouses = [...new Set(tasks.map(t => t.greenhouseName).filter(Boolean))];
    const greenhouseOptions = [
      { value: '', label: '全部' },
      ...greenhouses.map(g => ({ value: g || '', label: g || '' })),
    ];

    // 任务类型选项
    const taskTypes = [...new Set(tasks.map(t => t.typeName || t.type).filter(Boolean))];
    const taskTypeOptions = [
      { value: '', label: '全部' },
      ...taskTypes.map(t => ({ value: t || '', label: t || '' })),
    ];

    return {
      dates: dateOptions,
      greenhouses: greenhouseOptions,
      taskTypes: taskTypeOptions,
    };
  }, [tasks]);

  // 分页状态（SummaryTable 内部处理分页）
  const [currentPage, setCurrentPage] = useState(1);
  // 2026-08-30：pageSize 默认 10 → 25
  //   原默认 10 时，limit=50 拉到 50 条，NS20260829-001/002 在位置 25/27，第一页（10 条）看不到
  //   改为 25 后第一页能看到最新 25 条活动
  const [pageSize, setPageSize] = useState(25);
  const totalPages = Math.ceil(filteredSummaries.length / pageSize);

  // 导出 Hook
  const exportHook = useExport({
    data: filteredSummaries.map((s) => {
      const parts = [];
      if (s.workloadDays) parts.push(`${s.workloadDays}天`);
      if (s.workloadHours) parts.push(`${s.workloadHours}小时`);
      if (s.workers) parts.push(`${s.workers}人`);
      return {
        id: s.id,
        '任务编号': s.taskCode,
        '任务类型': s.taskTypeName,
        '工作区域': s.greenhouse,
        '作物': s.crop,
        '执行人': s.worker,
        '工作内容': s.tasks,
        '工作量': parts.length > 0 ? parts.join('') : '-',
        '进度': s.progress !== undefined ? `${s.progress}%` : '-',
        '状态': s.status,
        '截止日期': s.dueDate || '-',
      };
    }),
    headers: ['任务编号', '任务类型', '工作区域', '作物', '执行人', '工作内容', '工作量', '进度', '状态', '截止日期'],
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
    { key: 'taskCode', label: '任务编号', width: '130px' },
    { key: 'taskTypeName', label: '任务类型', width: '80px' },
    { key: 'greenhouse', label: '工作区域', width: '80px' },
    { key: 'crop', label: '作物', width: '80px' },
    { key: 'worker', label: '执行人', width: '80px' },
    {
      key: 'workload',
      label: '工作量',
      width: '120px',
      render: (_: unknown, row: DailySummaryRow) => {
        const parts: string[] = [];
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
        const colorMap: Record<string, string> = {
          '已完成': 'bg-green-100 text-green-700',
          '待验收': 'bg-orange-100 text-orange-700',
          '已接受': 'bg-blue-100 text-blue-700',
          '处理中': 'bg-blue-100 text-blue-700',
          '返工中': 'bg-red-100 text-red-700',
          '待接受': 'bg-gray-100 text-gray-600',
          '已取消': 'bg-gray-100 text-gray-500',
          '任务失败': 'bg-purple-100 text-purple-700',
        };
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}>
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
description="基于任务数据汇总的每日农事工单执行情况"
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
        hideExportButton
      />

      {/* 表格标题栏 + 导出按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">每日工单汇总表</h3>
        {!exportHook.exportMode && (
          <Button size="sm" onClick={exportHook.handleExportClick}>
            <Download className="w-4 h-4" />
            导出
          </Button>
        )}
      </div>

      {/* 数据表格 */}
      <SummaryTable
        columns={columns}
        data={filteredSummaries}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(filteredSummaries.map((s) => s.id.toString()))}
        onSelectRow={(id) => exportHook.handleSelectRow(id as string)}
        onView={(record) => setSelectedTaskId(record.id)}
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

      {/* 任务详情弹窗 */}
      {selectedTaskId && (
        <DailyWorkDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          tasks={tasks}
        />
      )}
    </div>
  );
}
