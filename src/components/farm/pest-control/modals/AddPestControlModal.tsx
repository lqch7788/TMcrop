/**
 * 新增病虫害防治记录弹窗
 * 2026-07-10：完全重构，删除化学/生物/物理三分支，改为统一字段（pesticideList 多项目 + 肥料联用）
 * - 所有"防治项目"用统一 PesticideItem 表单（名称/类型/用量/单位/稀释/施用方法）
 * - 旧字段 pesticideName/bioAgentName/equipmentName 等保留在 DB，UI 入口合并
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '@/components/common/settings/DictSelect';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import CropCodeSelector from '@/components/farm/common/CropCodeSelector';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { usePestControlStore, usePesticideLibraryStore, usePestDiseaseDictStore, usePlantingStore, useSeedlingStore } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal, currentTimeLocal } from '@/lib/dateUtils';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/**
 * 2026-07-10：统一防治项目（替代 chemical/bio/physical 三段独立字段）
 * - name: 药剂/生物制剂/设备名称
 * - pesticideTypes: 药剂类型（多值，关联 pesticide_type 字典）
 * - dosage / unit / ratio: 用量/单位/稀释倍数
 * - applicationMethod: 施用方法（关联 application_method 字典）
 */
interface PesticideItem {
  name: string;
  pesticideTypes: string[];
  dosage: string;
  unit: string;
  ratio: string;
  applicationMethod: string;
}

// 肥料联用条目
interface LeafFertilizerItem {
  name: string;
  dosage: string;
  unit: string;
  ratio: string;
}

export function AddPestControlModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pestStore = usePestControlStore();
  const pesticideStore = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 基础信息
  const [form, setForm] = useState({
    recordCode: '',
    sprayTime: '',
    cropName: '',
    greenhouseName: '',
    operatorName: '',
    targetPest: '',
    description: '',
    // 关联业务
    plantingId: '',
    plantingCode: '',
    seedlingId: '',
    seedlingCode: '',
  });

  // 防治项目列表（统一字段）
  const [pesticideList, setPesticideList] = useState<PesticideItem[]>([
    { name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' },
  ]);

  // 肥料联用
  const [useFertilizer, setUseFertilizer] = useState(false);
  const [leafFertilizer, setLeafFertilizer] = useState<LeafFertilizerItem>({
    name: '',
    dosage: '',
    unit: '',
    ratio: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [pesticideOptions, setPesticideOptions] = useState<any[]>([]);

  // 加载药剂列表
  useEffect(() => {
    if (isOpen) {
      pesticideStore.fetchItems().then(() => {
        setPesticideOptions(
          pesticideStore.items.map(p => ({
            value: p.pesticideName,
            label: p.pesticideName,
            // 同时携带类型用于过滤
            pesticideTypes: p.pesticideTypes || [],
          }))
        );
      });
    }
  }, [isOpen]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateStr = todayLocal(now);
      const timeStr = currentTimeLocal(now);
      setForm({
        recordCode: '',
        sprayTime: dateStr && timeStr ? `${dateStr} ${timeStr}` : dateStr,
        cropName: '',
        greenhouseName: '',
        operatorName: '',
        targetPest: '',
        description: '',
        plantingId: '',
        plantingCode: '',
        seedlingId: '',
        seedlingCode: '',
      });
      setPesticideList([{ name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' }]);
      setUseFertilizer(false);
      setLeafFertilizer({ name: '', dosage: '', unit: '', ratio: '' });
    }
  }, [isOpen]);

  // 更新表单字段
  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 防治项目增删
  const addPesticideItem = () => {
    setPesticideList((prev) => [...prev, { name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' }]);
  };
  const removePesticideItem = (idx: number) => {
    setPesticideList((prev) => prev.filter((_, i) => i !== idx));
  };
  const updatePesticideItem = (idx: number, field: keyof PesticideItem, value: any) => {
    setPesticideList((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  /**
   * 2026-07-10：药剂类型 checkbox 多选（树形）
   */
  const togglePesticideTypeInItem = (idx: number, code: string) => {
    setPesticideList((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const has = it.pesticideTypes.includes(code);
      return {
        ...it,
        pesticideTypes: has ? it.pesticideTypes.filter(c => c !== code) : [...it.pesticideTypes, code],
      };
    }));
  };

  const renderPesticideTypeSelector = (item: PesticideItem, idx: number) => {
    const allTypeItems = dictionaries.filter(
      (d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type'
    );
    const topLevel = allTypeItems.filter((d: any) => !d.parentId && !d.parent_id);
    return (
      <div className="border border-gray-300 rounded-lg p-2 max-h-[160px] overflow-y-auto bg-gray-50">
        {topLevel.map((parent: any) => {
          const parentCode = parent.dictCode || parent.dict_code;
          const children = allTypeItems.filter((d: any) =>
            (d.parentId === parent.id) || (d.parent_id === parent.id)
          );
          const parentChecked = item.pesticideTypes.includes(parentCode);
          return (
            <div key={parent.id} className="mb-1 last:mb-0">
              <label className="flex items-center gap-1 cursor-pointer hover:bg-white px-1 py-0.5 rounded">
                <Checkbox
                  checked={parentChecked}
                  onCheckedChange={() => togglePesticideTypeInItem(idx, parentCode)}
                />
                <span className="text-xs font-semibold text-gray-900">
                  {parent.dictLabel || parent.dict_label}
                </span>
              </label>
              {children.length > 0 && (
                <div className="ml-5 grid grid-cols-2 gap-1">
                  {children.map((child: any) => {
                    const childCode = child.dictCode || child.dict_code;
                    return (
                      <label
                        key={child.id}
                        className="flex items-center gap-1 cursor-pointer hover:bg-white px-1 py-0.5 rounded text-xs"
                      >
                        <Checkbox
                          checked={item.pesticideTypes.includes(childCode)}
                          onCheckedChange={() => togglePesticideTypeInItem(idx, childCode)}
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

  // 关联业务：选择种植/育苗
  const handleSelectPlanting = (val: string) => {
    if (!val) {
      updateForm('plantingId', '');
      updateForm('plantingCode', '');
      return;
    }
    const p = plantingStore.items.find(it => it.id === val);
    if (p) {
      updateForm('plantingId', p.id);
      updateForm('plantingCode', p.plantingCode || '');
      if (!form.cropName) updateForm('cropName', p.cropName || '');
    }
  };
  const handleSelectSeedling = (val: string) => {
    if (!val) {
      updateForm('seedlingId', '');
      updateForm('seedlingCode', '');
      return;
    }
    const s = seedlingStore.items.find(it => it.id === val);
    if (s) {
      updateForm('seedlingId', s.id);
      updateForm('seedlingCode', s.seedlingCode || '');
      if (!form.cropName) updateForm('cropName', s.cropName || '');
    }
  };

  // 提交
  const handleSubmit = async () => {
    if (!form.sprayTime) {
      await showAlert('请选择防治日期');
      return;
    }
    if (!form.cropName) {
      await showAlert('请输入或选择作物名称');
      return;
    }
    const filledItems = pesticideList.filter(it => it.name.trim());
    if (filledItems.length === 0) {
      await showAlert('请至少填写 1 个防治项目');
      return;
    }

    setSubmitting(true);
    try {
      // 2026-07-10：合并所有药剂类型的并集作为记录级 pesticideTypes
      const allTypes = Array.from(new Set(filledItems.flatMap(it => it.pesticideTypes)));
      // 取第一个项目的主字段作为记录级（兼容老字段 pesticideName/specId/dosage 等）
      const first = filledItems[0];

      // 构造 pesticideList JSON 字符串
      const pesticideListJson = JSON.stringify(filledItems.map(it => ({
        name: it.name,
        type: it.pesticideTypes[0] || '',  // 主类型（取第一个）
        types: it.pesticideTypes,           // 完整类型列表
        dosage: it.dosage,
        unit: it.unit,
        ratio: it.ratio,
        applicationMethod: it.applicationMethod,
      })));

      await pestStore.createItem({
        sprayTime: form.sprayTime,
        operatorName: form.operatorName,
        cropName: form.cropName,
        greenhouseName: form.greenhouseName,
        targetPest: form.targetPest,
        description: form.description,
        plantingId: form.plantingId,
        plantingCode: form.plantingCode,
        seedlingId: form.seedlingId,
        seedlingCode: form.seedlingCode,
        pesticideTypes: allTypes,
        // 兼容老字段（取第一个项目）
        pesticideName: first.name,
        dosage: first.dosage ? Number(first.dosage) : undefined,
        dosageUnit: first.unit,
        dilutionRatio: first.ratio,
        applicationMethod: first.applicationMethod,
        // JSON 列表字段
        pesticideList: pesticideListJson,
        // 肥料联用
        useLeafFertilizer: useFertilizer ? 'yes' : 'no',
        leafFertilizerName: useFertilizer ? leafFertilizer.name : undefined,
        leafFertilizerDosage: useFertilizer && leafFertilizer.dosage ? Number(leafFertilizer.dosage) : undefined,
        leafFertilizerUnit: useFertilizer ? leafFertilizer.unit : undefined,
        // 兼容 bio/physical 字段（如有填）
        bioAgentList: JSON.stringify([]),
        equipmentList: JSON.stringify([]),
        status: 'completed',
      } as any);
      onSaved();
    } catch (err) {
      await showAlert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 关联业务选项
  const plantingOptions = plantingStore.items.map(p => ({
    value: p.id,
    label: `${p.plantingCode || p.id} - ${p.cropName || ''}`,
  }));
  const seedlingOptions = seedlingStore.items.map(s => ({
    value: s.id,
    label: `${s.seedlingCode || s.id} - ${s.cropName || ''}`,
  }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增防治记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">防治日期 <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                value={form.sprayTime ? form.sprayTime.replace(' ', 'T').slice(0, 16) : ''}
                onChange={(e) => updateForm('sprayTime', e.target.value ? e.target.value.replace('T', ' ') + ':00' : '')}
                className={deepInputClass}
              />
            </div>
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Input
                type="text"
                value={form.operatorName}
                onChange={(e) => updateForm('operatorName', e.target.value)}
                placeholder="请输入操作员"
                className={deepInputClass}
              />
            </div>
            <div>
              <Label className="text-gray-900">作物名称 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                value={form.cropName}
                onChange={(e) => updateForm('cropName', e.target.value)}
                placeholder="请输入或选择下方种植/育苗"
                className={deepInputClass}
              />
            </div>
            <div>
              <Label className="text-gray-900">防治区域（温室）</Label>
              <Input
                type="text"
                value={form.greenhouseName}
                onChange={(e) => updateForm('greenhouseName', e.target.value)}
                placeholder="请输入防治区域"
                className={deepInputClass}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-900">目标病虫害</Label>
              <Input
                type="text"
                value={form.targetPest}
                onChange={(e) => updateForm('targetPest', e.target.value)}
                placeholder="如 蚜虫、白粉病"
                className={deepInputClass}
              />
            </div>
          </div>
        </div>

        {/* 关联业务 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🔗 关联业务（与种植/育苗二选一）</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">关联种植</Label>
              <SearchableSelect
                options={plantingOptions}
                value={form.plantingId}
                onChange={handleSelectPlanting}
                placeholder="选择种植批次"
                searchPlaceholder="搜索种植编号..."
              />
            </div>
            <div>
              <Label className="text-gray-900">关联育苗</Label>
              <SearchableSelect
                options={seedlingOptions}
                value={form.seedlingId}
                onChange={handleSelectSeedling}
                placeholder="选择育苗批次"
                searchPlaceholder="搜索育苗编号..."
              />
            </div>
          </div>
        </div>

        {/* 防治项目（统一字段） */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">💊 防治项目（可添加多个）</h3>
            <Button size="sm" variant="secondary" onClick={addPesticideItem}>
              <Plus className="w-4 h-4" /> 添加项目
            </Button>
          </div>
          {pesticideList.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3 mb-2 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">项目 #{idx + 1}</span>
                {pesticideList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePesticideItem(idx)}
                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-700">名称 <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    options={pesticideOptions}
                    value={item.name}
                    onChange={(val) => updatePesticideItem(idx, 'name', val)}
                    placeholder="选择或输入药剂/制剂/设备名称"
                    searchPlaceholder="搜索名称..."
                    allowCustom
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">用量</Label>
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => updatePesticideItem(idx, 'dosage', e.target.value)}
                      placeholder="如 50"
                      className="flex-1 px-2 py-2 border border-gray-300 rounded text-xs"
                    />
                    <UnitDictSelect
                      value={item.unit}
                      onChange={(val) => updatePesticideItem(idx, 'unit', val)}
                      placeholder="单位"
                      className="w-24"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-700">稀释倍数</Label>
                  <Input
                    type="text"
                    value={item.ratio}
                    onChange={(e) => updatePesticideItem(idx, 'ratio', e.target.value)}
                    placeholder="如 1:1500"
                    className="px-2 py-2 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">施用方法</Label>
                  <DictSelect
                    category="application_method"
                    value={item.applicationMethod}
                    onChange={(val) => updatePesticideItem(idx, 'applicationMethod', val)}
                    placeholder="选择方法"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-700">药剂类型（可多选）</Label>
                  {renderPesticideTypeSelector(item, idx)}
                  {item.pesticideTypes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.pesticideTypes.map(t => (
                        <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {getDictLabel('pesticide_type', t) || t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 肥料联用（保留原有逻辑） */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900">🌱 肥料联用（可选）</h3>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <Checkbox
                checked={useFertilizer}
                onCheckedChange={(checked) => setUseFertilizer(!!checked)}
              />
              启用肥料联用
            </label>
          </div>
          {useFertilizer && (
            <div className="grid grid-cols-4 gap-3 border border-gray-200 rounded-lg p-3 bg-white">
              <div>
                <Label className="text-xs text-gray-700">叶面肥名称</Label>
                <Input
                  type="text"
                  value={leafFertilizer.name}
                  onChange={(e) => setLeafFertilizer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如 磷酸二氢钾"
                  className="px-2 py-2 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-700">用量</Label>
                <Input
                  type="text"
                  value={leafFertilizer.dosage}
                  onChange={(e) => setLeafFertilizer(prev => ({ ...prev, dosage: e.target.value }))}
                  placeholder="如 100"
                  className="px-2 py-2 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-700">单位</Label>
                <UnitDictSelect
                  value={leafFertilizer.unit}
                  onChange={(val) => setLeafFertilizer(prev => ({ ...prev, unit: val }))}
                  placeholder="单位"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-700">稀释倍数</Label>
                <Input
                  type="text"
                  value={leafFertilizer.ratio}
                  onChange={(e) => setLeafFertilizer(prev => ({ ...prev, ratio: e.target.value }))}
                  placeholder="如 1:800"
                  className="px-2 py-2 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="请输入备注"
            rows={2}
            className="px-3 py-2 border border-gray-400 rounded-lg text-sm resize-none"
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}