/**
 * 临时任务Tab组件
 * 包含临时任务派发的完整功能
 */

import { useState, useReducer, useEffect, useCallback } from 'react';
import { AlertTriangle, Camera, Check, Clock, Download, Edit2, FileText, MapPin, Mic, Plus, Send, Trash2, User, X } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { TEMP_TASK_TYPES } from '../../../../types';
import { type TempTask } from '../../../../hooks/useTempTasks';
import { useUserStore } from '../../../../stores';
import { TempTaskFilters } from '../../../labor/tempTask/TempTaskFilters';
import { TempTaskTable } from '../../../labor/tempTask/TempTaskTable';
import { TempTaskFormModal } from '../../../labor/tempTask/TempTaskFormModal';
import { useTempTaskFilters } from '../../../labor/tempTask/hooks/useTempTaskFilters';
import { useTempTaskForm } from '../../../labor/tempTask/hooks/useTempTaskForm';
import { SearchableSelect } from '../../../materialReturn/modals/SearchableSelect';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';

// 导入统一临时任务管理 Hook（数据闭环核心）
import { useTempTasks } from '../../../../hooks/useTempTasks';
import { useTempTaskStore } from '../../../../stores';

import { useOperationRecords } from '../../../../hooks/useOperationRecords';
import type { Task, TaskRecord } from '../../../../types/task';
import { TempTaskAcceptanceAdapter } from '../../../farm/hub/modals/TempTaskAcceptanceAdapter';
import { VerifyTempTaskModal } from './VerifyTempTaskModal';

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

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
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
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-400 focus:ring-emerald-500"
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
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button onClick={onConfirm}>
              <Download className="w-4 h-4" /> 导出
            </Button>
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
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              <Trash2 className="w-4 h-4" /> 确认删除
            </Button>
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
          <Button variant="ghost" size="icon" onClick={handleClose}>
            ×
          </Button>
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

              {/* 执行人 - 可编辑 */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">执行人</div>
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
            <Button variant="blue" onClick={handleConfirmNext}>
              <Check className="w-4 h-4" /> 确认（下一个）
            </Button>
            <Button onClick={handlePublish}>
              <Send className="w-4 h-4" /> 发布
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  const buttonClass = isWithdraw ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600';

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
          <div className="p-6 space-y-5">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`请输入${isWithdraw ? '撤回' : '取消'}原因...`}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => {
                  setReason('');
                  onClose();
                }}>
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason.trim()}
                className={buttonClass}
              >
                <Check className="w-4 h-4" /> 确认{title}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">重新派发任务</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
          <div className="p-6 space-y-5">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择新执行人
              </label>
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

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button variant="secondary" onClick={onClose}>
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedAssignee}
              >
                <Send className="w-4 h-4" /> 确认派发
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 临时任务Tab组件
 */
export const TempTaskTab: React.FC = () => {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  // 使用统一临时任务管理 Hook（数据闭环核心）
  const { tempTasks, addTempTask, submitCompletion, rejectCompletion, updateTempTask, deleteTempTask } = useTempTasks();
  const { addTempTaskRecord: addTempTaskRecordAny } = useOperationRecords() as any;
  const addTempTaskRecord = addTempTaskRecordAny as (data: any) => any;
  // 统一任务管理 Hook（用于临时任务同步）


  // Force refresh 机制（替代 window.location.reload()）
  const [refreshKey, forceRefresh] = useReducer((k: number) => k + 1, 0);

  // 触发刷新的函数（替代 window.location.reload()）
  const triggerRefresh = useCallback(() => {
    forceRefresh();
  }, []);

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
  const [detailRecords, setDetailRecords] = useState<any[]>([]);
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

  // 验收弹窗状态（与农事任务验收流程一致）
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTargetTask, setVerifyTargetTask] = useState<TempTask | null>(null);

  // 重新派发弹窗状态
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState<TempTask | null>(null);

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
  } = useTempTaskFilters({ tasks: tempTasks as any });

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
    initialData: editingTask as any,
    users: users.map(u => ({ id: u.id, name: u.name })),
    onSubmit: (taskData, status) => {
      if (editingTask) {
        // 更新逻辑（后续实现）
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
          urgency: (taskData.urgency || 'normal') as any,
          priority: mapUrgencyToPriority(taskData.urgency),
          location: taskData.workLocation || '',
          greenhouseId: taskData.greenhouseId || '',
          greenhouseName: taskData.workLocation || '',
          assigneeId: taskData.assigneeId || '',
          assigneeName: taskData.assigneeName || '待分配',
          assignerId: 'admin',
          assignerName: '管理员',
          dueDate: taskData.dueDate || '',
          estimatedDays: taskData.estimatedDays || 0,
          estimatedHours: taskData.estimatedHours || 0,
          workerCount: taskData.workerCount || 1,
          description: taskData.description || '',
          remarks: taskData.notes || '',
          status: finalStatus as any,
          requiredFeedback: taskData.requiredFeedback || [],
          sourceType: 'tempTask',
          dispatchMode: 'tempTask',
        } as any);

        // 数据闭环：同步到农事操作记录
        addTempTaskRecord({
          operationType: taskData.tempTaskType || 'other',
          operationTypeName: `临时任务-${TEMP_TASK_TYPES.find(t => t.value === taskData.tempTaskType)?.label || '其他'}`,
          status: finalStatus,
          greenhouseId: taskData.greenhouseId || '',
          greenhouseName: taskData.workLocation || '',
          operatorId: taskData.assigneeId || '',
          operatorName: taskData.assigneeName || '待分配',
          operationDate: todayLocal(),
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
    setDetailRecords([]);
    fetch(`/api/temp-tasks/${task.id}/records`)
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          // 格式化记录数据，与农事任务保持一致
          const formattedRecords = result.data.map((r: Record<string, unknown>) => {
            let feedback: TaskRecord['feedback'] = undefined;
            if (r.feedback && typeof r.feedback === 'string') {
              try {
                feedback = JSON.parse(r.feedback as string);
              } catch {
                feedback = undefined;
              }
            } else if (r.feedback && typeof r.feedback === 'object') {
              feedback = r.feedback as TaskRecord['feedback'];
            }
            return {
              id: String(r.id || ''),
              taskId: String(r.taskId || task.id),
              taskCode: String(r.taskCode || ''),
              taskTitle: String(r.taskTitle || ''),
              operatorId: String(r.operatorId || ''),
              operatorName: String(r.operatorName || ''),
              action: String(r.action || 'progress') as TaskRecord['action'],
              actionName: String(r.actionName || r.action || ''),
              fromStatus: r.fromStatus ? String(r.fromStatus) as TaskRecord['fromStatus'] : undefined,
              toStatus: String(r.toStatus || task.status || ''),
              progress: r.progress !== undefined ? Number(r.progress) : undefined,
              progressIncrement: r.progressIncrement !== undefined ? Number(r.progressIncrement) : undefined,
              comment: r.comment ? String(r.comment) : undefined,
              reason: r.reason ? String(r.reason) : undefined,
              feedback,
              actionTime: String(r.actionTime || r.createdAt || new Date().toISOString()),
              createdAt: String(r.createdAt || r.actionTime || new Date().toISOString()),
            };
          });
          setDetailRecords(formattedRecords);
        }
      })
      .catch(() => {});
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
      operationDate: todayLocal(),
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 0,
      remarks: '临时任务开始执行',
    });
    // 调用后端 API 持久化操作记录
    fetch(`/api/temp-tasks/${task.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator_id: task.assigneeId || '',
        operator_name: task.assigneeName || '',
      }),
    }).catch(() => {});
    closeDetailModal();
    // 刷新页面数据以显示更新
    triggerRefresh();
  };

  // 提交完成（需要审核）- 修复：先调用 submit-progress API 记录反馈，再更新本地状态
  const handleSubmitComplete = async (task: TempTask, hours: number, remarks: string) => {
    // 构造反馈数据
    const feedbackData = {
      workloadHours: hours,
      workloadDays: 0,
      workers: 1,
      text: remarks || '',
      gpsLocation: null,
      images: [],
      voiceNote: null,
      materialCode: null,
    };

    try {
      // 1. 先调用后端 API 记录 submit_progress（包含反馈数据）
      const response = await fetch(`/api/temp-tasks/${task.id}/submit-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: 100,
          operator_id: task.assigneeId || '',
          operator_name: task.assigneeName || '',
          comment: remarks || '处理完成，提交验收',
          feedback: feedbackData,
        }),
      });

      if (!response.ok) {
        throw new Error('提交失败');
      }

      // 2. 更新本地状态
      updateTempTask(task.id, {
        status: 'waiting_acceptance',
        actualHours: hours,
        completionRemarks: remarks,
      });

      // 3. 同步到本地操作记录
      addTempTaskRecord({
        operationType: 'submit',
        operationTypeName: '提交验收',
        status: 'waiting_acceptance',
        greenhouseId: task.greenhouseId || '',
        greenhouseName: task.location || task.greenhouseName || '',
        operatorId: task.assigneeId,
        operatorName: task.assigneeName,
        operationDate: todayLocal(),
        sourceId: task.id,
        sourceCode: task.taskCode,
        progress: 100,
        remarks: remarks || '任务已完成，提交验收',
      });
    } catch (error) {
      // 提交完成失败
    }

    closeDetailModal();
    triggerRefresh();
  };

  // 审核通过（打开验收确认弹窗，与农事任务验收流程一致）
  const handleAcceptComplete = (task: TempTask) => {
    setVerifyTargetTask(task);
    setShowVerifyModal(true);
  };

  // 验收确认：通过 - 修复：先调用 API，再更新本地状态
  const handleVerifyConfirm = async (remarks?: string) => {
    if (!verifyTargetTask) return;
    const now = new Date().toISOString();

    try {
      // 1. 先调用后端 API 记录验收通过
      const response = await fetch(`/api/temp-tasks/${verifyTargetTask.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: verifyTargetTask.assignerId || '',
          operator_name: verifyTargetTask.assignerName || '',
          acceptance_remarks: remarks || '验收通过',
        }),
      });

      if (!response.ok) {
        throw new Error('验收失败');
      }

      // 2. 更新本地状态
      updateTempTask(verifyTargetTask.id, {
        status: 'completed',
        completedAt: now,
        acceptanceRemarks: remarks,
      });

      // 3. 同步到本地操作记录
      addTempTaskRecord({
        operationType: 'complete',
        operationTypeName: '验收通过',
        status: 'completed',
        greenhouseId: '',
        greenhouseName: verifyTargetTask.location || '',
        operatorId: verifyTargetTask.assignerId,
        operatorName: verifyTargetTask.assignerName,
        operationDate: now.split('T')[0],
        sourceId: verifyTargetTask.id,
        sourceCode: verifyTargetTask.taskCode,
        progress: 100,
        remarks: remarks || '临时任务验收通过',
      });
    } catch (error) {
      // 验收确认失败
    }

    setShowVerifyModal(false);
    setVerifyTargetTask(null);
  };

  // 验收确认：驳回（同时更新本地状态和 Store，避免 useEffect 异步同步延迟）
  const handleVerifyReject = async (reason: string) => {
    if (!verifyTargetTask) return;
    const now = new Date().toISOString();
    const newRejectCount = (verifyTargetTask.rejectCount || 0) + 1;
    const newStatus = newRejectCount >= 2 ? 'pending_reassign' : 'in_progress';

    try {
      // 1. 先调用后端 API 记录驳回
      const response = await fetch(`/api/temp-tasks/${verifyTargetTask.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: verifyTargetTask.assignerId || '',
          operator_name: verifyTargetTask.assignerName || '',
          reject_reason: reason || '验收不通过',
        }),
      });

      if (!response.ok) {
        throw new Error('驳回失败');
      }

      // 2. 更新本地状态
      updateTempTask(verifyTargetTask.id, {
        status: newStatus,
        rejectCount: newRejectCount,
        rejectReason: reason,
        progress: 50,
      });

      // 3. 同步到本地操作记录
      addTempTaskRecord({
        operationType: 'reject',
        operationTypeName: '验收驳回',
        status: 'rejected',
        greenhouseId: '',
        greenhouseName: verifyTargetTask.location || '',
        operatorId: verifyTargetTask.assignerId,
        operatorName: verifyTargetTask.assignerName,
        operationDate: now.split('T')[0],
        sourceId: verifyTargetTask.id,
        sourceCode: verifyTargetTask.taskCode,
        progress: verifyTargetTask.progress || 0,
        remarks: reason || '任务被驳回',
      });
    } catch (error) {
      // 验收驳回失败
    }

    setShowVerifyModal(false);
    setVerifyTargetTask(null);
  };

  // 重新派发（驳回2次后）
  const handleReassign = (task: TempTask) => {
    // 重置任务状态为待接受，同时可以清空rejectCount
    // 注意：后端 PUT 处理通过 reassign=true 标记来记录 reassign 操作
    updateTempTask(task.id, {
      status: 'pending' as any,
      rejectCount: 0,
      reassign: true, // 标记为重新分派，让后端记录 reassign 操作
    } as any);
    // 记录操作
    addTempTaskRecord({
      operationType: 'reassign',
      operationTypeName: '重新派发',
      status: 'pending',
      greenhouseId: '',
      greenhouseName: task.location || '',

      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: todayLocal(),
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: 0,
      remarks: `任务被重新派发，原执行人：${task.assigneeName}`,
    });
    closeDetailModal();
    triggerRefresh();
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
      operationDate: todayLocal(),
      sourceId: task.id,
      sourceCode: task.taskCode,
      progress: task.progress || 0,
      remarks: reason || '任务被驳回',
    });
    closeDetailModal();
    triggerRefresh();
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
        status: 'cancelled' as any,
      });
      addTempTaskRecord({
        operationType: 'withdraw',
        operationTypeName: '撤回任务',
        status: 'cancelled',
        greenhouseId: '',
        greenhouseName: withdrawCancelTask.location || '',

        operatorId: withdrawCancelTask.assignerId,
        operatorName: withdrawCancelTask.assignerName,
        operationDate: todayLocal(),
        sourceId: withdrawCancelTask.id,
        sourceCode: withdrawCancelTask.taskCode,
        progress: 0,
        remarks: reason || '任务被撤回',
      });
      setShowWithdrawModal(false);
      setWithdrawCancelTask(null);
      triggerRefresh();
    }
  };

  // 取消确认
  const handleCancelConfirm = (reason: string) => {
    if (withdrawCancelTask) {
      updateTempTask(withdrawCancelTask.id, {
        status: 'cancelled' as any,
      });
      addTempTaskRecord({
        operationType: 'cancel',
        operationTypeName: '取消任务',
        status: 'cancelled',
        greenhouseId: '',
        greenhouseName: withdrawCancelTask.location || '',

        operatorId: withdrawCancelTask.assignerId,
        operatorName: withdrawCancelTask.assignerName,
        operationDate: todayLocal(),
        sourceId: withdrawCancelTask.id,
        sourceCode: withdrawCancelTask.taskCode,
        progress: 0,
        remarks: reason || '任务被取消',
      });
      setShowCancelModal(false);
      setWithdrawCancelTask(null);
      triggerRefresh();
    }
  };

  // 打开重新派发弹窗
  const handleOpenReassign = (task: TempTask) => {
    setReassignTask(task);
    setShowReassignModal(true);
  };

  // 重新派发确认
  const handleReassignConfirm = async (newAssigneeId: string, newAssigneeName: string) => {
    if (reassignTask) {
      // 1. 先调用 /accept 记录接单动作（状态变为 accepted）
      await fetch(`/api/temp-tasks/${reassignTask.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: newAssigneeId,
          operator_name: newAssigneeName,
        }),
      }).catch(() => { /* accept failed */ });

      // 2. 更新执行人信息（不改变状态，状态由 submit-progress 改变）
      updateTempTask(reassignTask.id, {
        assigneeId: newAssigneeId,
        assigneeName: newAssigneeName,
        status: 'in_progress', // 确保状态是进行中
        rejectCount: 0,
      });

      // 3. 延迟调用 /submit-progress 记录开始执行（progress=0，状态变为 in_progress）
      setTimeout(() => {
        fetch(`/api/temp-tasks/${reassignTask.id}/submit-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progress: 0,
            operator_id: newAssigneeId,
            operator_name: newAssigneeName,
            comment: '开始执行任务',
          }),
        }).catch(() => { /* submit-progress failed */ });
      }, 100);

      addTempTaskRecord({
        operationType: 'reassign',
        operationTypeName: '重新派发',
        status: 'in_progress',
        greenhouseId: '',
        greenhouseName: reassignTask.location || '',

        operatorId: reassignTask.assignerId,
        operatorName: reassignTask.assignerName,
        operationDate: todayLocal(),
        sourceId: reassignTask.id,
        sourceCode: reassignTask.taskCode,
        progress: 0,
        remarks: `任务被重新派发给${newAssigneeName}，原执行人：${reassignTask.assigneeName || '(已清空)'}`,
      });
      setShowReassignModal(false);
      setReassignTask(null);
      triggerRefresh();
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
        updateTempTask(task.id, updates as any);
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

    const fileName = `临时任务_${todayLocal()}.${extension}`;
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
      {/* 筛选组件 */}
      <TempTaskFilters
        searchTerm={filters.searchTerm}
        urgencyFilter={filters.urgencyFilter}
        statusFilter={filters.statusFilter}
        overdueFilter={filters.overdueFilter}
        onSearchChange={setSearchTerm}
        onUrgencyChange={setUrgencyFilter}
        onStatusChange={setStatusFilter}
        onOverdueChange={setOverdueFilter}
      />

      {/* 任务列表表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">临时任务表</h3>
            {stats && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">共</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">{stats.total}</span>
                <span className="text-gray-500">条</span>
                <span className="text-amber-600">| 待执行 {stats.pending}</span>
                <span className="text-blue-600">| 进行中 {stats.inProgress}</span>
                <span className="text-green-600">| 已完成 {stats.completed}</span>
              </div>
            )}
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
          tasks={filteredTasks as any}
          showCheckbox={exportMode || batchEditMode || batchDeleteMode}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onViewTask={openDetailModal as any}
          onEditTask={openEditModal as any}
          onAccept={handleAcceptComplete as any}
          onWithdraw={handleWithdraw as any}
          onCancel={handleCancel as any}
          onReassign={handleOpenReassign as any}
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
          <div className="space-y-4">
            {/* 基本信息 - 蓝色背景 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                基本信息
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-blue-600">任务名称</label>
                  <p className="font-semibold text-gray-900">{selectedTask.title || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-blue-600">任务区域</label>
                  <p className="font-semibold text-gray-900">{selectedTask.location || selectedTask.workLocation || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-blue-600">执行人</label>
                  <p className="font-semibold text-gray-900">{selectedTask.assigneeName || '待分配'}</p>
                </div>
                <div>
                  <label className="text-xs text-blue-600">优先级</label>
                  <p className={`font-semibold ${priorityMap[selectedTask.priority]?.color || ''}`}>
                    {priorityMap[selectedTask.priority]?.label || selectedTask.priority || '普通'}
                  </p>
                </div>
              </div>
            </div>

            {/* 任务类型 - 紫色背景 */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                任务类型
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded text-sm text-white ${getTypeColor(selectedTask.tempTaskType || 'other')}`}>
                  {getTypeLabel(selectedTask.tempTaskType || 'other')}
                </span>
              </div>
            </div>

            {/* 紧急程度 - 橙色背景 */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                紧急程度
              </h4>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded text-sm font-medium ${
                  (selectedTask.urgency as any) === 'critical' ? 'bg-red-100 text-red-700' :
                  selectedTask.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {(selectedTask.urgency as any) === 'critical' ? '非常紧急' :
                   selectedTask.urgency === 'urgent' ? '紧急' : '普通'}
                </span>
              </div>
            </div>

            {/* 任务描述 - 灰色背景 */}
            {selectedTask.description && (
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  任务描述
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}

            {/* 时间信息 - 天蓝色背景 */}
            <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
              <h4 className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                时间信息
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-sky-600">派发时间</label>
                  <p className="font-semibold text-gray-900">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString('zh-CN') : '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-sky-600">截止日期</label>
                  <p className="font-semibold text-gray-900">{selectedTask.dueDate || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-sky-600">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status]?.bg || 'bg-gray-100'} ${statusMap[selectedTask.status]?.color || 'text-gray-600'}`}>
                      {statusMap[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-sky-600">预估时长</label>
                  <p className="font-semibold text-gray-900">
                    {selectedTask.estimatedHours ? `${selectedTask.estimatedHours}小时` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* 执行进度 - 青色背景 */}
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
              <h4 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                执行进度
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  />
                </div>
                <span className="w-14 text-sm font-bold text-cyan-700 text-center">
                  {selectedTask.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-cyan-600 mt-1">
                {selectedTask.progress === 100 ? '已完成' : selectedTask.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>

            {/* 备注 - 粉色背景 */}
            {(selectedTask.notes || selectedTask.remarks) && (
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                <h4 className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  备注
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedTask.notes || selectedTask.remarks}
                </p>
              </div>
            )}

            {/* 驳回原因 - 红色背景 */}
            {selectedTask.rejectReason && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  驳回原因
                </h4>
                <p className="text-sm text-red-700">{selectedTask.rejectReason}</p>
              </div>
            )}

            {/* 完成备注 - 绿色背景 */}
            {selectedTask.completionRemarks && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  完成备注
                </h4>
                <p className="text-sm text-emerald-700">{selectedTask.completionRemarks}</p>
              </div>
            )}

            {/* 验收备注 - 蓝色背景 */}
            {selectedTask.acceptanceRemarks && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  验收备注
                </h4>
                <p className="text-sm text-blue-700">{selectedTask.acceptanceRemarks}</p>
              </div>
            )}

            {/* 处理流转记录 - 参照巡查记录详情弹窗设计 */}
            {(() => {
              // 计算实际完成工作量
              let totalDays = 0;
              let totalHours = 0;
              let totalWorkers = 0;
              detailRecords.forEach((record: any) => {
                if (record.feedback) {
                  const fb = typeof record.feedback === 'string' ? JSON.parse(record.feedback) : record.feedback;
                  if (fb) {
                    if (fb.workloadDays) totalDays += fb.workloadDays;
                    if (fb.workloadHours) totalHours += fb.workloadHours;
                    if (fb.workers && fb.workers > totalWorkers) totalWorkers = fb.workers;
                  }
                }
              });
              const hasWorkload = totalDays > 0 || totalHours > 0;

              // 操作类型中文映射
              const ACTION_LABELS: Record<string, string> = {
                publish: '派发任务',
                withdraw: '撤回任务',
                cancel: '取消任务',
                accept: '接单确认',
                start: '开始执行',
                progress: '进度更新',
                submit_progress: '提交进度',
                submit: '提交验收',
                reject: '验收驳回',
                complete: '验收通过',
                overtime_continue: '超时继续',
                overtime_abandon: '超时放弃',
                reassign: '重新派发',
                remind: '催办提醒',
                extend_deadline: '延期',
                continue: '继续执行',
                create: '创建任务',
              };

              // 获取状态标签颜色
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'completed':
                  case '已完成':
                    return 'bg-green-100 text-green-700';
                  case 'waiting_acceptance':
                  case '待验收':
                    return 'bg-amber-100 text-amber-700';
                  case 'in_progress':
                  case '处理中':
                    return 'bg-blue-100 text-blue-700';
                  case 'pending':
                  case '待处理':
                  case '待接受':
                    return 'bg-yellow-100 text-yellow-700';
                  case 'rejected':
                  case '返工中':
                    return 'bg-red-100 text-red-700';
                  default:
                    return 'bg-gray-100 text-gray-700';
                }
              };

              // 获取状态中文标签
              const getStatusLabel = (status: string) => {
                switch (status) {
                  case 'draft': return '草稿';
                  case 'pending': return '待接受';
                  case 'accepted': return '已接受';
                  case 'in_progress': return '处理中';
                  case 'waiting_acceptance': return '待验收';
                  case 'completed': return '已完成';
                  case 'rejected': return '返工中';
                  case 'failed': return '任务失败';
                  case 'cancelled': return '已取消';
                  case 'abandoned': return '已放弃';
                  default: return status;
                }
              };

              // 格式化时间
              const formatTime = (timeStr: string) => {
                const date = new Date(timeStr);
                return date.toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              };

              // 解析反馈数据
              const parseFeedback = (feedback: any) => {
                if (!feedback) return null;
                if (typeof feedback === 'string') {
                  try {
                    return JSON.parse(feedback);
                  } catch {
                    return null;
                  }
                }
                return feedback;
              };

              return (
                <>
                  {/* 实际完成工作量统计 */}
                  {hasWorkload && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        实际完成工作量
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{totalDays}</div>
                          <div className="text-xs text-emerald-600">总天数</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{totalHours}</div>
                          <div className="text-xs text-emerald-600">总工时</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{totalWorkers}</div>
                          <div className="text-xs text-emerald-600">总人数</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 流转记录区块 - 参照巡查记录详情弹窗 */}
                  {detailRecords.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <span>📋</span>
                          处理流转记录（{detailRecords.length}条）
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {detailRecords.map((record: any, index: number) => {
                          const feedback = parseFeedback(record.feedback);
                          return (
                            <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-4">
                                {/* 时间线节点 */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                                    record.action === 'complete' ? 'bg-green-500' :
                                    record.action === 'reject' ? 'bg-red-500' :
                                    record.action === 'submit' ? 'bg-amber-500' :
                                    record.action === 'publish' ? 'bg-blue-500' :
                                    record.action === 'accept' ? 'bg-green-500' :
                                    'bg-gray-500'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  {index < detailRecords.length - 1 && (
                                    <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-1"></div>
                                  )}
                                </div>

                                {/* 流转详情 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">{record.operatorName}</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        record.action === 'complete' ? 'bg-green-100 text-green-700' :
                                        record.action === 'reject' ? 'bg-red-100 text-red-700' :
                                        record.action === 'submit' ? 'bg-amber-100 text-amber-700' :
                                        record.action === 'publish' ? 'bg-blue-100 text-blue-700' :
                                        record.action === 'accept' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {ACTION_LABELS[record.action] || record.actionName || record.action}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                      {formatTime(record.actionTime)}
                                    </span>
                                  </div>

                                  {/* 状态变化 */}
                                  {(record.fromStatus || record.toStatus) && (
                                    <div className="flex items-center gap-1 mb-1">
                                      {record.fromStatus && (
                                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.fromStatus)}`}>
                                          {getStatusLabel(record.fromStatus)}
                                        </span>
                                      )}
                                      <span className="text-gray-400">→</span>
                                      {record.toStatus && (
                                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.toStatus)}`}>
                                          {getStatusLabel(record.toStatus)}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* 进度显示 */}
                                  {record.progress !== undefined && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ width: `${record.progress}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-gray-500">{record.progress}%</span>
                                    </div>
                                  )}

                                  {/* 备注/驳回原因 */}
                                  {(record.comment || record.reason) && (
                                    <div className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1 mb-1">
                                      {record.reason && (
                                        <div className="text-red-600 mb-1">
                                          <span className="font-medium">驳回原因：</span>
                                          {record.reason}
                                        </div>
                                      )}
                                      {record.comment && <div>{record.comment}</div>}
                                    </div>
                                  )}

                                  {/* 反馈数据展示 - 参照巡查记录详情弹窗 */}
                                  {feedback && (
                                    <div className="mt-2 space-y-2">
                                      {/* GPS位置 */}
                                      {feedback.gpsLocation && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
                                          <span>📍</span>
                                          <span>位置打卡：</span>
                                          <span className="font-mono">
                                            {feedback.gpsLocation.lat?.toFixed(6)}, {feedback.gpsLocation.lng?.toFixed(6)}
                                          </span>
                                        </div>
                                      )}

                                      {/* 作业前照片 - 兼容 images 字段 */}
                                      {feedback.images && feedback.images.length > 0 && (
                                        <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span>📷</span>
                                            <span>作业前照片：{feedback.images.length}张</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {feedback.images.map((img: string, idx: number) => (
                                              <img
                                                key={idx}
                                                src={img}
                                                alt={`作业前${idx + 1}`}
                                                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => window.open(img, '_blank')}
                                                title="点击查看原图"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* 作业后照片 - photosAfter 字段 */}
                                      {feedback.photosAfter && feedback.photosAfter.length > 0 && (
                                        <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span>📷</span>
                                            <span>作业后照片：{feedback.photosAfter.length}张</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {feedback.photosAfter.map((img: string, idx: number) => (
                                              <img
                                                key={idx}
                                                src={img}
                                                alt={`作业后${idx + 1}`}
                                                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => window.open(img, '_blank')}
                                                title="点击查看原图"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* 语音备注 */}
                                      {feedback.voiceNote && (
                                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                          <span>🎤</span>
                                          <span>语音备注（已录音）</span>
                                        </div>
                                      )}

                                      {/* 工作量 */}
                                      {(feedback.workloadDays !== undefined || feedback.workloadHours !== undefined || feedback.workers !== undefined) && (
                                        <div className="text-xs text-cyan-600 bg-cyan-50 rounded px-2 py-1">
                                          <span>⏱️</span>
                                          <span>工作量：</span>
                                          {feedback.workloadDays !== undefined && <span>{feedback.workloadDays}天</span>}
                                          {feedback.workloadDays !== undefined && feedback.workloadHours !== undefined && <span> + </span>}
                                          {feedback.workloadHours !== undefined && <span>{feedback.workloadHours}小时</span>}
                                          {feedback.workers !== undefined && <span>，{feedback.workers}人</span>}
                                        </div>
                                      )}

                                      {/* 物料使用 */}
                                      {feedback.materials && feedback.materials.length > 0 && (
                                        <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span>📦</span>
                                            <span>物料使用：</span>
                                          </div>
                                          {feedback.materials.map((m: any, idx: number) => (
                                            <div key={idx} className="ml-4">
                                              {m.name} × {m.qty} {m.unit}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* 物资编码/扫码 */}
                                      {feedback.materialCode && (
                                        <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                                          <span>🔗</span>
                                          <span>物资编码：{feedback.materialCode}</span>
                                        </div>
                                      )}

                                      {/* 文字反馈 */}
                                      {feedback.text && (
                                        <div className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                                          {feedback.text}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 无流转记录提示 */}
                  {detailRecords.length === 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                      暂无流转记录
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* 创建/编辑表单弹窗 */}
      <TempTaskFormModal
        isOpen={isFormModalOpen}
        title={editingTask ? '编辑临时任务' : '新建临时任务'}
        task={editingTask as any}
        formData={formData}
        errors={errors}
        workerUsers={users.map(u => ({ id: u.id, name: u.name }))}
        onClose={closeFormModal}
        onSubmitDraft={handleSubmitDraft}
        onSubmit={() => handleFormSubmit('pending')}
        onChange={updateFormData as any}
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

      {/* 验收确认弹窗（与农事任务验收流程一致） */}
      <TempTaskAcceptanceAdapter
        isOpen={showVerifyModal}
        task={verifyTargetTask as any}
        onConfirm={handleVerifyConfirm}
        onReject={handleVerifyReject}
        onClose={() => {
          setShowVerifyModal(false);
          setVerifyTargetTask(null);
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
    </div>
  );
};
