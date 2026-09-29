// ApplicationTab 组件 - 领料申请单页面主组件
// 负责组合所有子组件，呈现完整的领料申请单功能
import { useState } from 'react';
import { useApplicationTab } from './hooks/useApplicationTab';
import { DeletedDocumentsModal } from './components/DeletedDocumentsModal';

// 导入子组件
import { ApplicationFilters } from './components/ApplicationFilters';
import { ApplicationTable } from './components/ApplicationTable';
import { EditModal, AddModal } from './components/ApplicationModals';

// 弹窗组件（2026-09-26：批量编辑死代码已按用户决策删除）
import { ExportTypeModal } from '../../../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../../../components/materialReceiving/modals/DetailModal';
import { DeleteConfirm } from '../../../components/materialReceiving/modals/DeleteConfirm';
import { VoidModal } from '../../../components/materialReceiving/modals/VoidModal';
import { EditWarningModal } from '../../../components/materialReceiving/modals/EditWarningModal';

import { BatchDeleteConfirmModal } from '../../../components/materialReceiving/modals/BatchDeleteConfirmModal';

// ============================================
// 领料申请单页面主组件
// ============================================
export default function ApplicationTab() {
  // 使用自定义hook管理所有状态和逻辑（数据从 Zustand Store 获取）
  const hook = useApplicationTab();
  // 2026-09-27 审计方案：已删除单据归档追溯弹窗
  const [showDeletedDocs, setShowDeletedDocs] = useState(false);

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
        searchDateFrom={hook.searchDateFrom}
        setSearchDateFrom={hook.setSearchDateFrom}
        searchDateTo={hook.searchDateTo}
        setSearchDateTo={hook.setSearchDateTo}
        priorityFilter={hook.priorityFilter}
        setPriorityFilter={hook.setPriorityFilter}
        searchMaterial={hook.searchMaterial}
        setSearchMaterial={hook.setSearchMaterial}
        onReset={hook.handleReset}
        onPageChange={hook.setCurrentPage}
      />

      {/* 表格区域 */}
      <ApplicationTable
        filteredData={hook.filteredData}
        currentPage={hook.currentPage}
        pageSize={hook.pageSize}
        onPageChange={hook.setCurrentPage}
        onPageSizeChange={hook.setPageSize}
        exportMode={hook.exportMode}
        selectedRows={hook.selectedRows}
        onExportModeChange={hook.setExportMode}
        onExportClick={hook.handleExportClick}
        onCancelExport={hook.handleCancelExport}
        batchEditMode={hook.batchEditMode}
        onBatchEditModeChange={hook.setBatchEditMode}
        onSelectAll={hook.handleSelectAll}
        onSelectRow={hook.handleSelectRow}
        expandedRows={hook.expandedRows}
        onToggleExpand={hook.toggleExpandRow}
        onView={hook.handleView}
        onEdit={hook.handleEdit}
        onDeleteClick={hook.handleDeleteClick}
        // 2026-09-26 批次二：行内撤回（仅待审批）与复制
        onWithdraw={hook.handleWithdraw}
        onDuplicate={hook.handleDuplicate}
        onResubmit={hook.handleResubmit}
        onCloseCase={hook.handleCloseCase}
        onReopenCase={hook.handleReopenCase}
        onBatchSubmit={hook.batchSubmit}
        onBatchWithdraw={hook.batchWithdraw}
        myApplicationsOnly={hook.myApplicationsOnly}
        pendingMyApproval={hook.pendingMyApproval}
        overdueOnly={hook.overdueOnly}
        onToggleMyApplications={() => hook.setMyApplicationsOnly(!hook.myApplicationsOnly)}
        onTogglePendingApproval={() => hook.setPendingMyApproval(!hook.pendingMyApproval)}
        onToggleOverdue={() => hook.setOverdueOnly(!hook.overdueOnly)}
        onAddModalOpen={() => hook.setShowAddModal(true)}
        onShowBatchDeleteConfirm={() => hook.setShowBatchDeleteConfirm(true)}
        onShowDeletedDocs={() => setShowDeletedDocs(true)}
        onBatchCancel={() => { hook.setBatchEditMode(null); hook.setSelectedRows([]); }}
      />

      {/* 查看详情弹窗（2026-09-26 批次二：附审批进度 + 操作历史） */}
      {hook.showDetailModal && hook.selectedRecord && (
        <DetailModal
          isOpen={hook.showDetailModal}
          record={hook.selectedRecord}
          approval={hook.detailApproval as any}
          logs={hook.detailLogs as any}
          executions={hook.detailExecutions as any}
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
        saving={hook.isSubmitting}
        onShowMaterialInfo={hook.getMaterialStockInfo}
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
        saving={hook.isSubmitting}
        onShowMaterialInfo={hook.getMaterialStockInfo}
        hasDraft={hook.hasDraft}
        onRestoreDraft={() => { if (hook.restoreDraft()) { hook.setHasDraft(false); hook.discardDraft(); } }}
        onDiscardDraft={hook.discardDraft}
        templates={hook.templates}
        onApplyTemplate={hook.applyTemplate}
        onSaveTemplate={hook.saveAsTemplate}
        onDeleteTemplate={hook.deleteTemplate}
        productionPlans={hook.productionPlans}
      />

      {/* 删除确认弹窗 */}
      {hook.showDeleteConfirm && (
        <DeleteConfirm
          isOpen={hook.showDeleteConfirm}
          onClose={() => hook.setShowDeleteConfirm(false)}
          onConfirm={hook.confirmDelete}
          recordCode={hook.selectedRecord?.code}
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
          recordCode={hook.selectedRecord?.code}
        />
      )}

      {/* 编辑提醒弹窗 */}
      {hook.showEditAlert && (
        <EditWarningModal
          isOpen={hook.showEditAlert}
          title="无法编辑"
          message={hook.editAlertMessage}
          onClose={() => hook.setShowEditAlert(false)}
        />
      )}

      {/* 批量删除确认弹窗 */}
      {hook.showBatchDeleteConfirm && (
        <BatchDeleteConfirmModal
          show={hook.showBatchDeleteConfirm}
          count={hook.selectedRows.length}
          onCancel={() => hook.setShowBatchDeleteConfirm(false)}
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

      {/* 2026-09-27 审计方案：已删除单据归档查询（追溯入口） */}
      <DeletedDocumentsModal
        isOpen={showDeletedDocs}
        onClose={() => setShowDeletedDocs(false)}
        defaultType="material_request"
      />
    </>
  );
}
