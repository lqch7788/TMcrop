/**
 * 月报页面容器组件
 */

import { BarChart3 } from 'lucide-react';
import { useMonthlyReport } from './hooks/useMonthlyReport';
import { MonthlyReportFilters } from './MonthlyReportFilters';
import { MonthlyStatsCards } from './MonthlyStatsCards';
import { MonthlyReportChart } from './MonthlyReportChart';
import { MonthlyReportTable } from './MonthlyReportTable';
import { ExportFormatModal } from './ExportFormatModal';

export function MonthlyReportPage() {
  const {
    reports,
    month,
    setMonth,
    dept,
    setDept,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    exportMode,
    setExportMode,
    selectedRows,
    handleSelectAll,
    handleSelectRow,
    handleConfirmExport,
    handleCancelExport,
    totalPages,
    paginatedReports,
    currentStats,
    showExportModal,
    setShowExportModal,
    exportFormat,
    setExportFormat,
  } = useMonthlyReport();

  // 处理导出点击
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工作月报</h1>
            <p className="text-xs text-gray-500">月度生产工作汇总与分析</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <MonthlyReportFilters
        month={month}
        onMonthChange={setMonth}
        dept={dept}
        onDeptChange={setDept}
        onSearch={() => {}}
        onGenerate={() => {}}
      />

      {/* 统计卡片 */}
      <MonthlyStatsCards stats={currentStats} />

      {/* 图表 */}
      <MonthlyReportChart reports={reports} />

      {/* 表格 */}
      <MonthlyReportTable
        reports={reports}
        paginatedReports={paginatedReports}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        exportMode={exportMode}
        selectedRows={selectedRows}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onExportClick={handleExportClick}
        onCancelExport={handleCancelExport}
        onShowExportModal={() => setShowExportModal(true)}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}
