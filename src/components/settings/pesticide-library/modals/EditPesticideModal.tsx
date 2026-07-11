/**
 * 编辑药剂弹窗组件
 * 包含规格编辑器，支持编辑药剂及其规格信息
 * 2026-07-10：取消防治类型分类，药剂类型改为 TreeSelect 多选
 */
import React, { useState, useCallback, useEffect } from 'react';

import { X, Check } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { usePesticideLibraryStore, usePestDiseaseDictStore, PesticideLibrary, PesticideSpec } from '@/stores';
import { PesticideSpecEditor, PesticideSpecItem } from '../PesticideSpecEditor';
import { showAlert } from '@/lib/dialogService';
// 2026-07-10：药剂类型多选（自实现 checkbox group 树形多选）
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';

interface EditPesticideModalProps {
  isOpen: boolean;
  record: PesticideLibrary;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPesticideModal({ isOpen, record, onClose, onSaved }: EditPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 表单状态
  const [form, setForm] = useState({
    pesticideCode: '',
    pesticideName: '',
    // 2026-07-10：药剂类型数组
    pesticideTypes: [] as string[],
    ingredient: '',
    mechanism: '',
    functionDesc: '',
    tabooDesc: '',
    targetPests: '',
  });

  // 规格列表
  const [specs, setSpecs] = useState<PesticideSpecItem[]>([]);

  // 新增的规格（未保存到服务器）
  const [newSpecs, setNewSpecs] = useState<PesticideSpecItem[]>([]);

  // 已删除的规格ID列表（从服务器端删除）
  const [deletedSpecIds, setDeletedSpecIds] = useState<string[]>([]);

  // 选中的防治对象
  const [selectedPests, setSelectedPests] = useState<string[]>([]);

  // 防治对象搜索和过滤
  const [pestSearchKeyword, setPestSearchKeyword] = useState('');
  const [pestTypeFilter, setPestTypeFilter] = useState<'all' | 'pest' | 'disease'>('all');

  // 过滤后的病虫害列表
  const filteredPests = pestDiseaseStore.items.filter((pest) => {
    const matchesSearch =
      pestSearchKeyword === '' ||
      pest.dictName.includes(pestSearchKeyword) ||
      pest.dictCode.includes(pestSearchKeyword);
    const matchesType = pestTypeFilter === 'all' || pest.dictType === pestTypeFilter;
    return matchesSearch && matchesType;
  });

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 更新字段
  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && record) {
      // 2026-07-10：pesticideTypes 数组回填（兼容旧 pesticideType 字符串字段）
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
      setForm({
        pesticideCode: record.pesticideCode || '',
        pesticideName: record.pesticideName || '',
        pesticideTypes: initialTypes,
        ingredient: record.ingredient || '',
        mechanism: record.mechanism || '',
        functionDesc: record.functionDesc || '',
        tabooDesc: record.tabooDesc || '',
        targetPests: record.targetPests || '',
      });

      // 转换已有规格
      const existingSpecs: PesticideSpecItem[] = (record.specs || []).map((spec: PesticideSpec) => ({
        id: spec.id,
        specContent: spec.specContent || '',
        formulation: spec.formulation || '',
        manufacturer: spec.manufacturer || '',
        suggestedDosage: spec.suggestedDosage || '',
        suggestedRatio: spec.suggestedRatio || '',
        dosageUnit: spec.dosageUnit || 'g/L',
        mechanism: spec.mechanism || '',
        brandName: spec.brandName || '',
        remark: spec.remark || '',
      }));
      setSpecs(existingSpecs);
      setNewSpecs([]);

      // 加载关联的病虫害
      const loadRelations = async () => {
        const pests = await store.fetchRelatedPests(record.id);
        setSelectedPests(pests.map((p) => p.id));
      };
      loadRelations();
    }
  }, [isOpen, record, pestDiseaseStore.items]);

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

  // 合并规格列表（包括已有和新增的）
  const getAllSpecs = (): PesticideSpecItem[] => {
    return [...specs, ...newSpecs];
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

    // 更新药剂记录
    await store.updateItem(record.id, {
      pesticideName: form.pesticideName,
      pesticideTypes: form.pesticideTypes,
      ingredient: form.ingredient,
      mechanism: form.mechanism,
      functionDesc: form.functionDesc,
      tabooDesc: form.tabooDesc,
      targetPests: getTargetPestsName() || form.targetPests,
    });

    // 保存新增的规格
    if (newSpecs.length > 0) {
      for (const spec of newSpecs) {
        if (spec.specContent || spec.formulation || spec.manufacturer) {
          await store.createSpec(record.id, {
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

    // 更新现有规格（检测变化）
    const originalSpecs = record.specs || [];
    for (let i = 0; i < specs.length; i++) {
      const updated = specs[i];
      const original = originalSpecs[i];
      if (original && (
        updated.specContent !== (original.specContent || '') ||
        updated.formulation !== (original.formulation || '') ||
        updated.manufacturer !== (original.manufacturer || '') ||
        updated.suggestedDosage !== (original.suggestedDosage || '') ||
        updated.suggestedRatio !== (original.suggestedRatio || '') ||
        updated.dosageUnit !== (original.dosageUnit || '') ||
        updated.mechanism !== (original.mechanism || '') ||
        updated.brandName !== (original.brandName || '') ||
        updated.remark !== (original.remark || '')
      )) {
        await store.updateSpec(original.id!, {
          specContent: updated.specContent,
          formulation: updated.formulation,
          manufacturer: updated.manufacturer,
          suggestedDosage: updated.suggestedDosage,
          suggestedRatio: updated.suggestedRatio,
          dosageUnit: updated.dosageUnit,
          mechanism: updated.mechanism,
          brandName: updated.brandName,
          remark: updated.remark,
        } as Partial<PesticideSpec>);
      }
    }

    // 删除已移除的规格
    if (deletedSpecIds.length > 0) {
      for (const specId of deletedSpecIds) {
        await store.deleteSpec(specId);
      }
    }

    // 更新关联的病虫害
    await store.updateRelations(record.id, selectedPests);

    setSubmitting(false);
    onSaved();
  };

  // 处理规格变化（区分已有规格和新规格）
  const handleSpecsChange = (updatedSpecs: PesticideSpecItem[]) => {
    const existingCount = specs.length;
    const updatedExisting = updatedSpecs.slice(0, existingCount);
    const updatedNew = updatedSpecs.slice(existingCount);

    const existingIds = specs.map(s => s.id).filter(Boolean);
    const updatedExistingIds = updatedExisting.map(s => s.id).filter(Boolean);
    const deletedIds = existingIds.filter(id => !updatedExistingIds.includes(id));
    if (deletedIds.length > 0) {
      setDeletedSpecIds(prev => [...prev, ...deletedIds]);
    }

    setSpecs(updatedExisting);
    setNewSpecs(updatedNew);
  };

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
      <div className="border border-gray-300 rounded-lg p-3 max-h-[200px] overflow-y-auto bg-gray-50">
        {topLevel.map((parent: any) => {
          const parentCode = parent.dictCode || parent.dict_code;
          const children = allTypeItems.filter((d: any) =>
            (d.parentId === parent.id) || (d.parent_id === parent.id)
          );
          const parentChecked = form.pesticideTypes.includes(parentCode);
          return (
            <div key={parent.id} className="mb-2 last:mb-0">
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

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑药剂"
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
                <Label className="text-gray-900">药剂编码</Label>
                <Input
                  type="text"
                  value={form.pesticideCode}
                  onChange={(e) => updateField('pesticideCode', e.target.value)}
                  placeholder="药剂编码"
                  className={deepInputClass}
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            {/* 2026-07-10：药剂类型树形多选 */}
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
          <PesticideSpecEditor specs={getAllSpecs()} onChange={handleSpecsChange} />
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
                className={`${deepInputClass} resize-none`}
              />
            </div>
            <div>
              <Label className="text-gray-900">使用禁忌</Label>
              <TextArea
                value={form.tabooDesc}
                onChange={(e) => updateField('tabooDesc', e.target.value)}
                placeholder="请输入使用禁忌"
                rows={2}
                className={`${deepInputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* 防治对象 - 左右布局 */}
        <div>
          <SectionTitle title="防治对象" icon="🐛" />
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧：可选列表 */}
            <div>
              <Label className="text-gray-700 text-xs mb-2 block">可选病虫害</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={pestSearchKeyword}
                  onChange={(e) => setPestSearchKeyword(e.target.value)}
                  placeholder="搜索名称或编码..."
                  className="flex-1 h-8 text-sm"
                />
              </div>
              <div className="flex gap-1 mb-2">
                <Button size="xs" variant={pestTypeFilter === 'all' ? 'default' : 'secondary'} onClick={() => setPestTypeFilter('all')}>全部</Button>
                <Button size="xs" variant={pestTypeFilter === 'pest' ? 'default' : 'secondary'} onClick={() => setPestTypeFilter('pest')}>虫害</Button>
                <Button size="xs" variant={pestTypeFilter === 'disease' ? 'default' : 'secondary'} onClick={() => setPestTypeFilter('disease')}>病害</Button>
              </div>
              <div className="max-h-[150px] overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {filteredPests.length === 0 ? (
                  <div className="text-center text-gray-400 py-4 text-sm">无匹配病虫害</div>
                ) : (
                  filteredPests.map((pest) => (
                    <button
                      key={pest.id}
                      type="button"
                      onClick={() => togglePest(pest.id)}
                      className={`w-full text-left px-2 py-1 rounded text-sm ${
                        selectedPests.includes(pest.id)
                          ? 'bg-green-100 text-green-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {pest.dictName}
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* 右侧：已选列表 */}
            <div>
              <Label className="text-gray-700 text-xs mb-2 block">已选病虫害 ({selectedPests.length})</Label>
              <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {selectedPests.length === 0 ? (
                  <div className="text-center text-gray-400 py-4 text-sm">请从左侧选择</div>
                ) : (
                  selectedPests.map((id) => {
                    const pest = pestDiseaseStore.items.find((p) => p.id === id);
                    return pest ? (
                      <div key={id} className="flex items-center justify-between px-2 py-1 bg-green-50 rounded">
                        <span className="text-sm text-green-700">{pest.dictName}</span>
                        <button
                          type="button"
                          onClick={() => togglePest(id)}
                          className="text-green-500 hover:text-green-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })
                )}
              </div>
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