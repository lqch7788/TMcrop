/**
 * 定植操作弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, SourceType, PlantingStatus } from '../../../../types/crop';
import { useSeedlingStore } from '../../../../stores/useSeedlingStore';
import { usePlantingStore } from '../../../../stores/usePlantingStore';
import { Input } from '../../../ui/input';
import { DatePicker } from '../../../ui/DatePicker';
import { Label } from '@/components/ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { showAlert } from '@/lib/dialogService';

interface TransplantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  areas: Array<{ value: string; label: string; parent: string }>;
}

export function TransplantModal({ isOpen, onClose, onSuccess, record, areas }: TransplantModalProps) {
  const [formData, setFormData] = useState({
    transplantCount: 0,
    areaId: '',
    areaName: '',
    transplantDate: new Date().toISOString().split('T')[0],
    soilPH: 6.5,
    soilEC: 1.0,
    remarks: ''
  });

  // 计算可定植数量
  const availableCount = record.survivalCount - record.plantedCount;

  const handleSubmit = async () => {
    if (!formData.transplantCount || formData.transplantCount <= 0) {
      await showAlert('请输入有效的定植数量');
      return;
    }
    if (formData.transplantCount > availableCount) {
      await showAlert(`定植数量不能超过可定植数量 (${availableCount})`);
      return;
    }
    if (!formData.areaId) {
      await showAlert('请选择定植区域');
      return;
    }

    // 生成种植批号
    const plantCode = `ZZ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // 溯源码
    const traceabilityCode = 'TR' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + record.cropName.substring(0, 2);

    // 获取区域名称
    const area = areas.find(a => a.value === formData.areaId);
    const areaName = area?.label || '';
    const rootName = area?.parent || '';

    try {
      // 创建种植记录
      await usePlantingStore.getState().addItem({
        plantCode,
        sourceType: SourceType.SEEDLING,
        sourceId: record.id,
        sourceCode: record.seedlingCode,
        cropName: record.cropName,
        cropVariety: record.cropVariety,
        areaId: formData.areaId,
        areaName,
        rootName,
        plantingCount: formData.transplantCount,
        plantingDate: formData.transplantDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        transplantCount: formData.transplantCount,
        transplantDate: formData.transplantDate,
        isHarvest: false,
        attritionRate: 0,
        printCount: 0,
        traceabilityCode,
        pictures: [],
        remarks: formData.remarks,
        status: PlantingStatus.PLANTED,
        createBy: localStorage.getItem('username') || '陆启闯'
      });

      // 更新育苗的已定植数量（通过 Store）
      await useSeedlingStore.getState().increasePlantedCount(String(record.id), formData.transplantCount);
    } catch (error) {
      console.error('定植操作失败:', error);
      await showAlert('定植操作失败，请重试');
      return;
    }

    onClose();
    onSuccess?.();
  };

  // 处理区域选择
  const handleAreaChange = (areaId: string) => {
    const area = areas.find(a => a.value === areaId);
    setFormData({ ...formData, areaId, areaName: area?.label || '' });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="定植操作"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="确认定植"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 当前育苗信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">育苗信息</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-500">育苗批号</span>
              <p className="text-sm font-mono text-blue-600">{record.seedlingCode}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">作物品种</span>
              <p className="text-sm text-gray-900">{record.cropName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">成活数量</span>
              <p className="text-sm text-emerald-600 font-medium">{record.survivalCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">品种</span>
              <p className="text-sm text-gray-900">{record.cropVariety}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">场地</span>
              <p className="text-sm text-gray-900">{record.siteName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">成苗率</span>
              <p className="text-sm text-emerald-600 font-bold">{record.survivalRate}%</p>
            </div>
          </div>
        </div>

        {/* 定植信息 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">定植信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">定植数量</Label>
              <Input
                type="number"
                value={formData.transplantCount || ''}
                onChange={(e) => setFormData({ ...formData, transplantCount: Number(e.target.value) })}
                max={availableCount}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">最多可定植 {availableCount.toLocaleString()} 株</p>
            </div>
            <div>
              <Label className="text-gray-700">定植区域</Label>
              <Select
                value={formData.areaId}
                onValueChange={(val) => handleAreaChange(val)}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">土壤PH值</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.soilPH}
                onChange={(e) => setFormData({ ...formData, soilPH: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700">土壤EC值</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.soilEC}
                onChange={(e) => setFormData({ ...formData, soilEC: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-700">定植日期</Label>
              <DatePicker
                selected={formData.transplantDate ? new Date(formData.transplantDate) : undefined}
                onChange={(date) => setFormData({ ...formData, transplantDate: date.toISOString().split('T')[0] })}
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
