// ExecuteTab 组件
// 领料出库页面
import { Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useExecuteTab } from './hooks/useExecuteTab';
import {
  ExecuteTabFilters,
  ExecuteTabTable,
  ExecuteDetailModal,
  ExecuteWarningModal,
  ExecuteDeleteConfirmModal,
  ExportTypeModal,
  ExecuteBatchEditModal,
  ExecuteAddModal,
} from './components/ExecuteTab';
import { useExecuteDataStore } from '@/stores/useExecuteDataStore';
import type { MaterialReceivingRecord } from '@/types/materialReceiving';
import { showAlert } from '@/lib/dialogService';

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

  // 获取 store 实例（用于批量编辑等场景读取数据）
  const executeStore = useExecuteDataStore();

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
        onBatchDeleteClick={() => { setExecuteBatchEditMode('delete'); }}
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
      <ExecuteAddModal
        isOpen={executeShowAddModal}
        addForm={executeAddForm}
        onFormChange={setExecuteAddForm}
        materialPool={executeMaterialPool}
        onAddToMaterialPool={handleAddToMaterialPool}
        onRemoveFromMaterialPool={handleRemoveFromMaterialPool}
        onUpdateMaterialPoolQuantity={handleUpdateMaterialPoolQuantity}
        selectedApplicationCode={executeSelectedApplicationCode}
        onSelectApplicationCode={setExecuteSelectedApplicationCode}
        selectedMaterialIndices={executeSelectedMaterialIndices}
        onToggleMaterialIndex={(idx) => {
          const newSet = new Set(executeSelectedMaterialIndices);
          if (newSet.has(idx)) {
            newSet.delete(idx);
          } else {
            newSet.add(idx);
          }
          setExecuteSelectedMaterialIndices(newSet);
        }}
        materialActualQuantities={executeMaterialActualQuantities}
        onMaterialActualQuantityChange={(idx, qty) => {
          setExecuteMaterialActualQuantities({ ...executeMaterialActualQuantities, [idx]: qty });
        }}
        onAddMaterial={handleExecuteAddAddMaterial}
        onRemoveMaterial={handleExecuteAddRemoveMaterial}
        onMaterialChange={handleExecuteAddMaterialChange}
        onClose={handleExecuteCancelAdd}
        onSave={handleExecuteSaveAdd}
      />

      {/* 编辑领料出库弹窗 */}
      {executeShowEditModal && executeSelectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
              <h3 className="text-lg font-semibold text-white">编辑领料出库</h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">出库单号</Label>
                  <Input
                    type="text"
                    value={executeSelectedRecord.code}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">日期</Label>
                  <Input
                    type="date"
                    value={executeEditForm.date}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">申领人</Label>
                  <Input
                    type="text"
                    value={executeEditForm.applicant}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">库存地点</Label>
                  <Select
                    value={executeEditForm.warehouseLocation || 'none'}
                    onValueChange={(val) => setExecuteEditForm({ ...executeEditForm, warehouseLocation: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="仓库A区">仓库A区</SelectItem>
                      <SelectItem value="仓库B区">仓库B区</SelectItem>
                      <SelectItem value="仓库C区">仓库C区</SelectItem>
                      <SelectItem value="仓库D区">仓库D区</SelectItem>
                      <SelectItem value="仓库E区">仓库E区</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">审核人</Label>
                  <Input
                    type="text"
                    value={executeEditForm.reviewer}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">操作人</Label>
                  <Input
                    type="text"
                    value={executeEditForm.operator}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, operator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">生产批次号</Label>
                  <Input
                    type="text"
                    value={executeEditForm.productionBatchCode}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">执行状态</Label>
                  <Select
                    value={executeEditForm.executeStatus || 'none'}
                    onValueChange={(val) => setExecuteEditForm({ ...executeEditForm, executeStatus: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="已出库">已出库</SelectItem>
                      <SelectItem value="部分出库">部分出库</SelectItem>
                      <SelectItem value="待出库">待出库</SelectItem>
                      <SelectItem value="已取消">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 物料明细 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">物料明细</h4>
                  <Button size="sm" variant="secondary" onClick={handleExecuteEditAddMaterial}>
                    <Plus className="w-3 h-3" /> 添加物料
                  </Button>
                </div>
                {executeEditForm.materials.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm min-w-[1200px]">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-semibold w-10">操作</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">来源单号</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">物料编码</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">物料名称</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">批次号</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">规格</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">单位</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">申领数量</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">实际库存</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">本次实发</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">备注</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {executeEditForm.materials.map((mat, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExecuteEditRemoveMaterial(idx)}
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.applicationCode || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'applicationCode', e.target.value)}
                                className="w-24 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.materialCode || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-24 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.materialName || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-20 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.batchNo || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'batchNo', e.target.value)}
                                className="w-18 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.spec || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-16 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.unit || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-12 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                value={mat.requestedQuantity || 0}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className="w-16 h-7 px-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                value={mat.stockQuantity || 0}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-16 h-7 px-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                value={mat.actualQuantity || 0}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                                className="w-16 h-7 px-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="text"
                                value={mat.remark || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-20 h-7 px-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={handleExecuteCancelEdit}>
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button variant="default" onClick={handleExecuteSaveEdit}>
                <Save className="w-4 h-4" /> 保存
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
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button variant="destructive" onClick={confirmExecuteDelete}>
                <Trash2 className="w-4 h-4" /> 确认删除
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

      {/* 批量删除确认弹窗 */}
      <ExecuteDeleteConfirmModal
        show={executeShowBatchDeleteConfirm}
        count={executeSelectedRows.length}
        onCancel={() => setExecuteShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          executeStore.deleteItems(executeSelectedRows);
          setExecuteShowBatchDeleteConfirm(false);
          setExecuteSelectedRows([]);
          setExecuteBatchEditMode(null);
          showAlert(`已删除 ${executeSelectedRows.length} 项领料出库记录`);
        }}
      />

      {/* 批量编辑出库弹窗 */}
      <ExecuteBatchEditModal
        show={executeShowBatchEditModal}
        selectedRows={executeSelectedRows}
        recordsList={executeStore.items.filter(r => executeSelectedRows.includes(r.id))}
        onClose={() => { setExecuteShowBatchEditModal(false); }}
        onSaveAll={async (editedRecords) => {
          // 持久化所有编辑到数据库
          for (const [id, updates] of Object.entries(editedRecords)) {
            await executeStore.updateItem(id, updates as any);
          }
          setExecuteShowBatchEditModal(false);
          setExecuteBatchEditMode(null);
          setExecuteSelectedRows([]);
          showAlert(`批量编辑成功，已保存 ${Object.keys(editedRecords).length} 条记录`);
        }}
      />
    </>
  );
}
