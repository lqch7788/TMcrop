/**
 * 订单详情弹窗
 */

import React from 'react';
import { X, Package, Calendar, User, MapPin } from 'lucide-react';
import { CropOrder, CropOrderStatus } from '@/types/crop';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CropOrder | null;
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  if (!isOpen || !record) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">订单详情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 详情内容 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 订单基本信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              订单信息
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">订单编号</p>
                  <p className="text-sm font-medium text-emerald-600">{record.orderCode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">订单名称</p>
                  <p className="text-sm font-medium text-gray-900">{record.orderName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">订单类型</p>
                  <p className="text-sm">{getOrderTypeBadge(record.orderType)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">订单状态</p>
                  <p className="text-sm">{getStatusBadge(record.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">订单日期</p>
                  <p className="text-sm text-gray-900">{record.orderDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">预计采收日期</p>
                  <p className="text-sm text-gray-900">{record.expectedHarvestDate || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 作物信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              作物信息
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">品种路径</p>
                  <p className="text-sm font-medium text-gray-900">{record.cropCategory || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">作物品种</p>
                  <p className="text-sm font-medium text-gray-900">{record.cropVariety}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">供应商</p>
                  <p className="text-sm text-gray-900">{record.supplierName || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 数量信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              数量信息
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">计划数量</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.plannedQuantity} {record.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">实际数量</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.actualQuantity || 0} {record.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">完成率</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {record.plannedQuantity > 0
                      ? Math.round((record.actualQuantity / record.plannedQuantity) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 关联信息 */}
          {record.instanceIds && record.instanceIds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">关联作物实例</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">
                  已关联 {record.instanceIds.length} 个作物实例
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {record.instanceIds.map((id) => (
                    <span key={id} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 备注 */}
          {record.remarks && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">备注</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">{record.remarks}</p>
              </div>
            </div>
          )}

          {/* 创建信息 */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-100">
            <span>创建人：{record.createBy}</span>
            <span>创建时间：{record.createTime}</span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
