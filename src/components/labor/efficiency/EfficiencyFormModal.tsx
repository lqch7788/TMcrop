/**
 * 人效数据编辑弹窗
 */

import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
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
            <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
            <input
              type="month"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">总人数</label>
            <input
              type="number"
              value={formData.totalWorkers || ''}
              onChange={(e) => setFormData({ ...formData, totalWorkers: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 总产出 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总产出</label>
            <input
              type="number"
              value={formData.totalOutput || ''}
              onChange={(e) => setFormData({ ...formData, totalOutput: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 总工时 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总工时</label>
            <input
              type="number"
              value={formData.totalHours || ''}
              onChange={(e) => setFormData({ ...formData, totalHours: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 任务达成率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务达成率</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.taskCompletionRate || ''}
              onChange={(e) => setFormData({ ...formData, taskCompletionRate: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          {/* 出勤率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出勤率</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.attendanceRate || ''}
              onChange={(e) => setFormData({ ...formData, attendanceRate: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          {/* 人工成本率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">人工成本率</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.laborCostRate || ''}
              onChange={(e) => setFormData({ ...formData, laborCostRate: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          {/* 技能覆盖率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技能覆盖率</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.skillCoverage || ''}
              onChange={(e) => setFormData({ ...formData, skillCoverage: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          {/* 计算得出字段 - 人均产出 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">人均产出（计算）</label>
            <div className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              {calculateAvgOutput()}
            </div>
          </div>

          {/* 计算得出字段 - 工时效率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工时效率（计算）</label>
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
