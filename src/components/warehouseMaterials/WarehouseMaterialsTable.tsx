// 仓库物料表格组件

import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, Eye, Edit, Trash2, X
} from 'lucide-react';
import { WarehouseMaterial, EditForm, PaginationState } from './types';

interface WarehouseMaterialsTableProps {
  materials: WarehouseMaterial[];
  pagination: PaginationState;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  onPaginationChange: (pagination: PaginationState) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onExportClick: () => void;
  onBatchEditMode: () => void;
  onBatchDelete: () => void;
  onConfirmEdit: () => void;
  onCancel: () => void;
  onViewDetail: (material: WarehouseMaterial) => void;
  onEdit: (material: WarehouseMaterial) => void;
  onDelete: (material: WarehouseMaterial) => void;
}

export default function WarehouseMaterialsTable({
  materials,
  pagination,
  selectedRows,
  exportMode,
  batchEditMode,
  onPaginationChange,
  onSelectAll,
  onSelectRow,
  onExportClick,
  onBatchEditMode,
  onBatchDelete,
  onConfirmEdit,
  onCancel,
  onViewDetail,
  onEdit,
  onDelete,
}: WarehouseMaterialsTableProps) {
  const { currentPage, pageSize } = pagination;

  // 计算分页
  const totalPages = Math.ceil(materials.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, materials.length);
  const paginatedMaterials = materials.slice(startIndex, endIndex);

  const handlePageSizeChange = (newPageSize: number) => {
    onPaginationChange({ ...pagination, pageSize: newPageSize, currentPage: 1 });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">物料库存列表</h3>
        <div className="flex items-center gap-2">
          {/* 编辑删除按钮 - 默认显示 */}
          {!batchEditMode && (
            <>
              <button
                onClick={onBatchEditMode}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                编辑
              </button>
              <button
                onClick={onBatchDelete}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                删除
              </button>
            </>
          )}

          {/* 选择模式下显示确认/取消按钮 */}
          {batchEditMode && (
            <div className="flex gap-2">
              <button
                onClick={onConfirmEdit}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                确认编辑
              </button>
              <button
                onClick={onBatchDelete}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认删除
              </button>
              <button
                onClick={onCancel}
                className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          )}

          {/* 导出按钮 - 默认显示 */}
          {!batchEditMode && (
            <button onClick={onExportClick} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 'max-content' }}>
          <thead className="bg-gray-50">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedMaterials.length && paginatedMaterials.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">分类</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">规格型号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">条形码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">库存数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最低库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最高库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">单价（元）</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">存放位置</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生产日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">有效期至</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">最后更新时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">数据状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedMaterials.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
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
                <td
                  className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                  onClick={() => onViewDetail(item)}
                >
                  {item.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.specification}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.barcode}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${item.quantity < item.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.maxStock}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.price.replace('元', '')}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.batchNo}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.productionDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.expiryDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.lastUpdateTime}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    item.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.dataStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(exportMode || batchEditMode) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === paginatedMaterials.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {materials.length} 条</span>
            <button
              onClick={() => onPaginationChange({ ...pagination, currentPage: Math.max(1, currentPage - 1) })}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => onPaginationChange({ ...pagination, currentPage: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
