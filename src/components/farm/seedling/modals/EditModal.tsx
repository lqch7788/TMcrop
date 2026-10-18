/**
 * 育苗编辑弹窗
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Seedling, SeedSource, SeedlingCalculateMode } from '../../../../types/crop';
import { getMotherAliveCount, getMotherLossCapacity, getMotherLossDisplayCount, getMotherAliveFormula, getSeedlingRemainingCount, isOneToOneMode } from '@/lib/seedlingPool';
import { SEEDLING_STATUS_BADGE_MAP } from '../../../../constants/cropConstants';
import { useSeedlingStore } from '../../../../stores/useSeedlingStore';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVariety, CropVarietyOption } from '../../../../types/cropVariety';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { getSeedSourceVarietyName } from '../../../../constants/seedSourceDict';
// 2026-10-17：单位口径判断 —— 种源单位 ≠ 育苗单位时，初始数量变化不自动换算种源消耗
import { isSameUnitDimension } from '@/constants/units';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  seedSources: SeedSource[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function EditModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  seedSources,
  seedlingTypes,
  sites
}: EditModalProps) {
  const [formData, setFormData] = useState({
    sourceId: record.sourceId,
    sourceCode: record.sourceCode,
    selectedCropCode: record.cropCode || '',
    cropName: record.cropName,
    cropVariety: record.cropVariety,
    seedlingType: record.seedlingType,
    unit: record.unit || '株',  // 2026-07-01: 单位
    siteId: record.siteId,
    siteName: record.siteName,
    startDate: record.startDate,
    expectedEndDate: record.expectedEndDate || '',
    endDate: record.endDate || '',
    initialCount: record.initialCount,
    // 2026-10-17：种源已扣减量（单位=种源单位）—— 种源与育苗单位不同口径时可编辑
    sourceConsumedQuantity: record.sourceDeductedQuantity ?? 0,
    survivalCount: record.survivalCount,
    remarks: record.remarks || '',
    // 新增缺失字段
    qualityGrade: record.qualityGrade || '',
    // 2026-10-17：删除 isFinished（DB 无此列、后端白名单不支持，结束状态由列表「结束」按钮写入 status/end_type/end_time）
    chargePerson: record.chargePerson || '',
    targetSurvivalCount: record.targetSurvivalCount || 0,
    // 补齐 AddModal 同名字段 — 否则编辑保存会丢这些值
    targetSurvivalRate: record.targetSurvivalRate || 0,
    productionPlanId: record.productionPlanCode || '',
    calculateMode: record.calculateMode || SeedlingCalculateMode.SINGLE,
    motherPlantCount: record.motherPlantCount || 0,
    propagationMultiple: record.propagationMultiple || 0,
    customMultiple: record.customMultiple || 0,
    theoreticalYield: record.theoreticalYield || 0,
    // 2026-06-15: 数量体系重构 — 4 业务字段（统一显示，2026-06-25 移除 autoPlantedCount，2026-06-28 移除 transplantedCount）
    motherLossCount: record.motherLossCount ?? 0,
    // 2026-10-11：小苗累计产出（Seedling.expandedPlantCount），此前遗漏在表单状态之外，
    //   导致下方「小苗累计产出」输入框读不到值、提交时该字段为 undefined 而不落库
    expandedPlantCount: record.expandedPlantCount ?? 0,
    seedlingLossCount: record.seedlingLossCount ?? 0,
    harvestStockedCount: record.harvestStockedCount ?? 0,
    replantCount: record.replantCount ?? 0,  // 2026-06-16: 补苗累计
  });

  const updateItem = useSeedlingStore((s) => s.updateItem);

  // 2026-10-17：表单当前值覆盖记录值 → 派生数量（存活/剩余/完成比例）实时反映编辑结果，
  //   与提交时的计算共用同一份 merged，避免 UI 展示与落库值出现两套口径
  const merged = useMemo(() => ({ ...record, ...formData }), [record, formData]);

  // 方案2.7: combogrid种源选择器状态
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);

  const filteredSeedSources = useMemo(() => {
    if (!sourceSearch) return seedSources || [];
    const q = sourceSearch.toLowerCase();
    return (seedSources || []).filter(s =>
      s.seedCode?.toLowerCase().includes(q) ||
      s.cropName?.toLowerCase().includes(q) ||
      s.cropVariety?.toLowerCase().includes(q) ||
      s.varietyName?.toLowerCase().includes(q)
    );
  }, [seedSources, sourceSearch]);

  // 2026-10-17：名称口径与下拉表格一致，显示品种而非作物名（cropName 如"草莓"无法区分品种）
  const selectedSource = useMemo(
    () => seedSources.find(s => s.id === formData.sourceId) || null,
    [seedSources, formData.sourceId]
  );
  // 2026-10-17：种源已停用/删除时不在可用种源列表中（GET /seed-sources 只返回未删除记录），
  //   此时回退用列表行自带的 sourceCode + 作物品种，保证编辑弹窗与「关联种源」列口径一致；
  //   品种名缺失时只显示编码，避免出现尾部 " - "
  const selectedSourceLabel = useMemo(() => {
    if (selectedSource) {
      return `${selectedSource.seedCode} - ${getSeedSourceVarietyName(selectedSource)}`;
    }
    const code = formData.sourceCode || record.sourceCode || '';
    // 品种名口径与列表「作物品种」列一致：优先最细分子品种名（subVarietyName → varietyName → cropVariety → cropName）
    const variety = record.subVarietyName || record.varietyName || record.cropVariety || record.cropName || '';
    if (!code) return '';
    return variety ? `${code} - ${variety}` : code;
  }, [selectedSource, formData.sourceCode, record.sourceCode, record.subVarietyName, record.varietyName, record.cropVariety, record.cropName]);
  // 2026-10-17：种源单位与育苗单位不同口径时，初始数量变化不自动换算种源消耗，
  //   需在下方"种源消耗量（种源单位）"中单独维护
  const sourceRequiresExplicitConsumption = !!selectedSource
    && !isSameUnitDimension(selectedSource.unit, formData.unit);

  const sourcePopoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sourcePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sourcePopoverRef.current && !sourcePopoverRef.current.contains(e.target as Node)) {
        setSourcePopoverOpen(false);
        setSourceSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sourcePopoverOpen]);

  // 当 record 变化时重置表单
  useEffect(() => {
    // 兼容旧数据：siteId 为空时，尝试从 sites 字典按 siteName 匹配
    let resolvedSiteId = record.siteId;
    if (!resolvedSiteId && record.siteName) {
      const match = sites.find(s => s.label === record.siteName);
      resolvedSiteId = match?.value || '';
    }

    setFormData({
      sourceId: record.sourceId,
      sourceCode: record.sourceCode,
      selectedCropCode: record.cropCode || '',
      cropName: record.cropName,
      cropVariety: record.cropVariety,
      seedlingType: record.seedlingType,
      // 2026-10-11：补 unit / replantCount / expandedPlantCount —— setFormData 是整体替换，
      //   这三项此前未随重置写回，重置后会被清成 undefined
      unit: record.unit || '株',
      siteId: resolvedSiteId,
      siteName: record.siteName,
      startDate: record.startDate,
      expectedEndDate: record.expectedEndDate || '',
      endDate: record.endDate || '',
      initialCount: record.initialCount,
      // 2026-10-17：种源已扣减量（单位=种源单位），整体重置时必须带回
      sourceConsumedQuantity: record.sourceDeductedQuantity ?? 0,
      survivalCount: record.survivalCount,
      remarks: record.remarks || '',
      // 新增缺失字段
      qualityGrade: record.qualityGrade || '',
      chargePerson: record.chargePerson || '',
      targetSurvivalCount: record.targetSurvivalCount || 0,
      // 补齐 AddModal 同名字段
      targetSurvivalRate: record.targetSurvivalRate || 0,
      productionPlanId: record.productionPlanCode || '',
      calculateMode: record.calculateMode || SeedlingCalculateMode.SINGLE,
      motherPlantCount: record.motherPlantCount || 0,
      propagationMultiple: record.propagationMultiple || 0,
      customMultiple: record.customMultiple || 0,
      theoreticalYield: record.theoreticalYield || 0,
      // 2026-06-15: 数量体系重构 — 4 业务字段（2026-06-25 移除 autoPlantedCount，2026-06-28 移除 transplantedCount）
      motherLossCount: record.motherLossCount ?? 0,
      expandedPlantCount: record.expandedPlantCount ?? 0,
      seedlingLossCount: record.seedlingLossCount ?? 0,
      harvestStockedCount: record.harvestStockedCount ?? 0,
      replantCount: record.replantCount ?? 0,
    });
  }, [record]);

  const handleSubmit = async () => {
    // 2026-10-17：日期逻辑校验 —— 预计结束日期必须晚于开始日期（两者均已填时校验，兜底防御）
    if (formData.startDate && formData.expectedEndDate
      && new Date(formData.expectedEndDate) <= new Date(formData.startDate)) {
      await showAlert('预计结束日期必须晚于开始日期，请调整');
      return;
    }

    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || formData.siteName;

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || formData.sourceCode;

    // 2026-10-17：成苗率 / 损耗 / 损耗率统一由 seedlingPool 派生（原从死字段 survival_count 反推）
    //   存活 = 母株 + 补苗 − 损耗累计；分母为累计投入（初始 + 补苗），与详情弹窗/标签同口径
    //   复用组件级 merged（与数量统计区实时展示同一份数据）
    const survivalCount = getMotherAliveCount(merged);
    const lossCount = getMotherLossDisplayCount(merged);
    const invested = (formData.initialCount || 0) + (formData.replantCount || 0);
    const survivalRate = invested > 0 ? Math.round((survivalCount / invested) * 100) : 0;
    const lossRate = invested > 0 ? Math.round((lossCount / invested) * 100) : 0;

    // 2026-10-17 单位口径：种源与育苗单位不同时，种源消耗量单独维护，校验不得超过可用上限
    //   可用上限 = 种源当前可用 + 本行已扣减（因为入参是"更新后的绝对消耗量"）
    if (sourceRequiresExplicitConsumption && selectedSource) {
      const consumed = Number(formData.sourceConsumedQuantity) || 0;
      if (consumed < 0) {
        await showAlert('种源消耗量不能为负数');
        return;
      }
      const maxConsumed = (selectedSource.availableCount || 0) + (record.sourceDeductedQuantity || 0);
      if (consumed > maxConsumed) {
        await showAlert(`种源消耗量 ${consumed}${selectedSource.unit} 超过可用上限 ${maxConsumed}${selectedSource.unit}，请调整`);
        return;
      }
    }

    try {
      await updateItem(String(record.id), {
        sourceId: formData.sourceId,
        sourceCode,
        // 2026-10-17：异口径时提交种源消耗量（单位=种源单位）；同口径由初始数量差额自动处理
        sourceConsumedQuantity: sourceRequiresExplicitConsumption ? (Number(formData.sourceConsumedQuantity) || 0) : undefined,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        cropCode: formData.selectedCropCode,
        unit: formData.unit || '株',  // 2026-07-01: 单位
        seedlingType: formData.seedlingType,
        siteId: formData.siteId,
        siteName,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        endDate: formData.endDate,
        initialCount: formData.initialCount,
        survivalCount,
        // 2026-06-28：移除 plantedCount 写入（业务规则：种植管理不再从育苗取苗）
        survivalRate,
        lossCount,
        lossRate,
        remarks: formData.remarks,
        qualityGrade: formData.qualityGrade,
        chargePerson: formData.chargePerson,
        targetSurvivalCount: formData.targetSurvivalCount,
        targetSurvivalRate: formData.targetSurvivalRate,
        productionPlanCode: formData.productionPlanId || undefined,
        calculateMode: formData.calculateMode,
        motherPlantCount: formData.motherPlantCount,
        propagationMultiple: formData.propagationMultiple,
        customMultiple: formData.customMultiple,
        theoreticalYield: formData.theoreticalYield,
        // 2026-10-17：育苗工时已按业务决定停用（新增弹窗已删除），编辑不再提交，保留历史值
        // 2026-07-21 修复：添加 5 个数量字段 + replantCount 到提交 payload（之前缺失导致无法保存）
        motherLossCount: formData.motherLossCount,
        expandedPlantCount: formData.expandedPlantCount,
        seedlingLossCount: formData.seedlingLossCount,
        harvestStockedCount: formData.harvestStockedCount,
        replantCount: formData.replantCount,
      });
    } catch (error) {
      // 2026-10-18 P1 修复：显示后端具体失败原因（种源不足/校验失败等），
      // 原实现吞掉了错误详情且 Store 不抛错，弹窗会照常关闭
      await showAlert(`更新失败：${(error as Error)?.message || '请重试'}`);
      return;
    }

    onClose();
    onSuccess?.();
  };

  // 根据选择的种源自动填充作物信息
  const handleSourceChange = (sourceId: string) => {
    const source = seedSources.find(s => s.id === sourceId);
    if (source) {
      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName,
        cropVariety: source.cropVariety,
        // 2026-10-17：换种源后单位可能变化，消耗量必须重新填写
        sourceConsumedQuantity: 0
      });
    }
  };

  // 处理作物品种选择
  // 与 CropCodeSelector 的 onChange 签名对齐：(cropCode, varietyInfo)
  const handleCropCodeChange = (cropCode: string, varietyInfo: CropVariety | null) => {
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
      title="编辑育苗"
      size="xl"
      // 2026-10-17：默认尺寸放大 25%（xl 基准 900×600 → 1125×750）
      width={1125}
      height={750}
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 2026-06-14: 繁殖模式 banner（建档后锁定）
            2026-10-17：补列表只读字段 —— 育苗批号 / 状态徽章 / 关联生产计划，口径与列表一致 */}
        <div className="col-span-2">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-indigo-900">
                育苗批号：<span className="font-semibold text-indigo-700 font-mono">{record.seedlingCode || '-'}</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEEDLING_STATUS_BADGE_MAP[record.status]?.color || SEEDLING_STATUS_BADGE_MAP.transplanted.color}`}>
                {SEEDLING_STATUS_BADGE_MAP[record.status]?.label || SEEDLING_STATUS_BADGE_MAP.transplanted.label}
              </span>
              {record.productionPlanCode && (
                <span className="text-xs text-gray-500">
                  关联生产计划：
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">{record.productionPlanCode}</span>
                </span>
              )}
              <span className="text-sm font-semibold text-indigo-900">
                繁殖模式：
                <span className="text-sm text-indigo-700 font-medium">
                  {(() => {
                    const map: Record<string, string> = {
                      seed: '种子育苗',
                      layering: '匍匐茎育苗',
                      tissue_culture: '组培育苗',
                      cutting: '扦插育苗',
                      one_to_one: '1:1 育苗',
                      one_to_many: '1:多 育苗',
                    };
                    return map[record.propagationMode || 'one_to_one'] || '1:1 育苗';
                  })()}
                </span>
                <span className="text-xs text-gray-500 ml-1">（建档后不可修改）</span>
              </span>
              {/* 2026-10-17：计算模式此前在编辑弹窗无展示，且 API 映射丢失导致保存被覆盖 */}
              <span className="text-sm font-semibold text-indigo-900">
                计算模式：
                <span className="text-sm text-indigo-700 font-medium">
                  {record.calculateMode === 'propagation' ? '扩繁育苗' : '单株育苗'}
                </span>
              </span>
            </div>
            <span className="text-xs text-amber-600">数量字段由「每日记录」自动累加</span>
          </div>
        </div>

        {/* 关联种源 - 方案2.7: combogrid下拉表格替代Select
            2026-10-17：与「作物品种」并排显示（各占一列） */}
        <div>
          <Label className="text-gray-900">关联种源</Label>
          <div className="relative">
            <Input
              type="text"
              value={sourcePopoverOpen ? sourceSearch : selectedSourceLabel}
              placeholder="搜索种源批号或作物品种..."
              onFocus={() => {
                setSourcePopoverOpen(true);
                setSourceSearch('');
              }}
              onChange={(e) => {
                setSourceSearch(e.target.value);
                setSourcePopoverOpen(true);
              }}
              className={deepInputClass}
            />
            {formData.sourceId && (
              <Button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '', selectedCropCode: '', cropName: '', cropVariety: '', sourceConsumedQuantity: 0 }));
                  setSourceSearch('');
                }}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {sourcePopoverOpen && (
              <div ref={sourcePopoverRef} className="absolute z-50 mt-1 bg-white border border-gray-400 rounded-lg shadow-lg max-h-64 overflow-hidden"
                style={{ minWidth: '500px', left: 0, right: 0 }}
              >
                {/* 2026-10-17：删「采购数量」列（选种源只需看可用数量）；
                    「作物名称」→「作物品种」（作物级名称无法区分品种，如草莓/红颜）；
                    列顺序：种源批号在前（用户主要按批号找），品种其次；
                    列宽按内容分配：种源批号最宽（如 SRC-SS-20261016-001 需完整显示） */}
                <div className="grid grid-cols-[1.6fr_0.85fr_0.95fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                  <div>种源批号</div>
                  <div>作物品种</div>
                  <div>可用数量</div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredSeedSources.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">无匹配种源</div>
                  ) : (
                    filteredSeedSources.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleSourceChange(s.id);
                          setSourcePopoverOpen(false);
                          setSourceSearch('');
                        }}
                        className={`grid grid-cols-[1.6fr_0.85fr_0.95fr] gap-2 px-3 py-2 text-sm border-b border-gray-100 cursor-pointer hover:bg-emerald-50 transition-colors
                          ${formData.sourceId === s.id ? 'bg-emerald-100' : ''}`}
                      >
                        <div className="truncate text-emerald-700">{s.seedCode}</div>
                        <div className="truncate font-medium text-gray-800">{getSeedSourceVarietyName(s)}</div>
                        <div className={`font-medium ${s.availableCount <= 0 ? 'text-red-500' : s.availableCount < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                          {s.availableCount} {s.unit}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                  共 {filteredSeedSources.length} 条 | 点击行选择
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 作物品种选择 — 2026-10-17：与「关联种源」并排显示 */}
        <div>
          <Label className="text-gray-900">作物品种</Label>
          <CropCodeSelector
            value={formData.selectedCropCode}
            onChange={handleCropCodeChange}
            placeholder="搜索或选择作物品种..."
            size="md"
          />
        </div>

        {/* 2026-10-17：种源与育苗单位不同口径时，种源消耗量单独维护（不随初始数量自动换算）
            2026-10-17：字段宽度调整为占弹窗一半（与其他半宽字段对齐） */}
        {sourceRequiresExplicitConsumption && (
          <div>
            <Label className="text-gray-900">
              种源消耗量（{selectedSource?.unit}）
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                step="0.001"
                value={formData.sourceConsumedQuantity || ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFormData({ ...formData, sourceConsumedQuantity: v < 0 ? 0 : v });
                }}
                className={deepInputClass}
                placeholder={`本次领用的种源数量（${selectedSource?.unit}）`}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                当前可用 {selectedSource?.availableCount ?? 0} {selectedSource?.unit}
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              种源按「{selectedSource?.unit}」计量，与育苗单位「{formData.unit}」不同；
              初始数量的变化不会自动换算种源库存，请在此单独维护实际领用量
            </p>
          </div>
        )}

        {/* 育苗区域 — 2026-10-17：移到育苗方式前面，两者保持同一行 */}
        <div>
          <Label className="text-gray-900">育苗区域</Label>
          <Select
            value={formData.siteId}
            onValueChange={(val) => {
              const site = sites.find(s => s.value === val);
              setFormData({ ...formData, siteId: val, siteName: site?.label || '' });
            }}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 育苗方式 */}
        <div>
          <Label className="text-gray-900">育苗方式</Label>
          <Select
            value={formData.seedlingType}
            onValueChange={(val) => setFormData({ ...formData, seedlingType: val })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {seedlingTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 开始日期 */}
        <div>
          <Label className="text-gray-900">开始日期</Label>
          <DatePicker className="w-full"
            selected={formData.startDate ? new Date(formData.startDate) : undefined}
            onChange={(date) => {
              const startDate = todayLocal(date);
              // 2026-10-17：开始日期后移导致已选结束日期不再晚于开始日期时，自动清空，避免留下非法区间
              setFormData(prev => ({
                ...prev,
                startDate,
                expectedEndDate: prev.expectedEndDate && prev.expectedEndDate <= startDate ? '' : prev.expectedEndDate,
              }));
            }}
          />
        </div>

        {/* 预计结束日期 */}
        <div>
          <Label className="text-gray-900">预计结束日期</Label>
          <DatePicker className="w-full"
            selected={formData.expectedEndDate ? new Date(formData.expectedEndDate) : undefined}
            // 2026-10-17：日历层面禁选「开始日期及更早」的日期，从根上避免选到不合理的结束日期
            disabledDays={formData.startDate
              ? (date: Date) => date <= new Date(`${formData.startDate}T00:00:00`)
              : undefined}
            onChange={(date) => setFormData({ ...formData, expectedEndDate: todayLocal(date) })}
          />
        </div>

        {/* 母株数量 + 初始数量 + 单位 — 2026-10-17
            1:多：整行 8 列栅格 —— 母株数量 4/8（一半）｜初始数量 3/8｜单位 1/8
            1:1 ：不占整行，作为普通半宽单元格自动排入上一行剩余半边（与「预计结束日期」同一行）
                  内部 4 列栅格：初始数量 3/4｜单位 1/4，合计占弹窗宽度一半 */}
        <div className={record.propagationMode === 'one_to_many'
          ? 'col-span-2 grid grid-cols-8 gap-3'
          : 'grid grid-cols-4 gap-3'}>
          {/* 2026-10-17：仅 1:多 保留「母株数量」输入（绑定母株池基数 mother_plant_count）；
              1:1 的"成活数量"是派生值（母株 + 补苗 − 损耗），不再提供输入，避免继续写死字段 survival_count */}
          {record.propagationMode === 'one_to_many' && (
            <div className="col-span-4">
              <Label className="text-gray-700">
                母株数量
                <span className="text-xs text-gray-500 ml-1">（建档投入的母株数，参与"母株存活"计算）</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={formData.motherPlantCount || ''}
                title="母株池基数：母株存活 = 母株 + 补苗 − 母株损耗"
                className={deepInputClass}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const nv = v < 0 ? 0 : v;
                  // 2026-10-17 不变量同步：与「初始数量」恒等（后端 PUT 双向强制同口径）
                  setFormData({ ...formData, motherPlantCount: nv, initialCount: nv });
                }}
              />
            </div>
          )}

          <div className="col-span-3">
            <Label className="text-gray-900">初始数量</Label>
            <Input
              type="number"
              min={0}
              value={formData.initialCount || ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                const nv = v < 0 ? 0 : v;
                // 2026-10-17 不变量同步：母株池基数与初始数量恒等（后端 PUT 双向强制同口径）
                setFormData({ ...formData, initialCount: nv, motherPlantCount: nv });
              }}
              className={deepInputClass}
            />
          </div>

          {/* 单位 — 2026-07-01 P1-6 修复：改为 DictSelect（category="unit"），与 AddModal/种植 AddModal 跨页统一 */}
          <div className="col-span-1">
            <Label className="text-gray-900">单位</Label>
            <DictSelect
              category="unit"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
              placeholder="选择单位"
            />
          </div>
        </div>

        {/* 2026-06-28：彻底移除"已定植数量"输入框
      业务规则变更：种植管理不再从育苗管理取苗（统一从内部种源页面），育苗小苗全部先入库作物库存再出库。
      因此"已定植数量"无业务含义，留着只会误导。*/}

        {/* 2026-06-16: 5 业务字段 + 补苗累计（数量体系重构后字段）
            2026-07-21 修复：添加 onChange，让这些字段可以编辑保存（之前只读无法写入 DB）
            2026-10-17 重构：① 按 1:1 / 1:多 分模式显示（与列表口径一致：1:1 无小苗产出池）
            ② 补派生只读字段（存活/剩余/完成比例 —— 列表有而弹窗无，实时计算）
            ③ 每行 3 个字段 */}
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-amber-900">数量统计（自动累加，可手动纠错）</span>
          </div>

          {/* 累计字段（可编辑纠错） — 每行 3 个 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 母株/植株累计损耗：1:1 口径为"植株损耗"（列表合并损耗列的基础项） */}
            <div>
              <Label className="text-gray-700">{isOneToOneMode(record) ? '植株累计损耗（母株）' : '母株累计损耗'}</Label>
              <Input type="number" min={0} value={formData.motherLossCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, motherLossCount: v < 0 ? 0 : v }); }} />
            </div>
            {/* 小苗累计产出 — 仅 1:多（1:1 无产出池：列表显示 —，弹窗同步隐藏） */}
            {!isOneToOneMode(record) && (
              <div>
                <Label className="text-gray-700">小苗累计产出</Label>
                <Input type="number" min={0} value={formData.expandedPlantCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                  className={deepInputClass}
                  onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, expandedPlantCount: v < 0 ? 0 : v }); }} />
              </div>
            )}
            {/* 小苗累计损耗 — 1:1 下为"历史小苗损耗"（列表已并入植株损耗列，保留编辑入口以纠错历史数据） */}
            <div>
              <Label className="text-gray-700">{isOneToOneMode(record) ? '历史小苗损耗' : '小苗累计损耗'}</Label>
              <Input type="number" min={0} value={formData.seedlingLossCount || ''}
                title={isOneToOneMode(record) ? '1:1 历史数据：已计入「植株累计损耗」列' : '从每日记录累加（手动修改仅用于纠错）'}
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, seedlingLossCount: v < 0 ? 0 : v }); }} />
            </div>
            <div>
              <Label className="text-gray-700">采收入库累计</Label>
              <Input type="number" min={0} value={formData.harvestStockedCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, harvestStockedCount: v < 0 ? 0 : v }); }} />
            </div>
            {/* 2026-06-16: 补苗累计（严格区分母株/小苗池子） */}
            <div>
              <Label className="text-gray-700">补苗累计</Label>
              <Input type="number" min={0} value={formData.replantCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, replantCount: v < 0 ? 0 : v }); }} />
            </div>
          </div>

          {/* 派生数量（实时计算，只读） — 每行 3 个，与列表派生列同口径 */}
          {(() => {
            const alive = getMotherAliveCount(merged);
            const remaining = getSeedlingRemainingCount(merged);
            const target = formData.targetSurvivalCount || 0;
            const stocked = Math.max(0, formData.harvestStockedCount || 0);
            // 与列表"完成比例"列同口径：封顶 999%（min(ratio, 9.99)），避免超目标 100 倍时显示 10040% 这类值
            const ratioText = target > 0 ? `${Math.round(Math.max(0, Math.min(stocked / target, 9.99)) * 100)}%` : '-';
            const derivedValueClass = 'px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-semibold text-gray-800';
            return (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-gray-600">
                    {isOneToOneMode(record) ? '存活数' : '母株存活数'}<span className="text-xs text-gray-400 ml-1">（实时计算）</span>
                  </Label>
                  <div className={derivedValueClass} title={getMotherAliveFormula(merged)}>{alive.toLocaleString()}</div>
                </div>
                {!isOneToOneMode(record) && (
                  <div>
                    <Label className="text-gray-600">母株池剩余<span className="text-xs text-gray-400 ml-1">（母株 + 补苗 − 损耗）</span></Label>
                    <div className={derivedValueClass}>{getMotherLossCapacity(merged).toLocaleString()}</div>
                  </div>
                )}
                <div>
                  <Label className="text-gray-600">
                    {isOneToOneMode(record) ? '可出圃数量' : '小苗池剩余'}
                    <span className="text-xs text-gray-400 ml-1">（{isOneToOneMode(record) ? '存活 − 已入库' : '产出 − 损耗 − 已入库'}）</span>
                  </Label>
                  <div className={derivedValueClass}>{remaining.toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-gray-600">完成比例<span className="text-xs text-gray-400 ml-1">（已入库 ÷ 目标）</span></Label>
                  <div className={derivedValueClass}>{ratioText}</div>
                </div>
              </div>
            );
          })()}

          {/* 公式说明 — 固定口径（派生字段已带实时数字，此处只留公式） */}
          <p className="text-xs text-gray-500 mt-2">
            {isOneToOneMode(record)
              ? '1:1 单池：存活 = 初始 + 补苗 − 损耗累计；可出圃 = 存活 − 已入库（苗即母株）'
              : '1:多 双池：母株池剩余 = 母株 + 补苗 − 母株损耗；小苗池剩余 = 产出 − 损耗 − 已入库（两池独立，不合并）'}
          </p>
          {/* 2026-10-17：提示语按实际代码口径修正 —— 累计字段为差额实时累加，重启不会重算/回填 */}
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ 以上累计字段由每日记录/入库按差额实时累加，手动修改仅用于纠错。修改只调整主表累计值，不会改写历史记录，因此累计值与每日记录、入库明细的合计可能不一致；修正值会保留，后续新增记录在其基础上继续累加。
          </p>
        </div>

        {/* 负责人 — 2026-10-17：与新增弹窗口径统一，改用 operator 字典下拉 */}
        <div>
          <Label className="text-gray-900">负责人</Label>
          <DictSelect
            category="operator"
            value={formData.chargePerson}
            onChange={(value) => setFormData({ ...formData, chargePerson: value })}
            placeholder="请选择负责人"
          />
        </div>

        {/* 目标成活数量 + 单位 — 2026-10-17：与「初始数量 + 单位」同款布局（占半宽，3:1 分配）；
            单位与初始数量的单位共用 formData.unit，两处修改同步生效 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3">
            <Label className="text-gray-900">目标成活数量</Label>
            <Input
              type="number"
              min={0}
              value={formData.targetSurvivalCount || ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFormData({ ...formData, targetSurvivalCount: v < 0 ? 0 : v });
              }}
              className={deepInputClass}
              placeholder="请输入目标成活数量"
            />
          </div>
          <div className="col-span-1">
            <Label className="text-gray-900">单位</Label>
            <DictSelect
              category="unit"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value })}
              placeholder="选择单位"
            />
          </div>
        </div>

        {/* 品质等级 — 2026-10-17：改用质量等级字典（special/excellent/good/qualified/unqualified），与新增弹窗统一 */}
        <div>
          <Label className="text-gray-900">品质等级</Label>
          <DictSelect
            category="quality_level"
            value={formData.qualityGrade}
            onChange={(value) => setFormData({ ...formData, qualityGrade: value })}
            placeholder="请选择品质等级"
          />
        </div>

        {/* 备注 - 2026-10-17：移到弹窗最后位置，占两列 */}
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

        {/* 2026-10-17：删除「是否结束」编辑项 —— 结束状态由列表「结束」按钮维护（status/end_type/end_time），
            该字段在 DB 无列、后端白名单不支持，此前编辑不生效且详情/导出恒显示「否」 */}
      </div>
    </UnifiedModal>
  );
}
