/**
 * 种植编辑弹窗 — V2（2026-07-21 重构）
 *
 * 设计原则（深度审核后重构）：
 * 1. 与列表/详情字段对齐，确保所有可见字段都有编辑入口
 * 2. 不可编辑字段（创建后锁定）只读展示
 * 3. 可编辑字段（种植区域/数量/日期/土壤/备注等）提供完整输入
 * 4. 后端白名单 + 前端 FIELD_MAP 同步，确保编辑后能保存
 */

import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Planting } from '../../../../types/crop';
import { SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';
import { usePlantingStore } from '../../../../stores/usePlantingStore';
import { DictSelect } from '../../../common/settings/DictSelect';
import { BaseZoneSelect } from '../../../common/BaseZoneSelect';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import * as cropVarietyService from '../../../../services/cropVarietyService';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function EditModal({ isOpen, onClose, onSuccess, record }: EditModalProps) {
  // 可编辑字段状态
  const [formData, setFormData] = useState({
    // 基本信息（创建后锁定，不可编辑）
    // plantCode, sourceType, sourceId, sourceCode, cropName, cropVariety, cropCode - 只读
    // 可编辑字段
    areaId: record.areaId || '',
    plantingCount: record.plantingCount || 0,
    plantingDate: record.plantingDate || '',
    soilPH: record.soilPH ?? 0,
    soilEC: record.soilEC ?? 0,
    attritionRate: record.attritionRate ?? 0,
    remarks: record.remarks || '',
    // 2026-07-21 补全缺失字段
    transplantCount: record.transplantCount || 0,
    transplantDate: record.transplantDate || '',
    targetYield: record.targetYield || 0,
    targetYieldUnit: record.targetYieldUnit || '克',
    unit: record.unit || '株',
    isBreeding: record.isBreeding || false,
    parentMaleCode: record.parentMaleCode || '',
    parentFemaleCode: record.parentFemaleCode || '',
    generation: record.generation || '',
    breedingMethod: record.breedingMethod || '',
    breedingLocation: record.breedingLocation || '',
    targetTraits: record.targetTraits || '',
    isSeedSaving: record.isSeedSaving || false,
    seedPlantMarker: record.seedPlantMarker || '',
    lossCount: record.lossCount || 0,
    supplementCount: record.supplementCount || 0,
    productionPlanId: record.productionPlanId || '',
    productionPlanCode: record.productionPlanCode || '',
  });

  // 品种路径: 通过 cropCode 查品种库, 兜底用 cropName
  const varietyPath = useMemo(() => {
    let variety = record.cropCode ? cropVarietyService.getVarietyByCode(record.cropCode) : undefined;
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
        // 可编辑字段
        areaId: formData.areaId,
        plantingCount: formData.plantingCount,
        plantingDate: formData.plantingDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        attritionRate: formData.attritionRate,
        remarks: formData.remarks,
        // 2026-07-21 补全缺失字段
        transplantCount: formData.transplantCount,
        transplantDate: formData.transplantDate,
        targetYield: formData.targetYield,
        targetYieldUnit: formData.targetYieldUnit,
        unit: formData.unit,
        isBreeding: formData.isBreeding,
        parentMaleCode: formData.parentMaleCode,
        parentFemaleCode: formData.parentFemaleCode,
        generation: formData.generation,
        breedingMethod: formData.breedingMethod,
        breedingLocation: formData.breedingLocation,
        targetTraits: formData.targetTraits,
        isSeedSaving: formData.isSeedSaving,
        seedPlantMarker: formData.seedPlantMarker,
        lossCount: formData.lossCount,
        supplementCount: formData.supplementCount,
        productionPlanId: formData.productionPlanId,
        productionPlanCode: formData.productionPlanCode,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('[EditModal] 更新失败:', error);
      showAlert('更新失败，请重试');
    }
  };

  // 来源类型标签
  const sourceTypeLabel = record.sourceSeedSourceType
    ? (SOURCE_TYPE_MAP[record.sourceSeedSourceType] || record.sourceSeedSourceType)
    : (record.sourceType === 'seedling' ? '种苗' : '种子');

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
        {/* ====== 只读: 创建时信息（不可编辑） ====== */}

        <div>
          <Label className="text-gray-900">种植批号</Label>
          <Input type="text" value={record.plantCode} readOnly className={`${deepInputClass} bg-gray-50 font-mono text-gray-700`} />
        </div>

        <div>
          <Label className="text-gray-900">关联生产计划</Label>
          <Input type="text" value={record.productionPlanCode || '不关联'} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        <div>
          <Label className="text-gray-900">来源路径</Label>
          <Input type="text" value={sourceTypeLabel} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        <div>
          <Label className="text-gray-900">来源批号</Label>
          <Input type="text" value={record.sourceCode || '-'} readOnly className={`${deepInputClass} bg-gray-50 font-mono text-gray-700`} />
        </div>

        <div>
          <Label className="text-gray-900">作物品种</Label>
          <Input type="text" value={record.cropName} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        <div>
          <Label className="text-gray-900">品种路径</Label>
          <Input type="text" value={varietyPath} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        <div>
          <Label className="text-gray-900">作物编码</Label>
          <Input type="text" value={record.cropCode || '-'} readOnly className={`${deepInputClass} bg-gray-50 font-mono text-orange-600`} />
        </div>

        <div>
          <Label className="text-gray-900">种植区域（大棚）</Label>
          <Input type="text" value={record.rootName || '-'} readOnly className={`${deepInputClass} bg-gray-50`} />
        </div>

        {/* ====== 可编辑字段 ====== */}

        {/* 种植区域 */}
        <div>
          <Label className="text-gray-900">种植区域</Label>
          <BaseZoneSelect
            value={formData.areaId}
            onChange={(value) => setFormData({ ...formData, areaId: value })}
            placeholder="选择种植区域"
            baseOid="base_1780023508412"
          />
        </div>

        {/* 种植数量 */}
        <div>
          <Label className="text-gray-900">种植数量</Label>
          <Input
            type="number"
            min={0}
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

        {/* 单位 */}
        <div>
          <Label className="text-gray-900">单位</Label>
          <DictSelect
            category="unit"
            value={formData.unit}
            onChange={(value) => setFormData({ ...formData, unit: value })}
            placeholder="选择单位"
          />
        </div>

        {/* 损耗率（采收后自动计算，只读） */}
        <div>
          <Label className="text-gray-700">损耗率(%) <span className="text-xs text-gray-500 font-normal">（采收后自动计算）</span></Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.attritionRate ?? ''}
            readOnly
            title="采收后自动计算"
            className={`${deepInputClass} bg-gray-100`}
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

        {/* 目标产量 */}
        <div>
          <Label className="text-gray-900">目标产量</Label>
          <Input
            type="number"
            min={0}
            value={formData.targetYield || ''}
            onChange={(e) => setFormData({ ...formData, targetYield: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 目标产量单位 */}
        <div>
          <Label className="text-gray-900">目标产量单位</Label>
          <DictSelect
            category="unit"
            value={formData.targetYieldUnit}
            onChange={(value) => setFormData({ ...formData, targetYieldUnit: value })}
            placeholder="选择单位"
          />
        </div>

        {/* 损耗数量 */}
        <div>
          <Label className="text-gray-900">损耗数量</Label>
          <Input
            type="number"
            min={0}
            value={formData.lossCount || ''}
            onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, lossCount: v < 0 ? 0 : v }); }}
            className={deepInputClass}
          />
        </div>

        {/* 补栽数量 */}
        <div>
          <Label className="text-gray-900">补栽数量</Label>
          <Input
            type="number"
            min={0}
            value={formData.supplementCount || ''}
            onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, supplementCount: v < 0 ? 0 : v }); }}
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