/**
 * 每日工单汇总表页面
 * 直接从 useTasks 获取任务数据，展示任务执行闭环的全流程状态
 * 路径变更：从 /daily-work-summary 移至农事管理模块
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
import { useTasks, TASK_STATUS_CONFIG } from '../../hooks/useTasks';
import { usePersistentAttendance } from '../../hooks/usePersistentAttendance';
import type { TaskStatus } from '../../hooks/useTasks';
import { users } from '../../data/mockData';

// 汇总行数据类型
interface DailySummaryRow {
  id: string;
  taskCode: string;
  title: string;
  typeName: string;
  greenhouseName: string;
  cropName: string;
  assigneeName: string;
  assignerName: string;
  dueDate: string;
  status: TaskStatus;
  statusLabel: string;
  progress: number;
  workHours: number;
  laborCost: number;  // 人工成本
  checkIn: string;
  checkOut: string;
}

export default function DailyWorkSummary() {
  // 从 useTasks 获取任务数据
  const { tasks } = useTasks();
  const { attendance } = usePersistentAttendance();

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [greenhouseFilter, setGreenhouseFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  // 将任务数据转换为汇总行
  const summaries = useMemo((): DailySummaryRow[] => {
    return tasks.map(task => {
      // 查找对应的考勤记录
      const taskAttendance = attendance.find(a => a.taskId === task.id);

      // 计算人工成本：根据执行人姓名查找时薪
      const worker = users.find(u => u.name === task.assigneeName);
      const hourlyRate = (worker as any)?.hourlyRate || 35; // 默认35元/小时
      const workHours = taskAttendance?.hours || task.estimatedHours || 0;
      const laborCost = workHours * hourlyRate;

      return {
        id: task.id,
        taskCode: task.taskCode,
        title: task.title,
        typeName: task.typeName,
        greenhouseName: task.greenhouseName,
        cropName: task.cropName,
        assigneeName: task.assigneeName,
        assignerName: task.assignerName,
        dueDate: task.dueDate,
        status: task.status,
        statusLabel: TASK_STATUS_CONFIG[task.status]?.label || task.status,
        progress: task.progress,
        workHours,
        laborCost,  // 人工成本
        checkIn: taskAttendance?.checkIn || '-',
        checkOut: taskAttendance?.checkOut || '-',
      };
    });
  }, [tasks, attendance]);

  // 应用筛选
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (greenhouseFilter && greenhouseFilter !== '全部' && s.greenhouseName !== greenhouseFilter) return false;
      if (assigneeFilter && assigneeFilter !== '全部' && s.assigneeName !== assigneeFilter) return false;
      return true;
    });
  }, [summaries, statusFilter, greenhouseFilter, assigneeFilter]);

  // 计算统计卡片
  const statCards = useMemo(() => {
    const total = filteredSummaries.length;
    const completed = filteredSummaries.filter(s => s.status === 'completed').length;
    const inProgress = filteredSummaries.filter(s => s.status === 'in_progress' || s.status === 'accepted').length;
    const waitingAcceptance = filteredSummaries.filter(s => s.status === 'waiting_acceptance').length;
    const totalHours = filteredSummaries.reduce((sum, s) => sum + s.workHours, 0);
    const totalLaborCost = filteredSummaries.reduce((sum, s) => sum + s.laborCost, 0);

    return [
      { label: '任务总数', value: total, icon: '📋', iconBgColor: 'bg-blue-500' },
      { label: '已完成', value: completed, icon: '✓', iconBgColor: 'bg-green-500' },
      { label: '进行中', value: inProgress, icon: '⟳', iconBgColor: 'bg-amber-500' },
      { label: '待验收', value: waitingAcceptance, icon: '⏳', iconBgColor: 'bg-orange-500' },
      { label: '总工时', value: totalHours.toFixed(1) + 'h', icon: '∑', iconBgColor: 'bg-purple-500' },
      { label: '人工成本', value: '¥' + totalLaborCost.toFixed(0), icon: '💰', iconBgColor: 'bg-emerald-500' },
    ];
  }, [filteredSummaries]);

  // 获取筛选选项
  const filterOptions = useMemo(() => {
    const greenhouses = [...new Set(tasks.map(t => t.greenhouseName))];
    const assignees = [...new Set(tasks.map(t => t.assigneeName))];

    return {
      greenhouses: [{ value: '', label: '全部' }, ...greenhouses.map(g => ({ value: g, label: g }))],
      assignees: [{ value: '', label: '全部' }, ...assignees.map(a => ({ value: a, label: a }))],
      statuses: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待接受' },
        { value: 'accepted', label: '已接受' },
        { value: 'in_progress', label: '进行中' },
        { value: 'waiting_acceptance', label: '待验收' },
        { value: 'completed', label: '已完成' },
        { value: 'rejected', label: '已驳回' },
      ],
    };
  }, [tasks]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredSummaries.length / pageSize);
  const paginatedData = filteredSummaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出 Hook
  const exportHook = useExport({
    data: filteredSummaries.map((s) => ({
      '任务编号': s.taskCode,
      '任务标题': s.title,
      '任务类型': s.typeName,
      '温室': s.greenhouseName,
      '作物': s.cropName,
      '执行人': s.assigneeName,
      '派发人': s.assignerName,
      '截止日期': s.dueDate,
      '状态': s.statusLabel,
      '进度': `${s.progress}%`,
      '工时': s.workHours,
      '签到': s.checkIn,
      '签退': s.checkOut,
    })),
    headers: ['任务编号', '任务标题', '任务类型', '温室', '作物', '执行人', '派发人', '截止日期', '状态', '进度', '工时', '签到', '签退'],
    filenamePrefix: '每日工单汇总',
  });

  // 筛选配置
  const filterSelects = [
    {
      key: 'status',
      label: '状态',
      options: filterOptions.statuses,
      value: statusFilter,
      onChange: (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
      },
    },
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
      key: 'assignee',
      label: '执行人',
      options: filterOptions.assignees,
      value: assigneeFilter,
      onChange: (value: string) => {
        setAssigneeFilter(value);
        setCurrentPage(1);
      },
    },
  ];

  // 表格列配置（与农事任务派发页面字段对齐）
  const columns = [
    { key: 'taskCode', label: '任务编号', width: '130px' },
    { key: 'title', label: '任务标题', width: '180px' },
    { key: 'typeName', label: '任务类型', width: '80px' },
    { key: 'greenhouseName', label: '温室', width: '80px' },
    { key: 'cropName', label: '作物', width: '80px' },
    { key: 'assigneeName', label: '执行人', width: '80px' },
    { key: 'assigneeName', label: '派发人', width: '80px' },
    { key: 'dueDate', label: '截止日期', width: '100px' },
    {
      key: 'status',
      label: '状态',
      width: '90px',
      render: (value: TaskStatus) => {
        const config = TASK_STATUS_CONFIG[value] || { label: value, bg: 'bg-gray-100', color: 'text-gray-600' };
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'progress',
      label: '进度',
      width: '80px',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <span className="text-xs text-gray-500">{value}%</span>
        </div>
      ),
    },
    {
      key: 'workHours',
      label: '工时(h)',
      width: '70px',
      render: (value: number) => value.toFixed(1),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        title="每日工单汇总"
        description="任务执行闭环全流程追踪"
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
        onSelectAll={() => exportHook.handleSelectAll(filteredSummaries.map((s) => s.id))}
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
