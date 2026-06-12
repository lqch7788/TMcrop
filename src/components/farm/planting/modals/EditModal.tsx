/**
 * 种植编辑弹窗
 * 与 AddModal 字段对齐: 创建时字段只读, 可编辑字段使用相同数据源
 */
import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Planting } from '../../../../types/crop';
import { usePlantingStore } from '../../../../stores/usePlantingStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import * as cropVarietyService from '../../../../services/cropVarietyService';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function EditModal({ isOpen, onClose, onSuccess, record }: EditModalProps) {
  const [formData, setFormData] = useState({
    areaId: record.areaId,
    plantingCount: record.plantingCount,
    plantingDate: record.plantingDate,
    soilPH: record.soilPH ?? 0,
    soilEC: record.soilEC ?? 0,
    attritionRate: record.attritionRate ?? 0,
    remarks: record.remarks || '',
  });

  // 品种路径: 通过 cropCode 查品种库, 兜底用 cropName
  const varietyPath = useMemo(() => {
    let variety = record.cropCode ? cropVarietyService.getVarietyByCode(record.cropCode) : undefined;
    // 兜底: 遍历品种库用 cropName 模糊匹配
    if (!variety && record.cropName) {
      const all = cropVarietyService.getAllVarieties();
      variety = all.find(v =>
        v.varietyName === record.cropName ||
        v.subVariety1Name === record.cropName ||
        v.cropName === record.cropName
      );
    }
    if (!variety) return record.cropName || '-';
    return [variety.categoryName, variety.typeName, variety.varietyName, variety.subVariety1Name]
      .filter(Boolean).join(' - ');
  }, [record.cropCode, record.cropName]);

  const handleSubmit = async () => {
    try {
      await usePlantingStore.getState().updateItem(String(record.id), {
        areaId: formData.areaId,
        plantingCount: formData.plantingCount,
        plantingDate: formData.plantingDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        attritionRate: formData.attritionRate,
        remarks: formData.remarks,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      showAlert('更新失败，请重试');
    }
  };

  const sourceTypeLabel = record.sourceType === 'seed' ? '种子（直接播种）' : '种苗（经育苗移栽）';

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
        {/* ====== 只读: 创建时信息 ====== */}

        {/* 种植批号 */}
        <div>
          <Label className="text-gray-900">种植批号</Label>
          <Input type="text" value={record.plantCode} readOnly className={`${deepInputClass} bg-gray-50 font-mono text-gray-700`} />
        </div>

        {/* 关联生产计划 */}
        <div>
          <Label className="text-gray-900">关联生产计划</Label>
          <Input type="text" value={record.productionPlanCode || '不关联'} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        {/* 来源路径 + 来源类型 */}
        <div>
          <Label className="text-gray-900">来源路径</Label>
          <Input type="text" value={sourceTypeLabel} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        {/* 来源批号 */}
        <div>
          <Label className="text-gray-900">来源批号</Label>
          <Input type="text" value={record.sourceCode || '-'} readOnly className={`${deepInputClass} bg-gray-50 font-mono text-gray-700`} />
        </div>

        {/* 作物品种 */}
        <div>
          <Label className="text-gray-900">作物品种</Label>
          <Input type="text" value={record.cropName} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        {/* 品种路径 */}
        <div>
          <Label className="text-gray-900">品种路径</Label>
          <Input type="text" value={varietyPath} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        {/* ====== 可编辑字段 ====== */}

        {/* 种植区域 */}
        <div>
          <Label className="text-gray-900">种植区域</Label>
          <DictSelect
            category="planting_area"
            value={formData.areaId}
            onChange={(value) => setFormData({ ...formData, areaId: value })}
            placeholder="选择种植区域"
          />
        </div>

        {/* 种植数量 */}
        <div>
          <Label className="text-gray-900">种植数量</Label>
          <Input
            type="number"
            value={formData.plantingCount || ''}
            onChange={(e) => setFormData({ ...formData, plantingCount: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 种植日期 */}
        <div>
          <Label className="text-gray-900">种植日期</Label>
          <DatePicker className="w-full"
            selected={formData.plantingDate ? new Date(formData.plantingDate) : undefined}
            onChange={(date) => setFormData({ ...formData, plantingDate: todayLocal(date) })}
          />
        </div>

        {/* 损耗率(%) */}
        <div>
          <Label className="text-gray-900">损耗率(%)</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.attritionRate ?? ''}
            onChange={(e) => setFormData({ ...formData, attritionRate: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 土壤PH值 */}
        <div>
          <Label className="text-gray-900">土壤PH值</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.soilPH || ''}
            onChange={(e) => setFormData({ ...formData, soilPH: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 土壤EC值 */}
        <div>
          <Label className="text-gray-900">土壤EC值</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.soilEC || ''}
            onChange={(e) => setFormData({ ...formData, soilEC: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
