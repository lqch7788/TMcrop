import { useState } from 'react';
import { Plus, AlertTriangle, Edit, Trash2, Download } from 'lucide-react';
import { TempTask } from '../../../types';
import { tempTasks as initialTempTasks, users } from '../../../data/mockData';
import { TempTaskFilters } from './TempTaskFilters';
import { TempTaskTable } from './TempTaskTable';
import { TempTaskDetailModal } from './TempTaskDetailModal';
import { TempTaskFormModal } from './TempTaskFormModal';
import { useTempTaskFilters } from './hooks/useTempTaskFilters';
import { useTempTaskForm } from './hooks/useTempTaskForm';
import { SearchableSelect } from '../../materialReturn/modals/SearchableSelect';

// 导入统一临时任务管理 Hook（数据闭环核心）
import { useTempTasks } from '../../../hooks/useTempTasks';
import { useTasks } from '../../../hooks/useTasks';
import { useOperationRecords } from '../../../hooks/useOperationRecords';

// 导出格式弹窗
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  if (!isOpen) return null;

  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              ×
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              导出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">删除临时任务警告</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 个临时任务吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 批量编辑弹窗
interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  tasks: TempTask[];
  users: Array<{ id: string; name: string }>;
  onClose: () => void;
  onConfirm: (editedTasks: Record<string, Partial<TempTask>>) => void;
}

function BatchEditModal({ isOpen, selectedRows, tasks, users, onClose, onConfirm }: BatchEditModalProps) {
  const [selectedTaskCode, setSelectedTaskCode] = useState<string>('');
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<TempTask>>>({});

  if (!isOpen) return null;

  const selectedTaskList = selectedRows.map(id => tasks.find(t => t.id === id)).filter(Boolean) as TempTask[];
  const currentTask = selectedTaskCode ? tasks.find(t => t.taskCode === selectedTaskCode) : null;
  const editedData = selectedTaskCode ? editedTasks[selectedTaskCode] || {} : {};

  const handleFieldChange = (field: keyof TempTask, value: unknown) => {
    const updated = {
      ...editedTasks,
      [selectedTaskCode]: { ...editedTasks[selectedTaskCode], [field]: value },
    };
    setEditedTasks(updated);
  };

  // 确认（下一个）- 仅切换到下一个任务，不做任何标记
  const handleConfirmNext = () => {
    // Move to next task
    const currentIndex = selectedTaskList.findIndex(t => t.taskCode === selectedTaskCode);
    if (currentIndex < selectedTaskList.length - 1) {
      setSelectedTaskCode(selectedTaskList[currentIndex + 1].taskCode);
    } else {
      setSelectedTaskCode(selectedTaskList[0].taskCode);
    }
  };

  // 发布 - 保存所有编辑并关闭
  const handlePublish = () => {
    onConfirm(editedTasks);
    setEditedTasks({});
    setSelectedTaskCode('');
    onClose();
  };

  const handleClose = () => {
    setEditedTasks({});
    setSelectedTaskCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">批量编辑临时任务</h3>
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
              已选择 {selectedRows.length} 条
            </span>
          </div>
          <button onClick={handleClose} className="text-white hover:bg-blue-700 p-1 rounded">
            ×
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 个临时任务进行批量编辑，
              已编辑 <strong>{Object.keys(editedTasks).length}</strong> 个
            </p>
          </div>

          {/* Task Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择任务编号</label>
              <SearchableSelect
                value={selectedTaskCode}
                options={selectedTaskList.map(task => ({
                  value: task.taskCode,
                  label: `${task.taskCode} - ${task.title}${editedTasks[task.taskCode] ? ' ✅ 已编辑' : ''}`
                }))}
                onChange={setSelectedTaskCode}
                placeholder="请选择任务编号"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {selectedTaskCode && currentTask && (
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {/* 任务编号 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">任务编号</div>
                <div className="text-sm font-medium text-gray-900">{currentTask.taskCode}</div>
              </div>

              {/* 任务名称 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">任务名称</div>
                <input
                  type="text"
                  value={editedData.title ?? currentTask.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 任务类型 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">任务类型</div>
                <select
                  value={editedData.tempTaskType ?? currentTask.tempTaskType}
                  onChange={(e) => handleFieldChange('tempTaskType', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="其他">其他</option>
                  <option value="病虫害防治">病虫害防治</option>
                  <option value="施肥">施肥</option>
                  <option value="浇水">浇水</option>
                  <option value="除草">除草</option>
                  <option value="修剪">修剪</option>
                  <option value="采收">采收</option>
                </select>
              </div>

              {/* 工作地点 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">工作地点</div>
                <input
                  type="text"
                  value={editedData.workLocation ?? currentTask.workLocation}
                  onChange={(e) => handleFieldChange('workLocation', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 负责人 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">负责人</div>
                <select
                  value={editedData.assigneeId ?? currentTask.assigneeId}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    handleFieldChange('assigneeId', e.target.value);
                    handleFieldChange('assigneeName', user?.name || '待分配');
                  }}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">待分配</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* 截止日期 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">截止日期</div>
                <input
                  type="date"
                  value={editedData.dueDate ?? currentTask.dueDate}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 预估时长 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">预估时长(小时)</div>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={editedData.estimatedHours ?? currentTask.estimatedHours}
                  onChange={(e) => handleFieldChange('estimatedHours', Number(e.target.value))}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 优先级 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">优先级</div>
                <select
                  value={editedData.priority ?? currentTask.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              {/* 紧急程度 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">紧急程度</div>
                <select
                  value={editedData.urgency ?? currentTask.urgency}
                  onChange={(e) => handleFieldChange('urgency', e.target.value)}
                  className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="normal">普通</option>
                  <option value="urgent">紧急</option>
                  <option value="critical">非常紧急</option>
                </select>
              </div>

              {/* 状态 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">状态</div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  currentTask.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  currentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {currentTask.status === 'pending' ? '待执行' :
                   currentTask.status === 'in_progress' ? '进行中' :
                   currentTask.status === 'completed' ? '已完成' : '已取消'}
                </span>
              </div>

              {/* 发布人 - 不可编辑 */}
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">发布人</div>
                <div className="text-sm text-gray-700">{currentTask.assignerName}</div>
              </div>

              {/* 任务描述 - 可编辑 */}
              <div className="col-span-2 bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">任务描述</div>
                <textarea
                  value={editedData.description ?? currentTask.description ?? ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full h-12 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* 备注 - 可编辑 */}
              <div className="col-span-2 bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">备注</div>
                <textarea
                  value={editedData.notes ?? currentTask.notes ?? ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full h-12 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleConfirmNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              确认（下一个）
            </button>
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TempTaskPage() {
  // 使用统一临时任务管理 Hook（数据闭环核心）
  const { tempTasks, addTempTask, submitCompletion, acceptCompletion, rejectCompletion } = useTempTasks();
  const { addTempTaskRecord } = useOperationRecords();
  // 统一任务管理 Hook（用于临时任务同步）
  const { createTask } = useTasks();

  // 使用 useTempTasks 的数据替代本地 state
  const [selectedTask, setSelectedTask] = useState<TempTask | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TempTask | null>(null);

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 筛选hook - 使用 useTempTasks 的数据
  const {
    filters,
    filteredTasks,
    stats,
    setSearchTerm,
    setUrgencyFilter,
    setStatusFilter,
    setOverdueFilter,
  } = useTempTaskFilters({ tasks: tempTasks });

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  // 关闭表单弹窗
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingTask(null);
  };

  // 表单hook
  const {
    formData,
    errors,
    updateFormData,
    handleSubmit: handleFormSubmit,
    handleSubmitDraft,
  } = useTempTaskForm({
    initialData: editingTask,
    users: users.map(u => ({ id: u.id, name: u.name })),
    onSubmit: (taskData, status) => {
      if (editingTask) {
        // 更新 - 暂时不处理（useTempTasks 未实现 update 方法，可后续扩展）
        console.log('更新临时任务:', editingTask.id, taskData);
      } else {
        // ========== 数据闭环：新建临时任务 ==========
        const newTask = addTempTask({
          title: taskData.title || '',
          type: taskData.tempTaskType || '其他',
          typeName: taskData.tempTaskType || '其他',
          urgency: (taskData.urgency as 'urgent' | 'high' | 'normal') || 'normal',
          priority: (taskData.priority as 'urgent' | 'high' | 'normal') || 'normal',
          location: taskData.workLocation || '',
          assigneeId: taskData.assigneeId || '',
          assigneeName: taskData.assigneeName || '待分配',
          assignerId: 'admin',
          assignerName: '管理员',
          estimatedHours: taskData.estimatedHours || 1,
          description: taskData.description || '',
          remarks: taskData.notes || '',
        });

        // ========== 数据闭环：同步到农事操作记录 ==========
        addTempTaskRecord({
          operationType: taskData.tempTaskType || '其他',
          operationTypeName: `临时任务-${taskData.tempTaskType || '其他'}`,
          status: 'pending',
          greenhouseId: '',
          greenhouseName: taskData.workLocation || '',
          cropName: '',
          operatorId: taskData.assigneeId || '',
          operatorName: taskData.assigneeName || '待分配',
          operationDate: new Date().toISOString().split('T')[0],
          sourceId: newTask.id,
          sourceCode: newTask.taskCode,
          progress: 0,
          remarks: '临时任务已创建，等待执行',
        });

        // ========== 数据闭环：同步到 useTasks 统一管理 ==========
        createTask({
          title: taskData.title || '',
          type: taskData.tempTaskType || 'other',
          typeName: taskData.tempTaskType || '其他',
          status: 'pending',
          priority: (taskData.priority as 'urgent' | 'high' | 'normal') || 'normal',
          progress: 0,
          sourceType: 'tempTask',
          sourceId: newTask.id,
          sourceCode: newTask.taskCode,
          assigneeId: taskData.assigneeId || '',
          assigneeName: taskData.assigneeName || '待分配',
          assignerId: 'admin',
          assignerName: '管理员',
          greenhouseName: taskData.workLocation || '',
          cropName: '',
          feedbackRequirements: [],
          dueDate: newTask.dueDate,
        });
      }
      closeFormModal();
    },
  });

  // 打开详情弹窗
  const openDetailModal = (task: TempTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // 打开创建弹窗
  const openCreateModal = () => {
    setEditingTask(null);
    setIsFormModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (task: TempTask) => {
    setEditingTask(task);
    setIsFormModalOpen(true);
  };

  // 开始任务
  const handleStartTask = (task: TempTask) => {
    // 使用 useTempTasks 的状态更新（暂时通过更新 localStorage 间接实现）
    // 注意：useTempTasks 暂未暴露 startTask 方法，这里先更新本地记录
    const updatedTask = { ...task, status: 'in_progress' as const };
    // 更新操作记录
    addTempTaskRecord({
      operationType: 'start',
      operationTypeName: '开始执行',
      status: 'in_progress',
      greenhouseId: '',
      greenhouseName: task.location || '',
      cropName: '',
      operatorId: task.assigneeId,
      operatorName: task.assigneeName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 0,
      remarks: '临时任务开始执行',
    });
    closeDetailModal();
    // 刷新页面数据以显示更新
    window.location.reload();
  };

  // 提交完成（需要审核）
  const handleSubmitComplete = (task: TempTask, hours: number, remarks: string) => {
    // 通过 useTempTasks 的 submitCompletion 提交
    submitCompletion(task.id, hours, remarks);
    // 同步到农事操作记录
    addTempTaskRecord({
      operationType: 'complete',
      operationTypeName: '提交完成',
      status: 'waiting_acceptance',
      greenhouseId: '',
      greenhouseName: task.location || '',
      cropName: '',
      operatorId: task.assigneeId,
      operatorName: task.assigneeName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 100,
      remarks: remarks || '任务已完成，提交审核',
    });
    closeDetailModal();
    window.location.reload();
  };

  // 审核通过
  const handleAcceptComplete = (task: TempTask) => {
    acceptCompletion(task.id);
    // 同步到农事操作记录
    addTempTaskRecord({
      operationType: 'accept_confirm',
      operationTypeName: '审核通过',
      status: 'completed',
      greenhouseId: '',
      greenhouseName: task.location || '',
      cropName: '',
      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 100,
      remarks: '临时任务审核通过',
    });
    closeDetailModal();
    window.location.reload();
  };

  // 重新派发（驳回2次后）
  const handleReassign = (task: TempTask) => {
    // 重置任务状态为待接受，同时可以清空rejectCount
    updateTempTask(task.id, {
      status: 'pending',
      rejectCount: 0,
    });
    // 记录操作
    addTempTaskRecord({
      operationType: 'reassign',
      operationTypeName: '重新派发',
      status: 'pending',
      greenhouseId: '',
      greenhouseName: task.location || '',
      cropName: '',
      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 0,
      remarks: `任务被重新派发，原执行人：${task.assigneeName}`,
    });
    closeDetailModal();
    window.location.reload();
  };

  // 审核驳回
  const handleRejectComplete = (task: TempTask, reason: string) => {
    rejectCompletion(task.id, reason);
    // 同步到农事操作记录
    addTempTaskRecord({
      operationType: 'reject',
      operationTypeName: '审核驳回',
      status: 'rejected',
      greenhouseId: '',
      greenhouseName: task.location || '',
      cropName: '',
      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: task.progress || 0,
      remarks: reason || '任务被驳回',
    });
    closeDetailModal();
    window.location.reload();
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredTasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTasks.map(t => t.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量编辑
  const handleBatchEdit = () => {
    setBatchEditMode(false);
    setShowBatchEditModal(true);
  };

  const handleBatchEditConfirm = (editedTasks: Record<string, Partial<TempTask>>) => {
    // 批量编辑功能暂未接入 useTempTasks，可后续扩展
    console.log('批量编辑暂未接入数据闭环:', editedTasks);
    setSelectedRows([]);
    setBatchEditMode(false);
  };

  // 批量删除
  const handleBatchDelete = () => {
    setBatchDeleteMode(false);
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    // ========== 数据闭环：批量删除临时任务 ==========
    selectedRows.forEach(id => {
      // useTempTasks 的 deleteTempTask 会删除任务
      // 注意：这里需要遍历 tempTasks 找到对应的任务来删除
      const taskToDelete = tempTasks.find(t => t.id === id);
      if (taskToDelete) {
        // 临时任务删除暂未在 useTempTasks 中实现同步删除操作记录
        // 可后续扩展
      }
    });
    setSelectedRows([]);
    setShowDeleteWarning(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = tempTasks.filter(t => selectedRows.includes(t.id));
    const headers = ['任务编号', '任务名称', '类型', '工作地点', '负责人', '截止日期', '紧急程度', '状态', '描述'];
    const exportData = selectedData.map(row => ({
      '任务编号': row.taskCode,
      '任务名称': row.title,
      '类型': row.tempTaskType,
      '工作地点': row.workLocation,
      '负责人': row.assigneeName,
      '截止日期': row.dueDate,
      '紧急程度': row.urgency,
      '状态': row.status,
      '描述': row.description || '',
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `临时任务_${new Date().toISOString().slice(0, 10)}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">临时任务</h1>
            <p className="text-gray-500">管理不在计划内的临时任务</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">总任务</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">待执行</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">进行中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">已完成</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-500">非常紧急</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
        </div>
      </div>

      {/* 筛选组件 */}
      <TempTaskFilters
        searchTerm={filters.searchTerm}
        urgencyFilter={filters.urgencyFilter}
        statusFilter={filters.statusFilter}
        overdueFilter={filters.overdueFilter}
        stats={stats}
        onSearchChange={setSearchTerm}
        onUrgencyChange={setUrgencyFilter}
        onStatusChange={setStatusFilter}
        onOverdueChange={setOverdueFilter}
      />

      {/* 任务列表表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">临时任务列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={handleCancelExport}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : batchEditMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleBatchEdit}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4" />
                批量编辑
              </button>
              <button
                onClick={handleCancelBatch}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleBatchDelete}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
              <button
                onClick={handleCancelBatch}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={openCreateModal}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={() => {
                  setBatchEditMode(true);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={handleExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          )}
        </div>

        <TempTaskTable
          tasks={filteredTasks}
          showCheckbox={exportMode || batchEditMode || batchDeleteMode}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onViewTask={openDetailModal}
          onEditTask={openEditModal}
          onStartTask={handleStartTask}
          onSubmitComplete={(task) => {
            // 打开详情弹窗，触发提交完成流程
            openDetailModal(task);
          }}
          onAcceptComplete={handleAcceptComplete}
          onRejectComplete={handleRejectComplete}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          pagination={{
            currentPage,
            pageSize,
            total: filteredTasks.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setCurrentPage(1);
            },
          }}
        />
      </div>

      {/* 详情弹窗 */}
      <TempTaskDetailModal
        task={selectedTask}
        onClose={closeDetailModal}
        onStartTask={handleStartTask}
        onSubmitComplete={handleSubmitComplete}
        onAcceptComplete={handleAcceptComplete}
        onRejectComplete={handleRejectComplete}
        onReassign={handleReassign}
      />

      {/* 创建/编辑表单弹窗 */}
      <TempTaskFormModal
        isOpen={isFormModalOpen}
        title={editingTask ? '编辑临时任务' : '新建临时任务'}
        task={editingTask}
        formData={formData}
        errors={errors}
        workerUsers={users.map(u => ({ id: u.id, name: u.name }))}
        onClose={closeFormModal}
        onSubmitDraft={handleSubmitDraft}
        onSubmit={() => handleFormSubmit('pending')}
        onChange={updateFormData}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        tasks={tempTasks}
        users={users.map(u => ({ id: u.id, name: u.name }))}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleBatchEditConfirm}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />
    </div>
  );
}

export default TempTaskPage;
