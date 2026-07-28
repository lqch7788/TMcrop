/**
 * 育苗编辑弹窗
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Seedling, SeedSource } from '../../../../types/crop';
import { useSeedlingStore } from '../../../../stores/useSeedlingStore';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  seedSources: SeedSource[];
  cropVarietyOptions: CropVarietyOption[];
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
  cropVarietyOptions,
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
    survivalCount: record.survivalCount,
    plantedCount: 0, // 2026-06-28：保留字段以兼容后端 PUT ALLOWED_FIELDS，但前端不再使用
    remarks: record.remarks || '',
    // 方案2.6: 育苗工时
    // 2026-07-21 修复：workHours 映射到 seedlingTaskTime（对齐详情显示）
    workHours: record.seedlingTaskTime || 0,
    // 新增缺失字段
    qualityGrade: record.qualityGrade || '',
    isFinished: record.isFinished || false,
    chargePerson: record.chargePerson || '',
    targetSurvivalCount: record.targetSurvivalCount || 0,
    // 补齐 AddModal 同名字段 — 否则编辑保存会丢这些值
    targetSurvivalRate: record.targetSurvivalRate || 0,
    productionPlanId: record.productionPlanCode || '',
    planType: record.planType || 'routine',
    calculateMode: record.calculateMode || 'single',
    motherPlantCount: record.motherPlantCount || 0,
    propagationMultiple: record.propagationMultiple || 0,
    customMultiple: record.customMultiple || 0,
    theoreticalYield: record.theoreticalYield || 0,
    // 2026-06-15: 数量体系重构 — 4 业务字段（统一显示，2026-06-25 移除 autoPlantedCount，2026-06-28 移除 transplantedCount）
    motherLossCount: record.motherLossCount ?? 0,
    seedlingLossCount: record.seedlingLossCount ?? 0,
    harvestStockedCount: record.harvestStockedCount ?? 0,
    replantCount: record.replantCount ?? 0,  // 2026-06-16: 补苗累计
  });

  const updateItem = useSeedlingStore((s) => s.updateItem);

  // 方案2.7: combogrid种源选择器状态
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);

  const filteredSeedSources = useMemo(() => {
    if (!sourceSearch) return seedSources || [];
    const q = sourceSearch.toLowerCase();
    return (seedSources || []).filter(s =>
      s.seedCode?.toLowerCase().includes(q) ||
      s.cropName?.toLowerCase().includes(q) ||
      s.cropVariety?.toLowerCase().includes(q)
    );
  }, [seedSources, sourceSearch]);

  const selectedSourceLabel = useMemo(() => {
    const source = seedSources.find(s => s.id === formData.sourceId);
    return source ? `${source.seedCode} - ${source.cropName}` : '';
  }, [seedSources, formData.sourceId]);

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
      siteId: resolvedSiteId,
      siteName: record.siteName,
      startDate: record.startDate,
      expectedEndDate: record.expectedEndDate || '',
      endDate: record.endDate || '',
      initialCount: record.initialCount,
      survivalCount: record.survivalCount,
      // 2026-06-28：移除 plantedCount 字段（业务规则：种植管理不再从育苗取苗）
      remarks: record.remarks || '',
      // 2026-07-28 审核 H-6：workHours 字段不存在，正确的是 seedlingTaskTime（与 useState 行 65 对齐）
      workHours: record.seedlingTaskTime || 0,
      // 新增缺失字段
      qualityGrade: record.qualityGrade || '',
      isFinished: record.isFinished || false,
      chargePerson: record.chargePerson || '',
      targetSurvivalCount: record.targetSurvivalCount || 0,
      // 补齐 AddModal 同名字段
      targetSurvivalRate: record.targetSurvivalRate || 0,
      productionPlanId: record.productionPlanCode || '',
      planType: record.planType || 'routine',
      calculateMode: record.calculateMode || 'single',
      motherPlantCount: record.motherPlantCount || 0,
      propagationMultiple: record.propagationMultiple || 0,
      customMultiple: record.customMultiple || 0,
      theoreticalYield: record.theoreticalYield || 0,
      // 2026-06-15: 数量体系重构 — 4 业务字段（2026-06-25 移除 autoPlantedCount，2026-06-28 移除 transplantedCount）
      motherLossCount: record.motherLossCount ?? 0,
      seedlingLossCount: record.seedlingLossCount ?? 0,
      harvestStockedCount: record.harvestStockedCount ?? 0,
    });
  }, [record]);

  const handleSubmit = async () => {
    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || formData.siteName;

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || formData.sourceCode;

    // 计算成苗率和损耗
    const survivalCount = formData.survivalCount;
    const initialCount = formData.initialCount;
    const survivalRate = initialCount > 0 ? Math.round((survivalCount / initialCount) * 100) : 0;
    const lossCount = initialCount - survivalCount;
    const lossRate = initialCount > 0 ? Math.round((lossCount / initialCount) * 100) : 0;

    try {
      await updateItem(String(record.id), {
        sourceId: formData.sourceId,
        sourceCode,
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
        isFinished: formData.isFinished,
        chargePerson: formData.chargePerson,
        targetSurvivalCount: formData.targetSurvivalCount,
        targetSurvivalRate: formData.targetSurvivalRate,
        productionPlanCode: formData.productionPlanId || undefined,
        planType: formData.planType,
        calculateMode: formData.calculateMode,
        motherPlantCount: formData.motherPlantCount,
        propagationMultiple: formData.propagationMultiple,
        customMultiple: formData.customMultiple,
        theoreticalYield: formData.theoreticalYield,
        workHours: formData.workHours || undefined,
        // 2026-07-21 修复：添加 5 个数量字段 + replantCount 到提交 payload（之前缺失导致无法保存）
        motherLossCount: formData.motherLossCount,
        expandedPlantCount: formData.expandedPlantCount,
        seedlingLossCount: formData.seedlingLossCount,
        harvestStockedCount: formData.harvestStockedCount,
        replantCount: formData.replantCount,
      });
    } catch (error) {
      // logger.error('更新育苗记录失败:', error);
      await showAlert('更新失败，请重试');
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
        cropVariety: source.cropVariety
      });
    }
  };

  // 处理作物品种选择
  const handleCropCodeChange = (cropCode: string, varietyInfo: unknown) => {
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
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* 2026-06-14: 繁殖模式 banner（建档后锁定） */}
        <div className="col-span-2">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-indigo-900">繁殖模式：</span>
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
              <span className="text-xs text-gray-500 ml-2">（建档后不可修改）</span>
            </div>
            <span className="text-xs text-amber-600">数量字段由「每日记录」自动累加</span>
          </div>
        </div>

        {/* 关联种源 - 方案2.7: combogrid下拉表格替代Select */}
        <div className="col-span-2">
          <Label className="text-gray-900">关联种源</Label>
          <div className="relative">
            <Input
              type="text"
              value={sourcePopoverOpen ? sourceSearch : selectedSourceLabel}
              placeholder="搜索种源批号或作物名称..."
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
                  setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '', selectedCropCode: '', cropName: '', cropVariety: '' }));
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
                <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                  <div>作物名称</div>
                  <div>种源批号</div>
                  <div>采购数量</div>
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
                        className={`grid grid-cols-4 gap-2 px-3 py-2 text-sm border-b border-gray-100 cursor-pointer hover:bg-emerald-50 transition-colors
                          ${formData.sourceId === s.id ? 'bg-emerald-100' : ''}`}
                      >
                        <div className="truncate font-medium text-gray-800">{s.cropName}</div>
                        <div className="truncate text-emerald-700">{s.seedCode}</div>
                        <div className="text-gray-600">{s.quantity} {s.unit}</div>
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

        {/* 作物品种选择 */}
        <div className="col-span-2">
          <Label className="text-gray-900">作物品种</Label>
          <CropCodeSelector
            value={formData.selectedCropCode}
            onChange={handleCropCodeChange}
            placeholder="搜索或选择作物品种..."
            size="md"
          />
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

        {/* 2026-07-01 P1-6 修复：单位改为 DictSelect（category="unit"），与 AddModal/种植 AddModal 跨页统一 */}
        <div>
          <Label className="text-gray-900">单位</Label>
          <DictSelect
            category="unit"
            value={formData.unit}
            onChange={(value) => setFormData({ ...formData, unit: value })}
            placeholder="选择单位"
          />
        </div>

        {/* 育苗区域 */}
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

        {/* 开始日期 */}
        <div>
          <Label className="text-gray-900">开始日期</Label>
          <DatePicker className="w-full"
            selected={formData.startDate ? new Date(formData.startDate) : undefined}
            onChange={(date) => setFormData({ ...formData, startDate: todayLocal(date) })}
          />
        </div>

        {/* 预计结束日期 */}
        <div>
          <Label className="text-gray-900">预计结束日期</Label>
          <DatePicker className="w-full"
            selected={formData.expectedEndDate ? new Date(formData.expectedEndDate) : undefined}
            onChange={(date) => setFormData({ ...formData, expectedEndDate: todayLocal(date) })}
          />
        </div>

        {/* 初始数量 */}
        <div>
          <Label className="text-gray-900">初始数量</Label>
          <Input
            type="number"
            min={0}
            value={formData.initialCount || ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFormData({ ...formData, initialCount: v < 0 ? 0 : v });
            }}
            className={deepInputClass}
          />
        </div>

        {/* 成活数量 / 母株数量（按模式显示，由每日记录自动累加，可手动纠错） */}
        <div>
          <Label className="text-gray-700">
            {record.propagationMode === 'one_to_many' ? '母株数量' : '成活数量'}
            <span className="text-xs text-gray-500 ml-1">（每日记录自动累加，可手动纠错）</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={formData.survivalCount || ''}
            title="从每日记录累加（手动修改仅用于纠错）"
            className={deepInputClass}
            onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, survivalCount: v < 0 ? 0 : v }); }}
          />
        </div>

        {/* 2026-06-28：彻底移除"已定植数量"输入框
      业务规则变更：种植管理不再从育苗管理取苗（统一从内部种源页面），育苗小苗全部先入库作物库存再出库。
      因此"已定植数量"无业务含义，留着只会误导。*/}

        {/* 2026-06-16: 5 业务字段 + 补苗累计（数量体系重构后字段） */}
        {/* 2026-07-21 修复：添加 onChange，让这些字段可以编辑保存（之前只读无法写入 DB） */}
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-amber-900">数量统计（自动累加，可手动纠错）</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">母株累计损耗</Label>
              <Input type="number" min={0} value={formData.motherLossCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, motherLossCount: v < 0 ? 0 : v }); }} />
            </div>
            <div>
              <Label className="text-gray-700">小苗累计产出</Label>
              <Input type="number" min={0} value={formData.expandedPlantCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
                className={deepInputClass}
                onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, expandedPlantCount: v < 0 ? 0 : v }); }} />
            </div>
            <div>
              <Label className="text-gray-700">小苗累计损耗</Label>
              <Input type="number" min={0} value={formData.seedlingLossCount || ''} title="从每日记录累加（手动修改仅用于纠错）"
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
          <p className="text-xs text-gray-500 mt-2">
            {/* 2026-06-16: 剩余可定植公式按模式分支（兼容历史脏数据：mother - motherLoss） */}
            {/* 1:1 模式：expanded = mother（后端同步），只算一次：expanded - 各种 */}
            {/* 1:多 模式：母株池剩余 = 母株存活 - 母株损耗 + 补苗 | 小苗池剩余 = 小苗产出 - 小苗损耗 - 采收入库（2026-06-28 移除人工/自动定植） */}
            {(() => {
              const is11 = (record.propagationMode || 'one_to_one') === 'one_to_one';
              // 母株池 / 小苗池 严格分离计算（不合并）
              const motherAvailable = (record.motherPlantCount || 0) - (record.motherLossCount || 0) + (record.replantCount || 0);
              const seedlingAvailable = (record.expandedPlantCount || 0)
                - (formData.seedlingLossCount || 0)
                - (formData.harvestStockedCount || 0);
              return `母株池剩余 = ${Math.max(0, motherAvailable).toLocaleString()} 株 | 小苗池剩余 = ${Math.max(0, seedlingAvailable).toLocaleString()} 株（两池独立，不合并）`;
            })()}
          </p>
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

        {/* 负责人 */}
        <div>
          <Label className="text-gray-900">负责人</Label>
          <Input
            type="text"
            value={formData.chargePerson}
            onChange={(e) => setFormData({ ...formData, chargePerson: e.target.value })}
            className={deepInputClass}
            placeholder="请输入负责人"
          />
        </div>

        {/* 目标成活数量 */}
        <div>
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

        {/* 方案2.6: 育苗工时 */}
        <div>
          <Label className="text-gray-900">工时（小时）</Label>
          <Input
            type="number"
            min={0}
            value={formData.workHours || ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFormData({ ...formData, workHours: (v < 0 ? 0 : v) || 0 });
            }}
            className={deepInputClass}
            placeholder="请输入育苗工时"
            step="0.5"
          />
        </div>

        {/* 品质等级 */}
        <div>
          <Label className="text-gray-900">品质等级</Label>
          <Select
            value={formData.qualityGrade}
            onValueChange={(val) => setFormData({ ...formData, qualityGrade: val })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue placeholder="请选择品质等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A级">A级</SelectItem>
              <SelectItem value="B级">B级</SelectItem>
              <SelectItem value="C级">C级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 是否结束 */}
        <div>
          <Label className="text-gray-900">是否结束</Label>
          <DictSelect
            category="yes_no"
            value={formData.isFinished ? 'yes' : 'no'}
            onChange={(value) => setFormData({ ...formData, isFinished: value === 'yes' })}
            placeholder="选择是否结束"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
