/**
 * 农事任务中心 - FarmTaskHub
 * 农事管理的统一入口页面
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useFarmHub, HubTab } from '../../hooks/useFarmHub';
import { useTasks, Task } from '../../hooks/useTasks';
import { useReminder } from '../../hooks/useReminder';
import { useTempTasks } from '../../hooks/useTempTasks';
import { FarmHubHeader } from '../../components/farm/hub/FarmHubHeader';
import { TaskTab } from '../../components/farm/hub/TaskTab';
import { ProblemTab } from '../../components/farm/hub/ProblemTab';
import { InspectionTab } from '../../components/farm/hub/InspectionTab';
import { TempTaskTab } from '../../components/dispatch/components/dispatch/TempTaskTab';
import { OperationRecordPanel } from '../../components/farm/hub/OperationRecordPanel';
import { TaskDetailModal } from '../../components/farm/hub/TaskDetailModal';
import { VerifyTaskModal } from '../../components/farm/hub/VerifyTaskModal';
import { TaskAcceptanceAdapter } from '../../components/farm/hub/modals/TaskAcceptanceAdapter';
import { ProblemDispatchModal } from '../../components/farm/hub/ProblemDispatchModal';
import { InspectionDetailModal } from '../../components/farm/hub/InspectionDetailModal';
import { SelectExecutorModal } from '../../components/farm/hub/modals/SelectExecutorModal';
import { CreateTaskModal } from '../../components/farm/hub/modals/CreateTaskModal';
import { TodayOperationRecords } from '../../components/farm/hub/TodayOperationRecords';
import { BatchImportModal, ImportRow } from '../../components/farm/hub/modals/BatchImportModal';
import { ClipboardList, Plus, ChevronRight, AlertCircle, Upload, Sparkles, MapPin, Package, Camera, Mic, Clock, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { TaskTypeConfigPanel } from '../../components/farm/hub/components/TaskTypeConfigPanel';
import { FARM_OPERATION_TYPES } from '../../types/farm/common';
import { useUserStore, useGreenhouseStore, useWorkerStore } from '../../stores';
import { showAlert } from '@/lib/dialogService';
import { enhancedApiClient } from '../../lib/apiClient';
import { useFarmTaskStore } from '../../stores/farmTaskStore';

// 导入弹窗适配器
import { WithdrawCancelAdapter } from '../../components/farm/hub/modals/WithdrawCancelAdapter';
import { ReassignTaskAdapter } from '../../components/farm/hub/modals/ReassignTaskAdapter';
import { OvertimeHandleAdapter } from '../../components/farm/hub/modals/OvertimeHandleAdapter';
import { DeleteWarningAdapter } from '../../components/farm/hub/modals/DeleteWarningAdapter';
import { ExportFormatAdapter } from '../../components/farm/hub/modals/ExportFormatAdapter';
import { BatchEditAdapter } from '../../components/farm/hub/modals/BatchEditAdapter';
import { AIRecommendationPanel } from '../../components/dispatch/AIRecommendationPanel';
import { useSmartRecommendation } from '../../hooks/farm';
import type { WorkerRecommendation } from '../../hooks/useComprehensiveDispatch';

// Tab配置
const TAB_CONFIG: { key: HubTab; label: string }[] = [
  { key: 'task', label: '农事任务' },
  { key: 'tempTask', label: '临时任务' },
  { key: 'inspection', label: '巡查记录' },
  { key: 'problem', label: '问题管理' },
];

/**
 * 农事任务中心主组件
 */
export function FarmTaskHub() {
  const tasksHook = useTasks();
  const hub = useFarmHub(tasksHook);
  const { sendReminder } = useReminder();
  const { tempTasks } = useTempTasks();
  const users = useUserStore((state) => state.users);
  // 温室数据（替换硬编码 taskDispatchFields）
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);
  // 员工列表（用于批量派发/重派选择执行人，从 TaskDispatchPage 合并）
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  const staffOptions = useMemo(() => Array.isArray(workers) ? workers.map(w => ({
    value: w.id || w.name,
    label: w.name,
  })) : [], [workers]);

  // 组件挂载时加载员工数据
  useEffect(() => {
    if (workers.length === 0) loadWorkers();
  }, [workers.length, loadWorkers]);

  const [showRecordPanel, setShowRecordPanel] = useState(false);

  // 任务区域字段列表（从温室 Store 动态计算）
  const taskDispatchFields = useMemo(() => {
    if (greenhouses.length === 0) loadGreenhouses();
    return greenhouses.map(g => ({
      id: Number(g.id) || 0,
      name: g.name,
      type: g.greenhouseType || '',
      crop: g.crop || '',
      area: g.area || 0,
    }));
  }, [greenhouses, loadGreenhouses]);

  // 批量导入弹窗状态
  const [showImportModal, setShowImportModal] = useState(false);

  // 批量导入处理函数
  const handleBatchImport = (importData: ImportRow[]) => {
    if (importData.length === 0) {
      showAlert('没有可导入的数据');
      return;
    }

    // 使用 tasksHook.createTask 创建任务
    importData.forEach(row => {
      const typeLabels = row.typeLabel || row.type;
      const finalAssigneeName = row.assignee || '';
      const finalAssigneeId = finalAssigneeName
        ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}`
        : '';

      const defaultDispatcher = users.find(u => u.id === 'U001');
      const assignerId = defaultDispatcher?.id || 'U001';
      const assignerName = defaultDispatcher?.name || '系统';

      const matchedField = taskDispatchFields.find(f => f.name === row.field);
      const greenhouseId = matchedField?.id?.toString() || '';

      const estimatedHours = ((row.estimatedDays || 0) * 8) + (row.estimatedHours || 0);

      tasksHook.createTask({
        title: typeLabels || '农事任务',
        type: row.type || 'other',
        typeName: typeLabels,
        batchId: '',
        batchCode: '',
        greenhouseId: greenhouseId,
        greenhouseName: row.field,
        cropName: row.crop,
        priority: (row.priority as 'urgent' | 'high' | 'normal') || 'normal',
        assigneeId: finalAssigneeId,
        assigneeName: finalAssigneeName,
        assignerId: assignerId,
        assignerName: assignerName,
        dueDate: row.planEnd?.split(' ')[0] || '',
        estimatedDays: row.estimatedDays || 0,
        estimatedHours: estimatedHours,
        description: '',
        remarks: '',
        sourceType: 'dispatch',
        materials: [],
        tools: [],
        toolsRemarks: '',
        requiredFeedback: ['workload_confirm'],
        typeConfig: {},
        status: 'pending',
      });
    });

    showAlert(`成功导入 ${importData.length} 条任务`);
    hub.refresh();
  };

  // 弹窗状态
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [dispatchProblemId, setDispatchProblemId] = useState<number | null>(null);
  const [detailInspectionId, setDetailInspectionId] = useState<string | null>(null);
  // 任务刷新计数器
  const [taskRefresh, setTaskRefresh] = useState(0);
  // SOP 弹窗状态
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopContent, setSelectedSopContent] = useState<string>('');

  // 选择执行人弹窗状态
  const [selectExecutorTask, setSelectExecutorTask] = useState<import('../../types/task').Task | null>(null);

  // 新建任务状态
  const [showCreateModal, setShowCreateModal] = useState(false);

  // AI推荐相关状态
  const [dispatchMode, setDispatchMode] = useState<'manual' | 'ai_assisted'>('manual');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [aiConfidenceScore, setAiConfidenceScore] = useState<number | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<WorkerRecommendation[]>([]);

  // AI推荐 Hook
  const smartRecommend = useSmartRecommendation();

  // 智能推荐弹窗状态
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [recommendModalMaximized, setRecommendModalMaximized] = useState(false);
  const [recommendModalPosition, setRecommendModalPosition] = useState({ x: 0, y: 0 });
  const [recommendModalSize, setRecommendModalSize] = useState({ width: 1200, height: 700 });
  const recommendModalRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      // 保存引用用于拖动
    }
  }, []);

  // 迁移弹窗状态
  const [withdrawTask, setWithdrawTask] = useState<import('../../types/task').Task | null>(null);
  const [cancelTask, setCancelTask] = useState<import('../../types/task').Task | null>(null);
  const [reassignTask, setReassignTask] = useState<import('../../types/task').Task | null>(null);
  const [overtimeTask, setOvertimeTask] = useState<import('../../types/task').Task | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [batchEditIds, setBatchEditIds] = useState<string[]>([]);

  // 批量操作增强状态（从 TaskDispatchPage 合并）
  const [showBatchDispatchModal, setShowBatchDispatchModal] = useState(false);
  const [batchDispatchTarget, setBatchDispatchTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [showBatchVerifyConfirm, setShowBatchVerifyConfirm] = useState(false);
  const [showBatchReassignModal, setShowBatchReassignModal] = useState(false);
  const [batchReassignTarget, setBatchReassignTarget] = useState<{ id: string; name: string }>({ id: '', name: '' });

  // 任务详情回调
  const handleTaskVerify = (taskId: string) => {
    setDetailTaskId(null);
    setVerifyTaskId(taskId);
  };

  // 问题分派回调
  const handleProblemDispatched = () => {
    setDispatchProblemId(null);
    hub.refresh();
  };

  // 巡查问题上报回调
  const handleInspectionReportProblem = (inspectionId: string) => {
    setDetailInspectionId(null);
    window.location.href = `/inspection?recordId=${inspectionId}&action=reportProblem`;
  };

  // 验收成功回调
  const handleVerified = () => {
    setVerifyTaskId(null);
    hub.refresh();
  };

  // 任务操作回调
  const handleTaskWithdraw = (task: import('../../types/task').Task) => {
    setWithdrawTask(task);
  };

  const handleTaskCancel = (task: import('../../types/task').Task) => {
    setCancelTask(task);
  };

  const handleTaskReassign = (task: import('../../types/task').Task) => {
    setReassignTask(task);
  };

  const handleTaskOvertime = (task: import('../../types/task').Task) => {
    setOvertimeTask(task);
  };

  const handleTaskContinue = (taskId: string) => {
    tasksHook.continueExecution(taskId);
    hub.refresh();
  };

  // 验收任务 - 打开验收弹窗
  const handleTaskAccept = (task: import('../../types/task').Task) => {
    setVerifyTaskId(task.id);
  };

  // 催办任务 (从 TaskDispatchPage 合并)
  const handleTaskRemind = (task: import('../../types/task').Task) => {
    sendReminder(task.id, task.taskCode, task.assigneeId, task.assigneeName || '', 'U001', '系统管理员');
  };

  // 选择执行人
  const handleSelectExecutor = (task: import('../../types/task').Task) => {
    setSelectExecutorTask(task);
  };

  // 发布草稿任务（draft → pending），并弹出选择执行人界面
  const handlePublish = (task: import('../../types/task').Task) => {
    if (task.status === 'draft') {
      tasksHook.publishTask(task.id);
      // 发布后立即弹出选择执行人界面，引导分派
      setSelectExecutorTask(task);
      hub.refresh();
    }
  };

  // 确认选择执行人
  const handleConfirmSelectExecutor = (assigneeId: string, assigneeName: string) => {
    if (selectExecutorTask) {
      // 调用 acceptAndAssign 函数：设置执行人并将状态变为 accepted
      tasksHook.acceptAndAssign(selectExecutorTask.id, assigneeId, assigneeName);
      setSelectExecutorTask(null);
      hub.refresh();
    }
  };

  // 批量操作回调 (从 TaskDispatchPage 合并完整逻辑)
  const handleBatchDispatch = (taskIds: string[]) => {
    setBatchDispatchTaskIds(taskIds);
    setShowBatchDispatchModal(true);
  };

  const confirmBatchDispatch = async (assigneeId: string, assigneeName: string) => {
    const now = new Date().toISOString();
    const taskIdSet = new Set(batchDispatchTaskIds);
    // P1-8：一次批量 API + 一次批量 setState 替代 N 次串行 PUT（性能优化）
    try {
      await enhancedApiClient.put('/farm-tasks/batch', {
        ids: batchDispatchTaskIds,
        updates: { assigneeId, assigneeName, status: 'pending' },
      });
    } catch { /* API 失败乐观更新仍生效 */ }
    // 直接 setState 更新 store（不触发 N 次独立 API）
    useFarmTaskStore.setState((prev: any) => ({
      tasks: prev.tasks.map((t: any) =>
        taskIdSet.has(t.id) ? { ...t, assigneeId, assigneeName, status: 'pending', updatedAt: now, version: (t.version || 1) + 1 } : t
      ),
    }));
    setShowBatchDispatchModal(false);
    setBatchDispatchTaskIds([]);
    hub.clearSelection();
    hub.refresh();
  };

  const handleBatchVerify = (taskIds: string[]) => {
    setBatchVerifyTaskIds(taskIds);
    setShowBatchVerifyConfirm(true);
  };

  const confirmBatchVerify = async () => {
    const now = new Date().toISOString();
    const taskIdSet = new Set(batchVerifyTaskIds);
    // P1-8：一次批量 API + 一次批量 setState 替代 N 次串行调用
    try {
      await enhancedApiClient.put('/farm-tasks/batch', {
        ids: batchVerifyTaskIds,
        updates: { status: 'completed', completedAt: now, progress: 100 },
      });
    } catch { /* API 失败乐观更新仍生效 */ }
    useFarmTaskStore.setState((prev: any) => ({
      tasks: prev.tasks.map((t: any) =>
        taskIdSet.has(t.id) ? { ...t, status: 'completed', completedAt: now, progress: 100, updatedAt: now, version: (t.version || 1) + 1 } : t
      ),
    }));
    setShowBatchVerifyConfirm(false);
    setBatchVerifyTaskIds([]);
    hub.clearSelection();
    hub.refresh();
  };

  // 批量重派 (从 TaskDispatchPage 合并)
  const [batchDispatchTaskIds, setBatchDispatchTaskIds] = useState<string[]>([]);
  const [batchVerifyTaskIds, setBatchVerifyTaskIds] = useState<string[]>([]);
  const [batchReassignTaskIds, setBatchReassignTaskIds] = useState<string[]>([]);

  const handleBatchReassign = (taskIds: string[]) => {
    setBatchReassignTaskIds(taskIds);
    setShowBatchReassignModal(true);
  };

  const confirmBatchReassign = async (newAssigneeId: string, newAssigneeName: string) => {
    const now = new Date().toISOString();
    const taskIdSet = new Set(batchReassignTaskIds);
    // P1-8：一次批量 API + 一次批量 setState 替代 N 次串行调用
    try {
      await enhancedApiClient.put('/farm-tasks/batch', {
        ids: batchReassignTaskIds,
        updates: { assigneeId: newAssigneeId, assigneeName: newAssigneeName, status: 'pending' },
      });
    } catch { /* API 失败乐观更新仍生效 */ }
    useFarmTaskStore.setState((prev: any) => ({
      tasks: prev.tasks.map((t: any) =>
        taskIdSet.has(t.id) ? { ...t, assigneeId: newAssigneeId, assigneeName: newAssigneeName, reworkCount: 0, reworkHistory: [], deadlineExtensions: [], status: 'pending', updatedAt: now, version: (t.version || 1) + 1 } : t
      ),
    }));
    setShowBatchReassignModal(false);
    setBatchReassignTaskIds([]);
    hub.clearSelection();
    hub.refresh();
  };

  const handleBatchDelete = (taskIds: string[]) => {
    setBatchDeleteIds(taskIds);
  };

  const handleBatchEdit = (taskIds: string[]) => {
    setBatchEditIds(taskIds);
  };

  const handleExport = (taskIds: string[]) => {
    setExportIds(taskIds);
  };

  return (
    <div className="space-y-6">
      {/* 顶部统计看板 */}
        <FarmHubHeader
          stats={hub.state.stats}
        />

        {/* Tab切换 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          {/* Tab 头部 */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px gap-1">
              {TAB_CONFIG.map((tab) => {
                const isActive = hub.state.activeTab === tab.key;
                // 不同Tab不同颜色主题
                const getTabStyle = () => {
                  if (tab.key === 'task') {
                    return isActive
                      ? 'bg-blue-500 text-white font-bold'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
                  } else if (tab.key === 'inspection') {
                    return isActive
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
                  } else if (tab.key === 'problem') {
                    return isActive
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
                  } else if (tab.key === 'tempTask') {
                    return isActive
                      ? 'bg-purple-500 text-white font-bold'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
                  }
                  return 'bg-gray-100 text-gray-500';
                };
                return (
                  <button
                    key={tab.key}
                    onClick={() => hub.setActiveTab(tab.key)}
                    className={`px-6 py-3 text-base rounded-t-lg transition-all ${getTabStyle()}`}
                  >
                    {tab.label}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                      isActive ? 'bg-white/30' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.key === 'task' ? hub.tasks.length : tab.key === 'problem' ? hub.problems.length : tab.key === 'inspection' ? hub.inspections.length : tempTasks.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab内容 */}
          <div className="p-4">
            {hub.state.activeTab === 'task' && (
              <TaskTab
                key={taskRefresh}
                tasks={hub.getFilteredTasks()}
                stats={{
                  total: hub.tasks.length,
                  pending: hub.state.stats?.pendingTasks ?? 0,
                  inProgress: hub.state.stats?.inProgressTasks ?? 0,
                  completed: hub.tasks.filter(t => t.status === 'completed').length,
                }}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters as any}
                onFilterChange={hub.setFilter as any}
                onResetFilters={hub.resetFilters}
                onViewTask={(taskId) => setDetailTaskId(taskId)}
                onViewTaskInCalendar={(task) => setDetailTaskId(task.id)}
                onCreateTask={() => setShowCreateModal(true)}
                onWithdraw={handleTaskWithdraw}
                onCancel={handleTaskCancel}
                onReassign={handleTaskReassign}
                onOvertime={handleTaskOvertime}
                onContinue={handleTaskContinue}
                onAccept={handleTaskAccept}
                onRemind={handleTaskRemind}
                onSelectExecutor={handleSelectExecutor}
                onPublish={handlePublish}
                onViewSop={(task) => {
                  setSelectedSopContent((task as any).sopContent || '');
                  setShowSopModal(true);
                }}
                onBatchDispatch={handleBatchDispatch}
                onBatchVerify={handleBatchVerify}
                onBatchDelete={handleBatchDelete}
                onBatchEdit={handleBatchEdit}
                onImport={() => setShowImportModal(true)}
                onExport={handleExport}
                onBatchReassign={handleBatchReassign}
              />
            )}
            {hub.state.activeTab === 'inspection' && (
              <InspectionTab
                inspections={hub.inspections}
                stats={{
                  total: hub.inspections.length,
                  normal: hub.inspections.filter(i => i.status === 'normal').length,
                  attention: hub.inspections.filter(i => i.status === 'attention').length,
                  abnormal: hub.inspections.filter((i: any) => i.status === 'critical' || i.status === 'abnormal').length,
                }}
                filters={hub.inspectionFilters}
                onFilterChange={hub.setInspectionFilter}
                onResetFilters={hub.resetInspectionFilters}
                currentPage={hub.inspectionPage ?? 1}
                pageSize={hub.inspectionPageSize ?? 10}
                onPageChange={hub.inspectionGoToPage}
                onPageSizeChange={hub.inspectionGoToPageSize}
                exportMode={hub.inspectionExportMode}
                batchEditMode={hub.inspectionBatchEditMode}
                batchDeleteMode={hub.inspectionBatchDeleteMode}
                onToggleExportMode={hub.toggleInspectionExportMode}
                onToggleBatchEditMode={hub.toggleInspectionBatchEditMode}
                onToggleBatchDeleteMode={hub.toggleInspectionBatchDeleteMode}
                selectedRows={hub.inspectionSelectedRows}
                onToggleSelectRow={hub.toggleInspectionSelectRow}
                onSelectAll={hub.selectAllInspectionRows}
                onClearSelection={hub.clearInspectionSelection}
                detailRecordId={hub.inspectionDetailId}
                onViewDetail={hub.openInspectionDetail}
                onCloseDetail={hub.closeInspectionDetail}
                isCreateModalOpen={hub.isCreateInspectionOpen}
                onOpenCreateModal={hub.openCreateInspection}
                onCloseCreateModal={hub.closeCreateInspection}
                problems={hub.problems}
                onReportProblem={() => {}}
                onAcceptProblem={(problemId) => {
                  // 问题验收功能由 InspectionTab 内部处理
                }}
                onBatchDelete={(ids) => {
                  // 调用 hub 的巡查批量删除
                  ids.forEach(id => {
                    hub.deleteInspection?.(id);
                  });
                  hub.refresh();
                }}
                onBatchEdit={(ids) => {
                  // 调用 hub 的巡查批量编辑（打开编辑弹窗）
                }}
              />
            )}
            {hub.state.activeTab === 'problem' && (
              <ProblemTab
                // 传递hooks获取实时数据
                onProblemDispatched={handleProblemDispatched}
                stats={{
                  total: hub.problems.length,
                  pending: hub.problems.filter(p => p.status === '待处理').length,
                  processing: hub.problems.filter(p => p.status === '处理中').length,
                  resolved: hub.problems.filter(p => p.status === '已处理').length,
                }}
              />
            )}
            {hub.state.activeTab === 'tempTask' && (
              <TempTaskTab />
            )}
          </div>
        </div>

        {/* v0.3 工具快捷栏：与现有功能 0 冲突，只增不删 */}
        <div className="flex items-center gap-2 px-2 py-2 mb-3 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-medium text-emerald-700 shrink-0">v0.3 工具：</span>
          <button onClick={() => window.location.href = '/agronomy/sop-library'} className="text-xs px-3 py-1 bg-white border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50">📖 SOP 标准库</button>
          <button onClick={() => window.location.href = '/agronomy/issue-board'} className="text-xs px-3 py-1 bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50">⚠️ 问题整改看板</button>
          <button onClick={() => window.location.href = '/agronomy/reminders'} className="text-xs px-3 py-1 bg-white border border-green-300 text-green-700 rounded hover:bg-green-50">🔔 智能提醒</button>
          <button onClick={() => window.location.href = '/agronomy/batch-cost'} className="text-xs px-3 py-1 bg-white border border-pink-300 text-pink-700 rounded hover:bg-pink-50">💰 批次成本</button>
          <button onClick={() => window.location.href = '/agronomy/compliance-report'} className="text-xs px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded hover:bg-purple-50">📋 合规报告</button>
          <button onClick={() => window.location.href = '/agronomy/backup-center'} className="text-xs px-3 py-1 bg-white border border-cyan-300 text-cyan-700 rounded hover:bg-cyan-50">💾 数据备份</button>
          <button onClick={() => window.location.href = '/agronomy/other-management'} className="text-xs px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 ml-auto">查看全部 →</button>
        </div>

        {/* 今日操作记录 */}
        <TodayOperationRecords
          records={hub.state.recentRecords as any}
          onShowAll={() => setShowRecordPanel(true)}
        />

      {/* 操作记录面板 */}
      {showRecordPanel && (
        <OperationRecordPanel
          records={hub.state.allRecords as any}
          onClose={() => setShowRecordPanel(false)}
        />
      )}

      {/* 任务详情弹窗 */}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onVerify={handleTaskVerify}
          tasks={tasksHook.tasks}
          getTaskRecordsByTaskId={tasksHook.getTaskRecordsByTaskId}
        />
      )}

      {/* 验收弹窗 - 数据全部从父组件注入，复用 useTasks 实例 */}
      {verifyTaskId && (
        <TaskAcceptanceAdapter
          taskId={verifyTaskId}
          onClose={() => setVerifyTaskId(null)}
          onVerified={handleVerified}
          tasks={tasksHook.tasks}
          getTaskRecordsByTaskId={tasksHook.getTaskRecordsByTaskId}
          onAcceptCompletion={tasksHook.acceptCompletion}
          onRejectForRework={tasksHook.rejectForRework}
        />
      )}

      {/* 问题分派弹窗 */}
      {dispatchProblemId && (
        <ProblemDispatchModal
          problemId={dispatchProblemId}
          onClose={() => setDispatchProblemId(null)}
          onDispatched={handleProblemDispatched}
        />
      )}

      {/* 巡查详情弹窗 */}
      {detailInspectionId && (
        <InspectionDetailModal
          recordId={detailInspectionId}
          onClose={() => setDetailInspectionId(null)}
          onReportProblem={handleInspectionReportProblem}
        />
      )}

      {/* SOP 内容弹窗 */}
      <Modal
        isOpen={showSopModal}
        onClose={() => setShowSopModal(false)}
        title="作业标准 (SOP)"
        size="lg"
      >
        <div className="space-y-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-[400px] overflow-y-auto">
            {selectedSopContent || '暂无作业标准内容'}
          </pre>
          <div className="flex justify-end">
            <button
              onClick={() => setShowSopModal(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
            >
              关闭
            </button>
          </div>
        </div>
      </Modal>

      {/* 选择执行人弹窗 */}
      <SelectExecutorModal
        isOpen={!!selectExecutorTask}
        task={selectExecutorTask}
        onConfirm={handleConfirmSelectExecutor}
        onClose={() => setSelectExecutorTask(null)}
      />

      {/* 新建任务模态框 */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); }}
        onCreated={() => {
          setTaskRefresh(t => t + 1);
          hub.refresh();
          hub.forceRefresh();
        }}
        tasksHook={tasksHook}
      />

      {/* 撤回任务弹窗 */}
      {withdrawTask && (
        <WithdrawCancelAdapter
          task={withdrawTask}
          onClose={() => setWithdrawTask(null)}
          onConfirmed={() => {
            setWithdrawTask(null);
            hub.refresh();
          }}
        />
      )}

      {/* 取消任务弹窗 */}
      {cancelTask && (
        <WithdrawCancelAdapter
          task={cancelTask}
          onClose={() => setCancelTask(null)}
          onConfirmed={() => {
            setCancelTask(null);
            hub.refresh();
          }}
        />
      )}

      {/* 重新派发弹窗 */}
      {reassignTask && (
        <ReassignTaskAdapter
          task={reassignTask}
          onClose={() => setReassignTask(null)}
          onConfirmed={() => {
            setReassignTask(null);
            hub.refresh();
          }}
        />
      )}

      {/* 超时处理弹窗 */}
      {overtimeTask && (
        <OvertimeHandleAdapter
          task={overtimeTask}
          onClose={() => setOvertimeTask(null)}
          onContinue={(taskId, reason, newDeadline) => {
            setOvertimeTask(null);
            hub.refresh();
          }}
          onAbandon={(taskId, reason) => {
            setOvertimeTask(null);
            hub.refresh();
          }}
        />
      )}

      {/* 批量删除确认弹窗 */}
      {batchDeleteIds.length > 0 && (
        <DeleteWarningAdapter
          taskIds={batchDeleteIds}
          tasksHook={tasksHook}
          onClose={() => setBatchDeleteIds([])}
          onConfirmed={() => {
            setBatchDeleteIds([]);
            hub.refresh();
          }}
        />
      )}

      {/* 导出格式选择弹窗 */}
      {exportIds.length > 0 && (
        <ExportFormatAdapter
          taskIds={exportIds}
          onClose={() => setExportIds([])}
        />
      )}

      {/* 批量编辑弹窗 */}
      {batchEditIds.length > 0 && (
        <BatchEditAdapter
          taskIds={batchEditIds}
          tasks={tasksHook.tasks}
          onClose={() => setBatchEditIds([])}
          onConfirmed={() => {
            setBatchEditIds([]);
            hub.refresh();
          }}
        />
      )}

      {/* 批量导入弹窗 */}
      <BatchImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBatchImport}
      />

      {/* ========== 批量操作弹窗（从 TaskDispatchPage 合并） ========== */}

      {/* 批量派发 — 选择执行人 */}
      {showBatchDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">批量派发任务</h3>
            <p className="text-sm text-gray-500 mb-4">
              将为选中的 <span className="font-medium text-gray-700">{batchDispatchTaskIds.length}</span> 个待派工任务统一指派执行人
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择执行人</label>
              <select
                value={batchDispatchTarget.id}
                onChange={(e) => {
                  const opt = staffOptions.find(s => s.value === e.target.value);
                  setBatchDispatchTarget({ id: e.target.value, name: opt?.label || '' });
                }}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="px-4 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
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
              即将对选中的 <span className="font-medium text-gray-700">{batchVerifyTaskIds.length}</span> 个任务全部标记为"验收通过"
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-700">此操作将批量通过验收，任务状态将变为"已完成"</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchVerifyConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
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
              将为选中的 <span className="font-medium text-gray-700">{batchReassignTaskIds.length}</span> 个失败/放弃任务统一更换执行人
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择新执行人</label>
              <select
                value={batchReassignTarget.id}
                onChange={(e) => {
                  const opt = staffOptions.find(s => s.value === e.target.value);
                  setBatchReassignTarget({ id: e.target.value, name: opt?.label || '' });
                }}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-4 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
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
    </div>
  );
}

export default FarmTaskHub;
