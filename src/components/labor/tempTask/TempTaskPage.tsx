import { useState, useEffect } from 'react';
import { AlertTriangle, Check, CheckCircle, Clock, Download, Edit2, FileText, Plus, Send, Trash2, X, XCircle } from 'lucide-react';
import { TempTask, TEMP_TASK_TYPES } from '../../../types';
import { useUserStore } from '../../../stores';
import { TempTaskFilters } from './TempTaskFilters';
import { TempTaskTable } from './TempTaskTable';
import { TempTaskFormModal } from './TempTaskFormModal';
import { useTempTaskFilters } from './hooks/useTempTaskFilters';
import { useTempTaskForm } from './hooks/useTempTaskForm';
import { SearchableSelect } from '../../materialReturn/modals/SearchableSelect';
import { Modal } from '@/components/ui';
import { TaskTypeConfigDisplay } from '../../farm/taskDispatch/components/TaskTypeConfigDisplay';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { NumberInput } from '@/components/ui';

// 导入统一临时任务管理 Hook（数据闭环核心）
import { useTempTasks } from '../../../hooks/useTempTasks';

import { useOperationRecords } from '../../../hooks/useOperationRecords';
import type { Task, TaskRecord } from '../../../types/task';
import { Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

// 状态映射
const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'bg-gray-100', color: 'text-gray-600', label: '草稿' },
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-600', label: '已接受' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '进行中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '已拒绝' },
  failed: { bg: 'bg-purple-100', color: 'text-purple-600', label: '任务失败' },
  cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: '已取消' },
  abandoned: { bg: 'bg-red-50', color: 'text-red-400', label: '已放弃' },
};

// 优先级映射
const priorityMap: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-red-500', label: '紧急' },
  high: { color: 'text-orange-500', label: '高' },
  medium: { color: 'text-yellow-500', label: '中' },
  low: { color: 'text-green-500', label: '低' },
  normal: { color: 'text-gray-500', label: '普通' },
};

// 任务类型定义
const taskTypes = [
  { value: 'fertilization', label: '施肥', color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', color: 'bg-emerald-500' },
  { value: 'other', label: '其他', color: 'bg-gray-500' },
];

// 获取任务类型颜色
const getTypeColor = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.color || 'bg-gray-500';
};

// 获取任务类型标签
const getTypeLabel = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.label || type;
};

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

  const content = (
    <>
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
    </>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button onClick={onConfirm}><Download className="w-4 h-4" /> 导出</Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="选择导出格式" size="md" showFooter={true} footer={footer}>
      {content}
    </UnifiedModal>
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

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4" /> 确认删除</Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="删除临时任务警告" size="sm" showFooter={true} footer={footer}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">删除临时任务警告</h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-3">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个临时任务吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
    </UnifiedModal>
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

  const content = (
    <div>
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 个临时任务进行批量编辑，
          已编辑 <strong>{Object.keys(editedTasks).length}</strong> 个
        </p>
      </div>

      <div className="mb-3">
        <Label className="block text-xs font-medium text-gray-600 mb-1">选择任务编号</Label>
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

      {selectedTaskCode && currentTask && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务编号</div>
            <div className="text-sm font-medium text-gray-900">{currentTask.taskCode}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务名称</div>
            <input type="text" value={editedData.title ?? currentTask.title} onChange={(e) => handleFieldChange('title', e.target.value)} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务类型</div>
            <select value={editedData.tempTaskType ?? currentTask.tempTaskType} onChange={(e) => handleFieldChange('tempTaskType', e.target.value)} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500">
              <option value="其他">其他</option>
              <option value="病虫害防治">病虫害防治</option>
              <option value="施肥">施肥</option>
              <option value="浇水">浇水</option>
              <option value="除草">除草</option>
              <option value="修剪">修剪</option>
              <option value="采收">采收</option>
            </select>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">工作地点</div>
            <input type="text" value={editedData.workLocation ?? currentTask.workLocation} onChange={(e) => handleFieldChange('workLocation', e.target.value)} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">执行人</div>
            <select value={editedData.assigneeId ?? currentTask.assigneeId} onChange={(e) => { const user = users.find(u => u.id === e.target.value); handleFieldChange('assigneeId', e.target.value); handleFieldChange('assigneeName', user?.name || '待分配'); }} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500">
              <option value="">待分配</option>
              {users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
            </select>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">截止日期</div>
            <DatePicker
              selected={(editedData.dueDate ?? currentTask.dueDate) ? new Date(editedData.dueDate ?? currentTask.dueDate) : undefined}
              onChange={(date) => handleFieldChange('dueDate', date.toISOString().split('T')[0])}
              className="w-full h-7"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">预估时长(小时)</div>
            <NumberInput
              value={editedData.estimatedHours ?? currentTask.estimatedHours ?? 0}
              onChange={(value) => handleFieldChange('estimatedHours', Number(value))}
              min={0.5}
              decimals={1}
              className="w-full h-7"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">优先级</div>
            <select value={editedData.priority ?? currentTask.priority} onChange={(e) => handleFieldChange('priority', e.target.value)} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
      )}

      {selectedTaskCode && currentTask && (
        <div className="grid grid-cols-4 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">紧急程度</div>
            <select value={editedData.urgency ?? currentTask.urgency} onChange={(e) => handleFieldChange('urgency', e.target.value)} className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500">
              <option value="normal">普通</option>
              <option value="urgent">紧急</option>
              <option value="critical">非常紧急</option>
            </select>
          </div>
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">状态</div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${currentTask.status === 'pending' ? 'bg-amber-100 text-amber-700' : currentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : currentTask.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {currentTask.status === 'pending' ? '待执行' : currentTask.status === 'in_progress' ? '进行中' : currentTask.status === 'completed' ? '已完成' : '已取消'}
            </span>
          </div>
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">发布人</div>
            <div className="text-sm text-gray-700">{currentTask.assignerName}</div>
          </div>
          <div></div>
          <div className="col-span-2 bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务描述</div>
            <textarea value={editedData.description ?? currentTask.description ?? ''} onChange={(e) => handleFieldChange('description', e.target.value)} className="w-full h-12 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="col-span-2 bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">备注</div>
            <textarea value={editedData.notes ?? currentTask.notes ?? ''} onChange={(e) => handleFieldChange('notes', e.target.value)} className="w-full h-12 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button variant="blue" onClick={handleConfirmNext}><Check className="w-4 h-4" /> 确认（下一个）</Button>
      <Button onClick={handlePublish}><Send className="w-4 h-4" /> 发布</Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={handleClose} title="批量编辑临时任务" size="xxl" showFooter={true} footer={footer} showMaximize={true}>
      {content}
    </UnifiedModal>
  );
}

// 撤回/取消弹窗组件
interface WithdrawCancelModalProps {
  isOpen: boolean;
  task: TempTask | null;
  type: 'withdraw' | 'cancel';
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

function WithdrawCancelModal({ isOpen, task, type, onConfirm, onClose }: WithdrawCancelModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen || !task) return null;

  const isWithdraw = type === 'withdraw';
  const title = isWithdraw ? '撤回任务' : '取消任务';
  const colorClass = isWithdraw ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50';

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  const content = (
    <div className="space-y-5">
      {/* 警示信息 */}
      <div className={`flex items-start gap-3 p-4 rounded-lg border ${colorClass}`}>
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">
            {isWithdraw ? '撤回后将取消该任务的派发，执行人将无法再接受此任务' : '取消后任务将终止，执行人将无法继续执行'}
          </p>
          <p className="text-sm mt-1 opacity-80">
            此操作需要填写原因
          </p>
        </div>
      </div>

      {/* 任务信息 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="font-medium text-gray-900">{task.title}</p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-500">
          <p>任务编号：{task.taskCode}</p>
          <p>执行人：{task.assigneeName}</p>
          <p>当前状态：{isWithdraw ? '待接受' : '处理中'}</p>
          <p>派发人：{task.assignerName}</p>
        </div>
      </div>

      {/* 原因输入 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          操作原因 <span className="text-red-500">*</span>
        </Label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`请输入${isWithdraw ? '撤回' : '取消'}原因...`}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={() => {
          setReason('');
          onClose();
        }}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!reason.trim()}
        variant={isWithdraw ? 'default' : 'destructive'}
      >
        <Check className="w-4 h-4" /> 确认{title}
      </Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={title} size="md" showFooter={true} footer={footer}>
      {content}
    </UnifiedModal>
  );
}

// 重新派发弹窗组件
interface ReassignTaskModalProps {
  isOpen: boolean;
  task: TempTask | null;
  users: Array<{ id: string; name: string; role?: string }>;
  onConfirm: (newAssigneeId: string, newAssigneeName: string) => void;
  onClose: () => void;
}

function ReassignTaskModal({ isOpen, task, users, onConfirm, onClose }: ReassignTaskModalProps) {
  const [selectedAssignee, setSelectedAssignee] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = () => {
    if (selectedAssignee) {
      const user = users.find(u => u.id === selectedAssignee);
      if (user) {
        onConfirm(selectedAssignee, user.name);
        setSelectedAssignee('');
      }
    }
  };

  const content = (
    <div className="space-y-5">
      {/* 警示信息 */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-100 bg-orange-50">
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-600" />
        <div>
          <p className="font-medium text-orange-900">
            任务 "{task.title}" 需要重新派发
          </p>
          <p className="text-sm mt-1 text-orange-700">
            请选择新的执行人。原执行人：{task.assigneeName || '(已清空)'}
          </p>
        </div>
      </div>

      {/* 任务信息 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
          <p>任务编号：{task.taskCode}</p>
          <p>执行人：{task.assigneeName || '(已清空)'}</p>
          <p>任务类型：{task.tempTaskType || '其他'}</p>
          <p>当前状态：
            <span className="text-red-600 font-medium">
              {task.status === 'rejected' ? '已拒绝' : task.status === 'pending_reassign' ? '待重新派发' : '进行中'}
            </span>
          </p>
          {task.rejectReason && (
            <p className="col-span-2 text-red-600">拒绝原因：{task.rejectReason}</p>
          )}
        </div>
      </div>

      {/* 执行人选择 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          选择新执行人
        </Label>
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">请选择执行人</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} {user.role ? `(${user.role})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 确认提示 */}
      {selectedAssignee && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-sm text-emerald-800">
            确认将任务派发给：
            <span className="font-medium">
              {users.find(u => u.id === selectedAssignee)?.name}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!selectedAssignee}
      >
        <Send className="w-4 h-4" /> 确认派发
      </Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="重新派发任务" size="md" showFooter={true} footer={footer}>
      {content}
    </UnifiedModal>
  );
}

export function TempTaskPage() {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  // 使用统一临时任务管理 Hook（数据闭环核心）
  const { tempTasks, addTempTask, submitCompletion, acceptCompletion, rejectCompletion, updateTempTask, deleteTempTask } = useTempTasks();
  const { addTempTaskRecord, getRecordsByTaskId } = useOperationRecords();
  // 统一任务管理 Hook（用于临时任务同步）


  // 紧急程度映射到优先级
  const mapUrgencyToPriority = (urgency?: string): 'urgent' | 'high' | 'normal' => {
    switch (urgency) {
      case 'critical': return 'urgent';
      case 'urgent': return 'high';
      default: return 'normal';
    }
  };

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

  // 撤回/取消弹窗状态
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [withdrawCancelTask, setWithdrawCancelTask] = useState<TempTask | null>(null);

  // 重新派发弹窗状态
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState<TempTask | null>(null);

  // 验收弹窗状态
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTask, setVerifyTask] = useState<TempTask | null>(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifyRejectReason, setVerifyRejectReason] = useState('');

  // 派发模式状态
  const [dispatchMode, setDispatchMode] = useState<'manual' | 'ai_assisted'>('manual');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    generateNewTaskCode,
  } = useTempTaskForm({
    initialData: editingTask,
    users: users.map(u => ({ id: u.id, name: u.name })),
    onSubmit: (taskData, status) => {
      if (editingTask) {
        // 更新逻辑（后续实现）
        // logger.info('更新临时任务:', editingTask.id, taskData);
      } else {
        // ========== 数据闭环：新建临时任务 ==========
        // 根据派发模式和状态决定最终状态
        let finalStatus: 'pending' | 'draft' | 'pending_ai' = 'draft';
        if (status === 'pending') {
          if (dispatchMode === 'ai_assisted') {
            finalStatus = 'pending_ai'; // 待AI推荐
          } else {
            finalStatus = 'pending'; // 直接派发
          }
        }
        // 计算总工时
        const totalEstimatedHours = ((taskData.estimatedDays || 0) * 8 + (taskData.estimatedHours || 0)) * (taskData.workerCount || 1);

        // 使用 addTempTask 创建临时任务（直接存入 useTempTaskStore，同步到"我的任务-临时任务处理"）
        const newTask = addTempTask({
          taskCode: taskData.taskCode,  // 传递用户生成的任务编号
          title: taskData.title || '',
          type: taskData.tempTaskType || 'other',
          typeName: TEMP_TASK_TYPES.find(t => t.value === taskData.tempTaskType)?.label || '其他',
          urgency: taskData.urgency || 'normal',
          priority: mapUrgencyToPriority(taskData.urgency),
          location: taskData.workLocation || '',
          greenhouseId: taskData.greenhouseId || '',
          greenhouseName: taskData.workLocation || '',
          assigneeId: taskData.assigneeId || '',
          assigneeName: taskData.assigneeName || '待分配',
          assignerId: 'admin',
          assignerName: '管理员',
          planStart: taskData.planStart || '',
          dueDate: taskData.dueDate || '',
          estimatedDays: taskData.estimatedDays || 0,
          estimatedHours: taskData.estimatedHours || 0,
          workerCount: taskData.workerCount || 1,
          description: taskData.description || '',
          remarks: taskData.notes || '',
          status: finalStatus,
          requiredFeedback: taskData.requiredFeedback || [],
          sourceType: 'tempTask',
          dispatchMode: 'tempTask',
        });

        // 数据闭环：同步到农事操作记录
        addTempTaskRecord({
          operationType: taskData.tempTaskType || 'other',
          operationTypeName: `临时任务-${TEMP_TASK_TYPES.find(t => t.value === taskData.tempTaskType)?.label || '其他'}`,
          status: finalStatus,
          greenhouseId: taskData.greenhouseId || '',
          greenhouseName: taskData.workLocation || '',
          operatorId: taskData.assigneeId || '',
          operatorName: taskData.assigneeName || '待分配',
          operationDate: new Date().toISOString().split('T')[0],
          sourceId: newTask?.id || '',
          sourceCode: newTask?.taskCode || newTask?.id || '',
          progress: 0,
          remarks: finalStatus === 'pending' ? '临时任务已发布' : '临时任务已创建（草稿）',
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

  // 打开验收弹窗（替代直接审核通过）
  const handleAcceptComplete = (task: TempTask) => {
    setVerifyTask(task);
    setVerifyRemarks('');
    setVerifyRejectReason('');
    setShowVerifyModal(true);
  };

  // 验收通过确认
  const handleVerifyAccept = () => {
    if (!verifyTask) return;
    acceptCompletion(verifyTask.id, verifyRemarks);
    // 同步到农事操作记录
    addTempTaskRecord({
      operationType: 'accept_confirm',
      operationTypeName: '审核通过',
      status: 'completed',
      greenhouseId: '',
      greenhouseName: verifyTask.location || '',

      operatorId: verifyTask.assignerId,
      operatorName: verifyTask.assignerName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: verifyTask.id,
      sourceCode: verifyTask.taskCode,
      progress: 100,
      remarks: verifyRemarks || '临时任务审核通过',
    });
    setShowVerifyModal(false);
    setVerifyTask(null);
    closeDetailModal();
    window.location.reload();
  };

  // 验收驳回确认
  const handleVerifyReject = () => {
    if (!verifyTask || !verifyRejectReason.trim()) return;
    rejectCompletion(verifyTask.id, verifyRejectReason);
    // 同步到农事操作记录
    addTempTaskRecord({
      operationType: 'reject',
      operationTypeName: '审核驳回',
      status: 'rejected',
      greenhouseId: '',
      greenhouseName: verifyTask.location || '',

      operatorId: verifyTask.assignerId,
      operatorName: verifyTask.assignerName,
      operationDate: new Date().toISOString().split('T')[0],
      sourceId: verifyTask.id,
      sourceCode: verifyTask.taskCode,
      progress: verifyTask.progress || 0,
      remarks: verifyRejectReason || '任务被驳回',
    });
    setShowVerifyModal(false);
    setVerifyTask(null);
    closeDetailModal();
    window.location.reload();
  };

  // 重新派发（驳回2次后）
  const handleReassign = (task: TempTask) => {
    // 重置任务状态为待接受，同时可以清空rejectCount
    // 注意：后端 PUT 处理通过 reassign=true 标记来记录 reassign 操作
    updateTempTask(task.id, {
      status: 'pending',
      rejectCount: 0,
      reassign: true, // 标记为重新分派，让后端记录 reassign 操作
    });
    // 记录操作
    addTempTaskRecord({
      operationType: 'reassign',
      operationTypeName: '重新派发',
      status: 'pending',
      greenhouseId: '',
      greenhouseName: task.location || '',

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

  // 撤回任务（待接受状态）
  const handleWithdraw = (task: TempTask) => {
    setWithdrawCancelTask(task);
    setShowWithdrawModal(true);
  };

  // 取消任务（进行中状态）
  const handleCancel = (task: TempTask) => {
    setWithdrawCancelTask(task);
    setShowCancelModal(true);
  };

  // 撤回确认
  const handleWithdrawConfirm = (reason: string) => {
    if (withdrawCancelTask) {
      updateTempTask(withdrawCancelTask.id, {
        status: 'cancelled',
      });
      addTempTaskRecord({
        operationType: 'withdraw',
        operationTypeName: '撤回任务',
        status: 'cancelled',
        greenhouseId: '',
        greenhouseName: withdrawCancelTask.location || '',
        
        operatorId: withdrawCancelTask.assignerId,
        operatorName: withdrawCancelTask.assignerName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: withdrawCancelTask.id,
        sourceCode: withdrawCancelTask.taskCode,
        progress: 0,
        remarks: reason || '任务被撤回',
      });
      setShowWithdrawModal(false);
      setWithdrawCancelTask(null);
      window.location.reload();
    }
  };

  // 取消确认
  const handleCancelConfirm = (reason: string) => {
    if (withdrawCancelTask) {
      updateTempTask(withdrawCancelTask.id, {
        status: 'cancelled',
      });
      addTempTaskRecord({
        operationType: 'cancel',
        operationTypeName: '取消任务',
        status: 'cancelled',
        greenhouseId: '',
        greenhouseName: withdrawCancelTask.location || '',
        
        operatorId: withdrawCancelTask.assignerId,
        operatorName: withdrawCancelTask.assignerName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: withdrawCancelTask.id,
        sourceCode: withdrawCancelTask.taskCode,
        progress: 0,
        remarks: reason || '任务被取消',
      });
      setShowCancelModal(false);
      setWithdrawCancelTask(null);
      window.location.reload();
    }
  };

  // 打开重新派发弹窗
  const handleOpenReassign = (task: TempTask) => {
    setReassignTask(task);
    setShowReassignModal(true);
  };

  // 重新派发确认
  const handleReassignConfirm = (newAssigneeId: string, newAssigneeName: string) => {
    if (reassignTask) {
      updateTempTask(reassignTask.id, {
        status: 'pending',
        assigneeId: newAssigneeId,
        assigneeName: newAssigneeName,
        rejectCount: 0,
      });
      addTempTaskRecord({
        operationType: 'reassign',
        operationTypeName: '重新派发',
        status: 'pending',
        greenhouseId: '',
        greenhouseName: reassignTask.location || '',
        
        operatorId: reassignTask.assignerId,
        operatorName: reassignTask.assignerName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: reassignTask.id,
        sourceCode: reassignTask.taskCode,
        progress: 0,
        remarks: `任务被重新派发给${newAssigneeName}，原执行人：${reassignTask.assigneeName || '(已清空)'}`,
      });
      setShowReassignModal(false);
      setReassignTask(null);
      window.location.reload();
    }
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
    // ========== 数据闭环：批量编辑临时任务 ==========
    Object.entries(editedTasks).forEach(([taskCode, updates]) => {
      const task = tempTasks.find(t => t.taskCode === taskCode);
      if (task) {
        updateTempTask(task.id, updates);
      }
    });
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
      deleteTempTask(id);
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
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = tempTasks.filter(t => selectedRows.includes(t.id));
    const headers = ['任务编号', '任务名称', '类型', '工作地点', '发布人', '截止日期', '紧急程度', '状态', '描述'];
    const exportData = selectedData.map(row => ({
      '任务编号': row.taskCode,
      '任务名称': row.title,
      '类型': row.tempTaskType,
      '工作地点': row.workLocation,
      '发布人': row.assigneeName,
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
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-500">总任务</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-500">待执行</p>
          <p className="text-lg font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-500">进行中</p>
          <p className="text-lg font-bold text-blue-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-500">已完成</p>
          <p className="text-lg font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border-l-2 border-red-500">
          <p className="text-xs text-gray-500">非常紧急</p>
          <p className="text-lg font-bold text-red-600 mt-1">{stats.critical}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border-l-2 border-orange-500">
          <p className="text-xs text-gray-500">超时预警</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-lg font-bold text-orange-600">
              {stats.overdue + stats.warning}
            </p>
            {stats.overdue > 0 && (
              <span className="text-xs text-red-600">已超时{stats.overdue}</span>
            )}
            {stats.warning > 0 && (
              <span className="text-xs text-orange-600">即将到期{stats.warning}</span>
            )}
          </div>
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
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">临时任务派发列表</h3>
          </div>
          {exportMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowExportModal(true)}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelExport}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : batchEditMode ? (
            <div className="flex gap-2">
              <Button
                variant="blue"
                size="sm"
                onClick={handleBatchEdit}
                disabled={selectedRows.length === 0}
              >
                <Edit2 className="w-4 h-4" />
                批量编辑
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelBatch}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelBatch}>
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button variant="blue" size="sm" onClick={() => {
                  setBatchEditMode(true);
                  setSelectedRows([]);
                }}>
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}>
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
              <Button size="sm" onClick={handleExportClick}>
                <Download className="w-4 h-4" />
                导出
              </Button>
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
          onAccept={handleAcceptComplete}
          onWithdraw={handleWithdraw}
          onCancel={handleCancel}
          onReassign={handleOpenReassign}
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
      <Modal
        isOpen={isDetailModalOpen && !!selectedTask}
        onClose={closeDetailModal}
        title={`任务详情 - ${selectedTask?.taskCode || selectedTask?.id || ''}`}
        size="xl"
        showFooter={false}
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">任务名称</Label>
                  <p className="font-semibold text-gray-900">{selectedTask.title || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">任务区域</Label>
                  <p className="font-semibold text-gray-900">{selectedTask.location || selectedTask.workLocation || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">执行人</Label>
                  <p className="font-semibold text-gray-900">{selectedTask.assigneeName || '待分配'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">优先级</Label>
                  <p className={`font-semibold ${priorityMap[selectedTask.priority]?.color || ''}`}>
                    {priorityMap[selectedTask.priority]?.label || selectedTask.priority || '普通'}
                  </p>
                </div>
              </div>
            </div>

            {/* 任务类型 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型</h4>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded text-sm text-white ${getTypeColor(selectedTask.tempTaskType || 'other')}`}>
                  {getTypeLabel(selectedTask.tempTaskType || 'other')}
                </span>
              </div>
            </div>

            {/* 紧急程度 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">紧急程度</h4>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded text-sm font-medium ${
                  selectedTask.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                  selectedTask.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedTask.urgency === 'critical' ? '非常紧急' :
                   selectedTask.urgency === 'urgent' ? '紧急' : '普通'}
                </span>
              </div>
            </div>

            {/* 任务描述 */}
            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">任务描述</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">派发时间</Label>
                  <p className="font-semibold text-gray-900">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString('zh-CN') : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">截止日期</Label>
                  <p className="font-semibold text-gray-900">{selectedTask.dueDate || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">状态</Label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status]?.bg || 'bg-gray-100'} ${statusMap[selectedTask.status]?.color || 'text-gray-600'}`}>
                      {statusMap[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">预估时长</Label>
                  <p className="font-semibold text-gray-900">
                    {selectedTask.estimatedHours ? `${selectedTask.estimatedHours}小时` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* 进度 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  />
                </div>
                <span className="w-14 text-sm font-medium text-gray-700 text-center">
                  {selectedTask.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedTask.progress === 100 ? '已完成' : selectedTask.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>

            {/* 备注 */}
            {(selectedTask.notes || selectedTask.remarks) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">备注</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedTask.notes || selectedTask.remarks}
                  </p>
                </div>
              </div>
            )}

            {/* 驳回原因 */}
            {selectedTask.rejectReason && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">驳回原因</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{selectedTask.rejectReason}</p>
                </div>
              </div>
            )}

            {/* 完成备注 */}
            {selectedTask.completionRemarks && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">完成备注</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">{selectedTask.completionRemarks}</p>
                </div>
              </div>
            )}

            {/* 验收备注 */}
            {selectedTask.acceptanceRemarks && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">验收备注</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">{selectedTask.acceptanceRemarks}</p>
                </div>
              </div>
            )}
            {/* ?????? ? ???? TaskFlowTimeline ?? */}
            {(() => {
              const opRecords = selectedTask ? getRecordsByTaskId(selectedTask.id) : [];
              if (opRecords.length === 0) return null;

              const flowRecords = opRecords.map((r: Record<string, unknown>, idx: number) => {
                const opType = (r.operationTypeName as string) || (r.operationType as string) || "";
                // 根据操作类型映射 action
                let action = "comment";
                if (opType) {
                  const typeMap: Record<string, string> = {
                    '派发': 'dispatch', '分配': 'dispatch',
                    '接受': 'accept', '接单': 'accept',
                    '驳回': 'reject', '拒绝': 'reject',
                    '开始': 'start', '启动': 'start',
                    '提交': 'submit', '上报': 'submit',
                    '通过': 'approve', '审核': 'approve',
                    '完成': 'complete', '完成': 'complete',
                  };
                  for (const [key, val] of Object.entries(typeMap)) {
                    if (opType.includes(key)) { action = val; break; }
                  }
                }
                return {
                  id: (r.id as string) || ("tt_opr_" + idx + "_" + Date.now()),
                  action,
                  actionTime: (r.operationDate as string) || (r.createdAt as string) || "",
                  operatorName: (r.operatorName as string) || (r.operator as string) || "系统",
                  toStatus: r.status as string | undefined,
                  comment: (r.remarks as string) || (r.rejectReason as string) || "",
                };
              });
              
              flowRecords.sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
                new Date(a.actionTime as string).getTime() - new Date(b.actionTime as string).getTime()
              );

              return (
                <div>
                  <TaskFlowTimeline records={flowRecords as any} />
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

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
        generateNewTaskCode={generateNewTaskCode}
        dispatchMode={dispatchMode}
        onDispatchModeChange={setDispatchMode}
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

      {/* 撤回任务弹窗 */}
      <WithdrawCancelModal
        isOpen={showWithdrawModal}
        task={withdrawCancelTask}
        type="withdraw"
        onConfirm={handleWithdrawConfirm}
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawCancelTask(null);
        }}
      />

      {/* 取消任务弹窗 */}
      <WithdrawCancelModal
        isOpen={showCancelModal}
        task={withdrawCancelTask}
        type="cancel"
        onConfirm={handleCancelConfirm}
        onClose={() => {
          setShowCancelModal(false);
          setWithdrawCancelTask(null);
        }}
      />

      {/* 重新派发任务弹窗 */}
      <ReassignTaskModal
        isOpen={showReassignModal}
        task={reassignTask}
        users={users.map(u => ({ id: u.id, name: u.name, role: u.role }))}
        onConfirm={handleReassignConfirm}
        onClose={() => {
          setShowReassignModal(false);
          setReassignTask(null);
        }}
      />

      {/* 验收弹窗 */}
      {verifyTask && (
        <UnifiedModal
          isOpen={showVerifyModal}
          onClose={() => { setShowVerifyModal(false); setVerifyTask(null); }}
          title={`任务验收 - ${verifyTask.taskCode || ''}`}
          size="md"
          showFooter={true}
          footer={
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleVerifyReject}
                disabled={!verifyRejectReason.trim()}
              >
                <XCircle className="w-4 h-4" /> 驳回
              </Button>
              <Button size="sm" onClick={handleVerifyAccept}>
                <Check className="w-4 h-4" /> 验收通过
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* 任务基本信息 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-900">{verifyTask.title}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-500">
                <p>执行人：{verifyTask.assigneeName}</p>
                <p>工作地点：{verifyTask.location || verifyTask.workLocation || '-'}</p>
                <p>当前状态：<span className="text-orange-600 font-medium">待验收</span></p>
                <p>进度：{verifyTask.progress || 0}%</p>
              </div>
            </div>

            {/* 完成备注 */}
            {verifyTask.completionRemarks && (
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">执行人完成备注</Label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">{verifyTask.completionRemarks}</p>
                </div>
              </div>
            )}

            {/* 验收意见 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                验收意见 <span className="text-gray-400">(可选)</span>
              </Label>
              <textarea
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
                placeholder="审核通过的验收意见..."
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            {/* 驳回原因 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                驳回原因 <span className="text-red-500">*</span> <span className="text-gray-400">(驳回时必填)</span>
              </Label>
              <textarea
                value={verifyRejectReason}
                onChange={(e) => setVerifyRejectReason(e.target.value)}
                placeholder="请输入驳回原因..."
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
          </div>
        </UnifiedModal>
      )}
    </div>
  );
}

export default TempTaskPage;
