/**
 * 工单持久化 Hook
 * 工单数据保存到 localStorage，刷新页面不丢失
 */

import { useCallback, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEYS, clearAllPersistedData } from './useLocalStorage';

// 工单类型
export interface WorkLogEntry {
  id: number;
  code: string;
  date: string;
  worker: string;
  weather: string;
  temperature: string;
  crop: string;
  greenhouse: string;
  growthStatus: '良好' | '一般';
  tasks: string;
  problems: string;
  solutions: string;
  taskId?: string;
  batchId?: string;
  batchCode?: string;
  // 新增字段：与任务相关的详细信息
  taskCode?: string;       // 任务编号（如 RW-20260422-001）
  taskType?: string;      // 任务类型（spraying、irrigation等）
  taskTypeName?: string;  // 任务类型名称（施肥、灌溉等）
  progress?: number;      // 提交时的进度
  workloadHours?: number; // 工作量（小时）
  workloadDays?: number;  // 工作量（天）
  workers?: number;        // 作业人数
  submitTime?: string;    // 提交时间
  feedbackText?: string;  // 反馈/备注内容
}

// 任务进度更新参数
export interface TaskProgressUpdate {
  progress: number;
  notes?: string;
  workload?: number;
  unit?: string;
  startTime?: string;
  endTime?: string;
}

// 初始 mock 数据
const INITIAL_WORK_LOGS: WorkLogEntry[] = [
  {
    id: 1, code: 'WL20260314', date: '2026-03-14', worker: '郭靖', weather: '晴', temperature: '25°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好',
    tasks: '番茄授粉工作', problems: '无', solutions: '-',
    taskId: 'T001', batchId: 'B001', batchCode: 'FQ2026-001',
    taskCode: 'RW-20260301-001', taskType: 'spraying', taskTypeName: '施肥', progress: 100,
    workloadHours: 6, workloadDays: 1, workers: 2,
    submitTime: '2026-03-14T17:30:00Z', feedbackText: '已完成全部授粉任务'
  },
  {
    id: 2, code: 'WL20260314', date: '2026-03-14', worker: '杨过', weather: '晴', temperature: '26°C', crop: '黄瓜', greenhouse: '2号棚', growthStatus: '良好',
    tasks: '黄瓜施肥和病虫害防治', problems: '发现少量蚜虫', solutions: '已喷洒吡虫啉',
    taskId: 'T002', batchId: 'B002', batchCode: 'FQ2026-002',
    taskCode: 'RW-20260302-001', taskType: 'fertilizing', taskTypeName: '施肥', progress: 80,
    workloadHours: 8, workloadDays: 1, workers: 1,
    submitTime: '2026-03-14T18:00:00Z', feedbackText: '发现蚜虫已处理，整体进度80%'
  },
  {
    id: 3, code: 'WL20260314', date: '2026-03-14', worker: '张无忌', weather: '晴', temperature: '24°C', crop: '草莓', greenhouse: '3号棚', growthStatus: '一般',
    tasks: '草莓疏果和浇水', problems: '部分叶片发黄', solutions: '补充氮肥',
    taskId: 'T003', batchId: 'B003', batchCode: 'FQ2026-003',
    taskCode: 'RW-20260303-001', taskType: 'pruning', taskTypeName: '修剪', progress: 60,
    workloadHours: 5, workloadDays: 1, workers: 1,
    submitTime: '2026-03-14T16:45:00Z', feedbackText: '叶片发黄已补充氮肥'
  },
  {
    id: 4, code: 'WL20260313', date: '2026-03-13', worker: '令狐冲', weather: '多云', temperature: '22°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好',
    tasks: '番茄整枝和授粉', problems: '无', solutions: '-',
    taskId: 'T001', batchId: 'B001', batchCode: 'FQ2026-001',
    taskCode: 'RW-20260228-001', taskType: 'pruning', taskTypeName: '修剪', progress: 100,
    workloadHours: 7, workloadDays: 1, workers: 2,
    submitTime: '2026-03-13T17:00:00Z', feedbackText: '整枝授粉完成'
  },
  {
    id: 5, code: 'WL20260313', date: '2026-03-13', worker: '段誉', weather: '多云', temperature: '23°C', crop: '辣椒', greenhouse: '4号棚', growthStatus: '良好',
    tasks: '辣椒浇水施肥', problems: '无', solutions: '-',
    taskId: 'T005', batchId: 'B005', batchCode: 'FQ2026-005',
    taskCode: 'RW-20260305-001', taskType: 'irrigation', taskTypeName: '灌溉', progress: 100,
    workloadHours: 4, workloadDays: 1, workers: 1,
    submitTime: '2026-03-13T15:30:00Z', feedbackText: '浇水施肥已完成'
  },
  {
    id: 6, code: 'WL20260312', date: '2026-03-12', worker: '黄蓉', weather: '阴', temperature: '20°C', crop: '生菜', greenhouse: '5号棚', growthStatus: '良好',
    tasks: '生菜采收清洗', problems: '无', solutions: '-',
    taskId: 'T004', batchId: 'B004', batchCode: 'FQ2026-004',
    taskCode: 'RW-20260306-001', taskType: 'harvesting', taskTypeName: '采收', progress: 100,
    workloadHours: 10, workloadDays: 2, workers: 3,
    submitTime: '2026-03-12T18:30:00Z', feedbackText: '生菜采收完毕，共200kg'
  },
  {
    id: 7, code: 'WL20260312', date: '2026-03-12', worker: '陈家洛', weather: '阴', temperature: '21°C', crop: '菠菜', greenhouse: '6号棚', growthStatus: '一般',
    tasks: '菠菜除草浇水', problems: '发现蜗牛', solutions: '已撒石灰驱除',
    taskId: undefined, batchId: 'B006', batchCode: 'FQ2026-006',
    taskCode: 'RW-20260307-001', taskType: 'weeding', taskTypeName: '除草', progress: 45,
    workloadHours: 3, workloadDays: 1, workers: 1,
    submitTime: '2026-03-12T14:20:00Z', feedbackText: '发现蜗牛，已用石灰处理'
  },
  {
    id: 8, code: 'WL20260311', date: '2026-03-11', worker: '任盈盈', weather: '晴', temperature: '24°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好',
    tasks: '番茄绑蔓修剪', problems: '无', solutions: '-',
    taskId: 'T001', batchId: 'B001', batchCode: 'FQ2026-001',
    taskCode: 'RW-20260225-001', taskType: 'pruning', taskTypeName: '修剪', progress: 100,
    workloadHours: 6, workloadDays: 1, workers: 2,
    submitTime: '2026-03-11T16:00:00Z', feedbackText: '绑蔓修剪完成'
  },
  {
    id: 9, code: 'WL20260311', date: '2026-03-11', worker: '郭靖', weather: '晴', temperature: '26°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好',
    tasks: '番茄第二次施肥', problems: '无', solutions: '-',
    taskId: 'T001', batchId: 'B001', batchCode: 'FQ2026-001',
    taskCode: 'RW-20260311-001', taskType: 'fertilizing', taskTypeName: '施肥', progress: 50,
    workloadHours: 5, workloadDays: 1, workers: 2,
    submitTime: '2026-03-11T14:00:00Z', feedbackText: '施肥进度50%，预计明天完成'
  },
  {
    id: 10, code: 'WL20260310', date: '2026-03-10', worker: '杨过', weather: '晴', temperature: '27°C', crop: '黄瓜', greenhouse: '2号棚', growthStatus: '良好',
    tasks: '黄瓜日常浇水', problems: '无', solutions: '-',
    taskId: 'T002', batchId: 'B002', batchCode: 'FQ2026-002',
    taskCode: 'RW-20260310-001', taskType: 'irrigation', taskTypeName: '灌溉', progress: 100,
    workloadHours: 3, workloadDays: 1, workers: 1,
    submitTime: '2026-03-10T10:00:00Z', feedbackText: '浇水完成'
  },
  {
    id: 11, code: 'WL20260310', date: '2026-03-10', worker: '张无忌', weather: '晴', temperature: '25°C', crop: '草莓', greenhouse: '3号棚', growthStatus: '良好',
    tasks: '草莓采摘', problems: '无', solutions: '-',
    taskId: 'T003', batchId: 'B003', batchCode: 'FQ2026-003',
    taskCode: 'RW-20260310-002', taskType: 'harvesting', taskTypeName: '采收', progress: 100,
    workloadHours: 8, workloadDays: 1, workers: 2,
    submitTime: '2026-03-10T17:30:00Z', feedbackText: '采摘草莓150kg，品质良好'
  },
  {
    id: 12, code: 'WL20260309', date: '2026-03-09', worker: '令狐冲', weather: '阴', temperature: '21°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好',
    tasks: '番茄病虫害巡查', problems: '发现疑似晚疫病早期症状', solutions: '加强通风，适当减少浇水',
    taskId: 'T001', batchId: 'B001', batchCode: 'FQ2026-001',
    taskCode: 'RW-20260309-001', taskType: 'inspection', taskTypeName: '巡查', progress: 30,
    workloadHours: 2, workloadDays: 1, workers: 1,
    submitTime: '2026-03-09T09:30:00Z', feedbackText: '发现疑似晚疫病，已采取措施'
  },
];

// 下一个可用的 ID
let nextWorkLogId = INITIAL_WORK_LOGS.length + 1; // 初始为13

/**
 * 工单持久化 Hook
 */
export function usePersistentWorkLogs() {
  const [workLogs, setWorkLogs] = useLocalStorage<WorkLogEntry[]>(
    STORAGE_KEYS.WORK_LOGS,
    INITIAL_WORK_LOGS
  );

  // 添加新工单
  const addWorkLog = useCallback((entry: Omit<WorkLogEntry, 'id'>) => {
    const newEntry: WorkLogEntry = {
      ...entry,
      id: nextWorkLogId++,
    };
    setWorkLogs(prev => [newEntry, ...prev]);
    return newEntry;
  }, [setWorkLogs]);

  // 更新工单
  const updateWorkLog = useCallback((id: number, updates: Partial<WorkLogEntry>) => {
    setWorkLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
  }, [setWorkLogs]);

  // 删除工单
  const deleteWorkLog = useCallback((id: number) => {
    setWorkLogs(prev => prev.filter(log => log.id !== id));
  }, [setWorkLogs]);

  // 重置为初始数据
  const resetToInitial = useCallback(() => {
    clearAllPersistedData();
    setWorkLogs(INITIAL_WORK_LOGS);
    nextWorkLogId = INITIAL_WORK_LOGS.length + 1;
  }, [setWorkLogs]);

  // 生成新的工单编号
  const generateWorkLogCode = useCallback(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    return `WL${dateStr}${String(nextWorkLogId).padStart(3, '0')}`;
  }, []);

  // 按任务ID查询工单（用于判断是否已存在）
  const getWorkLogsByTaskId = useCallback((taskId: string): WorkLogEntry | undefined => {
    return workLogs.find(log => log.taskId === taskId);
  }, [workLogs]);

  // 按任务ID更新工单
  const updateWorkLogByTaskId = useCallback((taskId: string, updates: Partial<WorkLogEntry>) => {
    setWorkLogs(prev => prev.map(log =>
      log.taskId === taskId ? { ...log, ...updates } : log
    ));
  }, [setWorkLogs]);

  // 从任务进度创建或更新工单（用于每日工单汇总对接）
  const syncWorkLogFromTask = useCallback((
    task: {
      id: string;
      taskCode: string;
      assigneeName: string;
      cropName: string;
      greenhouseName: string;
      title: string;
      batchId?: string;
      batchCode?: string;
      type?: string;       // 新增：任务类型
      typeName?: string;   // 新增：任务类型名称
    },
    progressUpdate: TaskProgressUpdate & {
      workloadDays?: number;
      workloadHours?: number;
      workers?: number;
    }
  ): WorkLogEntry => {
    const today = new Date().toISOString().slice(0, 10);
    const existingLog = workLogs.find(log => log.taskId === task.id);

    if (existingLog) {
      // 已存在则更新
      const updatedLog: WorkLogEntry = {
        ...existingLog,
        tasks: task.title,
        solutions: progressUpdate.notes || existingLog.solutions,
        date: today, // 更新为今天
        progress: progressUpdate.progress,
        workloadHours: progressUpdate.workloadHours,
        workloadDays: progressUpdate.workloadDays,
        workers: progressUpdate.workers,
        feedbackText: progressUpdate.notes,
        submitTime: new Date().toISOString(),
      };
      setWorkLogs(prev => prev.map(log =>
        log.id === existingLog.id ? updatedLog : log
      ));
      return updatedLog;
    } else {
      // 不存在则创建新工单
      const newLog: WorkLogEntry = {
        id: nextWorkLogId++,
        code: generateWorkLogCode(),
        date: today,
        worker: task.assigneeName,
        weather: '',
        temperature: '',
        crop: task.cropName,
        greenhouse: task.greenhouseName,
        growthStatus: '良好',
        tasks: task.title,
        problems: '',
        solutions: progressUpdate.notes || '',
        taskId: task.id,
        batchId: task.batchId,
        batchCode: task.batchCode,
        taskCode: task.taskCode,
        taskType: task.type,
        taskTypeName: task.typeName,
        progress: progressUpdate.progress,
        workloadHours: progressUpdate.workloadHours,
        workloadDays: progressUpdate.workloadDays,
        workers: progressUpdate.workers,
        submitTime: new Date().toISOString(),
        feedbackText: progressUpdate.notes,
      };
      setWorkLogs(prev => [newLog, ...prev]);
      return newLog;
    }
  }, [workLogs, setWorkLogs, generateWorkLogCode]);

  return {
    workLogs,
    addWorkLog,
    updateWorkLog,
    deleteWorkLog,
    resetToInitial,
    resetWorkLogs: resetToInitial,
    generateWorkLogCode,
    getWorkLogsByTaskId,
    updateWorkLogByTaskId,
    syncWorkLogFromTask,
  };
}

// 导出初始数据常量，供其他 Hook 使用
export { INITIAL_WORK_LOGS };
