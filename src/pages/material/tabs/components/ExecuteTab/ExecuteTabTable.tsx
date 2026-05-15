// ExecuteTabTable 组件
// 领料出库页面的表格组件
import React from 'react';
import {
  Download, Plus, Edit, Trash2, ChevronDown, ChevronRight as ChevronRightIcon,
  Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecuteTabTableProps {
  // 数据
  data: any[];
  totalCount: number;

  // 分页状态
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // 展开行状态
  expandedRows: Set<number>;

  // 导出模式状态
  exportMode: boolean;
  batchEditMode: 'edit' | 'delete' | null;
  selectedRows: (string | number)[];

  // 回调函数
  onSelectAll: () => void;
  onSelectRow: (id: string | number) => void;
  onToggleExpand: (id: number) => void;
  onView: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string | number) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // 导出相关回调
  onExportClick: () => void;
  onCancelExport: () => void;
  onExportConfirm: () => void;

  // 批量编辑相关回调
  onBatchEditClick: () => void;
  onBatchDeleteClick: () => void;
  onBatchEditConfirm: () => void;
  onBatchDeleteConfirm: () => void;
  onBatchCancel: () => void;

  // 新增回调
  onAdd: () => void;
}

/**
 * ExecuteTabTable 组件
 * 领料出库页面的表格区域
 */
export function ExecuteTabTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  expandedRows,
  exportMode,
  batchEditMode,
  selectedRows,
  onSelectAll,
  onSelectRow,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onExportClick,
  onCancelExport,
  onExportConfirm,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchEditConfirm,
  onBatchDeleteConfirm,
  onBatchCancel,
  onAdd,
}: ExecuteTabTableProps) {
  // 分页后的数据
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">出库单列表</h3>
        {exportMode ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={onExportConfirm}>
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelExport}>
              取消
            </Button>
          </div>
        ) : batchEditMode === 'edit' ? (
          /* 批量编辑模式 */
          <div className="flex gap-2">
            <Button variant="blue" size="sm" onClick={onBatchEditConfirm}>
              确认编辑
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchCancel}>
              取消
            </Button>
          </div>
        ) : batchEditMode === 'delete' ? (
          /* 批量删除模式 */
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={onBatchDeleteConfirm}>
              确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchCancel}>
              取消
            </Button>
          </div>
        ) : (
          /* 默认模式 */
          <div className="flex gap-2">
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
            <Button variant="blue" size="sm" onClick={onBatchEditClick}>
              <Edit className="w-4 h-4" />
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteClick}>
              <Trash2 className="w-4 h-4" />
              删除
            </Button>
            <Button size="sm" onClick={() => onExportClick()}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
        )}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
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
            {paginatedData.map((item) => (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-blue-100 transition-colors">
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
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(item)}
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.id)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {/* 展开行 - 物料明细 */}
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
                                <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">批次号</th>
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
                              {item.materials.map((material: any, idx: number) => {
                                const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                return (
                                  <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                    <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.batchNo || ''}</td>
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
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 导出模式底部 */}
      {exportMode && selectedRows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onSelectAll}>
              {selectedRows.length === paginatedData.length ? '全不选' : '全选'}
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
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {totalCount} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">{currentPage} / {totalPages || 1}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
