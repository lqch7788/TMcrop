/**
 * 派工调度Hook
 *
 * V2.0架构改造：数据存储迁移到 useDispatchStore
 * 匹配算法等业务逻辑保留在Hook层
 */
import { useEffect, useState, useMemo } from 'react';
import { useDispatchStore } from '@/stores';
import type { DispatchTask, WorkerMatch, DispatchRecommendation, DispatchFilters } from '../types';
import { DISPATCH_WEIGHTS } from '../types';
import type { SkillTag } from '../../skill/types';

export function useSmartDispatch() {
  const store = useDispatchStore();
  const [filters, setFilters] = useState<DispatchFilters>({});
  const [selectedTask, setSelectedTask] = useState<DispatchTask | null>(null);

  // 组件挂载时初始化种子数据
  useEffect(() => {
    store.initSeedData();
  }, []);

  // 计算技能匹配度
  const calculateSkillMatch = (workerSkills: SkillTag[], requiredSkills: SkillTag[]): number => {
    if (requiredSkills.length === 0) return 100;
    const matched = requiredSkills.filter((skill) => workerSkills.includes(skill));
    return Math.round((matched.length / requiredSkills.length) * 100);
  };

  // 计算地理位置得分 (距离越近分数越高)
  const calculateLocationScore = (distance: number): number => {
    if (distance <= 1) return 100;
    if (distance <= 2) return 85;
    if (distance <= 3) return 70;
    if (distance <= 5) return 55;
    return 40;
  };

  // 计算负荷得分 (负荷越低分数越高)
  const calculateLoadScore = (load: number): number => {
    return Math.round(100 - load);
  };

  // 计算历史表现得分
  const calculatePerformanceScore = (performance: number): number => {
    return performance;
  };

  // 计算紧急程度得分 (根据任务优先级)
  const calculateUrgencyScore = (priority: DispatchTask['priority']): number => {
    switch (priority) {
      case '紧急': return 100;
      case '高': return 80;
      case '中': return 60;
      case '低': return 40;
      default: return 50;
    }
  };

  // 为任务生成推荐
  const generateRecommendations = (task: DispatchTask): WorkerMatch[] => {
    return store.workers
      .map((worker) => {
        const skillMatchRate = calculateSkillMatch(worker.skills, task.requiredSkills);
        const distance = worker.distance[task.workZone] || 5;
        const locationScore = calculateLocationScore(distance);
        const loadScore = calculateLoadScore(worker.currentLoad);
        const performanceScore = calculatePerformanceScore(worker.recentPerformance);
        const urgencyScore = calculateUrgencyScore(task.priority);

        // 综合得分 = 技能匹配度×0.30 + 地理位置×0.25 + 当前负荷×0.20 + 历史表现×0.15 + 紧急程度×0.10
        const matchScore = Math.round(
          skillMatchRate * DISPATCH_WEIGHTS.skillMatch +
          locationScore * DISPATCH_WEIGHTS.location +
          loadScore * DISPATCH_WEIGHTS.currentLoad +
          performanceScore * DISPATCH_WEIGHTS.historicalPerformance +
          urgencyScore * DISPATCH_WEIGHTS.urgency
        );

        // 生成推荐理由
        const reasons: string[] = [];
        if (skillMatchRate >= 80) {
          reasons.push(`技能匹配度${skillMatchRate}%`);
        }
        if (distance <= 2) {
          reasons.push(`距离近(${distance}km)`);
        }
        if (worker.currentLoad < 50) {
          reasons.push(`当前负荷低(${worker.currentLoad}%)`);
        }
        if (worker.recentPerformance >= 90) {
          reasons.push(`近期表现优秀(${worker.recentPerformance}分)`);
        }

        return {
          workerId: worker.id,
          workerName: worker.name,
          workerType: worker.workerType,
          currentWorkZone: worker.workZone,
          skills: worker.skills,
          currentLoad: worker.currentLoad,
          recentPerformance: worker.recentPerformance,
          distance,
          matchScore,
          skillMatchRate,
          locationScore,
          loadScore,
          performanceScore,
          urgencyScore,
          reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  // 获取当前任务的推荐
  const recommendations = useMemo<DispatchRecommendation | null>(() => {
    if (!selectedTask) return null;

    return {
      task: selectedTask,
      recommendations: generateRecommendations(selectedTask),
      generatedAt: new Date().toISOString(),
    };
  }, [selectedTask]);

  // 按条件过滤任务
  const filteredTasks = useMemo(() => {
    return store.tasks.filter((task) => {
      if (filters.workZone && task.workZone !== filters.workZone) {
        return false;
      }
      if (filters.taskType && task.taskType !== filters.taskType) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      return true;
    });
  }, [store.tasks, filters]);

  // 选择任务
  const selectTask = (task: DispatchTask) => {
    setSelectedTask(task);
  };

  // 更新筛选
  const updateFilters = (newFilters: Partial<DispatchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    tasks: filteredTasks,
    selectedTask,
    recommendations,
    filters,
    updateFilters,
    selectTask,
  };
}
