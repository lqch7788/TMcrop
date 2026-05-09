/**
 * 合同续签页面 - 人工管理模块
 * 实现合同续签的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { FileText } from 'lucide-react';
import { useContractRenewal } from './hooks/useContractRenewal';
import { ContractRenewalFilters } from './components/ContractRenewalFilters';
import { ContractRenewalTable } from './components/ContractRenewalTable';
import { CreateModal } from './components/ContractRenewalModals/CreateModal';
import { DetailModal } from './components/ContractRenewalModals/DetailModal';
import { workers } from '../../data/labor/laborData';

export default function ContractRenewalPage() {
  // 使用 Hook 管理所有状态和业务逻辑
  const {
    filters,
    setFilters,
    pagination,
    setPagination,
    formData,
    setFormData,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    filteredData,
    departmentOptions,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handlePeriodChange,
    handleNewStartDateChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  } = useContractRenewal(workers);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">合同续签</h1>
            <p className="text-xs text-gray-500">员工劳动合同续签管理</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <ContractRenewalFilters
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
        <ContractRenewalTable
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
        onPeriodChange={handlePeriodChange}
        onNewStartDateChange={handleNewStartDateChange}
        onSubmit={handleSubmit}
        workers={workers}
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
