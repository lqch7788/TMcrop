import { useCallback } from 'react';
import { Download, Edit, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useMaterialReturn } from './hooks/useMaterialReturn';
import { Button } from '@/components/ui';
import { MaterialReturnHeader } from './MaterialReturnHeader';
import { MaterialReturnSearch } from './MaterialReturnSearch';
import { MaterialReturnTable } from './MaterialReturnTable';
import { Pagination } from '@/components/ui';
import { DetailModal } from './modals/DetailModal';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { BatchEditModal } from './modals/BatchEditModal';
import { VoidModal } from './modals/VoidModal';
import { MaterialSelectModal } from './modals/MaterialSelectModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { ExportTypeModal } from './modals/ExportTypeModal';
import { WarningModal } from './modals/WarningModal';
import { EditAlertModal } from './modals/EditAlertModal';

export function MaterialReturnPage() {
  const hook = useMaterialReturn();

  const handleEditFormChange = useCallback((field: string, value: string) => {
    // @ts-expect-error - hook.setEditForm 类型暂未定义
    hook.setEditForm((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddFormChange = useCallback((field: string, value: string) => {
    // @ts-expect-error - hook.setAddForm 类型暂未定义
    hook.setAddForm((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleMaterialsChange = useCallback((materials: any[]) => {
    hook.setEditForm((prev: any) => ({ ...prev, materials }));
  }, []);

  const handleBatchSaveAll = useCallback(() => {
    // logger.info('Saving all batch edits:', hook.batchEditedRecords);
    hook.setShowBatchEditModal(false);
    hook.setBatchEditMode(false);
    hook.setSelectedRows([]);
    hook.setBatchEditedRecords({});
    hook.setCurrentBatchEditIndex(0);
  }, [hook.batchEditedRecords]);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <MaterialReturnHeader />

      {/* 搜索区域 */}
      <MaterialReturnSearch
        searchForm={hook.searchForm}
        onUpdateField={hook.updateSearchField}
        onReset={hook.handleReset}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">生产退料单列表</h3>
          {hook.exportMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={hook.handleExportClick}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={hook.handleCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* 新增按钮 - 不在编辑或删除模式下显示 */}
              {!hook.batchEditMode && !hook.deleteMode && (
                <Button
                  size="sm"
                  onClick={() => hook.setShowAddModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {/* 编辑删除按钮 - 默认显示（不在编辑或删除模式下） */}
              {!hook.batchEditMode && !hook.deleteMode && (
                <>
                  <Button
                    size="sm"
                    onClick={() => { hook.setBatchEditMode(true); hook.setShowEditWarning(true); }}
                  >
                    <Edit className="w-4 h-4" />
                    <Edit2 className="w-4 h-4" /> 编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { hook.setShowDeleteWarning(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                </>
              )}

              {/* 删除模式下显示确认删除和取消按钮 */}
              {hook.deleteMode && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => hook.setShowBatchDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" /> 确认删除
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { hook.setDeleteMode(false); hook.setSelectedRows([]); }}
                  >
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </div>
              )}

              {/* 编辑模式下显示确认编辑和取消按钮 */}
              {hook.batchEditMode && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={hook.handleBatchEditWarning}
                  >
                    <Edit2 className="w-4 h-4" /> 确认编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { hook.setBatchEditMode(false); hook.setSelectedRows([]); }}
                  >
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </div>
              )}

              {!hook.batchEditMode && !hook.deleteMode && (
                <Button
                  size="sm"
                  onClick={() => hook.setExportMode(true)}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </div>
          )}
        </div>

        <MaterialReturnTable
          data={hook.filteredReturns.slice((hook.currentPage - 1) * hook.pageSize, hook.currentPage * hook.pageSize)}
          expandedRows={hook.expandedRows}
          selectedRows={hook.selectedRows}
          exportMode={hook.exportMode}
          batchEditMode={hook.batchEditMode}
          deleteMode={hook.deleteMode}
          onToggleExpand={hook.toggleExpandRow}
          onSelectRow={hook.handleSelectRow}
          onSelectAll={hook.handleSelectAll}
          onView={hook.handleView}
        />

        {/* 分页 */}
        <Pagination
          currentPage={hook.currentPage}
          totalPages={hook.totalPages}
          pageSize={hook.pageSize}
          onPageChange={hook.setCurrentPage}
          onPageSizeChange={hook.setPageSize}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>

      {/* 模态弹窗 */}

      {/* 查看详情弹窗 */}
      <DetailModal
        record={hook.selectedRecord}
        open={hook.showDetailModal}
        onClose={() => hook.setShowDetailModal(false)}
      />

      {/* 新增弹窗 */}
      <AddModal
        open={hook.showAddModal}
        form={hook.addForm}
        onClose={hook.handleCancelAdd}
        onSave={hook.handleSaveAdd}
        onRemoveMaterial={hook.handleRemoveMaterial}
        onMaterialChange={hook.handleMaterialChange}
        onFormChange={handleAddFormChange}
        onSelectMaterialsFromSource={hook.handleOpenMaterialSelect}
        onGenerateCode={hook.handleGenerateCode}
      />

      {/* 物料选择弹窗 */}
      <MaterialSelectModal
        open={hook.showMaterialSelectModal}
        sourceAppCode={hook.selectedSourceAppCode}
        onConfirm={hook.handleConfirmMaterialSelect}
        onClose={() => hook.setShowMaterialSelectModal(false)}
      />

      {/* 编辑弹窗 */}
      <EditModal
        open={hook.showEditModal}
        record={hook.selectedRecord}
        form={hook.editForm}
        onClose={() => hook.setShowEditModal(false)}
        onSave={hook.handleSaveEdit}
        onVoidApply={hook.handleVoidApply}
        onFormChange={handleEditFormChange}
        onMaterialChange={hook.handleEditMaterialChange}
        onAddMaterial={hook.handleEditAddMaterial}
        onRemoveMaterial={hook.handleEditRemoveMaterial}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        open={hook.showBatchEditModal}
        selectedRows={hook.selectedRows}
        batchEditedRecords={hook.batchEditedRecords}
        currentBatchEditIndex={hook.currentBatchEditIndex}
        onClose={() => { hook.setShowBatchEditModal(false); hook.setBatchEditedRecords({}); hook.setCurrentBatchEditIndex(0); }}
        onRecordChange={hook.setBatchEditedRecords}
        onIndexChange={hook.setCurrentBatchEditIndex}
        onSaveAll={handleBatchSaveAll}
        onVoidApply={hook.handleVoidApply}
      />

      {/* 作废申请弹窗 */}
      <VoidModal
        open={hook.showVoidModal}
        record={hook.selectedRecord}
        voidReason={hook.voidReason}
        onClose={() => hook.setShowVoidModal(false)}
        onSubmit={hook.submitVoidApply}
        onReasonChange={hook.setVoidReason}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        open={hook.showDeleteConfirm}
        onClose={() => hook.setShowDeleteConfirm(false)}
        onConfirm={hook.confirmDelete}
      />

      {/* 导出类型选择弹窗 */}
      <ExportTypeModal
        isOpen={hook.showExportTypeModal}
        exportFileType={hook.exportFileType}
        onClose={() => hook.setShowExportTypeModal(false)}
        onConfirm={hook.confirmExport}
        onTypeChange={hook.setExportFileType}
      />

      {/* 编辑警告弹窗 */}
      <WarningModal
        open={hook.showEditWarning}
        type="edit"
        onClose={() => { hook.setShowEditWarning(false); hook.setBatchEditMode(false); hook.setSelectedRows([]); }}
        onConfirm={() => hook.setShowEditWarning(false)}
      />

      {/* 删除警告弹窗 */}
      <WarningModal
        open={hook.showDeleteWarning}
        type="delete"
        onClose={() => { hook.setShowDeleteWarning(false); }}
        onConfirm={() => { hook.setShowDeleteWarning(false); hook.setDeleteMode(true); hook.setSelectedRows([]); }}
      />

      {/* 批量删除确认弹窗 */}
      {hook.showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                  <p className="text-sm text-gray-500">此操作不可恢复</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">确定要删除选中的 {hook.selectedRows.length} 条退料记录吗？</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => hook.setShowBatchDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={hook.confirmBatchDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑提示弹窗 */}
      <EditAlertModal
        open={hook.showEditAlert}
        message={hook.editAlertMessage}
        onClose={() => hook.setShowEditAlert(false)}
        onVoidApply={hook.handleVoidApply}
      />
    </div>
  );
}
