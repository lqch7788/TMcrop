/**
 * 农事任务中心 - FarmTaskHub
 * 农事管理的统一入口页面
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState, useCallback } from 'react';
import { useFarmHub, HubTab } from '../../hooks/useFarmHub';
import { useTasks, Task } from '../../hooks/useTasks';
import { FarmHubHeader } from '../../components/farm/hub/FarmHubHeader';
import { TaskTab } from '../../components/farm/hub/TaskTab';
import { ProblemTab } from '../../components/farm/hub/ProblemTab';
import { InspectionTab } from '../../components/farm/hub/InspectionTab';
import { OperationRecordPanel } from '../../components/farm/hub/OperationRecordPanel';
import { TaskDetailModal } from '../../components/farm/hub/TaskDetailModal';
import { VerifyTaskModal } from '../../components/farm/hub/VerifyTaskModal';
import { TaskAcceptanceAdapter } from '../../components/farm/hub/modals/TaskAcceptanceAdapter';
import { ProblemDispatchModal } from '../../components/farm/hub/ProblemDispatchModal';
import { InspectionDetailModal } from '../../components/farm/hub/InspectionDetailModal';
import { SelectExecutorModal } from '../../components/farm/hub/modals/SelectExecutorModal';
import { ClipboardList, Plus, ChevronRight, AlertCircle, Upload, Sparkles, MapPin, Package, Camera, Mic, Clock, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { TaskTypeConfigPanel } from '../../components/farm/hub/components/TaskTypeConfigPanel';
import { taskDispatchFields, taskDispatchStaff } from '../../data/farmMockData';
import { FARM_OPERATION_TYPES, PRIORITY_OPTIONS } from '../../types/farm/common';
import { TaskConfigValues } from '../../types/farm/taskTypeConfig';
import { users, cropBatches } from '../../data/mockData';
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
  { key: 'problem', label: '问题管理' },
  { key: 'inspection', label: '巡查记录' },
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

/**
 * 农事任务中心主组件
 */
export function FarmTaskHub() {
  const hub = useFarmHub();
  const tasksHook = useTasks();
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
  const [createStep, setCreateStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const [newTask, setNewTask] = useState<{
    taskId: string;
    types: string[];
    typeRemarks: string;
    fields: string[];
    crops: string[];
    cropRemarks: string;
    areaRemarks: string;
    assignee: string;
    planStart: string;
    planEnd: string;
    sopContent: string;
    materials: { name: string; qty: number; unit: string }[];
    tools: { name: string; qty: number; unit: string }[];
    requiredFeedback: string[];
    priority: string;
    estimatedDays: number;
    estimatedHours: number;
    typeConfig: TaskConfigValues;
    toolsRemarks: string;
    batchId: string;
    batchCode: string;
    batchSearch: string;
    remarks: string;
    workHoursPerDay: number;
  }>({
    taskId: '',
    types: [],
    typeRemarks: '',
    fields: [],
    crops: [],
    cropRemarks: '',
    areaRemarks: '',
    assignee: '',
    planStart: '',
    planEnd: '',
    sopContent: '',
    materials: [],
    tools: [],
    requiredFeedback: ['workload_confirm'],
    priority: 'normal',
    estimatedDays: 0,
    estimatedHours: 1,
    typeConfig: {},
    toolsRemarks: '',
    batchId: '',
    batchCode: '',
    batchSearch: '',
    remarks: '',
    workHoursPerDay: 8,
  });
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [showTaskTypeDropdown, setShowTaskTypeDropdown] = useState(false);

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

  // ========== 新建任务相关函数 ==========
  const handleNextStep = () => {
    let error = '';
    if (createStep === 1) {
      if (!newTask.taskId) {
        error = '请生成任务编号';
      } else if (newTask.types.length === 0) {
        error = '请选择任务类型';
      } else if (newTask.fields.length === 0) {
        error = '请选择任务区域';
      } else if (newTask.crops.length === 0) {
        error = '请选择作物';
      } else if (newTask.types.includes('other') && !newTask.typeRemarks.trim()) {
        error = '请输入其他任务备注';
      }
    }
    // Step 2 不需要验证执行人（执行人在任务列表中单独选择）

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    setCreateStep(createStep + 1);
  };

  // 获取AI推荐
  const fetchAIRecommendations = useCallback(async () => {
    const taskInfo = {
      id: newTask.taskId || '',
      taskCode: newTask.taskId || '',
      title: newTask.types[0] || '农事任务',
      type: newTask.types[0] || '',
      typeName: newTask.types[0] || '',
      priority: (newTask.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
      workZone: newTask.fields[0] || '',
      greenhouse: newTask.fields[0] || '',
      cropName: newTask.crops[0] || '',
      batchId: newTask.batchId,
      batchCode: newTask.batchCode,
      estimatedHours: newTask.estimatedHours,
      dueDate: newTask.planEnd?.split(' ')[0] || '',
    };

    try {
      const recommendations = await smartRecommend.getRecommendations(taskInfo);
      setAiRecommendations(recommendations || []);
    } catch (error) {
      console.error('[FarmTaskHub] 获取AI推荐失败:', error);
      setAiRecommendations([]);
    }
  }, [newTask, smartRecommend]);

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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const handleFileDrop = async (e: React.DragEvent) => {
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
  const handleImportConfirm = () => {
    if (importData.length === 0) {
      alert('没有可导入的数据');
      return;
    }

    console.log('导入数据:', importData);

    // 使用 tasksHook.createTask 创建任务
    importData.forEach(row => {
      const typeLabels = row.typeLabel || row.type;
      const assigneeStaff = taskDispatchStaff.find(s => s.name === row.assignee);
      const finalAssigneeName = row.assignee || '';
      const finalAssigneeId = finalAssigneeName
        ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}`
        : '';

      const defaultDispatcher = users.find(u => u.id === 'U001');
      const assignerId = defaultDispatcher?.id || 'U001';
      const assignerName = defaultDispatcher?.name || '张建国';

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

  // 智能推荐弹窗拖动功能
  const handleRecommendModalDragStart = useCallback((e: React.MouseEvent) => {
    if (recommendModalMaximized) return;
    document.addEventListener('mousemove', handleRecommendModalDrag);
    document.addEventListener('mouseup', handleRecommendModalDragEnd);
  }, [recommendModalMaximized]);

  const handleRecommendModalDrag = useCallback((e: MouseEvent) => {
    setRecommendModalPosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  }, []);

  const handleRecommendModalDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleRecommendModalDrag);
    document.removeEventListener('mouseup', handleRecommendModalDragEnd);
  }, [handleRecommendModalDrag]);

  const toggleRecommendModalMaximize = useCallback(() => {
    setRecommendModalMaximized(prev => !prev);
    if (recommendModalMaximized) {
      setRecommendModalSize({ width: 1200, height: 700 });
      setRecommendModalPosition({ x: 0, y: 0 });
    } else {
      setRecommendModalSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setRecommendModalPosition({ x: 20, y: 20 });
    }
  }, [recommendModalMaximized]);

  const handleTypeConfigChange = (type: string, values: Record<string, string>) => {
    setNewTask(prev => ({
      ...prev,
      typeConfig: {
        ...prev.typeConfig,
        [type]: values,
      },
    }));
  };

  const handleCreateTask = (publish: boolean = true) => {
    const typeLabels = newTask.types.map(t => getTypeLabel(t)).join(',');
    const fieldValue = newTask.fields?.includes('other')
      ? newTask.areaRemarks
      : (newTask.fields?.join(',') || '');
    const cropValue = newTask.crops?.includes('other')
      ? newTask.cropRemarks
      : (newTask.crops?.join(',') || '');

    const assigneeStaff = taskDispatchStaff.find(s => s.name === newTask.assignee);
    const finalAssigneeName = newTask.assignee || '';
    const finalAssigneeId = finalAssigneeName
      ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}`
      : '';

    const defaultDispatcher = users.find(u => u.id === 'U001');
    const assignerId = defaultDispatcher?.id || 'U001';
    const assignerName = defaultDispatcher?.name || '张建国';

    const firstFieldName = fieldValue.split(',')[0]?.trim() || '';
    const matchedField = taskDispatchFields.find(f => f.name === firstFieldName);
    const greenhouseId = matchedField?.id?.toString() || '';

    const estimatedHours = ((newTask.estimatedDays || 0) * (newTask.workHoursPerDay || 8)) + (newTask.estimatedHours || 0);
    const planEndTime = calculateEndDateTime(
      newTask.planStart,
      newTask.estimatedDays || 0,
      newTask.estimatedHours || 0,
      newTask.workHoursPerDay || 8
    );

    let taskStatus: 'pending' | 'draft' = 'draft';
    if (publish) {
      taskStatus = 'pending';
    }

    console.log('[handleCreateTask] 创建任务备注:', newTask.toolsRemarks);
    tasksHook.createTask({
      title: typeLabels || '农事任务',
      type: newTask.types[0] || 'other',
      typeName: typeLabels,
      batchId: newTask.batchId,
      batchCode: newTask.batchCode,
      greenhouseId: greenhouseId,
      greenhouseName: fieldValue,
      cropName: cropValue,
      priority: (newTask.priority as 'urgent' | 'high' | 'normal') || 'normal',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
      assignerId: assignerId,
      assignerName: assignerName,
      planStart: newTask.planStart || '',
      planEnd: planEndTime || '',
      dueDate: planEndTime?.split(' ')[0] || '',
      estimatedDays: newTask.estimatedDays || 0,
      estimatedHours: estimatedHours,
      description: newTask.sopContent || '',
      remarks: newTask.toolsRemarks || '',
      sourceType: 'dispatch',
      materials: newTask.materials,
      tools: newTask.tools,
      toolsRemarks: newTask.toolsRemarks,
      requiredFeedback: newTask.requiredFeedback,
      typeConfig: newTask.typeConfig || {},
      status: taskStatus,
      // ========== 兼容旧界面字段（TaskTableRow 使用这些字段）==========
      types: newTask.types,
      typeLabel: typeLabels,
      field: fieldValue,
      assignee: finalAssigneeName,
      crop: cropValue,
      sopContent: newTask.sopContent || '',
    });

    setShowCreateModal(false);
    setCreateStep(1);
    setStepError('');
    setTaskRefresh(t => t + 1);
    // 显式调用 hub.refresh() 确保任务列表更新
    hub.refresh();
    setNewTask({
      taskId: '',
      types: [],
      typeRemarks: '',
      fields: [],
      crops: [],
      cropRemarks: '',
      areaRemarks: '',
      assignee: '',
      planStart: '',
      planEnd: '',
      sopContent: '',
      materials: [],
      tools: [],
      requiredFeedback: ['workload_confirm'],
      priority: 'normal',
      estimatedDays: 0,
      estimatedHours: 1,
      typeConfig: {},
      toolsRemarks: '',
      batchId: '',
      batchCode: '',
      batchSearch: '',
      remarks: '',
      workHoursPerDay: 8,
    });
    hub.forceRefresh();
  };

  const handleSaveDraft = () => {
    let error = '';
    if (!newTask.taskId) {
      error = '请生成任务编号';
    } else if (newTask.types.length === 0) {
      error = '请选择任务类型';
    }

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    handleCreateTask(false);
  };

  const handleFinalCreate = () => {
    let error = '';
    if (!newTask.taskId) {
      error = '请生成任务编号';
    } else if (newTask.types.length === 0) {
      error = '请选择任务类型';
    } else if (newTask.fields.length === 0) {
      error = '请选择任务区域';
    } else if (newTask.crops.length === 0) {
      error = '请选择作物';
    }
    // 执行人不再在新建时选择，而是在任务列表中单独选择

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    handleCreateTask(true);
  };

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
    console.log('[FarmTaskHub] 继续执行任务:', taskId);
    tasksHook.continueExecution(taskId);
    hub.refresh();
  };

  // 验收任务 - 打开验收弹窗
  const handleTaskAccept = (task: import('../../types/task').Task) => {
    setVerifyTaskId(task.id);
  };

  // 催办任务
  const handleTaskRemind = (task: import('../../types/task').Task) => {
    console.log('[FarmTaskHub] 催办任务:', task);
  };

  // 选择执行人
  const handleSelectExecutor = (task: import('../../types/task').Task) => {
    setSelectExecutorTask(task);
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
    console.log('[FarmTaskHub] 批量派发:', taskIds);
    hub.refresh();
  };

  const handleBatchVerify = (taskIds: string[]) => {
    console.log('[FarmTaskHub] 批量验收:', taskIds);
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
            <nav className="flex -mb-px">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => hub.setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    hub.state.activeTab === tab.key
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    hub.state.activeTab === tab.key
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.key === 'task' ? hub.tasks.length : tab.key === 'problem' ? hub.problems.length : hub.inspections.length}
                  </span>
                </button>
              ))}
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
            {hub.state.activeTab === 'problem' && (
              <ProblemTab
                problems={hub.getFilteredProblems()}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
                onResetFilters={hub.resetFilters}
                onDispatchProblem={(problemId) => setDispatchProblemId(problemId)}
              />
            )}
            {hub.state.activeTab === 'inspection' && (
              <InspectionTab
                inspections={hub.getFilteredInspections()}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
                onResetFilters={hub.resetFilters}
                onViewInspection={(recordId) => setDetailInspectionId(recordId)}
              />
            )}
          </div>
        </div>

        {/* 今日操作记录 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-400" />
              今日操作记录
            </h2>
            <button
              onClick={() => setShowRecordPanel(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              查看全部
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            {hub.state.recentRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无操作记录</p>
            ) : (
              <div className="space-y-3">
                {hub.state.recentRecords.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      record.operatorType === 'system'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {record.operatorType === 'system' ? '系统' : record.operatorName}
                    </span>
                    <span className="text-gray-600 flex-1">{record.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setStepError(''); setCreateStep(1); }}
        title="新建任务"
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-between">
            {createStep > 1 && (
              <button
                onClick={() => setCreateStep(createStep - 1)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
              >
                上一步
              </button>
            )}
            {createStep === 2 ? (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 flex items-center gap-2"
                >
                  保存草稿
                </button>
                <button
                  onClick={handleFinalCreate}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
                >
                  发布任务
                </button>
              </div>
            ) : (
              <button
                onClick={handleNextStep}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2 ml-auto"
              >
                下一步 <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      >
        {stepError && (
          <div className="px-6 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{stepError}</span>
            </div>
          </div>
        )}

        {/* 步骤指示器 */}
        <div className="px-6 py-4 border-b border-gray-100 -mx-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="text-sm font-medium">任务定义</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4">
              <div className={`h-full bg-emerald-500 transition-all ${createStep >= 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="text-sm font-medium">资源与时间</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: 任务定义 */}
          {createStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务编号</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTask.taskId || ''}
                      onChange={(e) => setNewTask({ ...newTask, taskId: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="点击下方生成按钮"
                    />
                    <button
                      type="button"
                      onClick={() => setNewTask({ ...newTask, taskId: autoGenerateTaskCode(tasksHook.tasks) })}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                      生成
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">关联生产批次</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newTask.batchCode || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTask(prev => ({ ...prev, batchCode: val, batchId: val ? prev.batchId : '' }));
                      }}
                      onFocus={() => setShowBatchDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="搜索或选择生产批次..."
                    />
                    {showBatchDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {cropBatches
                          .filter(b =>
                            !newTask.batchCode ||
                            b.batchCode.toLowerCase().includes(newTask.batchCode.toLowerCase()) ||
                            b.cropName.includes(newTask.batchCode)
                          )
                          .slice(0, 10)
                          .map(batch => (
                            <div
                              key={batch.id}
                              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                              onClick={() => {
                                setNewTask(prev => ({
                                  ...prev,
                                  batchId: batch.id,
                                  batchCode: batch.batchCode,
                                }));
                                setShowBatchDropdown(false);
                              }}
                            >
                              <div className="font-medium text-gray-900">{batch.batchCode}</div>
                              <div className="text-xs text-gray-500">{batch.cropName} · {batch.greenhouseName}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {showBatchDropdown && (
                    <div className="fixed inset-0 z-0" onClick={() => setShowBatchDropdown(false)} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务区域 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div
                      className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                      onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                    >
                      {(!newTask.fields || newTask.fields.length === 0) && (
                        <span className="text-gray-400 text-sm">请选择任务区域</span>
                      )}
                      {(newTask.fields || []).map((fieldValue: string) => {
                        const field = taskDispatchFields.find(f => f.name === fieldValue);
                        return (
                          <span
                            key={fieldValue}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                          >
                            {field?.name || fieldValue}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== fieldValue) });
                              }}
                              className="hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    {showFieldDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {taskDispatchFields.slice(0, 12).map(f => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={(newTask.fields || []).includes(f.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTask({ ...newTask, fields: [...(newTask.fields || []), f.name] });
                                } else {
                                  setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== f.name) });
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{f.name}</span>
                          </label>
                        ))}
                        <label
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={(newTask.fields || []).includes('other')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, fields: [...(newTask.fields || []), 'other'] });
                              } else {
                                setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== 'other') });
                              }
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-700">其他</span>
                        </label>
                      </div>
                    )}
                  </div>
                  {showFieldDropdown && (
                    <div className="fixed inset-0 z-0" onClick={() => setShowFieldDropdown(false)} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作物 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div
                      className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                      onClick={() => setShowCropDropdown(!showCropDropdown)}
                    >
                      {(!newTask.crops || newTask.crops.length === 0) && (
                        <span className="text-gray-400 text-sm">请选择作物</span>
                      )}
                      {(newTask.crops || []).map((cropValue: string) => (
                        <span
                          key={cropValue}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                        >
                          {cropValue}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== cropValue) });
                            }}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {showCropDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {['番茄', '黄瓜', '草莓', '辣椒'].map(crop => (
                          <label
                            key={crop}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={(newTask.crops || []).includes(crop)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTask({ ...newTask, crops: [...(newTask.crops || []), crop] });
                                } else {
                                  setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== crop) });
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{crop}</span>
                          </label>
                        ))}
                        <label
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={(newTask.crops || []).includes('other')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, crops: [...(newTask.crops || []), 'other'] });
                              } else {
                                setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== 'other') });
                              }
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-700">其他</span>
                        </label>
                      </div>
                    )}
                  </div>
                  {showCropDropdown && (
                    <div className="fixed inset-0 z-0" onClick={() => setShowCropDropdown(false)} />
                  )}
                  {newTask.crops?.includes('other') && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物备注 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newTask.cropRemarks || ''}
                        onChange={(e) => setNewTask({ ...newTask, cropRemarks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="请输入作物说明"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务类型 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div
                    className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                    onClick={() => setShowTaskTypeDropdown(!showTaskTypeDropdown)}
                  >
                    {(!newTask.types || newTask.types.length === 0) && (
                      <span className="text-gray-400 text-sm">请选择任务类型</span>
                    )}
                    {(newTask.types || []).map((typeValue: string) => {
                      const type = FARM_OPERATION_TYPES.find(t => t.value === typeValue);
                      return (
                        <span
                          key={typeValue}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm"
                        >
                          {type?.label || typeValue}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTask({ ...newTask, types: newTask.types.filter(v => v !== typeValue) });
                            }}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  {showTaskTypeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {FARM_OPERATION_TYPES.map(t => (
                        <label
                          key={t.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={newTask.types.includes(t.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, types: [...newTask.types, t.value] });
                              } else {
                                setNewTask({ ...newTask, types: newTask.types.filter(v => v !== t.value) });
                              }
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {showTaskTypeDropdown && (
                  <div className="fixed inset-0 z-0" onClick={() => setShowTaskTypeDropdown(false)} />
                )}
              </div>

              {newTask.types.includes('other') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">其他任务备注 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTask.typeRemarks || ''}
                    onChange={(e) => setNewTask({ ...newTask, typeRemarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="请输入其他任务说明"
                  />
                </div>
              )}

              <TaskTypeConfigPanel
                taskTypes={newTask.types}
                configValues={newTask.typeConfig}
                onConfigChange={handleTypeConfigChange}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作业标准 (SOP)</label>
                <textarea
                  value={newTask.sopContent}
                  onChange={(e) => setNewTask({ ...newTask, sopContent: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入作业标准...（简单任务可在此直接输入，复杂任务可点击导入文件）"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      // 创建隐藏的文件输入框
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.txt,.doc,.docx,.pdf';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setNewTask({ ...newTask, sopContent: content });
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    导入文件
                  </button>
                  <span className="text-xs text-gray-500">支持 .txt, .doc, .docx, .pdf 格式</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 资源与时间 */}
          {createStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所需物资</label>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  {(!newTask.materials || newTask.materials.length === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-2">暂无所需物资</p>
                  ) : (
                    newTask.materials.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const newMaterials = [...(newTask.materials || [])];
                            newMaterials[i].name = e.target.value;
                            setNewTask({ ...newTask, materials: newMaterials });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                          placeholder="物资名称"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={m.qty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d.]/g, '');
                            if (raw === '' || raw === '-') {
                              const newMaterials = [...(newTask.materials || [])];
                              newMaterials[i].qty = 0;
                              setNewTask({ ...newTask, materials: newMaterials });
                              return;
                            }
                            const val = parseFloat(raw);
                            if (!isNaN(val)) {
                              const newMaterials = [...(newTask.materials || [])];
                              newMaterials[i].qty = Math.round(val * 100) / 100;
                              setNewTask({ ...newTask, materials: newMaterials });
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                        <select
                          value={m.unit}
                          onChange={(e) => {
                            const newMaterials = [...(newTask.materials || [])];
                            newMaterials[i].unit = e.target.value;
                            setNewTask({ ...newTask, materials: newMaterials });
                          }}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                        >
                          <option value="个">个</option>
                          <option value="件">件</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="mL">mL</option>
                          <option value="袋">袋</option>
                          <option value="箱">箱</option>
                        </select>
                        <button
                          onClick={() => {
                            const newMaterials = (newTask.materials || []).filter((_, idx) => idx !== i);
                            setNewTask({ ...newTask, materials: newMaterials });
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => setNewTask({ ...newTask, materials: [...(newTask.materials || []), { name: '', qty: 1, unit: '个' }] })}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    + 物资
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所需工具</label>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  {(!newTask.tools || newTask.tools.length === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-2">暂无所需工具</p>
                  ) : (
                    newTask.tools.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const newTools = [...(newTask.tools || [])];
                            newTools[i].name = e.target.value;
                            setNewTask({ ...newTask, tools: newTools });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                          placeholder="工具名称"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={t.qty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d.]/g, '');
                            if (raw === '' || raw === '-') {
                              const newTools = [...(newTask.tools || [])];
                              newTools[i].qty = 0;
                              setNewTask({ ...newTask, tools: newTools });
                              return;
                            }
                            const val = parseFloat(raw);
                            if (!isNaN(val)) {
                              const newTools = [...(newTask.tools || [])];
                              newTools[i].qty = Math.round(val * 100) / 100;
                              setNewTask({ ...newTask, tools: newTools });
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                        <select
                          value={t.unit}
                          onChange={(e) => {
                            const newTools = [...(newTask.tools || [])];
                            newTools[i].unit = e.target.value;
                            setNewTask({ ...newTask, tools: newTools });
                          }}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                        >
                          <option value="把">把</option>
                          <option value="个">个</option>
                          <option value="台">台</option>
                          <option value="套">套</option>
                          <option value="件">件</option>
                        </select>
                        <button
                          onClick={() => {
                            const newTools = (newTask.tools || []).filter((_, idx) => idx !== i);
                            setNewTask({ ...newTask, tools: newTools });
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => setNewTask({ ...newTask, tools: [...(newTask.tools || []), { name: '', qty: 1, unit: '把' }] })}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    + 工具
                  </button>
                </div>
              </div>
              {/* 资源备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                <textarea
                  value={newTask.toolsRemarks || ''}
                  onChange={(e) => setNewTask({ ...newTask, toolsRemarks: e.target.value })}
                  placeholder="补充说明资源相关要求"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {/* 时间与要求 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 工作制 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">工作制</label>
                  <select
                    value={newTask.workHoursPerDay}
                    onChange={(e) => {
                      const newWorkHours = Number(e.target.value);
                      setNewTask({ ...newTask, workHoursPerDay: newWorkHours });
                      if ((newTask.estimatedHours || 0) >= newWorkHours) {
                        setNewTask({ ...newTask, workHoursPerDay: newWorkHours, estimatedHours: newWorkHours - 1 });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={8}>8小时/天</option>
                    <option value={10}>10小时/天</option>
                    <option value={12}>12小时/天</option>
                  </select>
                </div>
                {/* 计划开始日期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={newTask.planStart?.split(' ')[0] || ''}
                    onChange={(e) => {
                      const timePart = newTask.planStart?.split(' ')[1] || '08:00';
                      setNewTask({ ...newTask, planStart: e.target.value + ' ' + timePart });
                    }}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {/* 开始时间 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <select
                    value={newTask.planStart?.split(' ')[1] || '08:00'}
                    onChange={(e) => {
                      const datePart = newTask.planStart?.split(' ')[0] || '';
                      setNewTask({ ...newTask, planStart: datePart + ' ' + e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[7,8,9,10,11,12,13,14,15,16,17,18,19].map(h => (
                      <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                {/* 天数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">天数</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newTask.estimatedDays || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
                      setNewTask({ ...newTask, estimatedDays: isNaN(val) ? 0 : val });
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {/* 小时 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">小时 <span className="text-xs text-gray-400">(最大{(newTask.workHoursPerDay || 8) - 1})</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newTask.estimatedHours || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
                      const maxHours = (newTask.workHoursPerDay || 8) - 1;
                      if (!isNaN(val) && val >= 0 && val <= maxHours) {
                        setNewTask({ ...newTask, estimatedHours: val });
                      } else if (isNaN(val) || val === 0) {
                        setNewTask({ ...newTask, estimatedHours: 0 });
                      }
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              {/* 任务截止时间自动计算显示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700">
                    任务截止时间：
                  </span>
                  <span className="text-sm font-medium text-blue-900">
                    {newTask.planStart ? calculateEndDateTime(newTask.planStart, newTask.estimatedDays || 0, newTask.estimatedHours || 0, newTask.workHoursPerDay || 8) : '-'}
                  </span>
                  <span className="text-xs text-blue-500">
                    (共 {(newTask.estimatedDays || 0) * (newTask.workHoursPerDay || 8) + (newTask.estimatedHours || 0)} 小时)
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="normal">普通</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
                <div>
                <label className="block text-sm font-bold text-red-600 mb-2">必填反馈 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'workload_confirm', label: '工作量确认', icon: Clock, iconBg: 'bg-emerald-500', iconColor: 'text-white' },
                    { key: 'gps', label: '位置打卡', icon: MapPin, iconBg: 'bg-blue-500', iconColor: 'text-white' },
                    { key: 'material', label: '物资扫码', icon: Package, iconBg: 'bg-amber-500', iconColor: 'text-white' },
                    { key: 'photo_before', label: '作业前照片', icon: Camera, iconBg: 'bg-purple-500', iconColor: 'text-white' },
                    { key: 'photo_after', label: '作业后照片', icon: Camera, iconBg: 'bg-pink-500', iconColor: 'text-white' },
                    { key: 'voice', label: '语音备注', icon: Mic, iconBg: 'bg-teal-500', iconColor: 'text-white' },
                  ].map(item => {
                    const isSelected = newTask.requiredFeedback.includes(item.key);
                    const Icon = item.icon;
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-gray-100 border-2 border-emerald-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({ ...newTask, requiredFeedback: [...newTask.requiredFeedback, item.key] });
                            } else {
                              setNewTask({ ...newTask, requiredFeedback: newTask.requiredFeedback.filter(f => f !== item.key) });
                            }
                          }}
                          className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 sr-only"
                        />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? item.iconBg : 'bg-gray-200'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? item.iconColor : 'text-gray-400'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
            console.log('[FarmTaskHub] 超时继续执行:', { taskId, reason, newDeadline });
            setOvertimeTask(null);
            hub.refresh();
          }}
          onAbandon={(taskId, reason) => {
            console.log('[FarmTaskHub] 超时放弃执行:', { taskId, reason });
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
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  importFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
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
                onClick={handleImportConfirm}
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
