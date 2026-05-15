// ApplicationTab 组件 - 领料申请单页面主组件
// 负责组合所有子组件，呈现完整的领料申请单功能
import { useApplicationTab } from './hooks/useApplicationTab';

// 导入子组件
import { ApplicationFilters } from './components/ApplicationFilters';
import { ApplicationTable } from './components/ApplicationTable';
import { EditModal, AddModal } from './components/ApplicationModals';

// 弹窗组件
import { ExportTypeModal } from '../../../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../../../components/materialReceiving/modals/DetailModal';
import { DeleteConfirm } from '../../../components/materialReceiving/modals/DeleteConfirm';
import { VoidModal } from '../../../components/materialReceiving/modals/VoidModal';
import { BatchEditModal } from '../../../components/materialReceiving/modals/BatchEditModal';
import { EditWarningModal } from '../../../components/materialReceiving/modals/EditWarningModal';
import { DeleteWarningModal } from '../../../components/materialReceiving/modals/DeleteWarningModal';
import { BatchDeleteConfirmModal } from '../../../components/materialReceiving/modals/BatchDeleteConfirmModal';

// ============================================
// 领料申请单页面主组件
// ============================================
export default function ApplicationTab() {
  // 使用自定义hook管理所有状态和逻辑（数据从 Zustand Store 获取）
  const hook = useApplicationTab();

  // ============================================
  // JSX - 领料申请单Tab内容
  // ============================================
  return (
    <>
      {/* 筛选器区域 */}
      <ApplicationFilters
        searchCode={hook.searchCode}
        setSearchCode={hook.setSearchCode}
        searchApplicant={hook.searchApplicant}
        setSearchApplicant={hook.setSearchApplicant}
        searchBatchCode={hook.searchBatchCode}
        setSearchBatchCode={hook.setSearchBatchCode}
        searchWarehouse={hook.searchWarehouse}
        setSearchWarehouse={hook.setSearchWarehouse}
        statusFilter={hook.statusFilter}
        setStatusFilter={hook.setStatusFilter}
        onReset={hook.handleReset}
        onPageChange={hook.setCurrentPage}
      />

      {/* 表格区域 */}
      <ApplicationTable
        filteredData={hook.filteredData}
        currentPage={hook.currentPage}
        pageSize={hook.pageSize}
        totalPages={hook.totalPages}
        onPageChange={hook.setCurrentPage}
        onPageSizeChange={hook.setPageSize}
        exportMode={hook.exportMode}
        selectedRows={hook.selectedRows}
        onExportModeChange={hook.setExportMode}
        onExportClick={hook.handleExportClick}
        onCancelExport={hook.handleCancelExport}
        batchEditMode={hook.batchEditMode}
        onBatchEditModeChange={hook.setBatchEditMode}
        onShowEditWarning={() => hook.setShowEditWarning(true)}
        onShowDeleteWarning={() => hook.setShowDeleteWarning(true)}
        onSelectAll={hook.handleSelectAll}
        onSelectRow={hook.handleSelectRow}
        expandedRows={hook.expandedRows}
        onToggleExpand={hook.toggleExpandRow}
        onView={hook.handleView}
        onEdit={hook.handleEdit}
        onDeleteClick={hook.handleDeleteClick}
        onAddModalOpen={() => hook.setShowAddModal(true)}
        onShowBatchEditModal={() => hook.setShowBatchEditModal(true)}
        onShowBatchDeleteConfirm={() => hook.setShowBatchDeleteConfirm(true)}
        onBatchCancel={() => { hook.setBatchEditMode(false); hook.setSelectedRows([]); }}
      />

      {/* 查看详情弹窗 */}
      {hook.showDetailModal && hook.selectedRecord && (
        <DetailModal
          isOpen={hook.showDetailModal}
          record={hook.selectedRecord}
          onClose={() => hook.setShowDetailModal(false)}
        />
      )}

      {/* 编辑弹窗 */}
      <EditModal
        isOpen={hook.showEditModal}
        record={hook.selectedRecord}
        editForm={hook.editForm}
        onFormChange={hook.setEditForm}
        onClose={() => hook.setShowEditModal(false)}
        onAddMaterial={hook.handleEditAddMaterial}
        onRemoveMaterial={hook.handleEditRemoveMaterial}
        onMaterialChange={hook.handleEditMaterialChange}
        onSave={hook.handleSaveEdit}
        onVoidApply={hook.handleVoidApply}
      />

      {/* 新增弹窗 */}
      <AddModal
        isOpen={hook.showAddModal}
        addForm={hook.addForm}
        onFormChange={hook.setAddForm}
        onClose={hook.handleCancelAdd}
        onAddMaterial={hook.handleAddMaterial}
        onRemoveMaterial={hook.handleRemoveMaterial}
        onMaterialChange={hook.handleMaterialChange}
        onGenerateCode={hook.handleGenerateAddCode}
        onSave={hook.handleSaveAdd}
      />

      {/* 删除确认弹窗 */}
      {hook.showDeleteConfirm && (
        <DeleteConfirm
          isOpen={hook.showDeleteConfirm}
          onClose={() => hook.setShowDeleteConfirm(false)}
          onConfirm={hook.confirmDelete}
        />
      )}

      {/* 作废弹窗 */}
      {hook.showVoidModal && (
        <VoidModal
          isOpen={hook.showVoidModal}
          reason={hook.voidReason}
          onChange={hook.setVoidReason}
          onClose={() => hook.setShowVoidModal(false)}
          onConfirm={hook.submitVoidApply}
        />
      )}

      {/* 编辑提醒弹窗 */}
      {hook.showEditAlert && (
        <EditWarningModal
          isOpen={hook.showEditAlert}
          message={hook.editAlertMessage}
          onClose={() => hook.setShowEditAlert(false)}
        />
      )}

      {/* 删除提醒弹窗 */}
      {hook.showDeleteWarning && (
        <DeleteWarningModal
          show={hook.showDeleteWarning}
          onCancel={() => { hook.setShowDeleteWarning(false); hook.setBatchEditMode(false); }}
          onConfirm={() => { hook.setShowDeleteWarning(false); }}
        />
      )}

      {/* 批量编辑弹窗 */}
      {hook.showBatchEditModal && (
        <BatchEditModal
          isOpen={hook.showBatchEditModal}
          selectedRows={hook.selectedRows}
          recordsList={hook.materialData}
          onClose={() => hook.setShowBatchEditModal(false)}
          onSaveAll={async () => {
            // 批量编辑保存：刷新数据后关闭
            hook.setShowBatchEditModal(false);
            hook.setBatchEditMode(false);
            hook.setSelectedRows([]);
          }}
        />
      )}

      {/* 批量删除确认弹窗 */}
      {hook.showBatchDeleteConfirm && (
        <BatchDeleteConfirmModal
          isOpen={hook.showBatchDeleteConfirm}
          count={hook.selectedRows.length}
          onClose={() => hook.setShowBatchDeleteConfirm(false)}
          onConfirm={hook.handleBatchDelete}
        />
      )}

      {/* 导出格式选择弹窗 */}
      <ExportTypeModal
        isOpen={hook.showExportTypeModal}
        exportFileType={hook.exportFileType}
        onChange={hook.setExportFileType}
        onConfirm={hook.confirmExport}
        onClose={() => hook.setShowExportTypeModal(false)}
      />
    </>
  );
}
