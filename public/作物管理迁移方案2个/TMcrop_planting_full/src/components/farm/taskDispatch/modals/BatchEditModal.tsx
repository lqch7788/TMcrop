import { Modal, FormField, Input, Select } from '../../../ui/Modal';

interface TaskData {
  id: string;
  types: string[];
  typeName: string;
  field: string;
  crop: string;
  assignee: string;
  planStart: string;
  planEnd: string;
  progress: number;
  status: string;
  priority: string;
  estimatedDays: number;
  estimatedHours: number;
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
  staff: { id: number; name: string; status: string }[];
  taskTypes: { value: string; label: string }[];
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
  staff,
  taskTypes,
}: BatchEditModalProps) {
  const selectedTasks = selectedRows.map(index => tasks[index]).filter(Boolean) as TaskData[];
  const currentTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const editedData = selectedTaskId ? editedTasks[selectedTaskId] || {} : {};

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑农事任务"
      size="xxl"
      onSubmit={onConfirm}
      submitText="保存修改"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 个任务进行批量编辑，
            已编辑 <strong>{editedTaskIds.length}</strong> 个
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
                label: `${t.id} - ${t.assignee} - ${t.typeName} ${
                  editedTaskIds.includes(t.id) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedTaskId && currentTask && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 任务ID - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">任务编号</div>
              <div className="text-sm font-medium text-gray-900">{currentTask.id}</div>
            </div>

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
                value={editedData.field ?? currentTask.field}
                onChange={(e) => handleFieldChange('field', e.target.value)}
                options={fields.map(f => ({ value: f.name, label: `${f.name} - ${f.crop}` }))}
              />
            </FormField>

            {/* 作物 - 可编辑 */}
            <FormField label="作物">
              <Select
                value={editedData.crop ?? currentTask.crop}
                onChange={(e) => handleFieldChange('crop', e.target.value)}
                options={fields.map(f => ({ value: f.crop, label: f.crop })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i)}
              />
            </FormField>

            {/* 执行人 - 可编辑 */}
            <FormField label="执行人">
              <Select
                value={editedData.assignee ?? currentTask.assignee}
                onChange={(e) => handleFieldChange('assignee', e.target.value)}
                options={staff.map(s => ({ value: s.name, label: s.name }))}
              />
            </FormField>

            {/* 优先级 - 可编辑 */}
            <FormField label="优先级">
              <Select
                value={editedData.priority ?? currentTask.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                options={[
                  { value: 'urgent', label: '紧急' },
                  { value: 'high', label: '高' },
                  { value: 'normal', label: '普通' },
                ]}
              />
            </FormField>

            {/* 计划开始时间 - 可编辑 */}
            <FormField label="计划开始时间">
              <Input
                type="datetime-local"
                value={editedData.planStart ?? currentTask.planStart}
                onChange={(e) => handleFieldChange('planStart', e.target.value)}
              />
            </FormField>

            {/* 计划结束时间 - 可编辑 */}
            <FormField label="计划结束时间">
              <Input
                type="datetime-local"
                value={editedData.planEnd ?? currentTask.planEnd}
                onChange={(e) => handleFieldChange('planEnd', e.target.value)}
              />
            </FormField>

            {/* 当前状态 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">当前状态</div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                currentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                currentTask.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {currentTask.status === 'completed' ? '已完成' :
                 currentTask.status === 'in_progress' ? '进行中' :
                 currentTask.status === 'pending' ? '待执行' :
                 currentTask.status === 'waiting_acceptance' ? '待验收' :
                 currentTask.status === 'rejected' ? '已驳回' : currentTask.status}
              </span>
            </div>

            {/* 进度 - 可编辑 */}
            <FormField label="进度">
              <Input
                type="number"
                value={editedData.progress ?? currentTask.progress ?? 0}
                onChange={(e) => handleFieldChange('progress', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  );
}
