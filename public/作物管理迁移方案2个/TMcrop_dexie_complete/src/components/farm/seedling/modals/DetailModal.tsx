/**
 * 育苗详情弹窗
 */

import React from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, SeedlingStatus } from '../../../../types/crop';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  const statusMap = {
    [SeedlingStatus.IN_PROGRESS]: { label: '进行中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待定植', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.COMPLETED]: { label: '已完成', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' }
  };

  const status = statusMap[record.status] || statusMap[SeedlingStatus.IN_PROGRESS];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="育苗详情"
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
              <span className="text-sm text-gray-500 w-24">育苗批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.seedlingCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物品种：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">关联种源：</span>
              <span className="text-sm text-gray-900">{record.sourceCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">育苗方式：</span>
              <span className="text-sm text-gray-900">{record.seedlingType}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">温室场地：</span>
              <span className="text-sm text-gray-900">{record.siteName}</span>
            </div>
          </div>
        </div>

        {/* 数量信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">数量信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">开始日期：</span>
              <span className="text-sm text-gray-900">{record.startDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">结束日期：</span>
              <span className="text-sm text-gray-900">{record.endDate || '-'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">初始数量：</span>
              <span className="text-sm text-gray-900">{record.initialCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">成活数量：</span>
              <span className="text-sm text-emerald-600 font-medium">{record.survivalCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">成苗率：</span>
              <span className="text-sm text-emerald-600 font-bold">{record.survivalRate}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">已定植数量：</span>
              <span className="text-sm text-blue-600">{record.plantedCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">损耗数量：</span>
              <span className="text-sm text-red-600">{record.lossCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">损耗率：</span>
              <span className="text-sm text-red-600">{record.lossRate}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            {record.qualityGrade && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">品质等级：</span>
                <span className="text-sm text-gray-900">{record.qualityGrade}</span>
              </div>
            )}
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
              <span className="text-sm text-gray-500 w-24">打印次数：</span>
              <span className="text-sm text-gray-900">{record.printCount} 次</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">每日记录：</span>
              <span className="text-sm text-gray-900">{record.dailyRecords.length} 条</span>
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
