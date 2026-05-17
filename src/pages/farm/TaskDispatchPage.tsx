/**
 * 农事任务派发管理页面
 * 统一管理任务派发、撤回、取消、重新派发等操作
 * 支持批量派发/批量验收/批量重派
 * 复用 FarmTaskHub 已验证的弹窗适配器组件
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTasks, TASK_STATUS_CONFIG, detectOvertime } from '../../hooks/useTasks';
import type { Task } from '../../hooks/useTasks';
import { useReminder } from '../../hooks/useReminder';
import { useUserStore, useGreenhouseStore, useWorkerStore } from '../../stores';

// 复用 hub 级别的已验证组件
import { CreateTaskModal } from '../../components/farm/hub/modals/CreateTaskModal';
import { TaskAcceptanceAdapter } from '../../components/farm/hub/modals/TaskAcceptanceAdapter';
import { WithdrawCancelAdapter } from '../../components/farm/hub/modals/WithdrawCancelAdapter';
import { ReassignTaskAdapter } from '../../components/farm/hub/modals/ReassignTaskAdapter';
import { OvertimeHandleAdapter } from '../../components/farm/hub/modals/OvertimeHandleAdapter';
import { SelectExecutorModal } from '../../components/farm/hub/modals/SelectExecutorModal';
import { BatchImportModal, ImportRow } from '../../components/farm/hub/modals/BatchImportModal';
import { TaskTable } from '../../components/farm/hub/components/TaskTable';

import { PageHeader, StatsCards } from '../../components/farm/taskDispatch/components';

import { Plus, Upload, RefreshCw, CheckCheck, UserPlus, RotateCcw, X } from 'lucide-react';

// 状态筛选选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(TASK_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

export function TaskDispatchPage() {
  const tasksHook = useTasks();
  const { tasks: allTasks } = tasksHook;
  const { sendReminder } = useReminder();

  const users = useUserStore((s) => s.users);
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const workers = useWorkerStore((s) => s.workers);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // 筛选
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [withdrawTask, setWithdrawTask] = useState<Task | null>(null);
  const [cancelTask, setCancelTask] = useState<Task | null>(null);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [overtimeTask, setOvertimeTask] = useState<Task | null>(null);
  const [selectExecutorTask, setSelectExecutorTask] = useState<Task | null>(null);

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 批量派发弹窗
  const [showBatchDispatchModal, setShowBatchDispatchModal] = useState(false);
  const [batchDispatchTarget, setBatchDispatchTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });

  // 批量验收确认
  const [showBatchVerifyConfirm, setShowBatchVerifyConfirm] = useState(false);

  // 批量重派弹窗
  const [showBatchReassignModal, setShowBatchReassignModal] = useState(false);
  const [batchReassignTarget, setBatchReassignTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });

  // 过滤
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (areaFilter !== 'all' && task.greenhouseName !== areaFilter) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        return (
          (task.title || '').toLowerCase().includes(s) ||
          (task.taskCode || '').toLowerCase().includes(s) ||
          (task.assigneeName || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [allTasks, searchText, statusFilter, areaFilter, refreshKey]);

  // 统计
  const stats = useMemo(() => ({
    total: filteredTasks.length,
    inProgress: filteredTasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    waitingAcceptance: filteredTasks.filter(t => t.status === 'waiting_acceptance').length,
    warning: filteredTasks.filter(t => {
      const to = detectOvertime(t);
      return to?.severity === 'critical';
    }).length,
  }), [filteredTasks]);

  // 区域选项
  const areaOptions = useMemo(() => {
    const names = new Set(allTasks.map(t => t.greenhouseName).filter(Boolean));
    return Array.from(names);
  }, [allTasks]);

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredTasks.length / pageSize);

  // ========== 选择逻辑 ==========
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTasks.map(t => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // 选中任务列表
  const selectedTasks = useMemo(
    () => allTasks.filter(t => selectedIds.has(t.id)),
    [allTasks, selectedIds]
  );

  // 批量操作可用的状态判断
  const canBatchDispatch = useMemo(
    () => selectedTasks.length > 0 && selectedTasks.every(t => t.status === 'pending' || t.status === 'draft'),
    [selectedTasks]
  );
  const canBatchVerify = useMemo(
    () => selectedTasks.length > 0 && selectedTasks.every(t => t.status === 'waiting_acceptance'),
    [selectedTasks]
  );
  const canBatchReassign = useMemo(
    () => selectedTasks.length > 0 && selectedTasks.every(t => t.status === 'failed' || t.status === 'abandoned'),
    [selectedTasks]
  );

  // ========== 单任务操作回调 ==========
  const handleAccept = (task: Task) => setVerifyTaskId(task.id);
  const handleWithdraw = (task: Task) => setWithdrawTask(task);
  const handleCancel = (task: Task) => setCancelTask(task);
  const handleReassign = (task: Task) => setReassignTask(task);
  const handleOvertime = (task: Task) => setOvertimeTask(task);
  const handleContinue = (taskId: string) => {
    tasksHook.continueExecution(taskId);
    refresh();
  };
  const handlePublish = (task: Task) => {
    if (task.status === 'draft') {
      tasksHook.publishTask(task.id);
      setSelectExecutorTask(task);
      refresh();
    }
  };
  const handleRemind = (task: Task) => {
    sendReminder(task.id, task.taskCode, task.assigneeId, task.assigneeName || '', 'U001', '管理员');
  };

  // ========== 批量操作回调 ==========

  // 批量派发：选中的待派工任务统一指定执行人
  const handleBatchDispatch = useCallback(() => {
    if (!canBatchDispatch) return;
    setShowBatchDispatchModal(true);
  }, [canBatchDispatch]);

  const confirmBatchDispatch = useCallback((assigneeId: string, assigneeName: string) => {
    selectedTasks.forEach(task => {
      tasksHook.acceptAndAssign(task.id, assigneeId, assigneeName);
    });
    clearSelection();
    refresh();
    setShowBatchDispatchModal(false);
  }, [selectedTasks, tasksHook]);

  // 批量验收：选中的待验收任务统一验收通过
  const handleBatchVerify = useCallback(() => {
    if (!canBatchVerify) return;
    setShowBatchVerifyConfirm(true);
  }, [canBatchVerify]);

  const confirmBatchVerify = useCallback(() => {
    selectedTasks.forEach(task => {
      tasksHook.acceptCompletion(task.id, '批量验收通过');
    });
    clearSelection();
    refresh();
    setShowBatchVerifyConfirm(false);
  }, [selectedTasks, tasksHook]);

  // 批量重派：选中的失败/放弃任务统一更换执行人
  const handleBatchReassign = useCallback(() => {
    if (!canBatchReassign) return;
    setShowBatchReassignModal(true);
  }, [canBatchReassign]);

  const confirmBatchReassign = useCallback((newAssigneeId: string, newAssigneeName: string) => {
    selectedTasks.forEach(task => {
      tasksHook.reassignTask(task.id, newAssigneeId, newAssigneeName);
    });
    clearSelection();
    refresh();
    setShowBatchReassignModal(false);
  }, [selectedTasks, tasksHook]);

  const handleBatchImport = (importData: ImportRow[]) => {
    importData.forEach(row => {
      tasksHook.createTask({
        title: row.typeLabel || row.type || '农事任务',
        type: row.type || 'other',
        typeName: row.typeLabel || row.type || '其他',
        greenhouseName: row.field,
        cropName: row.crop,
        priority: (row.priority as 'urgent' | 'high' | 'normal') || 'normal',
        assigneeName: row.assignee || '',
        dueDate: row.planEnd?.split(' ')[0] || '',
        estimatedDays: row.estimatedDays || 0,
        estimatedHours: ((row.estimatedDays || 0) * 8) + (row.estimatedHours || 0),
        sourceType: 'dispatch',
        status: 'pending',
      });
    });
    setShowImportModal(false);
    refresh();
  };

  // 获取操作按钮配置
  const getTaskActions = (task: Task): { label: string; action: string; show: boolean }[] => {
    const actions: { label: string; action: string; show: boolean }[] = [];
    const st = task.status;

    if (st === 'draft') {
      actions.push({ label: '发布', action: 'publish', show: true });
    }
    if (st === 'pending') {
      actions.push({ label: '撤回', action: 'withdraw', show: true });
      actions.push({ label: '催办', action: 'remind', show: true });
    }
    if (st === 'accepted' || st === 'in_progress') {
      actions.push({ label: '取消', action: 'cancel', show: true });
      actions.push({ label: '催办', action: 'remind', show: true });
    }
    if (st === 'waiting_acceptance') {
      actions.push({ label: '验收', action: 'verify', show: true });
      actions.push({ label: '催办', action: 'remind', show: true });
    }
    if (st === 'rejected') {
      actions.push({ label: '继续', action: 'continue', show: true });
    }
    if (st === 'failed' || st === 'abandoned') {
      actions.push({ label: '重派', action: 'reassign', show: true });
    }
    if (detectOvertime(task)?.severity === 'critical') {
      actions.push({ label: '超时处理', action: 'overtime', show: true });
    }
    if (st === 'cancelled' || st === 'completed') {
      actions.push({ label: '查看', action: 'view', show: true });
    }

    return actions;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-blue-100 text-blue-700',
      waiting_acceptance: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      failed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-gray-100 text-gray-500',
      abandoned: 'bg-red-50 text-red-400',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const statusLabel = (status: string) => TASK_STATUS_CONFIG[status]?.label || status;

  // 员工列表（用于批量派发/重派选择执行人）
  const staffOptions = useMemo(() => workers.map(w => ({
    value: w.id || w.name,
    label: w.name,
  })), [workers]);

  return (
    <div className="p-4 space-y-4">
      <PageHeader subtitle="统一管理农事任务的派发、撤回、取消、重新派发等操作" />

      <StatsCards stats={stats} />

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">搜索</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                placeholder="搜索任务编号/标题/执行人"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">区域</label>
              <select
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部区域</option>
                {areaOptions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              <RefreshCw className="w-4 h-4" /> 刷新
            </button>
            <button onClick={() => setShowImportModal(true)} className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Upload className="w-4 h-4" /> 导入
            </button>
            <button onClick={() => setShowCreateModal(true)} className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> 新建任务
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-emerald-800">
              已选择 {selectedIds.size} 项
            </span>
            {canBatchDispatch && (
              <button
                onClick={handleBatchDispatch}
                className="px-3 py-1.5 flex items-center gap-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <UserPlus className="w-3.5 h-3.5" /> 批量派发
              </button>
            )}
            {canBatchVerify && (
              <button
                onClick={handleBatchVerify}
                className="px-3 py-1.5 flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
              >
                <CheckCheck className="w-3.5 h-3.5" /> 批量验收通过
              </button>
            )}
            {canBatchReassign && (
              <button
                onClick={handleBatchReassign}
                className="px-3 py-1.5 flex items-center gap-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 批量重派
              </button>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" /> 取消选择
          </button>
        </div>
      )}

      {/* 任务表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedTasks.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">任务编号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">任务标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">区域</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">执行人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">进度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">截止日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedTasks.map(task => {
                const actions = getTaskActions(task);
                const timeout = detectOvertime(task);
                const isSelected = selectedIds.has(task.id);
                return (
                  <tr key={task.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-emerald-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(task.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{task.taskCode || task.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={task.title}>
                      {timeout && (
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${timeout.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      )}
                      {task.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.typeName || task.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.greenhouseName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.assigneeName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${statusColor(task.status)}`}>
                        {statusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        <span>{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.dueDate || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {actions.map(a => (
                          <button
                            key={a.action}
                            onClick={() => {
                              switch (a.action) {
                                case 'view': handleAccept(task); break;
                                case 'verify': handleAccept(task); break;
                                case 'withdraw': handleWithdraw(task); break;
                                case 'cancel': handleCancel(task); break;
                                case 'reassign': handleReassign(task); break;
                                case 'overtime': handleOvertime(task); break;
                                case 'continue': handleContinue(task.id); break;
                                case 'publish': handlePublish(task); break;
                                case 'remind': handleRemind(task); break;
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded ${
                              a.action === 'remind' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' :
                              a.action === 'withdraw' || a.action === 'cancel' ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                              a.action === 'verify' || a.action === 'publish' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' :
                              'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedTasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    暂无任务数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              共 {filteredTasks.length} 条，第 {currentPage}/{totalPages} 页
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== 单任务弹窗 ========== */}

      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); refresh(); }}
          tasksHook={tasksHook}
        />
      )}

      {verifyTaskId && (
        <TaskAcceptanceAdapter
          taskId={verifyTaskId}
          onClose={() => setVerifyTaskId(null)}
          onVerified={() => { setVerifyTaskId(null); refresh(); }}
          tasks={tasksHook.tasks}
          getTaskRecordsByTaskId={tasksHook.getTaskRecordsByTaskId}
          onAcceptCompletion={tasksHook.acceptCompletion}
          onRejectForRework={tasksHook.rejectForRework}
        />
      )}

      {withdrawTask && (
        <WithdrawCancelAdapter
          isOpen={true}
          task={withdrawTask}
          type="withdraw"
          onConfirm={(reason) => { tasksHook.withdrawTask(withdrawTask.id, reason); setWithdrawTask(null); refresh(); }}
          onClose={() => setWithdrawTask(null)}
        />
      )}

      {cancelTask && (
        <WithdrawCancelAdapter
          isOpen={true}
          task={cancelTask}
          type="cancel"
          onConfirm={(reason) => { tasksHook.cancelTask(cancelTask.id, reason); setCancelTask(null); refresh(); }}
          onClose={() => setCancelTask(null)}
        />
      )}

      {reassignTask && (
        <ReassignTaskAdapter
          isOpen={true}
          task={reassignTask}
          onConfirm={(newAssigneeId, newAssigneeName) => {
            tasksHook.reassignTask(reassignTask.id, newAssigneeId, newAssigneeName);
            setReassignTask(null);
            refresh();
          }}
          onClose={() => setReassignTask(null)}
        />
      )}

      {overtimeTask && (
        <OvertimeHandleAdapter
          isOpen={true}
          task={overtimeTask}
          timeout={detectOvertime(overtimeTask) || null}
          onContinue={(reason, newDeadline) => {
            tasksHook.handleOvertime(overtimeTask.id, 'continue', { reason, newDeadline });
            setOvertimeTask(null);
            refresh();
          }}
          onAbandon={(reason) => {
            tasksHook.handleOvertime(overtimeTask.id, 'abandon', { reason });
            setOvertimeTask(null);
            refresh();
          }}
          onClose={() => setOvertimeTask(null)}
        />
      )}

      {selectExecutorTask && (
        <SelectExecutorModal
          task={selectExecutorTask}
          onConfirm={(assigneeId, assigneeName) => {
            tasksHook.acceptAndAssign(selectExecutorTask.id, assigneeId, assigneeName);
            setSelectExecutorTask(null);
            refresh();
          }}
          onClose={() => setSelectExecutorTask(null)}
        />
      )}

      {showImportModal && (
        <BatchImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleBatchImport}
        />
      )}

      {/* ========== 批量操作弹窗 ========== */}

      {/* 批量派发 — 选择执行人 */}
      {showBatchDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">批量派发任务</h3>
            <p className="text-sm text-gray-500 mb-4">
              将为选中的 <span className="font-medium text-gray-700">{selectedIds.size}</span> 个待派工任务统一指派执行人
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择执行人</label>
              <select
                value={batchDispatchTarget.id}
                onChange={(e) => {
                  const opt = staffOptions.find(s => s.value === e.target.value);
                  setBatchDispatchTarget({ id: e.target.value, name: opt?.label || '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- 请选择执行人 --</option>
                {staffOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDispatchModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => confirmBatchDispatch(batchDispatchTarget.id, batchDispatchTarget.name)}
                disabled={!batchDispatchTarget.id}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                确认派发
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量验收确认 */}
      {showBatchVerifyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">批量验收通过</h3>
            <p className="text-sm text-gray-500 mb-2">
              即将对选中的 <span className="font-medium text-gray-700">{selectedIds.size}</span> 个任务全部标记为"验收通过"
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-700">
                此操作将批量通过以下任务：</p>
              <ul className="mt-1 text-xs text-yellow-600 list-disc list-inside">
                {selectedTasks.slice(0, 5).map(t => (
                  <li key={t.id}>{t.taskCode || t.id} — {t.title}</li>
                ))}
                {selectedTasks.length > 5 && <li>...及其他 {selectedTasks.length - 5} 个任务</li>}
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchVerifyConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={confirmBatchVerify}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                确认批量验收
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量重派 — 选择新执行人 */}
      {showBatchReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">批量重新派发</h3>
            <p className="text-sm text-gray-500 mb-4">
              将为选中的 <span className="font-medium text-gray-700">{selectedIds.size}</span> 个失败/放弃任务统一更换执行人
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择新执行人</label>
              <select
                value={batchReassignTarget.id}
                onChange={(e) => {
                  const opt = staffOptions.find(s => s.value === e.target.value);
                  setBatchReassignTarget({ id: e.target.value, name: opt?.label || '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- 请选择新执行人 --</option>
                {staffOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchReassignModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => confirmBatchReassign(batchReassignTarget.id, batchReassignTarget.name)}
                disabled={!batchReassignTarget.id}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                确认重派
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示信息：当选中不支持批量操作的任务时 */}
      {selectedIds.size > 0 && !canBatchDispatch && !canBatchVerify && !canBatchReassign && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-sm z-40">
          <p className="text-sm text-gray-500">
            当前选中的任务状态不一致，仅支持对<span className="text-gray-700 font-medium">相同状态</span>的任务进行批量操作
          </p>
          <p className="text-xs text-gray-400 mt-1">
            （批量派发：待接受/草稿 | 批量验收：待验收 | 批量重派：任务失败/已放弃）
          </p>
        </div>
      )}
    </div>
  );
}

export default TaskDispatchPage;
