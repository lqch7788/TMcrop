/**
 * 编辑药剂弹窗组件
 * 包含规格编辑器，支持编辑药剂及其规格信息
 */
import React, { useState, useCallback, useEffect } from 'react';

import { X } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { usePesticideLibraryStore, usePestDiseaseDictStore, PesticideLibrary, PesticideSpec } from '@/stores';
import { PesticideSpecEditor, PesticideSpecItem } from '../PesticideSpecEditor';
import { showAlert } from '@/lib/dialogService';

interface EditPesticideModalProps {
  isOpen: boolean;
  record: PesticideLibrary;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPesticideModal({ isOpen, record, onClose, onSaved }: EditPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();

  // 表单状态
  const [form, setForm] = useState({
    pesticideCode: '',
    pesticideName: '',
    ingredient: '',
    mechanism: '',
    functionDesc: '',
    tabooDesc: '',
    targetPests: '',
  });

  // 防治类型（锁定当前值）
  const [localControlType, setLocalControlType] = useState<'chemical' | 'bio' | 'physical'>('chemical');

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

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && record) {
      setForm({
        pesticideCode: record.pesticideCode || '',
        pesticideName: record.pesticideName || '',
        ingredient: record.ingredient || '',
        mechanism: record.mechanism || '',
        functionDesc: record.functionDesc || '',
        tabooDesc: record.tabooDesc || '',
        targetPests: record.targetPests || '',
      });
      setLocalControlType(record.controlType || 'chemical');

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

    setSubmitting(true);

    // 更新药剂记录
    await store.updateItem(record.id, {
      pesticideCode: form.pesticideCode,
      pesticideName: form.pesticideName,
      controlType: localControlType,
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
    // 保留已有规格的数量，更新它们
    const existingCount = specs.length;
    const updatedExisting = updatedSpecs.slice(0, existingCount);
    const updatedNew = updatedSpecs.slice(existingCount);

    // 检测是否有已有规格被删除
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
        {/* 防治类型（锁定） */}
        <div>
          <SectionTitle title="防治类型" icon="🏷️" />
          <Tabs
            defaultValue={localControlType}
            onValueChange={(v) => setLocalControlType(v as typeof localControlType)}
          >
            <TabsList>
              <TabsTrigger value="chemical">化学防治</TabsTrigger>
              <TabsTrigger value="bio">生物防治</TabsTrigger>
              <TabsTrigger value="physical">物理防治</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
            {/* 药剂成分 */}
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
            {/* 作用机制 */}
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
              {/* 搜索和过滤 */}
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
              {/* 列表 */}
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
          disabled={submitting || !form.pesticideName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
