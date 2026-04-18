/**
 * 任务派发模块类型定义
 * 定义三种派发模式的统一类型
 */

/**
 * 派发模式（区分三个Tab）
 */
export type DispatchMode = 'farm' | 'tempTask' | 'smart';

/**
 * 任务编号前缀
 */
export const TASK_CODE_PREFIX = {
  farm: 'NS',      // 农事任务
  tempTask: 'LS',  // 临时任务
  smart: 'ZN',     // 智能派工
} as const;

/**
 * 派发模式配置
 */
export const DISPATCH_MODE_CONFIG: Record<DispatchMode, {
  label: string;
  description: string;
  icon: string;
}> = {
  farm: {
    label: '农事任务',
    description: '常规农事任务派发',
    icon: 'Truck',
  },
  tempTask: {
    label: '临时任务',
    description: '突发/紧急任务快速创建',
    icon: 'Clock',
  },
  smart: {
    label: '智能派工',
    description: 'AI辅助最优执行人匹配',
    icon: 'Sparkles',
  },
};

/**
 * 派发任务（用于创建新任务时的输入）
 */
export interface DispatchTaskInput {
  // 基本信息
  title: string;
  description?: string;

  // 派发模式
  dispatchMode: DispatchMode;

  // 执行人
  assigneeId: string;
  assigneeName: string;

  // 地点
  greenhouseId?: string;
  greenhouseName?: string;

  // 任务类型（农事任务用）
  taskType?: string;
  taskTypeName?: string;

  // 紧急程度
  priority?: 'urgent' | 'high' | 'normal' | 'low';

  // 预计时间
  estimatedDays?: number;
  estimatedHours?: number;

  // 截止时间
  dueDate?: string;

  // 所需技能（智能派工用）
  requiredSkills?: string[];

  // 物料
  materials?: { name: string; qty: number; unit: string }[];
}

/**
 * 推荐执行人结果
 */
export interface RecommendedExecutor {
  workerId: string;
  workerName: string;
  workerType: string;
  currentWorkZone: string;
  skills: string[];
  currentLoad: number;           // 当前负荷 0-100%
  recentPerformance: number;     // 近30天表现评分 0-100
  distance: number;             // 距任务地点距离(km)
  matchScore: number;            // 综合匹配分数 0-100
  skillMatchRate: number;        // 技能匹配度 0-100%
  locationScore: number;         // 地理位置得分 0-100
  loadScore: number;             // 负荷得分 0-100
  performanceScore: number;     // 历史表现得分 0-100
  urgencyScore: number;          // 紧急程度得分 0-100
  reasons: string[];             // 推荐理由
  selectedAt?: string;           // 选择时间
}

/**
 * 派工建议（用于智能派工Tab）
 */
export interface DispatchRecommendation {
  taskId: string;
  taskCode: string;
  taskName: string;
  recommendations: RecommendedExecutor[];
  generatedAt: string;
}

/**
 * 农事任务表格字段
 */
export interface FarmTaskTableRow {
  id: string;
  taskCode: string;
  title: string;
  greenhouseName: string;
  taskTypeName: string;
  assigneeName: string;
  assignerName: string;
  status: string;
  priority: string;
  createdAt: string;
}

/**
 * 临时任务表格字段
 */
export interface TempTaskTableRow {
  id: string;
  taskCode: string;
  title: string;
  priority: string;
  assigneeName: string;
  assignerName: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

/**
 * 智能派工表格字段
 */
export interface SmartTaskTableRow {
  id: string;
  taskCode: string;
  title: string;
  recommendedExecutorName: string;
  recommendScore: number;
  greenhouseName: string;
  assigneeName: string;
  status: string;
  createdAt: string;
}
