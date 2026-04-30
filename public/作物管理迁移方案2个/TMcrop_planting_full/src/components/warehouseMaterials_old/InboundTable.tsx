// 入库记录表格组件

import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Eye, Edit, Trash2, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { InboundRecord, PaginationState } from './types';

interface InboundTableProps {
  records: InboundRecord[];
  pagination: PaginationState;
  expandedRows: Set<number>;
  onPaginationChange: (pagination: PaginationState) => void;
  onToggleExpand: (id: number) => void;
  onAddInbound: () => void;
  onViewDetail: (record: InboundRecord) => void;
  onEdit: (record: InboundRecord) => void;
  onDelete: (record: InboundRecord) => void;
}

export default function InboundTable({
  records,
  pagination,
  expandedRows,
  onPaginationChange,
  onToggleExpand,
  onAddInbound,
  onViewDetail,
  onEdit,
  onDelete,
}: InboundTableProps) {
  const { inboundPage, inboundPageSize } = pagination;

  // 计算分页
  const totalPages = Math.ceil(records.length / inboundPageSize) || 1;
  const startIndex = (inboundPage - 1) * inboundPageSize;
  const endIndex = Math.min(startIndex + inboundPageSize, records.length);
  const paginatedRecords = records.slice(startIndex, endIndex);

  const handlePageSizeChange = (newPageSize: number) => {
    onPaginationChange({ ...pagination, inboundPageSize: newPageSize, inboundPage: 1 });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
        <button
          onClick={onAddInbound}
          className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增入库
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-10"></th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">入库单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">操作员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">物料数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedRecords.map((record) => (
              <>
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleExpand(record.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedRows.has(record.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
                    onClick={() => onToggleExpand(record.id)}
                  >
                    {record.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.status === 'completed' ? '已完成' : '待审核'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(record)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(record.id) && (
                  <tr key={`${record.id}-expanded`} className="bg-white">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-blue-800 mb-2">物料明细</div>
                        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-[#F2F6FA]">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">物料编码</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">物料名称</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">分类</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">规格型号</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">条形码</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">单位</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">入库数量</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">单价（元）</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">存放位置</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">批次号</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">生产日期</th>
                              <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800 whitespace-nowrap">有效期至</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {record.materials.map((material, idx) => (
                              <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialCode}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.materialName}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.category}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.specification}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.barcode}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.unit}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.quantity}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.price}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.location}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.batchNo}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.productionDate}</td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{material.expiryDate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={inboundPageSize}
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
          <span className="text-sm text-gray-500">
            共 {records.length} 条，第 {inboundPage} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPaginationChange({ ...pagination, inboundPage: 1 })}
              disabled={inboundPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              title="首页"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPaginationChange({ ...pagination, inboundPage: Math.max(1, inboundPage - 1) })}
              disabled={inboundPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPaginationChange({ ...pagination, inboundPage: Math.min(totalPages, inboundPage + 1) })}
              disabled={inboundPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPaginationChange({ ...pagination, inboundPage: totalPages })}
              disabled={inboundPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              title="末页"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
