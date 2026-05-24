/**
 * 考勤补录页面 - 主组件
 * 使用通用组件实现完整功能
 */
import { ClipboardCheck } from 'lucide-react';
import { useAttendanceRepairPage } from './hooks/useAttendanceRepairPage';
import { AttendanceRepairPageFilters } from './AttendanceRepairPageFilters';
import { AttendanceRepairPageTable } from './AttendanceRepairPageTable';
import { AttendanceRepairPageCreateModal } from './AttendanceRepairPageModals/CreateModal';
import { AttendanceRepairPageDetailModal } from './AttendanceRepairPageModals/DetailModal';

export default function AttendanceRepairPage() {
  const {
    // 状态
    filters,
    pagination,
    isFormModalOpen,
    isDetailModalOpen,
    selectedRecord,
    selectedRowKeys,
    formData,
    batchMode,
    filteredData,
    departmentOptions,
    // 方法
    setPagination,
    setIsFormModalOpen,
    setIsDetailModalOpen,
    setSelectedRowKeys,
    setFormData,
    setBatchMode,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleStaffChange,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  } = useAttendanceRepairPage();

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <AttendanceRepairPageFilters
        filters={filters}
        departmentOptions={departmentOptions}
        batchMode={batchMode}
        selectedRowKeys={selectedRowKeys}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onSearch={handleSearch}
        onOpenFormModal={handleOpenFormModal}
        onBatchModeChange={setBatchMode}
        onBatchApprove={handleBatchApprove}
        onBatchReject={handleBatchReject}
        onExport={handleExport}
        onCancelBatch={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
      />

      {/* 数据表格 */}
      <AttendanceRepairPageTable
        records={filteredData}
        pagination={pagination}
        batchMode={batchMode}
        selectedRowKeys={selectedRowKeys}
        onPaginationChange={(page, size) => setPagination({ current: page, pageSize: size, total: pagination.total })}
        onSelectedRowKeysChange={setSelectedRowKeys}
        onOpenDetailModal={handleOpenDetailModal}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* 新增/编辑表单弹窗 */}
      <AttendanceRepairPageCreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        onFormDataChange={setFormData}
        onStaffChange={handleStaffChange}
        onSubmit={handleSubmit}
      />

      {/* 详情弹窗 */}
      <AttendanceRepairPageDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
