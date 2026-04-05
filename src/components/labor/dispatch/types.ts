// 智能派工类型定义

import { SkillTag } from '../skill/types';

/**
 * 派工任务
 */
export interface DispatchTask {
  id: string;
  taskCode: string;
  taskName: string;
  taskType: string;
  priority: '紧急' | '高' | '中' | '低';
  requiredSkills: SkillTag[];
  workZone: string;
  estimatedHours: number;
  dueDate: string;
  description?: string;
}

/**
 * 员工匹配信息
 */
export interface WorkerMatch {
  workerId: string;
  workerName: string;
  workerType: string;
  currentWorkZone: string;
  skills: SkillTag[];
  currentLoad: number;        // 当前负荷 0-100%
  recentPerformance: number;  // 近30天表现评分 0-100
  distance: number;           // 距任务地点距离(km)
  matchScore: number;         // 综合匹配分数 0-100
  skillMatchRate: number;     // 技能匹配度 0-100%
  locationScore: number;      // 地理位置得分 0-100
  loadScore: number;          // 负荷得分 0-100
  performanceScore: number;   // 历史表现得分 0-100
  urgencyScore: number;       // 紧急程度得分 0-100
  reasons: string[];          // 推荐理由
}

/**
 * 派工建议
 */
export interface DispatchRecommendation {
  task: DispatchTask;
  recommendations: WorkerMatch[];
  generatedAt: string;
}

/**
 * 派工决策因素权重
 */
export const DISPATCH_WEIGHTS = {
  skillMatch: 0.30,    // 技能匹配度 30%
  location: 0.25,       // 地理位置 25%
  currentLoad: 0.20,    // 当前负荷 20%
  historicalPerformance: 0.15,  // 历史表现 15%
  urgency: 0.10,        // 紧急程度 10%
} as const;

/**
 * 派工筛选条件
 */
export interface DispatchFilters {
  workZone?: string;
  taskType?: string;
  priority?: DispatchTask['priority'];
}
