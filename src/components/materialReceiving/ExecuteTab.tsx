import { Search, Download, Eye, Edit, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MaterialExecuteRecord, ExecuteMaterialItem, MaterialReceivingRecord } from '../../types/materialReceiving';

interface ExecuteTabProps {
  // 状态
  searchCode: string;
  searchApplicant: string;
  searchBatchCode: string;
  searchWarehouse: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  selectedRows: number[];
  expandedRows: Set<number>;
  exportMode: boolean;
  // 状态设置函数
  setSearchCode: (v: string) => void;
  setSearchApplicant: (v: string) => void;
  setSearchBatchCode: (v: string) => void;
  setSearchWarehouse: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setCurrentPage: (v: number) => void;
  setPageSize: (v: number) => void;
  setSelectedRows: (v: number[]) => void;
  setExpandedRows: (v: Set<number>) => void;
  setExportMode: (v: boolean) => void;
  // 弹窗状态
  showDetailModal: boolean;
  showEditModal: boolean;
  showDeleteConfirm: boolean;
  showAddModal: boolean;
  showExportTypeModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  setShowEditModal: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowAddModal: (v: boolean) => void;
  setShowExportTypeModal: (v: boolean) => void;
  // 选中记录
  selectedRecord: MaterialExecuteRecord | null;
  setSelectedRecord: (v: MaterialExecuteRecord | null) => void;
  deletingId: number | null;
  setDeletingId: (v: number | null) => void;
  // 批量编辑状态
  batchEditMode: boolean;
  setBatchEditMode: (v: boolean) => void;
  showEditWarning: boolean;
  setShowEditWarning: (v: boolean) => void;
  showDeleteWarning: boolean;
  setShowDeleteWarning: (v: boolean) => void;
  showBatchEditModal: boolean;
  setShowBatchEditModal: (v: boolean) => void;
  showBatchDeleteConfirm: boolean;
  setShowBatchDeleteConfirm: (v: boolean) => void;
  // 表单状态
  editForm: {
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    executeStatus: string;
    materials: ExecuteMaterialItem[];
  };
  setEditForm: (v: any) => void;
  addForm: {
    code: string;
    date: string;
    applicant: string;
    warehouseLocation: string;
    reviewer: string;
    productionBatchCode: string;
    materials: ExecuteMaterialItem[];
  };
  setAddForm: (v: any) => void;
  exportFileType: string;
  setExportFileType: (v: string) => void;
  // 新增相关状态
  selectedApplicationCode: string;
  setSelectedApplicationCode: (v: string) => void;
  selectedMaterialIndices: Set<number>;
  setSelectedMaterialIndices: (v: Set<number>) => void;
  materialActualQuantities: Record<number, number>;
  setMaterialActualQuantities: (v: Record<number, number>) => void;
  materialPool: ExecuteMaterialItem[];
  setMaterialPool: (v: ExecuteMaterialItem[]) => void;
  // 回调函数
  onView: (record: MaterialExecuteRecord) => void;
  onEdit: (record: MaterialExecuteRecord) => void;
  onDelete: (id: number) => void;
  onReset: () => void;
  onToggleExpand: (id: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onExportClick: () => void;
  onCancelExport: () => void;
  onConfirmExport: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSaveAdd: () => void;
  onCancelAdd: () => void;
  onEditAddMaterial: () => void;
  onEditRemoveMaterial: (index: number) => void;
  onEditMaterialChange: (index: number, field: keyof ExecuteMaterialItem, value: any) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof ExecuteMaterialItem, value: any) => void;
  onAddToMaterialPool: () => void;
  onRemoveFromMaterialPool: (index: number) => void;
  onUpdateMaterialPoolQuantity: (index: number, actualQuantity: number) => void;
  confirmDelete: () => void;
  // 数据
  data: MaterialExecuteRecord[];
  filteredData: MaterialExecuteRecord[];
  totalPages: number;
  materialReceivingDetails: MaterialReceivingRecord[];
}

export default function ExecuteTab({
  searchCode,
  searchApplicant,
  searchBatchCode,
  searchWarehouse,
  statusFilter,
  currentPage,
  pageSize,
  selectedRows,
  expandedRows,
  exportMode,
  setSearchCode,
  setSearchApplicant,
  setSearchBatchCode,
  setSearchWarehouse,
  setStatusFilter,
  setCurrentPage,
  setPageSize,
  setSelectedRows,
  setExpandedRows,
  setExportMode,
  showDetailModal,
  showEditModal,
  showDeleteConfirm,
  showAddModal,
  showExportTypeModal,
  setShowDetailModal,
  setShowEditModal,
  setShowDeleteConfirm,
  setShowAddModal,
  setShowExportTypeModal,
  selectedRecord,
  setSelectedRecord,
  deletingId,
  setDeletingId,
  batchEditMode,
  setBatchEditMode,
  showEditWarning,
  setShowEditWarning,
  showDeleteWarning,
  setShowDeleteWarning,
  showBatchEditModal,
  setShowBatchEditModal,
  showBatchDeleteConfirm,
  setShowBatchDeleteConfirm,
  editForm,
  setEditForm,
  addForm,
  setAddForm,
  exportFileType,
  setExportFileType,
  selectedApplicationCode,
  setSelectedApplicationCode,
  selectedMaterialIndices,
  setSelectedMaterialIndices,
  materialActualQuantities,
  setMaterialActualQuantities,
  materialPool,
  setMaterialPool,
  onView,
  onEdit,
  onDelete,
  onReset,
  onToggleExpand,
  onSelectAll,
  onSelectRow,
  onExportClick,
  onCancelExport,
  onConfirmExport,
  onSaveEdit,
  onCancelEdit,
  onSaveAdd,
  onCancelAdd,
  onEditAddMaterial,
  onEditRemoveMaterial,
  onEditMaterialChange,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  onAddToMaterialPool,
  onRemoveFromMaterialPool,
  onUpdateMaterialPoolQuantity,
  confirmDelete,
  filteredData,
  totalPages,
  materialReceivingDetails,
}: ExecuteTabProps) {
  return (
    <>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">出库单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索出库单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={searchBatchCode}
                onChange={(e) => { setSearchBatchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={searchWarehouse}
              onChange={(e) => { setSearchWarehouse(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">执行状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待出库">待出库</option>
              <option value="部分出库">部分出库</option>
              <option value="已出库">已出库</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <Button variant="secondary" onClick={onReset}>
            重置
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">出库单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <Button onClick={onExportClick}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button variant="secondary" onClick={onCancelExport}>
                取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {!batchEditMode ? (
                <>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4" />
                    新增
                  </Button>
                  <Button variant="blue" onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}>
                    <Edit className="w-4 h-4" />
                    编辑
                  </Button>
                  <Button variant="destructive" onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                  <Button onClick={() => setExportMode(true)}>
                    <Download className="w-4 h-4" />
                    导出
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}>
                    确认编辑
                  </Button>
                  <Button variant="destructive" onClick={() => { setShowBatchDeleteConfirm(true); }}>
                    确认删除
                  </Button>
                  <Button variant="secondary" onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}>
                    取消
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onChange={onSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode) && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => onSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggleExpand(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700" onClick={() => onView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.productionBatchCode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                        item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                        item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                        item.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.executeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onView(item)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(exportMode || batchEditMode) ? 14 : 13} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申请数量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">实际库存</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次实发</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">差异</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                  const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                  return (
                                    <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                          {material.stockQuantity}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        {material.actualQuantity > 0 ? (
                                          <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                            {material.actualQuantity}
                                          </span>
                                        ) : (
                                          <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                            {material.actualQuantity}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{(material.unitPrice || 0).toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
                                      <td className="px-3 py-2 text-sm">
                                        {material.requestedQuantity - material.actualQuantity > 0 ? (
                                          <span className="text-red-600 font-medium">-{material.requestedQuantity - material.actualQuantity}</span>
                                        ) : (
                                          <span className="text-green-600">0</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onSelectAll}>
                {selectedRows.length === filteredData.length ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

console.log("组件创建成功: ExecuteTab");
