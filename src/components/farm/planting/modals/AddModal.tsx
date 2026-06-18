/**
 * 种植新增弹窗
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { X, Upload, RefreshCw, AlertTriangle } from 'lucide-react';
import { SourceType, PlantingStatus, SeedSource, Seedling } from '../../../../types/crop';
import { getSeedSources } from '../../../../services/apiSeedSourceService';
import { getSeedlings } from '../../../../services/apiSeedlingService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import { todayLocal } from '@/lib/dateUtils';
import { useProductionPlanStore, usePlantingStore } from '../../../../stores';
import { PlanType } from '../../../../types';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { generatePlantCode } from '../../../../services/apiPlantingService';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cropNames: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string; parent?: string }>;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  cropNames,
  areas,
}: AddModalProps) {
  const [formData, setFormData] = useState({
    sourceType: SourceType.SEEDLING,
    originPath: 'direct_from_seed' as 'direct_from_seed' | 'via_seedling',  // V2 改造 (任务 15): 来源路径二选一
    sourceId: '',
    sourceCode: '',
    selectedCropCode: '',  // 用于查询品种路径
    cropName: '',
    cropVariety: '',
    areaId: '',
    areaName: '',
    rootName: '',
    plantingCount: 0,
    plantingDate: todayLocal(),
    soilPH: 6.5,
    soilEC: 1.0,
    // 2026-06-18: 损耗率 + 目标产量（完成比例 = harvestToInventoryQty / target_yield）
    attritionRate: 0,
    targetYield: 0,
    targetYieldUnit: '克',
    remarks: '',
    productionPlanId: '',     // 关联生产计划ID
    productionPlanCode: ''   // 关联生产计划批次号
  });

  // 从Store获取生产计划
  const storePlans = useProductionPlanStore((s) => s.batches);
  const fetchPlans = useProductionPlanStore((s) => s.fetchPlans);

  useEffect(() => {
    if (isOpen) {
      fetchPlans(); // 弹窗打开时刷新生产计划列表
    }
  }, [isOpen, fetchPlans]);

  // 筛选可用的生产计划批次（只显示种植计划类型，不限状态）
  const availableProductionPlans = useMemo(() => {
    return storePlans.filter((batch: any) =>
      batch.planType === PlanType.PLANTING
    );
  }, [storePlans]);

  // 种植批号 (参照种源批号生成模式)
  const [plantCode, setPlantCode] = useState('');

  // 生成种植批号
  const handleGeneratePlantCode = async () => {
    const code = await generatePlantCode();
    if (code) {
      setPlantCode(code);
    } else {
      await showAlert('生成种植批号失败，请重试');
    }
  };

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

  // 来源类型切换：内部来源（选择已有种源/育苗）/ 外部来源（手动录入）
  const [sourceMode, setSourceMode] = useState<'internal' | 'external'>('internal');
  const [externalSourceCode, setExternalSourceCode] = useState('');
  const [externalSourceName, setExternalSourceName] = useState('');
  const [externalSourceQuantity, setExternalSourceQuantity] = useState<number>(0);

  // 种源列表和育苗列表状态
  const [seedSources, setSeedSources] = useState<SeedSource[]>([]);
  const [seedlings, setSeedlings] = useState<Seedling[]>([]);

  // 2026-06-18: 计算当前所选来源的可定植数量（种源: availableCount, 育苗: availableTransplantCount）
  // 供"种植数量"输入框下方实时显示余量警告
  // null = 外部来源或未选（不显示警告）
  // 必须在 seedSources/seedlings useState 声明之后（避免 TDZ ReferenceError）
  const availableAmount = useMemo<number | null>(() => {
    if (sourceMode === 'external') return null  // 外部来源无数限制
    if (!formData.sourceId) return null
    if (formData.sourceType === SourceType.SEED) {
      const s = seedSources.find(x => x.id === formData.sourceId)
      return s ? s.availableCount : null
    }
    if (formData.sourceType === SourceType.SEEDLING) {
      const s = seedlings.find(x => x.id === formData.sourceId)
      return s ? ((s as any).availableTransplantCount ?? 0) : null
    }
    return null
  }, [sourceMode, formData.sourceId, formData.sourceType, seedSources, seedlings])

  // 2026-06-18: 数量超限标记（用于提交拦截 + 红框提示）
  const overLimit = availableAmount !== null && formData.plantingCount > availableAmount

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
    if (!plantCode) {
      await showAlert('请先生成种植批号');
      return;
    }
    if (!formData.cropName || !formData.areaId || !formData.plantingCount) {
      await showAlert('请填写完整信息');
      return;
    }
    // 2026-06-18: 数量超限硬拦截（防止保存失败但用户不知道）
    if (overLimit) {
      await showAlert(`种植数量 ${formData.plantingCount} 超过可定植数量 ${availableAmount}，请调整后重试`)
      return
    }

    // 外部来源验证
    if (sourceMode === 'external') {
      if (!externalSourceCode.trim()) {
        await showAlert('请输入外部来源批号');
        return;
      }
      if (!externalSourceName.trim()) {
        await showAlert('请输入来源名称');
        return;
      }
    }

    // 溯源码 (用 todayLocal 替代 toISOString 避免 UTC 时区 bug)
    const dateStr = todayLocal().replace(/-/g, '');
    const traceabilityCode = 'TR' + dateStr + formData.cropName.substring(0, 2);

    // 作物编码 (从品种信息中获取，sourceCode 选择时已自动填入 cropName/cropVariety)
    const cropInfo = cropVarietyService.getCropCodeInfo(formData.cropName);
    let cropCode = '';
    if (cropInfo) {
      cropCode = `${cropInfo.categoryCode}${cropInfo.typeCode}${cropInfo.subCode}001`;
    }

    // 获取区域信息
    const area = areas.find(a => a.value === formData.areaId);
    const areaName = area?.label || '';
    const rootName = area?.parent || '';

    try {
      await usePlantingStore.getState().addItem({
        plantCode,
        sourceType: formData.sourceType as SourceType,
        originPath: formData.originPath,  // V2 改造 (任务 15): 传递 originPath 字段
        sourceId: formData.sourceId,
        sourceCode: sourceMode === 'internal' ? formData.sourceCode : externalSourceCode,
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
        // 2026-06-18: 损耗率 + 目标产量（用户可填）
        attritionRate: formData.attritionRate,
        targetYield: formData.targetYield,
        targetYieldUnit: formData.targetYieldUnit,
        printCount: 0,
        traceabilityCode,
        pictures: pictures,
        remarks: formData.remarks,
        status: PlantingStatus.PLANTED,
        createBy: '系统',
        productionPlanId: formData.productionPlanId || undefined,
        productionPlanCode: formData.productionPlanCode || undefined,
        // 外部来源信息
        sourceMode,
        ...(sourceMode === 'external' ? {
          externalSourceCode,
          externalSourceName,
          externalSourceQuantity,
        } : {}),
      });

      // 更新作物实例的定植数量（仅内部来源）
      if (sourceMode === 'internal') {
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
      }
    } catch (error) {
      // logger.error('添加种植记录失败:', error);
      showAlert('添加失败，请重试');
      return;
    }

    onClose();
    onSuccess?.();
  };

  // 完整品种路径: 参照育苗新增弹窗, 用 cropCode 查品种库获取四段路径
  const fullVarietyPath = useMemo(() => {
    if (!formData.selectedCropCode) return null;
    const variety = cropVarietyService.getVarietyByCode(formData.selectedCropCode);
    if (!variety) return null;
    return [variety.categoryName, variety.typeName, variety.varietyName, variety.subVariety1Name]
      .filter(Boolean).join(' - ');
  }, [formData.selectedCropCode]);

  // 处理来源选择变化（种源）
  const handleSeedSourceChange = (sourceId: string) => {
    const source = seedSources.find(s => s.id === sourceId);
    if (source) {
      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName,
        cropVariety: source.cropVariety,
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
        selectedCropCode: seedling.cropCode || '',
        cropName: seedling.cropName,
        cropVariety: seedling.cropVariety,
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
        {/* 种植批号 + 关联生产计划 — 同行排列 */}
        <div className="col-span-2 grid grid-cols-2 gap-x-6">
          <div>
            <Label className="text-gray-900">种植批号</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={plantCode}
                readOnly
                placeholder="点击生成按钮获取批号"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800 font-mono"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleGeneratePlantCode}
              >
                <RefreshCw className="w-4 h-4" />
                生成
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-gray-900">关联生产计划</Label>
            <Select
              value={formData.productionPlanId || '__none__'}
              onValueChange={(val) => {
                if (val === '__none__') {
                  setFormData(prev => ({ ...prev, productionPlanId: '', productionPlanCode: '' }));
                  return;
                }
                const plan = storePlans.find((b: any) => b.id === val);
                setFormData(prev => ({ ...prev, productionPlanId: val, productionPlanCode: plan?.batchCode || '' }));
              }}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="不关联" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不关联</SelectItem>
                {availableProductionPlans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    [{plan.planTypeName || '种植计划'}] {plan.batchCode} - {plan.cropName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* 来源路径 + 来源类型切换 */}
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-x-6 mb-3">
            {/* 来源路径 */}
            <div>
              <Label className="text-gray-900">来源路径</Label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="originPath"
                    value="direct_from_seed"
                    checked={formData.originPath === 'direct_from_seed'}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        originPath: 'direct_from_seed',
                        sourceType: SourceType.SEED,
                        sourceId: '',
                        sourceCode: '',
                        cropName: '',
                        cropVariety: ''
                      }));
                    }}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">直接播种</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="originPath"
                    value="via_seedling"
                    checked={formData.originPath === 'via_seedling'}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        originPath: 'via_seedling',
                        sourceType: SourceType.SEEDLING,
                        sourceId: '',
                        sourceCode: '',
                        cropName: '',
                        cropVariety: ''
                      }));
                    }}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">经育苗移栽</span>
                </label>
              </div>
            </div>
            {/* 来源类型切换 */}
            <div>
              <Label className="text-gray-900">来源类型</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={sourceMode === 'internal' ? 'default' : 'secondary'} size="sm"
                  onClick={() => { setSourceMode('internal'); setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '' })); }}>
                  内部来源
                </Button>
                <Button variant={sourceMode === 'external' ? 'default' : 'secondary'} size="sm"
                  onClick={() => setSourceMode('external')}>
                  外部来源
                </Button>
              </div>
            </div>
          </div>

          {/* 来源选择区域 */}
          {sourceMode === 'internal' ? (
            <div>
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
                <SelectTrigger className={deepInputClass}>
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
                        {s.seedlingCode} - {s.cropName} ({s.cropVariety}) - 可定植: {(s as any).availableTransplantCount ?? 0}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">外部来源批号</Label>
                <Input type="text" value={externalSourceCode} onChange={(e) => setExternalSourceCode(e.target.value)}
                  className={deepInputClass} placeholder="如：EXT-001" />
              </div>
              <div>
                <Label className="text-gray-900">来源名称</Label>
                <Input type="text" value={externalSourceName} onChange={(e) => setExternalSourceName(e.target.value)}
                  className={deepInputClass} placeholder="如：外部采购苗" />
              </div>
              <div>
                <Label className="text-gray-900">数量</Label>
                <Input type="number" min={0} value={externalSourceQuantity || ''} onChange={(e) => setExternalSourceQuantity(Number(e.target.value))}
                  className={deepInputClass} placeholder="来源数量" />
              </div>
            </div>
          )}
        </div>

        {/* 作物品种 */}
        <div>
          <Label className="text-gray-900">作物品种</Label>
          <Input
            type="text"
            value={formData.cropName}
            readOnly
            className={`${deepInputClass} bg-gray-50`}
            placeholder="选择来源后自动填充"
          />
        </div>

        {/* 品种路径 — 用 cropCode 查品种库获取四段完整路径 */}
        <div>
          <Label className="text-gray-900">品种路径</Label>
          <Input
            type="text"
            value={fullVarietyPath || ''}
            readOnly
            className={`${deepInputClass} bg-gray-50`}
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
            className={`${deepInputClass} ${overLimit ? 'border-red-500 ring-1 ring-red-200' : ''}`}
          />
          {/* 2026-06-18: 实时显示可定植余量 + 超限警告（参照 2026-06-18 用户反馈） */}
          {availableAmount !== null && (
            <p className={`mt-1 text-xs flex items-center gap-1 ${overLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              <AlertTriangle className={`w-3 h-3 ${overLimit ? 'text-red-600' : 'text-gray-400'}`} />
              可定植数量: <span className="font-semibold">{availableAmount}</span>
              {overLimit ? `，已超出 ${formData.plantingCount - availableAmount} 株` : ''}
            </p>
          )}
        </div>

        {/* 种植日期 */}
        <div>
          <Label className="text-gray-900">种植日期</Label>
          <DatePicker className="w-full"
            selected={formData.plantingDate ? new Date(formData.plantingDate) : undefined}
            onChange={(date) => setFormData({ ...formData, plantingDate: todayLocal(date) })}
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
            placeholder="如：1.2"
            className={deepInputClass}
          />
        </div>

        {/* 损耗率 */}
        <div>
          <Label className="text-gray-900">损耗率（%）</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={formData.attritionRate || ''}
            onChange={(e) => setFormData({ ...formData, attritionRate: Number(e.target.value) })}
            placeholder="如：5（默认 0）"
            className={deepInputClass}
          />
        </div>

        {/* 目标产量 */}
        <div>
          <Label className="text-gray-900">目标产量</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              value={formData.targetYield || ''}
              onChange={(e) => setFormData({ ...formData, targetYield: Number(e.target.value) })}
              placeholder="如：500"
              className={`${deepInputClass} flex-1`}
            />
            {/* 2026-06-18: 目标产量单位（从数据词典 unit 选） */}
            <div style={{ minWidth: '120px' }}>
              <DictSelect
                category="unit"
                value={formData.targetYieldUnit}
                onChange={(value) => setFormData({ ...formData, targetYieldUnit: value })}
                placeholder="单位"
              />
            </div>
          </div>
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
