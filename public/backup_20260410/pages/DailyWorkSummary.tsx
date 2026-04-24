/**
 * 每日工单汇总表页面
 */

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  PageHeader,
  StatCards,
  Filters,
  SummaryTable,
  ExportModal,
  StatCardConfig,
  TableColumn,
  useExport,
} from '../components/summary';

interface WorkOrder {
  id: number;
  date: string;
  greenhouse: string;
  crop: string;
  taskType: string;
  plannedArea: number;
  completedArea: number;
  workerCount: number;
  workHours: number;
  status: string;
  completionRate: string;
}

const dailyWorkOrders: WorkOrder[] = [
  { id: 1, date: '2024-03-14', greenhouse: '1号棚', crop: '番茄', taskType: '浇水', plannedArea: 5, completedArea: 5, workerCount: 3, workHours: 8, status: '已完成', completionRate: '100%' },
  { id: 2, date: '2024-03-14', greenhouse: '2号棚', crop: '黄瓜', taskType: '施肥', plannedArea: 3, completedArea: 2.5, workerCount: 2, workHours: 6, status: '进行中', completionRate: '83%' },
  { id: 3, date: '2024-03-14', greenhouse: '3号棚', crop: '草莓', taskType: '除草', plannedArea: 2, completedArea: 2, workerCount: 2, workHours: 4, status: '已完成', completionRate: '100%' },
  { id: 4, date: '2024-03-13', greenhouse: '1号棚', crop: '番茄', taskType: '病虫害防治', plannedArea: 5, completedArea: 5, workerCount: 4, workHours: 10, status: '已完成', completionRate: '100%' },
  { id: 5, date: '2024-03-13', greenhouse: '2号棚', crop: '黄瓜', taskType: '修剪', plannedArea: 3, completedArea: 3, workerCount: 2, workHours: 5, status: '已完成', completionRate: '100%' },
  { id: 6, date: '2024-03-12', greenhouse: '4号棚', crop: '辣椒', taskType: '移栽', plannedArea: 4, completedArea: 3, workerCount: 5, workHours: 12, status: '进行中', completionRate: '75%' },
];

export default function DailyWorkSummary() {
  const [date, setDate] = useState('');
  const [greenhouse, setGreenhouse] = useState('全部');
  const [taskType, setTaskType] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(dailyWorkOrders.length / pageSize);

  const exportHook = useExport({
    data: dailyWorkOrders.map((o) => ({
      日期: o.date,
      温室: o.greenhouse,
      作物: o.crop,
      作业类型: o.taskType,
      '计划面积(亩)': o.plannedArea,
      '完成面积(亩)': o.completedArea,
      作业人数: o.workerCount,
      工时: o.workHours,
      状态: o.status,
      完成率: o.completionRate,
    })),
    headers: ['日期', '温室', '作物', '作业类型', '计划面积(亩)', '完成面积(亩)', '作业人数', '工时', '状态', '完成率'],
    filenamePrefix: '每日工单汇总',
  });

  // 统计卡片配置
  const statCards: StatCardConfig[] = [
    {
      label: '工单总数',
      value: dailyWorkOrders.length,
      icon: <ClipboardList className="w-5 h-5 text-blue-600" />,
      iconBgColor: 'bg-blue-50',
    },
    {
      label: '已完成',
      value: dailyWorkOrders.filter((p) => p.status === '已完成').length,
      icon: <span className="text-green-600 text-lg">✓</span>,
      iconBgColor: 'bg-green-50',
    },
    {
      label: '进行中',
      value: dailyWorkOrders.filter((p) => p.status === '进行中').length,
      icon: <span className="text-amber-600 text-lg">⟳</span>,
      iconBgColor: 'bg-amber-50',
    },
    {
      label: '总工时',
      value: dailyWorkOrders.reduce((sum, p) => sum + p.workHours, 0),
      icon: <span className="text-purple-600 text-lg">∑</span>,
      iconBgColor: 'bg-purple-50',
    },
  ];

  // 表格列配置
  const columns: TableColumn<WorkOrder>[] = [
    { key: 'date', label: '日期' },
    { key: 'greenhouse', label: '温室' },
    { key: 'crop', label: '作物' },
    { key: 'taskType', label: '作业类型' },
    { key: 'plannedArea', label: '计划面积(亩)' },
    { key: 'completedArea', label: '完成面积(亩)' },
    { key: 'workerCount', label: '作业人数' },
    { key: 'workHours', label: '工时' },
    {
      key: 'status',
      label: '状态',
      render: (value) => {
        const status = value as string;
        return (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: 'completionRate',
      label: '完成率',
      render: (value) => {
        const rate = value as string;
        return (
          <span
            className={`font-medium ${
              rate === '100%'
                ? 'text-green-600'
                : parseInt(rate) >= 80
                ? 'text-amber-600'
                : 'text-red-600'
            }`}
          >
            {rate}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        title="每日工单汇总表"
        description="每日农事工单执行情况汇总"
      />

      <StatCards cards={statCards} />

      <Filters
        filters={{
          date: { key: 'date', label: '日期', value: date, onChange: setDate },
          selects: [
            {
              key: 'greenhouse',
              label: '大棚',
              options: [
                { value: '全部', label: '全部' },
                { value: '1号棚', label: '1号棚' },
                { value: '2号棚', label: '2号棚' },
                { value: '3号棚', label: '3号棚' },
                { value: '4号棚', label: '4号棚' },
              ],
            },
            {
              key: 'taskType',
              label: '作业类型',
              options: [
                { value: '全部', label: '全部' },
                { value: '浇水', label: '浇水' },
                { value: '施肥', label: '施肥' },
                { value: '除草', label: '除草' },
                { value: '病虫害防治', label: '病虫害防治' },
                { value: '修剪', label: '修剪' },
                { value: '移栽', label: '移栽' },
              ],
            },
          ],
        }}
        showExportMode={exportHook.exportMode}
        selectedCount={exportHook.selectedRows.length}
        onExportClick={exportHook.handleExportClick}
        onConfirmExport={exportHook.handleConfirmExport}
        onCancelExport={exportHook.handleCancelExport}
      />

      <SummaryTable
        columns={columns}
        data={dailyWorkOrders}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(dailyWorkOrders.map((p) => p.id))}
        onSelectRow={(id) => exportHook.handleSelectRow(id as number)}
      />

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
