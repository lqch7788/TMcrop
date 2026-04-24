import { Modal, FormField, Input, Select } from '../../../ui/Modal';
import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

// 时间计算函数
function calculateEndDateTime(startTime: string, days: number, hours: number, workHoursPerDay: number): string {
  if (!startTime) return '';
  try {
    const [datePart, timePart] = startTime.split(' ');
    if (!datePart) return '';
    const finalTime = timePart || '08:00';
    const start = new Date(`${datePart}T${finalTime}:00`);
    const totalHours = days * workHoursPerDay + hours;
    const end = new Date(start.getTime() + totalHours * 60 * 60 * 1000);
    const endDate = end.toISOString().split('T')[0];
    const endTime = end.toTimeString().slice(0, 5);
    return `${endDate} ${endTime}`;
  } catch {
    return '';
  }
}

interface TaskData {
  id: string;
  types: string[];
  typeName: string;
  field: string;
  greenhouseName?: string;
  crop: string;
  batchCode?: string;
  planStart: string;
  planEnd: string;
  progress: number;
  status: string;
  priority: string;
  estimatedDays: number;
  estimatedHours: number;
  workHoursPerDay?: number;
}

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  tasks: TaskData[];
  editedTaskIds: string[];
  editedTasks: Record<string, Partial<TaskData>>;
  selectedTaskId: string;
  onSelectedTaskIdChange: (id: string) => void;
  onEditedTasksChange: (tasks: Record<string, Partial<TaskData>>) => void;
  onEditedTaskIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  fields: { id: number; name: string; type: string; crop: string; area: number }[];
  taskTypes: { value: string; label: string }[];
  batchCodes: { value: string; label: string }[];
}

export function BatchEditModal({
  isOpen,
  selectedRows,
  tasks,
  editedTaskIds,
  editedTasks,
  selectedTaskId,
  onSelectedTaskIdChange,
  onEditedTasksChange,
  onEditedTaskIdsChange,
  onClose,
  onConfirm,
  fields,
  taskTypes,
  batchCodes,
}: BatchEditModalProps) {
  const selectedTasks = selectedRows.map(index => tasks[index]).filter(Boolean) as TaskData[];
  const currentTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const editedData = selectedTaskId ? editedTasks[selectedTaskId] || {} : {};

  // 本地状态用于计算截止时间
  const [localWorkHours, setLocalWorkHours] = useState(8);
  const [localPlanStart, setLocalPlanStart] = useState('');
  const [localEstimatedDays, setLocalEstimatedDays] = useState(0);
  const [localEstimatedHours, setLocalEstimatedHours] = useState(0);

  // 初始化本地状态
  useEffect(() => {
    if (currentTask) {
      setLocalWorkHours(editedData.workHoursPerDay ?? currentTask.workHoursPerDay ?? 8);
      setLocalPlanStart(editedData.planStart ?? currentTask.planStart ?? '');
      setLocalEstimatedDays(editedData.estimatedDays ?? currentTask.estimatedDays ?? 0);
      setLocalEstimatedHours(editedData.estimatedHours ?? currentTask.estimatedHours ?? 0);
    }
  }, [currentTask, selectedTaskId]);

  const handleFieldChange = (field: keyof TaskData, value: unknown) => {
    if (!selectedTaskId) return;
    const updated = {
      ...editedTasks,
      [selectedTaskId]: { ...editedTasks[selectedTaskId], [field]: value },
    };
    onEditedTasksChange(updated);
    if (!editedTaskIds.includes(selectedTaskId)) {
      onEditedTaskIdsChange([...editedTaskIds, selectedTaskId]);
    }
  };

  // 计算截止时间
  const endDateTime = localPlanStart
    ? calculateEndDateTime(localPlanStart, localEstimatedDays, localEstimatedHours, localWorkHours)
    : '-';

  // 计算总小时数
  const totalHours = localEstimatedDays * localWorkHours + localEstimatedHours;

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      draft: '草稿',
      pending: '待派发',
      accepted: '已接受',
      in_progress: '处理中',
      waiting_acceptance: '待验收',
      completed: '已完成',
      rejected: '已拒绝',
      failed: '任务失败',
      cancelled: '已取消',
      abandoned: '已放弃',
    };
    return statusLabels[status] || status;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑农事任务"
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 个任务进行批量编辑，
            已编辑 <strong>{editedTaskIds.length}</strong> 个
          </p>
          <p className="text-xs text-blue-600 mt-1">
            提示：执行人需在操作列单独选择，此处不可编辑
          </p>
        </div>

        {/* 任务选择器 */}
        <FormField label="选择任务编号">
          <Select
            value={selectedTaskId || ''}
            onChange={(e) => onSelectedTaskIdChange(e.target.value)}
            options={[
              { value: '', label: '请选择任务编号' },
              ...selectedTasks.map(t => ({
                value: t.id,
                label: `${t.id} - ${t.typeName || t.types?.[0] || ''} - ${t.field || ''} ${
                  editedTaskIds.includes(t.id) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedTaskId && currentTask && (
          <>
            {/* 第一行：任务类型、区域、批次 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 任务类型 - 可编辑 */}
              <FormField label="任务类型">
                <Select
                  value={editedData.types?.[0] ?? currentTask.types?.[0] ?? ''}
                  onChange={(e) => handleFieldChange('types', [e.target.value])}
                  options={taskTypes.map(t => ({ value: t.value, label: t.label }))}
                />
              </FormField>

              {/* 温室/大田 - 可编辑 */}
              <FormField label="温室/大田">
                <Select
                  value={editedData.field ?? currentTask.field ?? ''}
                  onChange={(e) => handleFieldChange('field', e.target.value)}
                  options={fields.map(f => ({ value: f.name, label: `${f.name} - ${f.crop}` }))}
                />
              </FormField>

              {/* 关联批次 - 可编辑 */}
              <FormField label="关联批次">
                <Select
                  value={editedData.batchCode ?? currentTask.batchCode ?? ''}
                  onChange={(e) => handleFieldChange('batchCode', e.target.value)}
                  options={[{ value: '', label: '无关联批次' }, ...batchCodes]}
                />
              </FormField>
            </div>

            {/* 第二行：作物、优先级，工作制 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 作物 - 可编辑 */}
              <FormField label="作物">
                <Select
                  value={editedData.crop ?? currentTask.crop ?? ''}
                  onChange={(e) => handleFieldChange('crop', e.target.value)}
                  options={fields.map(f => ({ value: f.crop, label: f.crop })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i)}
                />
              </FormField>

              {/* 优先级 - 可编辑 */}
              <FormField label="优先级">
                <Select
                  value={editedData.priority ?? currentTask.priority ?? 'normal'}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  options={[
                    { value: 'normal', label: '普通' },
                    { value: 'high', label: '高' },
                    { value: 'urgent', label: '紧急' },
                  ]}
                />
              </FormField>

              {/* 工作制 - 可编辑 */}
              <FormField label="工作制">
                <Select
                  value={String(localWorkHours)}
                  onChange={(e) => {
                    const newWorkHours = parseInt(e.target.value);
                    setLocalWorkHours(newWorkHours);
                    handleFieldChange('workHoursPerDay', newWorkHours);
                    // 如果当前小时数超过新工作制的最大限制，自动调整
                    if (localEstimatedHours >= newWorkHours) {
                      const newHours = newWorkHours - 1;
                      setLocalEstimatedHours(newHours);
                      handleFieldChange('estimatedHours', newHours);
                    }
                  }}
                  options={[
                    { value: '8', label: '8小时/天' },
                    { value: '10', label: '10小时/天' },
                    { value: '12', label: '12小时/天' },
                  ]}
                />
              </FormField>
            </div>

            {/* 第三行：开始日期、开始时间 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 计划开始日期 */}
              <FormField label="开始日期">
                <Input
                  type="date"
                  value={localPlanStart?.split(' ')[0] || ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const timePart = localPlanStart?.split(' ')[1] || '08:00';
                    const newPlanStart = `${newDate} ${timePart}`;
                    setLocalPlanStart(newPlanStart);
                    handleFieldChange('planStart', newPlanStart);
                  }}
                />
              </FormField>

              {/* 开始时间 */}
              <FormField label="开始时间">
                <Select
                  value={localPlanStart?.split(' ')[1] || '08:00'}
                  onChange={(e) => {
                    const datePart = localPlanStart?.split(' ')[0] || '';
                    const newPlanStart = `${datePart} ${e.target.value}`;
                    setLocalPlanStart(newPlanStart);
                    handleFieldChange('planStart', newPlanStart);
                  }}
                  options={[7,8,9,10,11,12,13,14,15,16,17,18,19].map(h => ({
                    value: `${String(h).padStart(2, '0')}:00`,
                    label: `${String(h).padStart(2, '0')}:00`,
                  }))}
                />
              </FormField>
            </div>

            {/* 第四行：天数、小时 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 天数 */}
              <FormField label="天数">
                <Input
                  type="number"
                  value={localEstimatedDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setLocalEstimatedDays(val);
                    handleFieldChange('estimatedDays', val);
                  }}
                  min={0}
                />
              </FormField>

              {/* 小时 */}
              <FormField label={`小时 (最大${localWorkHours - 1})`}>
                <Input
                  type="number"
                  value={localEstimatedHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const maxHours = localWorkHours - 1;
                    if (val >= 0 && val <= maxHours) {
                      setLocalEstimatedHours(val);
                      handleFieldChange('estimatedHours', val);
                    } else if (val > maxHours) {
                      setLocalEstimatedHours(maxHours);
                      handleFieldChange('estimatedHours', maxHours);
                    } else if (val < 0) {
                      setLocalEstimatedHours(0);
                      handleFieldChange('estimatedHours', 0);
                    }
                  }}
                  min={0}
                  max={localWorkHours - 1}
                />
              </FormField>
            </div>

            {/* 任务截止时间自动计算显示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700">
                  任务截止时间：
                </span>
                <span className="text-sm font-medium text-blue-900">
                  {endDateTime}
                </span>
                <span className="text-xs text-blue-500">
                  (共 {totalHours} 小时)
                </span>
              </div>
            </div>

            {/* 第五行：状态、进度（状态不可编辑） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 当前状态 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">当前状态</div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                  currentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  currentTask.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                  currentTask.status === 'waiting_acceptance' ? 'bg-amber-100 text-amber-700' :
                  currentTask.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                  currentTask.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusLabel(currentTask.status)}
                </span>
              </div>

              {/* 进度 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">进度</div>
                <span className="text-sm font-medium text-gray-700">0%</span>
              </div>
            </div>
          </>
        )}
      </div>
      {/* 底部操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          关闭
        </button>
        <button
          onClick={onConfirm}
          disabled={editedTaskIds.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存修改
        </button>
      </div>
    </Modal>
  );
}
