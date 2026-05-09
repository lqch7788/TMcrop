/**
 * 招聘申请页面 - 人工管理模块
 * 实现招聘需求的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { Users } from 'lucide-react';
import { useDepartments, usePositions } from '../../components/common/settings';
import { useRecruitment } from './hooks/useRecruitment';
import { RecruitmentFilters } from './components/RecruitmentFilters';
import { RecruitmentTable } from './components/RecruitmentTable';
import { CreateModal } from './components/RecruitmentModals/CreateModal';
import { DetailModal } from './components/RecruitmentModals/DetailModal';

export default function RecruitmentPage() {
  const { departments } = useDepartments();
  const { positions } = usePositions();

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
    availablePositions,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleDeptChange,
    handleHeadcountChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setBatchMode,
  } = useRecruitment(departments, positions);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">招聘申请</h1>
            <p className="text-xs text-gray-500">提交招聘需求，查看招聘进度</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <RecruitmentFilters
        filters={filters}
        departments={departments}
        positions={positions}
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
        <RecruitmentTable
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
        onDeptChange={handleDeptChange}
        onHeadcountChange={handleHeadcountChange}
        onSubmit={handleSubmit}
        departments={departments}
        positions={positions}
        availablePositions={availablePositions}
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
