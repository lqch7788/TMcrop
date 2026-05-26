/**
 * 人效分析 Zustand Store
 *
 * 数据源：mock种子数据（无后端API）
 * 持久化：localStorage (efficiency-storage)
 * 数据流：Store → Hook → 组件（组件不直接读写localStorage）
 *
 * 计算逻辑（summaryMetrics, trendData）保留在Hook层
 */
import { create } from 'zustand';
// ========== 类型定义 ==========

export interface EfficiencyMetrics {
  id: string;
  date: string;
  department: string;
  totalWorkers: number;
  totalOutput: number;
  avgOutputPerWorker: number;
  totalHours: number;
  avgEfficiency: number;
  taskCompletionRate: number;
  attendanceRate: number;
  laborCostRate: number;
  skillCoverage: number;
}

// ========== 种子数据（从原useEfficiency.ts提取）==========

// 生产部12条月度汇总数据
const PRODUCTION_DEPT_DATA: EfficiencyMetrics[] = [
  { id: '1', date: '2023-05', department: '生产部', totalWorkers: 45, totalOutput: 8920, avgOutputPerWorker: 198.2, totalHours: 3520, avgEfficiency: 0.92, taskCompletionRate: 0.88, attendanceRate: 0.95, laborCostRate: 0.32, skillCoverage: 0.78 },
  { id: '2', date: '2023-06', department: '生产部', totalWorkers: 48, totalOutput: 9450, avgOutputPerWorker: 196.9, totalHours: 3680, avgEfficiency: 0.94, taskCompletionRate: 0.91, attendanceRate: 0.96, laborCostRate: 0.31, skillCoverage: 0.80 },
  { id: '3', date: '2023-07', department: '生产部', totalWorkers: 50, totalOutput: 10200, avgOutputPerWorker: 204.0, totalHours: 3850, avgEfficiency: 0.96, taskCompletionRate: 0.93, attendanceRate: 0.97, laborCostRate: 0.30, skillCoverage: 0.82 },
  { id: '4', date: '2023-08', department: '生产部', totalWorkers: 47, totalOutput: 9780, avgOutputPerWorker: 208.1, totalHours: 3620, avgEfficiency: 0.95, taskCompletionRate: 0.92, attendanceRate: 0.94, laborCostRate: 0.31, skillCoverage: 0.81 },
  { id: '5', date: '2023-09', department: '生产部', totalWorkers: 52, totalOutput: 10920, avgOutputPerWorker: 210.0, totalHours: 4010, avgEfficiency: 0.98, taskCompletionRate: 0.95, attendanceRate: 0.98, laborCostRate: 0.29, skillCoverage: 0.85 },
  { id: '6', date: '2023-10', department: '生产部', totalWorkers: 55, totalOutput: 12100, avgOutputPerWorker: 220.0, totalHours: 4250, avgEfficiency: 1.02, taskCompletionRate: 0.97, attendanceRate: 0.97, laborCostRate: 0.28, skillCoverage: 0.87 },
  { id: '7', date: '2023-11', department: '生产部', totalWorkers: 53, totalOutput: 11860, avgOutputPerWorker: 223.8, totalHours: 4080, avgEfficiency: 1.00, taskCompletionRate: 0.96, attendanceRate: 0.96, laborCostRate: 0.29, skillCoverage: 0.86 },
  { id: '8', date: '2023-12', department: '生产部', totalWorkers: 50, totalOutput: 11500, avgOutputPerWorker: 230.0, totalHours: 3850, avgEfficiency: 0.99, taskCompletionRate: 0.94, attendanceRate: 0.95, laborCostRate: 0.30, skillCoverage: 0.85 },
  { id: '9', date: '2024-01', department: '生产部', totalWorkers: 48, totalOutput: 10800, avgOutputPerWorker: 225.0, totalHours: 3690, avgEfficiency: 0.97, taskCompletionRate: 0.93, attendanceRate: 0.93, laborCostRate: 0.31, skillCoverage: 0.84 },
  { id: '10', date: '2024-02', department: '生产部', totalWorkers: 46, totalOutput: 10220, avgOutputPerWorker: 222.2, totalHours: 3540, avgEfficiency: 0.95, taskCompletionRate: 0.91, attendanceRate: 0.94, laborCostRate: 0.32, skillCoverage: 0.83 },
  { id: '11', date: '2024-03', department: '生产部', totalWorkers: 52, totalOutput: 11960, avgOutputPerWorker: 230.0, totalHours: 4010, avgEfficiency: 1.01, taskCompletionRate: 0.96, attendanceRate: 0.97, laborCostRate: 0.29, skillCoverage: 0.87 },
  { id: '12', date: '2024-04', department: '生产部', totalWorkers: 54, totalOutput: 12680, avgOutputPerWorker: 234.8, totalHours: 4160, avgEfficiency: 1.03, taskCompletionRate: 0.98, attendanceRate: 0.98, laborCostRate: 0.28, skillCoverage: 0.89 },
];

// 技术部12条月度汇总数据
const TECH_DEPT_DATA: EfficiencyMetrics[] = [
  { id: '13', date: '2023-05', department: '技术部', totalWorkers: 20, totalOutput: 4200, avgOutputPerWorker: 210.0, totalHours: 1560, avgEfficiency: 0.90, taskCompletionRate: 0.85, attendanceRate: 0.96, laborCostRate: 0.35, skillCoverage: 0.90 },
  { id: '14', date: '2023-06', department: '技术部', totalWorkers: 22, totalOutput: 4560, avgOutputPerWorker: 207.3, totalHours: 1680, avgEfficiency: 0.92, taskCompletionRate: 0.88, attendanceRate: 0.97, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '15', date: '2023-07', department: '技术部', totalWorkers: 24, totalOutput: 5040, avgOutputPerWorker: 210.0, totalHours: 1820, avgEfficiency: 0.94, taskCompletionRate: 0.90, attendanceRate: 0.98, laborCostRate: 0.33, skillCoverage: 0.92 },
  { id: '16', date: '2023-08', department: '技术部', totalWorkers: 23, totalOutput: 4870, avgOutputPerWorker: 211.7, totalHours: 1750, avgEfficiency: 0.93, taskCompletionRate: 0.89, attendanceRate: 0.96, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '17', date: '2023-09', department: '技术部', totalWorkers: 25, totalOutput: 5400, avgOutputPerWorker: 216.0, totalHours: 1910, avgEfficiency: 0.96, taskCompletionRate: 0.92, attendanceRate: 0.98, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '18', date: '2023-10', department: '技术部', totalWorkers: 26, totalOutput: 5720, avgOutputPerWorker: 220.0, totalHours: 1980, avgEfficiency: 0.98, taskCompletionRate: 0.94, attendanceRate: 0.97, laborCostRate: 0.31, skillCoverage: 0.94 },
  { id: '19', date: '2023-11', department: '技术部', totalWorkers: 25, totalOutput: 5600, avgOutputPerWorker: 224.0, totalHours: 1910, avgEfficiency: 0.97, taskCompletionRate: 0.93, attendanceRate: 0.96, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '20', date: '2023-12', department: '技术部', totalWorkers: 24, totalOutput: 5400, avgOutputPerWorker: 225.0, totalHours: 1840, avgEfficiency: 0.96, taskCompletionRate: 0.91, attendanceRate: 0.95, laborCostRate: 0.33, skillCoverage: 0.92 },
  { id: '21', date: '2024-01', department: '技术部', totalWorkers: 23, totalOutput: 5100, avgOutputPerWorker: 221.7, totalHours: 1760, avgEfficiency: 0.94, taskCompletionRate: 0.89, attendanceRate: 0.94, laborCostRate: 0.34, skillCoverage: 0.91 },
  { id: '22', date: '2024-02', department: '技术部', totalWorkers: 22, totalOutput: 4900, avgOutputPerWorker: 222.7, totalHours: 1690, avgEfficiency: 0.93, taskCompletionRate: 0.88, attendanceRate: 0.95, laborCostRate: 0.34, skillCoverage: 0.90 },
  { id: '23', date: '2024-03', department: '技术部', totalWorkers: 24, totalOutput: 5400, avgOutputPerWorker: 225.0, totalHours: 1840, avgEfficiency: 0.97, taskCompletionRate: 0.92, attendanceRate: 0.97, laborCostRate: 0.32, skillCoverage: 0.93 },
  { id: '24', date: '2024-04', department: '技术部', totalWorkers: 25, totalOutput: 5750, avgOutputPerWorker: 230.0, totalHours: 1920, avgEfficiency: 0.99, taskCompletionRate: 0.95, attendanceRate: 0.98, laborCostRate: 0.31, skillCoverage: 0.95 },
];

const ALL_SEED_DATA: EfficiencyMetrics[] = [...PRODUCTION_DEPT_DATA, ...TECH_DEPT_DATA];

// ========== Store ==========

interface EfficiencyState {
  data: EfficiencyMetrics[];
  isLoading: boolean;
  error: string | null;

  /** 初始化种子数据（如果存储为空） */
  initSeedData: () => void;

  /** CRUD操作 */
  addItem: (item: EfficiencyMetrics) => void;
  updateItem: (id: string, updates: Partial<EfficiencyMetrics>) => void;
  deleteItem: (id: string) => void;
}

export const useEfficiencyStore = create<EfficiencyState>()(
  (set, get)=> ({
      data: [],
      isLoading: false,
      error: null,

      initSeedData: () => {
        const current = get().data;
        if (current.length === 0) {
          set({ data: ALL_SEED_DATA });
        }
      },

      addItem: (item) => {
        set((state) => ({ data: [...state.data, item] }));
      },

      updateItem: (id, updates) => {
        set((state) => ({
          data: state.data.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({ data: state.data.filter((d) => d.id !== id) }));
      },
    })
);
