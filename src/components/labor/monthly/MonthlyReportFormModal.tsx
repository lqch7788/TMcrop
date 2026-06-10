/**
 * 月报表单弹窗
 */

import React, { useState } from 'react';
import { Modal, NumberInput, DatePicker, Label } from '@/components/ui';
import { MonthlyReport } from './types';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface MonthlyReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<MonthlyReport, 'id'>) => void;
  title?: string;
  editingRecord?: MonthlyReport | null;
}

export function MonthlyReportFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建月报',
  editingRecord,
}: MonthlyReportFormModalProps) {
  const [formData, setFormData] = useState({
    code: editingRecord?.code || '',
    month: editingRecord?.month || '2024年4月',
    dept: editingRecord?.dept || '生产部',
    totalWorkdays: editingRecord?.totalWorkdays || 0,
    totalWorkhours: editingRecord?.totalWorkhours || 0,
    avgDailyWorkers: editingRecord?.avgDailyWorkers || 0,
    completedTasks: editingRecord?.completedTasks || 0,
    pendingTasks: editingRecord?.pendingTasks || 0,
    totalHarvest: editingRecord?.totalHarvest || '0吨',
    qualityRate: editingRecord?.qualityRate || '0%',
    laborCost: editingRecord?.laborCost || '0万元',
    materialCost: editingRecord?.materialCost || '0万元',
    issuesCount: editingRecord?.issuesCount || 0,
    resolvedIssues: editingRecord?.resolvedIssues || 0,
    attendanceRate: editingRecord?.attendanceRate || '0%',
    publisher: editingRecord?.publisher || '',
    publishDate: editingRecord?.publishDate || '',
    status: editingRecord?.status || '草稿',
    statusClass: editingRecord?.statusClass || 'draft' as const,
  });

  const handleSubmit = () => {
    if (!formData.month) {
      showAlert('请选择月份');
      return;
    }
    if (!formData.dept) {
      showAlert('请选择部门');
      return;
    }
    onConfirm(formData);
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
          {/* 报表编号 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">报表编号</Label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className={deepInputClass}
              placeholder="如：MR202404"
            />
          </div>

          {/* 月份 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">月份</Label>
            <input
              type="month"
              value={formData.month.replace('年', '-').replace('月', '')}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className={deepInputClass}
            />
          </div>

          {/* 部门 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
            <select
              value={formData.dept}
              onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
              className={deepInputClass}
            >
              <option value="生产部">生产部</option>
              <option value="技术部">技术部</option>
              <option value="质量部">质量部</option>
              <option value="采购部">采购部</option>
              <option value="销售部">销售部</option>
            </select>
          </div>

          {/* 总工日数 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总工日数</Label>
            <NumberInput
              value={formData.totalWorkdays}
              onChange={(val) => setFormData({ ...formData, totalWorkdays: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 总工时 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总工时</Label>
            <NumberInput
              value={formData.totalWorkhours}
              onChange={(val) => setFormData({ ...formData, totalWorkhours: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 平均人数 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">平均人数</Label>
            <NumberInput
              value={formData.avgDailyWorkers}
              onChange={(val) => setFormData({ ...formData, avgDailyWorkers: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 已完成任务 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">已完成任务</Label>
            <NumberInput
              value={formData.completedTasks}
              onChange={(val) => setFormData({ ...formData, completedTasks: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 待办任务 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">待办任务</Label>
            <NumberInput
              value={formData.pendingTasks}
              onChange={(val) => setFormData({ ...formData, pendingTasks: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 总产量 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">总产量</Label>
            <input
              type="text"
              value={formData.totalHarvest}
              onChange={(e) => setFormData({ ...formData, totalHarvest: e.target.value })}
              className={deepInputClass}
              placeholder="如：45.8吨"
            />
          </div>

          {/* 质量率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">质量率</Label>
            <input
              type="text"
              value={formData.qualityRate}
              onChange={(e) => setFormData({ ...formData, qualityRate: e.target.value })}
              className={deepInputClass}
              placeholder="如：97.5%"
            />
          </div>

          {/* 人工成本 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">人工成本</Label>
            <input
              type="text"
              value={formData.laborCost}
              onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
              className={deepInputClass}
              placeholder="如：8.5万元"
            />
          </div>

          {/* 物料成本 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">物料成本</Label>
            <input
              type="text"
              value={formData.materialCost}
              onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })}
              className={deepInputClass}
              placeholder="如：6.2万元"
            />
          </div>

          {/* 问题数 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">问题数</Label>
            <NumberInput
              value={formData.issuesCount}
              onChange={(val) => setFormData({ ...formData, issuesCount: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 已解决问题 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">已解决问题</Label>
            <NumberInput
              value={formData.resolvedIssues}
              onChange={(val) => setFormData({ ...formData, resolvedIssues: Number(val) })}
              placeholder="0"
              decimals={0}
            />
          </div>

          {/* 考勤率 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">考勤率</Label>
            <input
              type="text"
              value={formData.attendanceRate}
              onChange={(e) => setFormData({ ...formData, attendanceRate: e.target.value })}
              className={deepInputClass}
              placeholder="如：98.2%"
            />
          </div>

          {/* 发布人 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">发布人</Label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              className={deepInputClass}
              placeholder="请输入发布人"
            />
          </div>

          {/* 发布日期 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">发布日期</Label>
            <DatePicker
              selected={formData.publishDate ? new Date(formData.publishDate) : undefined}
              onChange={(date: Date) => setFormData({ ...formData, publishDate: todayLocal(date) })}
              placeholder="选择日期"
            />
          </div>

          {/* 状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({
                ...formData,
                status: e.target.value,
                statusClass: e.target.value === '已发布' ? 'normal' : 'draft'
              })}
              className={deepInputClass}
            >
              <option value="草稿">草稿</option>
              <option value="已发布">已发布</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default MonthlyReportFormModal;
