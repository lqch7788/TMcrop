/**
 * 绩效考核表单弹窗
 */

import React, { useState } from 'react';
import { showAlert } from '@/lib/dialogService';
import { Modal } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';
import { PerformanceRecord } from './types';

interface PerformanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<PerformanceRecord, 'id' | 'totalScore'>) => void;
  title?: string;
  editingRecord?: PerformanceRecord | null;
}

export function PerformanceFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建考核记录',
  editingRecord,
}: PerformanceFormModalProps) {
  const [formData, setFormData] = useState({
    staffId: editingRecord?.staffId || '',
    staffName: editingRecord?.staffName || '',
    department: editingRecord?.department || '生产部',
    month: editingRecord?.month || new Date().toISOString().slice(0, 7),
    taskCompletionRate: editingRecord?.taskCompletionRate || 0,
    attendanceRate: editingRecord?.attendanceRate || 0,
    workQuality: editingRecord?.workQuality || 0,
    safetyCompliance: editingRecord?.safetyCompliance || 0,
    teamworkAttitude: editingRecord?.teamworkAttitude || 0,
    status: editingRecord?.status || '待评估',
  });

  const handleSubmit = () => {
    if (!formData.staffId) {
      showAlert('请输入工号');
      return;
    }
    if (!formData.staffName) {
      showAlert('请输入姓名');
      return;
    }
    if (!formData.month) {
      showAlert('请选择月份');
      return;
    }
    onConfirm(formData);
    onClose();
  };

  // 计算综合得分
  const calculateScore = () => {
    const weights = {
      task: 0.3,
      attendance: 0.2,
      quality: 0.25,
      safety: 0.15,
      teamwork: 0.1,
    };
    const score =
      formData.taskCompletionRate * weights.task +
      formData.attendanceRate * weights.attendance +
      formData.workQuality * weights.quality +
      formData.safetyCompliance * weights.safety +
      formData.teamworkAttitude * weights.teamwork;
    return Math.round(score);
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
          {/* 工号 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">工号</Label>
            <input
              type="text"
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入工号"
            />
          </div>

          {/* 姓名 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">姓名</Label>
            <input
              type="text"
              value={formData.staffName}
              onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
              className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入姓名"
            />
          </div>

          {/* 部门 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="生产部">生产部</option>
              <option value="技术部">技术部</option>
              <option value="质量部">质量部</option>
              <option value="采购部">采购部</option>
              <option value="销售部">销售部</option>
            </select>
          </div>

          {/* 月份 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">月份</Label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 任务完成率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">任务完成率(%)</Label>
            <NumberInput
              value={formData.taskCompletionRate || ''}
              onChange={(val) => setFormData({ ...formData, taskCompletionRate: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 出勤率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">出勤率(%)</Label>
            <NumberInput
              value={formData.attendanceRate || ''}
              onChange={(val) => setFormData({ ...formData, attendanceRate: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 工作质量 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">工作质量(%)</Label>
            <NumberInput
              value={formData.workQuality || ''}
              onChange={(val) => setFormData({ ...formData, workQuality: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 安全规范 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">安全规范(%)</Label>
            <NumberInput
              value={formData.safetyCompliance || ''}
              onChange={(val) => setFormData({ ...formData, safetyCompliance: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 协作态度 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">协作态度(%)</Label>
            <NumberInput
              value={formData.teamworkAttitude || ''}
              onChange={(val) => setFormData({ ...formData, teamworkAttitude: Number(val) })}
              placeholder="0"
              decimals={0}
              className="w-full"
            />
          </div>

          {/* 状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as '待评估' | '已评估' })}
              className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="待评估">待评估</option>
              <option value="已评估">已评估</option>
            </select>
          </div>

          {/* 综合得分（计算） */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">综合得分（计算）</Label>
            <div className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              {calculateScore()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default PerformanceFormModal;
