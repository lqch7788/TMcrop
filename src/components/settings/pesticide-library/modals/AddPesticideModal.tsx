/**
 * 新增药剂弹窗组件（V2 扁平化重构）
 * 所有字段内联为统一表单，不再使用独立的 PesticideSpecEditor
 * 2026-07-12：从「基础信息 + 规格编辑器」重构为 6 个内联区块
 */
import React, { useState, useCallback } from 'react';

import { X, Check } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

import { UnifiedModal, Button, Input, Label, TextArea, Checkbox, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import { usePesticideLibraryStore } from '@/stores';
import type { PesticideSpec } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { showAlert } from '@/lib/dialogService';
import { FORMULATION_OPTIONS, STOCK_UNIT_OPTIONS } from '../constants';

interface AddPesticideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddPesticideModal({ isOpen, onClose, onSaved }: AddPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 表单状态（覆盖全部 26 字段，omit id/status/createTime/updateTime）
  const [form, setForm] = useState({
    pesticideCode: '',
    pesticideName: '',
    pesticideTypes: [] as string[],
    ingredient: '',
    mechanism: '',
    functionDesc: '',
    tabooDesc: '',
    targetPests: '',
    specContent: '',
    formulation: '',
    manufacturer: '',
    brandName: '',
    suggestedDosage: '',
    suggestedRatio: '',
    dosageUnit: '',
    remark: '',
    stockQuantity: 0,
    stockUnit: '',
    unitPrice: 0,
    batchNumber: '',
    packageSpec: '',
    productionDate: '',
    expirationDate: '',
  });

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 更新字段
  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateNumberField = useCallback((field: string, value: string) => {
    const num = value === '' ? 0 : Number(value);
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  }, []);

  /**
   * 药剂类型 checkbox 多选
   */
  const togglePesticideType = useCallback((code: string) => {
    setForm((prev) => {
      const current = prev.pesticideTypes;
      if (current.includes(code)) {
        return { ...prev, pesticideTypes: current.filter(c => c !== code) };
      }
      return { ...prev, pesticideTypes: [...current, code] };
    });
  }, []);

  // 重置表单
  React.useEffect(() => {
    if (isOpen) {
      setForm({
        pesticideCode: '',
        pesticideName: '',
        pesticideTypes: [],
        ingredient: '',
        mechanism: '',
        functionDesc: '',
        tabooDesc: '',
        targetPests: '',
        specContent: '',
        formulation: '',
        manufacturer: '',
        brandName: '',
        suggestedDosage: '',
        suggestedRatio: '',
        dosageUnit: '',
        remark: '',
        stockQuantity: 0,
        stockUnit: '',
        unitPrice: 0,
        batchNumber: '',
        packageSpec: '',
        productionDate: '',
        expirationDate: '',
      });
      setSubmitting(false);
    }
  }, [isOpen]);

  // 提交表单
  const handleSubmit = async () => {
    if (!form.pesticideName.trim()) {
      await showAlert('请输入药剂名称');
      return;
    }
    if (form.pesticideTypes.length === 0) {
      await showAlert('请至少选择 1 个药剂类型');
      return;
    }

    setSubmitting(true);

    const payload: Partial<PesticideSpec> = {
      pesticideName: form.pesticideName,
      pesticideTypes: form.pesticideTypes,
      ingredient: form.ingredient,
      mechanism: form.mechanism,
      functionDesc: form.functionDesc,
      tabooDesc: form.tabooDesc,
      targetPests: form.targetPests,
      specContent: form.specContent,
      formulation: form.formulation,
      manufacturer: form.manufacturer,
      brandName: form.brandName,
      suggestedDosage: form.suggestedDosage,
      suggestedRatio: form.suggestedRatio,
      dosageUnit: form.dosageUnit,
      remark: form.remark,
      stockQuantity: form.stockQuantity,
      stockUnit: form.stockUnit,
      unitPrice: form.unitPrice,
      batchNumber: form.batchNumber,
      packageSpec: form.packageSpec,
      productionDate: form.productionDate || undefined,
      expirationDate: form.expirationDate || undefined,
    };

    const result = await store.createItem(payload);

    setSubmitting(false);
    if (result) {
      onSaved();
    }
  };

  // 区域标题
  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  /**
   * 药剂类型树形多选
   * 一级分类为 group header，子类为 checkbox
   */
  const renderPesticideTypeTree = () => {
    const allTypeItems = dictionaries.filter(
      (d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type'
    );
    const topLevel = allTypeItems.filter((d: any) => !d.parentId && !d.parent_id);
    return (
      <div className="border border-gray-300 rounded-lg p-3 max-h-[240px] overflow-y-auto bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
        {topLevel.map((parent: any) => {
          const parentCode = parent.dictCode || parent.dict_code;
          const children = allTypeItems.filter((d: any) =>
            (d.parentId === parent.id) || (d.parent_id === parent.id)
          );
          const parentChecked = form.pesticideTypes.includes(parentCode);
          return (
            <div key={parent.id} className="flex items-center gap-1.5 flex-wrap py-1 px-2 hover:bg-white rounded">
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <Checkbox
                  checked={parentChecked}
                  onCheckedChange={() => togglePesticideType(parentCode)}
                />
                <span className="text-sm font-semibold text-gray-900">
                  {parent.dictLabel || parent.dict_label}
                </span>
              </label>
              {children.length > 0 && <span className="text-gray-300 shrink-0 select-none">|</span>}
              {children.map((child: any) => {
                const childCode = child.dictCode || child.dict_code;
                return (
                  <label
                    key={child.id}
                    className="flex items-center gap-1 cursor-pointer text-xs shrink-0"
                  >
                    <Checkbox
                      checked={form.pesticideTypes.includes(childCode)}
                      onCheckedChange={() => togglePesticideType(childCode)}
                    />
                    <span className="text-gray-600">
                      {child.dictLabel || child.dict_label}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增药剂"
      size="xl"
      width={1170}
      height={780}
      showFooter={false}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* ========== 基础信息 ========== */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">
                  药剂名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={form.pesticideName}
                  onChange={(e) => updateField('pesticideName', e.target.value)}
                  placeholder="请输入药剂名称"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">药剂成分</Label>
                <Input
                  type="text"
                  value={form.ingredient}
                  onChange={(e) => updateField('ingredient', e.target.value)}
                  placeholder="如 啶虫脒、高效氯氟氰菊酯"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">作用机制</Label>
                <Input
                  type="text"
                  value={form.mechanism}
                  onChange={(e) => updateField('mechanism', e.target.value)}
                  placeholder="如 触杀、胃毒、熏蒸"
                  className={deepInputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900 mb-1 block">
                药剂类型 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">（可多选，支持一级 + 二级）</span>
              </Label>
              {renderPesticideTypeTree()}
              {form.pesticideTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.pesticideTypes.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <Check className="w-3 h-3" />
                      {getDictLabel('pesticide_type', t) || t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== 规格信息 ========== */}
        <div>
          <SectionTitle title="规格信息" icon="🧪" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">含量</Label>
                <Input
                  type="text"
                  value={form.specContent}
                  onChange={(e) => updateField('specContent', e.target.value)}
                  placeholder="如 50%"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">剂型</Label>
                <Select
                  value={form.formulation}
                  onValueChange={(val: string) => updateField('formulation', val)}
                >
                  <SelectTrigger className="h-11 border border-gray-400 rounded-lg shadow-inner">
                    <SelectValue placeholder="选择剂型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">品牌名称</Label>
                <Input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  placeholder="如 大生"
                  className={deepInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">生产厂家</Label>
                <Input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => updateField('manufacturer', e.target.value)}
                  placeholder="生产厂家名称"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">建议用量</Label>
                <Input
                  type="text"
                  value={form.suggestedDosage}
                  onChange={(e) => updateField('suggestedDosage', e.target.value)}
                  placeholder="如 1000"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">用量单位</Label>
                <UnitDictSelect
                  value={form.dosageUnit}
                  onChange={(val: string) => updateField('dosageUnit', val)}
                  placeholder="选择单位"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 max-w-[calc(33.333%-0.75rem)]">
              <div>
                <Label className="text-gray-900">建议稀释比例</Label>
                <Input
                  type="text"
                  value={form.suggestedRatio}
                  onChange={(e) => updateField('suggestedRatio', e.target.value)}
                  placeholder="如 1:1000"
                  className={deepInputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== 库存与供应链 ========== */}
        <div>
          <SectionTitle title="库存与供应链" icon="📦" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">库存量</Label>
                <Input
                  type="number"
                  value={form.stockQuantity || ''}
                  onChange={(e) => updateNumberField('stockQuantity', e.target.value)}
                  placeholder="0"
                  min={0}
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">库存单位</Label>
                <Select
                  value={form.stockUnit}
                  onValueChange={(val: string) => updateField('stockUnit', val)}
                >
                  <SelectTrigger className="h-11 border border-gray-400 rounded-lg shadow-inner">
                    <SelectValue placeholder="选择库存单位" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">单价</Label>
                <Input
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) => updateNumberField('unitPrice', e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className={deepInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">产品批次</Label>
                <Input
                  type="text"
                  value={form.batchNumber}
                  onChange={(e) => updateField('batchNumber', e.target.value)}
                  placeholder="如 20260701"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">包装规格</Label>
                <Input
                  type="text"
                  value={form.packageSpec}
                  onChange={(e) => updateField('packageSpec', e.target.value)}
                  placeholder="如 500g/瓶"
                  className={deepInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">生产日期</Label>
                <Input
                  type="date"
                  value={form.productionDate}
                  onChange={(e) => updateField('productionDate', e.target.value)}
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">过期日期</Label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => updateField('expirationDate', e.target.value)}
                  className={deepInputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== 功能与禁忌 ========== */}
        <div>
          <SectionTitle title="功能与禁忌" icon="📝" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">功能说明</Label>
              <TextArea
                value={form.functionDesc}
                onChange={(e) => updateField('functionDesc', e.target.value)}
                placeholder="请输入功能说明"
                rows={4}
                className={`${deepInputClass} resize-none`}
              />
            </div>
            <div>
              <Label className="text-gray-900">使用禁忌</Label>
              <TextArea
                value={form.tabooDesc}
                onChange={(e) => updateField('tabooDesc', e.target.value)}
                placeholder="请输入使用禁忌"
                rows={4}
                className={`${deepInputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* ========== 防治对象 + 备注（并排） ========== */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionTitle title="防治对象" icon="🐛" />
            <div>
              <Label className="text-gray-900">防治对象（多个用逗号分隔）</Label>
              <TextArea
                value={form.targetPests}
                onChange={(e) => updateField('targetPests', e.target.value)}
                placeholder="如 蚜虫、白粉病、红蜘蛛"
                rows={3}
                className={`${deepInputClass} resize-none`}
              />
            </div>
          </div>
          <div>
            <SectionTitle title="备注" icon="💬" />
            <div>
              <TextArea
                value={form.remark}
                onChange={(e) => updateField('remark', e.target.value)}
                placeholder="补充说明"
                rows={3}
                className={`${deepInputClass} resize-none`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.pesticideName.trim() || form.pesticideTypes.length === 0}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
