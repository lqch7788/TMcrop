import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import type { MonthlyBudget } from '../types';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<MonthlyBudget, 'costPerUnit'>) => void;
  title?: string;
  editingRecord?: MonthlyBudget | null;
}

export function BudgetFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建月度预算',
  editingRecord,
}: BudgetFormModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState({
    month: editingRecord?.month || `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    laborCost: editingRecord?.laborCost || 0,
    formalWorkerCost: editingRecord?.formalWorkerCost || 0,
    tempWorkerCost: editingRecord?.tempWorkerCost || 0,
    socialSecurity: editingRecord?.socialSecurity || 0,
    benefits: editingRecord?.benefits || 0,
    headcount: editingRecord?.headcount || 0,
    yieldPrediction: editingRecord?.yieldPrediction || 0,
  });

  const handleSubmit = () => {
    if (!formData.month) {
      alert('请选择月份');
      return;
    }
    // 计算总成本
    const laborCost = formData.formalWorkerCost + formData.tempWorkerCost + formData.socialSecurity + formData.benefits;
    // 计算单位成本
    const costPerUnit = formData.yieldPrediction > 0
      ? (laborCost / formData.yieldPrediction) * 100
      : 0;

    onConfirm({
      ...formData,
      laborCost,
      costPerUnit: Math.round(costPerUnit * 100) / 100,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={handleSubmit}
      submitText="确认"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 月份 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 用工人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用工人数</label>
            <input
              type="number"
              value={formData.headcount || ''}
              onChange={(e) => setFormData({ ...formData, headcount: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 预计采收量(斤) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计采收量(斤)</label>
            <input
              type="number"
              value={formData.yieldPrediction || ''}
              onChange={(e) => setFormData({ ...formData, yieldPrediction: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 正式工成本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">正式工成本(元)</label>
            <input
              type="number"
              value={formData.formalWorkerCost || ''}
              onChange={(e) => setFormData({ ...formData, formalWorkerCost: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 临时工成本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">临时工成本(元)</label>
            <input
              type="number"
              value={formData.tempWorkerCost || ''}
              onChange={(e) => setFormData({ ...formData, tempWorkerCost: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 社保 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社保(元)</label>
            <input
              type="number"
              value={formData.socialSecurity || ''}
              onChange={(e) => setFormData({ ...formData, socialSecurity: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 福利 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">福利(元)</label>
            <input
              type="number"
              value={formData.benefits || ''}
              onChange={(e) => setFormData({ ...formData, benefits: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 总成本（计算得出） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总成本(元)</label>
            <div className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              ¥{(formData.formalWorkerCost + formData.tempWorkerCost + formData.socialSecurity + formData.benefits).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default BudgetFormModal;