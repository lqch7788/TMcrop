/**
 * 问题分派 Hook
 * 用于将问题分派给员工处理，并创建关联任务
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePersistentProblems, type ProblemEntry } from './usePersistentProblems';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import type { Task } from '../types';
import { workers } from '../data/mockData';

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

// 生成任务ID
const generateTaskId = () => `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 生成任务编号
const generateTaskCode = () => `TK${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-4)}`;

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
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.TASKS, []);
  const [dispatchRecords, setDispatchRecords] = useLocalStorage<DispatchRecord[]>(
    STORAGE_KEYS.DISPATCH_RECORDS,
    []
  );

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
  const dispatchProblem = useCallback((
    problemId: number,
    assigneeId: string,
    assigneeName: string,
    dispatcherId: string = 'U001',
    dispatcherName: string = '系统管理员'
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

    // 创建任务
    const newTask: Task = {
      id: generateTaskId(),
      taskCode: generateTaskCode(),
      title: `【问题处理】${problem.issueText.slice(0, 30)}`,
      type: getProblemType(problem.issueText),
      typeName: '问题处理',
      priority: SEVERITY_PRIORITY_MAP[problem.issueSeverity],
      status: 'pending',
      batchId: '',
      batchCode: '',
      greenhouseId: problem.greenhouseId,
      greenhouseName: problem.greenhouseName,
      mode: 'glass',
      assigneeId,
      assigneeName,
      assignerId: dispatcherId,
      assignerName: dispatcherName,
      dueDate: calculateDueDate(problem.issueSeverity),
      workDuration: 0,
      requiredMaterials: [],
      description: `问题描述：${problem.issueText}\n严重程度：${problem.issueSeverity}\n巡检时间：${problem.checkDate} ${problem.checkTime}\n温室：${problem.greenhouseName}\n作物：${problem.cropName}`,
      actualWorkload: 0,
      sourceProblemId: problemId,
    };

    // 保存任务
    setTasks(prev => [...prev, newTask]);

    // 更新问题状态
    updateProblem(problemId, {
      status: '处理中',
      handler: assigneeName,
      sourceTaskId: newTask.id,
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
  }, [problems, updateProblem, setTasks, setDispatchRecords]);

  // 批量分派问题
  const batchDispatchProblems = useCallback((
    dispatches: Array<{
      problemId: number;
      assigneeId: string;
      assigneeName: string;
      dispatcherId?: string;
      dispatcherName?: string;
    }>
  ): Task[] => {
    const createdTasks: Task[] = [];
    dispatches.forEach(dispatch => {
      const task = dispatchProblem(
        dispatch.problemId,
        dispatch.assigneeId,
        dispatch.assigneeName,
        dispatch.dispatcherId || 'U001',
        dispatch.dispatcherName || '系统管理员'
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

  // 获取员工列表
  const workerList = useMemo(() => {
    return workers.filter(w => w.status === '在职').map(w => ({
      id: w.id,
      workerId: w.workerId,
      name: w.name,
      position: w.position,
      skillTags: w.skillTags,
      status: w.status,
    }));
  }, []);

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

    // 查询
    workerList,

    // 分派记录
    dispatchRecords,

    // 所有任务
    tasks,
  };
}
