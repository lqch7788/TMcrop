/**
 * 种植新增弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload } from 'lucide-react';
import { SourceType, PlantingStatus, SeedSource, Seedling } from '../../../../types/crop';
import { addPlanting } from '../../../../services/apiPlantingService';
import { getSeedSources } from '../../../../services/apiSeedSourceService';
import { getSeedlings } from '../../../../services/apiSeedlingService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import { cropBatches } from '../../../../data/mockData';
import { PlanType } from '../../../../types';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cropNames: Array<{ value: string; label: string }>;
  cropVarieties: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string; parent?: string }>;
  sourceTypeOptions: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  cropNames,
  cropVarieties,
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

  // 筛选可用的生产计划批次（已发布和执行中，且只显示种植计划类型）
  const availableProductionPlans = useMemo(() => {
    return cropBatches.filter(batch =>
      (batch.batchStatus === 'published' || batch.batchStatus === 'in_progress') &&
      batch.planType === PlanType.PLANTING
    );
  }, []);

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
        console.error('加载数据失败:', error);
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.cropName || !formData.areaId || !formData.plantingCount) {
      alert('请填写完整信息');
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
      await addPlanting({
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
      console.error('添加种植记录失败:', error);
      alert('添加失败，请重试');
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
          <label className="block text-sm font-medium text-gray-900 mb-1">来源类型</label>
          <div className="flex gap-4">
            {sourceTypeOptions.map(opt => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceType"
                  value={opt.value}
                  checked={formData.sourceType === opt.value}
                  onChange={() => handleSourceTypeChange(opt.value as SourceType)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* V3.0 生产计划关联 - 只显示种植计划类型 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">关联生产计划</label>
          <select
            value={formData.productionPlanId}
            onChange={(e) => {
              const plan = cropBatches.find(b => b.id === e.target.value);
              setFormData(prev => ({
                ...prev,
                productionPlanId: e.target.value,
                productionPlanCode: plan?.batchCode || ''
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">不关联</option>
            {availableProductionPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                [{plan.planTypeName || '种植计划'}] {plan.batchCode} - {plan.cropName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">只显示种植计划类型的生产批次</p>
        </div>

        {/* 来源选择（种源或育苗） */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {formData.sourceType === SourceType.SEED ? '选择种源' : '选择育苗批次'}
          </label>
          <select
            value={formData.sourceId}
            onChange={(e) => {
              if (formData.sourceType === SourceType.SEED) {
                handleSeedSourceChange(e.target.value);
              } else {
                handleSeedlingChange(e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {formData.sourceType === SourceType.SEED ? (
              seedSources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.seedCode} - {s.cropName} ({s.cropVariety}) - 可用: {s.availableCount}
                </option>
              ))
            ) : (
              seedlings.map(s => (
                <option key={s.id} value={s.id}>
                  {s.seedlingCode} - {s.cropName} ({s.cropVariety}) - 可定植: {s.survivalCount - s.plantedCount}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 作物品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
          <input
            type="text"
            value={formData.cropName}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
            placeholder="选择来源后自动填充"
          />
        </div>

        {/* 品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">品种</label>
          <input
            type="text"
            value={formData.cropVariety}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
            placeholder="选择来源后自动填充"
          />
        </div>

        {/* 种植区域 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植区域</label>
          <select
            value={formData.areaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">请选择</option>
            {areas.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* 种植数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植数量</label>
          <input
            type="number"
            value={formData.plantingCount || ''}
            onChange={(e) => setFormData({ ...formData, plantingCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 种植日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">种植日期</label>
          <input
            type="date"
            value={formData.plantingDate}
            onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 土壤PH值 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">土壤PH值</label>
          <input
            type="number"
            step="0.1"
            value={formData.soilPH || ''}
            onChange={(e) => setFormData({ ...formData, soilPH: Number(e.target.value) })}
            placeholder="如：6.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 土壤EC值 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">土壤EC值</label>
          <input
            type="number"
            step="0.1"
            value={formData.soilEC || ''}
            onChange={(e) => setFormData({ ...formData, soilEC: Number(e.target.value) })}
            placeholder="如：1.2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 备注 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>

        {/* 图片上传 - 占两列 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">图片上传</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
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
                    <button
                      type="button"
                      onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <input
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
            </label>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
