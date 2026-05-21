/**
 * 工作日志 Zustand Store (V2.0 架构 - 恢复localStorage模式)
 *
 * 架构：Zustand persist → localStorage (临时恢复，对接API后需改回)
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==================== 类型定义 ====================

/** 工作日志数据 */
export interface WorkLog {
  id: number;
  code: string;
  date: string;
  worker: string;
  weather: string;
  temperature: string;
  crop: string;
  greenhouse: string;
  growthStatus: '良好' | '一般';
  tasks: string;
  problems: string;
  solutions: string;
  taskId?: string;
  batchId?: string;
  batchCode?: string;
  taskCode?: string;
  taskType?: string;
  taskTypeName?: string;
  progress?: number;
  workloadHours?: number;
  workloadDays?: number;
  workers?: number;
  submitTime?: string;
  feedbackText?: string;
}

/** 筛选条件 */
export interface WorkLogFilters {
  date: string;
  worker: string;
  greenhouse: string;
}

// ==================== 种子数据（保留原有mock数据） ====================

const SEED_DATA: WorkLog[] = [
  { id: 1, code: 'WL20240301', date: '2024-03-14', worker: '郭靖', weather: '晴', temperature: '25°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '授粉、浇水', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
  { id: 2, code: 'WL20240302', date: '2024-03-14', worker: '杨过', weather: '晴', temperature: '26°C', crop: '黄瓜', greenhouse: '2号棚', growthStatus: '良好', tasks: '施肥、病虫害防治', problems: '发现少量蚜虫', solutions: '已喷洒吡虫啉', taskId: 'T002', batchId: 'B002', batchCode: 'FQ2024-002' },
  { id: 3, code: 'WL20240303', date: '2024-03-14', worker: '张无忌', weather: '晴', temperature: '24°C', crop: '草莓', greenhouse: '3号棚', growthStatus: '一般', tasks: '疏果、浇水', problems: '部分叶片发黄', solutions: '补充氮肥', taskId: 'T003', batchId: 'B003', batchCode: 'FQ2024-003' },
  { id: 4, code: 'WL20240304', date: '2024-03-13', worker: '令狐冲', weather: '多云', temperature: '22°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '整枝、授粉', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
  { id: 5, code: 'WL20240305', date: '2024-03-13', worker: '段誉', weather: '多云', temperature: '23°C', crop: '辣椒', greenhouse: '4号棚', growthStatus: '良好', tasks: '浇水、施肥', problems: '无', solutions: '-', taskId: 'T005', batchId: 'B005', batchCode: 'FQ2024-005' },
  { id: 6, code: 'WL20240306', date: '2024-03-12', worker: '黄蓉', weather: '阴', temperature: '20°C', crop: '生菜', greenhouse: '5号棚', growthStatus: '良好', tasks: '采收、清洗', problems: '无', solutions: '-', taskId: 'T004', batchId: 'B004', batchCode: 'FQ2024-004' },
  { id: 7, code: 'WL20240307', date: '2024-03-12', worker: '陈家洛', weather: '阴', temperature: '21°C', crop: '菠菜', greenhouse: '6号棚', growthStatus: '一般', tasks: '除草、浇水', problems: '发现蜗牛', solutions: '已撒石灰驱除', taskId: undefined, batchId: 'B006', batchCode: 'FQ2024-006' },
  { id: 8, code: 'WL20240308', date: '2024-03-11', worker: '任盈盈', weather: '晴', temperature: '24°C', crop: '番茄', greenhouse: '1号棚', growthStatus: '良好', tasks: '绑蔓、修剪', problems: '无', solutions: '-', taskId: 'T001', batchId: 'B001', batchCode: 'FQ2024-001' },
];

// ==================== Store 接口 ====================

interface WorkLogState {
  /** 工作日志列表 */
  workLogs: WorkLog[];
  /** 筛选条件（UI状态） */
  filters: WorkLogFilters;

  // CRUD
  addWorkLog: (data: Partial<WorkLog>) => WorkLog;
  updateWorkLog: (id: number, updates: Partial<WorkLog>) => void;
  deleteWorkLog: (id: number) => void;

  // 筛选
  setFilters: (filters: Partial<WorkLogFilters>) => void;
}

// ==================== 创建 Store ====================

export const useWorkLogStore = create<WorkLogState>()(
  persist(
    (set, get) => ({
      workLogs: SEED_DATA,
      filters: { date: '', worker: '', greenhouse: '全部' },

      addWorkLog: (data) => {
        const newId = Math.max(0, ...get().workLogs.map(l => l.id)) + 1;
        const newLog: WorkLog = {
          id: newId,
          code: `WL${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(newId).padStart(3, '0')}`,
          date: data.date || new Date().toISOString().split('T')[0],
          worker: data.worker || '',
          weather: data.weather || '晴',
          temperature: data.temperature || '25°C',
          crop: data.crop || '',
          greenhouse: data.greenhouse || '',
          growthStatus: (data.growthStatus as '良好' | '一般') || '良好',
          tasks: data.tasks || '',
          problems: data.problems || '无',
          solutions: data.solutions || '-',
          taskId: data.taskId,
          batchId: data.batchId,
          batchCode: data.batchCode,
          taskCode: data.taskCode,
          taskType: data.taskType,
          taskTypeName: data.taskTypeName,
          progress: data.progress,
          workloadHours: data.workloadHours,
          workloadDays: data.workloadDays,
          workers: data.workers,
          submitTime: data.submitTime,
          feedbackText: data.feedbackText,
        };
        set((state) => ({ workLogs: [newLog, ...state.workLogs] }));
        return newLog;
      },

      updateWorkLog: (id, updates) => {
        set((state) => ({
          workLogs: state.workLogs.map((log) =>
            log.id === id ? { ...log, ...updates } : log
          ),
        }));
      },

      deleteWorkLog: (id) => {
        set((state) => ({
          workLogs: state.workLogs.filter((log) => log.id !== id),
        }));
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
    }),
    {
      name: 'worklog-storage',
      partialize: (state) => ({ workLogs: state.workLogs }),
    }
  )
);

// ==================== 辅助函数 ====================

/** 根据日期筛选 */
export const getWorkLogsByDate = (date: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.date === date);
};

/** 根据工人名称筛选 */
export const getWorkLogsByWorker = (worker: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.worker === worker);
};

/** 根据大棚筛选 */
export const getWorkLogsByGreenhouse = (greenhouse: string) => {
  return useWorkLogStore.getState().workLogs.filter((log) => log.greenhouse === greenhouse);
};
