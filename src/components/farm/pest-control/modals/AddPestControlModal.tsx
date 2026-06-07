/**
 * 新增病虫害防治记录弹窗
 * 防治类型选择（化学/生物/物理），各类型字段动态显示
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import { DictSelect } from '@/components/common/settings/DictSelect';
import CropCodeSelector from '@/components/farm/common/CropCodeSelector';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { usePestControlStore, useGreenhouseStore, usePesticideLibraryStore, usePestDiseaseDictStore } from '@/stores';
import type { CropVariety } from '@/types/cropVariety';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

// 防治类型选项
const CONTROL_TYPES = [
  { value: 'chemical', label: '化学防治' },
  { value: 'bio', label: '生物防治' },
  { value: 'physical', label: '物理防治' },
];

// 叶面肥条目
interface LeafFertilizerItem {
  name: string;
  dosage: number;
  unit: string;
  ratio: string;  // 稀释倍数
}

// 药剂条目（化学防治用）
interface PesticideItem {
  name: string;       // 药剂名称
  type: string;       // 药剂类型
  dosage: number;     // 用药量
  unit: string;       // 单位
  ratio: string;      // 稀释倍数
  applicationMethod: string;  // 施用方法
}

// 生物防治条目
interface BioAgentItem {
  name: string;       // 生物制剂名称
  type: string;       // 制剂类型
  dosage: number;      // 用量
  unit: string;        // 单位
  ratio: string;       // 稀释倍数
}

// 物理防治条目
interface EquipmentItem {
  name: string;       // 设备/方式名称
  count: string;       // 用量/次数
}

// 默认表单数据
const defaultForm = {
  recordCode: '',
  sprayTime: '',
  cropName: '',
  greenhouses: [] as string[],
  operatorName: '',
  controlType: 'chemical' as 'chemical' | 'bio' | 'physical',
  // 化学防治专用（支持多个药剂）
  pesticides: [] as PesticideItem[],
  // 生物防治专用（支持多个制剂）
  bioAgents: [] as BioAgentItem[],
  // 物理防治专用（支持多个设备/方式）
  equipment: [] as EquipmentItem[],
  // 叶面肥联用
  useLeafFertilizer: 'no' as 'yes' | 'no',
  leafFertilizers: [] as LeafFertilizerItem[],  // 叶面肥列表（支持多个）
  // 记录级别字段
  applicationMethod: '',  // 施用方法
  targetPests: [] as string[],  // 目标病虫害（支持多个）
  // 备注
  description: '',
};

interface AddPestControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddPestControlModal({ isOpen, onClose, onSaved }: AddPestControlModalProps) {
  const store = usePestControlStore();
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const pesticideStore = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 温室选项
  const greenhouseOptions = useMemo(() =>
    greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name })),
    [greenhouses]
  );

  // 药剂选项（用于搜索选择 - 化学防治用）
  const pesticideOptions = useMemo(() =>
    pesticideStore.items
      .filter(p => p.controlType === 'chemical')
      .map(p => ({
        value: p.pesticideName,
        label: p.pesticideName,
        searchText: `${p.pesticideCode} ${p.functionDesc || ''}`,
      })),
    [pesticideStore.items]
  );

  // 生物制剂选项（用于搜索选择 - 生物防治用）
  const bioAgentOptions = useMemo(() =>
    pesticideStore.items
      .filter(p => p.controlType === 'bio')
      .map(p => ({
        value: p.pesticideName,
        label: p.pesticideName,
        searchText: `${p.pesticideCode} ${p.functionDesc || ''}`,
      })),
    [pesticideStore.items]
  );

  // 物理防治选项（用于搜索选择 - 物理防治用）
  const equipmentOptions = useMemo(() =>
    pesticideStore.items
      .filter(p => p.controlType === 'physical')
      .map(p => ({
        value: p.pesticideName,
        label: p.pesticideName,
        searchText: `${p.pesticideCode} ${p.functionDesc || ''}`,
      })),
    [pesticideStore.items]
  );

  // 病虫害选项（用于搜索选择）
  const pestDiseaseOptions = useMemo(() =>
    pestDiseaseStore.items.map(p => ({
      value: p.dictName,
      label: p.dictName,
      searchText: `${p.dictCode} ${p.targetCrops || ''}`,
    })),
    [pestDiseaseStore.items]
  );

  // 初始化
  useEffect(() => {
    if (greenhouses.length === 0) loadGreenhouses();
  }, [greenhouses.length, loadGreenhouses]);

  // 弹窗打开时加载数据和生成编号
  useEffect(() => {
    if (isOpen) {
      // 加载药剂库和病虫害字典数据
      pesticideStore.fetchItems();
      pestDiseaseStore.fetchItems();
      // 生成记录编号
      store.generateCode().then(code => {
        if (code) setForm(prev => ({ ...prev, recordCode: code }));
      });
    }
  }, [isOpen]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
      setCropCode('');
      setSelectedCrop(null);
      // 生成编号
      store.generateCode().then(code => {
        if (code) setForm(prev => ({ ...prev, recordCode: code }));
      });
    }
  }, [isOpen, store]);

  // 作物选择处理
  const handleCropCodeChange = useCallback((code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({ ...prev, cropName: cropNameValue }));
    }
  }, []);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // 提交表单
  const handleSubmit = async () => {
    if (!form.cropName.trim()) return;
    setSubmitting(true);

    const payload: Record<string, any> = {
      recordCode: form.recordCode,
      sprayTime: form.sprayTime,
      cropName: form.cropName,
      greenhouseName: form.greenhouses.length > 0 ? JSON.stringify(form.greenhouses) : '',
      operatorName: form.operatorName,
      controlType: form.controlType,
      useLeafFertilizer: form.useLeafFertilizer,
      applicationMethod: form.applicationMethod,
      targetPest: form.targetPests.length > 0 ? JSON.stringify(form.targetPests) : '',
      description: form.description,
    };

    // 根据防治类型添加专用字段
    if (form.controlType === 'chemical') {
      // 化学防治支持多个药剂，取第一个填入主字段，其余存储为JSON
      const validPesticides = form.pesticides.filter(p => p.name.trim());
      if (validPesticides.length > 0) {
        const first = validPesticides[0];
        payload.pesticideName = first.name;
        payload.pesticideType = first.type;
        payload.dosage = first.dosage;
        payload.dosageUnit = first.unit;
        payload.dilutionRatio = first.ratio;
        // 多个药剂存储为JSON
        payload.pesticideList = JSON.stringify(validPesticides);
      }
    } else if (form.controlType === 'bio') {
      // 生物防治支持多个制剂，取第一个填入主字段，其余存储为JSON
      const validBioAgents = form.bioAgents.filter(b => b.name.trim());
      if (validBioAgents.length > 0) {
        const first = validBioAgents[0];
        payload.bioAgentName = first.name;
        payload.bioAgentType = first.type;
        payload.dosage = first.dosage;
        payload.dosageUnit = first.unit;
        payload.dilutionRatio = first.ratio;
        // 多个制剂存储为JSON
        payload.bioAgentList = JSON.stringify(validBioAgents);
      }
    } else if (form.controlType === 'physical') {
      // 物理防治支持多个设备/方式，取第一个填入主字段，其余存储为JSON
      const validEquipment = form.equipment.filter(e => e.name.trim());
      if (validEquipment.length > 0) {
        const first = validEquipment[0];
        payload.equipmentName = first.name;
        payload.equipmentCount = first.count;
        // 多个设备/方式存储为JSON
        payload.equipmentList = JSON.stringify(validEquipment);
      }
    }

    // 叶面肥联用
    if (form.useLeafFertilizer === 'yes') {
      // 多个叶面肥存储为JSON字符串
      if (form.leafFertilizers.length > 0) {
        const validFertilizers = form.leafFertilizers.filter(f => f.name.trim());
        if (validFertilizers.length > 0) {
          payload.leafFertilizerName = JSON.stringify(validFertilizers);
        }
      }
    }

    await store.createItem(payload);
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
      title="新增病虫害防治记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 防治类型选择 */}
        <div>
          <SectionTitle title="防治类型" icon="🔍" />
          <div className="grid grid-cols-3 gap-3">
            {CONTROL_TYPES.map(ct => (
              <div
                key={ct.value}
                onClick={() => updateField('controlType', ct.value)}
                className={`py-1.5 rounded-lg border-2 cursor-pointer transition-all text-center
                  ${ct.value === 'chemical'
                    ? form.controlType === ct.value ? 'border-red-500 bg-red-500' : 'border-red-200 bg-red-50 hover:border-red-400'
                    : ct.value === 'bio'
                    ? form.controlType === ct.value ? 'border-green-500 bg-green-500' : 'border-green-200 bg-green-50 hover:border-green-400'
                    : form.controlType === ct.value ? 'border-blue-500 bg-blue-500' : 'border-blue-200 bg-blue-50 hover:border-blue-400'
                  }`}
              >
                <span className={`text-sm font-medium ${form.controlType === ct.value ? 'text-white' : 'text-gray-600'}`}>
                  {ct.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 公共信息 */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <SectionTitle title="公共信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">记录编号</Label>
                <Input
                  type="text"
                  value={form.recordCode}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono"
                />
              </div>
              <div>
                <Label className="text-gray-900">防治日期 <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.sprayTime ? form.sprayTime.slice(0, 10) : ''}
                    onChange={(e) => {
                      const dateVal = e.target.value;
                      const existingHour = form.sprayTime ? form.sprayTime.slice(11, 13) : '00';
                      updateField('sprayTime', dateVal ? `${dateVal}T${existingHour}:00` : '');
                    }}
                    className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <select
                    value={form.sprayTime ? form.sprayTime.slice(11, 13) : ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const existingDate = form.sprayTime ? form.sprayTime.slice(0, 10) : '';
                      updateField('sprayTime', existingDate && hour ? `${existingDate}T${hour}:00` : '');
                    }}
                    className="w-24 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">请选小时</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">作物名称 <span className="text-red-500">*</span></Label>
                <CropCodeSelector
                  value={cropCode}
                  onChange={handleCropCodeChange}
                  placeholder="搜索或选择作物品种..."
                  size="md"
                  showFullPath={true}
                />
                {selectedCrop && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700">
                      {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                      {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-900">防治区域</Label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !form.greenhouses.includes(e.target.value)) {
                      updateField('greenhouses', [...form.greenhouses, e.target.value]);
                    }
                  }}
                  className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">选择防治区域</option>
                  {greenhouses
                    .filter(g => g.status === 'active' && !form.greenhouses.includes(g.name))
                    .map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                </select>
                {form.greenhouses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.greenhouses.map((gh, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200"
                      >
                        {gh}
                        <button
                          type="button"
                          onClick={() => updateField('greenhouses', form.greenhouses.filter((_, i) => i !== idx))}
                          className="ml-1.5 text-emerald-500 hover:text-emerald-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-900">操作人</Label>
                <Input
                  type="text"
                  value={form.operatorName}
                  onChange={(e) => updateField('operatorName', e.target.value)}
                  placeholder="输入操作人"
                  className={deepInputClass}
                />
              </div>
            </div>

            {/* 施用方法 & 目标病虫害 - 记录级别字段 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施用方法</Label>
                <DictSelect
                  category="application_method"
                  value={form.applicationMethod}
                  onChange={(val) => updateField('applicationMethod', val)}
                  placeholder="选择施用方法"
                />
              </div>
              <div>
                <Label className="text-gray-900">目标病虫害</Label>
                <div className="space-y-2">
                  {/* 已选的目标病虫害标签 */}
                  {form.targetPests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.targetPests.map((pest, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
                        >
                          {pest}
                          <button
                            type="button"
                            onClick={() => {
                              const newList = form.targetPests.filter((_, i) => i !== idx);
                              updateField('targetPests', newList);
                            }}
                            className="ml-1.5 text-orange-500 hover:text-orange-700 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 搜索选择 */}
                  <SearchableSelect
                    value=""
                    onChange={(val) => {
                      if (val && !form.targetPests.includes(val)) {
                        updateField('targetPests', [...form.targetPests, val]);
                      }
                    }}
                    options={pestDiseaseOptions.filter(p => !form.targetPests.includes(p.value))}
                    placeholder="搜索添加目标病虫害"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 化学防治专用 */}
        {form.controlType === 'chemical' && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <SectionTitle title="化学防治" icon="🧪" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900">药剂列表</Label>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const newList = [...form.pesticides, { name: '', type: '', dosage: 0, unit: '克', ratio: '', applicationMethod: '' }];
                    updateField('pesticides', newList);
                  }}
                >
                  + 新增药剂
                </Button>
              </div>
              {form.pesticides.length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm border border-dashed border-gray-300 rounded-lg">
                  点击上方"新增药剂"添加
                </div>
              ) : (
                form.pesticides.map((item, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 items-end">
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">药剂名称</Label>
                      <SearchableSelect
                        value={item.name}
                        onChange={(val) => {
                          const newList = [...form.pesticides];
                          newList[index] = { ...item, name: val };
                          updateField('pesticides', newList);
                        }}
                        options={pesticideOptions}
                        placeholder="选择药剂"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">药剂类型</Label>
                      <DictSelect
                        category="pesticide_type"
                        value={item.type}
                        onChange={(val) => {
                          const newList = [...form.pesticides];
                          newList[index] = { ...item, type: val };
                          updateField('pesticides', newList);
                        }}
                        placeholder="类型"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">用药量</Label>
                      <Input
                        type="number"
                        value={item.dosage || ''}
                        onChange={(e) => {
                          const newList = [...form.pesticides];
                          newList[index] = { ...item, dosage: Number(e.target.value) };
                          updateField('pesticides', newList);
                        }}
                        min="0"
                        placeholder="0"
                        className={deepInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">单位</Label>
                      <UnitDictSelect
                        value={item.unit}
                        onChange={(val) => {
                          const newList = [...form.pesticides];
                          newList[index] = { ...item, unit: val };
                          updateField('pesticides', newList);
                        }}
                        placeholder="单位"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">稀释倍数</Label>
                      <Input
                        type="text"
                        value={item.ratio}
                        onChange={(e) => {
                          const newList = [...form.pesticides];
                          newList[index] = { ...item, ratio: e.target.value };
                          updateField('pesticides', newList);
                        }}
                        placeholder="如: 1000"
                        className={deepInputClass}
                      />
                    </div>
                    <div className="mb-1">
                      <Label className="text-gray-700 text-xs mb-1 block invisible">操作</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newList = form.pesticides.filter((_, i) => i !== index);
                          updateField('pesticides', newList);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 生物防治专用 */}
        {form.controlType === 'bio' && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <SectionTitle title="生物防治" icon="🧫" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900">生物制剂列表</Label>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const newList = [...form.bioAgents, { name: '', type: '', dosage: 0, unit: '克', ratio: '' }];
                    updateField('bioAgents', newList);
                  }}
                >
                  + 新增生物制剂
                </Button>
              </div>
              {form.bioAgents.length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm border border-dashed border-gray-300 rounded-lg">
                  点击上方"新增生物制剂"添加
                </div>
              ) : (
                form.bioAgents.map((item, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 items-end">
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">制剂名称</Label>
                      <SearchableSelect
                        value={item.name}
                        onChange={(val) => {
                          const newList = [...form.bioAgents];
                          newList[index] = { ...item, name: val };
                          updateField('bioAgents', newList);
                        }}
                        options={bioAgentOptions}
                        placeholder="选择制剂"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">制剂类型</Label>
                      <DictSelect
                        category="bio_agent_type"
                        value={item.type}
                        onChange={(val) => {
                          const newList = [...form.bioAgents];
                          newList[index] = { ...item, type: val };
                          updateField('bioAgents', newList);
                        }}
                        placeholder="类型"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">用量</Label>
                      <Input
                        type="number"
                        value={item.dosage || ''}
                        onChange={(e) => {
                          const newList = [...form.bioAgents];
                          newList[index] = { ...item, dosage: Number(e.target.value) };
                          updateField('bioAgents', newList);
                        }}
                        min="0"
                        placeholder="0"
                        className={deepInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">单位</Label>
                      <UnitDictSelect
                        value={item.unit}
                        onChange={(val) => {
                          const newList = [...form.bioAgents];
                          newList[index] = { ...item, unit: val };
                          updateField('bioAgents', newList);
                        }}
                        placeholder="单位"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">稀释倍数</Label>
                      <Input
                        type="text"
                        value={item.ratio}
                        onChange={(e) => {
                          const newList = [...form.bioAgents];
                          newList[index] = { ...item, ratio: e.target.value };
                          updateField('bioAgents', newList);
                        }}
                        placeholder="如: 1000"
                        className={deepInputClass}
                      />
                    </div>
                    <div className="mb-1">
                      <Label className="text-gray-700 text-xs mb-1 block invisible">操作</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newList = form.bioAgents.filter((_, i) => i !== index);
                          updateField('bioAgents', newList);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 物理防治专用 */}
        {form.controlType === 'physical' && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <SectionTitle title="物理防治" icon="⚙️" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900">设备/方式列表</Label>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const newList = [...form.equipment, { name: '', count: '' }];
                    updateField('equipment', newList);
                  }}
                >
                  + 新增设备/方式
                </Button>
              </div>
              {form.equipment.length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm border border-dashed border-gray-300 rounded-lg">
                  点击上方"新增设备/方式"添加
                </div>
              ) : (
                form.equipment.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">设备/方式</Label>
                      <SearchableSelect
                        value={item.name}
                        onChange={(val) => {
                          const newList = [...form.equipment];
                          newList[index] = { ...item, name: val };
                          updateField('equipment', newList);
                        }}
                        options={equipmentOptions}
                        placeholder="选择设备/方式"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">用量/次数</Label>
                      <Input
                        type="text"
                        value={item.count}
                        onChange={(e) => {
                          const newList = [...form.equipment];
                          newList[index] = { ...item, count: e.target.value };
                          updateField('equipment', newList);
                        }}
                        placeholder="如: 10台、3次"
                        className={deepInputClass}
                      />
                    </div>
                    <div className="mb-1">
                      <Label className="text-gray-700 text-xs mb-1 block invisible">操作</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newList = form.equipment.filter((_, i) => i !== index);
                          updateField('equipment', newList);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 叶面肥联用 - 仅化学防治显示 */}
        {form.controlType === 'chemical' && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <SectionTitle title="叶面肥联用" icon="🌿" />
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-gray-900">是否联用叶面肥</Label>
              <div className="flex gap-4">
                <div
                  onClick={() => updateField('useLeafFertilizer', 'yes')}
                  className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all
                    ${form.useLeafFertilizer === 'yes' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
                >
                  <span className={`text-sm ${form.useLeafFertilizer === 'yes' ? 'text-emerald-700' : 'text-gray-600'}`}>是</span>
                </div>
                <div
                  onClick={() => updateField('useLeafFertilizer', 'no')}
                  className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all
                    ${form.useLeafFertilizer === 'no' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
                >
                  <span className={`text-sm ${form.useLeafFertilizer === 'no' ? 'text-emerald-700' : 'text-gray-600'}`}>否</span>
                </div>
              </div>
            </div>
            {form.useLeafFertilizer === 'yes' && (
              <>
                {/* 叶面肥列表 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-900">叶面肥列表</Label>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const newList = [...form.leafFertilizers, { name: '', dosage: 0, unit: '克', ratio: '' }];
                        updateField('leafFertilizers', newList);
                      }}
                    >
                      + 新增叶面肥
                    </Button>
                  </div>
                  {form.leafFertilizers.length === 0 ? (
                    <div className="text-center text-gray-400 py-4 text-sm border border-dashed border-gray-300 rounded-lg">
                      点击上方"新增叶面肥"添加
                    </div>
                  ) : (
                    form.leafFertilizers.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 items-end">
                        <div>
                          <Label className="text-gray-700 text-xs mb-1 block">叶面肥名称</Label>
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newList = [...form.leafFertilizers];
                              newList[index] = { ...item, name: e.target.value };
                              updateField('leafFertilizers', newList);
                            }}
                            placeholder="输入名称"
                            className={deepInputClass}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 text-xs mb-1 block">稀释倍数</Label>
                          <Input
                            type="text"
                            value={item.ratio}
                            onChange={(e) => {
                              const newList = [...form.leafFertilizers];
                              newList[index] = { ...item, ratio: e.target.value };
                              updateField('leafFertilizers', newList);
                            }}
                            placeholder="如: 1000"
                            className={deepInputClass}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 text-xs mb-1 block">用量</Label>
                          <Input
                            type="number"
                            value={item.dosage || ''}
                            onChange={(e) => {
                              const newList = [...form.leafFertilizers];
                              newList[index] = { ...item, dosage: Number(e.target.value) };
                              updateField('leafFertilizers', newList);
                            }}
                            min="0"
                            placeholder="0"
                            className={deepInputClass}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 text-xs mb-1 block">单位</Label>
                          <UnitDictSelect
                            value={item.unit}
                            onChange={(val) => {
                              const newList = [...form.leafFertilizers];
                              newList[index] = { ...item, unit: val };
                              updateField('leafFertilizers', newList);
                            }}
                            placeholder="选择单位"
                          />
                        </div>
                        <div className="mb-1">
                          <Label className="text-gray-700 text-xs mb-1 block invisible">操作</Label>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newList = form.leafFertilizers.filter((_, i) => i !== index);
                              updateField('leafFertilizers', newList);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* 备注 */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <SectionTitle title="备注" icon="📝" />
          <TextArea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="请输入备注信息"
            rows={3}
            className={`${deepInputClass} resize-none`}
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.cropName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
