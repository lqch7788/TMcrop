/**
 * 月度报表 Zustand Store
 *
 * 数据源：mock种子数据（无后端API）
 * 持久化：localStorage (monthly-report-storage)
 * 数据流：Store → Hook → 组件（组件不直接读写localStorage）
 *
 * 导出等业务逻辑保留在Hook层
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== 类型定义 ==========

export interface MonthlyReport {
  id: number;
  code: string;
  month: string;
  dept: string;
  totalWorkdays: number;
  totalWorkhours: number;
  avgDailyWorkers: number;
  completedTasks: number;
  pendingTasks: number;
  totalHarvest: string;
  qualityRate: string;
  laborCost: string;
  materialCost: string;
  issuesCount: number;
  resolvedIssues: number;
  attendanceRate: string;
  publisher: string;
  publishDate: string;
  status: string;
  statusClass: 'normal' | 'draft';
}

// ========== 种子数据（从原useMonthlyReport.ts提取）==========

const SEED_DATA: MonthlyReport[] = [
  { id: 1, code: 'MR202403', month: '2024年3月', dept: '生产部', totalWorkdays: 624, totalWorkhours: 4992, avgDailyWorkers: 20, completedTasks: 156, pendingTasks: 12, totalHarvest: '45.8吨', qualityRate: '97.5%', laborCost: '8.5万元', materialCost: '6.2万元', issuesCount: 5, resolvedIssues: 4, attendanceRate: '98.2%', publisher: '张建华', publishDate: '2024-04-01', status: '已发布', statusClass: 'normal' },
  { id: 2, code: 'MR202402', month: '2024年2月', dept: '生产部', totalWorkdays: 560, totalWorkhours: 4480, avgDailyWorkers: 20, completedTasks: 142, pendingTasks: 8, totalHarvest: '38.2吨', qualityRate: '96.8%', laborCost: '7.8万元', materialCost: '5.8万元', issuesCount: 3, resolvedIssues: 3, attendanceRate: '97.5%', publisher: '张建华', publishDate: '2024-03-01', status: '已发布', statusClass: 'normal' },
  { id: 3, code: 'MR202401', month: '2024年1月', dept: '生产部', totalWorkdays: 620, totalWorkhours: 4960, avgDailyWorkers: 20, completedTasks: 138, pendingTasks: 15, totalHarvest: '32.5吨', qualityRate: '95.5%', laborCost: '8.2万元', materialCost: '5.2万元', issuesCount: 8, resolvedIssues: 6, attendanceRate: '96.8%', publisher: '张建华', publishDate: '2024-02-01', status: '已发布', statusClass: 'normal' },
  { id: 4, code: 'MR202312', month: '2023年12月', dept: '生产部', totalWorkdays: 600, totalWorkhours: 4800, avgDailyWorkers: 20, completedTasks: 125, pendingTasks: 5, totalHarvest: '28.6吨', qualityRate: '96.2%', laborCost: '7.5万元', materialCost: '4.8万元', issuesCount: 4, resolvedIssues: 4, attendanceRate: '97.8%', publisher: '张建华', publishDate: '2024-01-01', status: '已发布', statusClass: 'normal' },
  { id: 5, code: 'MR202311', month: '2023年11月', dept: '生产部', totalWorkdays: 580, totalWorkhours: 4640, avgDailyWorkers: 19, completedTasks: 118, pendingTasks: 10, totalHarvest: '25.3吨', qualityRate: '95.8%', laborCost: '7.2万元', materialCost: '4.5万元', issuesCount: 6, resolvedIssues: 5, attendanceRate: '96.5%', publisher: '张建华', publishDate: '2023-12-01', status: '已发布', statusClass: 'normal' },
  { id: 6, code: 'MR202310', month: '2023年10月', dept: '生产部', totalWorkdays: 620, totalWorkhours: 4960, avgDailyWorkers: 20, completedTasks: 145, pendingTasks: 8, totalHarvest: '42.1吨', qualityRate: '97.2%', laborCost: '8.0万元', materialCost: '6.0万元', issuesCount: 3, resolvedIssues: 3, attendanceRate: '98.5%', publisher: '张建华', publishDate: '2023-11-01', status: '已发布', statusClass: 'normal' },
  { id: 7, code: 'MR202309', month: '2023年9月', dept: '生产部', totalWorkdays: 596, totalWorkhours: 4768, avgDailyWorkers: 20, completedTasks: 132, pendingTasks: 6, totalHarvest: '35.8吨', qualityRate: '96.5%', laborCost: '7.6万元', materialCost: '5.4万元', issuesCount: 5, resolvedIssues: 4, attendanceRate: '97.2%', publisher: '张建华', publishDate: '2023-10-01', status: '已发布', statusClass: 'normal' },
  { id: 8, code: 'MR202404', month: '2024年4月', dept: '生产部', totalWorkdays: 240, totalWorkhours: 1920, avgDailyWorkers: 20, completedTasks: 68, pendingTasks: 45, totalHarvest: '18.5吨', qualityRate: '97.8%', laborCost: '3.2万元', materialCost: '2.8万元', issuesCount: 2, resolvedIssues: 1, attendanceRate: '98.6%', publisher: '张建华', publishDate: '2024-05-01', status: '草稿', statusClass: 'draft' },
];

// ========== Store ==========

interface MonthlyReportState {
  reports: MonthlyReport[];
  isLoading: boolean;
  error: string | null;

  /** 初始化种子数据（如果存储为空） */
  initSeedData: () => void;

  /** CRUD操作 */
  addReport: (report: MonthlyReport) => void;
  updateReport: (id: number, updates: Partial<MonthlyReport>) => void;
  deleteReport: (id: number) => void;
}

export const useMonthlyReportStore = create<MonthlyReportState>()(
  persist(
    (set, get) => ({
      reports: [],
      isLoading: false,
      error: null,

      initSeedData: () => {
        const current = get().reports;
        if (current.length === 0) {
          set({ reports: SEED_DATA });
        }
      },

      addReport: (report) => {
        set((state) => ({ reports: [...state.reports, report] }));
      },

      updateReport: (id, updates) => {
        set((state) => ({
          reports: state.reports.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
      },

      deleteReport: (id) => {
        set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }));
      },
    }),
    {
      name: 'monthly-report-storage',
      partialize: (state) => ({ reports: state.reports }),
    }
  )
);
