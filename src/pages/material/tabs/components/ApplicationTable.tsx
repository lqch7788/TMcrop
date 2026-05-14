// ApplicationTable 组件
// 领料申请单的主表格和展开行
import { Plus, Edit, Trash2, Download, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MaterialReceivingRecord } from '../../../types/materialReceiving';
import type { UseApplicationTabReturn } from '../hooks/useApplicationTab';

interface ApplicationTableProps {
  // 数据
  filteredData: MaterialReceivingRecord[];
  // 分页
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // 导出
  exportMode: boolean;
  selectedRows: number[];
  onExportModeChange: (value: boolean) => void;
  onExportClick: () => void;
  onCancelExport: () => void;
  // 批量编辑
  batchEditMode: boolean;
  onBatchEditModeChange: (value: boolean) => void;
  onShowEditWarning: () => void;
  onShowDeleteWarning: () => void;
  // 选中行
  selectedRows: number[];
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  // 展开行
  expandedRows: Set<number>;
  onToggleExpand: (id: number) => void;
  // 操作
  onView: (item: MaterialReceivingRecord) => void;
  onEdit: (item: MaterialReceivingRecord) => void;
  onDeleteClick: (id: number) => void;
  // 新增
  onAddModalOpen: () => void;
  // 批量操作
  onShowBatchEditModal: () => void;
  onShowBatchDeleteConfirm: () => void;
  onBatchCancel: () => void;
}

/**
 * ApplicationTable 组件 - 领料申请单表格
 */
export function ApplicationTable({
  filteredData,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  exportMode,
  selectedRows,
  onExportModeChange,
  onExportClick,
  onCancelExport,
  batchEditMode,
  onBatchEditModeChange,
  onShowEditWarning,
  onShowDeleteWarning,
  onSelectAll,
  onSelectRow,
  expandedRows,
  onToggleExpand,
  onView,
  onEdit,
  onDeleteClick,
  onAddModalOpen,
  onShowBatchEditModal,
  onShowBatchDeleteConfirm,
  onBatchCancel,
}: ApplicationTableProps) {
  // 计算总页数
  const computedTotalPages = Math.ceil(filteredData.length / pageSize);

  return (
    /* 数据表格 */
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表格头部操作区 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">领料申请单列表</h3>
        {exportMode ? (
          /* 导出模式 */
          <div className="flex gap-2">
            <Button onClick={onExportClick}>
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button variant="secondary" onClick={onCancelExport}>
              取消
            </Button>
          </div>
        ) : batchEditMode ? (
          /* 批量编辑模式 */
          <div className="flex gap-2">
            <Button onClick={() => {
              if (selectedRows.length === 0) {
                alert('请先选择要编辑的记录');
                onBatchEditModeChange(false);
              } else {
                onShowBatchEditModal();
              }
            }}>
              确认编辑
            </Button>
            <Button variant="destructive" onClick={onShowBatchDeleteConfirm}>
              确认删除
            </Button>
            <Button variant="secondary" onClick={onBatchCancel}>
              取消
            </Button>
          </div>
        ) : (
          /* 默认模式 */
          <div className="flex gap-2">
            <Button onClick={onAddModalOpen}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <>
              <Button onClick={() => { onBatchEditModeChange(true); onShowEditWarning(); }}>
                <Edit className="w-4 h-4" />
                编辑
              </Button>
              <Button variant="destructive" onClick={() => { onBatchEditModeChange(true); onShowDeleteWarning(); }}>
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            </>
            <Button onClick={() => onExportModeChange(true)}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
        )}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* 表头 */}
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
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">领料单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料种类</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植区域/用途</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
            </tr>
          </thead>
          {/* 表体 */}
          <tbody className="divide-y divide-gray-300">
            {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
              <>
                {/* 主数据行 */}
                <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => onSelectRow(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => onView(item)}>{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.plantArea}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.materials.length > 0 ? item.materials[0].remark : '-'}
                  </td>
                </tr>
                {/* 展开行 - 物料明细 */}
                {expandedRows.has(item.id) && (
                  <tr key={`${item.id}-expanded`} className="bg-white">
                    <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-blue-800 mb-2">物料明细</div>
                        {item.materials.length > 0 ? (
                          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-[#F2F6FA]">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">批次号</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {item.materials.map((material, idx) => {
                                const subtotal = material.requestedQuantity * material.unitPrice;
                                const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                return (
                                  <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.batchNo || ''}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                    <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</td>
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
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
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
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{currentPage} / {computedTotalPages || 1}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(computedTotalPages, currentPage + 1))}
            disabled={currentPage >= computedTotalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
