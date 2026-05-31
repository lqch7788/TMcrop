/**
 * 生产计划页面
 * 精简后的主组件，逻辑全部抽取到 useProductionPage hook
 */
import { FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { useProductionPage } from './hooks/useProductionPage';
import { ProductionStatsCards } from './ProductionStatsCards';
import { ProductionFilters } from './ProductionFilters';
import { ProductionTable } from './ProductionTable';
import {
  CreateBatchModal,
  BatchDetailModal,
  BatchEditModal,
  VoidWarningModal,
  DeleteWarningModal,
} from './modals';
import { MaterialExportModal } from '@/components/warehouse/MaterialExportModal';

export default function ProductionPage() {
  const hook = useProductionPage();

  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">生产计划</h1>
              <p className="text-gray-500">管理种植批次、生产计划和技术方案</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ProductionStatsCards batches={hook.batches} />

      {/* Filters */}
      <ProductionFilters
        batchCodeSearch={hook.batchCodeSearch}
        plantingModeSearch={hook.plantingModeSearch}
        cropNameSearch={hook.cropNameSearch}
        varietySearch={hook.varietySearch}
        greenhouseSearch={hook.greenhouseSearch}
        statusFilter={hook.statusFilter}
        planTypeFilter={hook.planTypeFilter}
        onBatchCodeChange={hook.setBatchCodeSearch}
        onPlantingModeChange={hook.setPlantingModeSearch}
        onCropNameChange={hook.setCropNameSearch}
        onVarietyChange={hook.setVarietySearch}
        onGreenhouseChange={hook.setGreenhouseSearch}
        onStatusChange={hook.setStatusFilter}
        onPlanTypeChange={hook.setPlanTypeFilter}
        onReset={hook.resetFilters}
        onSearch={() => {}}
      />

      {/* 生产计划列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">生产计划列表</h3>
          {hook.exportMode ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={hook.handleConfirmExport}>
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={hook.handleCancelExport}>
                取消
              </Button>
            </div>
          ) : hook.batchEditMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="blue"
                onClick={() => hook.setShowBatchEditModal(true)}
                disabled={hook.selectedRows.length === 0}
              >
                批量编辑
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                hook.setBatchEditMode(false);
                hook.setSelectedRows([]);
              }}>
                取消
              </Button>
            </div>
          ) : hook.batchDeleteMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => hook.setShowDeleteWarning(true)}
                disabled={hook.selectedRows.length === 0}
              >
                确认删除
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                hook.setBatchDeleteMode(false);
                hook.setSelectedRows([]);
              }}>
                取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <Button size="sm" onClick={() => hook.setShowCreateModal(true)}>
                  新增
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="blue" onClick={() => {
                  hook.setBatchEditMode(true);
                  hook.setSelectedRows([]);
                }}>
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="destructive" onClick={() => {
                  hook.setBatchDeleteMode(true);
                  hook.setSelectedRows([]);
                }}>
                  删除
                </Button>
              )}
              {canExport && (
                <Button size="sm" onClick={hook.handleExportClick}>
                  导出
                </Button>
              )}
            </div>
          )}
        </div>

        <ProductionTable
          filteredBatches={hook.filteredBatches}
          currentPage={hook.currentPage}
          pageSize={hook.pageSize}
          exportMode={hook.exportMode}
          batchEditMode={hook.batchEditMode}
          batchDeleteMode={hook.batchDeleteMode}
          selectedRows={hook.selectedRows}
          onPageChange={hook.setCurrentPage}
          onPageSizeChange={hook.handlePageSizeChange}
          onSelectRow={hook.handleSelectRow}
          onSelectAll={hook.handleSelectAll}
          onBatchSelectAll={hook.handleBatchSelectAll}
          onBatchDeleteSelectAll={hook.handleBatchDeleteSelectAll}
          onBatchCodeClick={hook.setSelectedBatch}
          onEdit={hook.handleSingleEdit}
          onDelete={hook.handleSingleDelete}
          totalCount={hook.filteredBatches.length}
        />
      </div>

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={hook.showCreateModal}
        onClose={hook.handleClose}
        onSaveDraft={hook.handleSaveDraft}
        onSubmitForApproval={hook.handleSubmitForApproval}
        formData={hook.formData}
        errors={hook.errors}
        greenhouses={hook.greenhouses}
        orders={hook.orders}
        onFormChange={hook.handleFormChange}
        onGenerateCode={hook.generateBatchCode}
      />

      {/* Batch Detail Modal */}
      <BatchDetailModal
        batch={hook.selectedBatch}
        onClose={() => hook.setSelectedBatch(null)}
      />

      {/* Export Format Modal */}
      <MaterialExportModal
        isOpen={hook.showExportModal}
        exportFormat={hook.exportFormat}
        selectedCount={hook.selectedRows.length}
        onFormatChange={hook.setExportFormat}
        onClose={() => hook.setShowExportModal(false)}
        onExport={hook.handleDoExport}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={hook.showBatchEditModal}
        selectedRows={hook.selectedRows}
        batches={hook.batches}
        greenhouses={hook.greenhouses}
        editedBatchCodes={hook.editedBatchCodes}
        editedBatches={hook.editedBatches}
        selectedBatchCode={hook.selectedBatchCode}
        onSelectedBatchCodeChange={hook.setSelectedBatchCode}
        onEditedBatchesChange={hook.setEditedBatches}
        onEditedBatchCodesChange={hook.setEditedBatchCodes}
        onClose={() => hook.setShowBatchEditModal(false)}
        onVoidWarning={() => hook.setShowVoidWarning(true)}
        onPublish={hook.handlePublish}
        onConfirmNext={hook.handleConfirmNext}
      />

      {/* Void Warning Modal */}
      <VoidWarningModal
        isOpen={hook.showVoidWarning}
        onClose={() => hook.setShowVoidWarning(false)}
        onConfirm={hook.handleVoidConfirm}
      />

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={hook.showDeleteWarning}
        selectedCount={hook.selectedRows.length}
        onClose={() => hook.setShowDeleteWarning(false)}
        onConfirm={hook.handleDeleteConfirm}
      />
    </div>
  );
}
