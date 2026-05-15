// ExecuteTab 组件
// 领料出库页面
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useExecuteTab } from './hooks/useExecuteTab';
import {
  ExecuteTabFilters,
  ExecuteTabTable,
  ExecuteDetailModal,
  ExecuteWarningModal,
  ExecuteDeleteConfirmModal,
  ExportTypeModal,
  ExecuteBatchEditModal,
} from './components/ExecuteTab';
import { materialExecuteDetails } from '@/data/materialReceivingData';
import type { MaterialReceivingRecord } from '@/types/materialReceiving';

// Props接口定义
interface ExecuteTabProps {
  materialData?: MaterialReceivingRecord[];
}

/**
 * ExecuteTab 组件
 * 领料出库页面，包含出库单搜索、表格、详情、编辑、新增等功能
 */
export default function ExecuteTab({ materialData = [] }: ExecuteTabProps) {
  const {
    // 搜索状态
    executeSearchCode,
    setExecuteSearchCode,
    executeSearchApplicant,
    setExecuteSearchApplicant,
    executeSearchBatchCode,
    setExecuteSearchBatchCode,
    executeSearchWarehouse,
    setExecuteSearchWarehouse,
    executeStatusFilter,
    setExecuteStatusFilter,

    // 分页状态
    executeCurrentPage,
    setExecuteCurrentPage,
    executePageSize,
    setExecutePageSize,

    // 导出模式状态
    executeExportMode,
    setExecuteExportMode,
    executeSelectedRows,
    setExecuteSelectedRows,
    executeShowExportTypeModal,
    setExecuteShowExportTypeModal,
    executeExportFileType,
    setExecuteExportFileType,

    // 详情/编辑/新增弹窗状态
    executeShowDetailModal,
    setExecuteShowDetailModal,
    executeShowEditModal,
    setExecuteShowEditModal,
    executeShowDeleteConfirm,
    setExecuteShowDeleteConfirm,
    executeShowAddModal,
    setExecuteShowAddModal,
    executeSelectedRecord,
    setExecuteSelectedRecord,
    executeDeletingId,
    setExecuteDeletingId,

    // 展开行状态
    executeExpandedRows,
    toggleExecuteExpandRow,

    // 批量编辑模式状态
    executeBatchEditMode,
    setExecuteBatchEditMode,
    executeShowBatchEditModal,
    setExecuteShowBatchEditModal,
    executeShowBatchDeleteConfirm,
    setExecuteShowBatchDeleteConfirm,
    executeShowEditWarning,
    setExecuteShowEditWarning,
    executeShowDeleteWarning,
    setExecuteShowDeleteWarning,
    executeBatchEditedRecords,
    setExecuteBatchEditedRecords,
    executeCurrentBatchEditIndex,
    setExecuteCurrentBatchEditIndex,

    // 物料池状态
    executeSelectedApplicationCode,
    setExecuteSelectedApplicationCode,
    executeSelectedMaterialIndices,
    setExecuteSelectedMaterialIndices,
    executeMaterialActualQuantities,
    setExecuteMaterialActualQuantities,
    executeMaterialPool,
    setExecuteMaterialPool,

    // 编辑表单状态
    executeEditForm,
    setExecuteEditForm,

    // 新增表单状态
    executeAddForm,
    setExecuteAddForm,

    // 过滤后的数据
    executeFilteredData,
    executeTotalPages,

    // 处理函数
    handleExecuteReset,
    handleExecuteSelectAll,
    handleExecuteSelectRow,
    handleExecuteExportClick,
    confirmExecuteExport,
    handleExecuteCancelExport,
    handleExecuteView,
    handleExecuteAdd,
    handleAddToMaterialPool,
    handleRemoveFromMaterialPool,
    handleUpdateMaterialPoolQuantity,
    handleExecuteEdit,
    handleExecuteDeleteClick,
    confirmExecuteDelete,
    handleExecuteSaveEdit,
    handleExecuteSaveAdd,
    handleExecuteCancelAdd,
    handleExecuteCancelEdit,
    handleExecuteCancelDetail,
    handleExecuteEditAddMaterial,
    handleExecuteEditRemoveMaterial,
    handleExecuteEditMaterialChange,
    handleExecuteAddAddMaterial,
    handleExecuteAddRemoveMaterial,
    handleExecuteAddMaterialChange,
  } = useExecuteTab(materialData);

  return (
    <>
      {/* 搜索区域 */}
      <ExecuteTabFilters
        executeSearchCode={executeSearchCode}
        setExecuteSearchCode={setExecuteSearchCode}
        executeSearchApplicant={executeSearchApplicant}
        setExecuteSearchApplicant={setExecuteSearchApplicant}
        executeSearchBatchCode={executeSearchBatchCode}
        setExecuteSearchBatchCode={setExecuteSearchBatchCode}
        executeSearchWarehouse={executeSearchWarehouse}
        setExecuteSearchWarehouse={setExecuteSearchWarehouse}
        executeStatusFilter={executeStatusFilter}
        setExecuteStatusFilter={setExecuteStatusFilter}
        onReset={handleExecuteReset}
      />

      {/* 数据表格 */}
      <ExecuteTabTable
        data={executeFilteredData}
        totalCount={executeFilteredData.length}
        currentPage={executeCurrentPage}
        pageSize={executePageSize}
        totalPages={executeTotalPages}
        expandedRows={executeExpandedRows}
        exportMode={executeExportMode}
        batchEditMode={executeBatchEditMode}
        selectedRows={executeSelectedRows}
        onSelectAll={handleExecuteSelectAll}
        onSelectRow={handleExecuteSelectRow}
        onToggleExpand={toggleExecuteExpandRow}
        onView={handleExecuteView}
        onEdit={handleExecuteEdit}
        onDelete={handleExecuteDeleteClick}
        onPageChange={setExecuteCurrentPage}
        onPageSizeChange={setExecutePageSize}
        onExportClick={handleExecuteExportClick}
        onCancelExport={handleExecuteCancelExport}
        onExportConfirm={confirmExecuteExport}
        onBatchEditClick={() => { setExecuteBatchEditMode('edit'); setExecuteShowEditWarning(true); }}
        onBatchDeleteClick={() => { setExecuteBatchEditMode('delete'); setExecuteShowDeleteWarning(true); }}
        onBatchEditConfirm={() => { setExecuteShowBatchEditModal(true); }}
        onBatchDeleteConfirm={() => { setExecuteShowBatchDeleteConfirm(true); }}
        onBatchCancel={() => { setExecuteBatchEditMode(null); setExecuteSelectedRows([]); }}
        onAdd={handleExecuteAdd}
      />

      {/* 查看详情弹窗 */}
      <ExecuteDetailModal
        isOpen={executeShowDetailModal}
        record={executeSelectedRecord}
        onClose={() => setExecuteShowDetailModal(false)}
      />

      {/* 新增领料出库弹窗 */}
      {executeShowAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">新增领料出库</h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <p className="text-sm text-gray-600">新增功能开发中...</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={handleExecuteCancelAdd}>
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑领料出库弹窗 */}
      {executeShowEditModal && executeSelectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600">
              <h3 className="text-lg font-semibold text-white">编辑领料出库</h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <p className="text-sm text-gray-600">编辑功能开发中...</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={handleExecuteCancelEdit}>
                取消
              </Button>
              <Button variant="default" onClick={handleExecuteSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {executeShowDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500">确定要删除这条领料出库记录吗？此操作不可撤销。</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setExecuteShowDeleteConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmExecuteDelete}>
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 导出类型选择弹窗 */}
      <ExportTypeModal
        isOpen={executeShowExportTypeModal}
        exportFileType={executeExportFileType}
        onChange={setExecuteExportFileType}
        onConfirm={confirmExecuteExport}
        onClose={() => setExecuteShowExportTypeModal(false)}
      />

      {/* 编辑警告弹窗 */}
      <ExecuteWarningModal
        show={executeShowEditWarning}
        type="edit"
        onCancel={() => { setExecuteShowEditWarning(false); setExecuteBatchEditMode(null); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowEditWarning(false); }}
      />

      {/* 删除警告弹窗 */}
      <ExecuteWarningModal
        show={executeShowDeleteWarning}
        type="delete"
        onCancel={() => { setExecuteShowDeleteWarning(false); setExecuteBatchEditMode(null); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowDeleteWarning(false); }}
      />

      {/* 批量删除确认弹窗 */}
      <ExecuteDeleteConfirmModal
        show={executeShowBatchDeleteConfirm}
        count={executeSelectedRows.length}
        onCancel={() => setExecuteShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          setExecuteShowBatchDeleteConfirm(false);
          setExecuteSelectedRows([]);
          setExecuteBatchEditMode(null);
          alert(`已删除 ${executeSelectedRows.length} 项领料出库记录`);
        }}
      />

      {/* 批量编辑出库弹窗 */}
      <ExecuteBatchEditModal
        show={executeShowBatchEditModal}
        selectedRows={executeSelectedRows}
        batchEditedRecords={executeBatchEditedRecords}
        currentBatchEditIndex={executeCurrentBatchEditIndex}
        recordsList={materialExecuteDetails.filter(r => executeSelectedRows.includes(r.id))}
        onClose={() => { setExecuteShowBatchEditModal(false); setExecuteBatchEditedRecords({}); setExecuteCurrentBatchEditIndex(0); }}
        onRecordChange={(idx) => setExecuteCurrentBatchEditIndex(idx)}
        onSaveAll={() => {
          setExecuteShowBatchEditModal(false);
          setExecuteBatchEditedRecords({});
          setExecuteCurrentBatchEditIndex(0);
          setExecuteBatchEditMode(null);
          setExecuteSelectedRows([]);
          alert('批量编辑成功');
        }}
      />
    </>
  );
}
