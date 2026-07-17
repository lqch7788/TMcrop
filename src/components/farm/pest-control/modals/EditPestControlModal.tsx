/**
 * 编辑病虫害防治记录弹窗
 * 2026-07-10：完全重构，与 Add 一致使用统一字段方案
 * 2026-07-17：肥料联用字段复用 FertilizerPoolEditor（与新增施肥记录 + 新增防治记录一致）
 * - 编辑时把旧 leafFertilizerList JSON 转换为 FertilizerPoolItem[]（兼容旧 schema）
 * - 提交时序列化回标准 FertilizerPoolItem 字段（specId/fertilizerName/fertilizerType 等）
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
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { usePestControlStore, usePesticideLibraryStore, usePlantingStore, useSeedlingStore } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { PestControlData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { FertilizerPoolEditor } from '@/components/farm/fertilizer/FertilizerPoolEditor';
import type { FertilizerPoolItem } from '@/components/farm/fertilizer/FertilizerPoolEditor';

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface PesticideItem {
  name: string;
  pesticideTypes: string[];
  dosage: string;
  unit: string;
  ratio: string;
  applicationMethod: string;
}

// 2026-07-17：肥料池条目复用 FertilizerPoolEditor 类型（与 Add 一致）
// 不再独立定义

/**
 * 解析 JSON 列表（用于回填 pesticideList / bioAgentList / equipmentList）
 */
function parseJsonList(jsonStr: string | null | undefined): any[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function EditPestControlModal({ isOpen, record, onClose, onSaved }: {
  isOpen: boolean;
  record: PestControlData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pestStore = usePestControlStore();
  const pesticideStore = usePesticideLibraryStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  const [form, setForm] = useState({
    recordCode: '',
    sprayTime: '',
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
  const [pesticideList, setPesticideList] = useState<PesticideItem[]>([
    { name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' },
  ]);
  // 2026-07-17：肥料池始终启用，由 useFertilizer = (pool.length > 0) 派生
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);
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
            pesticideTypes: p.pesticideTypes || [],
          }))
        );
      });
    }
  }, [isOpen]);

  // 2026-07-10：初始化表单（从 record 回填）
  useEffect(() => {
    if (isOpen && record) {
      setForm({
        recordCode: record.recordCode || '',
        sprayTime: record.sprayTime || '',
        cropName: record.cropName || '',
        greenhouseName: record.greenhouseName || '',
        operatorName: record.operatorName || '',
        targetPest: record.targetPest || '',
        description: record.description || '',
        plantingId: record.plantingId || '',
        plantingCode: record.plantingCode || '',
        seedlingId: record.seedlingId || '',
        seedlingCode: record.seedlingCode || '',
      });

      // 优先用 pesticideList JSON，回填每个项目
      const storedList = parseJsonList(record.pesticideList);
      if (storedList.length > 0) {
        setPesticideList(storedList.map((it: any) => ({
          name: it.name || '',
          pesticideTypes: Array.isArray(it.types) ? it.types : (it.type ? [it.type] : []),
          dosage: it.dosage ? String(it.dosage) : '',
          unit: it.unit || '',
          ratio: it.ratio || '',
          applicationMethod: it.applicationMethod || '',
        })));
      } else {
        // 回退：用主字段 + 兼容 bio/physical
        const items: PesticideItem[] = [];
        if (record.pesticideName || record.pesticideId) {
          items.push({
            name: record.pesticideName || '',
            pesticideTypes: record.pesticideTypes || (record.pesticideType ? [record.pesticideType] : []),
            dosage: record.dosage ? String(record.dosage) : '',
            unit: record.dosageUnit || '',
            ratio: record.dilutionRatio || '',
            applicationMethod: record.applicationMethod || '',
          });
        }
        if (record.bioAgentName) {
          items.push({
            name: record.bioAgentName,
            pesticideTypes: [],
            dosage: record.dosage ? String(record.dosage) : '',
            unit: record.dosageUnit || '',
            ratio: record.dilutionRatio || '',
            applicationMethod: record.applicationMethod || '',
          });
        }
        if (record.equipmentName) {
          items.push({
            name: record.equipmentName,
            pesticideTypes: [],
            dosage: record.equipmentCount || '',
            unit: '',
            ratio: '',
            applicationMethod: '',
          });
        }
        if (items.length === 0) {
          items.push({ name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' });
        }
        setPesticideList(items);
      }

      // 肥料联用回填（2026-07-17：复用 FertilizerPoolItem 字段结构，兼容旧 schema）
      // - 新格式：{specId, fertilizerName, fertilizerType, brandName, ...} → 直接用
      // - 旧格式：{name, dosage, unit, ratio, remarks} → 转换为新格式（specId=空，fertilizerName=name）
      // - 旧字段兼容：leafFertilizerName/Dosage/Unit → 单条构造
      if (record.leafFertilizerList) {
        const parsed = parseJsonList(record.leafFertilizerList);
        if (parsed.length > 0) {
          setFertilizerPool(parsed.map((it: any) => {
            // 判断是新格式（有 specId/fertilizerName）还是旧格式（只有 name）
            const isNewFormat = 'specId' in it || 'fertilizerName' in it;
            if (isNewFormat) {
              return {
                specId: it.specId || '',
                fertilizerName: it.fertilizerName || '',
                fertilizerCode: it.fertilizerCode || '',
                fertilizerType: it.fertilizerType || '',
                brandName: it.brandName || '主品牌',
                specContent: it.specContent || '',
                manufacturer: it.manufacturer || '',
                dosage: it.dosage ? String(it.dosage) : '',
                unit: it.unit || 'kg',
                dilutionRatio: it.dilutionRatio || '',
                fertilizationMethod: it.fertilizationMethod || '',
                unitPrice: Number(it.unitPrice) || 0,
                stockQuantity: Number(it.stockQuantity) || 0,
                stockUnit: it.stockUnit || 'kg',
              } as FertilizerPoolItem;
            }
            // 旧格式转换
            return {
              specId: '',
              fertilizerName: it.name || '',
              fertilizerCode: '',
              fertilizerType: '',
              brandName: '',
              specContent: '',
              manufacturer: '',
              dosage: it.dosage ? String(it.dosage) : '',
              unit: it.unit || '',
              dilutionRatio: it.ratio || '',
              fertilizationMethod: '',
              unitPrice: 0,
              stockQuantity: 0,
              stockUnit: '',
            } as FertilizerPoolItem;
          }));
        } else {
          setFertilizerPool([]);
        }
      } else if (record.leafFertilizerName || record.leafFertilizerUnit) {
        // 兼容最旧记录（无 JSON，只有主字段）
        setFertilizerPool([{
          specId: '',
          fertilizerName: record.leafFertilizerName || '',
          fertilizerCode: '',
          fertilizerType: '',
          brandName: '',
          specContent: '',
          manufacturer: '',
          dosage: record.leafFertilizerDosage ? String(record.leafFertilizerDosage) : '',
          unit: record.leafFertilizerUnit || '',
          dilutionRatio: '',
          fertilizationMethod: '',
          unitPrice: 0,
          stockQuantity: 0,
          stockUnit: '',
        } as FertilizerPoolItem]);
      } else {
        setFertilizerPool([]);
      }
    }
  }, [isOpen, record]);

  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addPesticideItem = () => {
    setPesticideList((prev) => [...prev, { name: '', pesticideTypes: [], dosage: '', unit: '', ratio: '', applicationMethod: '' }]);
  };
  const removePesticideItem = (idx: number) => {
    setPesticideList((prev) => prev.filter((_, i) => i !== idx));
  };
  const updatePesticideItem = (idx: number, field: keyof PesticideItem, value: any) => {
    setPesticideList((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
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
      const allTypes = Array.from(new Set(filledItems.flatMap(it => it.pesticideTypes)));
      const first = filledItems[0];
      const pesticideListJson = JSON.stringify(filledItems.map(it => ({
        name: it.name,
        type: it.pesticideTypes[0] || '',
        types: it.pesticideTypes,
        dosage: it.dosage,
        unit: it.unit,
        ratio: it.ratio,
        applicationMethod: it.applicationMethod,
      })));

      await pestStore.updateItem(record.id, {
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
        pesticideName: first.name,
        dosage: first.dosage ? Number(first.dosage) : undefined,
        dosageUnit: first.unit,
        dilutionRatio: first.ratio,
        applicationMethod: first.applicationMethod,
        pesticideList: pesticideListJson,
        useLeafFertilizer: fertilizerPool.length > 0 ? 'yes' : 'no',
        // 2026-07-17：肥料池 JSON 序列化为 FertilizerPoolItem 字段结构
        leafFertilizerList: fertilizerPool.length > 0
          ? JSON.stringify(fertilizerPool)
          : null,
        // 兼容旧字段（取池中第一个）
        leafFertilizerName: fertilizerPool[0]?.fertilizerName,
        leafFertilizerDosage: fertilizerPool[0]?.dosage ? Number(fertilizerPool[0].dosage) : undefined,
        leafFertilizerUnit: fertilizerPool[0]?.unit,
      } as any);
      onSaved();
    } catch (err) {
      await showAlert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const plantingOptions = plantingStore.items.map(p => ({
    value: p.id,
    label: `${p.plantingCode || p.id} - ${p.cropName || ''}`,
  }));
  const seedlingOptions = seedlingStore.items.map(s => ({
    value: s.id,
    label: `${s.seedlingCode || s.id} - ${s.cropName || ''}`,
  }));

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑防治记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🔗 关联业务</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">关联种植</Label>
              <SearchableSelect
                options={plantingOptions}
                value={form.plantingId}
                onChange={handleSelectPlanting}
                placeholder="选择种植批次"
              />
            </div>
            <div>
              <Label className="text-gray-900">关联育苗</Label>
              <SearchableSelect
                options={seedlingOptions}
                value={form.seedlingId}
                onChange={handleSelectSeedling}
                placeholder="选择育苗批次"
              />
            </div>
          </div>
        </div>

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
                    placeholder="选择或输入名称"
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

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 肥料联用（可选，先选类型再选肥料）</h3>
          <FertilizerPoolEditor pool={fertilizerPool} onChange={setFertilizerPool} />
        </div>

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