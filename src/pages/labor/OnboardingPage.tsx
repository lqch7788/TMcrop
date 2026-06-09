/**
 * 入职办理页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { UserPlus, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { useOnboardingPage } from './hooks/useOnboardingPage';
import { OnboardingPageFilters } from './components/OnboardingPage/OnboardingPageFilters';
import { OnboardingPageTable } from './components/OnboardingPage/OnboardingPageTable';
import { OnboardingPageCreateModal } from './components/OnboardingPage/OnboardingPageModals/CreateModal';
import { OnboardingPageDetailModal } from './components/OnboardingPage/OnboardingPageModals/DetailModal';

export default function OnboardingPage() {
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
    handleOpenFormModal,
    handleOpenDetailModal,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
  } = useOnboardingPage();

  // 表单数据变化处理
  const handleFormDataChange = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <OnboardingPageFilters
          filters={filters}
          departmentOptions={departmentOptions}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onSearch={handleSearch}
        />

        {/* 操作按钮栏 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button onClick={handleOpenFormModal}>
            <Plus className="w-4 h-4" />
            新增入职
          </Button>

          {batchMode === 'none' && (
            <>
              <Button variant="blue" onClick={() => setBatchMode('approve')}>
                批量通过
              </Button>
              <Button variant="destructive" onClick={() => setBatchMode('reject')}>
                批量驳回
              </Button>
              <Button onClick={() => setBatchMode('export')}>
                <Download className="w-4 h-4" />
                导出
              </Button>
            </>
          )}

          {batchMode !== 'none' && (
            <>
              {batchMode === 'approve' && (
                <Button variant="blue" onClick={handleBatchApprove} disabled={selectedRowKeys.length === 0}>
                  确认通过 ({selectedRowKeys.length})
                </Button>
              )}
              {batchMode === 'reject' && (
                <Button variant="destructive" onClick={handleBatchReject} disabled={selectedRowKeys.length === 0}>
                  确认驳回 ({selectedRowKeys.length})
                </Button>
              )}
              {batchMode === 'export' && (
                <Button onClick={handleExport}>
                  确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setBatchMode('none'); setSelectedRowKeys([]); }}>
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <OnboardingPageTable
        dataSource={filteredData}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, size) => setPagination({ current: page, pageSize: size, total: pagination.total }),
        }}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        batchMode={batchMode}
        onOpenDetail={handleOpenDetailModal}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* 新增/编辑表单弹窗 */}
      <OnboardingPageCreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleSubmit}
        departmentOptions={departmentOptions}
      />

      {/* 详情弹窗 */}
      <OnboardingPageDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
