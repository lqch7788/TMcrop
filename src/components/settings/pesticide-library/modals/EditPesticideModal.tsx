/**
 * 编辑药剂弹窗组件
 * 包含规格编辑器，支持编辑药剂及其规格信息
 */
import React, { useState, useCallback, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { TextArea } from '../../../ui/TextArea';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/tabs';
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
      }));
      setSpecs(existingSpecs);
      setNewSpecs([]);

      // 解析防治对象（逗号分隔的字符串转为数组）
      const pestNames = record.targetPests?.split(',').map((n) => n.trim()).filter(Boolean) || [];
      // 匹配病虫害字典中的id
      const matchedIds = pestDiseaseStore.items
        .filter((p) => pestNames.includes(p.dictName))
        .map((p) => p.id);
      setSelectedPests(matchedIds);
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
        updated.dosageUnit !== (original.dosageUnit || '')
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
        } as Partial<PesticideSpec>);
      }
    }

    // 删除已移除的规格
    if (deletedSpecIds.length > 0) {
      for (const specId of deletedSpecIds) {
        await store.deleteSpec(specId);
      }
    }

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
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
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
                <span className="text-sm text-gray-400">暂无病虫害数据</span>
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
          取消
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
