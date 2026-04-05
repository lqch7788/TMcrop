import { useState, useCallback } from 'react';
import { Task, CropBatch, Greenhouse, User, MaterialUsage } from '../../../types';

export type TaskFormMode = 'create' | 'edit';

interface TaskFormState {
  taskCode: string;
  title: string;
  type: string;
  batchCode: string;
  greenhouseId: string;
  assigneeId: string;
  dueDate: string;
  workDuration: number;
  priority: string;
  mode: string;
  description: string;
}

const initialFormState: TaskFormState = {
  taskCode: '',
  title: '',
  type: 'irrigation',
  batchCode: '',
  greenhouseId: '',
  assigneeId: '',
  dueDate: '',
  workDuration: 1,
  priority: 'medium',
  mode: 'glass',
  description: '',
};

interface UseTaskFormProps {
  mode: TaskFormMode;
  initialData?: Task;
  greenhouses: Greenhouse[];
  cropBatches: CropBatch[];
  users: User[];
  onSubmit: (task: Task) => void;
  onCancel: () => void;
}

export function useTaskForm({
  mode,
  initialData,
  greenhouses,
  cropBatches,
  users,
  onSubmit,
  onCancel,
}: UseTaskFormProps) {
  const [formData, setFormData] = useState<TaskFormState>(() => {
    if (mode === 'edit' && initialData) {
      return {
        taskCode: initialData.taskCode,
        title: initialData.title,
        type: initialData.type,
        batchCode: initialData.batchCode,
        greenhouseId: initialData.greenhouseId,
        assigneeId: initialData.assigneeId,
        dueDate: initialData.dueDate,
        workDuration: initialData.workDuration,
        priority: initialData.priority,
        mode: initialData.mode,
        description: initialData.description,
      };
    }
    return initialFormState;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateTaskCode = useCallback(() => {
    const date = new Date();
    const code = `RW${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    return code;
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '请输入任务标题';
    if (!formData.type) newErrors.type = '请选择任务类型';
    if (!formData.batchCode) newErrors.batchCode = '请选择所属批次';
    if (!formData.greenhouseId) newErrors.greenhouseId = '请选择作业区域';
    if (!formData.assigneeId) newErrors.assigneeId = '请选择执行人';
    if (!formData.dueDate) newErrors.dueDate = '请选择截止时间';
    if (formData.workDuration <= 0) newErrors.workDuration = '请输入预计工时';
    if (!formData.mode) newErrors.mode = '请选择任务模式';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const taskTypes = [
    { value: 'irrigation', label: '浇水' },
    { value: 'fertilization', label: '施肥' },
    { value: 'pruning', label: '整枝' },
    { value: 'harvest', label: '采收' },
    { value: 'scouting', label: '巡田' },
    { value: 'spraying', label: '打药' },
    { value: 'weeding', label: '除草' },
  ];

  const filteredGreenhouses = formData.mode === 'all'
    ? greenhouses
    : greenhouses.filter(g => g.mode === formData.mode || g.type === formData.mode);

  const filteredBatches = cropBatches.filter(b =>
    formData.mode === 'all' || b.plantingMode === formData.mode
  );

  const workerUsers = users.filter(u => u.role === 'technician' || u.role === 'worker');

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;

    const selectedGreenhouse = greenhouses.find(g => g.id === formData.greenhouseId);
    const selectedBatch = cropBatches.find(b => b.batchCode === formData.batchCode);
    const selectedUser = users.find(u => u.id === formData.assigneeId);
    const taskTypeName = taskTypes.find(t => t.value === formData.type)?.label || '';

    const task: Task = {
      id: initialData?.id || String(Date.now()),
      taskCode: mode === 'create' ? generateTaskCode() : formData.taskCode,
      title: formData.title,
      type: formData.type as Task['type'],
      typeName: taskTypeName,
      batchCode: formData.batchCode,
      greenhouseName: selectedGreenhouse?.name || '',
      greenhouseId: formData.greenhouseId,
      assigneeId: formData.assigneeId,
      assigneeName: selectedUser?.name || '',
      assignerId: 'U001',
      assignerName: '系统管理员',
      dueDate: formData.dueDate,
      workDuration: formData.workDuration,
      priority: formData.priority as Task['priority'],
      status: initialData?.status || 'pending',
      mode: formData.mode as Task['mode'],
      description: formData.description,
      requiredMaterials: initialData?.requiredMaterials || [],
      actualWorkload: initialData?.actualWorkload || 0,
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      notes: initialData?.notes || '',
      images: initialData?.images || [],
    };

    onSubmit(task);
    handleReset();
  }, [formData, validateForm, greenhouses, cropBatches, users, mode, initialData, generateTaskCode, onSubmit]);

  const handleReset = useCallback(() => {
    setFormData(initialFormState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    handleReset();
    onCancel();
  }, [handleReset, onCancel]);

  const updateFormData = useCallback((field: keyof TaskFormState, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  return {
    formData,
    errors,
    taskTypes,
    filteredGreenhouses,
    filteredBatches,
    workerUsers,
    updateFormData,
    handleSubmit,
    handleReset,
    handleCancel,
    validateForm,
    generateTaskCode,
  };
}

export default useTaskForm;
