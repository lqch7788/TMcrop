/**
 * 编辑药剂弹窗（V2 扁平化 2026-07-12）
 * 单一 PesticideSpec 编辑表单，所有 26 字段直接展示
 * 匹配 AddPesticideModal 的布局模式，预填 record 数据
 */
import React, { useState, useCallback, useEffect } from 'react';

import { X, Check } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import { usePesticideLibraryStore, PesticideSpec } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
// 2026-07-17：库存单位选项 — 复用常量（与 AddPesticideModal 保持一致 10 项：kg/g/t/L/mL/袋/包/桶/瓶/块）
// 之前 Edit 弹窗本地定义了 8 项副本（缺 t/块），与 Add 不一致且导致 kg 是种子数据默认值的假象
import { STOCK_UNIT_OPTIONS } from '../constants';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

// 农药剂型选项（完整列表）
const FORMULATION_OPTIONS = [
  { value: '可湿性粉剂', label: '可湿性粉剂 (WP)' },
  { value: '水分散粒剂', label: '水分散粒剂 (WDG)' },
  { value: '悬浮剂', label: '悬浮剂 (SC)' },
  { value: '乳油', label: '乳油 (EC)' },
  { value: '水剂', label: '水剂 (AS)' },
  { value: '可溶性粉剂', label: '可溶性粉剂 (SP)' },
  { value: '颗粒剂', label: '颗粒剂 (GR)' },
  { value: '微胶囊悬浮剂', label: '微胶囊悬浮剂 (CS)' },
  { value: '油剂', label: '油剂 (OL)' },
  { value: '粉剂', label: '粉剂 (DP)' },
  { value: '片剂', label: '片剂 (WT)' },
  { value: '烟剂', label: '烟剂 (FU)' },
  { value: '气雾剂', label: '气雾剂 (AE)' },
  { value: '蚊香', label: '蚊香 (CO)' },
  { value: '饵剂', label: '饵剂 (RB)' },
  { value: '胶饵', label: '胶饵 (GL)' },
  { value: '悬浮种衣剂', label: '悬浮种衣剂 (FS)' },
  { value: '种子处理悬浮剂', label: '种子处理悬浮剂 (SS)' },
  { value: '泡腾片剂', label: '泡腾片剂 (EB)' },
  { value: '水乳剂', label: '水乳剂 (EW)' },
  { value: '微乳剂', label: '微乳剂 (ME)' },
  { value: '悬乳剂', label: '悬乳剂 (SE)' },
  { value: '可分散油悬浮剂', label: '可分散油悬浮剂 (OD)' },
  { value: '乳粒剂', label: '乳粒剂 (EG)' },
  { value: '缓释剂', label: '缓释剂 (BR)' },
  { value: '可分散液剂', label: '可分散液剂 (DC)' },
  { value: '可湿性粒剂', label: '可湿性粒剂 (WG)' },
  { value: '可溶液剂', label: '可溶液剂 (SL)' },
  { value: '膏剂', label: '膏剂 (PA)' },
  { value: '其他', label: '其他' },
];

// 表单字段类型（26 个可编辑字段）
type SpecForm = {
  pesticideCode: string;
  pesticideName: string;
  pesticideTypes: string[];
  ingredient: string;
  mechanism: string;
  functionDesc: string;
  tabooDesc: string;
  targetPests: string;
  specContent: string;
  formulation: string;
  manufacturer: string;
  brandName: string;
  suggestedDosage: string;
  suggestedRatio: string;
  dosageUnit: string;
  remark: string;
  stockQuantity: number;
  stockUnit: string;
  unitPrice: number;
  batchNumber: string;
  productionDate: string;
  expirationDate: string;
  packageSpec: string;
};

/** 从 record 构建初始表单 */
function buildInitialForm(record: PesticideSpec): SpecForm {
  // 2026-07-12：兼容旧 pesticideType 字符串字段
  let initialTypes: string[] = [];
  if (Array.isArray(record.pesticideTypes)) {
    initialTypes = record.pesticideTypes;
  } else if (typeof (record as any).pesticideType === 'string' && (record as any).pesticideType) {
    try {
      const parsed = JSON.parse((record as any).pesticideType);
      initialTypes = Array.isArray(parsed) ? parsed : [(record as any).pesticideType];
    } catch {
      initialTypes = [(record as any).pesticideType];
    }
  }

  return {
    pesticideCode: record.pesticideCode || '',
    pesticideName: record.pesticideName || '',
    pesticideTypes: initialTypes,
    ingredient: record.ingredient || '',
    mechanism: record.mechanism || '',
    functionDesc: record.functionDesc || '',
    tabooDesc: record.tabooDesc || '',
    targetPests: record.targetPests || '',
    specContent: record.specContent || '',
    formulation: record.formulation || '',
    manufacturer: record.manufacturer || '',
    brandName: record.brandName || '',
    suggestedDosage: record.suggestedDosage || '',
    suggestedRatio: record.suggestedRatio || '',
    dosageUnit: record.dosageUnit || 'g/L',
    remark: record.remark || '',
    stockQuantity: record.stockQuantity || 0,
    stockUnit: record.stockUnit || 'kg',
    unitPrice: record.unitPrice || 0,
    batchNumber: record.batchNumber || '',
    productionDate: record.productionDate || '',
    expirationDate: record.expirationDate || '',
    packageSpec: record.packageSpec || '',
  };
}

interface EditPesticideModalProps {
  isOpen: boolean;
  record: PesticideSpec;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPesticideModal({ isOpen, record, onClose, onSaved }: EditPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  const [form, setForm] = useState<SpecForm>(buildInitialForm(record));
  const [original, setOriginal] = useState<SpecForm>(buildInitialForm(record));
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开时初始化表单
  // H1 修复：依赖改为 [isOpen, record?.id] 而非 [isOpen, record]，
  // 避免父组件 re-render 时 record 对象引用变化导致表单被重置
  useEffect(() => {
    if (isOpen && record) {
      const initForm = buildInitialForm(record);
      setForm(initForm);
      setOriginal(initForm);
    }
  }, [isOpen, record?.id]);

  // 更新字段（字符串字段）
  const updateField = useCallback(<K extends keyof SpecForm>(field: K, value: SpecForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 更新数值字段
  const updateNumberField = useCallback((field: 'stockQuantity' | 'unitPrice', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value === '' ? 0 : Number(value) }));
  }, []);

  /**
   * 2026-07-10：药剂类型多选切换
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

  // 检测是否有变更
  const hasChanges = (): boolean => {
    const fields: (keyof SpecForm)[] = [
      'pesticideName', 'ingredient', 'mechanism',
      'functionDesc', 'tabooDesc', 'targetPests',
      'specContent', 'formulation', 'manufacturer', 'brandName',
      'suggestedDosage', 'suggestedRatio', 'dosageUnit', 'remark',
      'stockQuantity', 'stockUnit', 'unitPrice', 'batchNumber',
      'productionDate', 'expirationDate', 'packageSpec',
    ];
    // pesticideTypes: 数组比较
    const typesChanged =
      JSON.stringify(form.pesticideTypes.sort()) !== JSON.stringify(original.pesticideTypes.sort());
    if (typesChanged) return true;
    return fields.some((f) => form[f] !== original[f]);
  };

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
    if (!hasChanges()) {
      await showAlert('未检测到任何修改');
      return;
    }

    setSubmitting(true);
    try {
      const result = await store.updateItem(record.id, {
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
        stockQuantity: Number(form.stockQuantity) || 0,
        stockUnit: form.stockUnit,
        unitPrice: Number(form.unitPrice) || 0,
        batchNumber: form.batchNumber,
        productionDate: form.productionDate,
        expirationDate: form.expirationDate,
        packageSpec: form.packageSpec,
      });
      // H30 修复：updateItem 返回 null 时不再静默关闭弹窗，需 user-visible 提示
      if (result) {
        onSaved();
      } else {
        await showAlert('保存失败：' + (store.error || '请重试'));
        return;
      }
    } catch (err) {
      await showAlert('保存出错：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  // 区域标题
  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  /**
   * 2026-07-10：药剂类型树形多选（checkbox group）
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
      title={/*template*/'编辑药剂：' + (record.pesticideCode || record.pesticideName)}
      size="xl"
      width={1170}
      height={780}
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-900">药剂编码</Label>
                <Input
                  type="text"
                  value={form.pesticideCode}
                  readOnly
                  className={deepInputClass + ' bg-gray-100 cursor-not-allowed'}
                />
              </div>
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
            {/* 药剂类型树形多选 */}
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

        {/* 规格信息 */}
        <div>
          <SectionTitle title="规格信息" icon="🧪" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-500">含量/规格</Label>
                <Input
                  type="text"
                  value={form.specContent}
                  onChange={(e) => updateField('specContent', e.target.value)}
                  placeholder="如 50%"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">剂型</Label>
                <Select
                  value={form.formulation}
                  onValueChange={(value) => updateField('formulation', value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="选择剂型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label className="text-xs text-gray-500">用量单位</Label>
                <UnitDictSelect
                  value={form.dosageUnit}
                  onChange={(value) => updateField('dosageUnit', value)}
                  placeholder="选择单位"
                  className="h-9 text-sm"
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
            </div>
          </div>
        </div>

        {/* 库存与供应链 */}
        <div>
          <SectionTitle title="库存与供应链" icon="📦" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-500">库存量</Label>
              <Input
                type="number"
                value={form.stockQuantity || ''}
                onChange={(e) => updateNumberField('stockQuantity', e.target.value)}
                placeholder="如 100"
                step="0.01"
                min="0"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">库存单位</Label>
              <Select value={form.stockUnit} onValueChange={(v) => updateField('stockUnit', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择单位" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">单价 (元/单位)</Label>
              <Input
                type="number"
                value={form.unitPrice || ''}
                onChange={(e) => updateNumberField('unitPrice', e.target.value)}
                placeholder="如 25"
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
              <Label className="text-xs text-gray-500">包装规格</Label>
              <Input
                type="text"
                value={form.packageSpec}
                onChange={(e) => updateField('packageSpec', e.target.value)}
                placeholder="如 50kg/桶、10ml/袋"
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
          </div>
        </div>

        {/* 功能与禁忌 */}
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
                className={deepInputClass + ' resize-none'}
              />
            </div>
            <div>
              <Label className="text-gray-900">使用禁忌</Label>
              <TextArea
                value={form.tabooDesc}
                onChange={(e) => updateField('tabooDesc', e.target.value)}
                placeholder="请输入使用禁忌"
                rows={4}
                className={deepInputClass + ' resize-none'}
              />
            </div>
          </div>
        </div>

        {/* 防治对象 + 备注（并排） */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionTitle title="防治对象" icon="🐛" />
            <div>
              <TextArea
                value={form.targetPests}
                onChange={(e) => updateField('targetPests', e.target.value)}
                placeholder="请输入防治对象，多个用逗号分隔"
                rows={3}
                className={deepInputClass + ' resize-none'}
              />
            </div>
          </div>
          <div>
            <SectionTitle title="备注" icon="💬" />
            <TextArea
              value={form.remark}
              onChange={(e) => updateField('remark', e.target.value)}
              placeholder="备注"
              rows={3}
              className={deepInputClass + ' resize-none'}
            />
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
