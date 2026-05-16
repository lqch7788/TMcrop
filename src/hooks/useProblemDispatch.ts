/**
 * 问题分派 Hook
 * 用于将问题分派给员工处理，并创建关联任务
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePersistentProblems, type ProblemEntry } from './usePersistentProblems';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import { useTasks } from './useTasks';
import type { Task } from '../types';
import { useWorkerStore } from '../stores/useWorkerStore';

// 问题类型到任务类型的映射
const PROBLEM_TYPE_MAP: Record<string, Task['type']> = {
  '虫害': 'spraying',
  '病害': 'spraying',
  '环境': 'irrigation',
  '水肥': 'fertilization',
  '其他': 'scouting',
};

// 问题严重程度到任务优先级的映射
const SEVERITY_PRIORITY_MAP: Record<ProblemEntry['issueSeverity'], Task['priority']> = {
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
  action: 'report' | 'dispatch' | 'accept' | 'reject' | 'start' | 'submit' | 'approve' | 'complete' | 'comment' | 'progress';
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
  // 找出今天已存在的任务序号
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
const calculateDueDate = (severity: ProblemEntry['issueSeverity']): string => {
  const days = severity === '严重' ? 1 : severity === '中等' ? 3 : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * 问题分派 Hook
 */
export function useProblemDispatch() {
  const { problems, updateProblem } = usePersistentProblems();
  // 使用 useTasks 来统一管理任务（确保任务状态同步）
  const { tasks, createTask, updateTask, updateTaskStatus } = useTasks();
  const [dispatchRecords, setDispatchRecords] = useLocalStorage<DispatchRecord[]>(
    STORAGE_KEYS.DISPATCH_RECORDS,
    []
  );

  // 确保员工数据已加载（Store 内部有 5 分钟缓存，不会重复请求）
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // 待分派问题（状态为"待处理"且未关联任务）
  const pendingProblems = useMemo(
    () => problems.filter(p => p.status === '待处理' && !p.sourceTaskId),
    [problems]
  );

  // 已分派问题（状态为"处理中"或已关联任务）
  const dispatchedProblems = useMemo(
    () => problems.filter(p => p.status === '处理中' || (p.status === '待处理' && p.sourceTaskId)),
    [problems]
  );

  // 已处理问题
  const handledProblems = useMemo(
    () => problems.filter(p => p.status === '已处理'),
    [problems]
  );

  // 获取问题关联的任务
  const getTaskForProblem = useCallback(
    (problemId: number): Task | undefined => {
      return tasks.find(t => t.sourceProblemId === problemId);
    },
    [tasks]
  );

  // 分派问题给员工
  // expectedCompletion: 分派人员设置的期望完成时间，格式为 YYYY-MM-DD
  // requiredFeedback: 必填反馈要求列表，如 ['gps', 'photo_before', 'photo_after', 'material', 'voice']
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
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return null;

    // 判断问题类型
    const getProblemType = (issueText: string): Task['type'] => {
      if (issueText.includes('虫') || issueText.includes('蚜')) return 'spraying';
      if (issueText.includes('病') || issueText.includes('斑') || issueText.includes('灰霉')) return 'spraying';
      if (issueText.includes('水') || issueText.includes('旱')) return 'irrigation';
      if (issueText.includes('肥')) return 'fertilization';
      return 'scouting';
    };

    // 确定优先级：优先使用自定义优先级，否则根据问题严重程度自动映射
    const priority: Task['priority'] = customPriority || SEVERITY_PRIORITY_MAP[problem.issueSeverity];

    // 通过 useTasks.createTask 创建任务（统一任务管理，新任务自动添加到列表前面）
    const newTask = createTask({
      title: `【问题处理】${problem.issueText.slice(0, 30)}`,
      type: getProblemType(problem.issueText),
      typeName: '问题处理',
      priority,
      status: 'pending',
      batchId: '',
      batchCode: '',
      greenhouseId: problem.greenhouseId,
      greenhouseName: problem.greenhouseName,
      mode: 'glass' as 'glass' | 'solar',
      assigneeId,
      assigneeName,
      assignerId: dispatcherId,
      assignerName: dispatcherName,
      dueDate: expectedCompletion || calculateDueDate(problem.issueSeverity),
      workDuration: 0,
      requiredMaterials: [],
      description: `问题描述：${problem.issueText}\n严重程度：${problem.issueSeverity}\n巡检时间：${problem.checkDate} ${problem.checkTime}\n温室：${problem.greenhouseName}\n作物：${problem.cropName}`,
      actualWorkload: 0,
      sourceProblemId: problemId,
      requiredFeedback: requiredFeedback || [],
      // 保留原始巡查单号（用于追踪问题处理全过程）
      sourceId: problem.sourceId,
      sourceCode: problem.sourceId,
      // 派发模式标记（问题处理模式）
      dispatchMode: 'problem' as 'farm' | 'tempTask' | 'smart' | 'problem',
    });

    // 创建流转记录
    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId: dispatcherId,
      operatorName: dispatcherName,
      action: 'dispatch',
      fromStatus: '待处理',
      toStatus: '处理中',
      comment: `分派给 ${assigneeName} 处理`,
      actionTime: new Date().toISOString(),
    };

    // 更新问题状态并添加流转记录
    updateProblem(problemId, {
      status: '处理中',
      handler: assigneeName,
      sourceTaskId: newTask.id,
      flowRecords: [...(problem.flowRecords || []), flowRecord],
      expectedCompletion,
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

    return newTask;
  }, [problems, updateProblem, createTask, setDispatchRecords]);

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

  // 更新问题处理结果（任务完成时调用）
  const updateProblemResult = useCallback((
    problemId: number,
    handleResult: string
  ) => {
    updateProblem(problemId, {
      status: '已处理',
      handleDate: new Date().toISOString().slice(0, 10),
      handleResult,
    });
  }, [updateProblem]);

  // 接单问题
  const acceptProblem = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string
  ) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'accept',
      fromStatus: problem.status,
      toStatus: problem.status,
      comment: '已接单，开始处理',
      actionTime: new Date().toISOString(),
    };

    updateProblem(problemId, {
      acceptedBy: operatorName,
      acceptedTime: new Date().toISOString(),
      flowRecords: [...(problem.flowRecords || []), flowRecord],
    });
  }, [problems, updateProblem]);

  // 拒绝问题
  const rejectProblem = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    reason: string
  ) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'reject',
      fromStatus: problem.status,
      toStatus: '待处理',
      comment: `拒绝原因：${reason}`,
      actionTime: new Date().toISOString(),
    };

    updateProblem(problemId, {
      status: '待处理',
      rejectedBy: operatorName,
      rejectedReason: reason,
      rejectedTime: new Date().toISOString(),
      handler: undefined,
      sourceTaskId: undefined,
      flowRecords: [...(problem.flowRecords || []), flowRecord],
    });
  }, [problems, updateProblem]);

  // 提交反馈（问题处理完成，提交待验收）
  // feedback: 包含文字结果和完整反馈数据（位置、照片、语音等）
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
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'submit',
      fromStatus: problem.status,
      toStatus: '待验收',
      comment: feedback.resultText || '处理完成，提交验收',
      actionTime: new Date().toISOString(),
      feedbackData: feedback.feedbackData,
    };

    updateProblem(problemId, {
      status: '待验收',
      handleResult: feedback.resultText,
      handleDate: new Date().toISOString().slice(0, 10),
      flowRecords: [...(problem.flowRecords || []), flowRecord],
    });
  }, [problems, updateProblem]);

  // 记录进度（每次提交进度时调用）
  // feedbackData: 包含位置、照片、语音等反馈数据
  const addProgressRecord = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    progress: number,
    comment?: string,
    feedbackData?: ProblemFlowRecord['feedbackData']
  ) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'progress',
      fromStatus: problem.status,
      toStatus: '处理中',
      comment: comment || `提交进度：${progress}%`,
      actionTime: new Date().toISOString(),
      feedbackData,
    };

    updateProblem(problemId, {
      flowRecords: [...(problem.flowRecords || []), flowRecord],
    });
  }, [problems, updateProblem]);

  // 验收完成（问题关闭）
  const approveProblemCompletion = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    comment?: string
  ) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'approve',
      fromStatus: problem.status,
      toStatus: '已处理',
      comment: comment || '验收通过，问题关闭',
      actionTime: new Date().toISOString(),
    };

    updateProblem(problemId, {
      status: '已处理',
      completionTime: new Date().toISOString(),
      flowRecords: [...(problem.flowRecords || []), flowRecord],
    });

    // 同步更新关联任务的状态为已完成
    if (problem.sourceTaskId) {
      updateTaskStatus(problem.sourceTaskId, 'completed');
    }
  }, [problems, updateProblem, updateTaskStatus]);

  // 验收返工（退回处理）
  // 第一次返工：保持原执行人，执行人继续处理
  // 第二次返工：退回问题分派页面，由分派员重新分派
  const rejectAcceptance = useCallback((
    problemId: number,
    operatorId: string,
    operatorName: string,
    reason: string
  ) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const newReworkCount = (problem.reworkCount || 0) + 1;
    const shouldReassign = newReworkCount >= 2;  // 第二次返工需要重新分派

    const flowRecord: ProblemFlowRecord = {
      id: `FR-${Date.now()}`,
      problemId,
      operatorId,
      operatorName,
      action: 'reject_acceptance',
      fromStatus: problem.status,
      toStatus: shouldReassign ? '待处理' : problem.status,  // 第一次返工保持原状态
      comment: `返工原因：${reason}${shouldReassign ? '【已超限，退回重新分派】' : ''}`,
      actionTime: new Date().toISOString(),
    };

    if (shouldReassign) {
      // 第二次返工：清除handler和sourceTaskId，问题进入待分派列表
      updateProblem(problemId, {
        status: '待处理',
        handler: undefined,
        sourceTaskId: undefined,
        reworkCount: newReworkCount,
        flowRecords: [...(problem.flowRecords || []), flowRecord],
      });
      // 任务状态变为已拒绝（原执行人被退回，任务不再属于他）
      if (problem.sourceTaskId) {
        updateTaskStatus(problem.sourceTaskId, 'rejected');
      }
    } else {
      // 第一次返工：保持原执行人，增加返工计数
      updateProblem(problemId, {
        reworkCount: newReworkCount,
        flowRecords: [...(problem.flowRecords || []), flowRecord],
      });
      // 任务状态变为进行中，执行人继续处理（不改变handler）
      if (problem.sourceTaskId) {
        updateTaskStatus(problem.sourceTaskId, 'in_progress');
      }
    }
  }, [problems, updateProblem, updateTaskStatus]);

  // 获取问题的流转记录
  const getProblemFlowRecords = useCallback((problemId: number): ProblemFlowRecord[] => {
    const problem = problems.find(p => p.id === problemId);
    return problem?.flowRecords || [];
  }, [problems]);

  // 获取员工列表（陆启闯排在第一位）— 响应式订阅 Store 变化
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
    // 陆启闯排在第一位
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
    handledProblems,
    totalCount: problems.length,

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
