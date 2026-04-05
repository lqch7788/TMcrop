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

// 模拟考核数据
export const MOCK_PERFORMANCE_DATA: PerformanceRecord[] = [
  {
    id: '1',
    staffId: 'S001',
    staffName: '张伟民',
    department: '生产部',
    month: '2024-01',
    taskCompletionRate: 92,
    attendanceRate: 95,
    workQuality: 88,
    safetyCompliance: 96,
    teamworkAttitude: 90,
    totalScore: 92,
    rank: '1',
    status: '已评估',
  },
  {
    id: '2',
    staffId: 'S002',
    staffName: '李明轩',
    department: '技术部',
    month: '2024-01',
    taskCompletionRate: 88,
    attendanceRate: 92,
    workQuality: 94,
    safetyCompliance: 98,
    teamworkAttitude: 85,
    totalScore: 91,
    rank: '2',
    status: '已评估',
  },
  {
    id: '3',
    staffId: 'S003',
    staffName: '王建国',
    department: '生产部',
    month: '2024-01',
    taskCompletionRate: 85,
    attendanceRate: 88,
    workQuality: 82,
    safetyCompliance: 90,
    teamworkAttitude: 88,
    totalScore: 86,
    rank: '3',
    status: '已评估',
  },
  {
    id: '4',
    staffId: 'S004',
    staffName: '赵俊杰',
    department: '生产部',
    month: '2024-02',
    taskCompletionRate: 90,
    attendanceRate: 94,
    workQuality: 86,
    safetyCompliance: 92,
    teamworkAttitude: 87,
    totalScore: 90,
    rank: '1',
    status: '已评估',
  },
  {
    id: '5',
    staffId: 'S005',
    staffName: '钱文涛',
    department: '技术部',
    month: '2024-02',
    taskCompletionRate: 86,
    attendanceRate: 90,
    workQuality: 92,
    safetyCompliance: 95,
    teamworkAttitude: 83,
    totalScore: 89,
    rank: '2',
    status: '已评估',
  },
  {
    id: '6',
    staffId: 'S006',
    staffName: '孙晓峰',
    department: '后勤部',
    month: '2024-03',
    taskCompletionRate: 82,
    attendanceRate: 96,
    workQuality: 85,
    safetyCompliance: 94,
    teamworkAttitude: 90,
    totalScore: 88,
    rank: '1',
    status: '已评估',
  },
  {
    id: '7',
    staffId: 'S007',
    staffName: '周志远',
    department: '生产部',
    month: '2024-03',
    taskCompletionRate: 88,
    attendanceRate: 91,
    workQuality: 84,
    safetyCompliance: 88,
    teamworkAttitude: 85,
    totalScore: 87,
    rank: '2',
    status: '已评估',
  },
  {
    id: '8',
    staffId: 'S008',
    staffName: '吴美玲',
    department: '技术部',
    month: '2024-04',
    taskCompletionRate: 94,
    attendanceRate: 97,
    workQuality: 91,
    safetyCompliance: 96,
    teamworkAttitude: 92,
    totalScore: 94,
    rank: '1',
    status: '待评估',
  },
];

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
