import { X } from 'lucide-react';
import { TempTask, TempTaskUrgency, TEMP_TASK_TYPES, TEMP_TASK_URGENCY_CONFIG } from '../../../types';

interface TempTaskFormModalProps {
  isOpen: boolean;
  title: string;
  task?: TempTask | null;
  formData: {
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
  };
  errors: Partial<Record<string, string>>;
  workerUsers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: () => void;
  onChange: <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => void;
}

export function TempTaskFormModal({
  isOpen,
  title,
  task,
  formData,
  errors,
  workerUsers,
  onClose,
  onSubmit,
  onChange,
}: TempTaskFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* 任务名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.title ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="请输入任务名称"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* 紧急程度和任务类型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">紧急程度</label>
              <select
                value={formData.urgency}
                onChange={(e) => onChange('urgency', e.target.value as TempTaskUrgency)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="normal">普通</option>
                <option value="urgent">紧急</option>
                <option value="critical">非常紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务类型</label>
              <select
                value={formData.tempTaskType}
                onChange={(e) => onChange('tempTaskType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {TEMP_TASK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 工作地点和预估时长 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工作地点 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.workLocation}
                onChange={(e) => onChange('workLocation', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.workLocation ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="如：大棚A区"
              />
              {errors.workLocation && <p className="text-red-500 text-xs mt-1">{errors.workLocation}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预估时长(小时)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => onChange('estimatedHours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 负责人员和截止日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
              <select
                value={formData.assigneeId}
                onChange={(e) => {
                  const user = workerUsers.find(u => u.id === e.target.value);
                  onChange('assigneeId', e.target.value);
                  onChange('assigneeName', user?.name || '待分配');
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">待分配</option>
                {workerUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => onChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 任务描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="请输入任务描述"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
              placeholder="备注信息"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default TempTaskFormModal;
