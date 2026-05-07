/**
 * 农事任务中心 - FarmTaskHub
 * 农事管理的统一入口页面
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useFarmHub, HubTab } from '../../hooks/useFarmHub';
import { useTasks, Task } from '../../hooks/useTasks';
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
import { ClipboardList, Plus, ChevronRight, AlertCircle, Upload, Sparkles, MapPin, Package, Camera, Mic, Clock, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { TaskTypeConfigPanel } from '../../components/farm/hub/components/TaskTypeConfigPanel';
import { taskDispatchFields, taskDispatchStaff } from '../../data/farmMockData';
import { FARM_OPERATION_TYPES } from '../../types/farm/common';
import { cropBatches } from '../../data/mockData';
import { useUsers } from '../../components/common/settings';
import { format, parse, addDays, addHours } from 'date-fns';

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

// 导入行类型
interface ImportRow {
  type: string;
  typeLabel: string;
  field: string;
  crop: string;
  assignee: string;
  planStart: string;
  planEnd: string;
  priority: string;
  estimatedDays?: number;
  estimatedHours?: number;
  [key: string]: string | number | undefined;
}

// Tab配置
const TAB_CONFIG: { key: HubTab; label: string }[] = [
  { key: 'task', label: '农事任务' },
  { key: 'tempTask', label: '临时任务' },
  { key: 'inspection', label: '巡查记录' },
  { key: 'problem', label: '问题管理' },
];

// 辅助函数
// 自动生成任务编号 NS+年月日+3位流水号（如 NS20260416001）
function autoGenerateTaskCode(tasks: Task[]): string {
  const today = new Date();
  // 年月日：20260416
  const datePrefix = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  // 从 tasks 查找当天的最大流水号
  let maxSequence = 0;
  tasks.forEach(t => {
    // 匹配格式：NS20260416-xxx
    const taskId = t.taskCode || t.id || '';
    if (taskId.startsWith('NS' + datePrefix + '-')) {
      const seqStr = taskId.slice(-3);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  // 生成新的流水号
  const newSequence = maxSequence + 1;
  return `NS${datePrefix}-${String(newSequence).padStart(3, '0')}`;
}

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'fertilization': '施肥',
    'irrigation': '灌溉',
    'pruning': '修剪',
    'pesticide': '植保',
    'rootIrrigation': '灌根',
    'planting': '定植',
    'harvest': '采收',
    'weeding': '除草',
    'other': '其他',
    // 兼容旧格式
    'fertilizing': '施肥',
    'pest_control': '病虫害防治',
    'harvesting': '采收',
    'soil_management': '土壤管理',
    'seedling': '育苗',
    'transplanting': '移栽',
  };
  return typeMap[type] || type;
}

function calculateEndDateTime(startTime: string, days: number, hours: number, workHoursPerDay: number): string {
  if (!startTime) return '';
  try {
    const start = parse(startTime, 'yyyy-MM-dd HH:mm', new Date());
    const totalHours = days * workHoursPerDay + hours;
    const end = addHours(start, totalHours);
    return format(end, 'yyyy-MM-dd HH:mm');
  } catch {
    return '';
  }
}

// CSV解析函数
const parseCSV = (file: File): Promise<ImportRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          reject(new Error('文件内容为空或格式不正确'));
          return;
        }

        // 解析表头
        const headers = lines[0].split(',').map(h => h.trim());

        // 解析数据行
        const data: ImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 7) {
            const typeValue = values[0].toLowerCase();
            const taskType = FARM_OPERATION_TYPES.find(t =>
              t.value === typeValue || t.label === values[0]
            );

            data.push({
              type: taskType?.value || typeValue || 'irrigation',
              typeLabel: taskType?.label || values[0] || '灌溉',
              field: values[1] || '',
              crop: values[2] || '',
              assignee: values[3] || '',
              planStart: values[4] || '',
              planEnd: values[5] || '',
              priority: values[6] || 'normal',
            });
          }
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// 处理文件选择
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setImportFile: (f: File | null) => void, setImportData: (d: ImportRow[]) => void, setImportPreview: (p: ImportRow[]) => void) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (fileExt !== 'csv' && fileExt !== 'xlsx') {
    alert('请上传 CSV 或 XLSX 格式的文件');
    return;
  }

  setImportFile(file);

  try {
    const data = await parseCSV(file);
    setImportData(data);
    setImportPreview(data.slice(0, 5));
  } catch (error) {
    alert('文件解析失败：请确保CSV格式正确，包含正确的表头和数据');
    setImportFile(null);
    setImportPreview([]);
    setImportData([]);
  }
};

// 处理文件拖拽
const handleFileDrop = async (e: React.DragEvent, setImportFile: (f: File | null) => void, setImportData: (d: ImportRow[]) => void, setImportPreview: (p: ImportRow[]) => void) => {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if (!file) return;

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (fileExt !== 'csv' && fileExt !== 'xlsx') {
    alert('请上传 CSV 或 XLSX 格式的文件');
    return;
  }

  setImportFile(file);

  try {
    const data = await parseCSV(file);
    setImportData(data);
    setImportPreview(data.slice(0, 5));
  } catch (error) {
    alert('文件解析失败：请确保CSV格式正确，包含正确的表头和数据');
    setImportFile(null);
    setImportPreview([]);
    setImportData([]);
  }
};

// 确认导入
const handleImportConfirm = (
  importData: ImportRow[],
  setShowImportModal: (b: boolean) => void,
  setImportFile: (f: File | null) => void,
  setImportPreview: (p: ImportRow[]) => void,
  setImportData: (d: ImportRow[]) => void,
  tasksHook: { createTask: (task: any) => void },
  users: any[],
  hub: { refresh: () => void }
) => {
  if (importData.length === 0) {
    alert('没有可导入的数据');
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

  alert(`成功导入 ${importData.length} 条任务`);

  // 关闭模态框并重置状态
  setShowImportModal(false);
  setImportFile(null);
  setImportPreview([]);
  setImportData([]);
  hub.refresh();
};

/**
 * 农事任务中心主组件
 */
export function FarmTaskHub() {
  const hub = useFarmHub();
  const tasksHook = useTasks();
  const { users } = useUsers();
  const [showRecordPanel, setShowRecordPanel] = useState(false);

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

  // 批量导入相关状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importData, setImportData] = useState<ImportRow[]>([]);

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

  // 催办任务
  const handleTaskRemind = (task: import('../../types/task').Task) => {
    // 催办功能后续实现
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

  // 批量操作回调
  const handleBatchDispatch = (taskIds: string[]) => {
    // 获取选中的任务
    const tasksToDispatch = hub.tasks.filter(t => taskIds.includes(t.id));
    if (tasksToDispatch.length === 0) return;

    // 打开派发弹窗（单选模式选择执行人，然后批量派发）
    // 这里简化处理：直接标记为已派发状态
    taskIds.forEach(taskId => {
      const task = hub.tasks.find(t => t.id === taskId);
      if (task && task.status === 'pending') {
        // 更新任务状态为已派发
        tasksHook.updateTaskStatus(taskId, 'accepted');
      }
    });
    hub.refresh();
  };

  const handleBatchVerify = (taskIds: string[]) => {
    // 批量验收：只处理waiting_acceptance状态的任务，将其标记为已完成
    taskIds.forEach(taskId => {
      const task = hub.tasks.find(t => t.id === taskId);
      if (task && task.status === 'waiting_acceptance') {
        tasksHook.updateTaskStatus(taskId, 'completed');
      }
    });
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
          onOpenSmartDispatch={() => window.location.href = '/smart-dispatch'}
          onOpenDailyPlan={() => window.location.href = '/daily-planning'}
          onOpenMonthlyPlan={() => window.location.href = '/monthly-planning'}
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
                      {tab.key === 'task' ? hub.tasks.length : tab.key === 'problem' ? hub.problems.length : tab.key === 'inspection' ? hub.inspections.length : '-'}
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
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
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
              />
            )}
            {hub.state.activeTab === 'inspection' && (
              <InspectionTab
                inspections={hub.inspections}
                filters={hub.inspectionFilters}
                onFilterChange={hub.setInspectionFilter}
                onResetFilters={hub.resetInspectionFilters}
                currentPage={hub.inspectionPage}
                pageSize={hub.inspectionPageSize}
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
              />
            )}
            {hub.state.activeTab === 'tempTask' && (
              <TempTaskTab />
            )}
          </div>
        </div>

        {/* 今日操作记录 */}
        <TodayOperationRecords
          records={hub.state.recentRecords}
          onShowAll={() => setShowRecordPanel(true)}
        />

      {/* 操作记录面板 */}
      {showRecordPanel && (
        <OperationRecordPanel
          records={hub.state.recentRecords}
          onClose={() => setShowRecordPanel(false)}
        />
      )}

      {/* 任务详情弹窗 */}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onVerify={handleTaskVerify}
        />
      )}

      {/* 验收弹窗 - 使用功能完整的 TaskAcceptanceModal */}
      {verifyTaskId && (
        <TaskAcceptanceAdapter
          taskId={verifyTaskId}
          onClose={() => setVerifyTaskId(null)}
          onVerified={handleVerified}
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
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold text-gray-900">批量导入任务</h3>
              </div>
              <button onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportData([]);
              }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 文件上传区域 */}
              <div
                onDrop={(e) => handleFileDrop(e, setImportFile, setImportData, setImportPreview)}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  importFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => handleFileChange(e, setImportFile, setImportData, setImportPreview)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {importFile ? (
                    <div>
                      <Upload className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">{importFile.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        点击或拖拽文件到此处重新上传
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">点击上传或拖拽文件到此处</p>
                      <p className="text-sm text-gray-500 mt-1">
                        支持 CSV、XLSX 格式文件
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* CSV格式说明 */}
              {!importFile && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">CSV文件格式要求</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    请确保CSV文件包含以下列（按顺序）：
                  </p>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                    任务类型,任务区域,作物,执行人,计划开始时间,计划结束时间,优先级
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    示例：irrigation,1号棚,番茄,张三,2024-03-20 08:00,2024-03-20 12:00,normal
                  </p>
                </div>
              )}

              {/* 预览表格 */}
              {importPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">数据预览（前5条）</h4>
                    <span className="text-sm text-gray-500">
                      共 {importData.length} 条数据
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">执行人</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">计划开始时间</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-100 transition-colors">
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.typeLabel || '未知类型'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.field}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.crop}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.assignee}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {row.planStart?.split(' ')[0] || '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {row.estimatedDays || 0}天{row.estimatedHours || 0}小时
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                row.priority === 'urgent'
                                  ? 'bg-red-100 text-red-700'
                                  : row.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {row.priority === 'urgent' ? '紧急' : row.priority === 'high' ? '高' : '普通'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportData([]);
                }}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => handleImportConfirm(importData, setShowImportModal, setImportFile, setImportPreview, setImportData, tasksHook, users, hub)}
                disabled={importData.length === 0}
                className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认导入 {importData.length > 0 && `(${importData.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmTaskHub;
