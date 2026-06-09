import { AlertTriangle, ChevronDown, ChevronRight as ChevronRightIcon, Download, Edit, Edit2, Eye, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import type { MaterialReceivingRecord, MaterialItem, MaterialRequestFormState } from '../../types/materialReceiving';
import { showAlert } from '@/lib/dialogService';

interface ApplicationTabProps {
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
  showVoidModal: boolean;
  showEditAlert: boolean;
  showEditWarning: boolean;
  showDeleteWarning: boolean;
  showBatchEditModal: boolean;
  showBatchDeleteConfirm: boolean;
  showExportTypeModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  setShowEditModal: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowAddModal: (v: boolean) => void;
  setShowVoidModal: (v: boolean) => void;
  setShowEditAlert: (v: boolean) => void;
  setShowEditWarning: (v: boolean) => void;
  setShowDeleteWarning: (v: boolean) => void;
  setShowBatchEditModal: (v: boolean) => void;
  setShowBatchDeleteConfirm: (v: boolean) => void;
  setShowExportTypeModal: (v: boolean) => void;
  // 选中记录
  selectedRecord: MaterialReceivingRecord | null;
  setSelectedRecord: (v: MaterialReceivingRecord | null) => void;
  deletingId: number | null;
  setDeletingId: (v: number | null) => void;
  editAlertMessage: string;
  setEditAlertMessage: (v: string) => void;
  voidReason: string;
  setVoidReason: (v: string) => void;
  // 批量编辑状态
  batchEditMode: boolean;
  setBatchEditMode: (v: boolean) => void;
  batchEditedRecords: Record<number, MaterialReceivingRecord>;
  setBatchEditedRecords: (v: Record<number, MaterialReceivingRecord>) => void;
  currentBatchEditIndex: number;
  setCurrentBatchEditIndex: (v: number) => void;
  // 表单状态
  editForm: MaterialRequestFormState & { status: string };
  setEditForm: (v: MaterialRequestFormState & { status: string }) => void;
  addForm: MaterialRequestFormState;
  setAddForm: (v: MaterialRequestFormState) => void;
  exportFileType: string;
  setExportFileType: (v: string) => void;
  // 回调函数
  onView: (record: MaterialReceivingRecord) => void;
  onEdit: (record: MaterialReceivingRecord) => void;
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
  onVoidApply: () => void;
  onSubmitVoid: () => void;
  onSaveAdd: () => void;
  onCancelAdd: () => void;
  onEditAddMaterial: () => void;
  onEditRemoveMaterial: (index: number) => void;
  onEditMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
  onMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  confirmDelete: () => void;
  // 数据
  data: MaterialReceivingRecord[];
  filteredData: MaterialReceivingRecord[];
  totalPages: number;
}

export default function ApplicationTab({
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
  showVoidModal,
  showEditAlert,
  showEditWarning,
  showDeleteWarning,
  showBatchEditModal,
  showBatchDeleteConfirm,
  showExportTypeModal,
  setShowDetailModal,
  setShowEditModal,
  setShowDeleteConfirm,
  setShowAddModal,
  setShowVoidModal,
  setShowEditAlert,
  setShowEditWarning,
  setShowDeleteWarning,
  setShowBatchEditModal,
  setShowBatchDeleteConfirm,
  setShowExportTypeModal,
  selectedRecord,
  setSelectedRecord,
  deletingId,
  setDeletingId,
  editAlertMessage,
  setEditAlertMessage,
  voidReason,
  setVoidReason,
  batchEditMode,
  setBatchEditMode,
  batchEditedRecords,
  setBatchEditedRecords,
  currentBatchEditIndex,
  setCurrentBatchEditIndex,
  editForm,
  setEditForm,
  addForm,
  setAddForm,
  exportFileType,
  setExportFileType,
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
  onVoidApply,
  onSubmitVoid,
  onSaveAdd,
  onCancelAdd,
  onEditAddMaterial,
  onEditRemoveMaterial,
  onEditMaterialChange,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialChange,
  confirmDelete,
  filteredData,
  totalPages,
}: ApplicationTabProps) {
  return (
    <>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label className="block text-sm font-medium text-gray-900 mb-1">领料单号</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索领料单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <Label className="block text-sm font-medium text-gray-900 mb-1">申领人</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索申领人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <Label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索生产计划批次号..."
                value={searchBatchCode}
                onChange={(e) => { setSearchBatchCode(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <Label className="block text-sm font-medium text-gray-900 mb-1">库存地点</Label>
            <Select
              value={searchWarehouse || 'all'}
              onValueChange={(val) => { setSearchWarehouse(val === 'all' ? '' : val); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="仓库A区">仓库A区</SelectItem>
                <SelectItem value="仓库B区">仓库B区</SelectItem>
                <SelectItem value="仓库C区">仓库C区</SelectItem>
                <SelectItem value="仓库D区">仓库D区</SelectItem>
                <SelectItem value="仓库E区">仓库E区</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="block text-sm font-medium text-gray-900 mb-1">审批状态</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="待审批">待审批</SelectItem>
                <SelectItem value="已审批">已审批</SelectItem>
                <SelectItem value="已拒绝">已拒绝</SelectItem>
                <SelectItem value="已作废">已作废</SelectItem>
                <SelectItem value="已取消">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">领料申请单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <Button onClick={onExportClick}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button variant="secondary" onClick={onCancelExport}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
              {/* 编辑删除按钮 - 默认显示 */}
              {!batchEditMode && (
                <>
                  <Button onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}>
                    <Edit className="w-4 h-4" />
                    <Edit2 className="w-4 h-4" /> 编辑
                  </Button>
                  <Button variant="destructive" onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                </>
              )}

              {/* 选择模式下显示确认/取消按钮 */}
              {batchEditMode && (
                <div className="flex gap-2">
                  <Button onClick={() => {
                      if (selectedRows.length === 0) {
                        showAlert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}>
                    <Edit2 className="w-4 h-4" /> 确认编辑
                  </Button>
                  <Button variant="destructive" onClick={() => { setShowBatchDeleteConfirm(true); }}>
                    <Trash2 className="w-4 h-4" /> 确认删除
                  </Button>
                  <Button variant="secondary" onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}>
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </div>
              )}

              {!batchEditMode && (
                <Button onClick={() => setExportMode(true)}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {(exportMode || batchEditMode) && (
                  <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Checkbox
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onCheckedChange={onSelectAll}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                    />
                  </TableHead>
                )}
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">领料单号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料种类</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植区域/用途</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
                  <TableRow key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode) && (
                      <TableCell className="px-4 py-3">
                        <Checkbox
                          checked={selectedRows.includes(item.id)}
                          onCheckedChange={() => onSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleExpand(item.id)}
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700" onClick={() => onView(item)}>{item.code}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.date}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.applicant}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.department}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.plantArea}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.reviewer}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.productionBatchCode}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                          item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                          item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                          item.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                          item.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                          item.statusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                        {item.statusClass === 'rejected' && item.rejectReason && (
                          <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.rejectReason}>
                            原因：{item.rejectReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {item.materials.length > 0 ? item.materials[0].remark : '-'}
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(item.id) && (
                    <TableRow key={`${item.id}-expanded`} className="bg-white">
                      <TableCell colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <TableHeader className="bg-[#F2F6FA]">
                                <TableRow>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">批次号</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</TableHead>
                                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = material.requestedQuantity * material.unitPrice;
                                  const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                  return (
                                    <TableRow key={idx} className="hover:bg-[#F2F6FA]/50">
                                      <TableCell className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.materialName}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800 font-mono">{material.batchNo || ''}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.spec}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.unit}</TableCell>
                                      <TableCell className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</TableCell>
                                      <TableCell className="px-3 py-2 text-sm text-blue-800">{material.remark}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
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
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            onPageChange={(page) => setCurrentPage(page)}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            showPageSize={true}
          />
        </div>
      </div>
    </>
  );
}

