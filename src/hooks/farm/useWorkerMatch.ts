/**
 * 人员技能匹配 Hook
 * 根据任务类型和工人技能进行智能匹配
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWorkerStore } from '../../stores/useWorkerStore';
import { Worker } from '../../types';
import {
  WorkerSkillMatch,
  FarmOperationType,
  SkillOperationMap,
} from '../../types/farm/common';
import { SKILL_OPERATION_MAP } from '../../data/recommendationRules';

/**
 * 工人数据类型
 */
interface WorkerData {
  id: string;
  name: string;
  role: string;
  status: string;
  skills: string[];
  workZone?: string;
  workLoad?: number;
}

/**
 * 任务类型
 */
interface TaskForMatch {
  id?: string;
  type: FarmOperationType;
  field?: string;
  fieldId?: string;
  estimatedHours?: number;
  dueDate?: string;
}

/**
 * 人员技能匹配 Hook
 */
export function useWorkerMatch() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载员工数据
  const loadWorkers = useCallback(() => {
    setIsLoading(true);
    try {
      // 从 useWorkerStore 获取员工数据，映射到 WorkerData 格式
      const storeWorkers = useWorkerStore.getState().workers;
      const workerData: WorkerData[] = storeWorkers.map(w => ({
        id: w.id,
        name: w.name,
        // Worker.position 映射到 role
        role: w.position,
        // Worker.status 映射：'在职'→'available', '离职'/'退休'→'off'
        status: w.status === '在职' ? 'available' : 'off',
        skills: w.skillTags || [],
        // Worker.workArea 映射到 workZone
        workZone: w.workArea,
        // Worker类型无 workLoad 字段，默认0
        workLoad: 0,
      }));
      setWorkers(workerData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  /**
   * 匹配单个任务类型需要的技能
   */
  const matchTaskSkills = useCallback((
    taskType: FarmOperationType
  ): { required: string; workerHas: boolean; proficiency?: string }[] => {
    const requiredSkills = SKILL_OPERATION_MAP[taskType] || [];
    return requiredSkills.map(skill => ({
      required: skill,
      workerHas: true, // 默认认为工人有所需技能，实际按worker数据判断
    }));
  }, []);

  /**
   * 计算技能匹配分数
   */
  const calculateSkillScore = useCallback((
    workerSkills: string[],
    requiredSkills: string[]
  ): { score: number; matches: { required: string; workerHas: boolean }[] } => {
    if (requiredSkills.length === 0) {
      return { score: 100, matches: [] };
    }

    const matches = requiredSkills.map(skill => ({
      required: skill,
      workerHas: workerSkills.some(ws =>
        ws.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(ws.toLowerCase())
      ),
    }));

    const matchedCount = matches.filter(m => m.workerHas).length;
    const score = Math.round((matchedCount / requiredSkills.length) * 100);

    return { score, matches };
  }, []);

  /**
   * 计算位置匹配分数
   */
  const calculateLocationScore = useCallback((
    workerZone?: string,
    taskZone?: string
  ): { score: number; distance?: number } => {
    if (!workerZone || !taskZone) {
      return { score: 100 }; // 未知区域，默认满分
    }

    // 如果在同一区域，满分
    if (workerZone === taskZone) {
      return { score: 100, distance: 0 };
    }

    // 简化：不同区域降低分数
    return { score: 60, distance: 1 };
  }, []);

  /**
   * 计算工作负载分数
   */
  const calculateWorkloadScore = useCallback((
    currentLoad: number = 0
  ): { score: number; availableCapacity: number } => {
    const availableCapacity = Math.max(0, 100 - currentLoad);
    let score: number;

    if (currentLoad >= 100) {
      score = 0;
    } else if (currentLoad >= 80) {
      score = 30;
    } else if (currentLoad >= 60) {
      score = 60;
    } else if (currentLoad >= 40) {
      score = 80;
    } else {
      score = 100;
    }

    return { score, availableCapacity };
  }, []);

  /**
   * 为单个工人计算任务匹配度
   */
  const matchWorkerForTask = useCallback((
    worker: WorkerData,
    task: TaskForMatch
  ): WorkerSkillMatch => {
    // 获取任务需要的技能
    const requiredSkills = SKILL_OPERATION_MAP[task.type] || [];

    // 计算技能匹配
    const { score: skillScore, matches } = calculateSkillScore(worker.skills, requiredSkills);

    // 计算位置匹配
    const { score: locationScore } = calculateLocationScore(worker.workZone, task.field);

    // 计算工作负载匹配
    const { score: workloadScore, availableCapacity } = calculateWorkloadScore(worker.workLoad);

    // 综合评分（技能60%，位置20%，负载20%）
    const matchScore = Math.round(
      skillScore * 0.6 +
      locationScore * 0.2 +
      workloadScore * 0.2
    );

    return {
      workerId: worker.id,
      workerName: worker.name,
      taskType: task.type,
      matchScore,
      factors: {
        skillMatch: matches,
        score: skillScore,
      },
      locationMatch: {
        workZone: worker.workZone || '',
        taskZone: task.field || '',
        score: locationScore,
      },
      workloadMatch: {
        currentLoad: worker.workLoad || 0,
        availableCapacity,
        score: workloadScore,
      },
    };
  }, [calculateSkillScore, calculateLocationScore, calculateWorkloadScore]);

  /**
   * 为任务找到最佳匹配工人
   */
  const findBestMatch = useCallback((
    task: TaskForMatch,
    excludeWorkerIds?: string[]
  ): WorkerSkillMatch | null => {
    // 过滤可用工人
    const availableWorkers = workers.filter(
      w => w.status === 'available' && !excludeWorkerIds?.includes(w.id)
    );

    if (availableWorkers.length === 0) return null;

    // 计算每个工人的匹配度
    const matches = availableWorkers.map(worker => matchWorkerForTask(worker, task));

    // 按匹配度排序
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches[0] || null;
  }, [workers, matchWorkerForTask]);

  /**
   * 为任务找到多个备选工人
   */
  const findAlternativeMatches = useCallback((
    task: TaskForMatch,
    limit: number = 3,
    excludeWorkerIds?: string[]
  ): WorkerSkillMatch[] => {
    // 过滤可用工人
    const availableWorkers = workers.filter(
      w => w.status === 'available' && !excludeWorkerIds?.includes(w.id)
    );

    // 计算每个工人的匹配度
    const matches = availableWorkers.map(worker => matchWorkerForTask(worker, task));

    // 按匹配度排序
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches.slice(0, limit);
  }, [workers, matchWorkerForTask]);

  /**
   * 批量匹配任务
   */
  const matchTasksForWorkers = useCallback((
    tasks: TaskForMatch[]
  ): Map<string, WorkerSkillMatch> => {
    const results = new Map<string, WorkerSkillMatch>();
    const assignedWorkerIds: string[] = [];

    tasks.forEach(task => {
      const bestMatch = findBestMatch(task, assignedWorkerIds);
      if (bestMatch) {
        results.set(task.id || `task-${Math.random()}`, bestMatch);
        assignedWorkerIds.push(bestMatch.workerId);
      }
    });

    return results;
  }, [findBestMatch]);

  /**
   * 获取工人技能详情
   */
  const getWorkerSkillDetails = useCallback((workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return null;

    // 获取各操作类型的匹配度
    const operationTypes: FarmOperationType[] = [
      'irrigation', 'fertilization', 'pest_control', 'pruning',
      'harvest', 'weeding', 'planting', 'other'
    ];

    const skillDetails = operationTypes.map(type => {
      const requiredSkills = SKILL_OPERATION_MAP[type] || [];
      const { score } = calculateSkillScore(worker.skills, requiredSkills);
      return {
        type,
        requiredSkills,
        matchScore: score,
      };
    });

    return {
      worker,
      skillDetails,
    };
  }, [workers, calculateSkillScore]);

  /**
   * 获取可用工人列表
   */
  const getAvailableWorkers = useCallback(() => {
    return workers.filter(w => w.status === 'available');
  }, [workers]);

  /**
   * 获取所有工人列表
   */
  const getAllWorkers = useCallback(() => {
    return workers;
  }, [workers]);

  return {
    // 数据
    workers,

    // 状态
    isLoading,

    // 操作
    refresh: loadWorkers,

    // 匹配方法
    matchWorkerForTask,
    findBestMatch,
    findAlternativeMatches,
    matchTasksForWorkers,
    getWorkerSkillDetails,

    // 辅助方法
    getAvailableWorkers,
    getAllWorkers,
  };
}

export default useWorkerMatch;
