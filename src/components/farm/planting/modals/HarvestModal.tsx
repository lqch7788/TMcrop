/**
 * 采收登记弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { usePlantingStore } from '../../../../stores/usePlantingStore';

interface HarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

export function HarvestModal({ isOpen, onClose, onSuccess, record }: HarvestModalProps) {
  const [formData, setFormData] = useState({
    harvestDate: new Date().toISOString().split('T')[0],
    harvestYield: record.plantingCount,
    remarks: ''
  });

  const handleSubmit = async () => {
    // 计算损耗率
    const harvestCount = formData.harvestYield;
    const attritionRate = record.plantingCount > 0
      ? Math.round((1 - harvestCount / record.plantingCount) * 100)
      : 0;

    try {
      // 调用采收服务
      await usePlantingStore.getState().harvestPlanting(String(record.id), formData.harvestDate, harvestCount);
    } catch (error) {
      console.error('采收登记失败:', error);
      alert('采收登记失败，请重试');
      return;
    }

    onClose();
    onSuccess?.();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="采收登记"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="确认采收"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 当前种植信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">种植信息</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-500">种植批号</span>
              <p className="text-sm font-mono text-blue-600">{record.plantCode}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">作物品种</span>
              <p className="text-sm text-gray-900">{record.cropName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">品种</span>
              <p className="text-sm text-gray-900">{record.cropVariety}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">种植区域</span>
              <p className="text-sm text-gray-900">{record.areaName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">种植数量</span>
              <p className="text-sm text-emerald-600 font-medium">{record.plantingCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">损耗率</span>
              <p className="text-sm text-red-600">{record.attritionRate}%</p>
            </div>
          </div>
        </div>

        {/* 采收信息 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">采收信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">采收日期</label>
              <input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">采收产量</label>
              <input
                type="number"
                value={formData.harvestYield || ''}
                onChange={(e) => setFormData({ ...formData, harvestYield: Number(e.target.value) })}
                placeholder="请输入采收产量"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
