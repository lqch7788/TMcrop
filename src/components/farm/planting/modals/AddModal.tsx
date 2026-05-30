/**
 * 种植新增弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/DatePicker';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload } from 'lucide-react';
import { SourceType, PlantingStatus, SeedSource, Seedling } from '../../../../types/crop';
import { getSeedSources } from '../../../../services/apiSeedSourceService';
import { getSeedlings } from '../../../../services/apiSeedlingService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import { useProductionPlanStore, usePlantingStore } from '../../../../stores';
import { PlanType } from '../../../../types';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '../../../ui/input';
import { TextArea } from '../../../ui/TextArea';
import { showAlert } from '@/lib/dialogService';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cropNames: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string; parent?: string }>;
  sourceTypeOptions: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  cropNames,
  areas,
  sourceTypeOptions
}: AddModalProps) {
  const [formData, setFormData] = useState({
    sourceType: SourceType.SEEDLING,
    sourceId: '',
    sourceCode: '',
    cropName: '',
    cropVariety: '',
    areaId: '',
    areaName: '',
    rootName: '',
    plantingCount: 0,
    plantingDate: '',
    soilPH: 6.5,
    soilEC: 1.0,
    remarks: '',
    productionPlanId: '',     // 关联生产计划ID
    productionPlanCode: ''   // 关联生产计划批次号
  });

  // 从Store获取生产计划
  const storePlans = useProductionPlanStore((s) => s.plans);
  const fetchPlans = useProductionPlanStore((s) => s.fetchPlans);

  useEffect(() => {
    if (storePlans.length === 0) {
      fetchPlans();
    }
  }, [storePlans.length, fetchPlans]);

  // 筛选可用的生产计划批次（已发布和执行中，且只显示种植计划类型）
  const availableProductionPlans = useMemo(() => {
    return storePlans.filter((batch: any) =>
      (batch.batchStatus === 'published' || batch.batchStatus === 'in_progress' || batch.status === 'published' || batch.status === 'in_progress') &&
      batch.planType === PlanType.PLANTING
    );
  }, [storePlans]);

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

  // 种源列表和育苗列表状态
  const [seedSources, setSeedSources] = useState<SeedSource[]>([]);
  const [seedlings, setSeedlings] = useState<Seedling[]>([]);

  // 加载种源列表和育苗列表
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        getSeedSources(),
        getSeedlings()
      ]).then(([sources, seedlingsData]) => {
        setSeedSources(sources.filter((s: SeedSource) => s.availableCount > 0));
        setSeedlings(seedlingsData.filter((s: Seedling) =>
          s.status === 'transplant_ready' || s.status === 'in_progress'
        ));
      }).catch(error => {
        // logger.error('加载数据失败:', error);
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.cropName || !formData.areaId || !formData.plantingCount) {
      await showAlert('请填写完整信息');
      return;
    }

    // 生成种植批号
    const plantCode = `ZZ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // 溯源码
    const traceabilityCode = 'TR' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + formData.cropName.substring(0, 2);

    // 生成作物编码
    const cropInfo = cropVarietyService.getCropCodeInfo(formData.cropName);
    let cropCode = '';
    if (cropInfo) {
      const seq = Math.floor(Math.random() * 999) + 1;
      cropCode = `${cropInfo.categoryCode}${cropInfo.typeCode}${cropInfo.subCode}${String(seq).padStart(3, '0')}`;
    }

    // 获取区域信息
    const area = areas.find(a => a.value === formData.areaId);
    const areaName = area?.label || '';
    const rootName = area?.parent || '';

    try {
      await usePlantingStore.getState().addItem({
        plantCode,
        sourceType: formData.sourceType as SourceType,
        sourceId: formData.sourceId,
        sourceCode: formData.sourceCode,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        cropCode,
        areaId: formData.areaId,
        areaName,
        rootName,
        plantingCount: formData.plantingCount,
        plantingDate: formData.plantingDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        transplantCount: 0,
        transplantDate: '',
        isHarvest: false,
        attritionRate: 0,
        printCount: 0,
        traceabilityCode,
        pictures: pictures,
        remarks: formData.remarks,
        status: PlantingStatus.PLANTED,
        createBy: localStorage.getItem('username') || '陆启闯',
        productionPlanId: formData.productionPlanId || undefined,
        productionPlanCode: formData.productionPlanCode || undefined
      });

      // 更新作物实例的定植数量
      // 尝试从种源或育苗获取关联的实例ID
      let instanceId: string | undefined;
      if (formData.sourceType === SourceType.SEED) {
        // 来自种源
        const source = seedSources.find(s => s.id === formData.sourceId);
        instanceId = source?.instanceId;
      } else {
        // 来自育苗（育苗关联的种源有instanceId）
        const seedling = seedlings.find(s => s.id === formData.sourceId);
        if (seedling) {
          const source = seedSources.find(s => s.id === seedling.sourceId);
          instanceId = source?.instanceId;
        }
      }
      if (instanceId) {
        await cropInstanceService.updateQuantity(instanceId, 'plant', formData.plantingCount);
      }
    } catch (error) {
      // logger.error('添加种植记录失败:', error);
      showAlert('添加失败，请重试');
      return;
    }

    onClose();
    onSuccess?.();
  };

  // 处理来源类型变化
  const handleSourceTypeChange = (sourceType: SourceType) => {
    setFormData({
      ...formData,
      sourceType,
      sourceId: '',
      sourceCode: '',
      cropName: '',
      cropVariety: ''
    });
  };

  // 处理来源选择变化（种源）
  const handleSeedSourceChange = (sourceId: string) => {
    const source = seedSources.find(s => s.id === sourceId);
    if (source) {
      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        cropName: source.cropName,
        cropVariety: source.cropVariety
      });
    }
  };

  // 处理来源选择变化（育苗）
  const handleSeedlingChange = (sourceId: string) => {
    const seedling = seedlings.find(s => s.id === sourceId);
    if (seedling) {
      setFormData({
        ...formData,
        sourceId,
        sourceCode: seedling.seedlingCode,
        cropName: seedling.cropName,
        cropVariety: seedling.cropVariety
      });
    }
  };

  // 处理区域选择
  const handleAreaChange = (areaId: string) => {
    const area = areas.find(a => a.value === areaId);
    setFormData({
      ...formData,
      areaId,
      areaName: area?.label || '',
      rootName: area?.parent || ''
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增种植"
      size="xl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 来源类型 */}
        <div className="col-span-2">
          <Label className="text-gray-900">来源类型</Label>
          <DictSelect
            category="planting_source_type"
            value={formData.sourceType}
            onChange={(value) => handleSourceTypeChange(value as SourceType)}
            placeholder="选择来源类型"
          />
        </div>

        {/* V3.0 生产计划关联 - 只显示种植计划类型 */}
        <div className="col-span-2">
          <Label className="text-gray-900">关联生产计划</Label>
          <Select
            value={formData.productionPlanId}
            onValueChange={(val) => {
              const plan = storePlans.find((b: any) => b.id === val);
              setFormData(prev => ({
                ...prev,
                productionPlanId: val,
                productionPlanCode: plan?.batchCode || ''
              }));
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <SelectValue placeholder="不关联" />
            </SelectTrigger>
            <SelectContent>
              {availableProductionPlans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  [{plan.planTypeName || '种植计划'}] {plan.batchCode} - {plan.cropName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-gray-400">只显示种植计划类型的生产批次</p>
        </div>

        {/* 来源选择（种源或育苗） */}
        <div className="col-span-2">
          <Label className="text-gray-900">
            {formData.sourceType === SourceType.SEED ? '选择种源' : '选择育苗批次'}
          </Label>
          <Select
            value={formData.sourceId}
            onValueChange={(val) => {
              if (formData.sourceType === SourceType.SEED) {
                handleSeedSourceChange(val);
              } else {
                handleSeedlingChange(val);
              }
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {formData.sourceType === SourceType.SEED ? (
                seedSources.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.seedCode} - {s.cropName} ({s.cropVariety}) - 可用: {s.availableCount}
                  </SelectItem>
                ))
              ) : (
                seedlings.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.seedlingCode} - {s.cropName} ({s.cropVariety}) - 可定植: {s.survivalCount - s.plantedCount}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 作物品种 */}
        <div>
          <Label className="text-gray-900">作物品种</Label>
          <Input
            type="text"
            value={formData.cropName}
            readOnly
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-gray-50"
            placeholder="选择来源后自动填充"
          />
        </div>

        {/* 品种 */}
        <div>
          <Label className="text-gray-900">品种</Label>
          <Input
            type="text"
            value={formData.cropVariety}
            readOnly
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-gray-50"
            placeholder="选择来源后自动填充"
          />
        </div>

        {/* 种植区域 */}
        <div>
          <Label className="text-gray-900">种植区域</Label>
          <DictSelect
            category="planting_area"
            value={formData.areaId}
            onChange={(value) => handleAreaChange(value)}
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
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 种植日期 */}
        <div>
          <Label className="text-gray-900">种植日期</Label>
          <DatePicker
            selected={formData.plantingDate ? new Date(formData.plantingDate) : undefined}
            onChange={(date) => setFormData({ ...formData, plantingDate: date.toISOString().split('T')[0] })}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            placeholder="如：6.5"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            placeholder="如：1.2"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

        {/* 图片上传 - 占两列 */}
        <div className="col-span-2">
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
            {/* 已上传的图片预览 */}
            {pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pictures.map((pic, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={pic}
                      alt={`预览${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <Label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setPictures([...pictures, result]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
