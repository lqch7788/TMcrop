/**
 * 绩效考核 Zustand Store
 *
 * 架构：mock种子数据 + persist（无后端API）
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 考核维度权重：
 *   任务完成率 30% | 出勤率 20% | 工作质量 20% | 安全规范 15% | 协作态度 15%
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PerformanceRecord, PerformanceFilters } from '../components/labor/performance/types';

// ========== Mock 种子数据 ==========
// 从 src/components/labor/performance/types.ts 的 MOCK_PERFORMANCE_DATA 复制

const MOCK_PERFORMANCE_DATA: PerformanceRecord[] = [
  {
    id: '1', staffId: 'S001', staffName: '张伟民', department: '生产部',
    month: '2024-01', taskCompletionRate: 92, attendanceRate: 95,
    workQuality: 88, safetyCompliance: 96, teamworkAttitude: 90,
    totalScore: 92, rank: '1', status: '已评估',
  },
  {
    id: '2', staffId: 'S002', staffName: '李明轩', department: '技术部',
    month: '2024-01', taskCompletionRate: 88, attendanceRate: 92,
    workQuality: 94, safetyCompliance: 98, teamworkAttitude: 85,
    totalScore: 91, rank: '2', status: '已评估',
  },
  {
    id: '3', staffId: 'S003', staffName: '王建国', department: '生产部',
    month: '2024-01', taskCompletionRate: 85, attendanceRate: 88,
    workQuality: 82, safetyCompliance: 90, teamworkAttitude: 88,
    totalScore: 86, rank: '3', status: '已评估',
  },
  {
    id: '4', staffId: 'S004', staffName: '赵俊杰', department: '生产部',
    month: '2024-02', taskCompletionRate: 90, attendanceRate: 94,
    workQuality: 86, safetyCompliance: 92, teamworkAttitude: 87,
    totalScore: 90, rank: '1', status: '已评估',
  },
  {
    id: '5', staffId: 'S005', staffName: '钱文涛', department: '技术部',
    month: '2024-02', taskCompletionRate: 86, attendanceRate: 90,
    workQuality: 92, safetyCompliance: 95, teamworkAttitude: 83,
    totalScore: 89, rank: '2', status: '已评估',
  },
  {
    id: '6', staffId: 'S006', staffName: '孙晓峰', department: '后勤部',
    month: '2024-03', taskCompletionRate: 82, attendanceRate: 96,
    workQuality: 85, safetyCompliance: 94, teamworkAttitude: 90,
    totalScore: 88, rank: '1', status: '已评估',
  },
  {
    id: '7', staffId: 'S007', staffName: '周志远', department: '生产部',
    month: '2024-03', taskCompletionRate: 88, attendanceRate: 91,
    workQuality: 84, safetyCompliance: 88, teamworkAttitude: 85,
    totalScore: 87, rank: '2', status: '已评估',
  },
  {
    id: '8', staffId: 'S008', staffName: '吴美玲', department: '技术部',
    month: '2024-04', taskCompletionRate: 94, attendanceRate: 97,
    workQuality: 91, safetyCompliance: 96, teamworkAttitude: 92,
    totalScore: 94, rank: '1', status: '待评估',
  },
];

// ========== Store 类型 ==========

interface PerformanceState {
  /** 考核记录列表 */
  items: PerformanceRecord[];
  /** 筛选条件 */
  filters: PerformanceFilters;
  /** 加载状态 */
  isLoading: boolean;
  error: string | null;

  // 数据操作
  fetchItems: () => void;
  addItem: (item: Omit<PerformanceRecord, 'id'>) => void;
  updateItem: (id: string, updates: Partial<PerformanceRecord>) => void;
  deleteItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;
  setFilters: (filters: Partial<PerformanceFilters>) => void;
  resetFilters: () => void;
}

// ========== Store 实现 ==========

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      items: [],
      filters: { month: '', department: '', keyword: '' },
      isLoading: false,
      error: null,

      /** 初始化/刷新数据 */
      fetchItems: () => {
        const { items } = get();
        // 首次加载时写入种子数据
        if (items.length === 0) {
          set({ items: MOCK_PERFORMANCE_DATA });
          console.log('[PerformanceStore] 已初始化种子数据:', MOCK_PERFORMANCE_DATA.length, '条考核记录');
        }
      },

      /** 新增考核记录（自动生成ID） */
      addItem: (item) => {
        const newId = `PERF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newItem: PerformanceRecord = { ...item, id: newId };
        set((state) => ({ items: [...state.items, newItem] }));
      },

      /** 更新考核记录 */
      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      /** 删除单条考核记录 */
      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },

      /** 批量删除考核记录 */
      deleteItems: (ids) => {
        set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
      },

      /** 设置筛选条件 */
      setFilters: (newFilters) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
      },

      /** 重置筛选条件 */
      resetFilters: () => {
        set({ filters: { month: '', department: '', keyword: '' } });
      },
    }),
    {
      name: 'performance-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
