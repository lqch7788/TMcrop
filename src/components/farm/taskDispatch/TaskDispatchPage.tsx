import { useState } from 'react';
import {
  Send, Plus, Upload, Sparkles, Filter, List, Calendar as CalendarIcon,
  MapPin, User, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Edit, Trash2,
  ChevronRight, ChevronDown, Package, Camera, Mic, Navigation, ArrowRight, X,
  Leaf, Droplets, Scissors, Bug, ShoppingBasket, Trees, Wheat, Thermometer, Sun, CloudRain, Download,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { format, isSameDay, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameMonth, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  CreateTaskModal,
  BatchEditModal,
  DeleteWarningModal,
  ExportFormatModal,
} from './modals';

// 任务类型定义
const taskTypes = [
  { value: 'fertilization', label: '施肥', icon: Leaf, color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', icon: Droplets, color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', icon: Scissors, color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', icon: Bug, color: 'bg-red-500' },
  { value: 'harvest', label: '采收', icon: ShoppingBasket, color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', icon: Trees, color: 'bg-emerald-500' },
  { value: 'other', label: '其他', icon: Edit, color: 'bg-gray-500' },
];

// 模拟任务数据
const initialMockTasks = [
  { id: '20260317-001', types: ['fertilization'], typeLabel: '施肥', field: '1号棚', crop: '番茄', assignee: '张伟民', planStart: '2026-03-17 08:00', planEnd: '2026-03-17 12:00', progress: 100, status: 'completed', priority: 'normal', estimatedDays: 0, estimatedHours: 4 },
  { id: '20260317-002', types: ['irrigation', 'fertilization'], typeLabel: '灌溉,施肥', field: '4号棚', crop: '黄瓜', assignee: '李明轩', planStart: '2026-03-17 09:00', planEnd: '2026-03-17 11:00', progress: 60, status: 'in_progress', priority: 'high', estimatedDays: 0, estimatedHours: 2 },
  { id: '20260317-003', types: ['pesticide', 'weeding'], typeLabel: '植保,除草', field: '6号棚', crop: '草莓', assignee: '王建国', planStart: '2026-03-17 14:00', planEnd: '2026-03-17 18:00', progress: 0, status: 'pending', priority: 'urgent', estimatedDays: 0, estimatedHours: 4 },
  { id: '20260318-001', types: ['pruning', 'harvest'], typeLabel: '修剪,采收', field: '8号棚', crop: '辣椒', assignee: '赵俊杰', planStart: '2026-03-18 08:00', planEnd: '2026-03-20 17:00', progress: 0, status: 'pending', priority: 'normal', estimatedDays: 2, estimatedHours: 4 },
  { id: '20260316-001', types: ['harvest', 'fertilization', 'weeding'], typeLabel: '采收,施肥,除草', field: 'A1地块', crop: '水稻', assignee: '钱文涛', planStart: '2026-03-16 08:00', planEnd: '2026-03-18 18:00', progress: 100, status: 'waiting_acceptance', priority: 'normal', estimatedDays: 2, estimatedHours: 10 },
  { id: '20260317-004', types: ['weeding'], typeLabel: '除草', field: 'B1地块', crop: '小麦', assignee: '孙晓峰', planStart: '2026-03-17 10:00', planEnd: '2026-03-17 14:00', progress: 30, status: 'in_progress', priority: 'normal', estimatedDays: 0, estimatedHours: 4 },
  { id: '20260317-005', types: ['fertilization', 'irrigation'], typeLabel: '施肥,灌溉', field: 'C1地块', crop: '油菜', assignee: '周志强', planStart: '2026-03-17 13:00', planEnd: '2026-03-17 17:00', progress: 0, status: 'rejected', priority: 'normal', estimatedDays: 0, estimatedHours: 4 },
  { id: '20260317-006', types: ['irrigation'], typeLabel: '灌溉', field: 'D1地块', crop: '蔬菜', assignee: '吴海龙', planStart: '2026-03-17 06:00', planEnd: '2026-03-17 08:00', progress: 100, status: 'completed', priority: 'urgent', estimatedDays: 0, estimatedHours: 2 },
  { id: '20260319-001', types: ['harvest', 'weeding', 'pruning'], typeLabel: '采收,除草,修剪', field: 'A2地块', crop: '水稻', assignee: '钱文涛', planStart: '2026-03-19 08:00', planEnd: '2026-03-23 18:00', progress: 0, status: 'pending', priority: 'normal', estimatedDays: 4, estimatedHours: 2 },
];

// 温室/大田列表 (崇明岛基地)
const fields = [
  // 温室大棚 (12个)
  { id: 1, name: '1号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 2, name: '2号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 3, name: '3号棚', type: '温室', crop: '番茄', area: 6500 },
  { id: 4, name: '4号棚', type: '温室', crop: '黄瓜', area: 7000 },
  { id: 5, name: '5号棚', type: '温室', crop: '黄瓜', area: 7000 },
  { id: 6, name: '6号棚', type: '温室', crop: '草莓', area: 6000 },
  { id: 7, name: '7号棚', type: '温室', crop: '草莓', area: 6000 },
  { id: 8, name: '8号棚', type: '温室', crop: '辣椒', area: 5500 },
  { id: 9, name: '9号棚', type: '温室', crop: '辣椒', area: 5500 },
  { id: 10, name: '10号棚', type: '温室', crop: '生菜', area: 5000 },
  { id: 11, name: '11号棚', type: '温室', crop: '生菜', area: 5000 },
  { id: 12, name: '12号棚', type: '温室', crop: '西瓜', area: 7000 },
  // 大田 (8个)
  { id: 13, name: 'A1地块', type: '大田', crop: '水稻', area: 100 },
  { id: 14, name: 'A2地块', type: '大田', crop: '水稻', area: 100 },
  { id: 15, name: 'A3地块', type: '大田', crop: '水稻', area: 100 },
  { id: 16, name: 'B1地块', type: '大田', crop: '小麦', area: 100 },
  { id: 17, name: 'B2地块', type: '大田', crop: '小麦', area: 100 },
  { id: 18, name: 'C1地块', type: '大田', crop: '油菜', area: 80 },
  { id: 19, name: 'C2地块', type: '大田', crop: '油菜', area: 70 },
  { id: 20, name: 'D1地块', type: '大田', crop: '蔬菜', area: 50 },
];

// 崇明岛基地
const base = '崇明岛基地';

// 员工列表
const staff = [
  { id: 1, name: '张伟民', status: 'busy' },
  { id: 2, name: '李明轩', status: 'available' },
  { id: 3, name: '王建国', status: 'available' },
  { id: 4, name: '赵俊杰', status: 'off' },
  { id: 5, name: '钱文涛', status: 'available' },
  { id: 6, name: '孙晓峰', status: 'busy' },
];

// SOP模板
const sopTemplates: Record<string, string> = {
  fertilization: '尿素用量：20kg/亩\n稀释倍数：500倍\n注意事项：避免雨前4小时施用',
  irrigation: '灌溉方式：滴灌\n灌溉时长：30分钟/亩\n注意事项：确保灌溉均匀',
  pesticide: '农药名称：多菌灵\n用量：1000倍稀释\n注意事项：佩戴防护装备',
  pruning: '修剪标准：保留主干，去除侧枝\n工具：专业修枝剪\n注意事项：剪口要平整',
  harvest: '采收标准：果实成熟度达90%\n工具：采摘篮\n注意事项：轻拿轻放',
  weeding: '除草方式：人工除草\n深度：3-5cm\n注意事项：除根除尽',
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待执行', color: 'text-gray-600', bg: 'bg-gray-100' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '已驳回', color: 'text-red-600', bg: 'bg-red-100' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-500' },
  high: { label: '高', color: 'text-orange-500' },
  normal: { label: '普通', color: 'text-gray-500' },
};

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

// 作物生长阶段数据
const cropStages: Record<string, { stage: string; tasks: string[]; priority: 'high' | 'medium' | 'low' }> = {
  '番茄': { stage: '开花结果期', tasks: ['人工授粉', '疏果', '浇水', '施肥'], priority: 'high' },
  '黄瓜': { stage: '生长期', tasks: ['施肥', '除草', '浇水', '防病虫'], priority: 'medium' },
  '草莓': { stage: '开花结果期', tasks: ['人工授粉', '疏果', '浇水'], priority: 'high' },
  '辣椒': { stage: '生长期', tasks: ['施肥', '除草', '浇水'], priority: 'medium' },
  '生菜': { stage: '生长期', tasks: ['浇水', '施肥', '除草'], priority: 'low' },
  '西瓜': { stage: '开花结果期', tasks: ['人工授粉', '浇水', '施肥'], priority: 'high' },
  '水稻': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '小麦': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '油菜': { stage: '成熟期', tasks: ['及时采收', '晾晒'], priority: 'high' },
  '蔬菜': { stage: '生长期', tasks: ['浇水', '施肥', '除草', '采收'], priority: 'medium' },
};

// 智能推荐结果类型
interface Recommendation {
  id: string;
  greenhouse: string;
  crop: string;
  stage: string;
  recommendedTasks: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  suggestedDate: string;
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [mockTasks, setMockTasks] = useState(initialMockTasks);
  const [taskIdSearch, setTaskIdSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedTask, setSelectedTask] = useState<typeof mockTasks[0] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
  const [editedTaskIds, setEditedTaskIds] = useState<string[]>([]);
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<typeof mockTasks[0]>>>({});

  // 智能推荐相关状态
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);

  // 日历视图相关状态
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarViewType, setCalendarViewType] = useState<'day' | 'week' | 'month'>('week');

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

    setMockTasks(prev => [...prev, ...newTasks]);
    setRecommendations(prev => prev.filter(rec => !selectedRecommendations.includes(rec.id)));
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
  const [newTask, setNewTask] = useState({
    taskId: '',
    types: [] as string[],
    typeRemarks: '',  // 其他任务备注
    field: '',
    crop: '',
    cropRemarks: '',  // 其他作物备注
    areaRemarks: '',
    assignee: '',
    planStart: '',
    planEnd: '',
    sopContent: '',
    materials: [] as { name: string; qty: number; unit: string }[],
    tools: [] as { name: string; qty: number; unit: string }[],  // 所需工具
    requiredFeedback: [] as string[],
    priority: 'normal',
    estimatedDays: 0,
    estimatedHours: 1,
    workHoursPerDay: 8,  // 每天工作时间（小时）
  });

  // 自动生成任务ID（检查重复）
  const autoGenerateTaskId = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const datePrefix = dateStr.replace(/-/g, '');

    // 检查是否存在，不存在则返回
    let sequence = 1;
    let newId = `${datePrefix}-${String(sequence).padStart(3, '0')}`;
    while (mockTasks.some(t => t.id === newId)) {
      sequence++;
      newId = `${datePrefix}-${String(sequence).padStart(3, '0')}`;
    }
    return newId;
  };

  // 打开新建任务弹窗
  const handleOpenCreateModal = () => {
    const taskId = autoGenerateTaskId();
    setNewTask({
      taskId,
      types: [],
      field: '',
      crop: '',
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
    });
    setCreateStep(1);
    setShowCreateModal(true);
  };

  // 过滤任务
  const filteredTasks = mockTasks.filter(task => {
    if (taskIdSearch && !task.id.toLowerCase().includes(taskIdSearch.toLowerCase())) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (fieldFilter !== 'all' && task.field !== fieldFilter) return false;
    if (assigneeFilter !== 'all' && task.assignee !== assigneeFilter) return false;
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

  // 智能推荐算法
  const generateRecommendations = () => {
    const results: Recommendation[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 获取当前空闲的温室/大田
    const occupiedFields = new Set(
      mockTasks
        .filter(t => t.status === 'in_progress' || t.status === 'pending')
        .map(t => t.field)
    );

    // 获取可用员工
    const availableStaff = staff.filter(s => s.status === 'available');

    fields.forEach(field => {
      const isOccupied = occupiedFields.has(field.name);
      const cropInfo = cropStages[field.crop];

      if (!cropInfo) return;

      // 检查是否需要推荐
      let reason = '';
      let needsRecommendation = false;

      // 检查是否有进行中或待执行的任务
      const fieldTasks = mockTasks.filter(t => t.field === field.name);
      const hasActiveTasks = fieldTasks.some(t =>
        t.status === 'in_progress' || t.status === 'pending'
      );

      if (!isOccupied && !hasActiveTasks) {
        // 温室空闲，推荐任务
        reason = `${field.name}当前空闲，${field.crop}处于${cropInfo.stage}，建议安排以下任务`;
        needsRecommendation = true;
      } else if (hasActiveTasks) {
        // 有任务但可能是例行任务
        const lastCompletedTask = fieldTasks
          .filter(t => t.status === 'completed')
          .sort((a, b) => new Date(b.planEnd).getTime() - new Date(a.planEnd).getTime())[0];

        if (lastCompletedTask) {
          const daysSinceLastTask = Math.floor(
            (today.getTime() - new Date(lastCompletedTask.planEnd).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastTask >= 3) {
            reason = `${field.name}上次任务完成于${daysSinceLastTask}天前，${field.crop}需要维护`;
            needsRecommendation = true;
          }
        }
      }

      if (needsRecommendation) {
        // 根据作物类型确定具体任务
        const taskTypeMap: Record<string, string> = {
          '人工授粉': 'pruning',
          '疏果': 'pruning',
          '浇水': 'irrigation',
          '施肥': 'fertilization',
          '除草': 'weeding',
          '防病虫': 'pesticide',
          '采收': 'harvest',
          '及时采收': 'harvest',
          '晾晒': 'harvest',
        };

        const recommendedTaskTypes = cropInfo.tasks.map(taskName => {
          const typeValue = taskTypeMap[taskName] || 'irrigation';
          const taskType = taskTypes.find(t => t.value === typeValue);
          return {
            name: taskName,
            type: typeValue,
            label: taskType?.label || taskName
          };
        });

        // 去除重复任务类型
        const uniqueTasks = recommendedTaskTypes.reduce((acc, task) => {
          if (!acc.find(t => t.type === task.type)) {
            acc.push(task);
          }
          return acc;
        }, [] as typeof recommendedTaskTypes);

        results.push({
          id: `REC${results.length + 1}`.padStart(5, '0'),
          greenhouse: field.name,
          crop: field.crop,
          stage: cropInfo.stage,
          recommendedTasks: uniqueTasks.map(t => t.label),
          reason,
          priority: cropInfo.priority,
          assignee: availableStaff.length > 0
            ? availableStaff[results.length % availableStaff.length].name
            : '待分配',
          suggestedDate: todayStr,
        });
      }
    });

    // 按优先级排序
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setRecommendations(results);
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

  // 统计
  const stats = {
    total: mockTasks.length,
    pending: mockTasks.filter(t => t.status === 'pending').length,
    inProgress: mockTasks.filter(t => t.status === 'in_progress').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
    waitingAcceptance: mockTasks.filter(t => t.status === 'waiting_acceptance').length,
    warning: mockTasks.filter(t => t.status === 'rejected').length,
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

  // 周视图组件
  const WeekView: React.FC<{
    month: Date;
    tasks: typeof mockTasks;
    onSelectTask: (task: typeof mockTasks[0]) => void;
    onSelectDate: (date: Date) => void;
  }> = ({ month, tasks, onSelectTask, onSelectDate }) => {
    const weekStart = startOfWeek(month, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekDaysZh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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
              return (
                <div
                  key={dayIndex}
                  onClick={() => onSelectDate(day)}
                  className={`rounded-lg p-2 min-h-[400px] cursor-pointer transition-colors ${
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
                          onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
                          className={`px-2 py-1 rounded text-xs text-white truncate cursor-pointer hover:opacity-80 ${getTypeColor(task.types[0])}`}
                          title={`${task.typeLabel} - ${task.field}`}
                        >
                          {task.typeLabel}
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
    const weekDaysZh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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
            return (
              <div
                key={i}
                onClick={() => onSelectDate(day)}
                className={`min-h-[80px] p-2 rounded-lg cursor-pointer transition-colors ${
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
                      className={`px-1 py-0.5 rounded text-xs text-white truncate ${getTypeColor(task.types[0])}`}
                    >
                      {task.typeLabel}
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
    const newTaskData = {
      id: newTask.taskId,
      types: newTask.types,
      field: newTask.field === 'other' ? newTask.areaRemarks : newTask.field,
      crop: newTask.crop,
      assignee: newTask.assignee,
      planStart: newTask.planStart,
      planEnd: newTask.planEnd,
      progress: 0,
      status: 'pending' as const,
      priority: newTask.priority,
    };
    setMockTasks(prev => [...prev, newTaskData]);
    console.log('创建任务:', newTaskData);
    setShowCreateModal(false);
    setCreateStep(1);
    setNewTask({
      taskId: '',
      types: [],
      typeRemarks: '',
      field: '',
      crop: '',
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
    const headers = ['任务ID', '任务类型', '温室/大田编号', '作物', '负责人', '计划开始时间', '计划结束时间', '进度', '状态', '优先级'];
    const exportData = selectedData.map(task => ({
      '任务ID': task.id,
      '任务类型': task.typeLabel,
      '温室/大田编号': task.field,
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
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">时间范围</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部时间</option>
                <option value="today">今日</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">温室/大田编号</label>
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部温室/大田</option>
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
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">全部状态</option>
                <option value="pending">待执行</option>
                <option value="in_progress">进行中</option>
                <option value="waiting_acceptance">待验收</option>
                <option value="completed">已完成</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
            <button
              onClick={generateRecommendations}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
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
                    新增
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
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">温室/大田</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计天数</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计小时</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">工作制</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">进度</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需物资</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需工具</th>
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
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{task.id}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {(task.types || (task.type ? [task.type] : [])).map((typeValue: string, idx: number) => {
                          const typeLabel = getTypeLabel(typeValue);
                          return typeLabel === '其他' ? (
                            <span key={idx} className="text-orange-500 text-xs">其他（{(task as any).typeRemarks || ''}）</span>
                          ) : (
                            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
                              {typeLabel}
                            </span>
                          );
                        })}
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
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-sm text-gray-600">{task.assignee}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planStart || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planEnd || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{(task as any).estimatedDays || 0}天</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{(task as any).estimatedHours || 0}小时</td>
                    <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{(task as any).workHoursPerDay || 8}时/天</td>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status].bg} ${statusMap[task.status].color}`}>
                        {statusMap[task.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={(task as any).materials?.length > 0 ? (task as any).materials.map((m: any) => m.name).join(', ') : '-'}>
                      {(task as any).materials?.length > 0 ? (task as any).materials.map((m: any) => m.name).join(', ') : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate" title={(task as any).tools?.length > 0 ? (task as any).tools.map((t: any) => t.name).join(', ') : '-'}>
                      {(task as any).tools?.length > 0 ? (task as any).tools.map((t: any) => t.name).join(', ') : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedTask(task); setShowDetailModal(true); }}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                          <Edit className="w-4 h-4" />
                        </button>
                        {task.status === 'waiting_acceptance' && (
                          <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded" title="验收">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
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

      {/* 新建任务模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新建任务</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 步骤指示器 */}
            <div className="px-6 py-4 border-b border-gray-100">
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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">任务编号</label>
                    <div className="text-lg font-semibold text-gray-900">{newTask.taskId || '自动生成中...'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">任务类型 <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {taskTypes.map(t => (
                        <label key={t.value} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                  </div>
                  {newTask.types.includes('other') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">其他任务备注 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newTask.typeRemarks || ''}
                        onChange={(e) => setNewTask({ ...newTask, typeRemarks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="请输入其他任务说明"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务区域 <span className="text-red-500">*</span></label>
                    <select
                      value={newTask.field}
                      onChange={(e) => setNewTask({ ...newTask, field: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">请选择任务区域</option>
                      {fields.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                      <option value="other">其他</option>
                    </select>
                  </div>
                  {newTask.field === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">区域备注 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newTask.areaRemarks}
                        onChange={(e) => setNewTask({ ...newTask, areaRemarks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="请输入工作区域说明"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作物 <span className="text-red-500">*</span></label>
                    <select
                      value={newTask.crop}
                      onChange={(e) => setNewTask({ ...newTask, crop: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">请选择作物</option>
                      {Object.keys(cropStages).map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                      <option value="other">其他</option>
                    </select>
                  </div>
                  {newTask.crop === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作物备注 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newTask.cropRemarks || ''}
                        onChange={(e) => setNewTask({ ...newTask, cropRemarks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="请输入作物说明"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作业标准 (SOP)</label>
                    <textarea
                      value={newTask.sopContent}
                      onChange={(e) => setNewTask({ ...newTask, sopContent: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="请输入作业标准..."
                    />
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              type="number"
                              value={m.qty}
                              min="1"
                              onChange={(e) => {
                                const newMaterials = [...(newTask.materials || [])];
                                newMaterials[i].qty = Number(e.target.value);
                                setNewTask({ ...newTask, materials: newMaterials });
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
                              type="number"
                              value={t.qty}
                              min="1"
                              onChange={(e) => {
                                const newTools = [...(newTask.tools || [])];
                                newTools[i].qty = Number(e.target.value);
                                setNewTask({ ...newTask, tools: newTools });
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">天数</label>
                      <input
                        type="number"
                        value={newTask.estimatedDays || 0}
                        onChange={(e) => setNewTask({ ...newTask, estimatedDays: Number(e.target.value) })}
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">小时 <span className="text-xs text-gray-400">(最大{(newTask.workHoursPerDay || 8) - 1})</span></label>
                      <input
                        type="number"
                        value={newTask.estimatedHours || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const maxHours = (newTask.workHoursPerDay || 8) - 1;
                          if (val <= maxHours) {
                            setNewTask({ ...newTask, estimatedHours: val });
                          }
                        }}
                        min="0"
                        max={(newTask.workHoursPerDay || 8) - 1}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => createStep > 1 ? setCreateStep(createStep - 1) : setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                {createStep > 1 ? '上一步' : '取消'}
              </button>
              <button
                onClick={() => createStep < 3 ? setCreateStep(createStep + 1) : handleCreateTask()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
              >
                {createStep < 3 ? (
                  <>下一步 <ChevronRight className="w-4 h-4" /></>
                ) : (
                  '创建任务'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 任务详情弹窗 */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">任务详情 - {selectedTask.id}</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">任务类型</label>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${getTypeColor(selectedTask.type)}`}>
                        {getTypeIcon(selectedTask.type)}
                      </span>
                      {selectedTask.typeLabel}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">温室/大田编号</label>
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
                </div>
              </div>

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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status].bg} ${statusMap[selectedTask.status].color}`}>
                        {statusMap[selectedTask.status].label}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">优先级</label>
                    <p className={`font-semibold ${priorityMap[selectedTask.priority].color}`}>
                      {priorityMap[selectedTask.priority].label}
                    </p>
                  </div>
                </div>
              </div>

              {/* 进度 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selectedTask.progress === 100 ? 'bg-green-500' : selectedTask.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                      style={{ width: `${selectedTask.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{selectedTask.progress}%</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                关闭
              </button>
              {selectedTask.status === 'waiting_acceptance' && (
                <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
                  验收通过
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导出格式选择弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600">
              <h3 className="text-lg font-semibold text-white">导出格式选择</h3>
              <button onClick={handleCloseExportModal} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 条数据</p>
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="xlsx"
                    checked={exportFormat === 'xlsx'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">CSV (.csv)</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="word"
                    checked={exportFormat === 'word'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">Word (.doc)</span>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseExportModal}
                className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleActualExport}
                className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 智能推荐模态框 */}
      {showRecommendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900">智能推荐结果</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {recommendations.length} 条推荐
                </span>
              </div>
              <button onClick={() => setShowRecommendModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无推荐任务</p>
                  <p className="text-gray-400 text-sm mt-1">所有温室/大田任务安排合理，无需额外推荐</p>
                </div>
              ) : (
                <>
                  {/* 表格 */}
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRecommendations.length === recommendations.length && recommendations.length > 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              e.target.checked ? handleSelectAllRecommendations() : handleSelectNoneRecommendations();
                            }}
                            className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">温室/大田</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">作物</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">推荐任务</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">推荐人</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">建议日期</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">优先级</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map(rec => (
                        <tr
                          key={rec.id}
                          onClick={() => handleToggleRecommendation(rec.id)}
                          className={`border-b border-gray-100 cursor-pointer ${
                            selectedRecommendations.includes(rec.id) ? 'bg-purple-50' : 'hover:bg-gray-50'
                          } ${
                            rec.priority === 'high' ? 'bg-red-50' : rec.priority === 'medium' ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRecommendations.includes(rec.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleRecommendation(rec.id);
                              }}
                              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.greenhouse}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rec.crop}</td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 text-sm text-gray-600">{rec.assignee}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rec.suggestedDate}</td>
                          <td className="px-4 py-3">
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
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllRecommendations}
                  className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  全选
                </button>
                <button
                  onClick={handleSelectNoneRecommendations}
                  className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  全不选
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedRecommendations([]);
                    setShowRecommendModal(false);
                  }}
                  className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
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
                    任务类型,温室/大田,作物,负责人,计划开始时间,计划结束时间,优先级
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
                          <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">温室/大田</th>
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

      {/* 新增任务弹窗 */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        formData={newTask}
        errors={{}}
        onFormChange={(field, value) => setNewTask(prev => ({ ...prev, [field]: value }))}
        fields={fields}
        staff={staff}
        taskTypes={taskTypes.map(t => ({ value: t.value, label: t.label }))}
      />

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
    </div>
  );
}
