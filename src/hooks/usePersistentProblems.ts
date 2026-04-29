/**
 * 问题记录持久化 Hook
 * 专门用于存储巡查管理中发现的问题
 */

import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from './useLocalStorage';
import type { ProblemFlowRecord } from './useProblemDispatch';

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
  // 期望完成时间（分派时设置，由分派人员根据实际情况决定）
  expectedCompletion?: string;
  // 其他
  remarks?: string;
  images?: string[];
  // 来源追踪字段
  sourceModule?: ProblemSourceType;  // 来源模块：inspection-巡查, manual-手动, production-生产, equipment-设备, other-其他
  sourceId?: string;               // 原始单据ID（如巡查记录ID）
  sourceDetail?: string;             // 来源详情描述
}

// ProblemFlowRecord 类型从 useProblemDispatch 导入（包含完整的 feedbackData 字段）
export type { ProblemFlowRecord } from './useProblemDispatch';

// 初始 mock 问题数据 - 与巡查记录关联
const INITIAL_PROBLEMS: ProblemEntry[] = [
  // 巡查记录 IR002 - 黄瓜缺水问题 - 处理中
  {
    id: 1,
    problemCode: 'PD20260409001',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    cropName: '黄瓜',
    inspectorId: 'U004',
    inspectorName: '郭靖',
    checkDate: '2026-04-09',
    checkTime: '14:30',
    weather: '晴',
    temperature: 32,
    humidity: 58,
    cropStatus: '轻微萎蔫',
    issueText: '黄瓜叶片出现轻微萎蔫，大棚内温度偏高导致，建议增加通风遮阳',
    issueSeverity: '中等',
    status: '处理中',
    handler: '黄蓉',
    handleDate: '2026-04-09',
    handleResult: '已增加通风设备，并进行灌溉',
    sourceModule: 'inspection',
    sourceId: 'XT20260409-001',
    flowRecords: [
      { id: 'FR-001', problemId: 1, operatorId: 'U004', operatorName: '郭靖', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-09T14:30:00' },
      { id: 'FR-002', problemId: 1, operatorId: 'U004', operatorName: '郭靖', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', comment: '分派给黄蓉处理', actionTime: '2026-04-09T15:00:00' },
      { id: 'FR-003', problemId: 1, operatorId: 'U003', operatorName: '黄蓉', action: 'start', fromStatus: '处理中', toStatus: '处理中', comment: '已开始处理', actionTime: '2026-04-09T15:30:00' },
    ],
  },
  // 巡查记录 IR003 - 草莓白粉虱问题 - 待处理
  {
    id: 2,
    problemCode: 'PD20260408001',
    greenhouseId: 'G004',
    greenhouseName: '日光温室1号',
    cropName: '草莓',
    inspectorId: 'U005',
    inspectorName: '杨过',
    checkDate: '2026-04-08',
    checkTime: '10:00',
    weather: '多云',
    temperature: 22,
    humidity: 70,
    cropStatus: '生长正常',
    issueText: '草莓叶片发现白粉虱成虫，数量较少但需密切关注，发现2株有虫害迹象',
    issueSeverity: '轻微',
    status: '待处理',
    sourceModule: 'inspection',
    sourceId: 'XT20260408-001',
    flowRecords: [
      { id: 'FR-004', problemId: 2, operatorId: 'U005', operatorName: '杨过', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-08T10:00:00' },
    ],
  },
  // 巡查记录 IR006 - 菠菜缺水问题 - 已处理
  {
    id: 3,
    problemCode: 'PD20260406001',
    greenhouseId: 'G006',
    greenhouseName: '日光温室3号',
    cropName: '菠菜',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    checkDate: '2026-04-06',
    checkTime: '15:30',
    weather: '阴',
    temperature: 18,
    humidity: 58,
    cropStatus: '轻微萎蔫',
    issueText: '菠菜出现轻微萎蔫，土壤湿度偏低，需要立即灌溉',
    issueSeverity: '轻微',
    status: '已处理',
    handler: '小龙女',
    handleDate: '2026-04-06',
    handleResult: '已完成灌溉，土壤湿度已恢复正常',
    completionTime: '2026-04-06T18:00:00',
    sourceModule: 'inspection',
    sourceId: 'XT20260406-001',
    flowRecords: [
      { id: 'FR-005', problemId: 3, operatorId: 'U006', operatorName: '黄蓉', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-06T15:30:00' },
      { id: 'FR-006', problemId: 3, operatorId: 'U006', operatorName: '黄蓉', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', actionTime: '2026-04-06T16:00:00' },
      { id: 'FR-007', problemId: 3, operatorId: 'U008', operatorName: '小龙女', action: 'accept', fromStatus: '处理中', toStatus: '处理中', actionTime: '2026-04-06T16:30:00' },
      { id: 'FR-008', problemId: 3, operatorId: 'U008', operatorName: '小龙女', action: 'submit', fromStatus: '处理中', toStatus: '待验收', comment: '已完成灌溉作业', actionTime: '2026-04-06T17:30:00' },
      { id: 'FR-009', problemId: 3, operatorId: 'U006', operatorName: '黄蓉', action: 'approve', fromStatus: '待验收', toStatus: '已处理', comment: '验收通过', actionTime: '2026-04-06T18:00:00' },
    ],
  },
  // 巡查记录 IR008 - 白菜菜青虫问题 - 待处理
  {
    id: 4,
    problemCode: 'PD20260404001',
    greenhouseId: 'G008',
    greenhouseName: '塑料大棚1号',
    cropName: '白菜',
    inspectorId: 'U008',
    inspectorName: '小龙女',
    checkDate: '2026-04-04',
    checkTime: '14:15',
    weather: '多云',
    temperature: 19,
    humidity: 72,
    cropStatus: '生长正常',
    issueText: '大白菜叶片发现菜青虫虫害，发现3株有虫害迹象',
    issueSeverity: '中等',
    status: '待处理',
    sourceModule: 'inspection',
    sourceId: 'XT20260404-001',
    flowRecords: [
      { id: 'FR-010', problemId: 4, operatorId: 'U008', operatorName: '小龙女', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-04T14:15:00' },
    ],
  },
  // 巡查记录 IR009 - 水泵轴承磨损问题 - 处理中
  {
    id: 5,
    problemCode: 'PD20260403001',
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    cropName: '',
    inspectorId: 'U003',
    inspectorName: '令狐冲',
    checkDate: '2026-04-03',
    checkTime: '10:00',
    weather: '晴',
    temperature: 22,
    humidity: 60,
    cropStatus: '',
    issueText: '1号灌溉水泵运行时异响，拆检发现轴承磨损严重，需要更换轴承',
    issueSeverity: '中等',
    status: '处理中',
    handler: '郭靖',
    handleDate: '2026-04-03',
    handleResult: '正在采购轴承，预计明天完成维修',
    sourceModule: 'inspection',
    sourceId: 'XT20260403-001',
    flowRecords: [
      { id: 'FR-011', problemId: 5, operatorId: 'U003', operatorName: '令狐冲', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-03T10:00:00' },
      { id: 'FR-012', problemId: 5, operatorId: 'U003', operatorName: '令狐冲', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', comment: '分派给郭靖处理', actionTime: '2026-04-03T10:30:00' },
      { id: 'FR-013', problemId: 5, operatorId: 'U004', operatorName: '郭靖', action: 'start', fromStatus: '处理中', toStatus: '处理中', comment: '已拆检确认轴承磨损', actionTime: '2026-04-03T11:00:00' },
    ],
  },
  // 巡查记录 IR012 - 滴灌漏水问题 - 处理中
  {
    id: 6,
    problemCode: 'PD20260412001',
    greenhouseId: 'G005',
    greenhouseName: '日光温室2号',
    cropName: '',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    checkDate: '2026-04-12',
    checkTime: '09:00',
    weather: '晴',
    temperature: 20,
    humidity: 70,
    cropStatus: '',
    issueText: '2号温室滴灌系统主供水管道接头处严重漏水，已用胶带临时封堵，需要采购新接头进行修复',
    issueSeverity: '严重',
    status: '处理中',
    handler: '一灯大师',
    handleDate: '2026-04-12',
    handleResult: '已临时封堵，正在申请采购新接头',
    sourceModule: 'inspection',
    sourceId: 'XT20260412-001',
    flowRecords: [
      { id: 'FR-014', problemId: 6, operatorId: 'U006', operatorName: '黄蓉', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-12T09:00:00' },
      { id: 'FR-015', problemId: 6, operatorId: 'U006', operatorName: '黄蓉', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', comment: '分派给一灯大师处理', actionTime: '2026-04-12T09:30:00' },
      { id: 'FR-016', problemId: 6, operatorId: 'U013', operatorName: '一灯大师', action: 'start', fromStatus: '处理中', toStatus: '处理中', comment: '已用胶带临时封堵', actionTime: '2026-04-12T10:00:00' },
    ],
  },
  // 巡查记录 IR015 - 路面破损问题 - 待验收
  {
    id: 7,
    problemCode: 'PD20260409002',
    greenhouseId: '',
    greenhouseName: '园区主干道',
    cropName: '',
    inspectorId: 'U013',
    inspectorName: '一灯大师',
    checkDate: '2026-04-09',
    checkTime: '16:00',
    weather: '晴',
    temperature: 25,
    humidity: 50,
    cropStatus: '',
    issueText: '园区环形通道K+200处路面破损，面积约2平方米，影响农机通行',
    issueSeverity: '中等',
    status: '待验收',
    handler: '令狐冲',
    handleDate: '2026-04-09',
    handleResult: '已完成路面修复，填充了破损区域',
    sourceModule: 'inspection',
    sourceId: 'XT20260409-002',
    flowRecords: [
      { id: 'FR-017', problemId: 7, operatorId: 'U013', operatorName: '一灯大师', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: '2026-04-09T16:00:00' },
      { id: 'FR-018', problemId: 7, operatorId: 'U013', operatorName: '一灯大师', action: 'dispatch', fromStatus: '待处理', toStatus: '处理中', actionTime: '2026-04-09T16:30:00' },
      { id: 'FR-019', problemId: 7, operatorId: 'U003', operatorName: '令狐冲', action: 'accept', fromStatus: '处理中', toStatus: '处理中', actionTime: '2026-04-09T17:00:00' },
      { id: 'FR-020', problemId: 7, operatorId: 'U003', operatorName: '令狐冲', action: 'submit', fromStatus: '处理中', toStatus: '待验收', comment: '已完成路面修复', actionTime: '2026-04-09T18:00:00' },
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
} catch {
  // 忽略解析错误，使用默认空状态
}

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
