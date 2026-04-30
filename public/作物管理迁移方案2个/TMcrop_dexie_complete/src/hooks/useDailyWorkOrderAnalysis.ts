/**
 * 每日工单汇总与分析 Hook
 * 实现智能派工系统阶段二：每日工单汇总与分析功能
 * 提供任务进度分析、人员负荷分析、AI建议等功能
 */

import { useMemo, useCallback } from 'react';
import { useTasks, Task } from './useTasks';
import { useTempTasks, TempTask } from './useTempTasks';
import { usePersistentAttendance } from './usePersistentAttendance';

// ============================================
// 类型定义
// ============================================

/** 任务进度分析 */
export interface TaskProgressAnalysis {
  taskId: string;
  taskName: string;
  plannedDate: string;
  actualCompletionDate?: string;
  progressStatus: 'on_track' | 'ahead' | 'delayed' | 'cancelled';
  delayDays?: number;
  delayReason?: string;
  originalAssignee?: string;
  actualAssignee?: string;
}

/** 人员负荷分析 */
export interface WorkerLoadAnalysis {
  workerId: string;
  workerName: string;
  todayTasks: number;
  completedTasks: number;
  completionRate: number;
  loadStatus: 'normal' | 'busy' | 'overloaded';
  availability: 'available' | 'busy';
}

/** 每日工单汇总报告 */
export interface DailyWorkOrderReport {
  date: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  aheadTasks: TaskProgressAnalysis[];
  onTrackTasks: TaskProgressAnalysis[];
  delayedTasks: TaskProgressAnalysis[];
  unfinishedTasks: TaskProgressAnalysis[];
  workerLoadAnalysis: WorkerLoadAnalysis[];
  aiRecommendations: string[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 判断任务是否超期
 */
function isTaskOverdue(task: Task | TempTask, targetDate: string): boolean {
  if ('status' in task) {
    // 已完成、已取消、已放弃的任务不算超期
    if (['completed', 'cancelled', 'abandoned', 'failed'].includes(task.status)) {
      return false;
    }
  } else {
    // TempTask
    if (['completed', 'cancelled'].includes(task.status)) {
      return false;
    }
  }

  if (!task.dueDate) return false;

  const dueDate = new Date(task.dueDate);
  const target = new Date(targetDate);
  dueDate.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return dueDate < target;
}

/**
 * 计算超期天数
 */
function calculateOverdueDays(dueDate: string, targetDate: string): number {
  const due = new Date(dueDate);
  const target = new Date(targetDate);
  due.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * 判断是否提前完成
 */
function isCompletedAhead(task: Task | TempTask, targetDate: string): boolean {
  const completedAt = 'completedAt' in task ? task.completedAt : (task as TempTask).completedAt;
  if (!completedAt) return false;

  const completionDate = new Date(completedAt);
  const target = new Date(targetDate);
  completionDate.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return completionDate < target;
}

/**
 * 判断是否按时完成
 */
function isCompletedOnTime(task: Task | TempTask, targetDate: string): boolean {
  const completedAt = 'completedAt' in task ? task.completedAt : (task as TempTask).completedAt;
  if (!completedAt) return false;

  const completionDate = new Date(completedAt);
  const target = new Date(targetDate);
  completionDate.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return completionDate.getTime() === target.getTime();
}

/**
 * 获取任务名称
 */
function getTaskName(task: Task | TempTask): string {
  return 'title' in task ? task.title : task.title;
}

/**
 * 获取执行人名称
 */
function getAssigneeName(task: Task | TempTask): string {
  return 'assigneeName' in task ? task.assigneeName : task.assigneeName;
}

// ============================================
// Hook 定义
// ============================================

/**
 * 每日工单汇总与分析 Hook
 */
export function useDailyWorkOrderAnalysis() {
  // 获取农事任务数据
  const { tasks } = useTasks();

  // 获取临时任务数据
  const { tempTasks } = useTempTasks();

  // 获取考勤数据
  const { attendance } = usePersistentAttendance();

  /**
   * 分析提前完成的任务
   */
  const analyzeAheadTasks = useCallback((targetDate: string): TaskProgressAnalysis[] => {
    const aheadTasks: TaskProgressAnalysis[] = [];

    // 分析农事任务
    tasks.forEach(task => {
      if (task.status === 'completed' && isCompletedAhead(task, targetDate)) {
        aheadTasks.push({
          taskId: task.id,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          actualCompletionDate: task.completedAt,
          progressStatus: 'ahead',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    // 分析临时任务
    tempTasks.forEach(task => {
      if (task.status === 'completed' && isCompletedAhead(task, targetDate)) {
        aheadTasks.push({
          taskId: task.taskCode,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          actualCompletionDate: task.completedAt,
          progressStatus: 'ahead',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    return aheadTasks;
  }, [tasks, tempTasks]);

  /**
   * 分析推迟完成的任务
   */
  const analyzeDelayedTasks = useCallback((targetDate: string): TaskProgressAnalysis[] => {
    const delayedTasks: TaskProgressAnalysis[] = [];

    // 分析农事任务（超期未完成的任务视为推迟）
    tasks.forEach(task => {
      if (task.status !== 'completed' && isTaskOverdue(task, targetDate)) {
        const delayDays = task.dueDate
          ? calculateOverdueDays(task.dueDate, targetDate)
          : 0;

        delayedTasks.push({
          taskId: task.id,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: 'delayed',
          delayDays,
          delayReason: `超期${delayDays}天`,
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    // 分析临时任务（超期未完成的任务视为推迟）
    tempTasks.forEach(task => {
      if (task.status !== 'completed' && isTaskOverdue(task, targetDate)) {
        const delayDays = task.dueDate
          ? calculateOverdueDays(task.dueDate, targetDate)
          : 0;

        delayedTasks.push({
          taskId: task.taskCode,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: 'delayed',
          delayDays,
          delayReason: `超期${delayDays}天`,
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    return delayedTasks;
  }, [tasks, tempTasks]);

  /**
   * 分析未完成的任务（已超期但未完成）
   */
  const analyzeUnfinishedTasks = useCallback((targetDate: string): TaskProgressAnalysis[] => {
    const unfinishedTasks: TaskProgressAnalysis[] = [];

    // 分析农事任务
    tasks.forEach(task => {
      // 未完成且已超期的任务
      if (task.status !== 'completed' && isTaskOverdue(task, targetDate)) {
        const delayDays = task.dueDate
          ? calculateOverdueDays(task.dueDate, targetDate)
          : 0;

        unfinishedTasks.push({
          taskId: task.id,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: task.status === 'cancelled' ? 'cancelled' : 'delayed',
          delayDays,
          delayReason: delayDays > 0 ? `已超期${delayDays}天未完成` : '截止日期已到未完成',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    // 分析临时任务
    tempTasks.forEach(task => {
      // 未完成且已超期的任务
      if (task.status !== 'completed' && isTaskOverdue(task, targetDate)) {
        const delayDays = task.dueDate
          ? calculateOverdueDays(task.dueDate, targetDate)
          : 0;

        unfinishedTasks.push({
          taskId: task.taskCode,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: task.status === 'cancelled' ? 'cancelled' : 'delayed',
          delayDays,
          delayReason: delayDays > 0 ? `已超期${delayDays}天未完成` : '截止日期已到未完成',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    return unfinishedTasks;
  }, [tasks, tempTasks]);

  /**
   * 分析按时进度的任务
   */
  const analyzeOnTrackTasks = useCallback((targetDate: string): TaskProgressAnalysis[] => {
    const onTrackTasks: TaskProgressAnalysis[] = [];

    // 分析农事任务
    tasks.forEach(task => {
      // 已完成且按时完成的任务
      if (task.status === 'completed' && isCompletedOnTime(task, targetDate)) {
        onTrackTasks.push({
          taskId: task.id,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          actualCompletionDate: task.completedAt,
          progressStatus: 'on_track',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
      // 进行中但未超期的任务
      else if (['pending', 'accepted', 'in_progress'].includes(task.status) && !isTaskOverdue(task, targetDate)) {
        onTrackTasks.push({
          taskId: task.id,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: 'on_track',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    // 分析临时任务
    tempTasks.forEach(task => {
      // 已完成且按时完成的任务
      if (task.status === 'completed' && isCompletedOnTime(task, targetDate)) {
        onTrackTasks.push({
          taskId: task.taskCode,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          actualCompletionDate: task.completedAt,
          progressStatus: 'on_track',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
      // 进行中但未超期的任务
      else if (['pending', 'in_progress'].includes(task.status) && !isTaskOverdue(task, targetDate)) {
        onTrackTasks.push({
          taskId: task.taskCode,
          taskName: task.title,
          plannedDate: task.dueDate || '',
          progressStatus: 'on_track',
          originalAssignee: task.assigneeName,
          actualAssignee: task.assigneeName,
        });
      }
    });

    return onTrackTasks;
  }, [tasks, tempTasks]);

  /**
   * 分析人员负荷
   */
  const analyzeWorkerLoad = useCallback((targetDate: string): WorkerLoadAnalysis[] => {
    // 获取目标日期的唯一执行人列表
    const workerMap = new Map<string, WorkerLoadAnalysis>();

    // 统计农事任务
    tasks.forEach(task => {
      if (!task.assigneeName) return;

      if (!workerMap.has(task.assigneeName)) {
        workerMap.set(task.assigneeName, {
          workerId: task.assigneeId || task.assigneeName,
          workerName: task.assigneeName,
          todayTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          loadStatus: 'normal',
          availability: 'available',
        });
      }

      const analysis = workerMap.get(task.assigneeName)!;
      analysis.todayTasks++;

      if (task.status === 'completed') {
        analysis.completedTasks++;
      }
    });

    // 统计临时任务
    tempTasks.forEach(task => {
      if (!task.assigneeName) return;

      if (!workerMap.has(task.assigneeName)) {
        workerMap.set(task.assigneeName, {
          workerId: task.assigneeId || task.assigneeName,
          workerName: task.assigneeName,
          todayTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          loadStatus: 'normal',
          availability: 'available',
        });
      }

      const analysis = workerMap.get(task.assigneeName)!;
      analysis.todayTasks++;

      if (task.status === 'completed') {
        analysis.completedTasks++;
      }
    });

    // 计算完成率和负荷状态
    const workerLoads = Array.from(workerMap.values()).map(analysis => {
      const completionRate = analysis.todayTasks > 0
        ? Math.round((analysis.completedTasks / analysis.todayTasks) * 100)
        : 0;

      // 根据完成率和工作量判断负荷状态
      let loadStatus: WorkerLoadAnalysis['loadStatus'] = 'normal';
      if (analysis.todayTasks >= 5) {
        loadStatus = completionRate < 60 ? 'overloaded' : 'busy';
      } else if (analysis.todayTasks >= 3) {
        loadStatus = completionRate < 70 ? 'busy' : 'normal';
      }

      // 根据完成进度判断可用性
      const availability: WorkerLoadAnalysis['availability'] =
        analysis.completedTasks < analysis.todayTasks ? 'busy' : 'available';

      return {
        ...analysis,
        completionRate,
        loadStatus,
        availability,
      };
    });

    return workerLoads;
  }, [tasks, tempTasks]);

  /**
   * 生成AI建议
   */
  const generateAIRecommendations = useCallback((
    aheadTasks: TaskProgressAnalysis[],
    delayedTasks: TaskProgressAnalysis[],
    unfinishedTasks: TaskProgressAnalysis[],
    workerLoadAnalysis: WorkerLoadAnalysis[]
  ): string[] => {
    const recommendations: string[] = [];

    // 1. 基于超期任务的建议
    if (delayedTasks.length > 0) {
      recommendations.push(`【紧急】当前有 ${delayedTasks.length} 个任务已超期，建议优先处理超期任务，可考虑增加执行人员或调整任务分配。`);

      // 找出超期最严重的任务
      const mostDelayed = delayedTasks.reduce((max, task) =>
        (task.delayDays || 0) > (max.delayDays || 0) ? task : max
      );
      if (mostDelayed.delayDays && mostDelayed.delayDays > 3) {
        recommendations.push(`【重点关注】任务"${mostDelayed.taskName}"已超期${mostDelayed.delayDays}天，建议主管介入协调资源。`);
      }
    }

    // 2. 基于未完成任务的建议
    if (unfinishedTasks.length > 0) {
      recommendations.push(`【提醒】有 ${unfinishedTasks.length} 个任务截止日期已到但尚未完成，建议及时跟进处理。`);
    }

    // 3. 基于人员负荷的建议
    const overloadedWorkers = workerLoadAnalysis.filter(w => w.loadStatus === 'overloaded');
    if (overloadedWorkers.length > 0) {
      const names = overloadedWorkers.map(w => w.workerName).join('、');
      recommendations.push(`【人员调整】${names} 等人当前任务过重，建议将部分任务重新分配给其他人员。`);
    }

    const busyWorkers = workerLoadAnalysis.filter(w => w.loadStatus === 'busy');
    if (busyWorkers.length > 0) {
      recommendations.push(`【注意】${busyWorkers.length} 名员工当前工作负荷较高，建议关注任务进度。`);
    }

    // 4. 基于提前完成的建议
    if (aheadTasks.length > 0) {
      recommendations.push(`【表扬】有 ${aheadTasks.length} 个任务提前完成，表现优异，可作为标杆鼓励团队。`);

      // 找出可以学习的优秀员工
      const aheadWorkers = aheadTasks.map(t => t.actualAssignee).filter(Boolean);
      const uniqueWorkers = [...new Set(aheadWorkers)];
      if (uniqueWorkers.length > 0) {
        recommendations.push(`【经验推广】${uniqueWorkers.join('、')} 等员工任务执行效率高，建议总结其工作方法推广。`);
      }
    }

    // 5. 资源调配建议
    const availableWorkers = workerLoadAnalysis.filter(w => w.availability === 'available');
    if (delayedTasks.length > 0 && availableWorkers.length > 0) {
      const availableNames = availableWorkers.map(w => w.workerName).join('、');
      recommendations.push(`【资源调配】${availableNames} 等人当前可用，建议将部分超期任务分配给他们加快进度。`);
    }

    // 6. 预防性建议
    if (delayedTasks.length === 0 && unfinishedTasks.length === 0 && workerLoadAnalysis.length > 0) {
      recommendations.push(`【正常】今日任务执行情况良好，所有任务进度正常，无特殊建议。`);
    }

    return recommendations;
  }, []);

  /**
   * 生成每日工单汇总报告
   */
  const generateDailyReport = useCallback((targetDate: string): DailyWorkOrderReport => {
    // 分析各类任务
    const aheadTasks = analyzeAheadTasks(targetDate);
    const delayedTasks = analyzeDelayedTasks(targetDate);
    const unfinishedTasks = analyzeUnfinishedTasks(targetDate);
    const onTrackTasks = analyzeOnTrackTasks(targetDate);
    const workerLoad = analyzeWorkerLoad(targetDate);

    // 统计任务数量
    const totalTasks = tasks.length + tempTasks.length;
    const pendingTasks = [
      ...tasks.filter(t => t.status === 'pending'),
      ...tempTasks.filter(t => t.status === 'pending'),
    ].length;
    const inProgressTasks = [
      ...tasks.filter(t => ['accepted', 'in_progress'].includes(t.status)),
      ...tempTasks.filter(t => ['in_progress'].includes(t.status)),
    ].length;
    const completedTasks = [
      ...tasks.filter(t => t.status === 'completed'),
      ...tempTasks.filter(t => t.status === 'completed'),
    ].length;

    // 计算超期任务数（去重）
    const overdueTaskIds = new Set([
      ...delayedTasks.map(t => t.taskId),
      ...unfinishedTasks.map(t => t.taskId),
    ]);
    const overdueTasks = overdueTaskIds.size;

    // 生成AI建议
    const aiRecommendations = generateAIRecommendations(
      aheadTasks,
      delayedTasks,
      unfinishedTasks,
      workerLoad
    );

    return {
      date: targetDate,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      aheadTasks,
      onTrackTasks,
      delayedTasks,
      unfinishedTasks,
      workerLoadAnalysis: workerLoad,
      aiRecommendations,
    };
  }, [
    tasks,
    tempTasks,
    analyzeAheadTasks,
    analyzeDelayedTasks,
    analyzeUnfinishedTasks,
    analyzeOnTrackTasks,
    analyzeWorkerLoad,
    generateAIRecommendations,
  ]);

  return {
    // 生成每日工单汇总报告
    generateDailyReport,

    // 分析提前完成任务
    analyzeAheadTasks,

    // 分析推迟完成任务
    analyzeDelayedTasks,

    // 分析未完成任务
    analyzeUnfinishedTasks,

    // 分析按时进度任务
    analyzeOnTrackTasks,

    // 分析人员负荷
    analyzeWorkerLoad,

    // 生成AI建议
    generateAIRecommendations,
  };
}

// 导出类型
export type {
  TaskProgressAnalysis,
  WorkerLoadAnalysis,
  DailyWorkOrderReport,
};
