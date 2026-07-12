/**
 * 新增肥料弹窗（扁平化 2026-07-12）
 * 单一 spec 表单，25 字段全部展示，不再有「主表 + 规格子项」两层
 */
import React, { useState, useCallback } from 'react';

import { Plus, Trash2, Wand2, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { UnitDictSelect } from '../../../common/settings/UnitDictSelect';
import { useFertilizerLibraryStore, FertilizerSpec } from '@/stores';
import { showAlert } from '@/lib/dialogService';

interface AddFertilizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 肥料类型选项（按化学性质分类）
const FERTILIZER_TYPE_OPTIONS = [
  { value: 'organic', label: '有机肥' },
  { value: 'inorganic', label: '无机肥' },
  { value: 'water_soluble', label: '水溶肥' },
  { value: 'compound', label: '复合肥' },
  { value: 'bio', label: '生物肥' },
  { value: 'slow_release', label: '缓释肥' },
  { value: 'trace', label: '微量元素肥' },
];

// 施肥时期选项（可多选）
const APPLICATION_TIMING_OPTIONS = [
  { value: 'base', label: '底肥' },
  { value: 'dressing', label: '追肥' },
  { value: 'foliar', label: '叶面肥' },
];

// 表单默认值常量（单一扁平 spec，25 字段）
const INITIAL_FORM = {
  fertilizerName: '',
  fertilizerType: 'organic',
  applicationTiming: '',
  functionDesc: '',
  tabooDesc: '',
  shelfLife: '',
  storageCondition: '',
  supplierInfo: '',
  brandName: '主品牌',
  specContent: '',
  manufacturer: '',
  suggestedDosage: '',
  suggestedRatio: '',
  dosageUnit: 'kg/亩',
  remark: '',
  unitPrice: 0,
  batchNumber: '',
  productionDate: '',
  expirationDate: '',
  stockQuantity: 0,
};

export function AddFertilizerModal({ isOpen, onClose, onSaved }: AddFertilizerModalProps) {
  const store = useFertilizerLibraryStore();

  // 表单状态：单条 spec 的全部字段
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 更新字段
  const updateField = useCallback((field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 重置表单（弹窗打开时清空）
  React.useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
    }
  }, [isOpen]);

  // 提交：扁平化后直接调一次 createItem，所有 25 字段一起提交
  // 后端会自动生成 fertilizerCode（无需前端生成）
  const handleSubmit = async () => {
    if (!form.fertilizerName.trim()) {
      await showAlert('请输入肥料名称');
      return;
    }

    setSubmitting(true);
    try {
      const newSpec = await store.createItem({
        fertilizerName: form.fertilizerName,
        fertilizerType: form.fertilizerType as any,
        applicationTiming: form.applicationTiming,
        functionDesc: form.functionDesc,
        tabooDesc: form.tabooDesc,
        shelfLife: form.shelfLife,
        storageCondition: form.storageCondition,
        supplierInfo: form.supplierInfo,
        brandName: form.brandName,
        specContent: form.specContent,
        manufacturer: form.manufacturer,
        suggestedDosage: form.suggestedDosage,
        suggestedRatio: form.suggestedRatio,
        dosageUnit: form.dosageUnit,
        remark: form.remark,
        unitPrice: Number(form.unitPrice) || 0,
        batchNumber: form.batchNumber,
        productionDate: form.productionDate,
        expirationDate: form.expirationDate,
        stockQuantity: Number(form.stockQuantity) || 0,
      });

      if (newSpec) {
        onSaved();
      } else {
        await showAlert('保存失败，请重试');
      }
    } catch (err) {
      await showAlert('保存出错：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 区域标题
  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增肥料"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 基础信息（肥料名称 + 类型 + 时期） */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  肥料名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={form.fertilizerName}
                  onChange={(e) => updateField('fertilizerName', e.target.value)}
                  placeholder="请输入肥料名称"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">肥料类型</Label>
                <Select
                  value={form.fertilizerType}
                  onValueChange={(value) => updateField('fertilizerType', value)}
                >
                  <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <SelectValue placeholder="选择肥料类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FERTILIZER_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-900">施肥时期（可多选）</Label>
              <div className="flex gap-2 mt-1">
                {APPLICATION_TIMING_OPTIONS.map((opt) => {
                  const current = form.applicationTiming
                    ? form.applicationTiming.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];
                  const checked = current.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-1 px-3 py-1 border rounded cursor-pointer hover:bg-amber-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const newSet = new Set(current);
                          if (e.target.checked) newSet.add(opt.value);
                          else newSet.delete(opt.value);
                          updateField('applicationTiming', Array.from(newSet).join(','));
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 规格信息（扁平化：单条 spec，所有字段直接展示） */}
        <div>
          <SectionTitle title="规格信息" icon="📦" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-500">品牌名称</Label>
                <Input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  placeholder="品牌名称"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">成份与含量</Label>
                <Input
                  type="text"
                  value={form.specContent}
                  onChange={(e) => updateField('specContent', e.target.value)}
                  placeholder="如 N-P2O5-K2O 15-15-15"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">生产厂家</Label>
                <Input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => updateField('manufacturer', e.target.value)}
                  placeholder="生产厂家"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">建议用量</Label>
                <Input
                  type="text"
                  value={form.suggestedDosage}
                  onChange={(e) => updateField('suggestedDosage', e.target.value)}
                  placeholder="如 100"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">单位</Label>
                <UnitDictSelect
                  value={form.dosageUnit}
                  onChange={(value) => updateField('dosageUnit', value)}
                  placeholder="选择单位"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">稀释比例</Label>
                <Input
                  type="text"
                  value={form.suggestedRatio}
                  onChange={(e) => updateField('suggestedRatio', e.target.value)}
                  placeholder="如 1:100"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">单价 (元/单位)</Label>
                <Input
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) => updateField('unitPrice', e.target.value)}
                  placeholder="如 25"
                  step="0.01"
                  min="0"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">库存量 (kg)</Label>
                <Input
                  type="number"
                  value={form.stockQuantity || ''}
                  onChange={(e) => updateField('stockQuantity', e.target.value)}
                  placeholder="如 100"
                  step="0.01"
                  min="0"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">产品批次</Label>
                <Input
                  type="text"
                  value={form.batchNumber}
                  onChange={(e) => updateField('batchNumber', e.target.value)}
                  placeholder="如 BATCH-2026-001"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">生产日期</Label>
                <Input
                  type="date"
                  value={form.productionDate}
                  onChange={(e) => updateField('productionDate', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">过期日期</Label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => updateField('expirationDate', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs text-gray-500">备注</Label>
                <Input
                  type="text"
                  value={form.remark}
                  onChange={(e) => updateField('remark', e.target.value)}
                  placeholder="备注"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 功能与禁忌 */}
        <div>
          <SectionTitle title="功能与禁忌" icon="📝" />
          <div className="space-y-3">
            <div>
              <Label className="text-gray-900">功能说明</Label>
              <TextArea
                value={form.functionDesc}
                onChange={(e) => updateField('functionDesc', e.target.value)}
                placeholder="请输入功能说明"
                rows={3}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
            <div>
              <Label className="text-gray-900">使用禁忌</Label>
              <TextArea
                value={form.tabooDesc}
                onChange={(e) => updateField('tabooDesc', e.target.value)}
                placeholder="请输入使用禁忌"
                rows={2}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 存储与供应链 */}
        <div>
          <SectionTitle title="存储与供应链" icon="🏪" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">保质期</Label>
                <Input
                  type="text"
                  value={form.shelfLife}
                  onChange={(e) => updateField('shelfLife', e.target.value)}
                  placeholder="如 24个月"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">存储条件</Label>
                <Input
                  type="text"
                  value={form.storageCondition}
                  onChange={(e) => updateField('storageCondition', e.target.value)}
                  placeholder="如 阴凉干燥处"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">供应商信息</Label>
              <Input
                type="text"
                value={form.supplierInfo}
                onChange={(e) => updateField('supplierInfo', e.target.value)}
                placeholder="请输入供应商信息"
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.fertilizerName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}