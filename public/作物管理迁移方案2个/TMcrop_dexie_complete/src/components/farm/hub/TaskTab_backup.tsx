/**
 * 农事任务中心 - 任务管理Tab
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState, useMemo, useEffect } from 'react';
import { TASK_STATUS_CONFIG, Task } from '../../../hooks/useTasks';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import { Eye, Edit, Plus, Send, CheckCircle, X, Users, CheckSquare } from 'lucide-react';
import { STORAGE_KEYS } from '../../../hooks/useLocalStorage';

// 模拟执行人数据（实际应从后端获取）
const MOCK_WORKERS = [
  { id: 'w1', name: '李建国', workerType: '长期工', workZone: 'A区' },
  { id: 'w2', name: '王建华', workerType: '长期工', workZone: 'B区' },
  { id: 'w3', name: '张文明', workerType: '临时工', workZone: 'C区' },
  { id: 'w4', name: '陈守信', workerType: '长期工', workZone: 'A区' },
  { id: 'w5', name: '刘伟强', workerType: '临时工', workZone: 'D区' },
];

// 状态配置
const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待接受' },
  { value: 'accepted', label: '已接受' },
  { value: 'in_progress', label: '进行中' },
  { value: 'waiting_acceptance', label: '待验收' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '返工中' },
];

// 可批量派发的状态：草稿、返工（重新派发）
const BATCH_DISPATCH_STATUSES = ['draft', 'rejected'];

// 可批量验收的状态：待验收
const BATCH_ACCEPT_STATUSES = ['waiting_acceptance'];

interface TaskTabProps {
  tasks: Task[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  filters: { status: string; type: string; area: string; search: string };
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
  onViewTask?: (taskId: string) => void;
  onCreateTask?: () => void;
}

/**
 * 获取状态样式
 */
function getStatusStyle(status: string): { bg: string; text: string } {
  const config = TASK_STATUS_CONFIG[status as keyof typeof TASK_STATUS_CONFIG];
  if (config) {
    return { bg: config.bg, text: config.color };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-600' };
}

/**
 * 判断任务是否可勾选
 */
function isTaskSelectable(task: Task, mode: 'dispatch' | 'accept' | 'none'): boolean {
  if (mode === 'none') return false;
  if (mode === 'dispatch') {
    return BATCH_DISPATCH_STATUSES.includes(task.status);
  }
  if (mode === 'accept') {
    return BATCH_ACCEPT_STATUSES.includes(task.status);
  }
  return false;
}

/**
 * 判断任务是否可选中（用于复选框）
 */
function canSelectTask(task: Task, selectionMode: 'dispatch' | 'accept' | 'none'): boolean {
  if (selectionMode === 'none') return false;
  if (selectionMode === 'dispatch') {
    return BATCH_DISPATCH_STATUSES.includes(task.status);
  }
  if (selectionMode === 'accept') {
    return BATCH_ACCEPT_STATUSES.includes(task.status);
  }
  return false;
}

/**
 * 任务管理Tab组件
 */
export function TaskTab({
  tasks,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  filters,
  onFilterChange,
  onResetFilters,
  onViewTask,
  onCreateTask,
}: TaskTabProps) {
  // 批量操作模式：'none' | 'dispatch' | 'accept'
  const [selectionMode, setSelectionMode] = useState<'none' | 'dispatch' | 'accept'>('none');

  // ========== 批量操作对话框状态 ==========
  const [showBatchDispatchModal, setShowBatchDispatchModal] = useState(false);
  const [showBatchAcceptModal, setShowBatchAcceptModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [acceptComments, setAcceptComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [verifyResult, setVerifyResult] = useState<'pass' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取已选中的任务详情
  const selectedTasks = useMemo(() => {
    return selectedIds
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean) as Task[];
  }, [selectedIds, tasks]);

  // 获取可执行批量派发的任务（草稿和返工）
  const dispatchableTasks = useMemo(() => {
    return selectedTasks.filter(t => BATCH_DISPATCH_STATUSES.includes(t.status));
  }, [selectedTasks]);

  // 获取可执行批量验收的任务（待验收）
  const acceptableTasks = useMemo(() => {
    return selectedTasks.filter(t => BATCH_ACCEPT_STATUSES.includes(t.status));
  }, [selectedTasks]);

  // 取消选择模式
  const handleCancelSelection = () => {
    setSelectionMode('none');
    onClearSelection();
  };

  // 点击批量派发按钮 - 自动选中所有符合条件的任务
  const handleBatchDispatch = () => {
    // 先选中所有可派发的任务（草稿和返工状态）
    const dispatchableTasks = tasks.filter(t => BATCH_DISPATCH_STATUSES.includes(t.status));
    // 清除之前的选择，只保留可派发的任务
    const newSelectedIds = dispatchableTasks.map(t => t.id);
    onClearSelection();
    newSelectedIds.forEach(id => onToggleSelect(id));
    setSelectionMode('dispatch');
  };

  // 点击批量验收按钮 - 自动选中所有符合条件的任务
  const handleBatchAccept = () => {
    // 先选中所有可验收的任务（待验收状态）
    const acceptableTasks = tasks.filter(t => BATCH_ACCEPT_STATUSES.includes(t.status));
    // 清除之前的选择，只保留可验收的任务
    const newSelectedIds = acceptableTasks.map(t => t.id);
    onClearSelection();
    newSelectedIds.forEach(id => onToggleSelect(id));
    setSelectionMode('accept');
  };

  // 全选逻辑（只选中可勾选的任务）
  const handleSelectAll = () => {
    const selectableTasks = tasks.filter(t => canSelectTask(t, selectionMode));
    selectableTasks.forEach(t => {
      if (!selectedIds.includes(t.id)) {
        onToggleSelect(t.id);
      }
    });
  };

  // 切换全选
  const handleToggleSelectAll = () => {
    const selectableTasks = tasks.filter(t => canSelectTask(t, selectionMode));
    const allSelected = selectableTasks.every(t => selectedIds.includes(t.id));
    if (allSelected) {
      // 取消所有可勾选的任务
      selectableTasks.forEach(t => {
        if (selectedIds.includes(t.id)) {
          onToggleSelect(t.id);
        }
      });
    } else {
      // 选中所有可勾选的任务
      selectableTasks.forEach(t => {
        if (!selectedIds.includes(t.id)) {
          onToggleSelect(t.id);
        }
      });
    }
  };

  // 计算可勾选的任务数量
  const selectableTasks = useMemo(() => {
    return tasks.filter(t => canSelectTask(t, selectionMode));
  }, [tasks, selectionMode]);

  // 选中的可操作任务数量
  const selectedSelectableCount = useMemo(() => {
    return selectedIds.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && canSelectTask(task, selectionMode);
    }).length;
  }, [selectedIds, tasks, selectionMode]);

  return (
    <div>
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态:</span>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status.value}
                onClick={() => onFilterChange('status', status.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filters.status === status.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">类型:</span>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部类型</option>
            {FARM_OPERATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onResetFilters}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
      </div>

      {/* 快捷操作栏 */}
      <div className="mb-4 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-emerald-700">快捷操作:</span>
          <button
            onClick={onCreateTask}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
          <button
            onClick={() => window.location.href = '/inspection?action=createFromProblem'}
            className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            从问题创建
          </button>
          <button
            onClick={() => window.location.href = '/inspection?action=createFromInspection'}
            className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            从巡查创建
          </button>
        </div>
        {/* 批量操作按钮 - 始终显示 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchDispatch}
            className={`flex items-center gap-2 px-3 py-1 text-sm rounded transition-colors ${
              selectionMode === 'dispatch'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Send className="w-4 h-4" />
            批量派发
          </button>
          <button
            onClick={handleBatchAccept}
            className={`flex items-center gap-2 px-3 py-1 text-sm rounded transition-colors ${
              selectionMode === 'accept'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            批量验收
          </button>
        </div>
      </div>

      {/* 批量操作提示栏 - 仅在批量操作模式下显示 */}
      {selectionMode !== 'none' && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg flex items-center justify-between border border-orange-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-orange-700 font-medium">
              {selectionMode === 'dispatch' ? '批量派发模式' : '批量验收模式'}
            </span>
            <span className="text-xs text-orange-600">
              {selectionMode === 'dispatch'
                ? '仅草稿和返工任务可勾选'
                : '仅待验收任务可勾选'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-orange-700">
              已选择 {selectedSelectableCount} 项（共 {selectableTasks.length} 项可操作）
            </span>
            {/* 确认按钮 */}
            {selectionMode === 'dispatch' && (
              <button
                onClick={() => {
                  if (selectedSelectableCount > 0) {
                    setShowBatchDispatchModal(true);
                  }
                }}
                disabled={selectedSelectableCount === 0}
                className="px-4 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认派发
              </button>
            )}
            {selectionMode === 'accept' && (
              <button
                onClick={() => {
                  if (selectedSelectableCount > 0) {
                    setShowBatchAcceptModal(true);
                  }
                }}
                disabled={selectedSelectableCount === 0}
                className="px-4 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认验收
              </button>
            )}
            <button
              onClick={handleCancelSelection}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>暂无任务</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                {/* 复选框列 - 仅在批量操作模式下显示 */}
                {selectionMode !== 'none' && (
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      disabled={selectionMode === 'none'}
                      checked={selectableTasks.length > 0 && selectedSelectableCount === selectableTasks.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 disabled:opacity-50"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">编号</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务标题</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">执行人</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">进度</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">截止日期</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {tasks.map((task) => {
                const statusStyle = getStatusStyle(task.status);
                const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG];
                const selectable = canSelectTask(task, selectionMode);
                const isSelected = selectedIds.includes(task.id);

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50 ${!selectable && selectionMode !== 'none' ? 'opacity-50' : ''}`}
                  >
                    {/* 复选框 - 仅在批量操作模式下显示 */}
                    {selectionMode !== 'none' && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          disabled={selectionMode === 'none' || !selectable}
                          checked={isSelected}
                          onChange={() => onToggleSelect(task.id)}
                          className="w-4 h-4 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{task.taskCode}</td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        {task.greenhouseName && (
                          <p className="text-xs text-gray-400">{task.greenhouseName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{task.typeName || task.type}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{task.assigneeName || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusConfig?.label || task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {onViewTask ? (
                          <button
                            onClick={() => onViewTask(task.id)}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            详情
                          </button>
                        ) : (
                          <button
                            onClick={() => window.location.href = `/taskDispatch?taskId=${task.id}`}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            查看
                          </button>
                        )}
                        <button
                          onClick={() => window.location.href = `/taskDispatch?taskId=${task.id}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">共 {tasks.length} 条记录</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              上一页
            </button>
            <span className="px-3 py-1 text-sm">第 1/1 页</span>
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              下一页
            </button>
          </div>
        </div>
      )}

      {/* ========== 批量派发对话框 ========== */}
      {showBatchDispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 flex-shrink-0 rounded-t-xl">
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">批量派发任务</h3>
                <span className="px-2 py-0.5 bg-blue-400 text-white text-xs rounded">
                  已选择 {dispatchableTasks.length} 个任务
                </span>
              </div>
              <button
                onClick={() => {
                  setShowBatchDispatchModal(false);
                  setSelectedWorkerId('');
                }}
                className="p-1.5 rounded-lg hover:bg-blue-400 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* 已选任务列表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  待派发任务列表
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dispatchableTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{task.taskCode}</span>
                        <span className="ml-2 text-sm text-gray-600">{task.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        task.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {task.status === 'draft' ? '草稿' : '返工'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 执行人选择 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  选择执行人
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {MOCK_WORKERS.map((worker) => (
                    <label
                      key={worker.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedWorkerId === worker.id
                          ? 'bg-blue-50 border-2 border-blue-300'
                          : 'bg-white border border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="worker"
                        value={worker.id}
                        checked={selectedWorkerId === worker.id}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{worker.name}</div>
                        <div className="text-xs text-gray-500">{worker.workerType} | {worker.workZone}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 提示信息 */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <p className="text-sm text-amber-700">
                  确认后，选中的 {dispatchableTasks.length} 个任务将派发给 <strong>{MOCK_WORKERS.find(w => w.id === selectedWorkerId)?.name || '未选择'}</strong>
                </p>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowBatchDispatchModal(false);
                  setSelectedWorkerId('');
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!selectedWorkerId) {
                    alert('请选择执行人');
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    // 模拟批量派发API调用
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 更新本地存储中的任务状态
                    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
                    if (storedTasks) {
                      const parsed = JSON.parse(storedTasks);
                      const tasksData = parsed.data || parsed;
                      const now = new Date().toISOString();
                      const selectedTaskIds = dispatchableTasks.map(t => t.id);

                      tasksData.forEach((task: Task) => {
                        if (selectedTaskIds.includes(task.id)) {
                          const worker = MOCK_WORKERS.find(w => w.id === selectedWorkerId);
                          task.status = 'pending';
                          task.assigneeId = selectedWorkerId;
                          task.assigneeName = worker?.name || '待分配';
                          task.dispatchedAt = now;
                        }
                      });

                      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(parsed.data ? { ...parsed, data: tasksData } : tasksData));
                    }

                    alert(`成功批量派发 ${dispatchableTasks.length} 个任务`);
                    setShowBatchDispatchModal(false);
                    setSelectedWorkerId('');
                    handleCancelSelection();
                    // 刷新页面以显示最新数据
                    window.location.reload();
                  } catch (error) {
                    console.error('批量派发失败:', error);
                    alert('批量派发失败，请重试');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={!selectedWorkerId || isSubmitting}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '派发中...' : '确认派发'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 批量验收对话框 ========== */}
      {showBatchAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 flex-shrink-0 rounded-t-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">批量验收任务</h3>
                <span className="px-2 py-0.5 bg-purple-400 text-white text-xs rounded">
                  已选择 {acceptableTasks.length} 个任务
                </span>
              </div>
              <button
                onClick={() => {
                  setShowBatchAcceptModal(false);
                  setVerifyResult(null);
                  setAcceptComments('');
                  setRejectReason('');
                }}
                className="p-1.5 rounded-lg hover:bg-purple-400 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* 已选任务列表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  待验收任务列表
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {acceptableTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{task.taskCode}</span>
                        <span className="ml-2 text-sm text-gray-600">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">执行人: {task.assigneeName || '-'}</span>
                        <span className="text-xs text-gray-500">进度: {task.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 验收结果选择 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">验收结果</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verifyResult"
                      value="pass"
                      checked={verifyResult === 'pass'}
                      onChange={() => setVerifyResult('pass')}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="text-sm text-gray-700">全部通过验收</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verifyResult"
                      value="reject"
                      checked={verifyResult === 'reject'}
                      onChange={() => setVerifyResult('reject')}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm text-gray-700">全部驳回（需返工）</span>
                  </label>
                </div>
              </div>

              {/* 验收意见 */}
              {verifyResult && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    验收意见 {verifyResult === 'reject' && <span className="text-red-500">*</span>}
                  </h4>
                  <textarea
                    value={verifyResult === 'pass' ? acceptComments : rejectReason}
                    onChange={(e) => {
                      if (verifyResult === 'pass') {
                        setAcceptComments(e.target.value);
                      } else {
                        setRejectReason(e.target.value);
                      }
                    }}
                    placeholder={verifyResult === 'pass' ? '选填：可添加验收备注' : '请输入驳回原因，说明需要返工的具体问题...'}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              )}

              {/* 提示信息 */}
              {verifyResult && (
                <div className={`rounded-lg p-3 border ${
                  verifyResult === 'pass'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${
                    verifyResult === 'pass' ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {verifyResult === 'pass'
                      ? `确认后，${acceptableTasks.length} 个任务状态将变更为"已完成"`
                      : `确认后，${acceptableTasks.length} 个任务将驳回给执行人，状态变更为"进行中"`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowBatchAcceptModal(false);
                  setVerifyResult(null);
                  setAcceptComments('');
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!verifyResult) {
                    alert('请选择验收结果');
                    return;
                  }
                  if (verifyResult === 'reject' && !rejectReason.trim()) {
                    alert('请输入驳回原因');
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    // 模拟批量验收API调用
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 更新本地存储中的任务状态
                    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
                    if (storedTasks) {
                      const parsed = JSON.parse(storedTasks);
                      const tasksData = parsed.data || parsed;
                      const now = new Date().toISOString();
                      const selectedTaskIds = acceptableTasks.map(t => t.id);
                      const feedback = verifyResult === 'pass' ? acceptComments : rejectReason;

                      tasksData.forEach((task: Task) => {
                        if (selectedTaskIds.includes(task.id)) {
                          if (verifyResult === 'pass') {
                            task.status = 'completed';
                            task.completedAt = now;
                          } else {
                            task.status = 'in_progress';
                            task.reworkCount = (task.reworkCount || 0) + 1;
                          }
                          task.verifyFeedback = feedback;
                        }
                      });

                      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(parsed.data ? { ...parsed, data: tasksData } : tasksData));
                    }

                    const message = verifyResult === 'pass'
                      ? `成功通过验收 ${acceptableTasks.length} 个任务`
                      : `已驳回 ${acceptableTasks.length} 个任务`;
                    alert(message);
                    setShowBatchAcceptModal(false);
                    setVerifyResult(null);
                    setAcceptComments('');
                    setRejectReason('');
                    handleCancelSelection();
                    // 刷新页面以显示最新数据
                    window.location.reload();
                  } catch (error) {
                    console.error('批量验收失败:', error);
                    alert('批量验收失败，请重试');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={!verifyResult || (verifyResult === 'reject' && !rejectReason.trim()) || isSubmitting}
                className={`px-6 py-2 text-sm text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  verifyResult === 'pass' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting ? '处理中...' : verifyResult === 'pass' ? '确认通过' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskTab;
