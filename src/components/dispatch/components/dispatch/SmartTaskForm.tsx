/**
 * 智能派工专属表单
 * 包含任务信息输入和智能推荐执行人
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Sparkles, Check } from 'lucide-react';
import { useTasks } from '../../../../hooks/useTasks';
import { useSmartRecommend } from '../../hooks/useSmartRecommend';
import type { Task } from '../../../../types/task';
import { DispatchMode } from '../../types/dispatch';
import type { RecommendedExecutor } from '../../types/dispatch';
import { showAlert } from '@/lib/dialogService';
import { Button } from '@/components/ui';

// 温室/地块选项
const GREENHOUSE_OPTIONS = [
  { value: 'A区', label: 'A区' },
  { value: 'B区', label: 'B区' },
  { value: 'C区', label: 'C区' },
  { value: 'D区', label: 'D区' },
];

// 紧急程度选项
const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低' },
];

export interface SmartTaskFormProps {
  task?: Task | null;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 智能派工表单组件
 */
export const SmartTaskForm: React.FC<SmartTaskFormProps> = ({
  task,
  onSave,
  onCancel,
}) => {
  const { createTask, updateTask } = useTasks();
  const { getRecommendations } = useSmartRecommend({ mode: 'smart' });

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [greenhouseId, setGreenhouseId] = useState('');
  const [greenhouseName, setGreenhouseName] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);

  // 推荐状态
  const [recommendations, setRecommendations] = useState<RecommendedExecutor[]>([]);
  const [selectedExecutor, setSelectedExecutor] = useState<RecommendedExecutor | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setGreenhouseId(task.greenhouseId || '');
      setGreenhouseName(task.greenhouseName || '');
      setPriority((task.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal');
      setAssigneeId(task.assigneeId || '');
      setAssigneeName(task.assigneeName || '');
      setDueDate(task.dueDate || '');
      setEstimatedHours(task.estimatedHours || 2);

      // 如果已有推荐的执行人，设置选中
      if ((task as any).selectedExecutor) {
        const exec = (task as any).selectedExecutor;
        setSelectedExecutor({
          workerId: exec.id,
          workerName: exec.name,
          workerType: '',
          currentWorkZone: '',
          skills: [],
          currentLoad: 0,
          recentPerformance: 0,
          distance: 0,
          matchScore: exec.recommendScore || 0,
          skillMatchRate: 0,
          locationScore: 0,
          loadScore: 0,
          performanceScore: 0,
          urgencyScore: 0,
          reasons: [],
        });
      }
    }
  }, [task]);

  // 处理温室选择后，获取推荐
  const handleGreenhouseChange = (value: string) => {
    setGreenhouseId(value);
    setGreenhouseName(value);

    // 当选择了温室和工作区域后，获取推荐
    if (value) {
      const taskInput = {
        taskName: title || '新任务',
        workZone: value,
        priority,
        requiredSkills: [],
        estimatedHours,
      };
      const recs = getRecommendations(taskInput);
      setRecommendations(recs);
      setShowRecommendations(true);
    }
  };

  // 处理紧急程度变化后，重新获取推荐
  const handlePriorityChange = (value: typeof priority) => {
    setPriority(value);

    if (greenhouseId) {
      const taskInput = {
        taskName: title || '新任务',
        workZone: greenhouseId,
        priority: value,
        requiredSkills: [],
        estimatedHours,
      };
      const recs = getRecommendations(taskInput);
      setRecommendations(recs);
    }
  };

  // 选择执行人
  const handleSelectExecutor = (executor: RecommendedExecutor) => {
    setSelectedExecutor(executor);
    setAssigneeId(executor.workerId);
    setAssigneeName(executor.workerName);
    setShowRecommendations(false);
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

    if (!assigneeId) {
      showAlert('请选择执行人或等待推荐完成');
      return;
    }

    const taskData = {
      title,
      description,
      greenhouseId,
      greenhouseName,
      priority,
      assigneeId,
      assigneeName,
      dueDate,
      estimatedHours,
      recommendedExecutorName: selectedExecutor?.workerName,
      recommendScore: selectedExecutor?.matchScore,
      selectedExecutor: {
        id: assigneeId,
        name: assigneeName,
        recommendScore: selectedExecutor?.matchScore,
      },
    };

    if (task) {
      updateTask(task.id, taskData);
    } else {
      createTask(taskData, 'smart' as DispatchMode);
    }

    onSave();
  };

  // 评分样式
  const getScoreStyle = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {task ? '编辑智能派工' : '新建智能派工'}
          </h3>
        </div>
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
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* 第一行：温室 + 紧急程度 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              温室 <span className="text-red-500">*</span>
            </label>
            <select
              value={greenhouseId}
              onChange={(e) => handleGreenhouseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              紧急程度
            </label>
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value as typeof priority)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 推荐执行人 */}
        {showRecommendations && recommendations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Sparkles className="w-4 h-4 inline mr-1 text-purple-600" />
              智能推荐执行人
            </label>
            <div className="space-y-2">
              {recommendations.slice(0, 5).map((executor, index) => (
                <div
                  key={executor.workerId}
                  onClick={() => handleSelectExecutor(executor)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedExecutor?.workerId === executor.workerId
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getScoreStyle(executor.matchScore)}`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{executor.workerName}</div>
                        <div className="text-xs text-gray-500">
                          {executor.workerType} · {executor.currentWorkZone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreStyle(executor.matchScore)}`}>
                          {executor.matchScore}
                        </div>
                        <div className="text-xs text-gray-500">推荐指数</div>
                      </div>
                      {selectedExecutor?.workerId === executor.workerId && (
                        <Check className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                  </div>
                  {executor.reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {executor.reasons.map((reason, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已选择的执行人 */}
        {selectedExecutor && !showRecommendations && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              已选择执行人
            </label>
            <div className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900">{selectedExecutor.workerName}</div>
                  <div className="text-xs text-gray-500">
                    {selectedExecutor.workerType} · 推荐指数 {selectedExecutor.matchScore}
                  </div>
                </div>
              </div>
              <Button variant="link" size="sm" type="button" onClick={() => setShowRecommendations(true)} className="text-purple-600 hover:text-purple-700 h-auto p-0">
                <Sparkles className="w-4 h-4" /> 重新推荐
              </Button>
            </div>
          </div>
        )}

        {/* 第二行：预计工时 + 截止日期 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计工时
            </label>
            <input
              type="number"
              min="1"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" type="button" onClick={onCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="purple" type="submit">
            <Save className="w-4 h-4" />
            保存
          </Button>
        </div>
      </form>
    </div>
  );
};
