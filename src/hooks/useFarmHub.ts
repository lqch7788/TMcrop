/**
 * 农事任务中心 - 统一状态管理Hook
 * 读取现有hooks数据，不改变原有数据存储
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks, Task, TASK_STATUS_CONFIG } from './useTasks';
import { usePersistentProblems, ProblemEntry } from './usePersistentProblems';
import { usePersistentWorkLogs, WorkLogRecord } from './usePersistentWorkLogs';
import { STORAGE_KEYS } from './useLocalStorage';
import { InspectionRecord } from '../types';

// 巡查搜索过滤器类型
export interface InspectionSearchFilters {
  recordCode: string;
  inspectorName: string;
  inspectionType: string;
  startDate: string;
  endDate: string;
  status: string;
  problemStatus: string;
}

// 初始巡查筛选条件
const INITIAL_INSPECTION_FILTERS: InspectionSearchFilters = {
  recordCode: '',
  inspectorName: '',
  inspectionType: 'all',
  startDate: '',
  endDate: '',
  status: 'all',
  problemStatus: 'all',
};

// 导入初始任务数据（用于空状态时显示）
import { taskDispatchTasks } from '../data/farmMockData';
import { tempTasks as mockTempTasks, inspectionFeedbackTasks as mockInspectionFeedbackTasks, inspectionRecords as mockInspectionRecords } from '../data/mockData';
// 导入巡查和问题API服务
import { getAllInspections } from '../services/apiInspectionService';
import { getAllProblems } from '../services/apiProblemService';

// ============================================
// 类型定义
// ============================================

/**
 * Tab类型
 */
export type HubTab = 'task' | 'problem' | 'inspection' | 'tempTask';

/**
 * 统计数据
 */
export interface HubStats {
  pendingTasks: number;           // 待办任务数
  inProgressTasks: number;        // 进行中任务数
  todayCompleted: number;         // 今日完成数
  urgentProblems: number;          // 紧急问题数
  todayInspections: number;       // 今日巡查数
  // 巡查统计
  totalInspections: number;       // 累计巡查数
  abnormalInspections: number;    // 异常巡查数
  pendingProblems: number;         // 待处理问题数
  processedProblems: number;       // 已处理问题数
}

/**
 * 统一操作记录
 */
export interface UnifiedOperationRecord {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorType: 'user' | 'system';
  actionType: 'create' | 'assign' | 'accept' | 'reject' | 'progress' | 'submit' | 'verify' | 'report' | 'inspect';
  targetType: 'task' | 'problem' | 'inspection';
  targetCode: string;
  targetTitle: string;
  content: string;
  extra?: Record<string, unknown>;
}

/**
 * FarmHub状态
 */
export interface FarmHubState {
  // 当前Tab
  activeTab: HubTab;

  // 统计数据
  stats: HubStats;

  // 筛选状态
  filters: {
    status: string;
    type: string;
    area: string;
    search: string;
    assignee: string;
    batchCode: string;
  };

  // 选中项
  selectedIds: string[];

  // 操作记录（最近20条）
  recentRecords: UnifiedOperationRecord[];

  // 加载状态
  isLoading: boolean;
}

// ============================================
// Hook返回类型
// ============================================
export interface UseFarmHubReturn {
  // 状态
  state: FarmHubState;

  // 任务数据（直接从useTasks）
  tasks: Task[];
  problems: ProblemEntry[];
  inspections: InspectionRecord[];
  operationRecords: WorkLogRecord[];

  // Tab操作
  setActiveTab: (tab: HubTab) => void;

  // 筛选操作
  setFilter: (key: keyof FarmHubState['filters'], value: string) => void;
  resetFilters: () => void;

  // 选中操作
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 刷新数据
  refresh: () => void;
  forceRefresh: () => void;

  // 统计数据计算
  getFilteredTasks: () => Task[];
  getFilteredProblems: () => ProblemEntry[];
  getFilteredInspections: () => InspectionRecord[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取今日日期字符串
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 判断是否为今日
 */
function isToday(dateStr: string): boolean {
  return dateStr.startsWith(getTodayString());
}

// ============================================
// useFarmHub Hook
// ============================================
export function useFarmHub(): UseFarmHubReturn {
  // 使用 useTasks hook 的任务数据（与 TaskDispatchPage 共享同一数据源）
  const { tasks: useTasksData } = useTasks();

  // 其他数据使用独立状态
  const [problems, setProblems] = useState<ProblemEntry[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>(mockInspectionRecords);
  const [operationRecords, setOperationRecords] = useState<WorkLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 当前Tab
  const [activeTab, setActiveTab] = useState<HubTab>('task');

  // 筛选状态
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    area: 'all',
    search: '',
    assignee: 'all',
    batchCode: 'all',
  });

  // 选中项
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 刷新计数器（用于强制刷新任务列表）
  const [refreshKey, setRefreshKey] = useState(0);

  // ========== 巡查相关状态 ==========
  // 巡查筛选状态
  const [inspectionFilters, setInspectionFilters] = useState<InspectionSearchFilters>(INITIAL_INSPECTION_FILTERS);
  // 巡查分页状态
  const [inspectionPage, setInspectionPage] = useState(1);
  const [inspectionPageSize, setInspectionPageSize] = useState(20);
  // 巡查模式状态
  const [inspectionExportMode, setInspectionExportMode] = useState(false);
  const [inspectionBatchEditMode, setInspectionBatchEditMode] = useState(false);
  const [inspectionBatchDeleteMode, setInspectionBatchDeleteMode] = useState(false);
  // 巡查选中行（基于当前页索引）
  const [inspectionSelectedRows, setInspectionSelectedRows] = useState<number[]>([]);
  // 巡查弹窗状态
  const [inspectionDetailId, setInspectionDetailId] = useState<string | null>(null);
  const [isCreateInspectionOpen, setIsCreateInspectionOpen] = useState(false);
  const [isInspectionDetailOpen, setIsInspectionDetailOpen] = useState(false);
  // 巡查批量编辑相关状态
  const [inspectionEditedRecords, setInspectionEditedRecords] = useState<Record<string, Partial<InspectionRecord>>>({});
  const [inspectionEditedRecordIds, setInspectionEditedRecordIds] = useState<string[]>([]);
  const [inspectionSelectedRecordId, setInspectionSelectedRecordId] = useState<string>('');

  // 任务数据（直接从 localStorage 读取最新数据，确保实时更新）
  // 排序函数：按创建时间倒序（最新在前）
  // 使用时间戳比较，确保无效日期也能正确排序
  const sortByCreatedAt = (a: Task, b: Task) => {
    const getCreatedAtTime = (task: Task): number => {
      const timeStr = task.createdAt || task.planStart || task.startDate || '';
      if (!timeStr) return 0;
      // 尝试解析为有效日期
      const date = new Date(timeStr);
      // 如果是无效日期（返回 NaN），返回 0 让有效日期排前面
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const aTime = getCreatedAtTime(a);
    const bTime = getCreatedAtTime(b);
    // 倒序，最新在前：bTime - aTime
    // 无效日期（0）会排在最后
    return bTime - aTime;
  };

  const tasks = useMemo(() => {
    try {
      // 直接从 localStorage 读取最新任务数据
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const allTasks: Task[] = parsed.data || parsed || [];

        // 过滤农事任务
        const farmTasks = allTasks.filter(t => {
          const dispatchMode = t.dispatchMode || 'farm';
          return dispatchMode === 'farm';
        });

        // 排序
        const sortedTasks = [...farmTasks].sort(sortByCreatedAt);

        return sortedTasks;
      }
    } catch (e) {
      // 读取任务数据失败
    }
    // 备用：从 useTasksData 获取
    return useTasksData
      .filter(t => {
        const dispatchMode = t.dispatchMode || 'farm';
        return dispatchMode === 'farm';
      })
      .sort(sortByCreatedAt);
  }, [refreshKey, useTasksData]);

  // 统计数据
  const stats = useMemo((): HubStats => {
    const today = getTodayString();

    // 计算任务统计
    const pendingTasks = tasks.filter(t =>
      ['pending', 'accepted'].includes(t.status)
    ).length;
    const inProgressTasks = tasks.filter(t =>
      t.status === 'in_progress'
    ).length;
    const todayCompleted = tasks.filter(t =>
      t.status === 'completed' && t.completedAt?.startsWith(today)
    ).length;

    // 计算问题统计
    const urgentProblems = problems.filter(p =>
      p.issueSeverity === '严重' && ['待处理', '处理中'].includes(p.status)
    ).length;

    // 计算巡查统计
    const todayInspections = inspections.filter(i =>
      isToday(i.checkDate)
    ).length;
    const totalInspections = inspections.length;
    const abnormalInspections = inspections.filter(i =>
      i.status === 'critical' || i.status === 'abnormal'
    ).length;
    const pendingProblems = problems.filter(p =>
      ['待处理', '处理中'].includes(p.status)
    ).length;
    const processedProblems = problems.filter(p =>
      p.status === '已处理'
    ).length;

    return {
      pendingTasks,
      inProgressTasks,
      todayCompleted,
      urgentProblems,
      todayInspections,
      totalInspections,
      abnormalInspections,
      pendingProblems,
      processedProblems,
    };
  }, [tasks, problems, inspections]);

  // 加载其他数据（问题、巡查、操作记录）
  const loadData = useCallback(() => {
    setIsLoading(true);

    // 尝试从API加载数据，失败时回退到localStorage
    const loadFromAPIs = async () => {
      try {
        // 并行请求API数据
        const [apiProblems, apiInspections] = await Promise.allSettled([
          getAllProblems(),
          getAllInspections()
        ]);

        // 处理问题数据
        if (apiProblems.status === 'fulfilled' && apiProblems.value && Array.isArray(apiProblems.value) && apiProblems.value.length > 0) {
          console.log('[useFarmHub] 从API获取到问题数据:', apiProblems.value.length, '条');
          setProblems(apiProblems.value as ProblemEntry[]);
        }

        // 处理巡查数据
        if (apiInspections.status === 'fulfilled' && apiInspections.value && Array.isArray(apiInspections.value) && apiInspections.value.length > 0) {
          console.log('[useFarmHub] 从API获取到巡查数据:', apiInspections.value.length, '条');
          setInspections(apiInspections.value as InspectionRecord[]);
        }
      } catch (error) {
        console.warn('[useFarmHub] API调用失败，使用本地数据:', error);
      }
    };

    // 加载本地数据作为备份
    const loadFromLocal = () => {
      try {
        // 读取问题数据
        const storedProblems = localStorage.getItem(STORAGE_KEYS.DAILY_PROBLEMS);
        if (storedProblems) {
          const parsed = JSON.parse(storedProblems);
          setProblems(Array.isArray(parsed) ? parsed : []);
        }

        // 读取巡查数据
        const storedInspections = localStorage.getItem(STORAGE_KEYS.INSPECTION_RECORDS);
        if (storedInspections) {
          const parsed = JSON.parse(storedInspections);
          setInspections(Array.isArray(parsed) ? parsed : []);
        }

        // 读取操作记录
        const storedRecords = localStorage.getItem(STORAGE_KEYS.OPERATION_RECORDS);
        if (storedRecords) {
          const parsed = JSON.parse(storedRecords);
          setOperationRecords(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        // 加载数据失败
      } finally {
        setIsLoading(false);
      }
      // 刷新任务计数，触发任务列表重新渲染
      setRefreshKey(k => k + 1);
    };

    // 先尝试API加载，然后回退到本地
    loadFromAPIs().finally(() => {
      loadFromLocal();
    });
  }, []);

  // 强制刷新任务列表
  const forceRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 筛选操作
  const setFilter = useCallback((key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ status: 'all', type: 'all', area: 'all', search: '', assignee: 'all', batchCode: 'all' });
  }, []);

  // 选中操作
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (activeTab === 'task') {
      setSelectedIds(filteredTasks.map(t => t.id));
    } else if (activeTab === 'problem') {
      setSelectedIds(filteredProblems.map(p => String(p.id)));
    } else {
      setSelectedIds(filteredInspections.map(i => i.id));
    }
  }, [activeTab]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // 过滤后的数据
  const getFilteredTasks = useCallback((): Task[] => {
    // 使用统一的排序函数（已在上方定义）
    return tasks
      .filter(task => {
        // 状态筛选
        if (filters.status !== 'all' && task.status !== filters.status) {
          return false;
        }
        // 类型筛选
        if (filters.type !== 'all' && task.type !== filters.type) {
          return false;
        }
        // 区域筛选
        if (filters.area !== 'all' && task.greenhouseName !== filters.area) {
          return false;
        }
        // 执行人筛选
        if (filters.assignee !== 'all' && task.assigneeName !== filters.assignee) {
          return false;
        }
        // 批次筛选
        if (filters.batchCode !== 'all' && task.batchCode !== filters.batchCode) {
          return false;
        }
        // 搜索筛选
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return (
            task.title.toLowerCase().includes(search) ||
            task.taskCode.toLowerCase().includes(search) ||
            task.assigneeName?.toLowerCase().includes(search)
          );
        }
        return true;
      })
      .sort(sortByCreatedAt);
  }, [tasks, filters]);

  const getFilteredProblems = useCallback((): ProblemEntry[] => {
    return problems.filter(problem => {
      // 状态筛选
      if (filters.status !== 'all' && problem.status !== filters.status) {
        return false;
      }
      // 严重程度筛选
      if (filters.type !== 'all' && problem.issueSeverity !== filters.type) {
        return false;
      }
      // 区域筛选
      if (filters.area !== 'all' && problem.greehouseName !== filters.area) {
        return false;
      }
      // 搜索筛选
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          problem.issueText?.toLowerCase().includes(search) ||
          problem.problemCode?.toLowerCase().includes(search) ||
          problem.handler?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [problems, filters]);

  const getFilteredInspections = useCallback((): InspectionRecord[] => {
    return inspections.filter(inspection => {
      // 巡查编号筛选
      if (inspectionFilters.recordCode && !inspection.recordCode?.toLowerCase().includes(inspectionFilters.recordCode.toLowerCase())) {
        return false;
      }
      // 提交人筛选
      if (inspectionFilters.inspectorName && !inspection.inspectorName?.toLowerCase().includes(inspectionFilters.inspectorName.toLowerCase())) {
        return false;
      }
      // 巡查类型筛选
      if (inspectionFilters.inspectionType !== 'all' && inspection.inspectionType !== inspectionFilters.inspectionType) {
        return false;
      }
      // 巡查日期起筛选
      if (inspectionFilters.startDate && inspection.checkDate < inspectionFilters.startDate) {
        return false;
      }
      // 巡查日期止筛选
      if (inspectionFilters.endDate && inspection.checkDate > inspectionFilters.endDate) {
        return false;
      }
      // 状态筛选
      if (inspectionFilters.status !== 'all' && inspection.status !== inspectionFilters.status) {
        return false;
      }
      // 问题处理状态筛选
      if (inspectionFilters.problemStatus !== 'all') {
        const problemStatusMap: Record<string, string> = {
          '待处理': 'pending',
          '处理中': 'processing',
          '待验收': 'pending', // 待验收也是pending状态
          '已处理': 'resolved',
        };
        const mappedStatus = problemStatusMap[inspectionFilters.problemStatus];
        if (mappedStatus && inspection.issueStatus !== mappedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [inspections, inspectionFilters]);

  // 构建统一操作记录
  const recentRecords = useMemo((): UnifiedOperationRecord[] => {
    const records: UnifiedOperationRecord[] = [];
    const today = getTodayString();

    // 从任务记录转换
    const taskRecordsData = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
    if (taskRecordsData) {
      try {
        const taskRecords = JSON.parse(taskRecordsData);
        taskRecords.slice(0, 20).forEach((record: { id?: string; actionTime?: string; createdAt?: string; operatorName?: string; action?: string; taskCode?: string; taskTitle?: string }) => {
          records.push({
            id: record.id || `task-${Date.now()}-${Math.random()}`,
            timestamp: record.actionTime || record.createdAt,
            operatorName: record.operatorName || '未知',
            operatorType: 'user',
            actionType: mapTaskActionToType(record.action),
            targetType: 'task',
            targetCode: record.taskCode || '',
            targetTitle: record.taskTitle || '',
            content: `${record.operatorName} ${getActionText(record.action)} 任务【${record.taskTitle}】`,
            extra: record,
          });
        });
      } catch (e) {
        // 解析任务记录失败
      }
    }

    // 从工作日志转换
    operationRecords.slice(0, 10).forEach(log => {
      records.push({
        id: `log-${log.id}`,
        timestamp: log.date + ' ' + (log.checkIn || '00:00'),
        operatorName: log.workerName || '未知',
        operatorType: 'user',
        actionType: 'progress',
        targetType: 'task',
        targetCode: log.taskCode || '',
        targetTitle: log.taskTitle || '',
        content: `${log.workerName} 完成了任务【${log.taskTitle}】`,
        extra: log,
      });
    });

    // 按时间排序
    records.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return records.slice(0, 20);
  }, [operationRecords]);

  // 过滤后的数据实例
  const filteredTasks = getFilteredTasks();
  const filteredProblems = getFilteredProblems();
  const filteredInspections = getFilteredInspections();

  // ========== 巡查相关操作方法 ==========
  // 巡查筛选操作
  const setInspectionFilter = useCallback((key: keyof InspectionSearchFilters, value: string) => {
    setInspectionFilters(prev => ({ ...prev, [key]: value }));
    setInspectionPage(1); // 重置页码
  }, []);

  const resetInspectionFilters = useCallback(() => {
    setInspectionFilters(INITIAL_INSPECTION_FILTERS);
    setInspectionPage(1);
  }, []);

  // 巡查分页操作
  const inspectionGoToPage = useCallback((page: number) => {
    setInspectionPage(page);
  }, []);

  const inspectionGoToPageSize = useCallback((size: number) => {
    setInspectionPageSize(size);
    setInspectionPage(1);
  }, []);

  // 巡查模式切换
  const toggleInspectionExportMode = useCallback(() => {
    setInspectionExportMode(prev => !prev);
    setInspectionBatchEditMode(false);
    setInspectionBatchDeleteMode(false);
    setInspectionSelectedRows([]);
  }, []);

  const toggleInspectionBatchEditMode = useCallback(() => {
    setInspectionBatchEditMode(prev => !prev);
    setInspectionExportMode(false);
    setInspectionBatchDeleteMode(false);
    setInspectionSelectedRows([]);
  }, []);

  const toggleInspectionBatchDeleteMode = useCallback(() => {
    setInspectionBatchDeleteMode(prev => !prev);
    setInspectionExportMode(false);
    setInspectionBatchEditMode(false);
    setInspectionSelectedRows([]);
  }, []);

  // 巡查行选择操作
  const toggleInspectionSelectRow = useCallback((index: number) => {
    setInspectionSelectedRows(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }, []);

  const selectAllInspectionRows = useCallback((totalRows: number) => {
    setInspectionSelectedRows(Array.from({ length: totalRows }, (_, i) => i));
  }, []);

  const clearInspectionSelection = useCallback(() => {
    setInspectionSelectedRows([]);
  }, []);

  // 巡查弹窗操作
  const openInspectionDetail = useCallback((recordId: string) => {
    setInspectionDetailId(recordId);
    setIsInspectionDetailOpen(true);
  }, []);

  const closeInspectionDetail = useCallback(() => {
    setInspectionDetailId(null);
    setIsInspectionDetailOpen(false);
  }, []);

  const openCreateInspection = useCallback(() => {
    setIsCreateInspectionOpen(true);
  }, []);

  const closeCreateInspection = useCallback(() => {
    setIsCreateInspectionOpen(false);
  }, []);

  // 巡查批量编辑操作
  const updateInspectionEditedRecords = useCallback((records: Record<string, Partial<InspectionRecord>>) => {
    setInspectionEditedRecords(records);
  }, []);

  const updateInspectionEditedRecordIds = useCallback((ids: string[]) => {
    setInspectionEditedRecordIds(ids);
  }, []);

  const updateInspectionSelectedRecordId = useCallback((id: string) => {
    setInspectionSelectedRecordId(id);
  }, []);

  const clearInspectionEditedRecords = useCallback(() => {
    setInspectionEditedRecords({});
    setInspectionEditedRecordIds([]);
    setInspectionSelectedRecordId('');
  }, []);

  return {
    state: {
      activeTab,
      stats,
      filters,
      selectedIds,
      recentRecords,
      isLoading,
    },
    tasks,
    problems,
    inspections,
    operationRecords,
    setActiveTab,
    setFilter,
    resetFilters,
    setSelectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    refresh: loadData,
    forceRefresh,
    getFilteredTasks,
    getFilteredProblems,
    getFilteredInspections,
    // 巡查状态
    inspectionFilters,
    inspectionPage,
    inspectionPageSize,
    inspectionExportMode,
    inspectionBatchEditMode,
    inspectionBatchDeleteMode,
    inspectionSelectedRows,
    inspectionDetailId,
    isCreateInspectionOpen,
    isInspectionDetailOpen,
    inspectionEditedRecords,
    inspectionEditedRecordIds,
    inspectionSelectedRecordId,
    // 巡查操作方法
    setInspectionFilter,
    resetInspectionFilters,
    inspectionGoToPage,
    inspectionGoToPageSize,
    toggleInspectionExportMode,
    toggleInspectionBatchEditMode,
    toggleInspectionBatchDeleteMode,
    toggleInspectionSelectRow,
    selectAllInspectionRows,
    clearInspectionSelection,
    openInspectionDetail,
    closeInspectionDetail,
    openCreateInspection,
    closeCreateInspection,
    updateInspectionEditedRecords,
    updateInspectionEditedRecordIds,
    updateInspectionSelectedRecordId,
    clearInspectionEditedRecords,
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 映射任务动作到统一操作类型
 */
function mapTaskActionToType(action: string): UnifiedOperationRecord['actionType'] {
  const map: Record<string, UnifiedOperationRecord['actionType']> = {
    create: 'create',
    publish: 'create',
    assign: 'assign',
    accept: 'accept',
    reject: 'reject',
    progress: 'progress',
    submit: 'submit',
    complete: 'verify',
    verify: 'verify',
  };
  return map[action] || 'progress';
}

/**
 * 获取动作文本
 */
function getActionText(action: string): string {
  const map: Record<string, string> = {
    create: '创建了',
    publish: '发布了',
    assign: '分派了',
    accept: '接受了',
    reject: '拒绝了',
    progress: '更新了',
    submit: '提交了',
    complete: '验收了',
    verify: '验收了',
  };
  return map[action] || action;
}

export type { Task, ProblemEntry, InspectionRecord, WorkLogRecord };
