/**
 * 新增药剂弹窗组件
 * 包含规格编辑器，支持添加药剂及其规格信息
 */
import React, { useState, useCallback } from 'react';

import { Wand2, X } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { usePesticideLibraryStore, usePestDiseaseDictStore, PesticideSpec } from '@/stores';
import { PesticideSpecEditor, PesticideSpecItem } from '../PesticideSpecEditor';
import { showAlert } from '@/lib/dialogService';
// 2026-07-10：药剂类型字段（关联 pesticide_type 字典）
import { DictSelect } from '@/components/farm/common/settings/DictSelect';

interface AddPesticideModalProps {
  isOpen: boolean;
  controlType: 'chemical' | 'bio' | 'physical';
  onClose: () => void;
  onSaved: () => void;
}

export function AddPesticideModal({ isOpen, controlType, onClose, onSaved }: AddPesticideModalProps) {
  const store = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();

  // 表单状态
  const [form, setForm] = useState({
    pesticideCode: '',
    pesticideName: '',
    // 2026-07-10：药剂类型（关联 pesticide_type 字典）
    pesticideType: '',
    ingredient: '',
    mechanism: '',
    functionDesc: '',
    tabooDesc: '',
    targetPests: '',
  });

  // 防治类型（锁定当前Tab）
  const [localControlType, setLocalControlType] = useState(controlType);

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

  // 重置表单
  React.useEffect(() => {
    if (isOpen) {
      setForm({
        pesticideCode: '',
        pesticideName: '',
        pesticideType: '',  // 2026-07-10：药剂类型重置
        ingredient: '',
        mechanism: '',
        functionDesc: '',
        tabooDesc: '',
        targetPests: '',
      });
      setLocalControlType(controlType);
      setSpecs([]);
      setSelectedPests([]);
    }
  }, [isOpen, controlType]);

  // 生成编码
  const generateCode = () => {
    const prefix = localControlType === 'chemical' ? 'PC-C-' : localControlType === 'bio' ? 'PC-B-' : 'PC-P-';
    // 获取当前类型最大的编码
    const existingCodes = store.items
      .filter(item => item.controlType === localControlType)
      .map(item => item.pesticideCode)
      .filter(code => code && code.startsWith(prefix));
    let maxNum = 0;
    existingCodes.forEach(code => {
      const match = code.match(/PC-[CBP]-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newNum = maxNum + 1;
    const newCode = `${prefix}${newNum.toString().padStart(4, '0')}`;
    setForm(prev => ({ ...prev, pesticideCode: newCode }));
  };

  // 检测编码是否重复
  const checkCodeExists = (code: string): boolean => {
    if (!code) return false;
    return store.items.some(item => item.pesticideCode === code);
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
    if (!form.pesticideCode.trim()) {
      await showAlert('请点击生成按钮获取药剂编码');
      return;
    }
    if (checkCodeExists(form.pesticideCode)) {
      await showAlert('该编码已存在，请点击生成按钮获取新编码');
      return;
    }

    setSubmitting(true);

    // 创建药剂记录
    const newPesticide = await store.createItem({
      pesticideCode: form.pesticideCode,
      pesticideName: form.pesticideName,
      controlType: localControlType as 'chemical' | 'bio' | 'physical',
      // 2026-07-10：提交 pesticideType
      pesticideType: form.pesticideType || null,
      ingredient: form.ingredient,
      mechanism: form.mechanism,
      functionDesc: form.functionDesc,
      tabooDesc: form.tabooDesc,
      targetPests: getTargetPestsName() || form.targetPests,
    });

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

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增药剂"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 防治类型（锁定） */}
        <div>
          <SectionTitle title="防治类型" icon="🏷️" />
          <Tabs defaultValue={localControlType} onValueChange={(v) => setLocalControlType(v as typeof localControlType)}>
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
                <Label className="text-gray-900">
                  药剂编码 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.pesticideCode}
                    onChange={(e) => updateField('pesticideCode', e.target.value)}
                    placeholder="点击生成获取编码"
                    className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={generateCode}
                    className="px-3"
                  >
                    <Wand2 className="w-4 h-4" /> 生成
                  </Button>
                </div>
                {form.pesticideCode && checkCodeExists(form.pesticideCode) && (
                  <p className="text-xs text-red-500 mt-1">编码已存在，请重新生成</p>
                )}
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
            <div className="grid grid-cols-3 gap-4">
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
              {/* 2026-07-10：药剂类型字段（关联 pesticide_type 字典） */}
              <div>
                <Label className="text-gray-900">药剂类型</Label>
                <DictSelect
                  category="pesticide_type"
                  value={form.pesticideType}
                  onChange={(val) => updateField('pesticideType', val)}
                  placeholder="选择类型"
                />
              </div>
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
          disabled={submitting || !form.pesticideName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
