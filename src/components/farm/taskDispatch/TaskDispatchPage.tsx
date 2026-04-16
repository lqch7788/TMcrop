import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Plus, Upload, Sparkles, Filter, List, Calendar as CalendarIcon,
  MapPin, User, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Edit, Trash2,
  ChevronRight, ChevronDown, Package, Camera, Mic, Navigation, ArrowRight, X,
  Leaf, Droplets, Scissors, Bug, ShoppingBasket, Trees, Wheat, Thermometer, Sun, CloudRain, Download,
  ChevronLeft, ChevronRight as ChevronRightIcon, Square, Minimize2, Move, RefreshCw, GripVertical,
  FileText, Bell
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
} from './modals';
import { TaskProgressTimeline } from './components/TaskProgressTimeline';
import { OvertimeBadge } from './components/OvertimeBadge';
import { Modal } from '../../ui/Modal';
import { TaskTypeConfigPanel } from './components/TaskTypeConfigPanel';
import { TaskTypeConfigDisplay } from './components/TaskTypeConfigDisplay';
import { TaskConfigValues } from './hooks/useTaskTypeConfig';

// 从 farmMockData 导入数据（消除硬编码）
import {
  taskDispatchTasks,
  taskDispatchFields,
  taskDispatchStaff,
  TASK_DISPATCH_BASE,
  SOP_TEMPLATES,
  TASK_STATUS_MAP,
  TASK_PRIORITY_MAP,
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

// 任务类型定义（保留图标组件，这些不能放在 mockData 中）
const taskTypes = [
  { value: 'fertilization', label: '施肥', icon: Leaf, color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', icon: Droplets, color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', icon: Scissors, color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', icon: Bug, color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', icon: Droplets, color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', icon: Trees, color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', icon: ShoppingBasket, color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', icon: Trees, color: 'bg-emerald-500' },
  { value: 'other', label: '其他', icon: Edit, color: 'bg-gray-500' },
];

// 模拟任务数据 - 从 farmMockData 导入（防御性：确保有默认值）
const initialMockTasks = taskDispatchTasks || [];

// 任务区域列表 - 从 farmMockData 导入（防御性：确保有默认值）
const fields = taskDispatchFields || [];

// 崇明岛基地 - 从 farmMockData 导入
const base = TASK_DISPATCH_BASE;

// 员工列表 - 从 farmMockData 导入（防御性：确保有默认值）
const staff: Array<{id: number; name: string; status: string}> = taskDispatchStaff || [];

// SOP模板 - 从 farmMockData 导入
const sopTemplates = SOP_TEMPLATES;

// 状态映射 - 从 farmMockData 导入
const statusMap = TASK_STATUS_MAP;

// 优先级映射 - 从 farmMockData 导入
const priorityMap = TASK_PRIORITY_MAP;

// 格式化任务工时（按8小时=1天计算）
const formatWorkHours = (days: number, hours: number): string => {
  const totalHours = days * 8 + hours;
  const d = Math.floor(totalHours / 8);
  const h = totalHours % 8;
  let result = '';
  if (d > 0) result += `${d}天`;
  if (h > 0) result += `${h}小时`;
  return result || '0小时';
};


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
    addTask,
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
  } = useTasks();
  const { addTaskRecord } = useOperationRecords();
  // 催办管理 Hook
  const { canRemind, sendReminder, getCooldownRemaining, getTodayReminderCount } = useReminder();

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
    // 先调用 addTask 获取 useTasks 生成的任务 ID，再更新 mockTasks（保持 ID 一致）
    const tasksWithUseTasksId = newTasks.map(task => {
      const taskTypeInfo = taskTypes.find(t => t.value === task.type);
      const assigneeStaff = staff.find(s => s.name === task.assignee);

      const useTasksTask = addTask({
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
        requiredFeedback: [],
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

  // 新建任务表单状态
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
    requiredFeedback: [],
    priority: 'normal',
    estimatedDays: 0,
    estimatedHours: 1,
    typeConfig: {},
    batchId: '',
    batchCode: '',
    batchSearch: '',
  });

  // 自动生成任务编号 NS+年月日+3位流水号（如 NS20260416001）
  const autoGenerateTaskCode = () => {
    const today = new Date();
    // 年月日：20260416
    const datePrefix = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    // 查找当天的最大流水号
    let maxSequence = 0;
    mockTasks.forEach(t => {
      // 匹配格式：NS20260416-xxx
      if (t.taskCode && t.taskCode.startsWith('NS' + datePrefix + '-')) {
        const seqStr = t.taskCode.slice(-3);
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
      requiredFeedback: [],
      priority: 'normal',
      estimatedDays: 0,
      estimatedHours: 1,
      typeConfig: {},
      batchId: '',
      batchCode: '',
      batchSearch: '',
    });
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

  // 计算任务截止时间（根据开始时间+天数+小时+每天工作时间）
  const calculateEndDateTime = (startTime: string, days: number, hours: number, workHoursPerDay: number): string => {
    if (!startTime) return '';
    const start = new Date(startTime.replace(' ', 'T'));
    // 总工作小时数
    const totalHours = days * workHoursPerDay + hours;
    if (totalHours === 0) return startTime;
    // 计算需要的天数
    const totalDays = Math.ceil(totalHours / workHoursPerDay);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDays);
    // 保持原来的时间格式 "YYYY-MM-DD HH:MM"
    return end.toISOString().slice(0, 16).replace('T', ' ');
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
                      <h4 className="font-medium text-gray-900">{task.typeLabel}</h4>
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
                          <span className="truncate">{task.typeLabel}</span>
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
                      <span className="truncate">{task.typeLabel}</span>
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
  const handleCreateTask = () => {
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
    // 查找执行人和派发人信息
    const assigneeStaff = staff.find(s => s.name === newTask.assignee);

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

    // 先调用 addTask 获取 useTasks 生成的任务对象（包含生成的任务ID）
    const task = addTask({
      title: typeLabels || '农事任务',
      type: newTask.types[0] || 'other',
      typeName: typeLabels,
      batchId: newTask.batchId,  // 关联生产批次
      batchCode: newTask.batchCode,  // 关联生产批次编号
      greenhouseId: greenhouseId,
      greenhouseName: fieldValue,
      cropName: cropValue,
      priority: (newTask.priority as 'urgent' | 'high' | 'normal') || 'normal',
      assigneeId: assigneeStaff?.id?.toString() || '',
      assigneeName: newTask.assignee,
      assignerId: assignerId,  // 派发人ID
      assignerName: assignerName,  // 派发人名称
      dueDate: newTask.planEnd?.split(' ')[0] || '',
      description: newTask.sopContent,
      remarks: '',
      sourceType: 'dispatch',
      materials: newTask.materials,
      requiredFeedback: newTask.requiredFeedback,
    });

    // 用 useTasks 返回的任务 ID 同步更新 mockTasks（保持 ID 一致）
    const newTaskData = {
      id: task.id,  // 使用 useTasks 返回的 ID，保持两个系统 ID 一致
      types: newTask.types,
      field: fieldValue,
      crop: cropValue,
      assignee: newTask.assignee,
      planStart: newTask.planStart,
      planEnd: newTask.planEnd,
      progress: 0,
      status: 'pending' as const,
      priority: newTask.priority,
    };
    setMockTasks(prev => [...prev, newTaskData]);

    // ========== 数据闭环：同步到 useOperationRecords ==========
    if (task) {
      addTaskRecord({
        operationType: newTask.types[0] || 'other',
        operationTypeName: typeLabels,
        status: 'pending',
        greenhouseId: greenhouseId,  // 使用查找到的 greenhouseId
        greenhouseName: fieldValue,
        cropName: cropValue,
        operatorId: assigneeStaff?.id?.toString() || '',
        operatorName: newTask.assignee,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: task.id,
        sourceCode: task.taskCode,
        progress: 0,
        remarks: `任务已派发，等待执行人接受`,
      });
    }

    console.log('创建任务:', newTaskData, '已同步到数据闭环');
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
      requiredFeedback: [],
      priority: 'normal',
      estimatedDays: 0,
      estimatedHours: 1,
      workHoursPerDay: 8,
    });
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
    if (selectedRows.length === filteredTasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTasks.map((_, index) => index));
    }
  };

  const handleSelectRow = (index: number) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(rowIndex => rowIndex !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

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
    const headers = ['任务ID', '任务类型', '任务区域编号', '作物', '负责人', '计划开始时间', '计划结束时间', '进度', '状态', '优先级'];
    const exportData = selectedData.map(task => ({
      '任务ID': task.id,
      '任务类型': task.typeLabel,
      '任务区域编号': task.field,
      '作物': task.crop,
      '负责人': task.assignee,
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">农事任务派发</h1>
            <p className="text-gray-500">智能排程与任务调度管理中心</p>
          </div>
        </div>
      </div>

      {/* 实时监控看板 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今日任务</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">进行中</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待验收</p>
              <p className="text-2xl font-bold text-orange-600">{stats.waitingAcceptance}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">异常</p>
              <p className="text-2xl font-bold text-red-600">{stats.warning}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* 顶部操作栏 */}
      <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        {/* 筛选区 + 操作按钮 */}
        <div className="flex flex-wrap items-end gap-4">
          {/* 筛选条件 - 均匀分布 grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">任务ID</label>
              <input
                type="text"
                value={taskIdSearch}
                onChange={(e) => setTaskIdSearch(e.target.value)}
                placeholder="搜索任务ID"
                className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">时间范围</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部时间</option>
                <option value="today">今日</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">任务区域编号</label>
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部任务区域</option>
                {fields.map(f => (
                  <option key={f.id} value={f.name}>{f.name} ({f.crop})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">执行人</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部人员</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部状态</option>
                <option value="draft">草稿</option>
                <option value="pending">待接受</option>
                <option value="accepted">已接受</option>
                <option value="in_progress">处理中</option>
                <option value="waiting_acceptance">待验收</option>
                <option value="completed">已完成</option>
                <option value="rejected">返工中</option>
                <option value="failed">任务失败</option>
                <option value="cancelled">已取消</option>
                <option value="abandoned">已放弃</option>
              </select>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
            >
              重置
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
            <button
              onClick={generateRecommendations}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white text-sm rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 transition-all duration-300 animate-pulse-subtle"
            >
              <Sparkles className="w-4 h-4" />
              智能推荐
            </button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 flex items-center gap-1 text-sm ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
                列表
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 flex items-center gap-1 text-sm ${viewMode === 'calendar' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <CalendarIcon className="w-4 h-4" />
                日历
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 表头 */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">农事任务表</h3>
            <div className="flex items-center gap-2">
              {exportMode ? (
                <>
                  <button onClick={handleConfirmExport} className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button onClick={handleCancelExport} className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    取消
                  </button>
                </>
              ) : batchEditMode ? (
                <>
                  <button onClick={() => setShowBatchEditModal(true)} disabled={selectedRows.length === 0} className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Edit className="w-4 h-4" />
                    批量编辑
                  </button>
                  <button onClick={() => { setBatchEditMode(false); setSelectedRows([]); }} className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    取消
                  </button>
                </>
              ) : batchDeleteMode ? (
                <>
                  <button onClick={() => setShowDeleteWarning(true)} disabled={selectedRows.length === 0} className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </button>
                  <button onClick={() => { setBatchDeleteMode(false); setSelectedRows([]); }} className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowCreateModal(true)} className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    新建
                  </button>
                  <button onClick={() => { setBatchEditMode(true); setSelectedRows([]); }} className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button onClick={() => { setBatchDeleteMode(true); setSelectedRows([]); }} className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <button onClick={handleExportClick} className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                  <button
                    onClick={() => {
                      // 批量验收：选择所有待验收任务
                      const waitingTasks = filteredTasks.filter((t: any) => t.status === 'waiting_acceptance');
                      if (waitingTasks.length === 0) {
                        alert('没有待验收的任务');
                        return;
                      }
                      if (confirm(`确认批量验收 ${waitingTasks.length} 个任务？`)) {
                        waitingTasks.forEach((task: any) => {
                          acceptCompletion(task.id, '批量验收通过');
                        });
                        setSelectedRows([]);
                      }
                    }}
                    className="h-8 px-3 flex items-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    批量验收
                  </button>
                  <button
                    onClick={() => {
                      // 批量派发：选择所有草稿任务
                      const draftTasks = filteredTasks.filter((t: any) => t.status === 'draft');
                      if (draftTasks.length === 0) {
                        alert('没有草稿任务可派发');
                        return;
                      }
                      if (confirm(`确认批量派发 ${draftTasks.length} 个任务？`)) {
                        draftTasks.forEach((task: any) => {
                          updateTaskStatus(task.id, 'pending');
                        });
                        setSelectedRows([]);
                      }
                    }}
                    className="h-8 px-3 flex items-center gap-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    批量派发
                  </button>
                </>
              )}
            </div>
          </div>
          {/* 横向滚动表格 */}
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full min-w-[1800px]">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
                <tr>
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredTasks.length && filteredTasks.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                  )}
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务ID</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">批次</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">进度</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作业标准</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((task, index) => (
                  <tr key={task.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode || batchDeleteMode) && (
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedTask(task); setShowDetailModal(true); }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        title="点击查看详情"
                      >
                        {task.id}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 items-center">
                        {(task.types || []).slice(0, 2).map((typeValue: string, idx: number) => {
                          const typeLabel = getTypeLabel(typeValue);
                          return typeLabel === '其他' ? (
                            <span key={idx} className="text-orange-500 text-xs">其他</span>
                          ) : (
                            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
                              {typeLabel}
                            </span>
                          );
                        })}
                        {(task.types || []).length > 2 && (
                          <span className="text-xs text-gray-500">+{(task.types || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.field}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {task.crop === '其他' ? (
                        <div className="text-orange-500 text-xs">其他（{(task as any).cropRemarks || ''}）</div>
                      ) : (
                        <span className="text-sm text-gray-600">{task.crop}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {(task as any).batchCode || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{task.assignee}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planStart || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planEnd || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatWorkHours((task as any).estimatedDays || 0, (task as any).estimatedHours || 0)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden w-16 flex-shrink-0">
                          <div
                            className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : task.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${task.priority === 'urgent' ? 'text-red-500' : task.priority === 'high' ? 'text-orange-500' : 'text-gray-500'}`}>
                        {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : '普通'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status].bg} ${statusMap[task.status].color}`}>
                          {statusMap[task.status].label}
                        </span>
                        {/* 超时警示徽章 */}
                        {(task as any).timeout && (
                          <OvertimeBadge timeout={(task as any).timeout} size="sm" showLabel={true} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={(task as any).remarks || '-'}>
                      {(task as any).remarks || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {(task.types?.length || 0) >= 2 && (task as any).sopContent ? (
                        <button
                          onClick={() => {
                            setSelectedSopTask(task);
                            setShowSopModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          SOP文件
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* 待验收状态 - 显示验收按钮 */}
                        {task.status === 'waiting_acceptance' && (
                          <button
                            onClick={() => {
                              setAcceptanceTask(task);
                              setShowAcceptanceModal(true);
                            }}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            验收
                          </button>
                        )}
                        {/* pending状态 - 显示撤回按钮 */}
                        {task.status === 'pending' && (
                          <button
                            onClick={() => {
                              setWithdrawCancelType('withdraw');
                              setWithdrawCancelTask(task);
                              setShowWithdrawCancelModal(true);
                            }}
                            className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                          >
                            撤回
                          </button>
                        )}
                        {/* accepted/in_progress状态 - 显示取消按钮 */}
                        {(task.status === 'accepted' || task.status === 'in_progress') && (
                          <button
                            onClick={() => {
                              setWithdrawCancelType('cancel');
                              setWithdrawCancelTask(task);
                              setShowWithdrawCancelModal(true);
                            }}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            取消
                          </button>
                        )}
                        {/* 超时状态 - 显示超时处理按钮 */}
                        {(task as any).timeout?.severity === 'critical' && (
                          <button
                            onClick={() => {
                              setOvertimeTask(task);
                              setShowOvertimeModal(true);
                            }}
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                          >
                            超时处理
                          </button>
                        )}
                        {/* 催办按钮 - 非终态显示 */}
                        {!['completed', 'cancelled', 'abandoned'].includes(task.status) && (
                          (() => {
                            const remindCheck = canRemind(task.id);
                            const cooldownSec = getCooldownRemaining(task.id);
                            const todayCount = getTodayReminderCount(task.id);
                            return (
                              <button
                                onClick={() => {
                                  if (remindCheck.allowed) {
                                    sendReminder(
                                      task.id,
                                      task.taskCode,
                                      task.assigneeId,
                                      task.assigneeName,
                                      'admin',
                                      '管理员'
                                    );
                                  } else {
                                    alert(remindCheck.reason || '暂时无法催办');
                                  }
                                }}
                                disabled={!remindCheck.allowed}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  remindCheck.allowed
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                title={cooldownSec > 0 ? `${Math.ceil(cooldownSec / 60)}分钟后可催办` : `今日已催办${todayCount}次`}
                              >
                                <Bell className="w-3 h-3 inline mr-1" />
                                {cooldownSec > 0 ? `${Math.ceil(cooldownSec / 60)}m` : '催办'}
                              </button>
                            );
                          })()
                        )}
                        {/* 查看详情按钮 - 所有状态都显示 */}
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDetailModal(true);
                          }}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          详情
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-200 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-500">条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">共 {filteredTasks.length} 条</span>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">{currentPage} / {Math.ceil(filteredTasks.length / pageSize) || 1}</span>
              <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredTasks.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredTasks.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          {exportMode && (
            <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">{selectedRows.length === filteredTasks.length ? '全不选' : '全选'}</span>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          )}
        </div>
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
        onClose={() => setShowCreateModal(false)}
        title="新建任务"
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-between">
            {createStep > 1 && (
              <button
                onClick={() => setCreateStep(createStep - 1)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
              >
                上一步
              </button>
            )}
            <button
              onClick={() => createStep < 3 ? setCreateStep(createStep + 1) : handleCreateTask()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2 ml-auto"
            >
              {createStep < 3 ? (
                <>下一步 <ChevronRight className="w-4 h-4" /></>
              ) : (
                '创建任务'
              )}
            </button>
          </div>
        }
      >
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">指派给 <span className="text-red-500">*</span></label>
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
                </div>
              )}

              {/* Step 3: 时间与要求 */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">工作制(小时/天)</label>
                      <select
                        value={newTask.workHoursPerDay}
                        onChange={(e) => {
                          const newWorkHours = Number(e.target.value);
                          setNewTask({ ...newTask, workHoursPerDay: newWorkHours });
                          // 如果当前小时数超过限制，自动调整
                          if ((newTask.estimatedHours || 0) >= newWorkHours) {
                            setNewTask({ ...newTask, workHoursPerDay: newWorkHours, estimatedHours: newWorkHours - 1 });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={4}>4小时/天</option>
                        <option value={6}>6小时/天</option>
                        <option value={8}>8小时/天</option>
                        <option value={10}>10小时/天</option>
                        <option value={12}>12小时/天</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">计划开始日期 <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={newTask.planStart?.split(' ')[0] || ''}
                        onChange={(e) => setNewTask({ ...newTask, planStart: e.target.value + ' 00:00' })}
                        className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">必填反馈 <span className="text-red-500">*</span></label>
                    <div className="space-y-2">
                      {[
                        { key: 'gps', label: '位置打卡', icon: MapPin },
                        { key: 'material', label: '物资扫码', icon: Package },
                        { key: 'photo_before', label: '作业前照片', icon: Camera },
                        { key: 'photo_after', label: '作业后照片', icon: Camera },
                        { key: 'voice', label: '语音备注', icon: Mic },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newTask.requiredFeedback.includes(item.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, requiredFeedback: [...newTask.requiredFeedback, item.key] });
                              } else {
                                setNewTask({ ...newTask, requiredFeedback: newTask.requiredFeedback.filter(f => f !== item.key) });
                              }
                            }}
                            className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                          />
                          <item.icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{item.label}</span>
                        </label>
                      ))}
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
                  <label className="text-xs text-gray-500">负责人</label>
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
            {selectedTask.tools && selectedTask.tools.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需工具</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
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
                </div>
              </div>
            )}

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
                    任务类型,任务区域,作物,负责人,计划开始时间,计划结束时间,优先级
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
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">计划开始时间</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-100 transition-colors">
                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.typeLabel}</td>
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
    </div>
  );
}
