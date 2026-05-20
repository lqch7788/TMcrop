/**
 * 人效数据编辑弹窗
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NumberInput } from '@/components/ui/NumberInput';
import { Label } from '@/components/ui/label';
import { EfficiencyMetrics } from './types';

interface EfficiencyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<EfficiencyMetrics, 'id'>) => void;
  title?: string;
  editingRecord?: EfficiencyMetrics | null;
}

export function EfficiencyFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建人效记录',
  editingRecord,
}: EfficiencyFormModalProps) {
  const [formData, setFormData] = useState({
    date: editingRecord?.date || '',
    department: editingRecord?.department || '生产部',
    totalWorkers: editingRecord?.totalWorkers || 0,
    totalOutput: editingRecord?.totalOutput || 0,
    avgOutputPerWorker: editingRecord?.avgOutputPerWorker || 0,
    totalHours: editingRecord?.totalHours || 0,
    avgEfficiency: editingRecord?.avgEfficiency || 0,
    taskCompletionRate: editingRecord?.taskCompletionRate || 0,
    attendanceRate: editingRecord?.attendanceRate || 0,
    laborCostRate: editingRecord?.laborCostRate || 0,
    skillCoverage: editingRecord?.skillCoverage || 0,
  });

  const handleSubmit = () => {
    if (!formData.date) {
      alert('请选择月份');
      return;
    }
    if (!formData.department) {
      alert('请选择部门');
      return;
    }
    onConfirm(formData);
    onClose();
  };

  // 计算人均产出
  const calculateAvgOutput = () => {
    if (formData.totalWorkers > 0 && formData.totalOutput > 0) {
      return (formData.totalOutput / formData.totalWorkers).toFixed(1);
    }
    return '0';
  };

  // 计算工时效率
  const calculateEfficiency = () => {
    if (formData.totalHours > 0 && formData.totalWorkers > 0) {
      const standardHours = formData.totalWorkers * 8 * 22;
      return (formData.totalHours / standardHours).toFixed(2);
    }
    return '0';
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
            <Label className="block text-sm font-medium text-gray-700 mb-1">月份</Label>
            <input
              type="month"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="生产部">生产部</option>
              <option value="技术部">技术部</option>
              <option value="质量部">质量部</option>
              <option value="采购部">采购部</option>
              <option value="销售部">销售部</option>
            </select>
          </div>

          {/* 总人数 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总人数</Label>
            <NumberInput
              value={formData.totalWorkers || ''}
              onChange={(val) => setFormData({ ...formData, totalWorkers: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 总产出 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总产出</Label>
            <NumberInput
              value={formData.totalOutput || ''}
              onChange={(val) => setFormData({ ...formData, totalOutput: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 总工时 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总工时</Label>
            <NumberInput
              value={formData.totalHours || ''}
              onChange={(val) => setFormData({ ...formData, totalHours: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 任务达成率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">任务达成率</Label>
            <NumberInput
              value={formData.taskCompletionRate || ''}
              onChange={(val) => setFormData({ ...formData, taskCompletionRate: Number(val) })}
              placeholder="0.00"
              decimals={2}
              className="w-full"
            />
          </div>

          {/* 出勤率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">出勤率</Label>
            <NumberInput
              value={formData.attendanceRate || ''}
              onChange={(val) => setFormData({ ...formData, attendanceRate: Number(val) })}
              placeholder="0.00"
              decimals={2}
              className="w-full"
            />
          </div>

          {/* 人工成本率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">人工成本率</Label>
            <NumberInput
              value={formData.laborCostRate || ''}
              onChange={(val) => setFormData({ ...formData, laborCostRate: Number(val) })}
              placeholder="0.00"
              decimals={2}
              className="w-full"
            />
          </div>

          {/* 技能覆盖率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">技能覆盖率</Label>
            <NumberInput
              value={formData.skillCoverage || ''}
              onChange={(val) => setFormData({ ...formData, skillCoverage: Number(val) })}
              placeholder="0.00"
              decimals={2}
              className="w-full"
            />
          </div>

          {/* 计算得出字段 - 人均产出 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">人均产出（计算）</Label>
            <div className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              {calculateAvgOutput()}
            </div>
          </div>

          {/* 计算得出字段 - 工时效率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">工时效率（计算）</Label>
            <div className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              {calculateEfficiency()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EfficiencyFormModal;
