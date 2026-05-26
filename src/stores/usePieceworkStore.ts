/**
 * 计件工资 Zustand Store
 *
 * 架构：纯本地 mock 种子数据 + localStorage 持久化
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 后端无独立 piecework API，使用 mock 种子数据
 */

import { create } from 'zustand';
// ========== 类型定义（与 piecework/types.ts 保持一致）==========

export type PieceRateStatus = '待确认' | '已确认' | '已发放';

export interface PieceRate {
  id: string;
  workerId: string;
  workerName: string;
  taskId: string;
  taskName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  workDate: string;
  status: PieceRateStatus;
  creatorId: string;
  creatorName: string;
  createTime: string;
  remarks?: string;
}

// ========== 种子数据 ==========

function generateSeedData(): PieceRate[] {
  return [
    {
      id: 'PR001', workerId: 'W001', workerName: '萧峰', taskId: 'T001', taskName: '番茄采收',
      unit: '斤', quantity: 500, unitPrice: 0.5, total: 250, workDate: '2026-04-01',
      status: '已发放', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-01 18:00:00',
    },
    {
      id: 'PR002', workerId: 'W002', workerName: '虚竹', taskId: 'T001', taskName: '番茄采收',
      unit: '斤', quantity: 480, unitPrice: 0.5, total: 240, workDate: '2026-04-01',
      status: '已发放', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-01 18:00:00',
    },
    {
      id: 'PR003', workerId: 'W001', workerName: '萧峰', taskId: 'T002', taskName: '黄瓜分装',
      unit: '箱', quantity: 120, unitPrice: 2, total: 240, workDate: '2026-04-02',
      status: '已确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-02 18:00:00',
    },
    {
      id: 'PR004', workerId: 'W003', workerName: '狄云', taskId: 'T003', taskName: '辣椒采收',
      unit: '斤', quantity: 350, unitPrice: 0.6, total: 210, workDate: '2026-04-02',
      status: '待确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-02 18:00:00',
    },
    {
      id: 'PR005', workerId: 'W004', workerName: '石破天', taskId: 'T002', taskName: '黄瓜分装',
      unit: '箱', quantity: 100, unitPrice: 2, total: 200, workDate: '2026-04-03',
      status: '待确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-03 18:00:00',
    },
    {
      id: 'PR006', workerId: 'W005', workerName: '胡斐', taskId: 'T004', taskName: '茄子打包',
      unit: '箱', quantity: 80, unitPrice: 2.5, total: 200, workDate: '2026-04-03',
      status: '已确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-03 18:00:00',
    },
    {
      id: 'PR007', workerId: 'W002', workerName: '虚竹', taskId: 'T005', taskName: '番茄包装',
      unit: '箱', quantity: 90, unitPrice: 3, total: 270, workDate: '2026-04-04',
      status: '待确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-04 18:00:00',
    },
    {
      id: 'PR008', workerId: 'W006', workerName: '袁承志', taskId: 'T001', taskName: '番茄采收',
      unit: '斤', quantity: 420, unitPrice: 0.5, total: 210, workDate: '2026-04-04',
      status: '已确认', creatorId: 'admin', creatorName: '管理员', createTime: '2026-04-04 18:00:00',
    },
  ];
}

// ========== Store 类型 ==========

interface PieceworkState {
  records: PieceRate[];
  isLoading: boolean;
  error: string | null;

  fetchRecords: () => Promise<void>;
  addRecord: (data: Omit<PieceRate, 'id' | 'total' | 'createTime'>) => void;
  updateRecord: (id: string, updates: Partial<PieceRate>) => void;
  updateRecordStatus: (id: string, status: PieceRateStatus) => void;
  deleteRecord: (id: string) => void;

  _initSeedData: () => void;
}

// ========== Store 实现 ==========

export const usePieceworkStore = create<PieceworkState>()(
  (set, get)=> ({
      records: [],
      isLoading: false,
      error: null,

      fetchRecords: async () => {
        set({ isLoading: true, error: null });
        try {
          const current = get().records;
          if (current.length === 0) {
            get()._initSeedData();
          }
          set({ isLoading: false });
        } catch (error) {
          console.warn('[PieceworkStore] 获取计件工资数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addRecord: (data) => {
        const newRecord: PieceRate = {
          ...data,
          id: `PR${String(Date.now()).slice(-6)}`,
          total: data.quantity * data.unitPrice,
          createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
        set((state) => ({ records: [newRecord, ...state.records] }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      updateRecordStatus: (id, status) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      _initSeedData: () => {
        const seed = generateSeedData();
        set({ records: seed, isLoading: false });
        // 种子数据初始化完成
      },
    })
);
