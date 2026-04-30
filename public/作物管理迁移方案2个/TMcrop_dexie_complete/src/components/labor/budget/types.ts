// 工资预算类型定义

/**
 * 预算输入参数
 */
export interface BudgetInput {
  // 种植批次计划
  batchCount: number;           // 种植批次数量
  expectedYield: number;        // 预期采收量(斤)
  laborCostRatio: number;       // 历史人工成本占比(%)
  // 季节性参数
  seasonFactor: number;          // 季节性波动系数(%)
  isPeakSeason: boolean;        // 是否旺季
  // 临时工参数
  tempWorkerRatio: number;      // 临时工比例(%)
  tempWorkerDailyRate: number;  // 临时工日均工资
  // 正式工参数
  formalWorkerCount: number;    // 正式工人数
  formalWorkerAvgSalary: number;// 正式工人均月工资
  // 福利保险
  socialSecurityRate: number;   // 社保公积金比例(%)
  benefitsRate: number;         // 福利补贴比例(%)
  // 超预算预警
  warningThreshold: number;     // 预警阈值(%)
}

/**
 * 预算输出结果
 */
export interface BudgetOutput {
  // 月度预算
  monthlyBudget: MonthlyBudget[];
  // 季度预算
  quarterlyBudget: QuarterlyBudget[];
  // 年度预算
  yearlyBudget: YearlyBudget;
  // 超预算预警
  warnings: BudgetWarning[];
  // 生成时间
  generatedAt: string;
}

/**
 * 月度预算
 */
export interface MonthlyBudget {
  month: string;               // YYYY-MM
  laborCost: number;          // 人工成本
  formalWorkerCost: number;   // 正式工成本
  tempWorkerCost: number;    // 临时工成本
  socialSecurity: number;     // 社保公积金
  benefits: number;          // 福利补贴
  headcount: number;         // 用工人数
  yieldPrediction: number;   // 预计采收量
  costPerUnit: number;       // 单位成本
}

/**
 * 季度预算
 */
export interface QuarterlyBudget {
  quarter: string;           // YYYY-Q1/2/3/4
  laborCost: number;
  formalWorkerCost: number;
  tempWorkerCost: number;
  socialSecurity: number;
  benefits: number;
  headcount: number;
  yieldPrediction: number;
  costPerUnit: number;
  monthCount: number;
}

/**
 * 年度预算
 */
export interface YearlyBudget {
  year: number;
  totalLaborCost: number;
  formalWorkerCost: number;
  tempWorkerCost: number;
  socialSecurity: number;
  benefits: number;
  avgHeadcount: number;
  totalYield: number;
  avgCostPerUnit: number;
  q1Cost: number;
  q2Cost: number;
  q3Cost: number;
  q4Cost: number;
}

/**
 * 预算预警
 */
export interface BudgetWarning {
  type: 'over_budget' | 'high_cost' | 'yield_low';
  level: 'info' | 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
}

/**
 * 预算历史记录
 */
export interface BudgetHistory {
  id: string;
  input: BudgetInput;
  output: BudgetOutput;
  createdAt: string;
  createdBy: string;
  version: string;
}
