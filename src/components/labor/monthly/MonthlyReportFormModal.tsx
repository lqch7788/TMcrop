/**
 * 月报表单弹窗
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MonthlyReport } from './types';

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
      alert('请选择月份');
      return;
    }
    if (!formData.dept) {
      alert('请选择部门');
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
            <label className="block text-sm font-medium text-gray-700 mb-1">报表编号</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：MR202404"
            />
          </div>

          {/* 月份 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
            <input
              type="month"
              value={formData.month.replace('年', '-').replace('月', '')}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={formData.dept}
              onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">总工日数</label>
            <input
              type="number"
              value={formData.totalWorkdays || ''}
              onChange={(e) => setFormData({ ...formData, totalWorkdays: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 总工时 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总工时</label>
            <input
              type="number"
              value={formData.totalWorkhours || ''}
              onChange={(e) => setFormData({ ...formData, totalWorkhours: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 平均人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平均人数</label>
            <input
              type="number"
              value={formData.avgDailyWorkers || ''}
              onChange={(e) => setFormData({ ...formData, avgDailyWorkers: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 已完成任务 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">已完成任务</label>
            <input
              type="number"
              value={formData.completedTasks || ''}
              onChange={(e) => setFormData({ ...formData, completedTasks: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 待办任务 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">待办任务</label>
            <input
              type="number"
              value={formData.pendingTasks || ''}
              onChange={(e) => setFormData({ ...formData, pendingTasks: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 总产量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总产量</label>
            <input
              type="text"
              value={formData.totalHarvest}
              onChange={(e) => setFormData({ ...formData, totalHarvest: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：45.8吨"
            />
          </div>

          {/* 质量率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">质量率</label>
            <input
              type="text"
              value={formData.qualityRate}
              onChange={(e) => setFormData({ ...formData, qualityRate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：97.5%"
            />
          </div>

          {/* 人工成本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">人工成本</label>
            <input
              type="text"
              value={formData.laborCost}
              onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：8.5万元"
            />
          </div>

          {/* 物料成本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物料成本</label>
            <input
              type="text"
              value={formData.materialCost}
              onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：6.2万元"
            />
          </div>

          {/* 问题数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">问题数</label>
            <input
              type="number"
              value={formData.issuesCount || ''}
              onChange={(e) => setFormData({ ...formData, issuesCount: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 已解决问题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">已解决问题</label>
            <input
              type="number"
              value={formData.resolvedIssues || ''}
              onChange={(e) => setFormData({ ...formData, resolvedIssues: Number(e.target.value) })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 考勤率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">考勤率</label>
            <input
              type="text"
              value={formData.attendanceRate}
              onChange={(e) => setFormData({ ...formData, attendanceRate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="如：98.2%"
            />
          </div>

          {/* 发布人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发布人</label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入发布人"
            />
          </div>

          {/* 发布日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发布日期</label>
            <input
              type="date"
              value={formData.publishDate}
              onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({
                ...formData,
                status: e.target.value,
                statusClass: e.target.value === '已发布' ? 'normal' : 'draft'
              })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
