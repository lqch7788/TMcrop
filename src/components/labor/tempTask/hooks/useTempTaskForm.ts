import { useState, useCallback } from 'react';
import { TempTask, TempTaskUrgency, TEMP_TASK_TYPES } from '../../../../types';

interface TempTaskFormData {
  title: string;
  urgency: TempTaskUrgency;
  tempTaskType: string;
  workLocation: string;
  estimatedHours: number;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  description: string;
  notes: string;
}

interface UseTempTaskFormProps {
  initialData?: TempTask | null;
  users: Array<{ id: string; name: string }>;
  onSubmit: (task: Partial<TempTask>) => void;
}

export function useTempTaskForm({ initialData, users, onSubmit }: UseTempTaskFormProps) {
  const [formData, setFormData] = useState<TempTaskFormData>(() => ({
    title: initialData?.title || '',
    urgency: initialData?.urgency || 'normal',
    tempTaskType: initialData?.tempTaskType || TEMP_TASK_TYPES[0],
    workLocation: initialData?.workLocation || '',
    estimatedHours: initialData?.estimatedHours || 1,
    assigneeId: initialData?.assigneeId || '',
    assigneeName: initialData?.assigneeName || '待分配',
    dueDate: initialData?.dueDate || new Date().toISOString().slice(0, 10),
    description: initialData?.description || '',
    notes: initialData?.notes || '',
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

  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof TempTaskFormData, string>> = {};
    if (!formData.title.trim()) {
      newErrors.title = '请输入任务名称';
    }
    if (!formData.workLocation.trim()) {
      newErrors.workLocation = '请输入工作地点';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    onSubmit({
      ...(initialData?.id ? { id: initialData.id } : {}),
      title: formData.title,
      urgency: formData.urgency,
      tempTaskType: formData.tempTaskType,
      workLocation: formData.workLocation,
      estimatedHours: formData.estimatedHours,
      assigneeId: formData.assigneeId,
      assigneeName: formData.assigneeName,
      dueDate: formData.dueDate,
      description: formData.description,
      notes: formData.notes,
    });
  }, [formData, initialData, onSubmit, validate]);

  const handleReset = useCallback(() => {
    setFormData({
      title: '',
      urgency: 'normal',
      tempTaskType: TEMP_TASK_TYPES[0],
      workLocation: '',
      estimatedHours: 1,
      assigneeId: '',
      assigneeName: '待分配',
      dueDate: new Date().toISOString().slice(0, 10),
      description: '',
      notes: '',
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    updateFormData,
    handleSubmit,
    handleReset,
    tempTaskTypes: TEMP_TASK_TYPES,
    workerUsers: users,
  };
}

export default useTempTaskForm;
