/**
 * 订单数据表格组件
 */

import React from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { CropOrder, CropOrderStatus } from '@/types/crop';

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
  deleteMode?: boolean;
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
  deleteMode = false,
  onExportSelectAll,
  onExportCancel,
  onConfirmExport,
  canCreate = true,
  canDelete = true,
  canExport = true,
}: OrderTableProps) {
  // 根据完成数量计算显示状态：COMPLETED/CANCELLED 是终态，否则按数量判断
  const getStatusBadge = (record: CropOrder) => {
    if (record.status === CropOrderStatus.COMPLETED) {
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">已完成</span>;
    }
    if (record.status === CropOrderStatus.CANCELLED) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已取消</span>;
    }
    // 非终态：根据完成数量判断
    if ((record.completedQuantity || 0) > 0) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">进行中</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已计划</span>;
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
      {/* 数据表格 - 支持水平滚动和垂直滚动 */}
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              {(exportMode || batchEditMode || deleteMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold w-14 whitespace-nowrap">
                  <Checkbox
                    checked={selectedRows.length === data.length && data.length > 0}
                    onCheckedChange={() => onExportSelectAll()}
                    className="border-white rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">订单编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">订单名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">订单类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物信息</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计划数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">完成数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">完成进度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">客户</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">订单日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预计完成时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={(exportMode || batchEditMode || deleteMode) ? 15 : 14} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-emerald-50 transition-colors">
                  {(exportMode || batchEditMode || deleteMode) && (
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
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {record.orderName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getOrderTypeBadge(record.orderType)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 truncate max-w-xs">{record.cropVariety}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs" title={record.cropCategory}>{record.cropCategory}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.plannedQuantity} {record.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.completedQuantity || 0} {record.unit}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {record.plannedQuantity > 0
                      ? `${Math.round((record.completedQuantity / record.plannedQuantity) * 100)}%`
                      : '0%'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap truncate max-w-xs">
                    {record.customerName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.orderDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.expectedCompletionDate || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(record)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap truncate max-w-xs">
                    {record.createBy || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs" title={record.remarks || '-'}>
                    {record.remarks || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                            onClick={() => onDelete([record.id])}
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
