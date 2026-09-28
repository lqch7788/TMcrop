import { useCallback, useState } from 'react';
import { Archive, Download, Plus, Trash2, X } from 'lucide-react';
import { useMaterialReturn } from './hooks/useMaterialReturn';
import { AddFormData, EditFormData } from './types';
import { Button } from '@/components/ui';
import { DeleteConfirmModal as UiDeleteConfirmModal } from '@/components/ui';
import { MaterialReturnHeader } from './MaterialReturnHeader';
import { MaterialReturnSearch } from './MaterialReturnSearch';
import { MaterialReturnSummaryCards } from './MaterialReturnSummaryCards';
import { MaterialReturnTable } from './MaterialReturnTable';
import { Pagination } from '@/components/ui';
import { DetailModal } from './modals/DetailModal';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { VoidModal } from './modals/VoidModal';
import { MaterialSelectModal } from './modals/MaterialSelectModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { ExportTypeModal } from './modals/ExportTypeModal';
import { WarningModal } from './modals/WarningModal';
import { EditAlertModal } from './modals/EditAlertModal';
// 2026-09-28 新增：已删除单据归档追溯入口（后端删除退料单时已写入归档快照）
import { DeletedDocumentsModal } from '@/pages/material/tabs/components/DeletedDocumentsModal';

export function MaterialReturnPage() {
  const hook = useMaterialReturn();
  // 已删除单据归档弹窗开关
  const [showDeletedDocs, setShowDeletedDocs] = useState(false);

  // 表单字段变更（类型化，替代此前的 (prev: any) 与 @ts-expect-error）
  const handleEditFormChange = useCallback((field: keyof EditFormData, value: string) => {
    hook.setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddFormChange = useCallback((field: keyof AddFormData, value: string) => {
    hook.setAddForm(prev => ({ ...prev, [field]: value }));
  }, []);

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
        {/* 统计摘要卡片（2026-09-28 新增，对齐领料页；基于全量数据，不随筛选变化） */}
        <MaterialReturnSummaryCards records={hook.allRecords} />
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">生产退料单列表</h3>
            {/* 快捷筛选（2026-09-28 新增，对齐领料页） */}
            {!hook.exportMode && !hook.deleteMode && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={hook.myApplicationsOnly ? 'default' : 'secondary'}
                  onClick={() => { hook.setMyApplicationsOnly(!hook.myApplicationsOnly); hook.setCurrentPage(1); }}
                >
                  我的申请
                </Button>
                <Button
                  size="sm"
                  variant={hook.pendingMyApproval ? 'default' : 'secondary'}
                  onClick={() => { hook.setPendingMyApproval(!hook.pendingMyApproval); hook.setCurrentPage(1); }}
                >
                  待我审批
                </Button>
              </div>
            )}
          </div>
          {hook.exportMode ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={hook.handleExportClick}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={hook.handleCancelExport}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* 新增按钮 - 不在删除模式下显示 */}
              {!hook.deleteMode && (
                <Button size="sm" onClick={() => hook.setShowAddModal(true)}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {/* 批量删除入口（2026-09-28：移除批量编辑入口，编辑改为行级操作） */}
              {!hook.deleteMode && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { hook.setShowDeleteWarning(true); }}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
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

              {!hook.deleteMode && (
                <Button size="sm" onClick={() => hook.setExportMode(true)}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
              {/* 已删除单据归档追溯（2026-09-28 新增：删除时已写快照，此前无查看入口） */}
              {!hook.exportMode && !hook.deleteMode && (
                <Button size="sm" variant="secondary" onClick={() => setShowDeletedDocs(true)}>
                  <Archive className="w-4 h-4" />
                  已删除单据
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
          deleteMode={hook.deleteMode}
          onToggleExpand={hook.toggleExpandRow}
          onSelectRow={hook.handleSelectRow}
          onSelectAll={hook.handleSelectAll}
          onView={hook.handleView}
          onEdit={hook.handleEdit}
          onDelete={(item) => hook.handleDeleteClick(item.id)}
          onWithdraw={hook.handleWithdraw}
          onResubmit={hook.handleResubmit}
          onDuplicate={hook.handleDuplicate}
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

      {/* 批量编辑弹窗已移除（2026-09-28：编辑改为行级操作，不再提供工具栏批量编辑入口） */}

      {/* 作废申请弹窗 */}
      <VoidModal
        open={hook.showVoidModal}
        record={hook.selectedRecord}
        voidReason={hook.voidReason}
        onClose={() => hook.setShowVoidModal(false)}
        onSubmit={hook.submitVoidApply}
        onReasonChange={hook.setVoidReason}
      />

      {/* 删除确认弹窗（单条） */}
      <DeleteConfirmModal
        open={hook.showDeleteConfirm}
        onClose={() => hook.setShowDeleteConfirm(false)}
        onConfirm={hook.confirmDelete}
      />

      {/* 批量删除确认弹窗（2026-09-28 改用 UI 库组件，此前为手写原生 HTML 弹窗） */}
      <UiDeleteConfirmModal
        isOpen={hook.showBatchDeleteConfirm}
        selectedCount={hook.selectedRows.length}
        onClose={() => hook.setShowBatchDeleteConfirm(false)}
        onConfirm={hook.confirmBatchDelete}
        title="批量删除退料单"
        impactHint="删除后系统会自动回收此前恢复的库存。若库存已被后续使用不足回收，删除将整体失败并回滚（不会出现部分删除）。"
      />

      {/* 导出类型选择弹窗 */}
      <ExportTypeModal
        isOpen={hook.showExportTypeModal}
        exportFileType={hook.exportFileType}
        onClose={() => hook.setShowExportTypeModal(false)}
        onConfirm={hook.confirmExport}
        onTypeChange={hook.setExportFileType}
      />

      {/* 删除警告弹窗 */}
      <WarningModal
        open={hook.showDeleteWarning}
        type="delete"
        onClose={() => { hook.setShowDeleteWarning(false); }}
        onConfirm={() => { hook.setShowDeleteWarning(false); hook.setDeleteMode(true); hook.setSelectedRows([]); }}
      />

      {/* 编辑提示弹窗 */}
      <EditAlertModal
        open={hook.showEditAlert}
        message={hook.editAlertMessage}
        onClose={() => hook.setShowEditAlert(false)}
        onVoidApply={hook.handleVoidApply}
      />

      {/* 已删除单据归档弹窗（预筛选为生产退料单类型） */}
      <DeletedDocumentsModal
        isOpen={showDeletedDocs}
        onClose={() => setShowDeletedDocs(false)}
        defaultType="material_return"
      />
    </div>
  );
}
