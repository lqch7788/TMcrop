/**
 * 智能推荐 Hook
 * 基于统一推荐算法，提供智能派工建议
 */

import { useState, useCallback, useMemo } from 'react';
import type { RecommendedExecutor } from '../types/dispatch';
import { WorkerInfo, RecommendInput, getUnifiedRecommendations } from '../utils/recommendAlgorithm';
import { SkillTag } from '../../skill/types';

// Mock员工数据
interface MockWorker {
  id: string;
  name: string;
  workerType: string;
  workZone: string;
  skills: SkillTag[];
  currentLoad: number;
  recentPerformance: number;
  distance: Record<string, number>;
}

const mockWorkers: MockWorker[] = [
  {
    id: 'W001',
    name: '萧峰',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['微喷灌溉', '滴灌操作', '水肥一体化', '果蔬采收', '分级包装'],
    currentLoad: 60,
    recentPerformance: 92,
    distance: { 'A区': 0.5, 'B区': 2, 'C区': 3.5, 'D区': 4 },
  },
  {
    id: 'W002',
    name: '虚竹',
    workerType: '季节工',
    workZone: 'C区',
    skills: ['果蔬采收', '分级包装', '冷链处理'],
    currentLoad: 40,
    recentPerformance: 88,
    distance: { 'A区': 3.5, 'B区': 4, 'C区': 0.3, 'D区': 1.5 },
  },
  {
    id: 'W003',
    name: '狄云',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['拖拉机', '旋耕机', '收割机', '灌溉设备'],
    currentLoad: 80,
    recentPerformance: 85,
    distance: { 'A区': 1, 'B区': 2.5, 'C区': 4, 'D区': 5 },
  },
  {
    id: 'W004',
    name: '石破天',
    workerType: '临时工',
    workZone: 'B区',
    skills: ['农药配制', '喷雾操作', '生物防治'],
    currentLoad: 30,
    recentPerformance: 90,
    distance: { 'A区': 2, 'B区': 0.5, 'C区': 4.5, 'D区': 5 },
  },
  {
    id: 'W005',
    name: '胡斐',
    workerType: '季节工',
    workZone: 'D区',
    skills: ['播种', '嫁接', '炼苗', '病害识别', '果蔬采收'],
    currentLoad: 50,
    recentPerformance: 87,
    distance: { 'A区': 4, 'B区': 5, 'C区': 1.5, 'D区': 0.5 },
  },
  {
    id: 'W006',
    name: '袁承志',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['温室调控', '加温系统', '通风系统', '长势评估', '灌溉设备'],
    currentLoad: 70,
    recentPerformance: 93,
    distance: { 'A区': 0.8, 'B区': 1.5, 'C区': 3, 'D区': 4 },
  },
];

// 将MockWorker转换为WorkerInfo
function convertToWorkerInfo(workers: MockWorker[]): WorkerInfo[] {
  return workers.map((w) => ({
    id: w.id,
    name: w.name,
    workerType: w.workerType,
    workZone: w.workZone,
    skills: w.skills,
    currentLoad: w.currentLoad,
    recentPerformance: w.recentPerformance,
    distance: w.distance,
  }));
}

export interface UseSmartRecommendOptions {
  /** 推荐模式：farm(3因子) 或 smart(5因子) */
  mode?: 'farm' | 'smart';
}

/**
 * 智能推荐 Hook
 */
export function useSmartRecommend(options: UseSmartRecommendOptions = {}) {
  const { mode = 'smart' } = options;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 获取员工列表
  const workers = useMemo(() => convertToWorkerInfo(mockWorkers), []);

  // 获取所有可选员工
  const getWorkers = useCallback(() => workers, [workers]);

  // 根据任务信息获取推荐
  const getRecommendations = useCallback(
    (task: RecommendInput): RecommendedExecutor[] => {
      return getUnifiedRecommendations(workers, task, mode);
    },
    [workers, mode]
  );

  // 根据任务信息获取单个最佳推荐
  const getTopRecommendation = useCallback(
    (task: RecommendInput): RecommendedExecutor | null => {
      const recommendations = getUnifiedRecommendations(workers, task, mode);
      return recommendations.length > 0 ? recommendations[0] : null;
    },
    [workers, mode]
  );

  // 选择任务
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  return {
    // 数据
    workers,
    selectedTaskId,

    // 方法
    getWorkers,
    getRecommendations,
    getTopRecommendation,
    selectTask,
    clearSelection,
  };
}
