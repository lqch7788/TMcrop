/**
 * 问题分派 Hook
 * 用于将问题分派给员工处理，并创建关联任务
 * V2.0: 数据层从 localStorage (usePersistentProblems) 迁移到 API (useProblemStore)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProblemStore, type ProblemData } from '../stores/useProblemStore';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import { useTasks } from './useTasks';
import type { Task } from '../types';
import { useWorkerStore } from '../stores/useWorkerStore';
import { todayLocal } from '@/lib/dateUtils';

// ========== 状态映射（中文 ↔ 英文） ==========

const STATUS_EN_TO_CN: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'waiting_acceptance': '待验收',
  'completed': '已处理',
};

const STATUS_CN = {
  PENDING: '待处理',
  IN_PROGRESS: '处理中',
  WAITING_ACCEPTANCE: '待验收',
  COMPLETED: '已处理',
} as const;

const STATUS_EN = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  WAITING_ACCEPTANCE: 'waiting_acceptance',
  COMPLETED: 'completed',
} as const;

/** 检查问题状态是否为指定中文状态 */
const isStatus = (p: ProblemData, cn: string): boolean => {
  // ?????????statusLabel????? status ?????
  return (p as any).status === cn || (p as any).statusLabel === cn || (STATUS_EN_TO_CN as any)[(p as any).status] === cn;
};

// 问题类型到任务类型的映射
const PROBLEM_TYPE_MAP: Record<string, Task['type']> = {
  '虫害': 'spraying',
  '病害': 'spraying',
  '环境': 'irrigation',
  '水肥': 'fertilization',
  '其他': 'scouting',
};

// 问题严重程度到任务优先级的映射
const SEVERITY_PRIORITY_MAP: Record<string, Task['priority']> = {
  '严重': 'high',
  '中等': 'medium',
  '轻微': 'low',
};

// 分派记录类型
interface DispatchRecord {
  id: string;
  problemId: number;
  taskId: string;
  dispatchTime: string;
  dispatcherId: string;
  dispatcherName: string;
}

// 问题流转记录类型
export interface ProblemFlowRecord {
  id: string;
  problemId: number;
  operatorId: string;
  operatorName: string;
  action: 'report' | 'dispatch' | 'accept' | 'reject' | 'start' | 'submit' | 'approve' | 'complete' | 'comment' | 'progress' | 'reject_acceptance';
  fromStatus: string;
  toStatus: string;
  comment?: string;
  actionTime: string;
  // 反馈数据（位置、照片、语音等）
  feedbackData?: {
    gpsLocation?: { lat: number; lng: number };
    photosBefore?: string[];
    photosAfter?: string[];
    materialCode?: string;
    voiceNote?: string;
    progress?: number;
  };
}

// 计算下一个任务序号（基于日期+序号）
const getNextTaskSeq = (tasks: Task[], prefix: string): string => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todaySeqs = tasks
    .filter(t => t.id.startsWith(`${prefix}-${today}`))
    .map(t => {
      const seq = t.id.split('-').pop();
      return parseInt(seq || '0', 10);
    });
  const maxSeq = todaySeqs.length > 0 ? Math.max(...todaySeqs) : 0;
  return String(maxSeq + 1).padStart(3, '0');
};

// 生成任务ID（格式：RW-YYYYMMDD-序号，如 RW-20260415-001）
const generateTaskId = (tasks: Task[]) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = getNextTaskSeq(tasks, 'RW');
  return `RW-${today}-${seq}`;
};

// 生成任务编号（格式：TKRW-YYYYMMDD-序号，如 TKRW-20260415-001）
const generateTaskCode = (tasks: Task[]) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = getNextTaskSeq(tasks, 'RW');
  return `TKRW-${today}-${seq}`;
};

// 计算截止日期（根据严重程度）
const calculateDueDate = (severity: string): string => {
  const days = severity === '严重' ? 1 : severity === '中等' ? 3 : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * 问题分派 Hook (V2.0 — API 数据层)
 */
export function useProblemDispatch() {
  // V2.0: 使用 API-backed Zustand Store 替代 localStorage
  const storeProblems = useProblemStore((s) => s.problems);
  const fetchProblems = useProblemStore((s) => s.fetchProblems);
  const updateProblemInStore = useProblemStore((s) => s.updateProblem);
  const createProblemInStore = useProblemStore((s) => s.createProblem);

  // 初始化加载 API 数据
  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // 使用 useTasks 来统一管理任务（确保任务状态同步）
  const { tasks, createTask, updateTask, updateTaskStatus } = useTasks();
  const [dispatchRecords, setDispatchRecords] = useLocalStorage<DispatchRecord[]>(
    STORAGE_KEYS.DISPATCH_RECORDS,
    []
  );

  // 确保员工数据已加载
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // 辅助：从 ProblemData 获取问题描述文本
  const getIssueText = (p: ProblemData): string => p.issueText || p.description || p.title || '';
  // 辅助：获取问题严重程度
  const getIssueSeverity = (p: ProblemData): string => p.issueSeverity || '中等';
  // 辅助：获取 flowRecords（数组）
  const getFlowRecords = (p: ProblemData): ProblemFlowRecord[] => p.flowRecords || [];

  // 待分派问题（状态为"待处理"且未关联任务）
  const pendingProblems = useMemo(
    () => storeProblems.filter(p => isStatus(p, STATUS_CN.PENDING) && !p.sourceTaskId),
    [storeProblems]
  );

  // 已分派问题（状态为"处理中"或已关联任务）
  const dispatchedProblems = useMemo(
    () => storeProblems.filter(p => isStatus(p, STATUS_CN.IN_PROGRESS) || (isStatus(p, STATUS_CN.PENDING) && p.sourceTaskId)),
    [storeProblems]
  );

  // 待验收问题
  const waitingAcceptanceProblems = useMemo(
    () => storeProblems.filter(p => isStatus(p, STATUS_CN.WAITING_ACCEPTANCE)),
    [storeProblems]
  );

  // 已处理问题
  const handledProblems = useMemo(
    () => storeProblems.filter(p => isStatus(p, STATUS_CN.COMPLETED)),
    [storeProblems]
  );

  // 获取问题关联的任务
  const getTaskForProblem = useCallback(
    (problemId: number): Task | undefined => {
      return (tasks as any).find((t: any) => t.sourceProblemId === problemId);
    },
    [tasks]
  );

  // 分派问题给员工
  const dispatchProblem = useCallback((
    problemId: number,
    assigneeId: string,
    assigneeName: string,
    dispatcherId: string = 'U001',
    dispatcherName: string = '系统管理员',
    expectedCompletion?: string,
    requiredFeedback?: string[],
    customPriority?: 'high' | 'medium' | 'low'
  ): Task | null => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return null;

    const issueText = getIssueText(problem);
    const severity = getIssueSeverity(problem);

    // 判断问题类型
    const getProblemType = (text: string): { type: any; typeName: string } => {
      if (text.includes('虫') || text.includes('蚜')) return { type: 'pesticide', typeName: '植保' };
      if (text.includes('病') || text.includes('斑') || text.includes('灰霉')) return { type: 'pesticide', typeName: '植保' };
      if (text.includes('水') || text.includes('旱')) return { type: 'irrigation', typeName: '灌溉' };
      if (text.includes('肥')) return { type: 'fertilization', typeName: '施肥' };
      return { type: 'other', typeName: '其他' };
    };

    // 确定优先级
    const priority: Task['priority'] = customPriority || SEVERITY_PRIORITY_MAP[severity] || 'medium';

    // 通过 useTasks.createTask 创建任务
    const newTask = createTask({
      title: `【问题处理】${issueText.slice(0, 30)}`,
      type: getProblemType(issueText).type,
      typeName: getProblemType(issueText).typeName,
      priority,
      status: 'pending',
      batchId: '',
      batchCode: '',
      greenhouseId: problem.greenhouseId || '',
      greenhouseName: problem.greenhouseName || '',
      assigneeId,
      assigneeName,
      assignerId: dispatcherId,
      assignerName: dispatcherName,
      dueDate: expectedCompletion || calculateDueDate(severity),
      workDuration: 0,
      requiredMaterials: [],
      description: `问题描述：${issueText}\n严重程度：${severity}\n巡查时间：${problem.checkDate || ''} ${problem.checkTime || ''}\n温室：${problem.greenhouseName || ''}\n作物：${problem.cropName || ''}`,
      sourceProblemId: problemId,
      requiredFeedback: requiredFeedback || [],
      sourceId: problem.sourceId || '',
      sourceCode: problem.sourceId || '',
    } as any);

    // 创建流转记录（中文标签用于UI展示）
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId: dispatcherId,
      operatorName: dispatcherName,
      action: 'dispatch',
      fromStatus: STATUS_CN.PENDING,
      toStatus: STATUS_CN.IN_PROGRESS,
      comment: `分派给 ${assigneeName} 处理`,
      actionTime: new Date().toISOString(),
    };

    // 通过 API Store 更新问题
    const currentFlowRecords = getFlowRecords(problem);
    updateProblemInStore(problemId, {
      status: STATUS_EN.IN_PROGRESS,
      handler: assigneeName,
      handleDate: '',
      handleResult: '',
      sourceTaskId: newTask.id,
      flowRecords: [...currentFlowRecords, flowRecord] as any,
      expectedCompletion: expectedCompletion || '',
    });

    // 记录分派历史
    setDispatchRecords(prev => [...prev, {
      id: `DR-${Date.now()}`,
      problemId,
      taskId: newTask.id,
      dispatchTime: new Date().toISOString(),
      dispatcherId,
      dispatcherName,
    }]);

    return newTask as any;
  }, [storeProblems, updateProblemInStore, createTask, setDispatchRecords]);

  // 批量分派问题
  const batchDispatchProblems = useCallback((
    dispatches: Array<{
      problemId: number;
      assigneeId: string;
      assigneeName: string;
      dispatcherId?: string;
      dispatcherName?: string;
    }>,
    expectedCompletion?: string,
    requiredFeedback?: string[]
  ): Task[] => {
    const createdTasks: Task[] = [];
    dispatches.forEach(dispatch => {
      const task = dispatchProblem(
        dispatch.problemId,
        dispatch.assigneeId,
        dispatch.assigneeName,
        dispatch.dispatcherId || 'U001',
        dispatch.dispatcherName || '系统管理员',
        expectedCompletion,
        requiredFeedback
      );
      if (task) {
        createdTasks.push(task);
      }
    });
    return createdTasks;
  }, [dispatchProblem]);

  // 更新问题处理结果
  const updateProblemResult = useCallback((
    problemId: number,
    handleResult: string
  ) => {
    updateProblemInStore(problemId, {
      status: STATUS_EN.COMPLETED,
      handleDate: todayLocal(),
      handleResult,
    });
  }, [updateProblemInStore]);

  // 接单问题
  const acceptProblem = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'accept',
      fromStatus: currentStatusCn,
      toStatus: currentStatusCn,
      comment: '已接单，开始处理',
      actionTime: new Date().toISOString(),
    };

    updateProblemInStore(problemId, {
      acceptedBy: operatorName,
      acceptedTime: new Date().toISOString(),
      flowRecords: [...getFlowRecords(problem), flowRecord] as any,
    });
  }, [storeProblems, updateProblemInStore]);

  // 拒绝问题
  const rejectProblem = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    reason: string
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'reject',
      fromStatus: currentStatusCn,
      toStatus: STATUS_CN.PENDING,
      comment: `拒绝原因：${reason}`,
      actionTime: new Date().toISOString(),
    };

    updateProblemInStore(problemId, {
      status: STATUS_EN.PENDING,
      rejectedBy: operatorName,
      rejectedReason: reason,
      rejectedTime: new Date().toISOString(),
      handler: '',
      sourceTaskId: '',
      flowRecords: [...getFlowRecords(problem), flowRecord] as any,
    });
  }, [storeProblems, updateProblemInStore]);

  // 提交反馈
  const submitProblemFeedback = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    feedback: {
      resultText: string;
      actualWorkload?: number;
      feedbackData?: ProblemFlowRecord['feedbackData'];
    }
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'submit',
      fromStatus: currentStatusCn,
      toStatus: STATUS_CN.WAITING_ACCEPTANCE,
      comment: feedback.resultText || '处理完成，提交验收',
      actionTime: new Date().toISOString(),
      feedbackData: feedback.feedbackData,
    };

    updateProblemInStore(problemId, {
      status: STATUS_EN.WAITING_ACCEPTANCE,
      handleResult: feedback.resultText,
      handleDate: todayLocal(),
      flowRecords: [...getFlowRecords(problem), flowRecord] as any,
    });
  }, [storeProblems, updateProblemInStore]);

  // 记录进度
  const addProgressRecord = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    progress: number,
    comment?: string,
    feedbackData?: ProblemFlowRecord['feedbackData']
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'progress',
      fromStatus: currentStatusCn,
      toStatus: STATUS_CN.IN_PROGRESS,
      comment: comment || `提交进度：${progress}%`,
      actionTime: new Date().toISOString(),
      feedbackData,
    };

    updateProblemInStore(problemId, {
      flowRecords: [...getFlowRecords(problem), flowRecord] as any,
    });
  }, [storeProblems, updateProblemInStore]);

  // 验收完成
  const approveProblemCompletion = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    comment?: string
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'approve',
      fromStatus: currentStatusCn,
      toStatus: STATUS_CN.COMPLETED,
      comment: comment || '验收通过，问题关闭',
      actionTime: new Date().toISOString(),
    };

    updateProblemInStore(problemId, {
      status: STATUS_EN.COMPLETED,
      completionTime: new Date().toISOString(),
      flowRecords: [...getFlowRecords(problem), flowRecord] as any,
    });

    // 同步更新关联任务
    if (problem.sourceTaskId) {
      updateTaskStatus(problem.sourceTaskId, 'completed');
    }
  }, [storeProblems, updateProblemInStore, updateTaskStatus]);

  // 验收返工
  const rejectAcceptance = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    reason: string
  ) => {
    const problem = storeProblems.find(p => p.id === problemId);
    if (!problem) return;

    const newReworkCount = (problem.reworkCount || 0) + 1;
    const shouldReassign = newReworkCount >= 2;

    const currentStatusCn = problem.statusLabel || STATUS_EN_TO_CN[problem.status || ''] || problem.status || '';
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'reject_acceptance',
      fromStatus: currentStatusCn,
      toStatus: shouldReassign ? STATUS_CN.PENDING : currentStatusCn,
      comment: `返工原因：${reason}${shouldReassign ? '【已超限，退回重新分派】' : ''}`,
      actionTime: new Date().toISOString(),
    };

    if (shouldReassign) {
      updateProblemInStore(problemId, {
        status: STATUS_EN.PENDING,
        handler: '',
        sourceTaskId: '',
        reworkCount: newReworkCount,
        flowRecords: [...getFlowRecords(problem), flowRecord] as any,
      });
      if (problem.sourceTaskId) {
        updateTaskStatus(problem.sourceTaskId, 'rejected');
      }
    } else {
      updateProblemInStore(problemId, {
        reworkCount: newReworkCount,
        flowRecords: [...getFlowRecords(problem), flowRecord] as any,
      });
      if (problem.sourceTaskId) {
        updateTaskStatus(problem.sourceTaskId, 'in_progress');
      }
    }
  }, [storeProblems, updateProblemInStore, updateTaskStatus]);

  // 获取问题流转记录
  const getProblemFlowRecords = useCallback((problemId: number): ProblemFlowRecord[] => {
    const problem = storeProblems.find(p => p.id === problemId);
    return getFlowRecords(problem!) as any;
  }, [storeProblems]);

  // 获取员工列表
  const storeWorkers = useWorkerStore((s) => s.workers);
  const workerList = useMemo(() => {
    const filtered = storeWorkers
      .filter(w => w.status === 'active')
      .map(w => ({
        id: w.id,
        workerId: w.workerId,
        name: w.name,
        position: w.position,
        skillTags: w.skillTags || [],
        status: w.status,
      }));
    const luzhuchuangIndex = filtered.findIndex(w => w.name === '陆启闯');
    if (luzhuchuangIndex > 0) {
      const luzhuchuang = filtered.splice(luzhuchuangIndex, 1)[0];
      filtered.unshift(luzhuchuang);
    }
    return filtered;
  }, [storeWorkers]);

  return {
    // 问题统计
    pendingProblems,
    dispatchedProblems,
    waitingAcceptanceProblems,
    handledProblems,
    totalCount: storeProblems.length,

    // Store 操作方法（供组件直接调用）
    createProblem: createProblemInStore,
    fetchProblems,

    // 分派操作
    dispatchProblem,
    batchDispatchProblems,
    updateProblemResult,
    getTaskForProblem,

    // 流转操作
    acceptProblem,
    rejectProblem,
    submitProblemFeedback,
    addProgressRecord,
    approveProblemCompletion,
    rejectAcceptance,
    getProblemFlowRecords,

    // 查询
    workerList,

    // 分派记录
    dispatchRecords,

    // 所有任务
    tasks,
  };
}
