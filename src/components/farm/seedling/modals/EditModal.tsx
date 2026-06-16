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
    siteId: record.siteId,
    siteName: record.siteName,
    startDate: record.startDate,
    expectedEndDate: record.expectedEndDate || '',
    endDate: record.endDate || '',
    initialCount: record.initialCount,
    survivalCount: record.survivalCount,
    plantedCount: record.plantedCount,
    remarks: record.remarks || '',
    // 方案2.6: 育苗工时
    workHours: (record as any).workHours || 0,
    // 新增缺失字段
    qualityGrade: record.qualityGrade || '',
    isFinished: record.isFinished || false,
    chargePerson: record.chargePerson || '',
    targetSurvivalCount: record.targetSurvivalCount || 0,
    // 补齐 AddModal 同名字段 — 否则编辑保存会丢这些值
    targetSurvivalRate: (record as any).targetSurvivalRate || 0,
    productionPlanId: (record as any).productionPlanCode || '',
    planType: (record as any).planType || 'routine',
    calculateMode: (record as any).calculateMode || 'single',
    motherPlantCount: (record as any).motherPlantCount || 0,
    propagationMultiple: (record as any).propagationMultiple || 0,
    customMultiple: (record as any).customMultiple || 0,
    theoreticalYield: (record as any).theoreticalYield || 0,
    // 2026-06-15: 数量体系重构 — 5 业务字段（统一显示）
    motherLossCount: (record as any).motherLossCount ?? 0,
    seedlingLossCount: (record as any).seedlingLossCount ?? 0,
    transplantedCount: (record as any).transplantedCount ?? 0,
    autoPlantedCount: (record as any).autoPlantedCount ?? 0,
    harvestStockedCount: (record as any).harvestStockedCount ?? 0,
  });

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
      plantedCount: record.plantedCount,
      remarks: record.remarks || '',
      // 方案2.6: 育苗工时
      workHours: (record as any).workHours || 0,
      // 新增缺失字段
      qualityGrade: record.qualityGrade || '',
      isFinished: record.isFinished || false,
      chargePerson: record.chargePerson || '',
      targetSurvivalCount: record.targetSurvivalCount || 0,
      // 补齐 AddModal 同名字段
      targetSurvivalRate: (record as any).targetSurvivalRate || 0,
      productionPlanId: (record as any).productionPlanCode || '',
      planType: (record as any).planType || 'routine',
      calculateMode: (record as any).calculateMode || 'single',
      motherPlantCount: (record as any).motherPlantCount || 0,
      propagationMultiple: (record as any).propagationMultiple || 0,
      customMultiple: (record as any).customMultiple || 0,
      theoreticalYield: (record as any).theoreticalYield || 0,
      // 2026-06-15: 数量体系重构 — 5 业务字段
      motherLossCount: (record as any).motherLossCount ?? 0,
      seedlingLossCount: (record as any).seedlingLossCount ?? 0,
      transplantedCount: (record as any).transplantedCount ?? 0,
      autoPlantedCount: (record as any).autoPlantedCount ?? 0,
      harvestStockedCount: (record as any).harvestStockedCount ?? 0,
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
      await useSeedlingStore.getState().updateItem(String(record.id), {
        sourceId: formData.sourceId,
        sourceCode,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        cropCode: formData.selectedCropCode,
        seedlingType: formData.seedlingType,
        siteId: formData.siteId,
        siteName,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        endDate: formData.endDate,
        initialCount: formData.initialCount,
        survivalCount,
        plantedCount: formData.plantedCount,
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
                  return map[(record as any).propagationMode || 'one_to_one'] || '1:1 育苗';
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

        {/* 成活数量 / 母株数量（按模式显示，由每日记录自动累加，不可手动改） */}
        <div>
          <Label className="text-gray-700">
            {(record as any).propagationMode === 'one_to_many' ? '母株数量' : '成活数量'}
            <span className="text-xs text-gray-500 ml-1">（每日记录自动累加）</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={formData.survivalCount || ''}
            readOnly
            className={`${deepInputClass} bg-gray-100 cursor-not-allowed`}
          />
        </div>

        {/* 已定植数量 = 人工定植 + 自动定植（每日记录+种植管理自动累加，不可手动改） */}
        <div>
          <Label className="text-gray-700">
            已定植数量（人工+自动）
            <span className="text-xs text-gray-500 ml-1">（人工定植 + 自动定植 自动累加）</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={((record as any).transplantedCount || 0) + ((record as any).autoPlantedCount || 0) || ''}
            readOnly
            className={`${deepInputClass} bg-gray-100 cursor-not-allowed`}
          />
        </div>

        {/* 2026-06-16: 5 业务字段只读显示（数量体系重构后字段，UI 渲染） */}
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-amber-900">数量统计（只读，自动累加）</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">母株累计损耗</Label>
              <Input type="number" value={formData.motherLossCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-gray-700">小苗累计产出</Label>
              <Input type="number" value={formData.expandedPlantCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-gray-700">小苗累计损耗</Label>
              <Input type="number" value={formData.seedlingLossCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-gray-700">人工定植</Label>
              <Input type="number" value={formData.transplantedCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-gray-700">自动定植（种植管理累加）</Label>
              <Input type="number" value={formData.autoPlantedCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
            <div>
              <Label className="text-gray-700">采收入库</Label>
              <Input type="number" value={formData.harvestStockedCount || ''} readOnly
                className={`${deepInputClass} bg-gray-100 cursor-not-allowed`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            剩余可定植 = 母株存活 + 小苗产出 - 小苗损耗 - 人工定植 - 自动定植 - 采收入库 = {((formData.motherPlantCount || 0) + (formData.expandedPlantCount || 0) - (formData.seedlingLossCount || 0) - (formData.transplantedCount || 0) - (formData.autoPlantedCount || 0) - (formData.harvestStockedCount || 0)).toLocaleString()} 株
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
            min="0"
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
