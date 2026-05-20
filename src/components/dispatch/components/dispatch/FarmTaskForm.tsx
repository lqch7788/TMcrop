/**
 * 农事任务专属表单
 * 包含温室、农事类型等农事任务特有字段
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useTasks } from '../../../../hooks/useTasks';
import type { Task } from '../../../../types/task';
import { TASK_CODE_PREFIX, DispatchMode } from '../../types/dispatch';
import { showAlert } from '@/lib/dialogService';

// 农事类型选项（从mockData导入）
const TASK_TYPES = [
  { value: 'fertilization', label: '施肥' },
  { value: 'irrigation', label: '灌溉' },
  { value: 'pruning', label: '修剪' },
  { value: 'harvest', label: '采收' },
  { value: 'pesticide', label: '植保' },
  { value: 'weeding', label: '除草' },
  { value: 'other', label: '其他' },
];

// 紧急程度选项
const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低' },
];

// 温室/地块选项
const GREENHOUSE_OPTIONS = [
  { value: 'A区', label: 'A区' },
  { value: 'B区', label: 'B区' },
  { value: 'C区', label: 'C区' },
  { value: 'D区', label: 'D区' },
];

// 物资类型选项
const MATERIAL_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'mL', label: 'mL' },
  { value: '个', label: '个' },
  { value: '袋', label: '袋' },
  { value: '箱', label: '箱' },
];

export interface FarmTaskFormProps {
  task?: Task | null;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 农事任务表单组件
 */
export const FarmTaskForm: React.FC<FarmTaskFormProps> = ({
  task,
  onSave,
  onCancel,
}) => {
  const { createTask, updateTask } = useTasks();

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [greenhouseId, setGreenhouseId] = useState('');
  const [greenhouseName, setGreenhouseName] = useState('');
  const [taskType, setTaskType] = useState('');
  const [taskTypeName, setTaskTypeName] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedDays, setEstimatedDays] = useState<number>(1);
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [materials, setMaterials] = useState<{ name: string; qty: number; unit: string }[]>([]);

  // 执行人选项
  const EXECUTOR_OPTIONS = [
    { value: 'W001', label: '萧峰' },
    { value: 'W002', label: '虚竹' },
    { value: 'W003', label: '狄云' },
    { value: 'W004', label: '石破天' },
    { value: 'W005', label: '胡斐' },
    { value: 'W006', label: '袁承志' },
  ];

  // 初始化表单数据
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setGreenhouseId(task.greenhouseId || '');
      setGreenhouseName(task.greenhouseName || '');
      setTaskType(task.type || '');
      setTaskTypeName(task.typeName || '');
      setPriority((task.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal');
      setAssigneeId(task.assigneeId || '');
      setAssigneeName(task.assigneeName || '');
      setDueDate(task.dueDate || '');
      setEstimatedDays(task.estimatedDays || 1);
      setEstimatedHours(task.estimatedHours || 0);
      setMaterials(task.materials || []);
    }
  }, [task]);

  // 处理温室选择
  const handleGreenhouseChange = (value: string) => {
    setGreenhouseId(value);
    setGreenhouseName(value);
  };

  // 处理农事类型选择
  const handleTaskTypeChange = (value: string) => {
    setTaskType(value);
    const typeLabel = TASK_TYPES.find((t) => t.value === value)?.label || value;
    setTaskTypeName(typeLabel);
  };

  // 处理执行人选择
  const handleExecutorChange = (value: string) => {
    setAssigneeId(value);
    const executor = EXECUTOR_OPTIONS.find((e) => e.value === value);
    setAssigneeName(executor?.label || value);
  };

  // 添加物资
  const handleAddMaterial = () => {
    setMaterials([...materials, { name: '', qty: 1, unit: 'kg' }]);
  };

  // 删除物资
  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  // 更新物资
  const handleMaterialChange = (index: number, field: 'name' | 'qty' | 'unit', value: string | number) => {
    const newMaterials = [...materials];
    if (field === 'qty') {
      newMaterials[index] = { ...newMaterials[index], qty: Number(value) || 0 };
    } else {
      newMaterials[index] = { ...newMaterials[index], [field]: value };
    }
    setMaterials(newMaterials);
  };

  // 处理保存
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showAlert('请输入任务标题');
      return;
    }

    if (!greenhouseId) {
      showAlert('请选择温室');
      return;
    }

    if (!taskType) {
      showAlert('请选择农事类型');
      return;
    }

    if (!assigneeId) {
      showAlert('请选择执行人');
      return;
    }

    const taskData = {
      title,
      description,
      greenhouseId,
      greenhouseName,
      type: taskType,
      typeName: taskTypeName,
      priority,
      assigneeId,
      assigneeName,
      dueDate,
      estimatedDays,
      estimatedHours,
      materials,
    };

    if (task) {
      // 更新任务
      updateTask(task.id, taskData);
    } else {
      // 创建新任务，状态直接设为"待接受"（pending）
      createTask(taskData, 'farm' as DispatchMode, 'pending');
    }

    onSave();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {task ? '编辑农事任务' : '新建农事任务'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 任务标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入任务标题"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 第一行：温室 + 农事类型 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              温室 <span className="text-red-500">*</span>
            </label>
            <select
              value={greenhouseId}
              onChange={(e) => handleGreenhouseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择温室</option>
              {GREENHOUSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              农事类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={taskType}
              onChange={(e) => handleTaskTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择农事类型</option>
              {TASK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 第二行：紧急程度 + 执行人 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              紧急程度
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              执行人 <span className="text-red-500">*</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => handleExecutorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择执行人</option>
              {EXECUTOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 第三行：预计天数 + 预计工时 + 截止日期 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计天数
            </label>
            <input
              type="number"
              min="1"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计工时
            </label>
            <input
              type="number"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              截止日期
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 任务描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="请输入任务描述..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 所需物资 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            所需物资
          </label>
          {materials.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2 border border-dashed border-gray-300 rounded-lg">
              暂无所需物资
            </p>
          ) : (
            <div className="space-y-2">
              {materials.map((material, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={material.name}
                    onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                    placeholder="物资名称"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={material.qty}
                    onChange={(e) => handleMaterialChange(index, 'qty', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={material.unit}
                    onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {MATERIAL_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleAddMaterial}
            className="mt-2 flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加物资
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </form>
    </div>
  );
};
