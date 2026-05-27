/**
 * 编辑病虫害防治记录弹窗
 * 与 AddModal 类似但预填充数据
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DictSelect } from '@/components/common/settings/DictSelect';
import CropCodeSelector from '@/components/farm/common/CropCodeSelector';
import { usePestControlStore, useGreenhouseStore, PestControlData } from '@/stores';
import * as cropVarietyService from '@/services/cropVarietyService';
import type { CropVariety } from '@/types/cropVariety';

// 防治类型选项
const CONTROL_TYPES = [
  { value: 'chemical', label: '化学防治' },
  { value: 'bio', label: '生物防治' },
  { value: 'physical', label: '物理防治' },
];

// 单位选项
const DOSAGE_UNITS = [
  { value: '克', label: '克 (g)' },
  { value: '千克', label: '千克 (kg)' },
  { value: '毫升', label: '毫升 (mL)' },
  { value: '升', label: '升 (L)' },
  { value: '袋', label: '袋' },
  { value: '瓶', label: '瓶' },
];

// 默认表单数据
const defaultForm = {
  recordCode: '',
  sprayTime: '',
  cropName: '',
  greenhouseName: '',
  controlType: 'chemical' as 'chemical' | 'bio' | 'physical',
  // 化学防治专用
  pesticideName: '',
  pesticideType: '',
  dosage: 0,
  dosageUnit: '克',
  dilutionRatio: '',
  applicationMethod: '',
  // 生物防治专用
  bioAgentName: '',
  bioAgentType: '',
  // 物理防治专用
  equipmentName: '',
  equipmentCount: '',
  // 叶面肥联用
  useLeafFertilizer: 'no' as 'yes' | 'no',
  leafFertilizerName: '',
  leafFertilizerDosage: 0,
  leafFertilizerUnit: '克',
  // 备注
  description: '',
};

interface EditPestControlModalProps {
  isOpen: boolean;
  record: PestControlData;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPestControlModal({ isOpen, record, onClose, onSaved }: EditPestControlModalProps) {
  const store = usePestControlStore();
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 温室选项
  const greenhouseOptions = useMemo(() =>
    greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name })),
    [greenhouses]
  );

  // 初始化
  useEffect(() => {
    if (greenhouses.length === 0) loadGreenhouses();
    if (isOpen) {
      cropVarietyService.initVarieties();
    }
  }, [isOpen, greenhouses.length, loadGreenhouses]);

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      setForm({
        recordCode: record.recordCode || '',
        sprayTime: record.sprayTime || '',
        cropName: record.cropName || '',
        greenhouseName: record.greenhouseName || '',
        controlType: record.controlType || 'chemical',
        // 化学防治专用
        pesticideName: record.pesticideName || '',
        pesticideType: record.pesticideType || '',
        dosage: record.dosage || 0,
        dosageUnit: record.dosageUnit || '克',
        dilutionRatio: record.dilutionRatio || '',
        applicationMethod: record.applicationMethod || '',
        // 生物防治专用
        bioAgentName: record.bioAgentName || '',
        bioAgentType: record.bioAgentType || '',
        // 物理防治专用
        equipmentName: record.equipmentName || '',
        equipmentCount: record.equipmentCount || '',
        // 叶面肥联用
        useLeafFertilizer: record.useLeafFertilizer || 'no',
        leafFertilizerName: record.leafFertilizerName || '',
        leafFertilizerDosage: record.leafFertilizerDosage || 0,
        leafFertilizerUnit: record.leafFertilizerUnit || '克',
        // 备注
        description: record.description || '',
      });
    }
  }, [isOpen, record]);

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
    if (!form.cropName.trim() || !record?.id) return;
    setSubmitting(true);

    const payload: Record<string, any> = {
      recordCode: form.recordCode,
      sprayTime: form.sprayTime,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      controlType: form.controlType,
      useLeafFertilizer: form.useLeafFertilizer,
      description: form.description,
    };

    // 根据防治类型添加专用字段
    if (form.controlType === 'chemical') {
      payload.pesticideName = form.pesticideName;
      payload.pesticideType = form.pesticideType;
      payload.dosage = form.dosage;
      payload.dosageUnit = form.dosageUnit;
      payload.dilutionRatio = form.dilutionRatio;
      payload.applicationMethod = form.applicationMethod;
    } else if (form.controlType === 'bio') {
      payload.bioAgentName = form.bioAgentName;
      payload.bioAgentType = form.bioAgentType;
      payload.dosage = form.dosage;
      payload.dosageUnit = form.dosageUnit;
      payload.dilutionRatio = form.dilutionRatio;
    } else if (form.controlType === 'physical') {
      payload.equipmentName = form.equipmentName;
      payload.equipmentCount = form.equipmentCount;
    }

    // 叶面肥联用
    if (form.useLeafFertilizer === 'yes') {
      payload.leafFertilizerName = form.leafFertilizerName;
      payload.leafFertilizerDosage = form.leafFertilizerDosage;
      payload.leafFertilizerUnit = form.leafFertilizerUnit;
    }

    await store.updateItem(record.id, payload);
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
      title="编辑病虫害防治记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 防治类型选择 */}
        <div>
          <SectionTitle title="防治类型" icon="🔍" />
          <div className="grid grid-cols-3 gap-4">
            {CONTROL_TYPES.map(ct => (
              <div
                key={ct.value}
                onClick={() => updateField('controlType', ct.value)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center
                  ${form.controlType === ct.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
              >
                <span className={`text-sm font-medium ${form.controlType === ct.value ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {ct.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 公共信息 */}
        <div>
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
                <Input
                  type="datetime-local"
                  value={form.sprayTime}
                  onChange={(e) => updateField('sprayTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                <Label className="text-gray-900">温室位置</Label>
                <DictSelect
                  category="greenhouse"
                  value={form.greenhouseName}
                  onChange={(value) => updateField('greenhouseName', value)}
                  placeholder="选择温室位置"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 化学防治专用 */}
        {form.controlType === 'chemical' && (
          <div>
            <SectionTitle title="化学防治" icon="🧪" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">农药名称</Label>
                  <Input
                    type="text"
                    value={form.pesticideName}
                    onChange={(e) => updateField('pesticideName', e.target.value)}
                    placeholder="请输入农药名称"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">农药类型</Label>
                  <DictSelect
                    category="pesticide_type"
                    value={form.pesticideType}
                    onChange={(value) => updateField('pesticideType', value)}
                    placeholder="选择农药类型"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-900">用药量</Label>
                  <Input
                    type="number"
                    value={form.dosage || ''}
                    onChange={(e) => updateField('dosage', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">单位</Label>
                  <Select value={form.dosageUnit} onValueChange={(val) => updateField('dosageUnit', val)}>
                    <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <SelectValue placeholder="选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-900">稀释比例</Label>
                  <Input
                    type="text"
                    value={form.dilutionRatio}
                    onChange={(e) => updateField('dilutionRatio', e.target.value)}
                    placeholder="如 1:500"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">施用方法</Label>
                  <DictSelect
                    category="application_method"
                    value={form.applicationMethod}
                    onChange={(value) => updateField('applicationMethod', value)}
                    placeholder="选择方法"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 生物防治专用 */}
        {form.controlType === 'bio' && (
          <div>
            <SectionTitle title="生物防治" icon="🧫" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">生物制剂名称</Label>
                  <Input
                    type="text"
                    value={form.bioAgentName}
                    onChange={(e) => updateField('bioAgentName', e.target.value)}
                    placeholder="请输入生物制剂名称"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">制剂类型</Label>
                  <DictSelect
                    category="bio_agent_type"
                    value={form.bioAgentType}
                    onChange={(value) => updateField('bioAgentType', value)}
                    placeholder="选择制剂类型"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-900">用量</Label>
                  <Input
                    type="number"
                    value={form.dosage || ''}
                    onChange={(e) => updateField('dosage', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">单位</Label>
                  <Select value={form.dosageUnit} onValueChange={(val) => updateField('dosageUnit', val)}>
                    <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <SelectValue placeholder="选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-900">稀释比例</Label>
                  <Input
                    type="text"
                    value={form.dilutionRatio}
                    onChange={(e) => updateField('dilutionRatio', e.target.value)}
                    placeholder="如 1:100"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 物理防治专用 */}
        {form.controlType === 'physical' && (
          <div>
            <SectionTitle title="物理防治" icon="⚙️" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">防治设备/方式</Label>
                  <Input
                    type="text"
                    value={form.equipmentName}
                    onChange={(e) => updateField('equipmentName', e.target.value)}
                    placeholder="请输入设备或方式名称"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">用量/次数</Label>
                  <Input
                    type="text"
                    value={form.equipmentCount}
                    onChange={(e) => updateField('equipmentCount', e.target.value)}
                    placeholder="如 10台、3次"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 叶面肥联用 */}
        <div>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-900">叶面肥名称</Label>
                  <Input
                    type="text"
                    value={form.leafFertilizerName}
                    onChange={(e) => updateField('leafFertilizerName', e.target.value)}
                    placeholder="请输入叶面肥名称"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">用量</Label>
                  <Input
                    type="number"
                    value={form.leafFertilizerDosage || ''}
                    onChange={(e) => updateField('leafFertilizerDosage', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">单位</Label>
                  <Select value={form.leafFertilizerUnit} onValueChange={(val) => updateField('leafFertilizerUnit', val)}>
                    <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <SelectValue placeholder="选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 备注 */}
        <div>
          <SectionTitle title="备注" icon="📝" />
          <TextArea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="请输入备注信息"
            rows={3}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
