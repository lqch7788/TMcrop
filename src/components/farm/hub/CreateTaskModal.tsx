/**
 * 农事任务中心 - 新建任务弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTasks, Task } from '../../../hooks/useTasks';
import { useUserStore, useGreenhouseStore, useProductionPlanStore } from '../../../stores';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import type { User } from '../../../types';
import { X } from 'lucide-react';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { TextArea } from '../../ui/TextArea';
import { showAlert } from '@/lib/dialogService';

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
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);
  const storePlans = useProductionPlanStore((state) => state.plans);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (storePlans.length === 0) {
      fetchPlans();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses, storePlans.length, fetchPlans]);

  // 从Store计算生产批次列表
  const cropBatches = useMemo(() => storePlans.map(p => ({
    id: p.id,
    batchCode: p.batchCode,
    cropName: (p as any).cropName || (p as any).cropTypeName || '',
    batchStatus: (p as any).batchStatus || (p as any).status,
  })), [storePlans]);

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
      await showAlert('请输入任务标题');
      return;
    }
    if (!greenhouse.trim()) {
      await showAlert('请选择执行区域');
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
      // 创建任务失败
      await showAlert('创建任务失败');
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 任务信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">任务信息</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-600 mb-1">任务标题 <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入任务标题"
                  className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">任务类型</Label>
                  <Select
                    value={taskType}
                    onValueChange={(val) => setTaskType(val)}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <SelectValue placeholder="请选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {FARM_OPERATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">关联批次</Label>
                  <Select
                    value={batchCode}
                    onValueChange={(val) => setBatchCode(val)}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <SelectValue placeholder="请选择批次" />
                    </SelectTrigger>
                    <SelectContent>                      {cropBatches.map((batch) => (
                        <SelectItem key={batch.batchCode} value={batch.batchCode}>
                          {batch.batchCode} - {batch.cropName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">执行区域 <span className="text-red-500">*</span></Label>
                  <Select
                    value={greenhouse}
                    onValueChange={(val) => setGreenhouse(val)}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <SelectValue placeholder="请选择区域" />
                    </SelectTrigger>
                    <SelectContent>                      {greenhouses.map((gh) => (
                        <SelectItem key={gh.id} value={gh.name}>{gh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">计划日期</Label>
                  <DatePicker
                    selected={plannedDate ? new Date(plannedDate) : undefined}
                    onChange={(date) => setPlannedDate(date.toISOString().split('T')[0])}
                    placeholder="选择计划日期"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">预计工时</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-500">小时</span>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">优先级</Label>
                  <Select
                    value={priority}
                    onValueChange={(val) => setPriority(val as any)}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <SelectValue placeholder="中" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">紧急</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 执行人选择 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">执行人选择</h4>
            <div className="space-y-2">
              <Label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!assigneeId ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                <Input
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
              </Label>

              {workers.map((worker) => (
                <Label
                  key={worker.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${assigneeId === worker.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                >
                  <Input
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
                </Label>
              ))}
            </div>
          </div>

          {/* 任务描述 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">任务描述</h4>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入任务详细描述..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !greenhouse.trim()}
          >
            {isSubmitting ? '创建中...' : assigneeId ? '直接派发' : '保存草稿'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateTaskModal;
