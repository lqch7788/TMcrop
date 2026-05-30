/**
 * 新增肥料弹窗组件
 * 包含规格编辑器，支持添加肥料及其规格信息
 */
import React, { useState, useCallback } from 'react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { Trash2 } from 'lucide-react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/select';
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

export interface FertilizerSpecItem {
  id?: string;
  brandName: string;
  specContent: string;
  manufacturer: string;
  suggestedDosage: string;
  suggestedRatio: string;
  dosageUnit: string;
  remark: string;
}

export function AddFertilizerModal({ isOpen, onClose, onSaved }: AddFertilizerModalProps) {
  const store = useFertilizerLibraryStore();

  // 表单状态
  const [form, setForm] = useState({
    fertilizerCode: '',
    fertilizerName: '',
    fertilizerType: 'organic',
    applicationTiming: '',
    functionDesc: '',
    tabooDesc: '',
    shelfLife: '',
    storageCondition: '',
    supplierInfo: '',
  });

  // 规格列表
  const [specs, setSpecs] = useState<FertilizerSpecItem[]>([]);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 更新字段
  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 重置表单
  React.useEffect(() => {
    if (isOpen) {
      setForm({
        fertilizerCode: '',
        fertilizerName: '',
        fertilizerType: 'organic',
        applicationTiming: '',
        functionDesc: '',
        tabooDesc: '',
        shelfLife: '',
        storageCondition: '',
        supplierInfo: '',
      });
      setSpecs([]);
    }
  }, [isOpen]);

  // 生成编码
  const generateCode = () => {
    const prefix = 'FER-';
    // 获取当前最大的编码
    const existingCodes = store.items
      .map(item => item.fertilizerCode)
      .filter(code => code && code.startsWith(prefix));
    let maxNum = 0;
    existingCodes.forEach(code => {
      const match = code.match(/FER-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newNum = maxNum + 1;
    const newCode = `${prefix}${newNum.toString().padStart(4, '0')}`;
    setForm(prev => ({ ...prev, fertilizerCode: newCode }));
  };

  // 检测编码是否重复
  const checkCodeExists = (code: string): boolean => {
    if (!code) return false;
    return store.items.some(item => item.fertilizerCode === code);
  };

  // 添加规格行
  const handleAddSpec = () => {
    const newSpec: FertilizerSpecItem = {
      brandName: '',
      specContent: '',
      manufacturer: '',
      suggestedDosage: '',
      suggestedRatio: '',
      dosageUnit: 'kg/亩',
      remark: '',
    };
    setSpecs([...specs, newSpec]);
  };

  // 删除规格行
  const handleDeleteSpec = (index: number) => {
    const newSpecs = specs.filter((_, i) => i !== index);
    setSpecs(newSpecs);
  };

  // 更新规格行字段
  const handleSpecChange = (index: number, field: keyof FertilizerSpecItem, value: string) => {
    const newSpecs = specs.map((spec, i) => {
      if (i === index) {
        return { ...spec, [field]: value };
      }
      return spec;
    });
    setSpecs(newSpecs);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!form.fertilizerName.trim()) {
      await showAlert('请输入肥料名称');
      return;
    }
    if (!form.fertilizerCode.trim()) {
      await showAlert('请点击生成按钮获取肥料编码');
      return;
    }
    if (checkCodeExists(form.fertilizerCode)) {
      await showAlert('该编码已存在，请点击生成按钮获取新编码');
      return;
    }

    setSubmitting(true);

    // 创建肥料记录
    const newFertilizer = await store.createItem({
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType as any,
      applicationTiming: form.applicationTiming,
      functionDesc: form.functionDesc,
      tabooDesc: form.tabooDesc,
      shelfLife: form.shelfLife,
      storageCondition: form.storageCondition,
      supplierInfo: form.supplierInfo,
    });

    if (newFertilizer && specs.length > 0) {
      // 创建规格记录
      for (const spec of specs) {
        if (spec.specContent || spec.manufacturer || spec.brandName) {
          await store.createSpec(newFertilizer.id, {
            brandName: spec.brandName,
            specContent: spec.specContent,
            manufacturer: spec.manufacturer,
            suggestedDosage: spec.suggestedDosage,
            suggestedRatio: spec.suggestedRatio,
            dosageUnit: spec.dosageUnit,
            remark: spec.remark,
          } as Partial<FertilizerSpec>);
        }
      }
    }

    setSubmitting(false);
    onSaved();
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
        {/* 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  肥料编码 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.fertilizerCode}
                    onChange={(e) => updateField('fertilizerCode', e.target.value)}
                    placeholder="点击生成获取编码"
                    className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={generateCode}
                    className="px-3"
                  >
                    生成
                  </Button>
                </div>
                {form.fertilizerCode && checkCodeExists(form.fertilizerCode) && (
                  <p className="text-xs text-red-500 mt-1">编码已存在，请重新生成</p>
                )}
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* 肥料类型 */}
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
              {/* 施肥时期 */}
              <div>
                <Label className="text-gray-900">施肥时期</Label>
                <Select
                  value={form.applicationTiming}
                  onValueChange={(value) => updateField('applicationTiming', value)}
                >
                  <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <SelectValue placeholder="选择施肥时期" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_TIMING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* 规格信息 */}
        <div>
          <SectionTitle title="规格信息" icon="📦" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-900 font-medium">规格列表</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSpec}
              >
                添加规格
              </Button>
            </div>

            {specs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-lg">
                暂无规格，点击"添加规格"新增
              </div>
            ) : (
              <div className="space-y-3">
                {specs.map((spec, index) => (
                  <div
                    key={index}
                    className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 items-end"
                  >
                    {/* 输入字段区域 - 自动填充剩余宽度 */}
                    <div className="flex-1 grid grid-cols-7 gap-2">
                      {/* 品牌名称 */}
                      <div>
                        <Label className="text-xs text-gray-500">品牌名称</Label>
                        <Input
                          type="text"
                          value={spec.brandName}
                          onChange={(e) => handleSpecChange(index, 'brandName', e.target.value)}
                          placeholder="品牌名称"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* 成份与含量 */}
                      <div>
                        <Label className="text-xs text-gray-500">成份与含量</Label>
                        <Input
                          type="text"
                          value={spec.specContent}
                          onChange={(e) => handleSpecChange(index, 'specContent', e.target.value)}
                          placeholder="如 N-P2O5-K2O 15-15-15"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* 生产厂家 */}
                      <div>
                        <Label className="text-xs text-gray-500">生产厂家</Label>
                        <Input
                          type="text"
                          value={spec.manufacturer}
                          onChange={(e) => handleSpecChange(index, 'manufacturer', e.target.value)}
                          placeholder="生产厂家"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* 建议用量 */}
                      <div>
                        <Label className="text-xs text-gray-500">建议用量</Label>
                        <Input
                          type="text"
                          value={spec.suggestedDosage}
                          onChange={(e) => handleSpecChange(index, 'suggestedDosage', e.target.value)}
                          placeholder="如 100"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* 单位 */}
                      <div>
                        <Label className="text-xs text-gray-500">单位</Label>
                        <UnitDictSelect
                          value={spec.dosageUnit}
                          onChange={(value) => handleSpecChange(index, 'dosageUnit', value)}
                          placeholder="选择单位"
                        />
                      </div>

                      {/* 稀释比例 */}
                      <div>
                        <Label className="text-xs text-gray-500">稀释比例</Label>
                        <Input
                          type="text"
                          value={spec.suggestedRatio}
                          onChange={(e) => handleSpecChange(index, 'suggestedRatio', e.target.value)}
                          placeholder="如 1:100"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* 备注 */}
                      <div>
                        <Label className="text-xs text-gray-500">备注</Label>
                        <Input
                          type="text"
                          value={spec.remark}
                          onChange={(e) => handleSpecChange(index, 'remark', e.target.value)}
                          placeholder="备注"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* 删除操作 - 固定在最后 */}
                    <div className="flex justify-center items-center pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSpec(index)}
                        className="w-9 h-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="删除此规格"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {/* 存储与供应链信息 */}
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
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          取消
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
