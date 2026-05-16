import { useState, useCallback } from 'react';
import { TempTask, TempTaskUrgency, TEMP_TASK_TYPES } from '../../../../types';
import { useTempTaskStore } from '../../../../stores/useTempTaskStore';

interface TempTaskFormData {
  taskCode: string;
  title: string;
  urgency: TempTaskUrgency;
  tempTaskType: string;
  workLocation: string;
  estimatedHours: number;
  assigneeId: string;
  assigneeName: string;
  planStart: string;
  dueDate: string;
  description: string;
  notes: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDays: number;
  greenhouseId: string;
  workerCount: number;
  requiredFeedback: string[];
}

interface UseTempTaskFormProps {
  initialData?: TempTask | null;
  users: Array<{ id: string; name: string }>;
  onSubmit: (task: Partial<TempTask>, status: 'draft' | 'pending') => void;
}

// 生成任务编号（带查重）
const generateTaskCode = (existingTasks?: TempTask[]): string => {
  const tasks = existingTasks || (useTempTaskStore.getState().tasks as unknown as TempTask[]);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  // 查找当天已有的任务编号
  const todayPrefix = `TT${dateStr}`;
  const todayTasks = tasks.filter(t => t.taskCode && t.taskCode.startsWith(todayPrefix));

  // 计算当天最大流水号
  let maxSequence = 0;
  todayTasks.forEach(t => {
    const match = t.taskCode.match(/(\d{3})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  // 生成新的流水号
  const sequence = String(maxSequence + 1).padStart(3, '0');
  return `TT${dateStr}-${sequence}`;
};

// 获取当前时间作为默认开始时间
const getDefaultStartTime = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export function useTempTaskForm({ initialData, users, onSubmit }: UseTempTaskFormProps) {
  const [formData, setFormData] = useState<TempTaskFormData>(() => ({
    taskCode: initialData?.taskCode || generateTaskCode(),
    title: initialData?.title || '',
    urgency: initialData?.urgency || 'normal',
    tempTaskType: initialData?.tempTaskType || TEMP_TASK_TYPES[0].value,
    workLocation: initialData?.workLocation || '',
    estimatedHours: initialData?.estimatedHours || 1,
    assigneeId: initialData?.assigneeId || '',
    assigneeName: initialData?.assigneeName || '待分配',
    planStart: (initialData as any)?.planStart || getDefaultStartTime(),
    dueDate: initialData?.dueDate || getDefaultStartTime(),
    description: initialData?.description || '',
    notes: initialData?.notes || '',
    priority: initialData?.priority || urgencyToPriority[initialData?.urgency || 'normal'],
    estimatedDays: (initialData as any)?.estimatedDays || 0,
    greenhouseId: (initialData as any)?.greenhouseId || '',
    workerCount: (initialData as any)?.workerCount || 1,
    requiredFeedback: initialData?.requiredFeedback || [],
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof TempTaskFormData, string>>>({});

  const updateFormData = useCallback(<K extends keyof TempTaskFormData>(
    key: K,
    value: TempTaskFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // 清除错误
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  }, [errors]);

  // 生成新的任务编号（带查重）
  const generateNewTaskCode = useCallback(() => {
    const newCode = generateTaskCode();
    setFormData(prev => ({ ...prev, taskCode: newCode }));
    // 清除错误
    if (errors.taskCode) {
      setErrors(prev => ({ ...prev, taskCode: undefined }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof TempTaskFormData, string>> = {};
    if (!formData.title.trim()) {
      newErrors.title = '请输入任务名称';
    }
    if (!formData.workLocation.trim()) {
      newErrors.workLocation = '请选择工作地点';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = '请选择截止时间';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((status: 'draft' | 'pending' = 'pending') => {
    if (!validate()) return;

    onSubmit({
      ...(initialData?.id ? { id: initialData.id } : {}),
      taskCode: formData.taskCode,
      title: formData.title,
      urgency: formData.urgency,
      tempTaskType: formData.tempTaskType,
      workLocation: formData.workLocation,
      estimatedHours: formData.estimatedHours,
      assigneeId: formData.assigneeId,
      assigneeName: formData.assigneeName,
      planStart: formData.planStart,
      dueDate: formData.dueDate,
      description: formData.description,
      notes: formData.notes,
      priority: formData.priority,
      estimatedDays: formData.estimatedDays,
      greenhouseId: formData.greenhouseId,
      workerCount: formData.workerCount,
      requiredFeedback: formData.requiredFeedback,
    }, status);
  }, [formData, initialData, onSubmit, validate]);

  const handleSubmitDraft = useCallback(() => {
    handleSubmit('draft');
  }, [handleSubmit]);

  const handleReset = useCallback(() => {
    setFormData({
      taskCode: generateTaskCode(),
      title: '',
      urgency: 'normal',
      tempTaskType: TEMP_TASK_TYPES[0],
      workLocation: '',
      estimatedHours: 1,
      assigneeId: '',
      assigneeName: '待分配',
      planStart: getDefaultStartTime(),
      dueDate: getDefaultStartTime(),
      description: '',
      notes: '',
      priority: 'low',
      estimatedDays: 0,
      greenhouseId: '',
      workerCount: 1,
      requiredFeedback: [],
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    updateFormData,
    handleSubmit,
    handleSubmitDraft,
    handleReset,
    generateNewTaskCode,
    tempTaskTypes: TEMP_TASK_TYPES,
    workerUsers: users,
  };
}

// 紧急程度到优先级的映射
const urgencyToPriority = {
  critical: 'high' as const,
  urgent: 'medium' as const,
  normal: 'low' as const,
};

export default useTempTaskForm;