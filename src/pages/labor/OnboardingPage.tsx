/**
 * 入职办理页面 - 人工管理模块
 * 使用通用组件实现完整功能
 */
import { UserPlus, Plus, Download } from 'lucide-react';
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
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">入职办理</h1>
            <p className="text-xs text-gray-500">员工入职申请与管理</p>
          </div>
        </div>
      </div>

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
          <button
            onClick={handleOpenFormModal}
            className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            新增入职
          </button>

          {batchMode === 'none' && (
            <>
              <button
                onClick={() => setBatchMode('approve')}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                批量通过
              </button>
              <button
                onClick={() => setBatchMode('reject')}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                批量驳回
              </button>
              <button
                onClick={() => setBatchMode('export')}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </>
          )}

          {batchMode !== 'none' && (
            <>
              {batchMode === 'approve' && (
                <button
                  onClick={handleBatchApprove}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  确认通过 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'reject' && (
                <button
                  onClick={handleBatchReject}
                  disabled={selectedRowKeys.length === 0}
                  className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  确认驳回 ({selectedRowKeys.length})
                </button>
              )}
              {batchMode === 'export' && (
                <button
                  onClick={handleExport}
                  className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
                </button>
              )}
              <button
                onClick={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
                className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
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
