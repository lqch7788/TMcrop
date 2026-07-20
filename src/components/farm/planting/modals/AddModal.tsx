/**
 * 种植新增弹窗
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { X, Upload, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { SourceType, PlantingStatus, SeedSource } from '../../../../types/crop';
import { getSeedSources, searchSeedSources } from '../../../../services/apiSeedSourceService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import { todayLocal } from '@/lib/dateUtils';
import { useProductionPlanStore, usePlantingStore } from '../../../../stores';
import { PlanType } from '../../../../types';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
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
    // 2026-06-25: 所有种植来源改为从种源选择（种源已支持库存调拨种苗）
    // 移除"经育苗移栽"路径 — 育苗 → 出圃入库 → 调拨入种源 → 种植
    sourceType: SourceType.SEED,
    originPath: 'direct_from_seed' as const,  // 单一来源路径（兼容 schema）
    sourceId: '',
    sourceCode: '',
    selectedCropCode: '',  // 用于查询品种路径
    cropName: '',
    cropVariety: '',
    areaId: '',
    areaName: '',
    rootName: '',
    plantingCount: 0,
    // 2026-06-25: 种植单位（从数据词典 unit 选；DB plantings.unit 已有，默认 '株'）
    unit: '株',
    plantingDate: todayLocal(),
    soilPH: 6.5,
    soilEC: 1.0,
    // 2026-06-18: 目标产量（完成比例 = harvestToInventoryQty / target_yield）
    // 2026-06-25: 移除 attritionRate 字段（采收后由 HarvestModal 自动计算并写回）
    targetYield: 0,
    targetYieldUnit: '克',
    remarks: '',
    productionPlanId: '',     // 关联生产计划ID
    productionPlanCode: '',   // 关联生产计划批次号
    // 2026-06-25: 育种计划设置（与生产计划「育种计划」对齐，种植管理吸收种源管理「育种计划产出」）
    isBreeding: false,
    parentMaleCode: '',
    parentFemaleCode: '',
    generation: '',
    breedingMethod: '',
    breedingLocation: '',
    targetTraits: '',
    // 2026-06-24: 种植留种设置（种源管理「种植留种」吸收到种植管理）
    isSeedSaving: false,
    seedPlantMarker: '',
  });

  // 从Store获取生产计划
  const storePlans = useProductionPlanStore((s) => s.batches);
  const fetchPlans = useProductionPlanStore((s) => s.fetchPlans);

  // 2026-06-28: 字段级校验错误状态（替代 showAlert 文字提示，改为输入框红框 + Label 红※）
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors((prev) => {
    if (!prev[field]) return prev;
    const { [field]: _, ...rest } = prev;
    return rest;
  });

  // 2026-06-25: 弹窗打开时重置 formData 为初始值（修复 isBreeding/isSeedSaving 持久化的 bug）
  // 根因：<AddModal> 即使 isOpen=false 也不卸载组件，useState 初始值只执行一次，
  //       导致用户上一次提交的值（特别是 checkbox 状态）会持久保留
  useEffect(() => {
    if (isOpen) {
      setFormData({
        sourceType: SourceType.SEED,
        originPath: 'direct_from_seed',
        sourceId: '',
        sourceCode: '',
        selectedCropCode: '',
        cropName: '',
        cropVariety: '',
        areaId: '',
        areaName: '',
        rootName: '',
        plantingCount: 0,
        unit: '株',
        plantingDate: todayLocal(),
        soilPH: 6.5,
        soilEC: 1.0,
        targetYield: 0,
        targetYieldUnit: '克',
        remarks: '',
        productionPlanId: '',
        productionPlanCode: '',
        isBreeding: false,
        parentMaleCode: '',
        parentFemaleCode: '',
        generation: '',
        breedingMethod: '',
        breedingLocation: '',
        targetTraits: '',
        isSeedSaving: false,
        seedPlantMarker: '',
      });
      setSeedSourceKeyword('');
      setPlantCode('');
      setPictures([]);
      setErrors({});  // 2026-06-28: 弹窗打开时清空校验错误
      fetchPlans(); // 弹窗打开时刷新生产计划列表
    }
  }, [isOpen, fetchPlans]);

  // 筛选可用的生产计划批次（2026-06-25: 种植管理吸收育种功能，关联计划含种植+育种）
  const availableProductionPlans = useMemo(() => {
    return storePlans.filter((batch: any) =>
      batch.planType === PlanType.PLANTING || batch.planType === PlanType.SEED_BREEDING
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

  // 2026-06-25: 所有种植来源都从种源管理选择（外部来源必须先录入种源）
  // 种源列表状态 + 搜索关键词
  const [seedSources, setSeedSources] = useState<SeedSource[]>([]);
  const [seedSourceKeyword, setSeedSourceKeyword] = useState('');
  const seedSourceSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 计算当前所选种源的可定植数量（availableCount）
  // null = 未选（不显示警告）
  const availableAmount = useMemo<number | null>(() => {
    if (!formData.sourceId) return null
    const s = seedSources.find(x => x.id === formData.sourceId)
    return s ? s.availableCount : null
  }, [formData.sourceId, seedSources])

  // 当前所选种源单位（用于种植数量警告展示）
  const selectedSourceUnit = useMemo<string>(() => {
    if (!formData.sourceId) return ''
    const s = seedSources.find(x => x.id === formData.sourceId)
    return s?.unit || ''
  }, [formData.sourceId, seedSources])

  // 2026-06-18: 数量超限标记（用于提交拦截 + 红框提示）
  const overLimit = availableAmount !== null && formData.plantingCount > availableAmount

  // 加载种源列表（默认加载全部，搜索词变化时按关键词查询）
  useEffect(() => {
    if (!isOpen) return
    const load = (kw: string) => {
      const promise = kw.trim()
        ? searchSeedSources(kw)
        : getSeedSources()
      promise
        .then((sources) => {
          setSeedSources(sources.filter((s: SeedSource) => s.availableCount > 0));
        })
        .catch(error => {
          // logger.error('加载种源失败:', error);
        });
    }
    // debounce 300ms（避免连续输入频繁请求）
    if (seedSourceSearchTimerRef.current) clearTimeout(seedSourceSearchTimerRef.current)
    seedSourceSearchTimerRef.current = setTimeout(() => load(seedSourceKeyword), 300)
    return () => {
      if (seedSourceSearchTimerRef.current) clearTimeout(seedSourceSearchTimerRef.current)
    }
  }, [isOpen, seedSourceKeyword]);

  const handleSubmit = async () => {
    // 2026-06-28: 字段级校验（替代文字提示，用红框 + 红※标识）
    const newErrors: Record<string, string> = {};
    if (!plantCode) newErrors.plantCode = '请先生成种植批号';
    if (!formData.sourceId) newErrors.sourceId = '请选择种源';
    if (!formData.areaId) newErrors.areaId = '请选择种植区域';
    if (!formData.plantingCount || formData.plantingCount <= 0) newErrors.plantingCount = '请输入种植数量';
    if (overLimit) newErrors.plantingCount = `超过可定植数量 ${availableAmount}`;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    // 通过校验，清空旧 errors
    setErrors({});

    // 2026-06-25: 育种计划校验（2026-07-20 修订：父本选填，可能未知或多父本）
    if (formData.isBreeding) {
      if (!formData.parentFemaleCode.trim()) {
        await showAlert('标记为育种计划时，母本编码必填');
        return;
      }
      if (formData.parentMaleCode.trim() && formData.parentMaleCode.trim() === formData.parentFemaleCode.trim()) {
        await showAlert('父本和母本编码不能相同（避免自交）');
        return;
      }
      if (!formData.generation) {
        await showAlert('标记为育种计划时，世代必填');
        return;
      }
    }

    // 溯源码 (用 todayLocal 替代 toISOString 避免 UTC 时区 bug)
    const dateStr = todayLocal().replace(/-/g, '');
    const traceabilityCode = 'TR' + dateStr + formData.cropName.substring(0, 2);

    // 作物编码：优先用种源已有的 cropCode（handleSeedSourceChange/handleSeedlingChange 已填入 selectedCropCode）
    // 2026-06-20 修复：之前调用 getCropCodeInfo 重新计算，走旧的 produceCodeRule 系统，
    // 与作物品种库不是同一体系，找不到就返回空 → 列表显示 sourceCode 代替品种名
    const cropCode = formData.selectedCropCode || '';

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
        sourceCode: formData.sourceCode,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        cropCode,
        areaId: formData.areaId,
        areaName,
        rootName,
        plantingCount: formData.plantingCount,
        // 2026-06-25: 单位从数据词典选（DB plantings.unit 列已有）
        unit: formData.unit,
        plantingDate: formData.plantingDate,
        soilPH: formData.soilPH,
        soilEC: formData.soilEC,
        transplantCount: 0,
        transplantDate: '',
        isHarvest: false,
        // 2026-06-18: 目标产量（用户可填，损耗率不再手动填，采收后自动写回）
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
        // 2026-06-25: 移除外部来源逻辑（外部来源必须先录入种源管理）
        // 2026-06-25: 育种计划字段（移除 breedingLocation — 与种植区域语义重叠）
        isBreeding: formData.isBreeding,
        parentMaleCode: formData.isBreeding ? formData.parentMaleCode : undefined,
        parentFemaleCode: formData.isBreeding ? formData.parentFemaleCode : undefined,
        generation: formData.isBreeding ? formData.generation : undefined,
        breedingMethod: formData.isBreeding ? formData.breedingMethod : undefined,
        targetTraits: formData.isBreeding ? formData.targetTraits : undefined,
        // 2026-06-24: 种植留种字段
        isSeedSaving: formData.isSeedSaving,
        seedPlantMarker: formData.isSeedSaving ? formData.seedPlantMarker : undefined,
      });

      // 更新作物实例的定植数量（来源必为种源）
      const source = seedSources.find(s => s.id === formData.sourceId);
      const instanceId = source?.instanceId;
      if (instanceId) {
        await cropInstanceService.updateQuantity(instanceId, 'plant', formData.plantingCount);
      }
    } catch (error) {
      // 2026-06-28: 网络/服务错误的兜底提示（保留弹窗，提示用户刷新）
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
      // 2026-07-08 V3.4：弹窗高度 +30%（xl 默认 600px → 780px）
      // 注意：Modal 仅在 width+height 同时设置时使用 prop，否则 fall back 到 size 默认
      width={900}
      height={780}
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* ========== V3.4 UI 统一：种植管理顶部 banner（与种源/育苗一致 emerald-50）
            2026-07-08 V3.4 UI 改造：前端隐藏 banner 文字（用户决定），仅保留代码注释说明业务背景
            原显示文字：
            种植已吸收种源管理的「育种实验」和「种植留种」功能：可选开启后，采收的种子通过「行级采收入库」回到作物库存，再调拨入种源管理。 ========== */}
        {/* 种植批号 + 关联生产计划 — 同行排列 */}
        <div className="col-span-2 grid grid-cols-2 gap-x-6">
          <div>
            <Label className="text-gray-900">
              种植批号 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={plantCode}
                readOnly
                placeholder="点击生成按钮获取批号"
                className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-800 font-mono ${errors.plantCode ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200'}`}
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
                    [{plan.planTypeName || (plan.planType === PlanType.SEED_BREEDING ? '育种计划' : '种植计划')}] {plan.batchCode} - {plan.cropName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* 2026-06-25: 来源路径/来源类型字段全部移除，默认从种源选择 */}
        <div className="col-span-2">
          <Label className="text-gray-900">
            选择种源 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 font-normal ml-1">（来自种源管理的种源列表）</span>
          </Label>
          {/* 2026-06-25: 搜索框 + 下拉选择 同行布局 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={seedSourceKeyword}
                onChange={(e) => setSeedSourceKeyword(e.target.value)}
                placeholder="搜索：种源批号 / 作物名称 / 作物编号 / 作物品种"
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 w-full"
              />
            </div>
            <div className="flex-1">
              <Select
                value={formData.sourceId}
                onValueChange={(v) => { clearError('sourceId'); handleSeedSourceChange(v); }}
              >
                <SelectTrigger className={`${deepInputClass} ${errors.sourceId ? 'border-red-500 ring-1 ring-red-200' : ''}`}>
                  <SelectValue placeholder={seedSources.length === 0 ? '（无匹配种源）' : '请选择'} />
                </SelectTrigger>
                <SelectContent>
                  {seedSources.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.seedCode} - {s.cropName} ({s.cropVariety}) - 可用: {s.availableCount} {s.unit || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.sourceId && <p className="mt-1 text-xs text-red-600">{errors.sourceId}</p>}
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

        {/* 2026-06-25: 育种计划设置（移到这里，在区域/数量之前，让用户先决定种植模式） */}
        {/* V3.4 UI 统一：去掉 details 折叠，改为 h3 + 灰下边框分组（与种源/育苗一致） */}
        <div className="col-span-2 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
            育种计划设置（可选）
            {formData.isBreeding && (
              <Badge className="bg-emerald-600 text-white text-xs ml-2">已开启</Badge>
            )}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-breeding"
                checked={formData.isBreeding}
                // 2026-06-25: 与「种植留种」互斥 — 选育种计划时自动取消留种（业务语义不同，不能并存）
                onCheckedChange={(v) => setFormData({ ...formData, isBreeding: !!v, isSeedSaving: !v ? false : formData.isSeedSaving })}
                disabled={formData.isSeedSaving}
              />
              <Label htmlFor="is-breeding" className="text-sm cursor-pointer">
                标记为育种计划（采收的种子可调拨入种源管理）
              </Label>
            </div>

            {formData.isBreeding && (
              <>
                {/* 父母本 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-900">父本编码</Label>
                    <Input
                      value={formData.parentMaleCode}
                      onChange={(e) => setFormData({ ...formData, parentMaleCode: e.target.value })}
                      placeholder="例: ZZ20250601-001"
                      className={deepInputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-900">
                      <span className="text-red-500">*</span> 母本编码
                    </Label>
                    <Input
                      value={formData.parentFemaleCode}
                      onChange={(e) => setFormData({ ...formData, parentFemaleCode: e.target.value })}
                      placeholder="例: ZZ20250515-002"
                      className={deepInputClass}
                    />
                  </div>
                </div>

                {/* 世代 + 育种方法 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-900">
                      <span className="text-red-500">*</span> 世代
                    </Label>
                    <Select
                      value={formData.generation}
                      onValueChange={(v) => setFormData({ ...formData, generation: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择世代" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F1">F1（一代杂交）</SelectItem>
                        <SelectItem value="F2">F2（二代）</SelectItem>
                        <SelectItem value="F3">F3（三代）</SelectItem>
                        <SelectItem value="BC1">BC1（回交一代）</SelectItem>
                        <SelectItem value="BC2">BC2（回交二代）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-900">育种方法</Label>
                    <Select
                      value={formData.breedingMethod}
                      onValueChange={(v) => setFormData({ ...formData, breedingMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择育种方法" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crossbreeding">杂交育种</SelectItem>
                        <SelectItem value="selection">选择育种</SelectItem>
                        <SelectItem value="backcross">回交</SelectItem>
                        <SelectItem value="heterosis">杂种优势</SelectItem>
                        <SelectItem value="open_pollination">开放授粉</SelectItem>
                        <SelectItem value="mutation">诱变</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 2026-06-25: 移除「育种地点」字段 — 与上方「种植区域」语义重叠，统一用种植区域表示 */}
                {/* 目标性状 */}
                <div>
                  <Label className="text-gray-900">目标性状</Label>
                  <TextArea
                    value={formData.targetTraits}
                    onChange={(e) => setFormData({ ...formData, targetTraits: e.target.value })}
                    rows={2}
                    placeholder="例: 抗病性强 / 产量提高20% / 糖度提升"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <p className="text-xs text-amber-600">
                  ⚠ 标记为育种计划后，行级采收入库的种子将进入作物库存供后续调拨入种源管理。
                </p>
              </>
            )}
          </div>
        </div>

        {/* 2026-06-25: 种植留种设置 — 种源管理「种植留种」吸收到种植管理
            V3.4 UI 统一：去掉 details 折叠，改为 h3 + 灰下边框分组（与种源/育苗一致） */}
        <div className="col-span-2 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
            种植留种设置（可选）
            {formData.isSeedSaving && (
              <Badge className="bg-amber-600 text-white text-xs ml-2">已开启</Badge>
            )}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-seed-saving"
                checked={formData.isSeedSaving}
                // 2026-06-25: 与「育种计划」互斥 — 选种植留种时自动取消育种计划
                onCheckedChange={(v) => setFormData({ ...formData, isSeedSaving: !!v, isBreeding: !v ? false : formData.isBreeding })}
                disabled={formData.isBreeding}
              />
              <Label htmlFor="is-seed-saving" className="text-sm cursor-pointer">
                本种植用于留种（采收时入种源库存而非产品库存）
              </Label>
            </div>

            {formData.isSeedSaving && (
              <div>
                <Label className="text-gray-900">留种株号/标记</Label>
                <Input
                  value={formData.seedPlantMarker}
                  onChange={(e) => setFormData({ ...formData, seedPlantMarker: e.target.value })}
                  placeholder="例: A区第3排 / 标记#001-#050"
                  className={deepInputClass}
                />
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ 标记为留种后，行级采收入库弹窗的「库存类型」默认选 <b>种源</b>。
                  采收的种子入作物库存后，可调拨入种源管理。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 种植区域 */}
        <div>
          <Label className="text-gray-900">
            种植区域 <span className="text-red-500">*</span>
          </Label>
          <div className={errors.areaId ? 'border border-red-500 rounded-lg ring-1 ring-red-200' : ''}>
            <DictSelect
              category="planting_area"
              value={formData.areaId}
              onChange={(value) => { clearError('areaId'); handleAreaChange(value); }}
              placeholder="选择种植区域"
            />
          </div>
          {errors.areaId && <p className="mt-1 text-xs text-red-600">{errors.areaId}</p>}
        </div>

        {/* 种植数量 + 单位 — 2026-06-25 单位从数据词典 unit 选 */}
        <div>
          <Label className="text-gray-900">
            种植数量 <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.plantingCount || ''}
              onChange={(e) => { clearError('plantingCount'); setFormData({ ...formData, plantingCount: Number(e.target.value) }); }}
              className={`${deepInputClass} flex-1 ${(overLimit || errors.plantingCount) ? 'border-red-500 ring-1 ring-red-200' : ''}`}
            />
            <div style={{ minWidth: '120px' }}>
              <DictSelect
                category="unit"
                value={formData.unit}
                onChange={(value) => setFormData({ ...formData, unit: value })}
                placeholder="单位"
              />
            </div>
          </div>
          {/* 实时显示可定植余量 + 超限警告（2026-06-25 用种源单位） */}
          {availableAmount !== null && (
            <p className={`mt-1 text-xs flex items-center gap-1 ${overLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              <AlertTriangle className={`w-3 h-3 ${overLimit ? 'text-red-600' : 'text-gray-400'}`} />
              可定植数量: <span className="font-semibold">{availableAmount}</span>
              {selectedSourceUnit && ` ${selectedSourceUnit}`}
              {overLimit ? `（已超出 ${formData.plantingCount - availableAmount} ${formData.unit || selectedSourceUnit}）` : ''}
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

        {/* 2026-06-27：成品类型已移到 harvest_records 表（采收入库时选择）
            —— 因为同一棵植株在不同阶段可采收不同产物，详见行级"采收入库"操作 */}

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

        {/* 2026-06-25: 损耗率字段移除 — 属于采收后计算的实际值，不在创建时填写 */}
        {/* 原 attritionRate 字段由 HarvestModal 采收时按 (1 - 采收产量/种植数量) × 100% 计算后写回 */}


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
