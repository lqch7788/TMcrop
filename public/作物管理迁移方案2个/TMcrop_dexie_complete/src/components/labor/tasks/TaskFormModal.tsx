import { Modal, FormField } from '../../ui/Modal';
import { Task, Greenhouse, CropBatch, User } from '../../../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  formData: {
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
  };
  errors: Record<string, string>;
  taskTypes: { value: string; label: string }[];
  filteredGreenhouses: Greenhouse[];
  filteredBatches: CropBatch[];
  workerUsers: User[];
  onFormChange: (field: string, value: string | number) => void;
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  formData,
  errors,
  taskTypes,
  filteredGreenhouses,
  filteredBatches,
  workerUsers,
  onFormChange,
}: TaskFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={onSubmit}
      submitText="创建任务"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 任务模式 */}
          <FormField label="任务模式" required error={errors.mode}>
            <select
              value={formData.mode}
              onChange={(e) => onFormChange('mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择任务模式</option>
              <option value="glass">玻璃温室</option>
              <option value="solar">日光温室</option>
              <option value="field">大田</option>
            </select>
          </FormField>

          {/* 任务类型 */}
          <FormField label="任务类型" required error={errors.type}>
            <select
              value={formData.type}
              onChange={(e) => onFormChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择任务类型</option>
              {taskTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* 任务标题 */}
        <FormField label="任务标题" required error={errors.title}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onFormChange('title', e.target.value)}
            placeholder="请输入任务标题"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          {/* 所属批次 */}
          <FormField label="所属批次" required error={errors.batchCode}>
            <select
              value={formData.batchCode}
              onChange={(e) => onFormChange('batchCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择批次</option>
              {filteredBatches.map((batch) => (
                <option key={batch.id} value={batch.batchCode}>
                  {batch.batchCode} - {batch.cropName}
                </option>
              ))}
            </select>
          </FormField>

          {/* 作业区域 */}
          <FormField label="作业区域" required error={errors.greenhouseId}>
            <select
              value={formData.greenhouseId}
              onChange={(e) => onFormChange('greenhouseId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择区域</option>
              {filteredGreenhouses.map((gh) => (
                <option key={gh.id} value={gh.id}>{gh.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 执行人 */}
          <FormField label="执行人" required error={errors.assigneeId}>
            <select
              value={formData.assigneeId}
              onChange={(e) => onFormChange('assigneeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择执行人</option>
              {workerUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.position}
                </option>
              ))}
            </select>
          </FormField>

          {/* 优先级 */}
          <FormField label="优先级" required>
            <select
              value={formData.priority}
              onChange={(e) => onFormChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="low">一般</option>
              <option value="medium">重要</option>
              <option value="high">紧急</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 截止时间 */}
          <FormField label="截止时间" required error={errors.dueDate}>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => onFormChange('dueDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          {/* 预计工时 */}
          <FormField label="预计工时(小时)" required error={errors.workDuration}>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={formData.workDuration}
              onChange={(e) => onFormChange('workDuration', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>
        </div>

        {/* 任务描述 */}
        <FormField label="任务描述">
          <textarea
            value={formData.description}
            onChange={(e) => onFormChange('description', e.target.value)}
            placeholder="请输入任务描述"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default TaskFormModal;
