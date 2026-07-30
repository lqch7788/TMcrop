/**
 * 派工调度 Zustand Store
 *
 * 数据源：mock种子数据（无后端API）
 * 持久化：localStorage (dispatch-storage)
 * 数据流：Store → Hook → 组件（组件不直接读写localStorage）
 *
 * 匹配算法等业务逻辑保留在Hook层
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
// ========== 类型定义 ==========

import type { SkillTag } from '../components/labor/skill/types';

export interface DispatchTask {
  id: string;
  taskCode: string;
  taskName: string;
  taskType: string;
  priority: '紧急' | '高' | '中' | '低';
  requiredSkills: SkillTag[];
  workZone: string;
  estimatedHours: number;
  dueDate: string;
  description?: string;
}

export interface MockWorker {
  id: string;
  name: string;
  workerType: string;
  workZone: string;
  skills: SkillTag[];
  currentLoad: number;
  recentPerformance: number;
  distance: Record<string, number>;
}

/** 后端派工推荐端点返回的工人简化信息 */
export interface DispatchWorkerRecommendation {
  workerId: string;
  employeeCode: string;
  workerName: string;
  /**
   * 技能列表——后端以**逗号分隔字符串**形式返回（如 "采收,种植"），
   * 调用方按需自行 split(',') 切分为数组。
   * 注意：此处不是 string[]，与后端 dispatch.ts 实际响应保持一致。
   */
  skills: string;
}

// ========== 种子数据（从原useSmartDispatch.ts提取）==========

const SEED_TASKS: DispatchTask[] = [
  {
    id: 'DT001',
    taskCode: 'PG-20260401-001',
    taskName: 'A区番茄采收',
    taskType: '采收任务',
    priority: '高',
    requiredSkills: ['果蔬采收', '分级包装'],
    workZone: 'A区',
    estimatedHours: 4,
    dueDate: '2026-04-05',
    description: '需要完成A区3号大棚番茄采收工作',
  },
  {
    id: 'DT002',
    taskCode: 'PG-20260401-002',
    taskName: 'B区灌溉系统检修',
    taskType: '设备维护',
    priority: '紧急',
    requiredSkills: ['灌溉设备', '滴灌操作'],
    workZone: 'B区',
    estimatedHours: 2,
    dueDate: '2026-04-04',
    description: 'B区滴灌系统出现漏水，需要紧急检修',
  },
  {
    id: 'DT003',
    taskCode: 'PG-20260402-001',
    taskName: 'C区黄瓜分装',
    taskType: '采收任务',
    priority: '中',
    requiredSkills: ['分级包装', '冷链处理'],
    workZone: 'C区',
    estimatedHours: 3,
    dueDate: '2026-04-06',
    description: '采收的黄瓜需要进行分装和冷链预处理',
  },
];

const SEED_WORKERS: MockWorker[] = [
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

// ========== Store ==========

interface DispatchState {
  tasks: DispatchTask[];
  workers: MockWorker[];
  isLoading: boolean;
  error: string | null;

  /** 初始化种子数据（如果存储为空） */
  initSeedData: () => void;

  /** CRUD操作 - 任务 */
  addTask: (task: DispatchTask) => void;
  updateTask: (id: string, updates: Partial<DispatchTask>) => void;
  deleteTask: (id: string) => void;

  /** CRUD操作 - 工人 */
  updateWorker: (id: string, updates: Partial<MockWorker>) => void;

  /**
   * 调用后端派工推荐端点，并按可选班组缩窄候选池
   * @param params 任务标识与可选班组标识列表
   * @returns 后端返回的工人简化推荐列表
   */
  recommendWorkers: (params: {
    taskId: string;
    teamIds?: string[];
  }) => Promise<DispatchWorkerRecommendation[]>;
}

export const useDispatchStore = create<DispatchState>()(
  (set, get)=> ({
      tasks: [],
      workers: [],
      isLoading: false,
      error: null,

      initSeedData: () => {
        const current = get().tasks;
        if (current.length === 0) {
          set({ tasks: SEED_TASKS, workers: SEED_WORKERS });
        }
      },

      addTask: (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      updateWorker: (id, updates) => {
        set((state) => ({
          workers: state.workers.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      /**
       * 调用后端 /api/dispatch/recommend 端点（Task 6 后端实现）
       * 透传 teamIds 缩窄候选池；返回 workers 简化列表
       *
       * 注意：本 action 当前阶段（Task 9）无调用方；Task 13 SmartDispatch 集成班组 chip 时会接入
       */
      recommendWorkers: async (params: { taskId: string; teamIds?: string[] }) => {
        const res = await enhancedApiClient.post<{
          recommendations: DispatchWorkerRecommendation[];
          poolSource: 'team' | 'all';
        }>('/dispatch/recommend', {
          teamIds: params.teamIds ?? [],
          // 后端不读 source/sourceId（Task 6 实施者已标注），但保留以备未来扩展
          source: 'farm',
          sourceId: params.taskId,
        });
        return res.recommendations;
      },
    })
);
