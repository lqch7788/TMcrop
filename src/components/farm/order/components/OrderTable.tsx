/**
 * 订单数据表格组件
 */

import React from 'react';
import { Eye, Trash2, Download, Check, X, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { showConfirm } from '@/lib/dialogService';

interface OrderTableProps {
  data: CropOrder[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  selectedRows: string[];
  onSelectionChange: (rows: string[]) => void;
  onDetail: (record: CropOrder) => void;
  onEdit: (record: CropOrder) => void;
  onDelete: (ids: string[]) => void;
  onAdd: () => void;
  exportMode: boolean;
  batchEditMode: boolean;
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
  onEdit,
  onDelete,
  onAdd,
  exportMode,
  batchEditMode,
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
      case 'breeding':
        return <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">育种订单</span>;
      case 'seedling':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">育苗订单</span>;
      case 'production':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">生产订单</span>;
      case 'research':
        return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">研发订单</span>;
      case 'other':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">其他</span>;
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
      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                  <Checkbox
                    checked={selectedRows.length === data.length && data.length > 0}
                    onCheckedChange={() => onExportSelectAll()}
                    className="border-white rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold">订单编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">作物信息</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">订单日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">预计完成</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-emerald-50 transition-colors">
                  {(exportMode || batchEditMode) && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={() => handleSelectRow(record.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      title="点击查看详情"
                    >
                      {record.orderCode}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.orderName}
                  </td>
                  <td className="px-4 py-3">
                    {getOrderTypeBadge(record.orderType)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{record.cropVariety}</div>
                    <div className="text-xs text-gray-500 truncate" title={record.cropCategory}>{record.cropCategory}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.plannedQuantity} {record.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.orderDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.expectedCompletionDate || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {record.status !== CropOrderStatus.COMPLETED && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(record)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (await showConfirm(`确定要删除订单 ${record.orderCode} 吗？`)) {
                                onDelete([record.id]);
                              }
                            }}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {record.status === CropOrderStatus.COMPLETED && (
                        <span className="text-xs text-gray-400">已归档</span>
                      )}
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
        <Pagination
          currentPage={pagination.current}
          totalPages={Math.ceil(data.length / pagination.pageSize) || 1}
          onPageChange={(page) => onChange({ ...pagination, current: page })}
          pageSize={pagination.pageSize}
          onPageSizeChange={(size) => onChange({ pageSize: size, current: 1 })}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
