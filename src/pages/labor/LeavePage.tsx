/**
 * 请假申请页面 - 人工管理模块
 * 实现请假申请的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { CalendarDays } from 'lucide-react';
import { useUsers } from '../../components/common/settings';
import { useLeave } from './hooks/useLeave';
import { LeaveFilters } from './components/LeaveFilters';
import { LeaveTable } from './components/LeaveTable';
import { CreateModal } from './components/LeaveModals/CreateModal';
import { DetailModal } from './components/LeaveModals/DetailModal';
import { WithdrawModal } from './components/LeaveModals/WithdrawModal';

export default function LeavePage() {
  const { workers } = useUsers();

  // 使用 Hook 管理所有状态和业务逻辑
  const {
    filters,
    setFilters,
    pagination,
    setPagination,
    formData,
    setFormData,
    currentQuota,
    setCurrentQuota,
    selectedRecord,
    setSelectedRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    batchMode,
    withdrawRecord,
    isWithdrawModalOpen,
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    filteredData,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleStaffChange,
    handleDateChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleOpenWithdrawModal,
    handleWithdraw,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
    setIsWithdrawModalOpen,
    setWithdrawRecord,
  } = useLeave(workers);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">请假申请</h1>
            <p className="text-xs text-gray-500">提交请假申请，查看请假记录</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <LeaveFilters
        filters={filters}
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
        <LeaveTable
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
          onWithdraw={handleOpenWithdrawModal}
        />
      </div>

      {/* 新增/编辑表单弹窗 */}
      <CreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        onFormDataChange={setFormData}
        onStaffChange={handleStaffChange}
        onDateChange={handleDateChange}
        onSubmit={handleSubmit}
        currentQuota={currentQuota}
        workers={workers}
      />

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
        onWithdraw={handleOpenWithdrawModal}
      />

      {/* 撤回确认弹窗 */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        record={withdrawRecord}
        onConfirm={handleWithdraw}
      />
    </div>
  );
}
