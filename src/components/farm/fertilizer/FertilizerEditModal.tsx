/**
 * 施肥编辑弹窗组件
 * 与 AddModal 类似但预填充数据，IoT记录显示不可编辑警告
 * 提交时调用 store.updateItem()
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { DictSelect } from '../../common/settings/DictSelect';
import { useFertilizerStore, FertilizerData } from '@/stores';

interface FertilizerEditModalProps {
  isOpen: boolean;
  record: FertilizerData;
  onClose: () => void;
  onSaved: () => void;
}

export function FertilizerEditModal({ isOpen, record, onClose, onSaved }: FertilizerEditModalProps) {
  const store = useFertilizerStore();
  const isIot = record.dataSource === 'auto_iot';

  const [form, setForm] = useState({
    fertilizerCode: '',
    fertilizerName: '',
    fertilizerType: '',
    cropName: '',
    greenhouseName: '',
    dilutionRatio: '',
    quantity: 0,
    unitPrice: 0,
    totalCost: 0,
    fertilizeTime: '',
    operatorName: '',
    description: '',
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    fertilizer: true,
    location: false,
    operation: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      setForm({
        fertilizerCode: record.fertilizerCode || '',
        fertilizerName: record.fertilizerName || '',
        fertilizerType: record.fertilizerType || '',
        cropName: record.cropName || '',
        greenhouseName: record.greenhouseName || '',
        dilutionRatio: record.dilutionRatio || '',
        quantity: record.quantity || 0,
        unitPrice: record.unitPrice || 0,
        totalCost: record.totalCost || 0,
        fertilizeTime: record.fertilizeTime || '',
        operatorName: record.operatorName || '',
        description: record.description || '',
      });
    }
  }, [isOpen, record]);

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

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!form.fertilizerName.trim() || isIot) return;
    setSubmitting(true);
    await store.updateItem(record.id, {
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: form.dilutionRatio,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      description: form.description,
    });
    setSubmitting(false);
    onSaved();
  };

  const SectionHeader = ({ keyName, title, icon }: { keyName: string; title: string; icon: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(keyName)}
      className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2.5 rounded-t-lg text-sm font-semibold"
    >
      <span>{icon} {title}</span>
      {expandedSections[keyName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
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

      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader keyName="basic" title="基础信息" icon="📋" />
          {expandedSections.basic && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">施肥编号</label>
                  <input
                    type="text"
                    value={form.fertilizerCode}
                    readOnly
                    className={inputClass + ' font-mono'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">数据来源</label>
                  <input
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
          )}
        </div>

        {/* Section 2: 肥料与用量 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader keyName="fertilizer" title="肥料与用量" icon="🧪" />
          {expandedSections.fertilizer && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">肥料名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.fertilizerName}
                    onChange={(e) => updateField('fertilizerName', e.target.value)}
                    disabled={isIot}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">肥料类型</label>
                  <DictSelect
                    category="fertilizer_type"
                    value={form.fertilizerType}
                    onChange={(value) => updateField('fertilizerType', value)}
                    placeholder="选择肥料类型"
                    disabled={isIot}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">稀释比例</label>
                  <input
                    type="text"
                    value={form.dilutionRatio}
                    onChange={(e) => updateField('dilutionRatio', e.target.value)}
                    disabled={isIot}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">施肥量 (kg)</label>
                  <input
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">单价 (元/kg)</label>
                  <input
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
                <label className="block text-sm font-medium text-gray-900 mb-1">总成本（自动计算）</label>
                <input
                  type="text"
                  value={`${form.totalCost.toFixed(2)} 元`}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 font-bold text-emerald-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: 位置与时间 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader keyName="location" title="位置与时间" icon="📍" />
          {expandedSections.location && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">温室位置</label>
                  <input
                    type="text"
                    value={form.greenhouseName}
                    onChange={(e) => updateField('greenhouseName', e.target.value)}
                    disabled={isIot}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
                  <input
                    type="text"
                    value={form.cropName}
                    onChange={(e) => updateField('cropName', e.target.value)}
                    disabled={isIot}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">施肥时间</label>
                <input
                  type="datetime-local"
                  value={form.fertilizeTime}
                  onChange={(e) => updateField('fertilizeTime', e.target.value)}
                  disabled={isIot}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: 操作与备注 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader keyName="operation" title="操作与备注" icon="📝" />
          {expandedSections.operation && (
            <div className="p-4 space-y-3 bg-white">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">操作员</label>
                <input
                  type="text"
                  value={form.operatorName}
                  onChange={(e) => updateField('operatorName', e.target.value)}
                  disabled={isIot}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
                <textarea
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
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          取消
        </button>
        {!isIot && (
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.fertilizerName.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '保存中...' : '保存修改'}
          </button>
        )}
      </div>
    </UnifiedModal>
  );
}
