/**
 * AI优化建议Hook
 * 用于检查任务执行人是否可优化，并提供优化建议
 * 逻辑：当Top1推荐比当前执行人高15分以上时，生成优化建议
 */

import { useState, useCallback, useMemo } from 'react';
import type { WorkerRecommendation, UnifiedDispatchTask } from './useComprehensiveDispatch';
import type { AIOptimizationSuggestion } from '../types/dispatch';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../types/dispatch';

/** Hook返回类型 */
export interface UseAIOptimizationReturn {
  // 当前优化建议
  suggestion: AIOptimizationSuggestion | null;

  // 检查是否可以优化（Top1比当前执行人高threshold分以上）
  checkOptimization: (
    task: UnifiedDispatchTask,
    recommendations: WorkerRecommendation[],
    currentWorkerId?: string,
    threshold?: number
  ) => AIOptimizationSuggestion | null;

  // 接受优化建议
  acceptOptimization: () => {
    success: boolean;
    suggestedWorkerId: string;
    suggestedWorkerName: string;
  } | null;

  // 拒绝优化建议
  rejectOptimization: () => void;

  // 清除优化建议
  clearSuggestion: () => void;

  // 是否存在可接受的优化建议
  hasOptimization: boolean;
}

/**
 * AI优化建议Hook
 * @param config AI推荐配置
 */
export function useAIOptimization(
  config = DEFAULT_AI_RECOMMEND_CONFIG
): UseAIOptimizationReturn {
  // 当前优化建议状态
  const [suggestion, setSuggestion] = useState<AIOptimizationSuggestion | null>(null);

  /**
   * 检查任务是否可以优化
   * 条件：Top1推荐比当前执行人高threshold分以上
   */
  const checkOptimization = useCallback(
    (
      task: UnifiedDispatchTask,
      recommendations: WorkerRecommendation[],
      currentWorkerId?: string,
      threshold = config.optimizationThreshold
    ): AIOptimizationSuggestion | null => {
      // 如果没有推荐结果或没有当前执行人，不生成优化建议
      if (!recommendations || recommendations.length === 0) {
        return null;
      }

      // 如果任务没有执行人，不生成优化建议
      if (!currentWorkerId && !task.assigneeId) {
        return null;
      }

      // 使用指定的当前执行人ID或任务中已分配的执行人ID
      const originalWorkerId = currentWorkerId || task.assigneeId;
      const originalWorkerName = task.assigneeName || '';

      if (!originalWorkerId) {
        return null;
      }

      // 获取Top1推荐
      const topRecommendation = recommendations[0];

      // 如果Top1就是当前执行人，不生成优化建议
      if (topRecommendation.worker.id === originalWorkerId) {
        return null;
      }

      // 查找当前执行人在推荐列表中的评分
      const currentWorkerRecommendation = recommendations.find(
        rec => rec.worker.id === originalWorkerId
      );

      // 当前执行人评分
      const originalScore = currentWorkerRecommendation
        ? currentWorkerRecommendation.matchScore
        : 0;

      // Top1评分
      const suggestedScore = topRecommendation.matchScore;

      // 计算分数差值
      const scoreDiff = suggestedScore - originalScore;

      // 如果分数差值小于阈值，不生成优化建议
      if (scoreDiff < threshold) {
        return null;
      }

      // 生成优化建议
      const newSuggestion: AIOptimizationSuggestion = {
        taskId: task.id,
        originalWorkerId,
        originalWorkerName,
        suggestedWorkerId: topRecommendation.worker.id,
        suggestedWorkerName: topRecommendation.worker.name,
        confidenceScore: topRecommendation.confidenceScore,
        originalScore,
        suggestedScore,
        scoreDiff,
        reason: generateOptimizationReason(topRecommendation, currentWorkerRecommendation),
      };

      // 保存建议并返回
      setSuggestion(newSuggestion);
      return newSuggestion;
    },
    [config.optimizationThreshold]
  );

  /**
   * 接受优化建议
   * @returns 建议执行的worker信息
   */
  const acceptOptimization = useCallback(() => {
    if (!suggestion) {
      return null;
    }

    const result = {
      success: true,
      suggestedWorkerId: suggestion.suggestedWorkerId,
      suggestedWorkerName: suggestion.suggestedWorkerName,
    };

    // 清除建议
    setSuggestion(null);

    return result;
  }, [suggestion]);

  /**
   * 拒绝优化建议
   */
  const rejectOptimization = useCallback(() => {
    setSuggestion(null);
  }, []);

  /**
   * 清除优化建议
   */
  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  // 是否存在可接受的优化建议
  const hasOptimization = useMemo(() => {
    return suggestion !== null;
  }, [suggestion]);

  return {
    suggestion,
    checkOptimization,
    acceptOptimization,
    rejectOptimization,
    clearSuggestion,
    hasOptimization,
  };
}

/**
 * 生成优化理由
 */
function generateOptimizationReason(
  topRecommendation: WorkerRecommendation,
  currentRecommendation?: WorkerRecommendation
): string {
  const reasons: string[] = [];

  // 技能匹配
  if (topRecommendation.skillMatchRate >= 80) {
    reasons.push(`技能匹配度高(${topRecommendation.skillMatchRate}%)`);
  }

  // 地理位置
  if (topRecommendation.locationScore >= 85) {
    reasons.push(`距离近(${topRecommendation.worker.workZone})`);
  }

  // 负荷状态
  if (topRecommendation.worker.currentLoad < 50) {
    reasons.push(`当前负荷低(${topRecommendation.worker.currentLoad}%)`);
  }

  // 历史表现
  if (topRecommendation.worker.recentPerformance >= 90) {
    reasons.push(`近期表现优秀(${topRecommendation.worker.recentPerformance}分)`);
  }

  // 置信度
  if (topRecommendation.confidenceLevel === 'high') {
    reasons.push('AI高置信度推荐');
  }

  // 如果有当前执行人对比，添加对比信息
  if (currentRecommendation) {
    const scoreGap = topRecommendation.matchScore - currentRecommendation.matchScore;
    if (scoreGap > 0) {
      reasons.push(`综合评分高出${scoreGap}分`);
    }
  }

  return reasons.join('，');
}

export default useAIOptimization;
