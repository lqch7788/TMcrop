/**
 * 人效分析类型定义
 */

export interface EfficiencyMetrics {
  id: string;
  date: string;  // 日期或月份
  department: string;
  // 核心指标
  totalWorkers: number;        // 总人数
  totalOutput: number;         // 总产出
  avgOutputPerWorker: number;  // 人均产出
  totalHours: number;          // 总工时
  avgEfficiency: number;       // 工时效率 (实际/标准)
  taskCompletionRate: number;  // 任务达成率
  attendanceRate: number;       // 出勤率
  laborCostRate: number;        // 人工成本率
  skillCoverage: number;        // 技能覆盖率
}

export interface EfficiencyTrend {
  month: string;
  output: number;
  efficiency: number;
  attendance: number;
}

export interface EfficiencyFilters {
  startDate: string;
  endDate: string;
  department: string;
}
