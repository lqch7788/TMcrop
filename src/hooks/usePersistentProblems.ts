/**
 * 问题记录持久化 Hook
 * 专门用于存储巡查管理中发现的问题
 */

import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from './useLocalStorage';

// 问题来源类型
export type ProblemSourceType = 'inspection' | 'manual' | 'production' | 'equipment' | 'other';

// 问题记录类型
export interface ProblemEntry {
  id: number;
  problemCode: string;  // 问题编号：PD + 年月日(8位) + 流水号(3位)，如 PD20260415001
  // 巡查管理字段
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
  status: '待处理' | '处理中' | '待验收' | '已处理';
  handler?: string;
  handleDate?: string;
  handleResult?: string;
  // 关联的任务ID
  sourceTaskId?: string;
  // 流转记录（数据闭环关键）
  flowRecords?: ProblemFlowRecord[];
  // 返工次数统计（用于分次返工管控）
  reworkCount?: number;
  // 接单信息
  acceptedBy?: string;          // 接单人
  acceptedTime?: string;        // 接单时间
  rejectedBy?: string;          // 拒绝人
  rejectedReason?: string;      // 拒绝原因
  rejectedTime?: string;       // 拒绝时间
  // 完成时间
  completionTime?: string;
  // 其他
  remarks?: string;
  images?: string[];
  // 来源追踪字段
  sourceModule?: ProblemSourceType;  // 来源模块：inspection-巡查, manual-手动, production-生产, equipment-设备, other-其他
  sourceId?: string;               // 原始单据ID（如巡查记录ID）
  sourceDetail?: string;             // 来源详情描述
}

// 问题流转记录类型
export interface ProblemFlowRecord {
  id: string;
  problemId: number;
  operatorId: string;
  operatorName: string;
  action: 'report' | 'dispatch' | 'accept' | 'reject' | 'start' | 'submit' | 'approve' | 'reject_acceptance' | 'complete' | 'comment' | 'progress';
  fromStatus: string;
  toStatus: string;
  comment?: string;
  actionTime: string;
  progress?: number;  // 进度百分比（用于 progress 动作）
}

// 初始 mock 问题数据
const INITIAL_PROBLEMS: ProblemEntry[] = [
  {
    id: 1,
    problemCode: 'PD20260314001',
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
    sourceTaskId: 'TASK-001',
    sourceModule: 'inspection',
    sourceId: 'XT20260314-001',
    flowRecords: [
      { id: 'FR-001', problemId: 1, operatorId: 'U001', operatorName: '张建国', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-03-14T09:00:00' },
      { id: 'FR-002', problemId: 1, operatorId: 'U001', operatorName: '张建国', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', comment: '分派给李建国处理', actionTime: '2026-03-14T09:30:00' },
    ],
  },
  {
    id: 2,
    problemCode: 'PD20260314002',
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
    completionTime: '2026-03-14T16:00:00',
    sourceModule: 'inspection',
    sourceId: 'XT20260314-002',
    flowRecords: [
      { id: 'FR-003', problemId: 2, operatorId: 'U002', operatorName: '李明辉', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-03-14T14:00:00' },
      { id: 'FR-004', problemId: 2, operatorId: 'U002', operatorName: '李明辉', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', actionTime: '2026-03-14T14:30:00' },
      { id: 'FR-005', problemId: 2, operatorId: 'U003', operatorName: '王建华', action: 'accept', fromStatus: '处理中', toStatus: '处理中', actionTime: '2026-03-14T15:00:00' },
      { id: 'FR-006', problemId: 2, operatorId: 'U003', operatorName: '王建华', action: 'submit', fromStatus: '处理中', toStatus: '待验收', comment: '已完成喷药作业', actionTime: '2026-03-14T15:30:00' },
      { id: 'FR-007', problemId: 2, operatorId: 'U002', operatorName: '李明辉', action: 'approve', fromStatus: '待验收', toStatus: '已处理', comment: '验收通过', actionTime: '2026-03-14T16:00:00' },
    ],
  },
  {
    id: 3,
    problemCode: 'PD20260313001',
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
    sourceModule: 'inspection',
    sourceId: 'XT20260313-001',
    flowRecords: [
      { id: 'FR-008', problemId: 3, operatorId: 'U003', operatorName: '王建国', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-03-13T10:30:00' },
    ],
  },
  {
    id: 4,
    problemCode: 'PD20260415001',
    greenhouseId: 'G004',
    greenhouseName: '薄膜温室3号',
    cropName: '茄子',
    inspectorId: 'U001',
    inspectorName: '张建国',
    checkDate: '2026-04-15',
    checkTime: '08:30',
    weather: '晴',
    temperature: 28,
    humidity: 55,
    cropStatus: '良好',
    issueText: '叶片背面发现红蜘蛛虫害，局部叶片发黄',
    issueSeverity: '中等',
    status: '待处理',
    sourceModule: 'inspection',
    sourceId: 'XT20260415-001',
    flowRecords: [
      { id: 'FR-009', problemId: 4, operatorId: 'U001', operatorName: '张建国', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-15T08:30:00' },
    ],
  },
  {
    id: 5,
    problemCode: 'PD20260415002',
    greenhouseId: 'G005',
    greenhouseName: '玻璃温室B区',
    cropName: '辣椒',
    inspectorId: 'U002',
    inspectorName: '李明辉',
    checkDate: '2026-04-15',
    checkTime: '10:00',
    weather: '晴',
    temperature: 26,
    humidity: 60,
    cropStatus: '一般',
    issueText: '顶部新叶卷曲，可能是除草剂漂移影响',
    issueSeverity: '轻微',
    status: '待处理',
    sourceModule: 'inspection',
    sourceId: 'XT20260415-002',
    flowRecords: [
      { id: 'FR-010', problemId: 5, operatorId: 'U002', operatorName: '李明辉', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-15T10:00:00' },
    ],
  },
];

// 按日期统计每日问题数量，用于生成问题编号
const dailyProblemCount: Record<string, number> = {};
INITIAL_PROBLEMS.forEach(p => {
  const dateKey = p.checkDate.replace(/-/g, '');
  dailyProblemCount[dateKey] = (dailyProblemCount[dateKey] || 0) + 1;
});

// 生成问题编号：PD + 年月日(8位) + 流水号(3位)
function generateProblemCode(dateStr: string): string {
  const dateKey = dateStr.replace(/-/g, ''); // 把 2026-03-14 变成 20260314
  dailyProblemCount[dateKey] = (dailyProblemCount[dateKey] || 0) + 1;
  const seq = String(dailyProblemCount[dateKey]).padStart(3, '0');
  return `PD${dateKey}${seq}`;
}

let nextProblemId = INITIAL_PROBLEMS.length + 1;

// 模块级状态 - 所有组件共享同一个状态
let problemsState: ProblemEntry[] = INITIAL_PROBLEMS;
let listeners: Array<(problems: ProblemEntry[]) => void> = [];

// 读取初始数据
try {
  const stored = localStorage.getItem(STORAGE_KEYS.DAILY_PROBLEMS);
  if (stored) {
    problemsState = JSON.parse(stored);
    const maxId = Math.max(0, ...problemsState.map(p => p.id));
    nextProblemId = maxId + 1;
  }
} catch {}

// 通知所有监听器
const notifyListeners = () => {
  listeners.forEach(listener => listener(problemsState));
};

// 保存到 localStorage
const persistProblems = (newProblems: ProblemEntry[]) => {
  problemsState = newProblems;
  localStorage.setItem(STORAGE_KEYS.DAILY_PROBLEMS, JSON.stringify(newProblems));
  notifyListeners();
};

/**
 * 问题记录持久化 Hook
 */
export function usePersistentProblems() {
  const [problems, setProblems] = useState<ProblemEntry[]>(problemsState);

  useEffect(() => {
    // 注册监听器
    listeners.push(setProblems);
    // 初始化状态
    setProblems(problemsState);
    // 清理函数
    return () => {
      listeners = listeners.filter(l => l !== setProblems);
    };
  }, []);

  // 添加问题记录
  const addProblem = useCallback((entry: Omit<ProblemEntry, 'id' | 'problemCode'>): number => {
    const problemCode = generateProblemCode(entry.checkDate);
    const newEntry: ProblemEntry = {
      ...entry,
      id: nextProblemId++,
      problemCode,
    };
    persistProblems([newEntry, ...problemsState]);
    return newEntry.id;
  }, []);

  // 更新问题记录
  const updateProblem = useCallback((id: number, updates: Partial<ProblemEntry>) => {
    persistProblems(problemsState.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // 删除问题记录
  const deleteProblem = useCallback((id: number) => {
    persistProblems(problemsState.filter(p => p.id !== id));
  }, []);

  // 重置为初始数据
  const resetToInitial = useCallback(() => {
    persistProblems(INITIAL_PROBLEMS);
    nextProblemId = INITIAL_PROBLEMS.length + 1;
  }, []);

  // 强制刷新问题数据（用于同步状态）
  const forceRefresh = useCallback(() => {
    setProblems([...problemsState]);
  }, []);

  return {
    problems,
    forceRefresh,
    addProblem,
    updateProblem,
    deleteProblem,
    resetToInitial,
  };
}

export { INITIAL_PROBLEMS };
