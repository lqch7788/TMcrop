/**
 * 施肥新增弹窗组件
 * 4个可折叠区域：基础信息、肥料与用量、位置与时间、操作与备注
 * 使用 UnifiedModal 包装，提交时调用 store.createItem()
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { DictSelect } from '../../common/settings/DictSelect';
import { GreenhouseSelect } from '../../common/settings/GreenhouseSelect';
import { useFertilizerStore } from '@/stores';
import { validateDateNotFuture } from '@/lib/validators';
import FertilizerCodeGenerator from './FertilizerCodeGenerator';

interface FertilizerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 默认表单数据
const defaultForm = {
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
  dataSource: 'manual' as const,
  description: '',
};

export function FertilizerAddModal({ isOpen, onClose, onSaved }: FertilizerAddModalProps) {
  const store = useFertilizerStore();

  const [form, setForm] = useState(defaultForm);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    fertilizer: true,
    location: false,
    operation: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
    }
  }, [isOpen]);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // 自动计算总成本 = 施肥量 * 单价
      if (field === 'quantity' || field === 'unitPrice') {
        next.totalCost = (field === 'quantity' ? value : prev.quantity) * (field === 'unitPrice' ? value : prev.unitPrice);
      }
      return next;
    });
  }, []);

  // 切换折叠
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!form.fertilizerName.trim()) return; // 基本校验
    // 方案5.1: 施肥日期不能大于当前时间
    if (form.fertilizeTime && !validateDateNotFuture(form.fertilizeTime)) {
      alert('施肥日期不能大于当前时间');
      return;
    }
    setSubmitting(true);
    await store.createItem({
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
      dataSource: form.dataSource,
      description: form.description,
    });
    setSubmitting(false);
    onSaved();
  };

  // 渲染折叠标题
  const SectionHeader = ({ keyName, title, icon }: { keyName: string; title: string; icon: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(keyName)}
      className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2.5 rounded-t-lg text-sm font-semibold"
    >
      <span>{icon} {title}</span>
      {expandedSections[keyName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增施肥记录"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader keyName="basic" title="基础信息" icon="📋" />
          {expandedSections.basic && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">施肥编号</label>
                  <FertilizerCodeGenerator
                    value={form.fertilizerCode}
                    onChange={(code) => updateField('fertilizerCode', code)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">数据来源</label>
                  <select
                    value={form.dataSource}
                    onChange={(e) => updateField('dataSource', e.target.value)}
                    className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="manual">手动录入</option>
                    <option value="auto_iot">IoT自动</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">关联生产计划</label>
                  <input
                    type="text"
                    value={form.productionPlanCode || ''}
                    onChange={(e) => updateField('productionPlanCode', e.target.value)}
                    placeholder="可选，输入生产计划编号"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">关联种植记录</label>
                  <input
                    type="text"
                    value={form.plantingCode || ''}
                    onChange={(e) => updateField('plantingCode', e.target.value)}
                    placeholder="可选，输入种植记录编号"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    肥料名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fertilizerName}
                    onChange={(e) => updateField('fertilizerName', e.target.value)}
                    placeholder="请输入肥料名称"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">肥料类型</label>
                  <DictSelect
                    category="fertilizer_type"
                    value={form.fertilizerType}
                    onChange={(value) => updateField('fertilizerType', value)}
                    placeholder="选择肥料类型"
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
                    placeholder="如 1:500"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">施肥量 (kg)</label>
                  <input
                    type="number"
                    value={form.quantity || ''}
                    onChange={(e) => updateField('quantity', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">单价 (元/kg)</label>
                  <input
                    type="number"
                    value={form.unitPrice || ''}
                    onChange={(e) => updateField('unitPrice', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    placeholder="请输入温室位置"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">作物品种</label>
                  <input
                    type="text"
                    value={form.cropName}
                    onChange={(e) => updateField('cropName', e.target.value)}
                    placeholder="请输入作物品种"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">施肥时间</label>
                <input
                  type="datetime-local"
                  value={form.fertilizeTime}
                  onChange={(e) => updateField('fertilizeTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  placeholder="请输入操作员名称"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="请输入备注信息"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.fertilizerName.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </UnifiedModal>
  );
}
