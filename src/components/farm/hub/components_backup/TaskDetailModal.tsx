/**
 * 农事任务中心 - 任务详情弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect } from 'react';
import { Task, TASK_STATUS_CONFIG } from '../../../hooks/useTasks';
import { STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { X } from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onVerify?: (taskId: string) => void;
}

interface TaskRecord {
  id: string;
  actionTime: string;
  operatorName: string;
  action: string;
  content: string;
  progress?: number;
}

export function TaskDetailModal({ taskId, onClose, onVerify }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);
        const tasksData = parsed.data || parsed;
        const foundTask = Array.isArray(tasksData) ? tasksData.find((t: Task) => t.id === taskId) : null;
        if (foundTask) {
          setTask(foundTask);
          setProgress(foundTask.progress || 0);
        }
      }

      const storedRecords = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
      if (storedRecords) {
        const parsed = JSON.parse(storedRecords);
        const taskRecords = Array.isArray(parsed) ? parsed : [];
        setRecords(taskRecords.filter((r: TaskRecord) => r.taskId === taskId));
      }
    } catch (error) {
      console.error('[TaskDetailModal] 加载数据失败:', error);
    }
  }, [taskId]);

  const getStatusStyle = (status: string) => {
    const config = TASK_STATUS_CONFIG[status as keyof typeof TASK_STATUS_CONFIG];
    if (config) {
      return { bg: config.bg, text: config.color, label: config.label };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  };

  const handleSubmitProgress = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);
        const tasksData = parsed.data || parsed;
        const taskIndex = Array.isArray(tasksData) ? tasksData.findIndex((t: Task) => t.id === taskId) : -1;
        if (taskIndex !== -1) {
          tasksData[taskIndex].progress = progress;
          if (feedback) {
            tasksData[taskIndex].feedback = feedback;
          }
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(parsed.data ? { ...parsed, data: tasksData } : tasksData));

          const record: TaskRecord = {
            id: `record-${Date.now()}`,
            taskId: task.id,
            actionTime: new Date().toISOString(),
            operatorName: '当前用户',
            action: 'progress',
            content: `更新进度至${progress}%`,
            progress,
          };
          const storedRecords = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
          const recordsData = storedRecords ? JSON.parse(storedRecords) : [];
          recordsData.unshift(record);
          localStorage.setItem(`${STORAGE_KEYS.TASKS}_records`, JSON.stringify(recordsData));

          setRecords([record, ...records]);
          setFeedback('');
        }
      }
    } catch (error) {
      console.error('[TaskDetailModal] 提交进度失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(task.status);
  const isExecuting = ['accepted', 'in_progress'].includes(task.status);
  const isPendingVerify = task.status === 'waiting_acceptance';
  const canVerify = isPendingVerify && onVerify;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">任务详情</h3>
            <span className={`px-2 py-0.5 text-xs rounded ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">任务编号:</span>
                <span className="ml-2 text-gray-900">{task.taskCode}</span>
              </div>
              <div>
                <span className="text-gray-500">任务类型:</span>
                <span className="ml-2 text-gray-900">{task.typeName || task.type}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">任务标题:</span>
                <span className="ml-2 text-gray-900">{task.title}</span>
              </div>
              <div>
                <span className="text-gray-500">执行区域:</span>
                <span className="ml-2 text-gray-900">{task.greenhouseName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">执行人:</span>
                <span className="ml-2 text-gray-900">{task.assigneeName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">计划日期:</span>
                <span className="ml-2 text-gray-900">{task.plannedDate ? new Date(task.plannedDate).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">截止日期:</span>
                <span className="ml-2 text-gray-900">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">当前进度:</span>
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{progress}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 任务描述 */}
          {task.description && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">任务描述</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* 执行反馈 */}
          {isExecuting && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-700 mb-3">执行反馈</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">当前进度:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 w-12">{progress}%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">反馈内容:</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="请输入执行反馈..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitProgress}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? '提交中...' : '保存进度'}
                </button>
              </div>
            </div>
          )}

          {/* 操作记录 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">操作记录</h4>
            {records.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无操作记录</p>
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div key={record.id} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(record.actionTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{record.operatorName}</span>
                    <span className="text-gray-600 flex-1">{record.content}</span>
                    {record.progress !== undefined && (
                      <span className="text-orange-600">{record.progress}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
            取消
          </button>
          {canVerify && (
            <button
              onClick={() => onVerify?.(taskId)}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              验收
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
