/**
 * 生产计划汇总表页面
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
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

interface Plan {
  id: number;
  code: string;
  crop: string;
  variety: string;
  greenhouse: string;
  area: number;
  targetYield: number;
  actualYield: number;
  completionRate: string;
  status: string;
  statusClass: 'normal' | 'pending' | 'draft';
}

const planSummary: Plan[] = [
  { id: 1, code: 'P202401', crop: '番茄', variety: '红果番茄', greenhouse: '1号棚', area: 5, targetYield: 50, actualYield: 48, completionRate: '96%', status: '已完成', statusClass: 'normal' },
  { id: 2, code: 'P202402', crop: '黄瓜', variety: '水果黄瓜', greenhouse: '2号棚', area: 3, targetYield: 30, actualYield: 28, completionRate: '93%', status: '已完成', statusClass: 'normal' },
  { id: 3, code: 'P202403', crop: '草莓', variety: '红颜', greenhouse: '3号棚', area: 2, targetYield: 5, actualYield: 4.5, completionRate: '90%', status: '进行中', statusClass: 'pending' },
  { id: 4, code: 'P202404', crop: '辣椒', variety: '线椒', greenhouse: '4号棚', area: 4, targetYield: 20, actualYield: 0, completionRate: '0%', status: '待开始', statusClass: 'draft' },
  { id: 5, code: 'P202405', crop: '番茄', variety: '樱桃番茄', greenhouse: '5号棚', area: 2, targetYield: 15, actualYield: 0, completionRate: '0%', status: '待开始', statusClass: 'draft' },
];

export default function PlanSummary() {
  const [crop, setCrop] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(planSummary.length / pageSize);

  const exportHook = useExport({
    data: planSummary.map((p) => ({
      计划编号: p.code,
      作物: p.crop,
      品种: p.variety,
      温室: p.greenhouse,
      '面积(亩)': p.area,
      目标产量: p.targetYield,
      实际产量: p.actualYield,
      完成率: p.completionRate,
      状态: p.status,
    })),
    headers: ['计划编号', '作物', '品种', '温室', '面积(亩)', '目标产量', '实际产量', '完成率', '状态'],
    filenamePrefix: '计划汇总',
  });

  // 统计卡片配置
  const statCards: StatCardConfig[] = [
    {
      label: '计划总数',
      value: planSummary.length,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      iconBgColor: 'bg-blue-50',
    },
    {
      label: '已完成',
      value: planSummary.filter((p) => p.status === '已完成').length,
      icon: <span className="text-green-600 text-lg">✓</span>,
      iconBgColor: 'bg-green-50',
    },
    {
      label: '进行中',
      value: planSummary.filter((p) => p.status === '进行中').length,
      icon: <span className="text-amber-600 text-lg">⟳</span>,
      iconBgColor: 'bg-amber-50',
    },
    {
      label: '待开始',
      value: planSummary.filter((p) => p.status === '待开始').length,
      icon: <span className="text-gray-600 text-lg">○</span>,
      iconBgColor: 'bg-gray-50',
    },
  ];

  // 表格列配置
  const columns: TableColumn<Plan>[] = [
    { key: 'code', label: '计划编号' },
    { key: 'crop', label: '作物' },
    { key: 'variety', label: '品种' },
    { key: 'greenhouse', label: '温室' },
    { key: 'area', label: '种植面积(亩)' },
    { key: 'targetYield', label: '目标产量(吨)' },
    { key: 'actualYield', label: '实际产量(吨)' },
    {
      key: 'completionRate',
      label: '完成率',
      render: (value) => {
        const rate = value as string;
        return (
          <span
            className={`font-medium ${
              rate === '100%' || parseInt(rate) >= 90
                ? 'text-green-600'
                : parseInt(rate) >= 50
                ? 'text-amber-600'
                : 'text-gray-600'
            }`}
          >
            {rate}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: '状态',
      render: (value, record) => {
        const statusClass = (record as Plan).statusClass;
        return (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              statusClass === 'normal'
                ? 'bg-green-100 text-green-700'
                : statusClass === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {value as string}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="w-6 h-6 text-white" />}
        title="生产计划汇总表"
        description="所有生产计划执行情况汇总"
      />

      <StatCards cards={statCards} />

      <Filters
        filters={{
          selects: [
            {
              key: 'crop',
              label: '作物',
              options: [
                { value: '全部', label: '全部' },
                { value: '番茄', label: '番茄' },
                { value: '黄瓜', label: '黄瓜' },
                { value: '草莓', label: '草莓' },
                { value: '辣椒', label: '辣椒' },
              ],
            },
            {
              key: 'status',
              label: '状态',
              options: [
                { value: '全部', label: '全部' },
                { value: '已完成', label: '已完成' },
                { value: '进行中', label: '进行中' },
                { value: '待开始', label: '待开始' },
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
        data={planSummary}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportHook.exportMode}
        selectedRows={exportHook.selectedRows}
        onPageChange={setCurrentPage}
        onSelectAll={() => exportHook.handleSelectAll(planSummary.map((p) => p.id))}
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
