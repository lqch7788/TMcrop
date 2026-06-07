/**
 * 快速新增品种弹窗
 * 在种源/育苗等新增场景中快速添加新品种
 */

import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Search, Plus, Sprout } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import * as cropVarietyService from '../../../../services/cropVarietyService';
import {
  getTypeOptionsByCategory as getExtendedTypeOptions,
  getVarietyOptionsByType as getExtendedVarietyOptions,
  initExtensionCache
} from '../../../../services/cropVarietyExtensionService';
import { CropVariety } from '../../../../types/cropVariety';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (variety: CropVariety) => void;
}

export function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
  // 分类选择状态
  const [step, setStep] = useState<'category' | 'type' | 'variety'>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');

  // 别名和附加信息
  const [alias, setAlias] = useState('');
  const [growthCycle, setGrowthCycle] = useState<number | undefined>();
  const [targetYield, setTargetYield] = useState<number | undefined>();
  const [remarks, setRemarks] = useState('');

  // 选项数据
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [varietyOptions, setVarietyOptions] = useState<Array<{ value: string; label: string }>>([]);

  // 预览编码
  const [previewCode, setPreviewCode] = useState('');

  // 初始化选项数据（含扩展缓存）
  useEffect(() => {
    const categories = cropVarietyService.getCategoryOptions();
    setCategoryOptions(categories);
    initExtensionCache(); // 确保扩展数据缓存已初始化
  }, []);

  // 当选择类别变化时，加载类型选项
  useEffect(() => {
    if (selectedCategory) {
      const types = getExtendedTypeOptions(selectedCategory);
      setTypeOptions(types);
      setSelectedType('');
      setSelectedVariety('');
      setStep('type');
    }
  }, [selectedCategory]);

  // 当选择类型变化时，加载品种选项
  useEffect(() => {
    if (selectedCategory && selectedType) {
      const varieties = getExtendedVarietyOptions(selectedCategory, selectedType);
      setVarietyOptions(varieties);
      setSelectedVariety('');
      setStep('variety');
    }
  }, [selectedCategory, selectedType]);

  // 当选择品种时，生成预览编码
  useEffect(() => {
    if (selectedCategory && selectedType && selectedVariety) {
      const code = cropVarietyService.generateCropCode(
        selectedCategory,
        selectedType,
        selectedVariety
      );
      setPreviewCode(code);
    }
  }, [selectedCategory, selectedType, selectedVariety]);

  // 重置表单
  const resetForm = () => {
    setStep('category');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedVariety('');
    setAlias('');
    setGrowthCycle(undefined);
    setTargetYield(undefined);
    setRemarks('');
    setPreviewCode('');
  };

  // 关闭弹窗时重置
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 提交新增
  const handleSubmit = () => {
    if (!selectedCategory || !selectedType || !selectedVariety) {
      showAlert('请完成所有分类选择');
      return;
    }

    // 获取类别和类型名称
    const categoryName = categoryOptions.find(c => c.value === selectedCategory)?.label || '';
    const typeName = typeOptions.find(t => t.value === selectedType)?.label || '';
    const varietyName = varietyOptions.find(v => v.value === selectedVariety)?.label || '';

    // 处理别名（统一使用四种分隔符：逗号、顿号、分号）
    const aliasList = alias
      .split(/[,，;；]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);

    // 新增品种
    const newVariety = cropVarietyService.addVariety({
      categoryCode: selectedCategory,
      categoryName,
      typeCode: selectedType,
      typeName,
      varietyCode: selectedVariety,
      varietyName,
      alias: aliasList.length > 0 ? aliasList : undefined,
      growthCycle,
      targetYield,
      yieldUnit: targetYield ? 'kg/亩' : undefined,
      status: 'active',
      remarks: remarks || undefined
    });

    onSuccess(newVariety);
    handleClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="快速新增品种"
      size="lg"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="确认新增"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === 'category' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">1</span>
            选择类别
          </div>
          <div className="text-gray-300">→</div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === 'type' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">2</span>
            选择类型
          </div>
          <div className="text-gray-300">→</div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${step === 'variety' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">3</span>
            选择品种
          </div>
        </div>

        {/* 分类选择区 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 类别 */}
          <div>
            <Label className="text-gray-700">
              <span className="text-red-500">*</span> 类别
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(val)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 类型 */}
          <div>
            <Label className="text-gray-700">
              <span className="text-red-500">*</span> 类型
            </Label>
            <Select
              value={selectedType}
              onValueChange={(val) => setSelectedType(val)}
              disabled={!selectedCategory}
            >
              <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 品种 */}
          <div>
            <Label className="text-gray-700">
              <span className="text-red-500">*</span> 品种
            </Label>
            <Select
              value={selectedVariety}
              onValueChange={(val) => setSelectedVariety(val)}
              disabled={!selectedType}
            >
              <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {varietyOptions.map(v => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 自动生成的编码预览 */}
        {previewCode && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">系统自动生成编码</span>
            </div>
            <p className="text-2xl font-mono font-bold text-emerald-700">{previewCode}</p>
            <p className="text-xs text-emerald-600 mt-1">
              编码规则：类别(2位) + 类型(2位) + 品种(2位) + 流水号(3位)
            </p>
          </div>
        )}

        {/* 附加信息 */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">附加信息（可选）</h4>

          <div className="grid grid-cols-2 gap-4">
            {/* 别名 */}
            <div>
              <Label className="text-gray-700">别名</Label>
              <Input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="如：西红柿、洋柿子（逗号分隔）"
                className={deepInputClass}
              />
              <p className="mt-1 text-xs text-gray-400">支持多个别名，逗号分隔</p>
            </div>

            {/* 生长周期 */}
            <div>
              <Label className="text-gray-700">生长周期（天）</Label>
              <Input
                type="number"
                value={growthCycle || ''}
                onChange={(e) => setGrowthCycle(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="如：120"
                className={deepInputClass}
              />
            </div>

            {/* 目标产量 */}
            <div>
              <Label className="text-gray-700">目标产量（kg/亩）</Label>
              <Input
                type="number"
                value={targetYield || ''}
                onChange={(e) => setTargetYield(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="如：5000"
                className={deepInputClass}
              />
            </div>

            {/* 备注 */}
            <div>
              <Label className="text-gray-700">备注</Label>
              <Input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="其他说明"
                className={deepInputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
