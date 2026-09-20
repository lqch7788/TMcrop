/**
 * 每日工单汇总表页面
 *
 * 数据源（升级方案V1.0）：
 * - 主数据源：useTasks（来自 farmTaskStore），聚合所有任务
 * - 补充数据：usePersistentWorkLogs，用于获取实际工时/人数
 *
 * 每个活跃任务作为一行，展示任务状态、执行人、进度等信息。
 */

import { useState, useMemo, useCallback } from 'react';
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
// 2026-09-20：详情弹窗统一用 FarmTaskHub 同一组件（保证字段/UI 完全一致）
import { TaskDetailModal } from '../../components/farm/hub/TaskDetailModal';
import { getOperationTypeName } from '../../types/farm/common';

// 完整状态映射（覆盖农事任务/临时任务/巡查记录所有 status 值）
// 巡查记录特有 status（attention/critical/normal）在 TASK_STATUS_CONFIG 中没有，
// 必须额外加，否则表格显示英文 status 原值。
const STATUS_LABELS: Record<string, string> = {
  // 任务标准状态（与 TASK_STATUS_CONFIG 对齐）
  draft: '草稿',
  pending: '待接受',
  accepted: '已接受',
  in_progress: '处理中',
  waiting_acceptance: '待验收',
  completed: '已完成',
  rejected: '返工中',
  failed: '任务失败',
  cancelled: '已取消',
  abandoned: '已放弃',
  // 巡查记录特有状态（来自 /api/inspections 的 status 字段）
  normal: '正常',
  attention: '需关注',
  critical: '异常',
};

// 任务类别映射（dispatchMode → 中文），用于表格新增"任务类别"列
const CATEGORY_LABELS: Record<string, string> = {
  farm: '农事任务',
  tempTask: '临时任务',
  problem: '问题处理',
  inspection: '巡查反馈',
  smart: '智能任务',
};

// 状态对应的徽章颜色（按中文 label 匹配，新增巡查中文状态）
const STATUS_BADGE_CLASSES: Record<string, string> = {
  '已完成': 'bg-green-100 text-green-700',
  '待验收': 'bg-orange-100 text-orange-700',
  '已接受': 'bg-blue-100 text-blue-700',
  '处理中': 'bg-blue-100 text-blue-700',
  '返工中': 'bg-red-100 text-red-700',
  '待接受': 'bg-gray-100 text-gray-600',
  '已取消': 'bg-gray-100 text-gray-500',
  '任务失败': 'bg-purple-100 text-purple-700',
  // 巡查记录状态徽章
  '正常': 'bg-green-100 text-green-700',
  '需关注': 'bg-amber-100 text-amber-700',
  '异常': 'bg-red-100 text-red-700',
};

// 汇总行数据类型（以任务为主体）
interface DailySummaryRow {
  id: string;
  taskCode: string;
  // 2026-09-20：新增任务类别列（农事任务/临时任务/问题处理/巡查反馈）
  taskCategory: string;
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
  // 2026-09-20：解构 getTaskRecordsByTaskId，传给 TaskDetailModal 作 records fallback
  const { tasks, getTaskRecordsByTaskId } = useTasks();
  const { workLogs } = usePersistentWorkLogs();

  // 任务详情弹窗状态
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 筛选状态
  const [dateFilter, setDateFilter] = useState<string>('');
  const [greenhouseFilter, setGreenhouseFilter] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('');
  // 2026-09-20：任务类别筛选（农事任务/临时任务/问题处理/巡查反馈）
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('');

  // 2026-09-20：重置所有筛选条件（dateFilter / greenhouseFilter / taskTypeFilter / taskCategoryFilter）
  const handleResetFilters = useCallback(() => {
    setDateFilter('');
    setGreenhouseFilter('');
    setTaskTypeFilter('');
    setTaskCategoryFilter('');
    setCurrentPage(1);
  }, []);

  // 主数据源：任务列表（任务 → 汇总行）
  const summaries = useMemo((): DailySummaryRow[] => {
    const rows = tasks
      // 2026-09-20：按用户确认，每日工单汇总显示所有用户提交的任务类型：
      //   农事任务（farm/undefined）、临时任务（tempTask）、问题处理（problem）、巡查反馈（inspection）
      //   仅排除 AI 智能任务中心训练样本（dispatchMode='smart'）
      // 旧 2026-08-30 决策（只显示 farm）已按用户要求撤回。
      .filter(task => {
        if (!task.id || !task.title) return false;
        const mode = (task.dispatchMode || 'farm') as string;
        if (mode === 'smart') return false;
        return true;
      })
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

        // 状态标签：完整 STATUS_LABELS 覆盖所有来源（农事/临时/巡查）
        const status = STATUS_LABELS[task.status] || task.status || '-';

        // 任务类别：dispatchMode → 中文
        const mode = (task.dispatchMode || 'farm') as string;
        const taskCategory = CATEGORY_LABELS[mode] || mode || '农事任务';

        return {
          id: task.id,
          taskCode: task.taskCode || task.id || '-',
          taskCategory,
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

    // 2026-09-20：按更新时间（updatedAt）DESC 排序
    //   旧实现按 taskCode DESC 字符串排序有 bug：
    //   - 跨类别不可靠（'TT...' > 'NS...' 因为 'T' > 'N'，临时任务全部排前，与实际提交时间无关）
    //   - 同一天内多个任务序号乱序
    //   新实现用 updatedAt DESC 反映"最新活动"语义，cancel/accept/进度更新都按时间排。
    rows.sort((a, b) => {
      const ta = new Date(a.updateTime || '0').getTime();
      const tb = new Date(b.updateTime || '0').getTime();
      return tb - ta;
    });

    return rows;
  }, [tasks, workLogs]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (dateFilter && s.dueDate !== dateFilter) return false;
      if (greenhouseFilter && greenhouseFilter !== '全部' && s.greenhouse !== greenhouseFilter) return false;
      if (taskTypeFilter && taskTypeFilter !== '全部' && s.taskTypeName !== taskTypeFilter) return false;
      // 2026-09-20：任务类别筛选（用 taskCategory 中文 label 匹配）
      if (taskCategoryFilter && s.taskCategory !== taskCategoryFilter) return false;
      return true;
    });
  }, [summaries, dateFilter, greenhouseFilter, taskTypeFilter, taskCategoryFilter]);

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
    // 2026-09-20：任务类别筛选（农事任务/临时任务/问题处理/巡查反馈）
    {
      key: 'taskCategory',
      label: '任务类别',
      options: [
        { value: '', label: '全部' },
        { value: '农事任务', label: '农事任务' },
        { value: '临时任务', label: '临时任务' },
        { value: '问题处理', label: '问题处理' },
        { value: '巡查反馈', label: '巡查反馈' },
      ],
      value: taskCategoryFilter,
      onChange: (value: string) => {
        setTaskCategoryFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置
  const columns = [
    { key: 'taskCode', label: '任务编号', width: '130px' },
    // 2026-09-20：新增"任务类别"列（农事任务/临时任务/问题处理/巡查反馈）
    { key: 'taskCategory', label: '任务类别', width: '90px' },
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
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[value] || 'bg-gray-100 text-gray-700'}`}>
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
        onReset={handleResetFilters}
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

      {/* 任务详情弹窗 — 与 FarmTaskHub 用同一个 TaskDetailModal，保证内容完全一致 */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          tasks={tasks}
          getTaskRecordsByTaskId={getTaskRecordsByTaskId}
        />
      )}
    </div>
  );
}
