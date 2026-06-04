/**
 * 育苗编辑弹窗
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { Seedling, SeedSource } from '../../../../types/crop';
import { useSeedlingStore } from '../../../../stores/useSeedlingStore';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '../../../ui/input';
import { DatePicker } from '../../../ui/DatePicker';
import { Label } from '@/components/ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
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
    targetSurvivalCount: record.targetSurvivalCount || 0
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
    setFormData({
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
      targetSurvivalCount: record.targetSurvivalCount || 0
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
                ×
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

        {/* 温室场地 */}
        <div>
          <Label className="text-gray-900">温室场地</Label>
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
            onChange={(date) => setFormData({ ...formData, startDate: date.toISOString().split('T')[0] })}
          />
        </div>

        {/* 预计结束日期 */}
        <div>
          <Label className="text-gray-900">预计结束日期</Label>
          <DatePicker className="w-full"
            selected={formData.expectedEndDate ? new Date(formData.expectedEndDate) : undefined}
            onChange={(date) => setFormData({ ...formData, expectedEndDate: date.toISOString().split('T')[0] })}
          />
        </div>

        {/* 初始数量 */}
        <div>
          <Label className="text-gray-900">初始数量</Label>
          <Input
            type="number"
            value={formData.initialCount || ''}
            onChange={(e) => setFormData({ ...formData, initialCount: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 成活数量 */}
        <div>
          <Label className="text-gray-900">成活数量</Label>
          <Input
            type="number"
            value={formData.survivalCount || ''}
            onChange={(e) => setFormData({ ...formData, survivalCount: Number(e.target.value) })}
            className={deepInputClass}
          />
        </div>

        {/* 已定植数量 */}
        <div>
          <Label className="text-gray-900">已定植数量</Label>
          <Input
            type="number"
            value={formData.plantedCount || ''}
            onChange={(e) => setFormData({ ...formData, plantedCount: Number(e.target.value) })}
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
            value={formData.targetSurvivalCount || ''}
            onChange={(e) => setFormData({ ...formData, targetSurvivalCount: Number(e.target.value) })}
            className={deepInputClass}
            placeholder="请输入目标成活数量"
          />
        </div>

        {/* 方案2.6: 育苗工时 */}
        <div>
          <Label className="text-gray-900">工时（小时）</Label>
          <Input
            type="number"
            value={formData.workHours || ''}
            onChange={(e) => setFormData({ ...formData, workHours: Number(e.target.value) || 0 })}
            className={deepInputClass}
            placeholder="请输入育苗工时"
            min="0"
            step="0.5"
          />
        </div>

        {/* 品质等级 */}
        <div>
          <Label className="text-gray-900">品质等级</Label>
          <Input
            type="text"
            value={formData.qualityGrade}
            onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
            className={deepInputClass}
            placeholder="请输入品质等级"
          />
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
