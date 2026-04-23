import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Plus, Upload, Sparkles, Filter, List, Calendar as CalendarIcon,
  MapPin, User, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Edit, Trash2,
  ChevronRight, ChevronDown, Package, Camera, Mic, Navigation, ArrowRight, X,
  Leaf, Droplets, Scissors, Bug, ShoppingBasket, Trees, Wheat, Thermometer, Sun, CloudRain, Download,
  ChevronLeft, ChevronRight as ChevronRightIcon, Square, Minimize2, Move, RefreshCw, GripVertical,
  FileText, Bell, AlertCircle
} from 'lucide-react';
import { format, isSameDay, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameMonth, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  BatchEditModal,
  DeleteWarningModal,
  ExportFormatModal,
  TaskAcceptanceModal,
  OvertimeHandleModal,
  WithdrawCancelModal,
  ReassignTaskModal,
} from './modals';
import { Modal } from '../../ui/Modal';
import { TaskConfigValues } from './hooks/useTaskTypeConfig';

// ========== 引入组件（组件化重构） ==========
import { PageHeader, StatsCards, FilterToolbar, TaskTable } from './components';
import { TaskTypeConfigPanel, TaskTypeConfigDisplay } from './components';
import {
  TASK_TYPES,
  STATUS_MAP,
  PRIORITY_MAP,
  EDITABLE_STATUSES,
  DELETABLE_STATUSES,
  formatWorkHours,
  getTypeLabel,
  getTypeColor,
} from './constants';

// 从任务配置导入状态和操作配置（用于详情弹窗的流转记录显示）
import { TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../config/taskConfig';

// 从 farmMockData 导入数据（消除硬编码）
import {
  taskDispatchTasks,
  taskDispatchFields,
  taskDispatchStaff,
  TASK_DISPATCH_BASE,
  SOP_TEMPLATES,
  cropStages,
  weekDaysZh,
  farmInspectionRecords,
  farmOperationRecords,
  farmHarvestRecords,
  greenhouseOptions,  // 用于查找 greenhouseId
} from '../../../data/farmMockData';

// 导入用户数据（用于获取派发人信息）和生产批次数据
import { users, cropBatches } from '../../../data/mockData';

// 导入智能推荐 Hook
import { useSmartRecommendation } from '../../../hooks/farm';

// 导入统一任务管理 Hook（数据闭环核心）
import { useTasks, Task, TaskStatus } from '../../../hooks/useTasks';
import { useOperationRecords } from '../../../hooks/useOperationRecords';
import { useReminder } from '../../../hooks/useReminder';

// 导入智能推荐面板和派工类型
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import type { DispatchMode } from '../../../types/dispatch';
import type { WorkerRecommendation } from '../../../hooks/useComprehensiveDispatch';
import { useComprehensiveDispatch } from '../../../hooks/useComprehensiveDispatch';

// ========== 从 constants 导入的常量和工具函数 ==========
// 任务类型定义（保留图标组件，这些不能放在 mockData 中）
const taskTypes = TASK_TYPES;

// 模拟任务数据 - 从 farmMockData 导入（防御性：确保有默认值）
const initialMockTasks = taskDispatchTasks || [];

// 任务区域列表 - 从 farmMockData 导入（防御性：确保有默认值）
const fields = taskDispatchFields || [];

// 崇明岛基地 - 从 farmMockData 导入
const base = TASK_DISPATCH_BASE;

// 员工列表 - 从 farmMockData 导入（防御性：确保有默认值）
const staff: Array<{id: number; name: string; status: string; fieldId?: number}> = taskDispatchStaff || [];

// SOP模板 - 从 farmMockData 导入
const sopTemplates = SOP_TEMPLATES;

// 状态映射 - 从 constants 导入
const statusMap = STATUS_MAP;

// 优先级映射 - 从 constants 导入
const priorityMap = PRIORITY_MAP;


// 智能推荐结果类型 - 完整字段
interface Recommendation {
  id: string;
  recommendId: string;           // 推荐编号
  greenhouse: string;             // 任务区域
  crop: string;                  // 作物
  stage: string;                  // 生长阶段
  sourceType: 'env_alert' | 'pest_alert' | 'stage_task' | 'periodic';  // 推荐来源
  sourceDescription: string;      // 来源描述
  recommendedTasks: string[];     // 推荐任务类型标签
  reason: string;                 // 主要原因
  reasonSecondary: string[];      // 次要原因
  evidence: { type: string; label: string; value: string }[];  // 证据
  priority: 'high' | 'medium' | 'low';  // 优先级
  priorityScore: number;          // 优先级评分 (0-100)
  assignee: string;                // 推荐人员
  matchScore: number;             // 匹配评分 (0-100)
  alternatives: { name: string; score: number }[];  // 备选人员
  suggestedDate: string;           // 建议执行日期
  latestDate: string;             // 最晚执行日期
  batchCode: string;              // 批次编号
}

// 批量导入行数据类型
interface ImportRow {
  type: string;
  typeLabel: string;
  field: string;
  crop: string;
  assignee: string;
  planStart: string;
  planEnd: string;
  priority: string;
  [key: string]: string;
}

// 生成任务ID：日期+流水号，如 20250315-001
const generateTaskId = (dateStr: string, existingTasks: typeof initialMockTasks): string => {
  const datePrefix = dateStr.replace(/-/g, '');
  const sameDateTasks = existingTasks.filter(t => t.id.startsWith(datePrefix));
  const sequence = String(sameDateTasks.length + 1).padStart(3, '0');
  return `${datePrefix}-${sequence}`;
};

export default function TaskDispatchPage() {
  // 使用统一任务管理 Hook（数据闭环核心）
  const {
    tasks,
    taskRecords,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getTaskRecordsByTaskId,
    acceptCompletion,
    rejectForRework,
    withdrawTask,
    cancelTask,
    handleOvertime,
    submitProgress,
    detectOvertime,
    reassignTask,
    continueExecution,
  } = useTasks();
  const { addTaskRecord } = useOperationRecords();
  // 催办管理 Hook
  const { canRemind, sendReminder, getCooldownRemaining, getTodayReminderCount } = useReminder();

  // 新建任务表单状态（必须在使用之前定义）
  const [newTask, setNewTask] = useState<{
    taskId: string;
    types: string[];
    typeRemarks: string;
    fields: string[];
    crops: string[];
    areaRemarks: string;
    assignee: string;
    planStart: string;
    planEnd: string;
    sopContent: string;
    materials: { name: string; qty: number; unit: string }[];
    requiredFeedback: string[];
    priority: string;
    estimatedDays: number;
    estimatedHours: number;
    typeConfig: TaskConfigValues;  // 任务类型配置
    toolsRemarks: string;  // 工具备注
    batchId: string;  // 关联生产批次ID
    batchCode: string;  // 关联生产批次编号
    batchSearch: string;  // 批次搜索关键词
  }>({
    taskId: '',
    types: [],
    typeRemarks: '',
    fields: [],
    crops: [],
    areaRemarks: '',
    assignee: '',
    planStart: '',
    planEnd: '',
    sopContent: '',
    materials: [],
    requiredFeedback: ['workload_confirm'],
    priority: 'normal',
    estimatedDays: 0,
    estimatedHours: 1,
    typeConfig: {},
    toolsRemarks: '',
    batchId: '',
    batchCode: '',
    batchSearch: '',
  });

  // 智能派工相关状态
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('manual');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [aiConfidenceScore, setAiConfidenceScore] = useState<number | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<WorkerRecommendation[]>([]);

  // 使用综合派工 Hook 获取 AI 推荐功能
  const { getRecommendations } = useComprehensiveDispatch();

  // 获取 AI 推荐数据
  const fetchAIRecommendations = useCallback(() => {
    if (!newTask.fields[0] || !newTask.types[0]) return;

    // 构建任务信息
    const taskInfo = {
      id: newTask.taskId || `temp-${Date.now()}`,
      source: 'farm' as const,
      sourceId: '',
      taskCode: newTask.taskId || '',
      title: newTask.types[0] || '农事任务',
      type: newTask.types[0] || 'other',
      typeName: newTask.types[0] || '',
      priority: (newTask.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
      workZone: newTask.fields[0] || '',
      greenhouse: newTask.fields[0] || '',
      cropName: newTask.crops[0] || '',
      batchId: newTask.batchId,
      batchCode: newTask.batchCode,
      requiredSkills: [],
      estimatedHours: newTask.estimatedHours || 2,
      dueDate: newTask.planEnd?.split(' ')[0] || '',
    };

    // 获取推荐
    const recommendations = getRecommendations(taskInfo, 3);
    setAiRecommendations(recommendations);
  }, [newTask.fields, newTask.types, newTask.taskId, newTask.priority, newTask.crops, newTask.batchId, newTask.batchCode, newTask.estimatedHours, newTask.planEnd, getRecommendations]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  // 合并：优先显示 useTasks 的数据，但也保留本地 mockTasks 用于兼容旧逻辑
  const [mockTasks, setMockTasks] = useState(initialMockTasks);
  const [taskIdSearch, setTaskIdSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskTypeDropdown, setShowTaskTypeDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [stepError, setStepError] = useState<string>('');  // 步骤验证错误提示
  const [selectedTask, setSelectedTask] = useState<typeof mockTasks[0] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopTask, setSelectedSopTask] = useState<typeof mockTasks[0] | null>(null);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  // 批量编辑模式状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // 验收弹窗状态
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceTask, setAcceptanceTask] = useState<typeof mockTasks[0] | null>(null);

  // 超时处理弹窗状态
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeTask, setOvertimeTask] = useState<typeof mockTasks[0] | null>(null);

  // 撤回/取消弹窗状态
  const [showWithdrawCancelModal, setShowWithdrawCancelModal] = useState(false);
  const [withdrawCancelType, setWithdrawCancelType] = useState<'withdraw' | 'cancel'>('withdraw');
  const [withdrawCancelTask, setWithdrawCancelTask] = useState<typeof mockTasks[0] | null>(null);

  // 重新派发弹窗状态
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignModalTask, setReassignModalTask] = useState<typeof mockTasks[0] | null>(null);
  const [editedTaskIds, setEditedTaskIds] = useState<string[]>([]);
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<typeof mockTasks[0]>>>({});

  // 智能推荐相关状态
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);

  // 智能推荐弹窗拖动和缩放状态
  const [recommendModalMaximized, setRecommendModalMaximized] = useState(false);
  const [recommendModalPosition, setRecommendModalPosition] = useState({ x: 0, y: 0 });
  const [recommendModalSize, setRecommendModalSize] = useState({ width: 1200, height: 700 });
  const recommendModalRef = useRef<HTMLDivElement>(null);
  const recommendDragStart = useRef({ x: 0, y: 0, positionX: 0, positionY: 0, isDragging: false });

  // 智能推荐弹窗拖动开始
  const handleRecommendModalDragStart = useCallback((e: React.MouseEvent) => {
    if (recommendModalMaximized) return; // 最大化时不允许拖动
    recommendDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      positionX: recommendModalPosition.x,
      positionY: recommendModalPosition.y,
      isDragging: true,
    };
    document.addEventListener('mousemove', handleRecommendModalDrag);
    document.addEventListener('mouseup', handleRecommendModalDragEnd);
  }, [recommendModalMaximized, recommendModalPosition]);

  const handleRecommendModalDrag = useCallback((e: MouseEvent) => {
    if (!recommendDragStart.current.isDragging) return;
    const deltaX = e.clientX - recommendDragStart.current.x;
    const deltaY = e.clientY - recommendDragStart.current.y;
    setRecommendModalPosition({
      x: recommendDragStart.current.positionX + deltaX,
      y: recommendDragStart.current.positionY + deltaY,
    });
  }, []);

  const handleRecommendModalDragEnd = useCallback(() => {
    recommendDragStart.current.isDragging = false;
    document.removeEventListener('mousemove', handleRecommendModalDrag);
    document.removeEventListener('mouseup', handleRecommendModalDragEnd);
  }, []);

  // 智能推荐弹窗最大化/还原
  const toggleRecommendModalMaximize = useCallback(() => {
    setRecommendModalMaximized(prev => !prev);
    if (recommendModalMaximized) {
      // 还原时恢复之前的大小和位置
      setRecommendModalSize({ width: 1200, height: 700 });
      setRecommendModalPosition({ x: 0, y: 0 });
    } else {
      // 最大化时保存当前大小
      setRecommendModalSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
    }
  }, [recommendModalMaximized]);

  // 清理事件监听
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleRecommendModalDrag);
      document.removeEventListener('mouseup', handleRecommendModalDragEnd);
    };
  }, [handleRecommendModalDrag, handleRecommendModalDragEnd]);

  // 使用智能推荐 Hook
  const {
    recommendations: smartRecommendations,
    stats: recommendationStats,
    isLoading: isRecommendationLoading,
    acceptRecommendation,
    rejectRecommendation,
    refresh: refreshRecommendations,
    generateAllRecommendations,
  } = useSmartRecommendation();

  // 兼容旧接口：将 SmartRecommendation 转换为旧的 Recommendation 格式
  const recommendations: Recommendation[] = smartRecommendations.map(rec => ({
    id: rec.id,
    recommendId: rec.recommendId,
    greenhouse: rec.task.field,
    crop: rec.task.crop,
    stage: '', // 旧接口没有此字段
    sourceType: rec.source.type,
    sourceDescription: rec.source.description,
    recommendedTasks: rec.task.typeLabels,
    reason: rec.reason.primary,
    reasonSecondary: rec.reason.secondary,
    evidence: rec.reason.evidence,
    priority: rec.priority.level === 'urgent' ? 'high' : rec.priority.level === 'high' ? 'high' : rec.priority.level === 'medium' ? 'medium' : 'low',
    priorityScore: rec.priority.score,
    assignee: rec.assignment.recommendedWorkerName,
    matchScore: rec.assignment.matchScore,
    alternatives: rec.assignment.alternatives.map(alt => ({ name: alt.workerName, score: alt.matchScore })),
    suggestedDate: rec.task.suggestedDate,
    latestDate: rec.task.latestDate || rec.task.suggestedDate,
    batchCode: rec.task.batchCode || '',
  }));

  // 日历视图相关状态
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarViewType, setCalendarViewType] = useState<'day' | 'week' | 'month'>('week');

  // 日历拖拽状态
  const [draggedTask, setDraggedTask] = useState<typeof mockTasks[0] | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  // 智能推荐表格选择处理函数
  const handleSelectAllRecommendations = () => {
    setSelectedRecommendations(recommendations.map(rec => rec.id));
  };

  const handleSelectNoneRecommendations = () => {
    setSelectedRecommendations([]);
  };

  const handleToggleRecommendation = (id: string) => {
    setSelectedRecommendations(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDispatchSelected = () => {
    if (selectedRecommendations.length === 0) return;

    // 将选中项转换为任务并添加到mockTasks
    const newTasks = selectedRecommendations.map((recId, index) => {
      const rec = recommendations.find(r => r.id === recId)!;
      const taskTypeMap: Record<string, string> = {
        '施肥': 'fertilization',
        '灌溉': 'irrigation',
        '修剪': 'pruning',
        '植保': 'pesticide',
        '采收': 'harvest',
        '除草': 'weeding',
      };
      const firstTask = rec.recommendedTasks[0] || '施肥';
      const taskType = taskTypeMap[firstTask] || 'irrigation';
      const taskTypeInfo = taskTypes.find(t => t.value === taskType);

      return {
        id: generateTaskId(rec.suggestedDate, mockTasks),
        type: taskType,
        typeLabel: taskTypeInfo?.label || firstTask,
        field: rec.greenhouse,
        crop: rec.crop,
        assignee: rec.assignee,
        planStart: `${rec.suggestedDate} 08:00`,
        planEnd: `${rec.suggestedDate} 12:00`,
        progress: 0,
        status: 'pending' as const,
        priority: rec.priority === 'high' ? 'urgent' : rec.priority === 'medium' ? 'high' : 'normal',
      };
    });

    // ========== 数据闭环：同步新建任务到 useTasks ==========
    // 先调用 createTask 获取 useTasks 生成的任务 ID，再更新 mockTasks（保持 ID 一致）
    const tasksWithUseTasksId = newTasks.map(task => {
      const taskTypeInfo = taskTypes.find(t => t.value === task.type);
      const assigneeStaff = staff.find(s => s.name === task.assignee);

      const useTasksTask = createTask({
        title: task.typeLabel || '农事任务',
        type: task.type,
        typeName: task.typeLabel,
        batchId: '',
        batchCode: '',
        greenhouseId: assigneeStaff?.fieldId?.toString() || '',
        greenhouseName: task.field,
        cropName: task.crop,
        priority: (task.priority as 'urgent' | 'high' | 'normal') || 'normal',
        assigneeId: assigneeStaff?.id?.toString() || '',
        assigneeName: task.assignee,
        assignerId: 'U001',
        assignerName: '张建国',
        dueDate: task.planEnd?.split(' ')[0] || '',
        description: '',
        remarks: '',
        sourceType: 'dispatch',
        materials: [],
        requiredFeedback: ['workload_confirm'],
        // ========== 兼容旧界面字段 ==========
        types: task.types,
        typeLabel: task.typeLabel,
        field: task.field,
        assignee: task.assignee,
        crop: task.crop,
        planStart: task.planStart,
        planEnd: task.planEnd,
      });

      // 返回带有 useTasks 真实 ID 的任务对象
      return {
        ...task,
        id: useTasksTask.id,  // 使用 useTasks 返回的 ID
      };
    });

    setMockTasks(prev => [...prev, ...tasksWithUseTasksId]);

    // 使用 Hook 标记推荐为已接受
    selectedRecommendations.forEach(id => acceptRecommendation(id));
    setSelectedRecommendations([]);
  };

  // 批量导入相关状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 自动生成任务编号 NS+年月日+3位流水号（如 NS20260416001）
  // 需要同时检查 tasks 和 mockTasks，避免编号冲突
  const autoGenerateTaskCode = () => {
    const today = new Date();
    // 年月日：20260416
    const datePrefix = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    // 合并 tasks 和 mockTasks，避免重复查找
    const allTasks = [...tasks, ...mockTasks];

    // 查找当天的最大流水号
    let maxSequence = 0;
    allTasks.forEach(t => {
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
  };

  // 打开新建任务弹窗
  const handleOpenCreateModal = () => {
    const taskCode = autoGenerateTaskCode();
    setNewTask({
      taskId: taskCode,
      types: [],
      fields: [],
      crops: [],
      areaRemarks: '',
      assignee: '',
      planStart: '',
      planEnd: '',
      sopContent: '',
      materials: [],
      requiredFeedback: ['workload_confirm'],
      priority: 'normal',
      estimatedDays: 0,
      estimatedHours: 1,
      typeConfig: {},
      toolsRemarks: '',
      batchId: '',
      batchCode: '',
      batchSearch: '',
    });
    // 重置派工相关状态
    setDispatchMode('manual');
    setAssignedTo(null);
    setAiConfidenceScore(null);
    setAiRecommendations([]);
    setCreateStep(1);
    setShowCreateModal(true);
  };

  // 处理任务类型配置变化
  const handleTypeConfigChange = (key: string, value: string | number | boolean | string[]) => {
    setNewTask(prev => ({
      ...prev,
      typeConfig: {
        ...prev.typeConfig,
        [key]: value,
      },
    }));
  };

  // 过滤任务 - 优先使用 useTasks 的数据（包含兼容字段），fallback 到 mockTasks
  const taskDataSource = tasks.length > 0 ? tasks : mockTasks;
  const filteredTasks = taskDataSource.filter((task: any) => {
    if (taskIdSearch && !task.id.toLowerCase().includes(taskIdSearch.toLowerCase())) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (fieldFilter !== 'all') {
      const taskField = task.greenhouseId || task.field || '';
      if (taskField !== fieldFilter) return false;
    }
    if (assigneeFilter !== 'all') {
      const taskAssignee = task.assigneeId || task.assignee || '';
      if (taskAssignee !== assigneeFilter) return false;
    }
    return true;
  });

  // ========== 新建任务分步验证 ==========
  // Step 1 验证：任务定义
  const validateStep1 = (): string => {
    if (!newTask.fields || newTask.fields.length === 0) {
      return '请选择任务区域';
    }
    if (!newTask.crops || newTask.crops.length === 0) {
      return '请选择作物';
    }
    if (newTask.crops.includes('other') && !newTask.cropRemarks?.trim()) {
      return '请填写作物备注';
    }
    if (newTask.types.length === 0) {
      return '请选择任务类型';
    }
    return '';
  };

  // Step 2 验证：资源与人员
  // 检查是否有配置字段选择了"其他"选项
  const checkOtherOptionSelected = (): boolean => {
    const typeConfig = newTask.typeConfig || {};
    for (const key of Object.keys(typeConfig)) {
      const value = typeConfig[key];
      if (value === 'other') return true;
      if (Array.isArray(value) && value.includes('other')) return true;
    }
    return false;
  };

  const validateStep2 = (): string => {
    if (!newTask.assignee) {
      return '请选择执行人';
    }
    // 如果选择了"其他"配置选项，备注必填
    if (checkOtherOptionSelected() && !newTask.remarks?.trim()) {
      return '选择了"其他"选项，备注为必填项，请填写说明';
    }
    return '';
  };

  // Step 3 验证：时间与要求
  const validateStep3 = (): string => {
    if (!newTask.planStart) {
      return '请选择计划开始日期';
    }
    if (!newTask.requiredFeedback || newTask.requiredFeedback.length === 0) {
      return '请选择至少一项必填反馈';
    }
    return '';
  };

  // 处理下一步按钮点击
  const handleNextStep = () => {
    let error = '';
    if (createStep === 1) {
      error = validateStep1();
    } else if (createStep === 2) {
      error = validateStep2();
    }

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    setCreateStep(createStep + 1);
  };

  // 处理最终创建（Step 3 验证）- 发布任务
  const handleFinalCreate = () => {
    const error = validateStep3();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    // 创建任务并发布
    handleCreateTask(true);
  };

  // 保存草稿（不发布）
  const handleSaveDraft = () => {
    const error = validateStep3();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    // 创建草稿任务
    handleCreateTask(false);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setTaskIdSearch('');
    setStatusFilter('all');
    setTimeFilter('all');
    setFieldFilter('all');
    setAssigneeFilter('all');
  };

  // 智能推荐算法（使用 Hook）
  const generateRecommendations = () => {
    // 使用 Hook 生成推荐
    generateAllRecommendations();
    setSelectedRecommendations([]);
    setShowRecommendModal(true);
  };

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
              const taskType = taskTypes.find(t =>
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

    // 这里应该调用实际的导入API或更新状态
    console.log('导入数据:', importData);

    // 模拟添加任务
    importData.forEach(row => {
      const taskDate = row.planStart.split(' ')[0];
      const newTask = {
        id: generateTaskId(taskDate, mockTasks),
        type: row.type,
        typeLabel: row.typeLabel,
        field: row.field,
        crop: row.crop,
        assignee: row.assignee,
        planStart: row.planStart,
        planEnd: row.planEnd,
        progress: 0,
        status: 'pending',
        priority: row.priority,
      };
      // 实际应用中应该添加到状态或发送到服务器
      console.log('创建任务:', newTask);
    });

    alert(`成功导入 ${importData.length} 条任务`);

    // 关闭模态框并重置状态
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    setImportData([]);
  };

  // 统计 - 使用统一数据源
  const statsDataSource = tasks.length > 0 ? tasks : mockTasks;
  const stats = {
    total: statsDataSource.length,
    pending: statsDataSource.filter((t: any) => t.status === 'pending').length,
    inProgress: statsDataSource.filter((t: any) => t.status === 'in_progress').length,
    completed: statsDataSource.filter((t: any) => t.status === 'completed').length,
    waitingAcceptance: statsDataSource.filter((t: any) => t.status === 'waiting_acceptance').length,
    warning: statsDataSource.filter((t: any) => t.status === 'rejected').length,
  };

  // 获取任务类型图标
  const getTypeIcon = (type: string) => {
    const taskType = taskTypes.find(t => t.value === type);
    if (!taskType) return <Package className="w-4 h-4" />;
    const Icon = taskType.icon;
    return <Icon className="w-4 h-4" />;
  };

  // 获取任务类型颜色
  const getTypeColor = (type: string) => {
    const taskType = taskTypes.find(t => t.value === type);
    return taskType?.color || 'bg-gray-500';
  };

  // 获取任务类型标签
  const getTypeLabel = (type: string) => {
    const taskType = taskTypes.find(t => t.value === type);
    return taskType?.label || type;
  };

  // 计算任务截止时间
  // 农业工作时间计算逻辑：
  // - 8小时工作制：08:00-17:00（9小时实际，算8小时工时）
  // - 10小时工作制：07:00-18:00（11小时实际，算10小时工时）
  // - 12小时工作制：07:00-19:00（12小时实际，算12小时工时）
  // - estimatedDays = 完整工作日数
  // - estimatedHours = 额外小时数
  const calculateEndDateTime = (startTime: string, days: number, hours: number, workHoursPerDay: number): string => {
    if (!startTime) return '';

    // 确保 workHoursPerDay 是数字类型
    const workHours = typeof workHoursPerDay === 'number' ? workHoursPerDay : parseInt(String(workHoursPerDay), 10) || 8;

    // 解析开始时间：格式 "2026-04-17 08:00"
    const [datePart, timePart] = startTime.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hourStr] = timePart.split(':');
    const startHour = parseInt(hourStr, 10);

    // 计算总工时
    const totalHours = days * workHours + hours;
    if (totalHours === 0) return startTime;

    // 根据工作制确定每天的上班和下班时间
    let workdayStartHour: number;
    let workdayEndHour: number;
    switch (workHours) {
      case 10:
        workdayStartHour = 7;
        workdayEndHour = 18;
        break;
      case 12:
        workdayStartHour = 7;
        workdayEndHour = 19;
        break;
      case 8:
      default:
        workdayStartHour = 8;
        workdayEndHour = 17;
        break;
    }

    // 计算当天可以完成的工时数
    const hoursWorkedOnFirstDay = Math.min(workHours, workdayEndHour - startHour);

    if (totalHours <= hoursWorkedOnFirstDay) {
      // 当天可以完成
      const endHour = startHour + totalHours;
      return `${datePart} ${String(endHour).padStart(2, '0')}:00`;
    } else {
      // 需要跨天完成
      const remainingHours = totalHours - hoursWorkedOnFirstDay;
      const fullDays = Math.floor(remainingHours / workHours);
      const leftoverHours = remainingHours % workHours;

      // 计算结束日期
      const startDate = new Date(year, month - 1, day);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + fullDays);

      let endHour: number;
      if (leftoverHours > 0) {
        // 剩余小时从下一天上班时间开始
        endDate.setDate(endDate.getDate() + 1);
        endHour = workdayStartHour + leftoverHours;
      } else {
        endHour = workdayEndHour;
      }

      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');

      return `${endYear}-${endMonth}-${endDay} ${String(endHour).padStart(2, '0')}:00`;
    }
  };

  // 获取某天的任务
  const getTasksForDate = (date: Date, tasks: typeof mockTasks) => {
    return tasks.filter(task => {
      try {
        const start = parseISO(task.planStart);
        const end = parseISO(task.planEnd);
        const taskDays = eachDayOfInterval({ start, end });
        return taskDays.some(d => isSameDay(d, date));
      } catch {
        return false;
      }
    });
  };

  // 日视图组件
  const DayView: React.FC<{
    date: Date;
    tasks: typeof mockTasks;
    onSelectTask: (task: typeof mockTasks[0]) => void;
    onSelectDate: (date: Date) => void;
  }> = ({ date, tasks, onSelectTask }) => {
    const dayTasks = getTasksForDate(date, tasks);
    return (
      <div className="space-y-4">
        {dayTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
            <p>当天没有任务安排</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-4 rounded-xl border border-gray-100 hover:shadow-md cursor-pointer transition-shadow ${
                  task.status === 'completed' ? 'bg-gray-50' :
                  task.status === 'in_progress' ? 'bg-blue-50' :
                  task.status === 'pending' ? 'bg-white' :
                  task.status === 'rejected' ? 'bg-red-50' :
                  'bg-orange-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getTypeColor(task.types[0])}`}>
                      {task.types[0] && <Leaf className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{task.typeLabel || '未知类型'}</h4>
                      <p className="text-sm text-gray-500 mt-1">{task.field} · {task.crop}</p>
                      <p className="text-sm text-gray-500">{task.assignee}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    statusMap[task.status]?.bg || 'bg-gray-100'
                  } ${statusMap[task.status]?.color || 'text-gray-600'}`}>
                    {statusMap[task.status]?.label || task.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {task.planStart?.split(' ')[1] || ''} - {task.planEnd?.split(' ')[1] || ''}
                  </span>
                  <span>任务工时: {formatWorkHours((task as any).estimatedDays || 0, (task as any).estimatedHours || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // 日历拖拽处理函数
  // ============================================

  // 开始拖拽任务
  const handleDragStart = (e: React.DragEvent, task: typeof mockTasks[0]) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTask(task);
  };

  // 拖拽经过日期格子
  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  // 拖拽离开日期格子
  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  // 放下任务到新日期
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedTask) return;

    // 解析原任务的日期和时间
    const [oldDatePart, oldTimePart] = draggedTask.planStart.split(' ');
    const [endDatePart, endTimePart] = draggedTask.planEnd.split(' ');

    // 计算日期差异
    const oldDate = parseISO(oldDatePart);
    const dayDiff = Math.floor((targetDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));

    // 计算新的开始和结束日期
    const newStartDate = addDays(targetDate, 0);
    const newEndDate = addDays(targetDate, dayDiff >= 0 ? dayDiff : 0);

    // 格式化日期字符串
    const formatDateStr = (date: Date) => format(date, 'yyyy-MM-dd');
    const newPlanStart = `${formatDateStr(newStartDate)} ${oldTimePart || '08:00'}`;
    const newPlanEnd = `${formatDateStr(newEndDate)} ${endTimePart || '18:00'}`;

    // 更新任务
    setMockTasks(prev => prev.map(t =>
      t.id === draggedTask.id
        ? { ...t, planStart: newPlanStart, planEnd: newPlanEnd }
        : t
    ));

    setDraggedTask(null);
    setDragOverDate(null);
  };

  // 取消拖拽
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverDate(null);
  };

  // 周视图组件
  const WeekView: React.FC<{
    month: Date;
    tasks: typeof mockTasks;
    onSelectTask: (task: typeof mockTasks[0]) => void;
    onSelectDate: (date: Date) => void;
  }> = ({ month, tasks, onSelectTask, onSelectDate }) => {
    const weekStart = startOfWeek(month, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* 星期头部 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className={`text-center py-2 rounded-lg ${isToday(day) ? 'bg-emerald-100' : 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500">{weekDaysZh[i]}</div>
                <div className={`text-lg font-medium ${isToday(day) ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          {/* 任务网格 */}
          <div className="grid grid-cols-7 gap-2 min-h-[400px]">
            {weekDays.map((day, dayIndex) => {
              const dayTasks = getTasksForDate(day, tasks);
              const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
              return (
                <div
                  key={dayIndex}
                  onClick={() => onSelectDate(day)}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                  className={`rounded-lg p-2 min-h-[400px] cursor-pointer transition-colors ${
                    isDragOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed' :
                    isToday(day) ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="space-y-1">
                    {dayTasks.length === 0 ? (
                      <div className="text-center text-gray-300 text-xs py-4">-</div>
                    ) : (
                      dayTasks.slice(0, 5).map(task => (
                        <div
                          key={task.id}
                          draggable="true"
                          onDragStart={(e) => { handleDragStart(e, task); }}
                          onDragEnd={handleDragEnd}
                          className={`px-2 py-1 rounded text-xs text-white truncate cursor-grab active:cursor-grabbing flex items-center gap-1 group ${getTypeColor(task.types[0])}`}
                          title={`${task.typeLabel} - ${task.field}（拖拽可调整日期）`}
                        >
                          <GripVertical className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                          <span className="truncate">{task.typeLabel || '未知'}</span>
                        </div>
                      ))
                    )}
                    {dayTasks.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">+{dayTasks.length - 5} 更多</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 月视图组件
  const MonthView: React.FC<{
    month: Date;
    tasks: typeof mockTasks;
    onSelectDate: (date: Date) => void;
  }> = ({ month, tasks, onSelectDate }) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div>
        {/* 星期头部 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDaysZh.map(d => (
            <div key={d} className="text-center py-2 text-sm font-medium text-gray-500">{d}</div>
          ))}
        </div>
        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayTasks = getTasksForDate(day, tasks);
            const isCurrentMonth = isSameMonth(day, month);
            const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
            return (
              <div
                key={i}
                onClick={() => onSelectDate(day)}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
                className={`min-h-[80px] p-2 rounded-lg cursor-pointer transition-colors ${
                  isDragOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed' :
                  !isCurrentMonth ? 'bg-gray-50 text-gray-300' :
                  isToday(day) ? 'bg-emerald-100 hover:bg-emerald-200' :
                  'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      draggable="true"
                      onDragStart={(e) => { handleDragStart(e, task); }}
                      onDragEnd={handleDragEnd}
                      className={`px-1 py-0.5 rounded text-xs text-white truncate cursor-grab active:cursor-grabbing flex items-center gap-0.5 group ${getTypeColor(task.types[0])}`}
                      title={`${task.typeLabel} - ${task.field}（拖拽可调整日期）`}
                    >
                      <GripVertical className="w-2.5 h-2.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      <span className="truncate">{task.typeLabel || '未知'}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayTasks.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 处理创建任务
  // publish为true时直接发布（pending），false时保存为草稿（draft）
  // dispatchMode 为 'ai_assisted' 且未选择执行人时，设置为 'pending_ai' 状态
  const handleCreateTask = (publish: boolean = true) => {
    const typeLabels = newTask.types.map(t => getTypeLabel(t)).join(',');
    // 处理任务区域：如果是"其他"则使用备注，否则使用选择的区域
    const fieldValue = newTask.fields?.includes('other')
      ? newTask.areaRemarks
      : (newTask.fields?.join(',') || '');
    // 处理作物：如果是"其他"则使用备注，否则使用选择的作物
    const cropValue = newTask.crops?.includes('other')
      ? newTask.cropRemarks
      : (newTask.crops?.join(',') || '');
    // ========== 数据闭环：同步到 useTasks（先调用，获取返回的 ID）==========
    // 查找执行人
    const assigneeStaff = staff.find(s => s.name === newTask.assignee);
    // 确保执行人信息完整：如果 newTask.assignee 有值，就一定保存
    const finalAssigneeName = newTask.assignee || '';
    // 基于执行人姓名生成一个稳定的ID
    const finalAssigneeId = finalAssigneeName
      ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}`
      : '';

    // 查找派发人信息（默认使用系统管理员 U001）
    // TODO: 后续可接入登录系统，获取实际当前登录用户
    const defaultDispatcher = users.find(u => u.id === 'U001');
    const assignerId = defaultDispatcher?.id || 'U001';
    const assignerName = defaultDispatcher?.name || '张建国';

    // 根据 fieldValue 查找对应的 greenhouseId
    // 匹配逻辑：fieldValue 可能是 "1号棚,2号棚" 格式，直接从 taskDispatchFields 精确匹配
    const firstFieldName = fieldValue.split(',')[0]?.trim() || '';
    const matchedField = taskDispatchFields.find(f => f.name === firstFieldName);
    const greenhouseId = matchedField?.id?.toString() || '';

    // 计算任务工时
    const estimatedHours = ((newTask.estimatedDays || 0) * (newTask.workHoursPerDay || 8)) + (newTask.estimatedHours || 0);
    // 计算计划结束时间
    const planEndTime = calculateEndDateTime(
      newTask.planStart,
      newTask.estimatedDays || 0,
      newTask.estimatedHours || 0,
      newTask.workHoursPerDay || 8
    );

    // 根据派发模式确定任务状态
    // AI辅助模式且未选择执行人时，设置为 pending_ai（待AI推荐）
    // 否则根据 publish 参数设置为 pending 或 draft
    let taskStatus: 'pending' | 'draft' | 'pending_ai' = 'draft';
    if (publish) {
      if (dispatchMode === 'ai_assisted' && !assignedTo) {
        taskStatus = 'pending_ai';  // 待AI推荐
      } else {
        taskStatus = 'pending';  // 直接派发
      }
    } else {
      taskStatus = 'draft';  // 保存草稿
    }

    // 先调用 createTask 获取 useTasks 生成的任务对象（包含生成的任务ID）
    const task = createTask({
      title: typeLabels || '农事任务',
      type: newTask.types[0] || 'other',
      typeName: typeLabels,
      batchId: newTask.batchId,  // 关联生产批次
      batchCode: newTask.batchCode,  // 关联生产批次编号
      greenhouseId: greenhouseId,
      greenhouseName: fieldValue,
      cropName: cropValue,
      priority: (newTask.priority as 'urgent' | 'high' | 'normal') || 'normal',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
      assignerId: assignerId,  // 派发人ID
      assignerName: assignerName,  // 派发人名称
      dueDate: planEndTime?.split(' ')[0] || '',
      estimatedDays: newTask.estimatedDays || 0,
      estimatedHours: estimatedHours,
      description: newTask.sopContent || '',
      remarks: newTask.remarks || '',
      sourceType: 'dispatch',
      materials: newTask.materials,
      requiredFeedback: newTask.requiredFeedback,
      typeConfig: newTask.typeConfig || {},
      tools: newTask.tools || [],
      toolsRemarks: newTask.toolsRemarks || '',
      // 根据派发模式设置状态
      status: taskStatus,
      // ========== 兼容旧界面字段 ==========
      types: newTask.types,
      typeLabel: typeLabels,
      field: fieldValue,
      assignee: newTask.assignee,
      crop: cropValue,
      planStart: newTask.planStart,
      planEnd: planEndTime,
      sopContent: newTask.sopContent || '',
      // AI派工相关字段
      dispatchMode: dispatchMode,
      aiConfidenceScore: aiConfidenceScore,
      submitToAiAt: dispatchMode === 'ai_assisted' && !assignedTo ? new Date().toISOString() : undefined,
    });

    // 用 useTasks 返回的任务 ID 同步更新 mockTasks（保持 ID 一致）
    const newTaskData = {
      id: task.id,  // 使用 useTasks 返回的 ID，保持两个系统 ID 一致
      types: newTask.types,
      typeLabel: typeLabels,  // 任务类型显示名称
      typeConfig: newTask.typeConfig || {},
      field: fieldValue,
      crop: cropValue,
      assignee: newTask.assignee,
      planStart: newTask.planStart,
      planEnd: planEndTime,
      sopContent: newTask.sopContent || '',
      remarks: newTask.remarks || '',
      toolsRemarks: newTask.toolsRemarks || '',
      tools: newTask.tools || [],
      materials: newTask.materials || [],
      progress: 0,
      status: taskStatus,  // 使用 taskStatus 变量
      priority: newTask.priority,
    };
    setMockTasks(prev => [...prev, newTaskData]);

    // ========== 数据闭环：同步到 useOperationRecords ==========
    if (task) {
      // 根据任务状态生成备注信息
      let recordRemarks = '';
      if (taskStatus === 'pending_ai') {
        recordRemarks = '任务已提交，等待AI智能推荐执行人';
      } else if (taskStatus === 'pending') {
        recordRemarks = '任务已派发，等待执行人接受';
      } else {
        recordRemarks = '任务已保存为草稿';
      }

      addTaskRecord({
        operationType: newTask.types[0] || 'other',
        operationTypeName: typeLabels,
        status: taskStatus,
        greenhouseId: greenhouseId,  // 使用查找到的 greenhouseId
        greenhouseName: fieldValue,
        cropName: cropValue,
        operatorId: assigneeStaff?.id?.toString() || '',
        operatorName: newTask.assignee,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: task.id,
        sourceCode: task.taskCode,
        progress: 0,
        remarks: recordRemarks,
      });
    }

    console.log(publish ? '创建并发布任务:' : '保存草稿任务:', newTaskData, '已同步到数据闭环');
    setShowCreateModal(false);
    setCreateStep(1);
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
      workHoursPerDay: 8,
    });
    // 重置派工相关状态
    setDispatchMode('manual');
    setAssignedTo(null);
    setAiConfidenceScore(null);
    setAiRecommendations([]);
  };

  // 任务类型变化时自动加载SOP（多选版本，保留）
  const handleTypeChange = (type: string) => {
    setNewTask({ ...newTask, types: [type], sopContent: sopTemplates[type] || '' });
  };

  // 导出相关处理
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    // 计算可选择的任务索引（根据当前模式过滤）
    const selectableIndexes = filteredTasks
      .map((task, index) => {
        if (exportMode) return index;
        if (batchEditMode) return EDITABLE_STATUSES.includes(task.status) ? index : -1;
        if (batchDeleteMode) return DELETABLE_STATUSES.includes(task.status) ? index : -1;
        return -1;
      })
      .filter(idx => idx !== -1);

    // 检查是否已全选可选项
    const allSelected = selectableIndexes.length > 0 && selectableIndexes.every(idx => selectedRows.includes(idx));

    if (allSelected) {
      // 取消全选（只移除可选项）
      setSelectedRows(selectedRows.filter(idx => !selectableIndexes.includes(idx)));
    } else {
      // 全选可选项
      setSelectedRows([...new Set([...selectedRows, ...selectableIndexes])]);
    }
  };

  const handleSelectRow = (index: number) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(rowIndex => rowIndex !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  // 表格全选回调 - 使用全局索引
  const handleTableSelectAll = useCallback(() => {
    if (filteredTasks.length === 0) return;

    // 计算当前页的任务索引（全局索引）
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredTasks.length);
    const currentPageIndexes: number[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      currentPageIndexes.push(i);
    }

    // 筛选可编辑的任务（批量编辑模式）
    let selectableIndexes: number[];
    if (batchEditMode) {
      selectableIndexes = currentPageIndexes.filter(idx => {
        const task = filteredTasks[idx];
        return task && EDITABLE_STATUSES.includes(task.status);
      });
    } else {
      selectableIndexes = currentPageIndexes;
    }

    // 检查当前页是否已全选（使用全局索引）
    const allSelected = selectableIndexes.length > 0 &&
      selectableIndexes.every(idx => selectedRows.includes(idx));

    if (allSelected) {
      // 取消全选 - 移除当前页的索引
      setSelectedRows(prev => prev.filter(idx => !selectableIndexes.includes(idx)));
    } else {
      // 全选 - 添加当前页的索引
      setSelectedRows(prev => [...new Set([...prev, ...selectableIndexes])]);
    }
  }, [filteredTasks, selectedRows, batchEditMode, currentPage, pageSize]);

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleActualExport = () => {
    handleDoExport();
  };

  const handleDoExport = async () => {
    const selectedData = filteredTasks.filter((_, index) => selectedRows.includes(index));
    const headers = ['任务ID', '任务类型', '任务区域', '作物', '批次', '执行人', '进度', '优先级', '状态', '备注', '作业标准', '计划开始时间', '计划结束时间', '任务工时'];
    const exportData = selectedData.map(task => ({
      '任务ID': task.id,
      '任务类型': task.typeLabel || '未知类型',
      '任务区域编号': task.field,
      '作物': task.crop,
      '执行人': task.assignee,
      '计划开始时间': task.planStart,
      '计划结束时间': task.planEnd,
      '进度': `${task.progress}%`,
      '状态': statusMap[task.status]?.label || task.status,
      '优先级': priorityMap[task.priority]?.label || task.priority
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'xlsx' || exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `农事任务派发_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader />

      {/* 实时监控看板 */}
      <StatsCards stats={stats} />

      {/* 顶部操作栏 */}
      <FilterToolbar
        taskIdSearch={taskIdSearch}
        timeFilter={timeFilter}
        fieldFilter={fieldFilter}
        assigneeFilter={assigneeFilter}
        statusFilter={statusFilter}
        fields={fields}
        staff={staff}
        viewMode={viewMode}
        exportMode={exportMode}
        onTaskIdChange={setTaskIdSearch}
        onTimeFilterChange={setTimeFilter}
        onFieldFilterChange={setFieldFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={handleResetFilters}
        onImport={() => setShowImportModal(true)}
        onSmartRecommend={generateRecommendations}
        onViewModeChange={setViewMode}
      />

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <TaskTable
          tasks={filteredTasks}
          currentPage={currentPage}
          pageSize={pageSize}
          selectedRows={selectedRows}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          canRemind={canRemind}
          sendReminder={sendReminder}
          onSelectRow={(index) => {
            setSelectedRows(prev => {
              if (prev.includes(index)) {
                return prev.filter(i => i !== index);
              } else {
                return [...prev, index];
              }
            });
          }}
          onSelectAll={handleTableSelectAll}
          onExport={() => setExportMode(true)}
          onViewDetail={(task) => {
            setSelectedTask(task);
            setShowDetailModal(true);
          }}
          onViewSop={(task) => {
            setSelectedSopTask(task);
            setShowSopModal(true);
          }}
          onAccept={(task) => {
            setAcceptanceTask(task);
            setShowAcceptanceModal(true);
          }}
          onWithdraw={(task) => {
            setWithdrawCancelType('withdraw');
            setWithdrawCancelTask(task);
            setShowWithdrawCancelModal(true);
          }}
          onCancel={(task) => {
            setWithdrawCancelType('cancel');
            setWithdrawCancelTask(task);
            setShowWithdrawCancelModal(true);
          }}
          onOvertime={(task) => {
            setOvertimeTask(task);
            setShowOvertimeModal(true);
          }}
          onContinue={(taskId) => {
            continueExecution(taskId);
          }}
          onReassign={(task) => {
            setReassignModalTask(task);
            setShowReassignModal(true);
          }}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onConfirmExport={handleConfirmExport}
          onCancelExport={handleCancelExport}
          onBatchEdit={() => {
            // 进入批量编辑模式，清空选择
            setBatchEditMode(true);
            setSelectedRows([]);
          }}
          onConfirmBatchEdit={() => {
            // 打开批量编辑弹窗
            setShowBatchEditModal(true);
          }}
          onCancelBatchEdit={() => {
            setBatchEditMode(false);
            setShowBatchEditModal(false);
            setSelectedRows([]);
          }}
          onBatchDelete={() => { setBatchDeleteMode(true); setSelectedRows([]); }}
          onCreate={() => setShowCreateModal(true)}
        />
      )}


      {/* 日历视图 */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 日历头部导航 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (calendarViewType === 'day') setCalendarMonth(d => subWeeks(d, 1));
                  else if (calendarViewType === 'week') setCalendarMonth(d => subWeeks(d, 1));
                  else setCalendarMonth(d => subMonths(d, 1));
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                {calendarViewType === 'day' && selectedDate && format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                {calendarViewType === 'week' && format(calendarMonth, 'yyyy年MM月')}
                {calendarViewType === 'month' && format(calendarMonth, 'yyyy年MM月')}
              </h2>
              <button
                onClick={() => {
                  if (calendarViewType === 'day') setCalendarMonth(d => addWeeks(d, 1));
                  else if (calendarViewType === 'week') setCalendarMonth(d => addWeeks(d, 1));
                  else setCalendarMonth(d => addMonths(d, 1));
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setCalendarMonth(new Date());
                  setSelectedDate(new Date());
                }}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                今天
              </button>
            </div>
            {/* 视图切换 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCalendarViewType(type)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    calendarViewType === type
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type === 'day' ? '日' : type === 'week' ? '周' : '月'}
                </button>
              ))}
            </div>
          </div>

          {/* 日视图 */}
          {calendarViewType === 'day' && selectedDate && (
            <DayView
              date={selectedDate}
              tasks={mockTasks}
              onSelectTask={(task) => { setSelectedTask(task); setShowDetailModal(true); }}
              onSelectDate={setSelectedDate}
            />
          )}

          {/* 周视图 */}
          {calendarViewType === 'week' && (
            <WeekView
              month={calendarMonth}
              tasks={mockTasks}
              onSelectTask={(task) => { setSelectedTask(task); setShowDetailModal(true); }}
              onSelectDate={(date) => { setSelectedDate(date); setCalendarViewType('day'); }}
            />
          )}

          {/* 月视图 */}
          {calendarViewType === 'month' && (
            <MonthView
              month={calendarMonth}
              tasks={mockTasks}
              onSelectDate={(date) => { setSelectedDate(date); setCalendarMonth(date); setCalendarViewType('week'); }}
            />
          )}
        </div>
      )}

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
            {createStep === 3 ? (
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
        {/* 错误提示 */}
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
              <span className="text-sm font-medium">资源与人员</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4">
              <div className={`h-full bg-emerald-500 transition-all ${createStep >= 3 ? 'w-full' : 'w-0'}`} />
                </div>
                <div className={`flex items-center gap-2 ${createStep >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep >= 3 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>3</div>
                  <span className="text-sm font-medium">时间与要求</span>
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
                          onClick={() => setNewTask({ ...newTask, taskId: autoGenerateTaskCode() })}
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
                            {cropBatches.filter(b =>
                              !newTask.batchCode ||
                              b.batchCode.toLowerCase().includes(newTask.batchCode.toLowerCase()) ||
                              b.cropName.includes(newTask.batchCode)
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">未找到匹配的批次</div>
                            )}
                          </div>
                        )}
                        {showBatchDropdown && (
                          <div
                            className="fixed inset-0 z-0"
                            onClick={() => setShowBatchDropdown(false)}
                          />
                        )}
                      </div>
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
                            const field = fields.find(f => f.name === fieldValue);
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
                            {['1号棚', '2号棚', '3号棚', '4号棚', '5号棚', '6号棚'].map(name => (
                              <label
                                key={name}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={(newTask.fields || []).includes(name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewTask({ ...newTask, fields: [...(newTask.fields || []), name] });
                                    } else {
                                      setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== name) });
                                    }
                                  }}
                                  className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span className="text-sm text-gray-700">{name}</span>
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
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setShowFieldDropdown(false)}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        作物 <span className="text-red-500">*</span>
                        {newTask.fields && newTask.fields.length > 0 && !newTask.fields.includes('other') && (
                          <span className="ml-2 text-xs text-emerald-600 font-normal">
                            （根据 {newTask.fields.join(', ')} 自动获取）
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <div
                          className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                          onClick={() => setShowCropDropdown(!showCropDropdown)}
                        >
                          {(!newTask.crops || newTask.crops.length === 0) && (
                            <span className="text-gray-400 text-sm">
                              {newTask.fields && newTask.fields.length > 0 && !newTask.fields.includes('other')
                                ? '请选择作物'
                                : '请先选择任务区域'}
                            </span>
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
                            {/* 显示作物来源提示 */}
                            {newTask.fields && newTask.fields.length > 0 && !newTask.fields.includes('other') && (
                              <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700">
                                基于区域 [{newTask.fields.join(', ')}] 的作物选项
                              </div>
                            )}
                            {/* 根据选择的区域获取作物 */}
                            {(() => {
                              // 根据选择的区域获取作物列表
                              const selectedFields = newTask.fields?.filter(f => f !== 'other') || [];
                              const availableCrops = selectedFields.length > 0
                                ? [...new Set(fields.filter(f => selectedFields.includes(f.name)).map(f => f.crop))]
                                : Object.keys(cropStages);
                              return availableCrops.map(crop => (
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
                              ));
                            })()}
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
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setShowCropDropdown(false)}
                        />
                      )}
                    </div>
                  </div>
                  {newTask.fields?.includes('other') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">区域备注 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newTask.areaRemarks || ''}
                        onChange={(e) => setNewTask({ ...newTask, areaRemarks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="请输入工作区域说明"
                      />
                    </div>
                  )}
                  {newTask.crops?.includes('other') && (
                    <div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务类型 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div
                        className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                        onClick={() => setShowTaskTypeDropdown(!showTaskTypeDropdown)}
                      >
                        {newTask.types.length === 0 && (
                          <span className="text-gray-400 text-sm">请选择任务类型</span>
                        )}
                        {newTask.types.map(typeValue => {
                          const type = taskTypes.find(t => t.value === typeValue);
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
                          {taskTypes.map(t => (
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
                    {/* 点击空白处关闭下拉框 */}
                    {showTaskTypeDropdown && (
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowTaskTypeDropdown(false)}
                      />
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
                  {/* 任务类型配置面板 */}
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

              {/* Step 2: 资源与人员 */}
              {createStep === 2 && (
                <div className="space-y-4">
                  {/* 执行人选择模式切换 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">指派方式 <span className="text-red-500">*</span></label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dispatchMode"
                          value="manual"
                          checked={dispatchMode === 'manual'}
                          onChange={() => {
                            setDispatchMode('manual');
                            setAssignedTo(null);
                            setAiConfidenceScore(null);
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">👤 手动选择</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dispatchMode"
                          value="ai_assisted"
                          checked={dispatchMode === 'ai_assisted'}
                          onChange={() => {
                            setDispatchMode('ai_assisted');
                            setAssignedTo(null);
                            setAiConfidenceScore(null);
                            // 切换到AI辅助模式时获取推荐
                            setTimeout(() => fetchAIRecommendations(), 0);
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">🤖 待智能推荐</span>
                      </label>
                    </div>
                  </div>

                  {/* 执行人选择区域 */}
                  {dispatchMode === 'manual' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">执行人 <span className="text-red-500">*</span></label>
                      <select
                        value={newTask.assignee}
                        onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">请选择执行人</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.status === 'available' ? '空闲' : s.status === 'busy' ? '工作中' : '休息中'})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">智能推荐</label>
                      <AIRecommendationPanel
                        taskInfo={{
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
                        }}
                        recommendations={aiRecommendations}
                        onWorkerSelect={(workerId, score) => {
                          setAssignedTo(workerId);
                          setAiConfidenceScore(score);
                          // 同步更新 newTask.assignee 为选中的人员姓名
                          const selectedWorker = staff.find(s => s.id.toString() === workerId);
                          if (selectedWorker) {
                            setNewTask({ ...newTask, assignee: selectedWorker.name });
                          }
                        }}
                        onManualSelect={() => setDispatchMode('manual')}
                        config={{ defaultSelectTop: true }}
                        selectedWorkerId={assignedTo || undefined}
                      />
                      {aiConfidenceScore !== null && (
                        <p className="mt-2 text-sm text-emerald-600">
                          当前选中执行人置信度：{aiConfidenceScore}分
                        </p>
                      )}
                    </div>
                  )}
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
                  {/* 资源与人员备注 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                    <textarea
                      value={newTask.toolsRemarks || ''}
                      onChange={(e) => setNewTask({ ...newTask, toolsRemarks: e.target.value })}
                      placeholder="补充说明资源与人员相关要求"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: 时间与要求 */}
              {createStep === 3 && (
                <div className="space-y-4">
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

      {/* 任务详情弹窗 */}
      <Modal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => setShowDetailModal(false)}
        title={`任务详情 - ${selectedTask?.id || ''}`}
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-2">
            {selectedTask?.status === 'waiting_acceptance' && (
              <>
                <button
                  onClick={() => {
                    setAcceptanceTask(selectedTask);
                    setShowAcceptanceModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
                >
                  验收
                </button>
              </>
            )}
          </div>
        }
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{selectedTask.field}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{selectedTask.crop}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">执行人</label>
                  <p className="font-semibold text-gray-900">{selectedTask.assignee}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[selectedTask.priority]?.color || ''}`}>
                    {priorityMap[selectedTask.priority]?.label || selectedTask.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* 任务类型 - 单一类型显示详细信息，多类型显示SOP下载 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型配置</h4>
              {selectedTask.types.length === 1 ? (
                // 单一任务类型 - 显示详细配置（只读）
                <TaskTypeConfigDisplay
                  taskType={selectedTask.types[0]}
                  configValues={selectedTask.typeConfig || {}}
                />
              ) : (
                // 多任务类型 - 显示SOP信息
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">作业标准文件</span>
                  </div>
                  {selectedTask.sopContent ? (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-sm text-gray-600 mb-2">已导入SOP文档</p>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          // 创建Blob下载
                          const blob = new Blob([selectedTask.sopContent || ''], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `任务SOP_${selectedTask.id}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        下载SOP文件
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">暂无SOP文件</p>
                  )}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">已选择的操作类型：</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.types.map(t => {
                        const typeInfo = taskTypes.find(tt => tt.value === t);
                        return (
                          <span
                            key={t}
                            className={`px-2 py-1 rounded text-xs text-white ${typeInfo?.color || 'bg-gray-500'}`}
                          >
                            {typeInfo?.label || t}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 所需物资 */}
            {selectedTask.materials && selectedTask.materials.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需物资</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="text-left pb-2">物资名称</th>
                        <th className="text-right pb-2">数量</th>
                        <th className="text-right pb-2">单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTask.materials.map((m, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-gray-900">{m.name}</td>
                          <td className="py-2 text-gray-900 text-right">{m.qty}</td>
                          <td className="py-2 text-gray-500 text-right">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 所需工具 */}
            {(selectedTask.tools && selectedTask.tools.length > 0) || selectedTask.toolsRemarks ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需工具</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {selectedTask.tools && selectedTask.tools.length > 0 ? (
                    <table className="w-full text-sm mb-2">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left pb-2">工具名称</th>
                          <th className="text-right pb-2">数量</th>
                          <th className="text-right pb-2">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTask.tools.map((t, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 text-gray-900">{t.name}</td>
                            <td className="py-2 text-gray-900 text-right">{t.qty}</td>
                            <td className="py-2 text-gray-500 text-right">{t.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">暂无所需工具</p>
                  )}
                  {/* 工具备注 */}
                  {selectedTask.toolsRemarks && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">备注：</p>
                      <p className="text-sm text-gray-900">{selectedTask.toolsRemarks}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planStart}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planEnd}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status]?.bg || ''} ${statusMap[selectedTask.status]?.color || ''}`}>
                      {statusMap[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">预计时长</label>
                  <p className="font-semibold text-gray-900">
                    {selectedTask.estimatedDays > 0 ? `${selectedTask.estimatedDays}天` : ''}
                    {selectedTask.estimatedHours > 0 ? `${selectedTask.estimatedHours}小时` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* 实际完成工作量 */}
            {(() => {
              // 汇总任务记录中的实际完成工作量
              const calculateActualWorkload = () => {
                let totalDays = 0;
                let totalHours = 0;
                let totalWorkers = 0;
                const records = getTaskRecordsByTaskId(selectedTask?.id);
                records.forEach(record => {
                  if (record.feedback) {
                    if (record.feedback.workloadDays) totalDays += record.feedback.workloadDays;
                    if (record.feedback.workloadHours) totalHours += record.feedback.workloadHours;
                    if (record.feedback.workers && record.feedback.workers > totalWorkers) totalWorkers = record.feedback.workers;
                  }
                });
                return { days: totalDays, hours: totalHours, workers: totalWorkers };
              };
              const actualWorkload = calculateActualWorkload();
              const hasActualWorkload = actualWorkload.days > 0 || actualWorkload.hours > 0;
              if (!hasActualWorkload) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">实际完成工作量</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-green-600">实际工日</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.days > 0 ? `${actualWorkload.days}天` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-green-600">实际工时</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.hours > 0 ? `${actualWorkload.hours}小时` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-green-600">作业人数</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.workers > 0 ? `${actualWorkload.workers}人` : '-'}
                        </p>
                      </div>
                    </div>
                    {selectedTask.estimatedDays !== undefined && selectedTask.estimatedHours !== undefined && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-green-600">
                          预估总工时：{(selectedTask.estimatedDays * 8 + selectedTask.estimatedHours)}小时 → 实际总工时：{actualWorkload.days * 8 + actualWorkload.hours}小时
                          {actualWorkload.days * 8 + actualWorkload.hours > 0 && (
                            <span className={`ml-2 ${actualWorkload.days * 8 + actualWorkload.hours > selectedTask.estimatedDays * 8 + selectedTask.estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                              ({actualWorkload.days * 8 + actualWorkload.hours > selectedTask.estimatedDays * 8 + selectedTask.estimatedHours ? '超出' : '节省'}
                              {Math.abs((actualWorkload.days * 8 + actualWorkload.hours) - (selectedTask.estimatedDays * 8 + selectedTask.estimatedHours)).toFixed(1)}小时)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 必填反馈 */}
            {selectedTask.requiredFeedback && selectedTask.requiredFeedback.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">必填反馈</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.requiredFeedback.map(fb => (
                    <span key={fb} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {fb === 'gps' && '位置打卡'}
                      {fb === 'material' && '物资扫码'}
                      {fb === 'photo_before' && '作业前照片'}
                      {fb === 'photo_after' && '作业后照片'}
                      {fb === 'voice' && '语音备注'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 进度 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${selectedTask.progress === 100 ? 'bg-green-500' : selectedTask.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{selectedTask.progress}%</span>
              </div>
            </div>

            {/* 执行反馈记录 */}
            {(() => {
              // 首先尝试用 selectedTask.id 查询
              let taskRecords = getTaskRecordsByTaskId(selectedTask?.id);
              // 如果查询结果为空，且 selectedTask 有 taskCode 或 taskCode 字段，则尝试用 taskCode 匹配
              // 解决 ID 格式不一致（如旧格式 20260415-001 与新格式 NS20260418-001 不匹配）的问题
              if (taskRecords.length === 0) {
                const searchCode = selectedTask?.taskCode || selectedTask?.id;
                const matchedTask = tasks.find(t => t.taskCode === searchCode || t.id === searchCode);
                if (matchedTask) {
                  taskRecords = getTaskRecordsByTaskId(matchedTask.id);
                }
              }
              if (taskRecords.length === 0) return null;
              // 按时间倒序
              const sortedRecords = [...taskRecords].sort(
                (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
              );
              return (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">执行反馈记录</h4>
                  <div className="space-y-3">
                    {sortedRecords.map((record, index) => {
                      const actionConfig = TASK_ACTION_CONFIG[record.action];
                      const statusConfig = record.toStatus ? TASK_STATUS_CONFIG[record.toStatus] : null;
                      const isLatest = index === 0;
                      return (
                        <div
                          key={record.id}
                          className={`relative pl-6 pb-4 ${
                            index !== sortedRecords.length - 1 ? 'border-l-2 border-gray-200' : ''
                          }`}
                        >
                          {/* 时间线节点 */}
                          <div
                            className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                              isLatest ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}
                          />
                          {/* 记录内容 */}
                          <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    actionConfig?.bg || 'bg-gray-100'
                                  } ${actionConfig?.color || 'text-gray-600'}`}
                                >
                                  {actionConfig?.label || record.action}
                                </span>
                                {record.fromStatus && (
                                  <>
                                    <span className="text-gray-400 text-xs">→</span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        statusConfig?.bg || 'bg-gray-100'
                                      } ${statusConfig?.color || 'text-gray-600'}`}
                                    >
                                      {statusConfig?.label || record.toStatus}
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(record.actionTime).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {/* 操作人 */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <User className="w-3 h-3" />
                              <span>{record.operatorName}</span>
                            </div>
                            {/* 进度信息 */}
                            {record.progress !== undefined && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <FileText className="w-3 h-3" />
                                <span>
                                  进度：{record.progress}%
                                  {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                                    <span className="text-emerald-600 ml-1">
                                      (+{record.progressIncrement}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {/* 反馈内容 */}
                            {record.feedback && (
                              <div className="mt-3 space-y-2">
                                {record.feedback.text && (
                                  <div className="bg-blue-50 rounded p-2 text-sm">
                                    <p className="text-gray-700">{record.feedback.text}</p>
                                  </div>
                                )}
                                {record.feedback.images && record.feedback.images.length > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    {record.feedback.images.map((img, i) => (
                                      <div
                                        key={i}
                                        className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"
                                      >
                                        <Camera className="w-6 h-6 text-gray-400" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {record.feedback.gpsLocation && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-3 h-3" />
                                    <span>
                                      GPS: {record.feedback.gpsLocation.lat.toFixed(4)},{' '}
                                      {record.feedback.gpsLocation.lng.toFixed(4)}
                                    </span>
                                  </div>
                                )}
                                {record.feedback.voiceNote && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mic className="w-3 h-3" />
                                    <span>语音备注</span>
                                  </div>
                                )}
                                {record.feedback.materials && record.feedback.materials.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">物料使用：</span>
                                    {record.feedback.materials.map((m, mi) => (
                                      <span key={mi} className="ml-1">
                                        {m.name}({m.qty}{m.unit})
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* 工作量确认 */}
                                {(record.feedback.workloadDays !== undefined || record.feedback.workloadHours !== undefined || record.feedback.workers !== undefined) && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">工作量确认：</span>
                                    {record.feedback.workloadDays !== undefined && `${record.feedback.workloadDays}天`}
                                    {record.feedback.workloadHours !== undefined && `${record.feedback.workloadHours}小时`}
                                    {record.feedback.workers !== undefined && `×${record.feedback.workers}人`}
                                  </div>
                                )}
                                {/* 物资编码 */}
                                {record.feedback.materialCode && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">物资编码：</span>
                                    {record.feedback.materialCode}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* SOP文件查看弹窗 */}
      <Modal
        isOpen={showSopModal}
        onClose={() => setShowSopModal(false)}
        title={`作业标准文件 - ${selectedSopTask?.id || ''}`}
        size="lg"
        showFooter={false}
        bottomContent={
          <div className="flex justify-between">
            <button
              onClick={() => {
                if (selectedSopTask?.sopContent) {
                  const blob = new Blob([selectedSopTask.sopContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `任务SOP_${selectedSopTask.id}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载文件
            </button>
            <button
              onClick={() => setShowSopModal(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        }
      >
        {selectedSopTask && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">任务类型：</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedSopTask.types.map(t => {
                  const typeInfo = taskTypes.find(tt => tt.value === t);
                  return (
                    <span
                      key={t}
                      className={`px-2 py-1 rounded text-xs text-white ${typeInfo?.color || 'bg-gray-500'}`}
                    >
                      {typeInfo?.label || t}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{selectedSopTask.sopContent || '暂无SOP内容'}</pre>
            </div>
          </div>
        )}
      </Modal>

      {/* 智能推荐模态框 */}
      {showRecommendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ transform: recommendModalMaximized ? 'none' : undefined }}>
          <div
            ref={recommendModalRef}
            className="bg-white rounded-xl shadow-2xl flex flex-col"
            style={{
              position: recommendModalMaximized ? 'fixed' : 'relative',
              left: recommendModalMaximized ? 20 : undefined,
              top: recommendModalMaximized ? 20 : undefined,
              width: recommendModalMaximized ? `calc(100vw - 40px)` : recommendModalSize.width,
              height: recommendModalMaximized ? `calc(100vh - 40px)` : recommendModalSize.height,
              maxWidth: 'none',
              transform: recommendModalMaximized ? 'none' : `translate(${recommendModalPosition.x}px, ${recommendModalPosition.y}px)`,
              minWidth: 800,
              minHeight: 500,
            }}
          >
            {/* 顶部标题栏 - emerald配色，可拖动 */}
            <div
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-t-xl flex items-center justify-between cursor-move flex-shrink-0"
              onMouseDown={handleRecommendModalDragStart}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">智能推荐结果</h3>
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                  {recommendationStats.total} 条推荐
                </span>
                {recommendationStats.urgent > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                    {recommendationStats.urgent} 条紧急
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleRecommendModalMaximize}
                  className="p-1.5 hover:bg-white/20 rounded text-white/90 hover:text-white transition-colors"
                  title={recommendModalMaximized ? '还原' : '最大化'}
                >
                  {recommendModalMaximized ? <Minimize2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setSelectedRecommendations([]);
                    setShowRecommendModal(false);
                    setRecommendModalMaximized(false);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded text-white/90 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无推荐任务</p>
                  <p className="text-gray-400 text-sm mt-1">所有任务区域任务安排合理，无需额外推荐</p>
                </div>
              ) : (
                <>
                  {/* 刷新推荐按钮 */}
                  <div className="mb-4 flex items-center">
                    <button
                      onClick={refreshRecommendations}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      刷新推荐
                    </button>
                  </div>

                  {/* 表格 */}
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-sm font-semibold w-12" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRecommendations.length === recommendations.length && recommendations.length > 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              e.target.checked ? handleSelectAllRecommendations() : handleSelectNoneRecommendations();
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">来源</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">批次</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">推荐任务</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">推荐人</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">匹配度</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">建议日期</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">评分</th>
                        <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {recommendations.map(rec => (
                        <tr
                          key={rec.id}
                          onClick={() => handleToggleRecommendation(rec.id)}
                          className={`hover:bg-blue-100 cursor-pointer transition-colors ${
                            rec.priority === 'high' ? 'bg-red-50' : rec.priority === 'medium' ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRecommendations.includes(rec.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleRecommendation(rec.id);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-3">
                            {/* 来源类型标签 */}
                            {rec.sourceType === 'env_alert' && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded" title={rec.sourceDescription}>
                                🔥环境
                              </span>
                            )}
                            {rec.sourceType === 'pest_alert' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded" title={rec.sourceDescription}>
                                🐛病虫害
                              </span>
                            )}
                            {rec.sourceType === 'stage_task' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded" title={rec.sourceDescription}>
                                🌱阶段
                              </span>
                            )}
                            {rec.sourceType === 'periodic' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded" title={rec.sourceDescription}>
                                📅周期
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{rec.greenhouse}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{rec.crop}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{rec.batchCode || '-'}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {rec.recommendedTasks.map((task, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-xs rounded"
                                >
                                  {task}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            <div>{rec.assignee}</div>
                            {rec.alternatives.length > 0 && (
                              <div className="text-xs text-gray-400">
                                备选: {rec.alternatives.slice(0, 2).map(a => a.name).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={`font-medium ${
                              rec.matchScore >= 80 ? 'text-green-600' :
                              rec.matchScore >= 60 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {rec.matchScore}分
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            <div>{rec.suggestedDate}</div>
                            {rec.latestDate !== rec.suggestedDate && (
                              <div className="text-xs text-red-500">
                                最晚: {rec.latestDate}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={`font-medium ${
                              rec.priorityScore >= 80 ? 'text-red-600' :
                              rec.priorityScore >= 60 ? 'text-orange-600' : 'text-gray-600'
                            }`}>
                              {rec.priorityScore}分
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {rec.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                高
                              </span>
                            )}
                            {rec.priority === 'medium' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                中
                              </span>
                            )}
                            {rec.priority === 'low' && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                低
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 详细原因展示 */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">推荐详情</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recommendations.filter(rec => selectedRecommendations.includes(rec.id)).map(rec => (
                        <div key={rec.id} className="bg-emerald-50 rounded-lg p-3 text-sm border border-emerald-100">
                          <div className="font-medium text-emerald-800 mb-1">
                            {rec.greenhouse} - {rec.crop}
                          </div>
                          <div className="text-emerald-600 text-xs mb-2">{rec.sourceDescription}</div>
                          <div className="space-y-1">
                            <div className="flex items-start">
                              <span className="text-emerald-600 w-16 flex-shrink-0">原因:</span>
                              <span className="text-gray-700">{rec.reason}</span>
                            </div>
                            {rec.reasonSecondary.map((reason, idx) => (
                              <div key={idx} className="flex items-start">
                                <span className="text-emerald-600 w-16 flex-shrink-0"></span>
                                <span className="text-gray-600 text-xs">{reason}</span>
                              </div>
                            ))}
                            {rec.evidence.length > 0 && (
                              <div className="flex items-start">
                                <span className="text-emerald-600 w-16 flex-shrink-0">依据:</span>
                                <span className="text-gray-600 text-xs">
                                  {rec.evidence.map(e => `${e.label}:${e.value}`).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="p-4 border-t border-gray-200 flex justify-between bg-gray-50 rounded-b-xl flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllRecommendations}
                  className="h-10 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  全选
                </button>
                <button
                  onClick={handleSelectNoneRecommendations}
                  className="h-10 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  全不选
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedRecommendations([]);
                    setShowRecommendModal(false);
                    setRecommendModalMaximized(false);
                  }}
                  className="h-10 px-6 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDispatchSelected}
                  disabled={selectedRecommendations.length === 0}
                  className={`h-10 px-6 rounded-lg text-sm font-medium ${
                    selectedRecommendations.length > 0
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  确认下发 {selectedRecommendations.length > 0 && `(${selectedRecommendations.length})`}
                </button>
              </div>
            </div>

            {/* 右下角缩放拖动把手 */}
            {!recommendModalMaximized && (
              <div
                className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center text-gray-400 hover:text-gray-600"
                style={{ resize: 'both' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = recommendModalSize.width;
                  const startHeight = recommendModalSize.height;

                  const handleResize = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaY = moveEvent.clientY - startY;
                    setRecommendModalSize({
                      width: Math.max(800, startWidth + deltaX),
                      height: Math.max(500, startHeight + deltaY),
                    });
                  };

                  const handleResizeEnd = () => {
                    document.removeEventListener('mousemove', handleResize);
                    document.removeEventListener('mouseup', handleResizeEnd);
                  };

                  document.addEventListener('mousemove', handleResize);
                  document.addEventListener('mouseup', handleResizeEnd);
                }}
              >
                <Move className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 批量导入模态框 */}
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
                              {formatWorkHours(row.estimatedDays || 0, row.estimatedHours || 0)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                row.priority === 'urgent'
                                  ? 'bg-red-100 text-red-700'
                                  : row.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {priorityMap[row.priority]?.label || row.priority}
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

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        tasks={filteredTasks}
        editedTaskIds={editedTaskIds}
        editedTasks={editedTasks}
        selectedTaskId={selectedTaskId}
        onSelectedTaskIdChange={setSelectedTaskId}
        onEditedTasksChange={setEditedTasks}
        onEditedTaskIdsChange={setEditedTaskIds}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setEditedTasks({});
          setEditedTaskIds([]);
          setSelectedRows([]);
          setSelectedTaskId('');
        }}
        onConfirm={() => {
          // 应用编辑
          if (Object.keys(editedTasks).length > 0) {
            setMockTasks(prev => prev.map(task => {
              const edited = editedTasks[task.id];
              return edited ? { ...task, ...edited } : task;
            }));

            // ========== 数据闭环：同步批量编辑到 useTasks ==========
            // 将 mockTasks 格式的编辑字段映射到 Task 格式
            Object.entries(editedTasks).forEach(([taskId, edits]) => {
              const taskEdits: Partial<Task> = {};

              // 映射 status
              if (edits.status) {
                taskEdits.status = edits.status as TaskStatus;
              }
              // 映射 priority
              if (edits.priority) {
                taskEdits.priority = edits.priority as 'urgent' | 'high' | 'normal';
              }
              // 映射 assignee
              if (edits.assignee) {
                const assigneeStaff = staff.find(s => s.name === edits.assignee);
                taskEdits.assigneeId = assigneeStaff?.id?.toString() || '';
                taskEdits.assigneeName = edits.assignee as string;
              }
              // 映射 dueDate
              if (edits.planStart) {
                taskEdits.dueDate = (edits.planStart as string).split(' ')[0];
              }

              // 调用 updateTask 同步到 useTasks（只同步有变化的字段）
              if (Object.keys(taskEdits).length > 0) {
                updateTask(taskId, taskEdits);
              }
            });
          }
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setEditedTasks({});
          setEditedTaskIds([]);
          setSelectedRows([]);
          setSelectedTaskId('');
        }}
        fields={fields}
        staff={staff}
        taskTypes={taskTypes.map(t => ({ value: t.value, label: t.label }))}
      />

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={() => {
          // 删除选中的任务
          const indicesToDelete = [...selectedRows].sort((a, b) => b - a);

          // ========== 数据闭环：同步删除到 useTasks ==========
          // 根据索引获取要删除的任务 ID，调用 deleteTask 同步
          indicesToDelete.forEach(index => {
            const taskToDelete = filteredTasks[index];
            if (taskToDelete && taskToDelete.id) {
              deleteTask(taskToDelete.id);
            }
          });

          setMockTasks(prev => prev.filter((_, index) => !indicesToDelete.includes(index)));
          setShowDeleteWarning(false);
          setBatchDeleteMode(false);
          setSelectedRows([]);
        }}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleActualExport}
      />

      {/* 验收弹窗 */}
      <TaskAcceptanceModal
        isOpen={showAcceptanceModal}
        task={acceptanceTask as any}
        taskRecords={acceptanceTask ? getTaskRecordsByTaskId(acceptanceTask.id) : []}
        onAccept={(comments) => {
          if (acceptanceTask) {
            acceptCompletion(acceptanceTask.id, comments);
            setShowAcceptanceModal(false);
            setAcceptanceTask(null);
          }
        }}
        onReject={(reason) => {
          if (acceptanceTask) {
            rejectForRework(acceptanceTask.id, reason);
            setShowAcceptanceModal(false);
            setAcceptanceTask(null);
          }
        }}
        onClose={() => {
          setShowAcceptanceModal(false);
          setAcceptanceTask(null);
        }}
      />

      {/* 超时处理弹窗 */}
      <OvertimeHandleModal
        isOpen={showOvertimeModal}
        task={overtimeTask as any}
        timeout={overtimeTask ? detectOvertime(overtimeTask as any) || null : null}
        onContinue={(reason, newDeadline) => {
          if (overtimeTask) {
            handleOvertime(overtimeTask.id, 'continue', { reason, newDeadline });
            setShowOvertimeModal(false);
            setOvertimeTask(null);
          }
        }}
        onAbandon={(reason) => {
          if (overtimeTask) {
            handleOvertime(overtimeTask.id, 'abandon', { reason });
            setShowOvertimeModal(false);
            setOvertimeTask(null);
          }
        }}
        onClose={() => {
          setShowOvertimeModal(false);
          setOvertimeTask(null);
        }}
      />

      {/* 撤回/取消弹窗 */}
      <WithdrawCancelModal
        isOpen={showWithdrawCancelModal}
        task={withdrawCancelTask as any}
        type={withdrawCancelType}
        onConfirm={(reason) => {
          if (withdrawCancelTask) {
            if (withdrawCancelType === 'withdraw') {
              withdrawTask(withdrawCancelTask.id, reason);
            } else {
              cancelTask(withdrawCancelTask.id, reason);
            }
            setShowWithdrawCancelModal(false);
            setWithdrawCancelTask(null);
          }
        }}
        onClose={() => {
          setShowWithdrawCancelModal(false);
          setWithdrawCancelTask(null);
        }}
      />

      {/* 重新派发弹窗 */}
      <ReassignTaskModal
        isOpen={showReassignModal}
        task={reassignModalTask as any}
        onConfirm={(newAssigneeId, newAssigneeName) => {
          if (reassignModalTask) {
            reassignTask(reassignModalTask.id, newAssigneeId, newAssigneeName);
            setShowReassignModal(false);
            setReassignModalTask(null);
          }
        }}
        onClose={() => {
          setShowReassignModal(false);
          setReassignModalTask(null);
        }}
      />
    </div>
  );
}
