/**
 * 调薪申请页面 - 人工管理模块
 * 实现调薪申请的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { TrendingUp } from 'lucide-react';
import { useUsers } from '../../components/common/settings';
import { useSalaryAdjustment } from './hooks/useSalaryAdjustment';
import { SalaryAdjustmentFilters } from './components/SalaryAdjustmentFilters';
import { SalaryAdjustmentTable } from './components/SalaryAdjustmentTable';
import { CreateModal } from './components/SalaryAdjustmentModals/CreateModal';
import { DetailModal } from './components/SalaryAdjustmentModals/DetailModal';

export default function SalaryAdjustmentPage() {
  const { workers } = useUsers();

  // 使用 Hook 管理所有状态和业务逻辑
  const {
    filters,
    pagination,
    setPagination,
    formData,
    setFormData,
    selectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    filteredData,
    departmentOptions,
    displayAmount,
    displayRatio,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handleProposedSalaryChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  } = useSalaryAdjustment(workers);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">调薪申请</h1>
            <p className="text-xs text-gray-500">员工薪资调整申请管理</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <SalaryAdjustmentFilters
        filters={filters}
        departmentOptions={departmentOptions}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onSearch={handleSearch}
        onAdd={handleOpenFormModal}
        batchMode={batchMode}
        onBatchApprove={() => setBatchMode('approve')}
        onBatchReject={() => setBatchMode('reject')}
        onExport={() => setBatchMode('export')}
        onCancelBatch={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
        selectedCount={selectedRowKeys.length}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <SalaryAdjustmentTable
          data={filteredData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, size) => setPagination({ current: page, pageSize: size, total: pagination.total }),
          }}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onViewDetail={handleOpenDetailModal}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      {/* 新增/编辑表单弹窗 */}
      <CreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        onFormDataChange={setFormData}
        onStaffChange={handleStaffChange}
        onProposedSalaryChange={handleProposedSalaryChange}
        onSubmit={handleSubmit}
        workers={workers}
        displayAmount={displayAmount}
        displayRatio={displayRatio}
      />

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
