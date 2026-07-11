/**
 * 新增药剂弹窗组件
 * 包含规格编辑器，支持添加药剂及其规格信息
 * 2026-07-10：取消防治类型分类（化学/生物/物理），改用 TreeSelect 多选药剂类型
 */
import React, { useState, useCallback } from 'react';

import { Wand2, X, Check } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { usePesticideLibraryStore, usePestDiseaseDictStore, PesticideSpec } from '@/stores';
import { PesticideSpecEditor, PesticideSpecItem } from '../PesticideSpecEditor';
import { showAlert } from '@/lib/dialogService';
// 2026-07-10：药剂类型多选（自实现 checkbox group 树形多选，复用 UI 库 Checkbox）
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';

interface AddPesticideModalProps {
  isOpen: boolean;
  // 2026-07-10：取消 controlType prop，保留为可选占位（保持调用方兼容）
  controlType?: 'chemical' | 'bio' | 'physical' | '';
  onClose: () => void;
  onSaved: () => void;
}

export function AddPesticideModal({ isOpen, onClose, onSaved }: AddPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 表单状态
  const [form, setForm] = useState({
    pesticideCode: '',
    pesticideName: '',
    // 2026-07-10：药剂类型数组（关联 pesticide_type 字典，支持多值 + 层级化）
    pesticideTypes: [] as string[],
    ingredient: '',
    mechanism: '',
    functionDesc: '',
    tabooDesc: '',
    targetPests: '',
  });

  // 规格列表
  const [specs, setSpecs] = useState<PesticideSpecItem[]>([]);

  // 选中的防治对象
  const [selectedPests, setSelectedPests] = useState<string[]>([]);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 更新字段
  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * 2026-07-10：药剂类型 checkbox 多选
   * 选中一级自动全选其下子类
   * 取消所有子类自动取消一级
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
      });
      setSpecs([]);
      setSelectedPests([]);
    }
  }, [isOpen]);

  // 2026-07-10：生成编码统一 PC-XXXX（全表递增，由后端负责；前端只作为 UI 占位）
  const generateCode = () => {
    // 显示占位编码让用户知道要点按钮；实际编码由后端生成
    setForm(prev => ({ ...prev, pesticideCode: 'PC-XXXX' }));
    showAlert('请提交保存，编码将由后端自动生成 PC-XXXX 格式（保留原 PC-C-/PC-B-/PC-P- 历史编码不动）');
  };

  // 切换防治对象
  const togglePest = (pestId: string) => {
    setSelectedPests((prev) =>
      prev.includes(pestId)
        ? prev.filter((id) => id !== pestId)
        : [...prev, pestId]
    );
  };

  // 获取选中的防治对象名称
  const getTargetPestsName = () => {
    return selectedPests
      .map((id) => pestDiseaseStore.items.find((p) => p.id === id)?.dictName)
      .filter(Boolean)
      .join(', ');
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

    setSubmitting(true);

    // 创建药剂记录
    // 2026-07-10：不传 pesticideCode（由后端生成），传 pesticideTypes 数组
    const newPesticide = await store.createItem({
      pesticideName: form.pesticideName,
      pesticideTypes: form.pesticideTypes,
      ingredient: form.ingredient,
      mechanism: form.mechanism,
      functionDesc: form.functionDesc,
      tabooDesc: form.tabooDesc,
      targetPests: getTargetPestsName() || form.targetPests,
    } as Partial<typeof store.items[number]>);

    if (newPesticide && specs.length > 0) {
      // 创建规格记录
      for (const spec of specs) {
        if (spec.specContent || spec.formulation || spec.manufacturer) {
          await store.createSpec(newPesticide.id, {
            specContent: spec.specContent,
            formulation: spec.formulation,
            manufacturer: spec.manufacturer,
            suggestedDosage: spec.suggestedDosage,
            suggestedRatio: spec.suggestedRatio,
            dosageUnit: spec.dosageUnit,
            mechanism: spec.mechanism,
            brandName: spec.brandName,
            remark: spec.remark,
          } as Partial<PesticideSpec>);
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

  /**
   * 2026-07-10：药剂类型树形多选
   * 一级分类为 group header，子类为 checkbox
   */
  const renderPesticideTypeTree = () => {
    // 从字典 store 提取 pesticide_type 分类的所有项
    const allTypeItems = dictionaries.filter(
      (d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type'
    );
    // 一级：parentId 为空/null
    const topLevel = allTypeItems.filter((d: any) => !d.parentId && !d.parent_id);
    return (
      <div className="border border-gray-300 rounded-lg p-3 max-h-[200px] overflow-y-auto bg-gray-50">
        {topLevel.map((parent: any) => {
          const parentCode = parent.dictCode || parent.dict_code;
          const children = allTypeItems.filter((d: any) =>
            (d.parentId === parent.id) || (d.parent_id === parent.id)
          );
          const parentChecked = form.pesticideTypes.includes(parentCode);
          return (
            <div key={parent.id} className="mb-2 last:mb-0">
              {/* 一级分类（点击切换） */}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded">
                <Checkbox
                  checked={parentChecked}
                  onCheckedChange={() => togglePesticideType(parentCode)}
                />
                <span className="text-sm font-semibold text-gray-900">
                  {parent.dictLabel || parent.dict_label}
                </span>
                {children.length > 0 && (
                  <span className="text-xs text-gray-500">({children.length} 个子类)</span>
                )}
              </label>
              {/* 二级分类 */}
              {children.length > 0 && (
                <div className="ml-6 mt-1 grid grid-cols-2 gap-1">
                  {children.map((child: any) => {
                    const childCode = child.dictCode || child.dict_code;
                    return (
                      <label
                        key={child.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded text-xs"
                      >
                        <Checkbox
                          checked={form.pesticideTypes.includes(childCode)}
                          onCheckedChange={() => togglePesticideType(childCode)}
                        />
                        <span className="text-gray-700">
                          {child.dictLabel || child.dict_label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增药剂"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-gray-900">
                  药剂名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={form.pesticideName}
                  onChange={(e) => updateField('pesticideName', e.target.value)}
                  placeholder="请输入药剂名称"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* 药剂成分 */}
              <div>
                <Label className="text-gray-900">药剂成分</Label>
                <Input
                  type="text"
                  value={form.ingredient}
                  onChange={(e) => updateField('ingredient', e.target.value)}
                  placeholder="如 啶虫脒、高效氯氟氰菊酯"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {/* 作用机制 */}
              <div>
                <Label className="text-gray-900">作用机制</Label>
                <Input
                  type="text"
                  value={form.mechanism}
                  onChange={(e) => updateField('mechanism', e.target.value)}
                  placeholder="如 触杀、胃毒、熏蒸"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            {/* 2026-07-10：药剂类型树形多选（替代防治类型 Tabs） */}
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
          <PesticideSpecEditor specs={specs} onChange={setSpecs} />
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
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            <div>
              <Label className="text-gray-900">使用禁忌</Label>
              <TextArea
                value={form.tabooDesc}
                onChange={(e) => updateField('tabooDesc', e.target.value)}
                placeholder="请输入使用禁忌"
                rows={2}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 防治对象 */}
        <div>
          <SectionTitle title="防治对象" icon="🐛" />
          <div className="space-y-2">
            <Label className="text-gray-700 text-xs">选择关联的病虫害（可多选）</Label>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
              {pestDiseaseStore.items.length === 0 ? (
                <span className="text-sm text-gray-400">暂无病虫害数据，请先到病虫害字典添加</span>
              ) : (
                pestDiseaseStore.items.map((pest) => (
                  <button
                    key={pest.id}
                    type="button"
                    onClick={() => togglePest(pest.id)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedPests.includes(pest.id)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pest.dictName}
                  </button>
                ))
              )}
            </div>
            {selectedPests.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                已选择：{getTargetPestsName()}
              </div>
            )}
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