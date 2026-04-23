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

// 导入初始任务数据（用于空状态时显示）
import { taskDispatchTasks } from '../data/farmMockData';
import { tempTasks as mockTempTasks, inspectionFeedbackTasks as mockInspectionFeedbackTasks } from '../data/mockData';

// ============================================
// 类型定义
// ============================================

/**
 * Tab类型
 */
export type HubTab = 'task' | 'problem' | 'inspection';

/**
 * 统计数据
 */
export interface HubStats {
  pendingTasks: number;           // 待办任务数
  inProgressTasks: number;        // 进行中任务数
  todayCompleted: number;         // 今日完成数
  urgentProblems: number;        // 紧急问题数
  todayInspections: number;       // 今日巡查数
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
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
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
  });

  // 选中项
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 任务数据（使用 useTasks 的数据，并通过 dispatchMode 过滤）
  const tasks = useMemo(() => {
    return useTasksData.filter(t => {
      const dispatchMode = t.dispatchMode || 'farm';
      return dispatchMode === 'farm';
    });
  }, [useTasksData]);

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

    return {
      pendingTasks,
      inProgressTasks,
      todayCompleted,
      urgentProblems,
      todayInspections,
    };
  }, [tasks, problems, inspections]);

  // 加载其他数据（问题、巡查、操作记录）
  const loadData = useCallback(() => {
    setIsLoading(true);
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
      console.error('[useFarmHub] 加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
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
    setFilters({ status: 'all', type: 'all', area: 'all', search: '' });
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
    return tasks.filter(task => {
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
    });
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
      // 状态筛选
      if (filters.status !== 'all' && inspection.status !== filters.status) {
        return false;
      }
      // 类型筛选
      if (filters.type !== 'all' && inspection.inspectionType !== filters.type) {
        return false;
      }
      // 区域筛选
      if (filters.area !== 'all' && inspection.greenhouseName !== filters.area) {
        return false;
      }
      // 搜索筛选
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          inspection.recordCode?.toLowerCase().includes(search) ||
          inspection.inspectorName?.toLowerCase().includes(search) ||
          inspection.greenhouseName?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [inspections, filters]);

  // 构建统一操作记录
  const recentRecords = useMemo((): UnifiedOperationRecord[] => {
    const records: UnifiedOperationRecord[] = [];
    const today = getTodayString();

    // 从任务记录转换
    const taskRecordsData = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
    if (taskRecordsData) {
      try {
        const taskRecords = JSON.parse(taskRecordsData);
        taskRecords.slice(0, 20).forEach((record: any) => {
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
        console.warn('[useFarmHub] 解析任务记录失败', e);
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
    getFilteredTasks,
    getFilteredProblems,
    getFilteredInspections,
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
