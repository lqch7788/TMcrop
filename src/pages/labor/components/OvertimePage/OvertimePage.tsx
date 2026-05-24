/**
 * 加班申请页面 - 主组件
 * 支持加班类型选择（工作日/休息日/节假日）、时长计算、提交审批
 */
import { Clock } from 'lucide-react';
import { useOvertimePage } from './hooks/useOvertimePage';
import { OvertimePageFilters } from './OvertimePageFilters';
import { OvertimePageTable } from './OvertimePageTable';
import { OvertimePageCreateModal } from './OvertimePageModals/CreateModal';
import { OvertimePageDetailModal } from './OvertimePageModals/DetailModal';

export default function OvertimePage() {
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
    overtimeFeePreview,
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
    handleOpenFormModal,
    handleOpenDetailModal,
    handleTimeChange,
    handleStaffChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  } = useOvertimePage();

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <OvertimePageFilters
        filters={filters}
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
      <OvertimePageTable
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
      <OvertimePageCreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        overtimeFeePreview={overtimeFeePreview}
        onFormDataChange={setFormData}
        onStaffChange={handleStaffChange}
        onTimeChange={handleTimeChange}
        onSubmit={handleSubmit}
      />

      {/* 详情弹窗 */}
      <OvertimePageDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
