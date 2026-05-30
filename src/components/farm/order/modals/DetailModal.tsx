/**
 * 订单详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React from 'react';
import { CropOrder, CropOrderStatus } from '@/types/crop';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CropOrder | null;
}

export function OrderDetailModal({ isOpen, onClose, record }: OrderDetailModalProps) {
  if (!record) return null;

  // 订单状态标签
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

  // 订单类型标签
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

  // 完成率
  const completionRate = record.plannedQuantity > 0
    ? `${Math.round((record.actualQuantity / record.plannedQuantity) * 100)}%`
    : '0%';

  // 字段配置
  const fields: DetailField[][] = [
    [
      { label: '订单编号', value: record.orderCode },
      { label: '订单类型', value: getOrderTypeBadge(record.orderType) },
    ],
    [
      { label: '订单名称', value: record.orderName, fullWidth: true },
    ],
    [
      { label: '订单状态', value: getStatusBadge(record.status) },
      { label: '订单日期', value: record.orderDate },
    ],
    [
      { label: '预计完成日期', value: record.expectedCompletionDate || '-' },
      { label: '完成率', value: completionRate },
    ],
    [
      { label: '品种路径', value: record.cropCategory || '-', fullWidth: true },
    ],
    [
      { label: '作物品种', value: record.cropVariety || '-', fullWidth: true },
    ],
    [
      { label: '单位', value: record.unit || '株' },
      { label: '供应商', value: record.supplierName || '-' },
    ],
    [
      { label: '计划数量', value: record.plannedQuantity },
      { label: '实际数量', value: record.actualQuantity || 0 },
    ],
    [
      { label: '创建人', value: record.createBy || '-' },
      { label: '创建时间', value: record.createTime || '-' },
    ],
    [
      { label: '备注', value: record.remarks || '-', fullWidth: true },
    ],
  ];

  return (
    <DetailModal
      title="订单详情"
      fields={fields}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
