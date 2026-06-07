/**
 * 离职申请页面 - 人工管理模块
 * 功能：提交离职申请、查看离职记录、状态筛选、审批功能
 */
import { useState } from 'react';
import { LogOut, Plus, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useResignationPage } from './hooks/useResignationPage';
import { ResignationPageFilters } from './components/ResignationPage/ResignationPageFilters';
import { ResignationPageTable } from './components/ResignationPage/ResignationPageTable';
import { ResignationPageCreateModal } from './components/ResignationPage/ResignationPageModals/CreateModal';
import { ResignationPageDetailModal } from './components/ResignationPage/ResignationPageModals/DetailModal';
import { Button } from '@/components/ui';

export default function ResignationPage() {
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
    // 方法
    setPagination,
    setIsFormModalOpen,
    setIsDetailModalOpen,
    setSelectedRowKeys,
    setBatchMode,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    handleOpenFormModal,
    handleOpenDetailModal,
    handleWorkerChange,
    handleHandoverUserChange,
    handleResignationTypeChange,
    handleSubmit,
    handleApprove,
    handleReject,
    handleBatchApprove,
    handleBatchReject,
    handleExport,
    setFormData,
  } = useResignationPage();

  // 统计各状态数量
  const statusCounts = {
    待审批: filteredData.filter((r) => r.status === '待审批').length,
    已通过: filteredData.filter((r) => r.status === '已通过').length,
    已拒绝: filteredData.filter((r) => r.status === '已拒绝').length,
  };

  // 表单数据变化处理
  const handleFormDataChange = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 - 紧凑型彩色背景 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700">{statusCounts.待审批}</p>
              <p className="text-xs text-amber-600">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-700">{statusCounts.已通过}</p>
              <p className="text-xs text-green-600">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-700">{statusCounts.已拒绝}</p>
              <p className="text-xs text-red-600">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <ResignationPageFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onSearch={handleSearch}
      />

      {/* 数据表格 */}
      <ResignationPageTable
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
        onOpenFormModal={handleOpenFormModal}
        onBatchApprove={() => setBatchMode('approve')}
        onBatchReject={() => setBatchMode('reject')}
        onBatchExport={() => setBatchMode('export')}
        onConfirmBatchApprove={handleBatchApprove}
        onConfirmBatchReject={handleBatchReject}
        onConfirmBatchExport={handleExport}
        onCancelBatch={() => { setBatchMode('none'); setSelectedRowKeys([]); }}
      />

      {/* 新增表单弹窗 */}
      <ResignationPageCreateModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        formData={formData}
        onWorkerChange={handleWorkerChange}
        onHandoverUserChange={handleHandoverUserChange}
        onResignationTypeChange={handleResignationTypeChange}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleSubmit}
      />

      {/* 详情弹窗 */}
      <ResignationPageDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
