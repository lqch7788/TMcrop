/**
 * 采收登记弹窗
 * 方案3.1: 是否采收触发日期自动填充 + 不可修改警告
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { usePlantingStore } from '../../../../stores/usePlantingStore';
import { validateDateNotFuture } from '../../../../lib/validators';
import { Input } from '../../../ui/input';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface HarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

export function HarvestModal({ isOpen, onClose, onSuccess, record }: HarvestModalProps) {
  const [isHarvest, setIsHarvest] = useState<'yes' | 'no'>('yes');
  const [formData, setFormData] = useState({
    harvestDate: new Date().toISOString().split('T')[0],
    harvestYield: record.plantingCount,
    remarks: ''
  });

  // 是否采收切换：选"是"自动填充日期，选"否"清空
  const handleIsHarvestChange = (value: 'yes' | 'no') => {
    setIsHarvest(value);
    if (value === 'yes') {
      if (!formData.harvestDate) {
        setFormData(prev => ({ ...prev, harvestDate: new Date().toISOString().split('T')[0] }));
      }
    } else {
      setFormData(prev => ({ ...prev, harvestDate: '' }));
    }
  };

  const handleSubmit = async () => {
    if (isHarvest !== 'yes') return;

    // 验证日期不能超过今天
    if (formData.harvestDate && !validateDateNotFuture(formData.harvestDate)) {
      alert('采收日期不能超过今天');
      return;
    }

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
      submitDisabled={isHarvest === 'no'}
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
            {/* 是否采收 */}
            <div className="col-span-2">
              <Label className="text-gray-700">是否采收</Label>
              <Select
                value={isHarvest}
                onValueChange={(val) => handleIsHarvestChange(val as 'yes' | 'no')}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">是 — 确认采收此批次</SelectItem>
                  <SelectItem value="no">否 — 暂时不采收</SelectItem>
                </SelectContent>
              </Select>
              {isHarvest === 'yes' && (
                <p className="mt-1 text-xs text-amber-600">⚠ 选择"已采收"后，该记录将不可修改</p>
              )}
            </div>
            <div>
              <Label className="text-gray-700">采收日期</Label>
              <Input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                disabled={isHarvest === 'no'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {isHarvest === 'no' && (
                <p className="mt-1 text-xs text-gray-400">选择"是"后将自动填充当天日期</p>
              )}
            </div>
            <div>
              <Label className="text-gray-700">采收产量</Label>
              <Input
                type="number"
                value={formData.harvestYield || ''}
                onChange={(e) => setFormData({ ...formData, harvestYield: Number(e.target.value) })}
                placeholder="请输入采收产量"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-700">备注</Label>
              <TextArea
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
