/**
 * 绩效考核数据类型定义
 */

// 绩效考核记录
export interface PerformanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  month: string;  // YYYY-MM
  taskCompletionRate: number;  // 任务完成率 0-100%
  attendanceRate: number;       // 出勤率 0-100%
  workQuality: number;          // 工作质量 0-100%
  safetyCompliance: number;     // 安全规范 0-100%
  teamworkAttitude: number;      // 协作态度 0-100%
  totalScore: number;           // 综合得分
  rank?: string;                // 排名
  status: '待评估' | '已评估';
}

// 考核维度配置
export interface PerformanceDimension {
  name: string;
  key: keyof Pick<PerformanceRecord, 'taskCompletionRate' | 'attendanceRate' | 'workQuality' | 'safetyCompliance' | 'teamworkAttitude'>;
  weight: number;  // 权重 0-100
  description: string;
}

// 考核维度配置列表
export const PERFORMANCE_DIMENSIONS: PerformanceDimension[] = [
  { name: '任务完成率', key: 'taskCompletionRate', weight: 30, description: '月度任务完成情况' },
  { name: '出勤率', key: 'attendanceRate', weight: 20, description: '考勤出勤情况' },
  { name: '工作质量', key: 'workQuality', weight: 20, description: '工作成果质量' },
  { name: '安全规范', key: 'safetyCompliance', weight: 15, description: '安全生产规范遵守' },
  { name: '协作态度', key: 'teamworkAttitude', weight: 15, description: '团队协作表现' },
];

// 筛选条件
export interface PerformanceFilters {
  month: string;      // YYYY-MM 或空
  department: string; // 部门或空
  keyword: string;    // 姓名关键词
}

// 部门选项
export const DEPT_OPTIONS = ['全部', '生产部', '技术部', '后勤部'];

// 月份选项（最近6个月）
export function getMonthOptions(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}
