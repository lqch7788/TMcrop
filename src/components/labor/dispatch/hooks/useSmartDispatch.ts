import { useState, useMemo } from 'react';
import type { DispatchTask, WorkerMatch, DispatchRecommendation, DispatchFilters } from '../types';
import { DISPATCH_WEIGHTS } from '../types';
import { SkillTag } from '../../skill/types';

// Mock派工任务数据
const mockDispatchTasks: DispatchTask[] = [
  {
    id: 'DT001',
    taskCode: 'PG-20260401-001',
    taskName: 'A区番茄采收',
    taskType: '采收任务',
    priority: '高',
    requiredSkills: ['果蔬采收', '分级包装'],
    workZone: 'A区',
    estimatedHours: 4,
    dueDate: '2026-04-05',
    description: '需要完成A区3号大棚番茄采收工作',
  },
  {
    id: 'DT002',
    taskCode: 'PG-20260401-002',
    taskName: 'B区灌溉系统检修',
    taskType: '设备维护',
    priority: '紧急',
    requiredSkills: ['灌溉设备', '滴灌操作'],
    workZone: 'B区',
    estimatedHours: 2,
    dueDate: '2026-04-04',
    description: 'B区滴灌系统出现漏水，需要紧急检修',
  },
  {
    id: 'DT003',
    taskCode: 'PG-20260402-001',
    taskName: 'C区黄瓜分装',
    taskType: '采收任务',
    priority: '中',
    requiredSkills: ['分级包装', '冷链处理'],
    workZone: 'C区',
    estimatedHours: 3,
    dueDate: '2026-04-06',
    description: '采收的黄瓜需要进行分装和冷链预处理',
  },
];

// Mock员工数据
interface MockWorker {
  id: string;
  name: string;
  workerType: string;
  workZone: string;
  skills: SkillTag[];
  currentLoad: number;
  recentPerformance: number;
  distance: Record<string, number>;
}

const mockWorkers: MockWorker[] = [
  {
    id: 'W001',
    name: '萧峰',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['微喷灌溉', '滴灌操作', '水肥一体化', '果蔬采收', '分级包装'],
    currentLoad: 60,
    recentPerformance: 92,
    distance: { 'A区': 0.5, 'B区': 2, 'C区': 3.5, 'D区': 4 },
  },
  {
    id: 'W002',
    name: '虚竹',
    workerType: '季节工',
    workZone: 'C区',
    skills: ['果蔬采收', '分级包装', '冷链处理'],
    currentLoad: 40,
    recentPerformance: 88,
    distance: { 'A区': 3.5, 'B区': 4, 'C区': 0.3, 'D区': 1.5 },
  },
  {
    id: 'W003',
    name: '狄云',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['拖拉机', '旋耕机', '收割机', '灌溉设备'],
    currentLoad: 80,
    recentPerformance: 85,
    distance: { 'A区': 1, 'B区': 2.5, 'C区': 4, 'D区': 5 },
  },
  {
    id: 'W004',
    name: '石破天',
    workerType: '临时工',
    workZone: 'B区',
    skills: ['农药配制', '喷雾操作', '生物防治'],
    currentLoad: 30,
    recentPerformance: 90,
    distance: { 'A区': 2, 'B区': 0.5, 'C区': 4.5, 'D区': 5 },
  },
  {
    id: 'W005',
    name: '胡斐',
    workerType: '季节工',
    workZone: 'D区',
    skills: ['播种', '嫁接', '炼苗', '病害识别', '果蔬采收'],
    currentLoad: 50,
    recentPerformance: 87,
    distance: { 'A区': 4, 'B区': 5, 'C区': 1.5, 'D区': 0.5 },
  },
  {
    id: 'W006',
    name: '袁承志',
    workerType: '正式工',
    workZone: 'A区',
    skills: ['温室调控', '加温系统', '通风系统', '长势评估', '灌溉设备'],
    currentLoad: 70,
    recentPerformance: 93,
    distance: { 'A区': 0.8, 'B区': 1.5, 'C区': 3, 'D区': 4 },
  },
];

export function useSmartDispatch() {
  const [filters, setFilters] = useState<DispatchFilters>({});
  const [selectedTask, setSelectedTask] = useState<DispatchTask | null>(null);

  // 计算技能匹配度
  const calculateSkillMatch = (workerSkills: SkillTag[], requiredSkills: SkillTag[]): number => {
    if (requiredSkills.length === 0) return 100;
    const matched = requiredSkills.filter((skill) => workerSkills.includes(skill));
    return Math.round((matched.length / requiredSkills.length) * 100);
  };

  // 计算地理位置得分 (距离越近分数越高)
  const calculateLocationScore = (distance: number): number => {
    if (distance <= 1) return 100;
    if (distance <= 2) return 85;
    if (distance <= 3) return 70;
    if (distance <= 5) return 55;
    return 40;
  };

  // 计算负荷得分 (负荷越低分数越高)
  const calculateLoadScore = (load: number): number => {
    return Math.round(100 - load);
  };

  // 计算历史表现得分
  const calculatePerformanceScore = (performance: number): number => {
    return performance;
  };

  // 计算紧急程度得分 (根据任务优先级)
  const calculateUrgencyScore = (priority: DispatchTask['priority']): number => {
    switch (priority) {
      case '紧急': return 100;
      case '高': return 80;
      case '中': return 60;
      case '低': return 40;
      default: return 50;
    }
  };

  // 为任务生成推荐
  const generateRecommendations = (task: DispatchTask): WorkerMatch[] => {
    return mockWorkers
      .map((worker) => {
        const skillMatchRate = calculateSkillMatch(worker.skills, task.requiredSkills);
        const distance = worker.distance[task.workZone] || 5;
        const locationScore = calculateLocationScore(distance);
        const loadScore = calculateLoadScore(worker.currentLoad);
        const performanceScore = calculatePerformanceScore(worker.recentPerformance);
        const urgencyScore = calculateUrgencyScore(task.priority);

        // 综合得分 = 技能匹配度×0.30 + 地理位置×0.25 + 当前负荷×0.20 + 历史表现×0.15 + 紧急程度×0.10
        const matchScore = Math.round(
          skillMatchRate * DISPATCH_WEIGHTS.skillMatch +
          locationScore * DISPATCH_WEIGHTS.location +
          loadScore * DISPATCH_WEIGHTS.currentLoad +
          performanceScore * DISPATCH_WEIGHTS.historicalPerformance +
          urgencyScore * DISPATCH_WEIGHTS.urgency
        );

        // 生成推荐理由
        const reasons: string[] = [];
        if (skillMatchRate >= 80) {
          reasons.push(`技能匹配度${skillMatchRate}%`);
        }
        if (distance <= 2) {
          reasons.push(`距离近(${distance}km)`);
        }
        if (worker.currentLoad < 50) {
          reasons.push(`当前负荷低(${worker.currentLoad}%)`);
        }
        if (worker.recentPerformance >= 90) {
          reasons.push(`近期表现优秀(${worker.recentPerformance}分)`);
        }

        return {
          workerId: worker.id,
          workerName: worker.name,
          workerType: worker.workerType,
          currentWorkZone: worker.workZone,
          skills: worker.skills,
          currentLoad: worker.currentLoad,
          recentPerformance: worker.recentPerformance,
          distance,
          matchScore,
          skillMatchRate,
          locationScore,
          loadScore,
          performanceScore,
          urgencyScore,
          reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  // 获取当前任务的推荐
  const recommendations = useMemo<DispatchRecommendation | null>(() => {
    if (!selectedTask) return null;

    return {
      task: selectedTask,
      recommendations: generateRecommendations(selectedTask),
      generatedAt: new Date().toISOString(),
    };
  }, [selectedTask]);

  // 按条件过滤任务
  const filteredTasks = useMemo(() => {
    return mockDispatchTasks.filter((task) => {
      if (filters.workZone && task.workZone !== filters.workZone) {
        return false;
      }
      if (filters.taskType && task.taskType !== filters.taskType) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      return true;
    });
  }, [filters]);

  // 选择任务
  const selectTask = (task: DispatchTask) => {
    setSelectedTask(task);
  };

  // 更新筛选
  const updateFilters = (newFilters: Partial<DispatchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    tasks: filteredTasks,
    selectedTask,
    recommendations,
    filters,
    updateFilters,
    selectTask,
  };
}
