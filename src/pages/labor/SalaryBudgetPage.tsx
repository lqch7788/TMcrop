/**
 * 工资预算页面 - 人工管理模块
 * 实现工资预算编制、汇总、导出和提交审批功能
 * 拆分后主组件，组合子组件实现完整功能
 */
import { Wallet } from 'lucide-react';
import { useDepartmentStore } from '../../stores';
import { useSalaryBudget } from './hooks/useSalaryBudget';
import { SalaryBudgetFilters } from './components/SalaryBudgetFilters';
import { SalaryBudgetTable } from './components/SalaryBudgetTable';
import { CreateModal } from './components/SalaryBudgetModals/CreateModal';
import { DetailModal } from './components/SalaryBudgetModals/DetailModal';
import { SummaryModal } from './components/SalaryBudgetModals/SummaryModal';

export default function SalaryBudgetPage() {
  const departments = useDepartmentStore((state) => state.departments);

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
    grandTotal,
    isFormModalOpen,
    setIsFormModalOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    filteredData,
    summaryData,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleOpenSummaryModal,
    handleDeptChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleExport,
  } = useSalaryBudget(departments);

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">工资预算</h1>
            <p className="text-xs text-gray-500">编制月度工资预算，汇总各部门工资数据</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <SalaryBudgetFilters
        filters={filters}
        departments={departments}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onSearch={handleSearch}
        onAdd={handleOpenFormModal}
        onOpenSummary={handleOpenSummaryModal}
        onExport={handleExport}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <SalaryBudgetTable
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
        onSubmit={handleSubmit}
        departments={departments}
        grandTotal={grandTotal}
      />

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* 汇总弹窗 */}
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        summaryData={summaryData}
      />
    </div>
  );
}
