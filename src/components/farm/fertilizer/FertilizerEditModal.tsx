/**
 * 施肥编辑弹窗组件
 * 与 AddModal 类似但预填充数据，IoT记录显示不可编辑警告
 * 提交时调用 store.updateItem()
 */
import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { TextArea } from '../../ui/TextArea';
import { DictSelect } from '../../common/settings/DictSelect';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { useFertilizerStore, useFertilizerLibraryStore, FertilizerData } from '@/stores';
import type { CropVariety } from '@/types/cropVariety';

interface FertilizerEditModalProps {
  isOpen: boolean;
  record: FertilizerData;
  onClose: () => void;
  onSaved: () => void;
}

export function FertilizerEditModal({ isOpen, record, onClose, onSaved }: FertilizerEditModalProps) {
  const store = useFertilizerStore();
  const fertilizerLibraryStore = useFertilizerLibraryStore();
  const isIot = record.dataSource === 'auto_iot';

  const [form, setForm] = useState({
    fertilizerCode: '',
    fertilizerName: '',
    fertilizerType: '',
    cropName: '',
    greenhouseName: '',
    dilutionRatio: '',
    quantity: 0,
    unit: '千克',
    unitPrice: 0,
    totalCost: 0,
    fertilizeTime: '',
    operatorName: '',
    description: '',
    inputMode: 'library' as 'library' | 'manual',
    selectedFertilizerId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 作物选择处理
  const handleCropCodeChange = useCallback((code: string, varietyInfo: CropVariety | null) => {
    if (isIot) return;
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({
        ...prev,
        cropName: cropNameValue,
      }));
    }
  }, [isIot]);

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      // 根据是否有 fertilizerId（关联到库）决定 inputMode
      const hasFertilizerId = !!(record as any).fertilizerId;
      setForm({
        fertilizerCode: record.fertilizerCode || '',
        fertilizerName: record.fertilizerName || '',
        fertilizerType: record.fertilizerType || '',
        cropName: record.cropName || '',
        greenhouseName: record.greenhouseName || '',
        dilutionRatio: record.dilutionRatio || '',
        quantity: record.quantity || 0,
        unit: record.unit || '千克',
        unitPrice: record.unitPrice || 0,
        totalCost: record.totalCost || 0,
        fertilizeTime: record.fertilizeTime || '',
        operatorName: record.operatorName || '',
        description: record.description || '',
        inputMode: hasFertilizerId ? 'library' : 'manual',
        selectedFertilizerId: (record as any).fertilizerId || '',
      });
    }
  }, [isOpen, record]);

  // 加载肥料库数据
  useEffect(() => {
    fertilizerLibraryStore.fetchItems({ limit: '10000' });
  }, [fertilizerLibraryStore]);

  const updateField = useCallback((field: string, value: any) => {
    if (isIot) return;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        next.totalCost = (field === 'quantity' ? value : prev.quantity) * (field === 'unitPrice' ? value : prev.unitPrice);
      }
      return next;
    });
  }, [isIot]);

  const handleSubmit = async () => {
    if (!form.fertilizerName.trim() || isIot) return;
    setSubmitting(true);
    const payload: Record<string, any> = {
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: form.dilutionRatio,
      quantity: form.quantity,
      unit: form.unit,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      description: form.description,
      inputMode: form.inputMode,
      selectedFertilizerId: form.selectedFertilizerId,
    };
    await store.updateItem(record.id, payload);
    setSubmitting(false);
    onSaved();
  };

  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  const inputClass = isIot
    ? 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed text-gray-500'
    : 'w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`编辑施肥记录 - ${record.fertilizerCode}`}
      size="xl"
      showFooter={false}
    >
      {/* IoT 警告 */}
      {isIot && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <span>IoT自动记录不可编辑，仅可查看。如需调整，请修改IoT设备的采集参数。</span>
        </div>
      )}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施肥编号</Label>
                <Input
                  type="text"
                  value={form.fertilizerCode}
                  readOnly
                  className={inputClass + ' font-mono'}
                />
              </div>
              <div>
                <Label className="text-gray-900">数据来源</Label>
                <Input
                  type="text"
                  value={isIot ? 'IoT自动' : '手动录入'}
                  readOnly
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-medium ${
                    isIot ? 'text-green-600' : 'text-blue-600'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 肥料与用量 */}
        <div>
          <SectionTitle title="肥料与用量" icon="🧪" />
          <div className="space-y-3">
            {/* 模式切换：库选择 / 手动输入 - 非 IoT 模式显示 */}
            {!isIot && (
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="library"
                    checked={form.inputMode === 'library'}
                    onChange={() => setForm(f => ({ ...f, inputMode: 'library', selectedFertilizerId: '' }))}
                  />
                  从库选择
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="manual"
                    checked={form.inputMode === 'manual'}
                    onChange={() => setForm(f => ({ ...f, inputMode: 'manual', selectedFertilizerId: '' }))}
                  />
                  手动输入
                </label>
              </div>
            )}

            {/* 从库选择模式 - 非 IoT 模式显示 */}
            {!isIot && form.inputMode === 'library' && (
              <div className="mb-4">
                <Label className="text-gray-900">选择肥料</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.selectedFertilizerId}
                  onChange={(e) => {
                    const selected = fertilizerLibraryStore.items.find(i => i.id === e.target.value);
                    if (selected) {
                      setForm(f => ({
                        ...f,
                        selectedFertilizerId: selected.id,
                        fertilizerName: selected.fertilizerName,
                        fertilizerType: selected.fertilizerType || '',
                        dilutionRatio: selected.specs?.[0]?.suggestedRatio || '',
                      }));
                    }
                  }}
                >
                  <option value="">-- 请选择肥料 --</option>
                  {fertilizerLibraryStore.items
                    .filter(item => item.status === 'active')
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.fertilizerName} ({item.fertilizerCode})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">肥料类型</Label>
                <DictSelect
                  category="fertilizer_type"
                  value={form.fertilizerType}
                  onChange={(value) => updateField('fertilizerType', value)}
                  placeholder="选择肥料类型"
                  disabled={isIot}
                />
              </div>
              {form.inputMode === 'manual' && !isIot && (
                <div>
                  <Label className="text-gray-900">肥料名称 <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    value={form.fertilizerName}
                    onChange={(e) => updateField('fertilizerName', e.target.value)}
                    disabled={isIot}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-900">稀释比例</Label>
                <Input
                  type="text"
                  value={form.dilutionRatio}
                  onChange={(e) => updateField('dilutionRatio', e.target.value)}
                  disabled={isIot}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">施肥量</Label>
                <Input
                  type="number"
                  value={form.quantity || ''}
                  onChange={(e) => updateField('quantity', Number(e.target.value))}
                  disabled={isIot}
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">单位</Label>
                <DictSelect
                  category="unit"
                  value={form.unit}
                  onChange={(value) => updateField('unit', value)}
                  placeholder="选择单位"
                  disabled={isIot}
                />
              </div>
              <div>
                <Label className="text-gray-900">单价 (元/{form.unit || '单位'})</Label>
                <Input
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) => updateField('unitPrice', Number(e.target.value))}
                  disabled={isIot}
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">总成本（自动计算）</Label>
              <Input
                type="text"
                value={`${form.totalCost.toFixed(2)} 元`}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 font-bold text-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: 位置与时间 */}
        <div>
          <SectionTitle title="位置与时间" icon="📍" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">温室位置</Label>
                <Input
                  type="text"
                  value={form.greenhouseName}
                  onChange={(e) => updateField('greenhouseName', e.target.value)}
                  disabled={isIot}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">作物品种</Label>
                <CropCodeSelector
                  value={cropCode}
                  onChange={handleCropCodeChange}
                  placeholder="搜索或选择作物品种..."
                  size="md"
                  showFullPath={true}
                  disabled={isIot}
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
            </div>
            <div>
              <Label className="text-gray-900">施肥时间</Label>
              <Input
                type="datetime-local"
                value={form.fertilizeTime}
                onChange={(e) => updateField('fertilizeTime', e.target.value)}
                disabled={isIot}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 4: 操作与备注 */}
        <div>
          <SectionTitle title="操作与备注" icon="📝" />
          <div className="space-y-3">
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Input
                type="text"
                value={form.operatorName}
                onChange={(e) => updateField('operatorName', e.target.value)}
                disabled={isIot}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-gray-900">备注</Label>
              <TextArea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={isIot}
                rows={3}
                className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${
                  isIot
                    ? 'border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500'
                    : 'border border-gray-400'
                }`}
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
        {!isIot && (
          <Button
            variant="warning"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !form.fertilizerName.trim()}
          >
            {submitting ? '保存中...' : '保存修改'}
          </Button>
        )}
      </div>
    </UnifiedModal>
  );
}
