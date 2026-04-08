/**
 * 每日问题汇总表页面
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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

interface Problem {
  id: number;
  date: string;
  greenhouse: string;
  crop: string;
  worker: string;
  problemType: string;
  description: string;
  severity: string;
  status: string;
  handler: string;
}

const dailyProblems: Problem[] = [
  { id: 1, date: '2024-03-14', greenhouse: '1号棚', crop: '番茄', worker: '张伟民', problemType: '病害', description: '叶片出现黄斑', severity: '中等', status: '已处理', handler: '李建国' },
  { id: 2, date: '2024-03-14', greenhouse: '2号棚', crop: '黄瓜', worker: '李明轩', problemType: '虫害', description: '发现蚜虫', severity: '严重', status: '处理中', handler: '王建华' },
  { id: 3, date: '2024-03-14', greenhouse: '3号棚', crop: '草莓', worker: '王建国', problemType: '环境', description: '温度过高', severity: '轻微', status: '已处理', handler: '李建国' },
  { id: 4, date: '2024-03-13', greenhouse: '1号棚', crop: '番茄', worker: '赵俊杰', problemType: '病害', description: '灰霉病初期', severity: '严重', status: '处理中', handler: '王建华' },
  { id: 5, date: '2024-03-13', greenhouse: '2号棚', crop: '黄瓜', worker: '钱文涛', problemType: '水肥', description: '缺水干旱', severity: '中等', status: '已处理', handler: '李建国' },
];

export default function DailyProblemSummary() {
  const [date, setDate] = useState('');
  const [greenhouse, setGreenhouse] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(dailyProblems.length / pageSize);

  const exportHook = useExport({
    data: dailyProblems.map((p) => ({
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

  // 统计卡片配置
  const statCards: StatCardConfig[] = [
    {
      label: '问题总数',
      value: dailyProblems.length,
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      iconBgColor: 'bg-red-50',
    },
    {
      label: '处理中',
      value: dailyProblems.filter((p) => p.status === '处理中').length,
      icon: <span className="text-amber-600 text-lg">!</span>,
      iconBgColor: 'bg-amber-50',
    },
    {
      label: '已处理',
      value: dailyProblems.filter((p) => p.status === '已处理').length,
      icon: <span className="text-green-600 text-lg">✓</span>,
      iconBgColor: 'bg-green-50',
    },
  ];

  // 表格列配置
  const columns: TableColumn<Problem>[] = [
    { key: 'date', label: '日期' },
    { key: 'greenhouse', label: '温室' },
    { key: 'crop', label: '作物' },
    { key: 'worker', label: '上报人' },
    { key: 'problemType', label: '问题类型' },
    {
      key: 'description',
      label: '问题描述',
      render: (value) => (
        <span className="max-w-[150px] truncate block">{value as string}</span>
      ),
    },
    {
      key: 'severity',
      label: '严重程度',
      render: (value) => {
        const severity = value as string;
        return (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              severity === '严重'
                ? 'bg-red-100 text-red-700'
                : severity === '中等'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {severity}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: '状态',
      render: (value) => {
        const status = value as string;
        return (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              status === '已处理' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status}
          </span>
        );
      },
    },
    { key: 'handler', label: '处理人' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<AlertTriangle className="w-6 h-6 text-white" />}
        title="每日问题汇总表"
        description="每日生产问题记录与处理情况"
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
        data={dailyProblems}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(dailyProblems.map((p) => p.id))}
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
