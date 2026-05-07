/**
 * 订单数据表格组件
 */

import React from 'react';
import { Eye, Trash2, Download, Check, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '../../../../types/crop';

interface OrderTableProps {
  data: CropOrder[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  selectedRows: string[];
  onSelectionChange: (rows: string[]) => void;
  onDetail: (record: CropOrder) => void;
  onDelete: (ids: string[]) => void;
  onAdd: () => void;
  exportMode: boolean;
  onExportSelectAll: () => void;
  onExportCancel: () => void;
  onConfirmExport: () => void;
  // 权限控制
  canCreate?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function OrderTable({
  data,
  pagination,
  onChange,
  selectedRows,
  onSelectionChange,
  onDetail,
  onDelete,
  onAdd,
  exportMode,
  onExportSelectAll,
  onExportCancel,
  onConfirmExport,
  canCreate = true,
  canDelete = true,
  canExport = true,
}: OrderTableProps) {
  const getStatusBadge = (status: CropOrderStatus) => {
    switch (status) {
      case CropOrderStatus.PLANNED:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已计划</span>;
      case CropOrderStatus.IN_PROGRESS:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">进行中</span>;
      case CropOrderStatus.COMPLETED:
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">已完成</span>;
      case CropOrderStatus.CANCELLED:
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已取消</span>;
      default:
        return null;
    }
  };

  const getOrderTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">生产订单</span>;
      case 'seed':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">种子订单</span>;
      case 'research':
        return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">研发订单</span>;
      default:
        return null;
    }
  };

  const paginatedData = data.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter(row => row !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表格工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {exportMode ? (
            <>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              <button
                onClick={onExportSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === data.length ? '全不选' : '全选'}
              </button>
              <button
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认导出
              </button>
              <button
                onClick={onExportCancel}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </>
          ) : (
            <>
              {canCreate && (
                <button
                  onClick={onAdd}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {canDelete && (
                <button
                  onClick={onDelete.bind(null, selectedRows)}
                  disabled={selectedRows.length === 0}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </button>
              )}
              {canExport && (
                <button
                  onClick={() => onSelectionChange([])}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onExportSelectAll}
                    className="w-4 h-4 rounded border-white"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold">订单编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">作物信息</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">预计采收</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={exportMode ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-emerald-50 transition-colors">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={() => handleSelectRow(record.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">
                    {record.orderCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.orderName}
                  </td>
                  <td className="px-4 py-3">
                    {getOrderTypeBadge(record.orderType)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{record.cropName}</div>
                    <div className="text-xs text-gray-500">{record.cropVariety}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.plannedQuantity} {record.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.orderDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.expectedHarvestDate || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDetail(record)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-emerald-600"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除订单 ${record.orderCode} 吗？`)) {
                            onDelete([record.id]);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-600 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => onChange({ ...pagination, pageSize: Number(e.target.value), current: 1 })}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <button
            onClick={() => onChange({ ...pagination, current: Math.max(1, pagination.current - 1) })}
            disabled={pagination.current === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">
            {pagination.current} / {Math.ceil(data.length / pagination.pageSize) || 1}
          </span>
          <button
            onClick={() => onChange({ ...pagination, current: Math.min(Math.ceil(data.length / pagination.pageSize), pagination.current + 1) })}
            disabled={pagination.current >= Math.ceil(data.length / pagination.pageSize)}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
