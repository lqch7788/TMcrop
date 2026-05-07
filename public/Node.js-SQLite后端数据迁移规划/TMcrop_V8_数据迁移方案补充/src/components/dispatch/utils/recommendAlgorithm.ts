/**
 * 智能推荐算法工具
 * 统一算法架构，支持农事任务(3因子)和智能派工(5因子)两种模式
 */

import { DISPATCH_WEIGHTS } from '../config/dispatchConfig';
import type { RecommendedExecutor } from '../types/dispatch';
import { SkillTag } from '../../skill/types';

/**
 * 员工基础信息
 */
export interface WorkerInfo {
  id: string;
  name: string;
  workerType: string;
  workZone: string;
  skills: SkillTag[];
  currentLoad: number;      // 当前负荷 0-100%
  recentPerformance: number; // 近30天表现评分 0-100
  distance: Record<string, number>; // 到各区域的距离
}

/**
 * 推荐算法输入
 */
export interface RecommendInput {
  taskName: string;
  workZone: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  requiredSkills: SkillTag[];
  estimatedHours?: number;
}

/**
 * 计算技能匹配度
 */
export function calculateSkillMatch(
  workerSkills: SkillTag[],
  requiredSkills: SkillTag[]
): number {
  if (requiredSkills.length === 0) return 100;
  const matched = requiredSkills.filter((skill) =>
    workerSkills.includes(skill)
  );
  return Math.round((matched.length / requiredSkills.length) * 100);
}

/**
 * 计算地理位置得分 (距离越近分数越高)
 */
export function calculateLocationScore(distance: number): number {
  if (distance <= 1) return 100;
  if (distance <= 2) return 85;
  if (distance <= 3) return 70;
  if (distance <= 5) return 55;
  return 40;
}

/**
 * 计算负荷得分 (负荷越低分数越高)
 */
export function calculateLoadScore(load: number): number {
  return Math.round(100 - load);
}

/**
 * 计算历史表现得分
 */
export function calculatePerformanceScore(performance: number): number {
  return performance;
}

/**
 * 计算紧急程度得分
 */
export function calculateUrgencyScore(
  priority: RecommendInput['priority']
): number {
  switch (priority) {
    case 'urgent': return 100;
    case 'high': return 80;
    case 'normal': return 60;
    case 'low': return 40;
    default: return 50;
  }
}

/**
 * 生成推荐结果（带推荐理由）
 */
function generateReasons(
  skillMatchRate: number,
  distance: number,
  currentLoad: number,
  recentPerformance: number,
  worker: WorkerInfo
): string[] {
  const reasons: string[] = [];
  if (skillMatchRate >= 80) {
    reasons.push(`技能匹配度${skillMatchRate}%`);
  }
  if (distance <= 2) {
    reasons.push(`距离近(${distance}km)`);
  }
  if (currentLoad < 50) {
    reasons.push(`当前负荷低(${currentLoad}%)`);
  }
  if (recentPerformance >= 90) {
    reasons.push(`近期表现优秀(${recentPerformance}分)`);
  }
  return reasons;
}

/**
 * 农事任务推荐算法（3因子）
 * 因子：工作量(50%) + 技能匹配(30%) + 地理位置(20%)
 */
export function calculateFarmRecommend(
  workers: WorkerInfo[],
  task: RecommendInput
): RecommendedExecutor[] {
  const weights = DISPATCH_WEIGHTS.farm;

  return workers
    .map((worker) => {
      const skillMatchRate = calculateSkillMatch(worker.skills, task.requiredSkills);
      const distance = worker.distance[task.workZone] || 5;
      const locationScore = calculateLocationScore(distance);
      const loadScore = calculateLoadScore(worker.currentLoad);

      // 综合得分 = 工作量×0.50 + 技能匹配×0.30 + 地理位置×0.20
      const matchScore = Math.round(
        loadScore * weights.workload +
        skillMatchRate * weights.skill +
        locationScore * weights.location
      );

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
        performanceScore: 0,
        urgencyScore: 0,
        reasons: generateReasons(skillMatchRate, distance, worker.currentLoad, worker.recentPerformance, worker),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 智能派工推荐算法（5因子）
 * 因子：技能匹配(30%) + 地理位置(25%) + 当前负荷(20%) + 历史表现(15%) + 紧急程度(10%)
 */
export function calculateSmartRecommend(
  workers: WorkerInfo[],
  task: RecommendInput
): RecommendedExecutor[] {
  const weights = DISPATCH_WEIGHTS.smart;

  return workers
    .map((worker) => {
      const skillMatchRate = calculateSkillMatch(worker.skills, task.requiredSkills);
      const distance = worker.distance[task.workZone] || 5;
      const locationScore = calculateLocationScore(distance);
      const loadScore = calculateLoadScore(worker.currentLoad);
      const performanceScore = calculatePerformanceScore(worker.recentPerformance);
      const urgencyScore = calculateUrgencyScore(task.priority);

      // 综合得分 = 技能匹配×0.30 + 地理位置×0.25 + 当前负荷×0.20 + 历史表现×0.15 + 紧急程度×0.10
      const matchScore = Math.round(
        skillMatchRate * weights.skillMatch +
        locationScore * weights.location +
        loadScore * weights.currentLoad +
        performanceScore * weights.historicalPerformance +
        urgencyScore * weights.urgency
      );

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
        reasons: generateReasons(skillMatchRate, distance, worker.currentLoad, worker.recentPerformance, worker),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 统一推荐入口
 * 根据模式调用不同的算法
 */
export function getUnifiedRecommendations(
  workers: WorkerInfo[],
  task: RecommendInput,
  mode: 'farm' | 'smart'
): RecommendedExecutor[] {
  if (mode === 'farm') {
    return calculateFarmRecommend(workers, task);
  }
  return calculateSmartRecommend(workers, task);
}

/**
 * 按评分排序
 */
export function sortByScore(workers: RecommendedExecutor[]): RecommendedExecutor[] {
  return [...workers].sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 获取推荐结果摘要
 */
export function getRecommendationSummary(
  recommendations: RecommendedExecutor[]
): {
  topRecommended: RecommendedExecutor | null;
  alternatives: RecommendedExecutor[];
} {
  if (recommendations.length === 0) {
    return { topRecommended: null, alternatives: [] };
  }
  return {
    topRecommended: recommendations[0],
    alternatives: recommendations.slice(1),
  };
}
