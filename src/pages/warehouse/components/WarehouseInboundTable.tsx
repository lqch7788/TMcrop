/**
 * 仓库入库表格组件
 * 从 WarehouseInboundPage 拆分出来，处理表格展示功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';
import { getStatusText, getStatusClassName } from '../utils/warehouseInbound.utils';

interface WarehouseInboundTableProps {
  // 数据
  records: InboundRecord[];
  displayedRecords: InboundRecord[];

  // 选择状态
  selectedRows: number[];
  isAllSelected: boolean;
  editMode: boolean;
  deleteMode: boolean;
  exportMode: boolean;

  // 展开状态
  expandedRows: Set<number>;

  // 操作方法
  onToggleExpand: (id: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onViewRecord: (record: InboundRecord) => void;

  // 分页
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const WarehouseInboundTable: React.FC<WarehouseInboundTableProps> = ({
  records,
  displayedRecords,
  selectedRows,
  isAllSelected,
  editMode,
  deleteMode,
  exportMode,
  expandedRows,
  onToggleExpand,
  onSelectAll,
  onSelectRow,
  onViewRecord,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  // 判断是否有任何模式激活
  const hasActiveMode = editMode || deleteMode || exportMode;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格主体 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {/* 选择框列 */}
              {hasActiveMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}

              {/* 展开按钮列 */}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></th>

              {/* 表头 */}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-300">
            {displayedRecords.map((record) => (
              <React.Fragment key={record.id}>
                {/* 主数据行 */}
                <tr className="hover:bg-blue-100 transition-colors">
                  {/* 选择框 */}
                  {hasActiveMode && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {deleteMode && record.status !== 'pending' ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(record.id)}
                          onChange={() => onSelectRow(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      )}
                    </td>
                  )}

                  {/* 展开按钮 */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleExpand(record.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedRows.has(record.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </td>

                  {/* 数据列 */}
                  <td
                    className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
                    onClick={() => onViewRecord(record)}
                  >
                    {record.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                </tr>

                {/* 展开的物料明细行 */}
                {expandedRows.has(record.id) && (
                  <tr key={`${record.id}-expanded`} className="bg-white hover:bg-gray-50">
                    <td colSpan={hasActiveMode ? 8 : 7} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          物料明细（共 {record.materials.length} 项）
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">物料编码</th>
                              <th className="px-3 py-2 text-left font-medium">物料名称</th>
                              <th className="px-3 py-2 text-left font-medium">分类</th>
                              <th className="px-3 py-2 text-left font-medium">规格</th>
                              <th className="px-3 py-2 text-right font-medium">数量</th>
                              <th className="px-3 py-2 text-right font-medium">单价</th>
                              <th className="px-3 py-2 text-left font-medium">批次号</th>
                              <th className="px-3 py-2 text-left font-medium">有效期至</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-300">
                            {record.materials.map((material, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800 font-mono text-xs">{material.materialCode}</td>
                                <td className="px-3 py-2 text-gray-800 font-medium">{material.materialName}</td>
                                <td className="px-3 py-2 text-gray-600">{material.category}</td>
                                <td className="px-3 py-2 text-gray-600">{material.specification}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{material.quantity} {material.unit}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{material.price}</td>
                                <td className="px-3 py-2 text-gray-600">{material.batchNo || '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{material.expiryDate || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseInboundTable;
