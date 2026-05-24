/**
 * 招聘申请页面 - 人工管理模块
 * 实现招聘需求的提交与审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { Users, Plus, Check, X, Download } from 'lucide-react';
import { useDepartmentStore, usePositionStore } from '../../stores';
import { useRecruitment } from './hooks/useRecruitment';
import { RecruitmentFilters } from './components/RecruitmentFilters';
import { RecruitmentTable } from './components/RecruitmentTable';
import { CreateModal } from './components/RecruitmentModals/CreateModal';
import { DetailModal } from './components/RecruitmentModals/DetailModal';
import { Button } from '@/components/ui/button';

export default function RecruitmentPage() {
  const departments = useDepartmentStore((state) => state.departments);
  const positions = usePositionStore((state) => state.positions);

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
      {/* 筛选栏 */}
      <RecruitmentFilters
        filters={filters}
        departments={departments}
        positions={positions}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onSearch={handleSearch}
      />

      {/* 数据表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">招聘申请记录</h3>
          <div className="flex gap-2">
            {batchMode === 'none' ? (
              <>
                <Button variant="default" size="sm" onClick={handleOpenFormModal}>
                  <Plus className="w-4 h-4" />
                  新增招聘
                </Button>
                <Button variant="blue" size="sm" onClick={() => setBatchMode('approve')}>
                  <Check className="w-4 h-4" />
                  批量通过
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBatchMode('reject')}>
                  <X className="w-4 h-4" />
                  批量驳回
                </Button>
                <Button variant="default" size="sm" onClick={() => setBatchMode('export')}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              </>
            ) : (
              <>
                {batchMode === 'approve' && (
                  <Button variant="blue" size="sm" onClick={handleBatchApprove} disabled={selectedRowKeys.length === 0}>
                    <Check className="w-4 h-4" />
                    确认通过 ({selectedRowKeys.length})
                  </Button>
                )}
                {batchMode === 'reject' && (
                  <Button variant="destructive" size="sm" onClick={handleBatchReject} disabled={selectedRowKeys.length === 0}>
                    <X className="w-4 h-4" />
                    确认驳回 ({selectedRowKeys.length})
                  </Button>
                )}
                {batchMode === 'export' && (
                  <Button variant="default" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4" />
                    确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setBatchMode('none'); setSelectedRowKeys([]); }}>
                  取消
                </Button>
              </>
            )}
          </div>
        </div>
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
