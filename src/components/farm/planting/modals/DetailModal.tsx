/**
 * 种植详情弹窗
 */

import React from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Planting, PlantingStatus } from '../../../../types/crop';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Planting;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  const statusMap = {
    [PlantingStatus.PLANTED]: { label: '已定植', color: 'text-blue-600 bg-blue-50' },
    [PlantingStatus.GROWING]: { label: '生长期', color: 'text-amber-600 bg-amber-50' },
    [PlantingStatus.HARVESTED]: { label: '已采收', color: 'text-green-600 bg-green-50' },
    [PlantingStatus.CANCELLED]: { label: '已取消', color: 'text-gray-600 bg-gray-50' }
  };

  const status = statusMap[record.status] || statusMap[PlantingStatus.GROWING];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="种植详情"
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
              <span className="text-sm text-gray-500 w-24">种植批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.plantCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物名称：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">来源类型：</span>
              <span className="text-sm text-gray-900">{record.sourceType === 'seed' ? '种子' : '种苗'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">关联批号：</span>
              <span className="text-sm text-gray-900">{record.sourceCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">区域：</span>
              <span className="text-sm text-gray-900">{record.areaName}</span>
            </div>
          </div>
        </div>

        {/* 种植信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">种植信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种植日期：</span>
              <span className="text-sm text-gray-900">{record.plantingDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种植数量：</span>
              <span className="text-sm text-emerald-600 font-medium">{record.plantingCount.toLocaleString()}</span>
            </div>
            {record.soilPH && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">土壤PH值：</span>
                <span className="text-sm text-gray-900">{record.soilPH}</span>
              </div>
            )}
            {record.soilEC && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">土壤EC值：</span>
                <span className="text-sm text-gray-900">{record.soilEC}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">损耗率：</span>
              <span className="text-sm text-red-600">{record.attritionRate}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* 采收信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">采收信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">是否采收：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${record.isHarvest ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                {record.isHarvest ? '已采收' : '未采收'}
              </span>
            </div>
            {record.harvestDate && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">采收日期：</span>
                <span className="text-sm text-gray-900">{record.harvestDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* 其他信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">溯源码：</span>
              <span className="text-sm font-mono text-gray-900">{record.traceabilityCode}</span>
            </div>
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
