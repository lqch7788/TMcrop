/**
 * 调薪申请页面 - 人工管理模块
 * 实现调薪申请的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { TrendingUp } from 'lucide-react';
import { useUserStore } from '../../stores';
import { useSalaryAdjustment } from './hooks/useSalaryAdjustment';
import { SalaryAdjustmentFilters } from './components/SalaryAdjustmentFilters';
import { SalaryAdjustmentTable } from './components/SalaryAdjustmentTable';
import { CreateModal } from './components/SalaryAdjustmentModals/CreateModal';
import { DetailModal } from './components/SalaryAdjustmentModals/DetailModal';

export default function SalaryAdjustmentPage() {
  const workers = useUserStore((state) => state.users);
  // 2026-10-11：hook 与弹窗下拉均期望 {workerId,name,department,position,...} 形状
  //   （User 的 oid/name/department_name/position 映射；workerId 用 oid 作为唯一标识）
  const workerOptions = workers.map((u) => ({
    workerId: u.oid,
    name: u.name || u.real_name || u.username || '',
    department: u.department_name || '',
    position: u.position || '',
  }));

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
  } = useSalaryAdjustment(workerOptions);

  return (
    <div className="space-y-4">
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
        workers={workerOptions}
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
