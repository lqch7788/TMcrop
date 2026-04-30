/**
 * 农事任务中心 - 新建任务弹窗
 * 样式与现有弹窗统一
 */

import React, { useState } from 'react';
import { useTasks, Task } from '../../../hooks/useTasks';
import { users as workers, cropBatches, greenhouses } from '../../../data/mockData';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import type { User } from '../../../types';
import { X } from 'lucide-react';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
  prefillData?: {
    title?: string;
    description?: string;
    sourceType?: 'problem' | 'inspection';
    sourceId?: string;
    greenhouseName?: string;
  };
}

type Worker = User & {
  skills?: string[];
  currentLoad?: number;
};

/**
 * 新建任务弹窗组件
 */
export function CreateTaskModal({ onClose, onCreated, prefillData }: CreateTaskModalProps) {
  const { createTask } = useTasks();

  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState(prefillData?.description || '');
  const [taskType, setTaskType] = useState('irrigation');
  const [batchCode, setBatchCode] = useState('');
  const [area, setArea] = useState('');
  const [greenhouse, setGreenhouse] = useState(prefillData?.greenhouseName || '');
  const [plannedDate, setPlannedDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入任务标题');
      return;
    }
    if (!greenhouse.trim()) {
      alert('请选择执行区域');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedWorker = workers.find(w => w.id === assigneeId);

      // 使用 useTasks.createTask 创建任务，这样 React 状态会正确更新
      // 状态：如果选择了执行人则为 'pending'，否则为 'draft'
      createTask({
        title: title.trim(),
        description: description.trim(),
        type: taskType,
        typeName: FARM_OPERATION_TYPES.find(t => t.value === taskType)?.label || taskType,
        batchCode,
        greenhouseName: greenhouse,
        plannedDate,
        estimatedHours,
        dueDate: plannedDate,
        priority,
        assigneeId,
        assigneeName: selectedWorker?.name || '',
        sourceType: prefillData?.sourceType as any,
        sourceId: prefillData?.sourceId,
        dispatchMode: 'farm',
      }, 'farm', assigneeId ? 'pending' : 'draft');

      onCreated();
    } catch (error) {
      console.error('[CreateTaskModal] 创建任务失败:', error);
      alert('创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* 头部 - 使用现有弹窗样式 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">新建任务</h3>
            {prefillData?.sourceType && (
              <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded">
                从{profillData.sourceType === 'problem' ? '问题' : '巡查'}创建
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-500">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 任务信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">任务信息</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">任务标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入任务标题"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">任务类型</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {FARM_OPERATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">关联批次</label>
                  <select
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">请选择批次</option>
                    {cropBatches.map((batch) => (
                      <option key={batch.batchCode} value={batch.batchCode}>
                        {batch.batchCode} - {batch.cropName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">执行区域 <span className="text-red-500">*</span></label>
                  <select
                    value={greenhouse}
                    onChange={(e) => setGreenhouse(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">请选择区域</option>
                    {greenhouses.map((gh) => (
                      <option key={gh.id} value={gh.name}>{gh.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">计划日期</label>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">预计工时</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-500">小时</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">优先级</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="urgent">紧急</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 执行人选择 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">执行人选择</h4>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!assigneeId ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="assignee"
                  value=""
                  checked={!assigneeId}
                  onChange={() => setAssigneeId('')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">保存草稿</p>
                  <p className="text-xs text-gray-500">暂不分派，稍后手动派发</p>
                </div>
              </label>

              {workers.map((worker) => (
                <label
                  key={worker.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${assigneeId === worker.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="assignee"
                    value={worker.id}
                    checked={assigneeId === worker.id}
                    onChange={() => setAssigneeId(worker.id)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                    {worker.department && (
                      <p className="text-xs text-gray-500">{worker.department}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 任务描述 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">任务描述</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入任务详细描述..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !greenhouse.trim()}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '创建中...' : assigneeId ? '直接派发' : '保存草稿'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTaskModal;
