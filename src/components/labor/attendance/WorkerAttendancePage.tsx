/**
 * 工人考勤 - 页面容器组件
 * 负责组合所有子组件，提供统一的页面结构
 */
import { Users } from 'lucide-react';
import { useWorkerAttendance } from './hooks/useWorkerAttendance';
import { WorkerAttendanceFilters } from './WorkerAttendanceFilters';
import { WorkerAttendanceTable } from './WorkerAttendanceTable';
import { WorkerAttendanceExport } from './WorkerAttendanceExport';

export function WorkerAttendancePage() {
  const {
    // 数据
    filters,
    pagination,
    exportMode,
    selectedRows,
    exportFormat,
    showExportModal,

    // 导出数据
    filteredData,
    paginatedData,
    totalPages,

    // 操作方法
    setFilters,
    setPagination,
    setExportMode,
    setExportFormat,
    setShowExportModal,

    // 选择操作
    handleSelectAll,
    handleSelectRow,

    // 导出操作
    handleExportClick,
    handleCancelExport,
    handleConfirmExport,
  } = useWorkerAttendance();

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setPagination({ currentPage: page });
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setPagination({ pageSize: size, currentPage: 1 });
  };

  // 处理确认导出（带模态框）
  const handleConfirmWithModal = () => {
    handleConfirmExport();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工人考勤</h1>
            <p className="text-gray-500">工人考勤记录管理</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <WorkerAttendanceFilters
        filters={filters}
        exportMode={exportMode}
        onFiltersChange={setFilters}
        onExportClick={handleExportClick}
        onCancelExport={handleCancelExport}
      />

      {/* 考勤表格 */}
      <WorkerAttendanceTable
        data={paginatedData}
        exportMode={exportMode}
        selectedRows={selectedRows}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalCount={filteredData.length}
        totalPages={totalPages}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onShowExportModal={() => setShowExportModal(true)}
      />

      {/* 导出格式选择模态框 */}
      <WorkerAttendanceExport
        show={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onConfirm={handleConfirmWithModal}
        onCancel={() => setShowExportModal(false)}
      />
    </div>
  );
}
