/**
 * 种植编辑弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Planting } from '../../../../types/crop';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';
import { usePlantingStore } from '../../../../stores/usePlantingStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '../../../ui/input';
import { TextArea } from '../../../ui/TextArea';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
  cropVarietyOptions: CropVarietyOption[];
  areas: Array<{ value: string; label: string; parent?: string }>;
}

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  cropVarietyOptions,
  areas
}: EditModalProps) {
  const [formData, setFormData] = useState({
    selectedCropCode: record.cropCode || '',
    cropName: record.cropName,
    cropVariety: record.cropVariety,
    areaId: record.areaId,
    plantingCount: record.plantingCount,
    plantingDate: record.plantingDate,
    soilPH: record.soilPH,
    soilEC: record.soilEC,
    attritionRate: record.attritionRate ?? 0,
    remarks: record.remarks || ''
  });

  const handleSubmit = async () => {
    try {
      await usePlantingStore.getState().updateItem(String(record.id), {
        cropCode: formData.selectedCropCode,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        areaId: formData.areaId,
        plantingCount: formData.plantingCount,
        plantingDate: formData.plantingDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        attritionRate: formData.attritionRate,
        remarks: formData.remarks
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败，请重试');
    }
  };

  // 处理作物品种选择
  const handleCropCodeChange = (cropCode: string, varietyInfo: any) => {
    setFormData({
      ...formData,
      selectedCropCode: cropCode,
      cropName: varietyInfo?.varietyName || '',
      cropVariety: varietyInfo?.subVariety1Name || varietyInfo?.varietyName || ''
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑种植"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 作物品种选择 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
          <CropCodeSelector
            value={formData.selectedCropCode}
            onChange={handleCropCodeChange}
            placeholder="搜索或选择作物品种..."
            size="md"
          />
        </div>

        {/* 种植区域 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植区域</label>
          <DictSelect
            category="planting_area"
            value={formData.areaId}
            onChange={(value) => setFormData({ ...formData, areaId: value })}
            placeholder="选择种植区域"
          />
        </div>

        {/* 种植数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植数量</label>
          <Input
            type="number"
            value={formData.plantingCount || ''}
            onChange={(e) => setFormData({ ...formData, plantingCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 种植日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植日期</label>
          <Input
            type="date"
            value={formData.plantingDate}
            onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 损耗率(%) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">损耗率(%)</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.attritionRate ?? ''}
            onChange={(e) => setFormData({ ...formData, attritionRate: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 土壤PH值 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">土壤PH值</label>
          <Input
            type="number"
            step="0.1"
            value={formData.soilPH || ''}
            onChange={(e) => setFormData({ ...formData, soilPH: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 土壤EC值 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">土壤EC值</label>
          <Input
            type="number"
            step="0.1"
            value={formData.soilEC || ''}
            onChange={(e) => setFormData({ ...formData, soilEC: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
