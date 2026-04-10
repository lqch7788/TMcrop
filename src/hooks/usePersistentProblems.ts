/**
 * 问题记录持久化 Hook
 * 专门用于存储巡田监测中发现的问题
 */

import { useCallback } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';

// 问题记录类型
export interface ProblemEntry {
  id: number;
  // 巡田监测字段
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  inspectorId: string;
  inspectorName: string;
  checkDate: string;
  checkTime: string;
  weather: string;
  temperature: number;
  humidity: number;
  cropStatus: string;
  plantHeight?: number;
  leafCount?: number;
  // 问题字段
  issueText: string;
  issueSeverity: '轻微' | '中等' | '严重';
  // 处理字段
  status: '待处理' | '处理中' | '已处理';
  handler?: string;
  handleDate?: string;
  handleResult?: string;
  // 其他
  remarks?: string;
  images?: string[];
}

// 初始 mock 问题数据
const INITIAL_PROBLEMS: ProblemEntry[] = [
  {
    id: 1,
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    cropName: '番茄',
    inspectorId: 'U001',
    inspectorName: '张建国',
    checkDate: '2026-03-14',
    checkTime: '09:00',
    weather: '晴',
    temperature: 25,
    humidity: 60,
    cropStatus: '一般',
    issueText: '部分叶片发黄，可能是缺氮肥',
    issueSeverity: '中等',
    status: '处理中',
    handler: '李建国',
  },
  {
    id: 2,
    greenhouseId: 'G002',
    greenhouseName: '日光温室1号',
    cropName: '黄瓜',
    inspectorId: 'U002',
    inspectorName: '李明辉',
    checkDate: '2026-03-14',
    checkTime: '14:00',
    weather: '多云',
    temperature: 22,
    humidity: 70,
    cropStatus: '良好',
    issueText: '发现少量蚜虫',
    issueSeverity: '轻微',
    status: '已处理',
    handler: '王建华',
    handleDate: '2026-03-14',
    handleResult: '已喷洒吡虫啉',
  },
  {
    id: 3,
    greenhouseId: 'G003',
    greenhouseName: '日光温室2号',
    cropName: '草莓',
    inspectorId: 'U003',
    inspectorName: '王建国',
    checkDate: '2026-03-13',
    checkTime: '10:30',
    weather: '阴',
    temperature: 20,
    humidity: 75,
    cropStatus: '较差',
    issueText: '灰霉病初期，需要及时处理',
    issueSeverity: '严重',
    status: '待处理',
  },
];

let nextProblemId = INITIAL_PROBLEMS.length + 1;

/**
 * 问题记录持久化 Hook
 */
export function usePersistentProblems() {
  const [problems, setProblems] = useLocalStorage<ProblemEntry[]>(
    STORAGE_KEYS.DAILY_PROBLEMS,
    INITIAL_PROBLEMS
  );

  // 添加问题记录
  const addProblem = useCallback((entry: Omit<ProblemEntry, 'id'>) => {
    const newEntry: ProblemEntry = {
      ...entry,
      id: nextProblemId++,
    };
    setProblems(prev => [newEntry, ...prev]);
    return newEntry;
  }, [setProblems]);

  // 更新问题记录
  const updateProblem = useCallback((id: number, updates: Partial<ProblemEntry>) => {
    setProblems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setProblems]);

  // 删除问题记录
  const deleteProblem = useCallback((id: number) => {
    setProblems(prev => prev.filter(p => p.id !== id));
  }, [setProblems]);

  // 重置为初始数据
  const resetToInitial = useCallback(() => {
    setProblems(INITIAL_PROBLEMS);
    nextProblemId = INITIAL_PROBLEMS.length + 1;
  }, [setProblems]);

  return {
    problems,
    addProblem,
    updateProblem,
    deleteProblem,
    resetToInitial,
  };
}

export { INITIAL_PROBLEMS };
