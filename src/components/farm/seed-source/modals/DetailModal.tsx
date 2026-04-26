/**
 * 种源详情弹窗
 */

import React from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { SeedSource, StockStatus, SourceType } from '../../../../types/crop';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  // 状态映射
  const statusMap = {
    [StockStatus.SUFFICIENT]: { label: '充足', color: 'text-green-600 bg-green-50' },
    [StockStatus.LOW]: { label: '不足', color: 'text-amber-600 bg-amber-50' },
    [StockStatus.DEPLETED]: { label: '耗尽', color: 'text-red-600 bg-red-50' }
  };

  // 类型映射
  const sourceTypeMap = {
    [SourceType.SEED]: '种子',
    [SourceType.SEEDLING]: '种苗'
  };

  const status = statusMap[record.status] || statusMap[StockStatus.SUFFICIENT];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="种源详情"
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种源批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.seedCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物名称：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物类别：</span>
              <span className="text-sm text-gray-900">{record.cropCategory}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">来源类型：</span>
              <span className="text-sm text-gray-900">{sourceTypeMap[record.sourceType]}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">供应商：</span>
              <span className="text-sm text-gray-900">{record.supplierName}</span>
            </div>
          </div>
        </div>

        {/* 库存信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">采购日期：</span>
              <span className="text-sm text-gray-900">{record.purchaseDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">采购数量：</span>
              <span className="text-sm text-gray-900">{record.quantity} {record.unit}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">单价：</span>
              <span className="text-sm text-gray-900">¥{record.unitPrice}/{record.unit}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">总金额：</span>
              <span className="text-sm text-gray-900">¥{record.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">初始数量：</span>
              <span className="text-sm text-gray-900">{record.initialCount.toLocaleString()} {record.unit}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">可用数量：</span>
              <span className="text-sm font-medium text-emerald-600">{record.availableCount.toLocaleString()} {record.unit}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">库存状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* 其他信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建人：</span>
              <span className="text-sm text-gray-900">{record.createBy}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建时间：</span>
              <span className="text-sm text-gray-900">{record.createTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">更新时间：</span>
              <span className="text-sm text-gray-900">{record.updateTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">打印次数：</span>
              <span className="text-sm text-gray-900">{record.printCount} 次</span>
            </div>
            {record.remarks && (
              <div className="col-span-2 flex items-start">
                <span className="text-sm text-gray-500 w-24 flex-shrink-0">备注：</span>
                <span className="text-sm text-gray-900">{record.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
