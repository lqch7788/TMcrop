/**
 * 统一任务管理 Hook
 * 管理农事任务的增删改查、状态流转、超时检测、催办等
 * 数据存储在 localStorage，实现刷新后数据不丢失
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from './useLocalStorage';
import { usePersistentWorkLogs } from './usePersistentWorkLogs';
import { usePersistentAttendance } from './usePersistentAttendance';
import {
  Task,
  TaskStatus,
  TaskAction,
  TaskRecord,
  TaskTimeout,
  ReworkRecord,
  ReminderRecord,
  DeadlineExtension,
  FeedbackRequirement,
} from '../types/task';
import {
  OVERTIME_CONFIG,
  DEADLINE_CONFIG,
  REMINDER_CONFIG,
  REWORK_CONFIG,
  TASK_PERMISSIONS,
  STATUS_TRANSITIONS,
  TASK_ACTION_CONFIG,
} from '../config/taskConfig';

// ============================================
// 状态标签配置
// ============================================
export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  accepted: { label: '已接受', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '返工中', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: '任务失败', color: 'text-purple-600', bg: 'bg-purple-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
  abandoned: { label: '已放弃', color: 'text-red-400', bg: 'bg-red-50' },
};

// ============================================
// 演示任务初始数据（覆盖所有状态）
// ============================================
const INITIAL_TASKS: Task[] = [
  // ========== 待接受 (pending) ==========
  {
    id: 'TASK_001',
    taskCode: 'NT20260416-001',
    title: '1号棚番茄施肥任务',
    type: 'fertilization',
    typeName: '施肥',
    status: 'pending',
    priority: 'normal',
    progress: 0,
    sourceType: 'dispatch',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-16',
    feedbackRequirements: [
      { type: 'gps', label: 'GPS位置', required: true },
      { type: 'image_before', label: '作业前照片', required: true },
      { type: 'image_after', label: '作业后照片', required: false },
    ],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-16T08:00:00Z',
    updatedAt: '2026-04-16T08:00:00Z',
  },
  {
    id: 'TASK_002',
    taskCode: 'NT20260416-002',
    title: '2号棚黄瓜灌溉任务',
    type: 'irrigation',
    typeName: '灌溉',
    status: 'pending',
    priority: 'high',
    progress: 0,
    sourceType: 'dispatch',
    assigneeId: 'W002',
    assigneeName: '李四',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-16',
    feedbackRequirements: [{ type: 'gps', label: 'GPS位置', required: true }],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-16T08:30:00Z',
    updatedAt: '2026-04-16T08:30:00Z',
  },
  // ========== 进行中 (in_progress) ==========
  {
    id: 'TASK_003',
    taskCode: 'NT20260415-003',
    title: '3号棚番茄修剪任务',
    type: 'pruning',
    typeName: '修剪',
    status: 'in_progress',
    priority: 'normal',
    progress: 60,
    sourceType: 'dispatch',
    assigneeId: 'W003',
    assigneeName: '王五',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-15',
    startTime: '2026-04-15T08:00:00Z',
    feedbackRequirements: [
      { type: 'image_before', label: '作业前照片', required: true },
      { type: 'image_after', label: '作业后照片', required: true },
    ],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-15T08:00:00Z',
    updatedAt: '2026-04-15T10:30:00Z',
  },
  {
    id: 'TASK_004',
    taskCode: 'NT20260414-004',
    title: '4号棚辣椒植保任务',
    type: 'plant_protection',
    typeName: '植保',
    status: 'in_progress',
    priority: 'urgent',
    progress: 80,
    sourceType: 'dispatch',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-14',
    startTime: '2026-04-14T07:30:00Z',
    feedbackRequirements: [
      { type: 'gps', label: 'GPS位置', required: true },
      { type: 'image_before', label: '作业前照片', required: true },
      { type: 'image_after', label: '作业后照片', required: true },
    ],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-14T07:00:00Z',
    updatedAt: '2026-04-14T14:00:00Z',
  },
  // ========== 待验收 (waiting_acceptance) ==========
  {
    id: 'TASK_005',
    taskCode: 'NT20260415-005',
    title: '5号棚茄子采摘任务',
    type: 'harvest',
    typeName: '采收',
    status: 'waiting_acceptance',
    priority: 'high',
    progress: 100,
    sourceType: 'dispatch',
    assigneeId: 'W002',
    assigneeName: '李四',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-15',
    feedbackRequirements: [
      { type: 'image_before', label: '作业前照片', required: true },
      { type: 'image_after', label: '作业后照片', required: true },
    ],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-15T09:00:00Z',
    updatedAt: '2026-04-15T16:00:00Z',
  },
  // ========== 已完成 (completed) ==========
  {
    id: 'TASK_006',
    taskCode: 'NT20260414-006',
    title: '6号棚生菜采收任务',
    type: 'harvest',
    typeName: '采收',
    status: 'completed',
    priority: 'normal',
    progress: 100,
    sourceType: 'dispatch',
    assigneeId: 'W003',
    assigneeName: '王五',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-14',
    startTime: '2026-04-14T08:00:00Z',
    endTime: '2026-04-14T17:00:00Z',
    completedAt: '2026-04-14T17:00:00Z',
    feedbackRequirements: [
      { type: 'image_before', label: '作业前照片', required: true },
      { type: 'image_after', label: '作业后照片', required: true },
    ],
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-14T08:00:00Z',
    updatedAt: '2026-04-14T17:00:00Z',
  },
  // ========== 返工中 (rejected) ==========
  {
    id: 'TASK_007',
    taskCode: 'NT20260413-007',
    title: '1号棚草莓浇水任务',
    type: 'irrigation',
    typeName: '浇水',
    status: 'rejected',
    priority: 'normal',
    progress: 40,
    sourceType: 'dispatch',
    assigneeId: 'W004',
    assigneeName: '赵六',
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: '2026-04-13',
    rejectReason: '浇水量不足，需重新作业',
    feedbackRequirements: [
      { type: 'gps', label: 'GPS位置', required: true },
      { type: 'image_after', label: '作业后照片', required: true },
    ],
    reworkCount: 1,
    reworkHistory: [
      {
        reworkCount: 1,
        reworkReason: '浇水量不足，需重新作业',
        reworkBy: '王主管',
        reworkAt: '2026-04-13T11:00:00Z',
        taskStatusBeforeRework: 'waiting_acceptance',
      },
    ],
    deadlineExtensions: [],
    version: 1,
    createdAt: '2026-04-13T08:00:00Z',
    updatedAt: '2026-04-13T11:00:00Z',
  },
];

// ============================================
// 生成任务编号
// ============================================
function generateTaskCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = String(Math.random()).slice(2, 5);
  return `NT${dateStr}-${random}`;
}

// ============================================
// 生成操作记录编号
// ============================================
function generateRecordCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = String(Math.random()).slice(2, 6);
  return `OP${dateStr}-${random}`;
}

// ============================================
// 超时检测
// ============================================
function detectOvertime(task: Task): TaskTimeout | undefined {
  const now = new Date();

  // 1. 接受超时检测（pending状态）
  if (task.status === 'pending') {
    const publishedAt = new Date(task.createdAt);
    const hoursDiff = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff >= OVERTIME_CONFIG.acceptCriticalHours) {
      return { type: 'accept', severity: 'critical', startedAt: task.createdAt, deadline: '' };
    }
    if (hoursDiff >= OVERTIME_CONFIG.acceptWarningHours) {
      return { type: 'accept', severity: 'warning', startedAt: task.createdAt, deadline: '' };
    }
  }

  // 2. 执行超时检测（in_progress状态）
  if (task.status === 'in_progress' && task.acceptedAt) {
    const deadline = new Date(task.acceptedAt);
    const estimatedHours = (task.estimatedDays || 1) * 24;
    deadline.setHours(deadline.getHours() + estimatedHours);
    if (now > deadline) {
      return { type: 'execution', severity: 'critical', startedAt: task.updatedAt, deadline: deadline.toISOString() };
    }
    // 预警：超过预计时间的80%
    const warningThreshold = estimatedHours * 0.8;
    const elapsedHours = (now.getTime() - new Date(task.acceptedAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours >= warningThreshold) {
      return { type: 'execution', severity: 'warning', startedAt: task.updatedAt, deadline: deadline.toISOString() };
    }
  }

  // 3. 验收超时检测（waiting_acceptance状态）
  if (task.status === 'waiting_acceptance') {
    const submittedAt = new Date(task.updatedAt);
    const hoursDiff = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff >= OVERTIME_CONFIG.acceptanceCriticalHours) {
      return { type: 'acceptance', severity: 'critical', startedAt: task.updatedAt, deadline: '' };
    }
    if (hoursDiff >= OVERTIME_CONFIG.acceptanceWarningHours) {
      return { type: 'acceptance', severity: 'warning', startedAt: task.updatedAt, deadline: '' };
    }
  }

  return undefined;
}

// ============================================
// 检查操作权限
// ============================================
function canPerformAction(
  action: keyof typeof TASK_PERMISSIONS,
  task: Task,
  userRole: string,
  userId: string
): boolean {
  const permission = TASK_PERMISSIONS[action];
  if (!permission) return false;

  // 检查角色
  if (!permission.roles.includes(userRole as 'admin' | 'assignee' | 'assigner')) {
    return false;
  }

  // 检查状态
  if (permission.statuses !== '*' && !permission.statuses.includes(task.status)) {
    return false;
  }

  // 特殊检查：assignee 必须是任务的执行人
  if (userRole === 'assignee' && task.assigneeId !== userId) {
    return false;
  }

  return true;
}

// ============================================
// Hook 返回类型
// ============================================
export interface UseTasksReturn {
  // 任务列表
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;

  // 操作记录列表
  taskRecords: TaskRecord[];

  // 催办记录列表
  reminderRecords: ReminderRecord[];

  // 超时检测
  detectOvertime: (task: Task) => TaskTimeout | undefined;

  // 获取任务
  getTask: (id: string) => Task | undefined;

  // 获取执行人的任务
  getTasksByAssignee: (assigneeId: string) => Task[];

  // 获取任务的操作记录
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];

  // 创建任务（草稿）
  createTask: (taskData: Partial<Task>) => Task;

  // 发布任务
  publishTask: (id: string) => void;

  // 撤回任务（仅pending状态）
  withdrawTask: (id: string, reason: string) => void;

  // 取消任务（accepted/in_progress状态）
  cancelTask: (id: string, reason: string) => void;

  // 接受任务
  acceptTask: (id: string) => void;

  // 提交进度
  submitProgress: (
    id: string,
    progress: number,
    options?: {
      workload?: number;
      unit?: string;
      area?: string;
      materials?: { name: string; qty: number; unit: string }[];
      remarks?: string;
      startTime?: string;
      endTime?: string;
      isFinal?: boolean;
    }
  ) => void;

  // 超时处理
  handleOvertime: (
    id: string,
    action: 'continue' | 'abandon',
    options?: { reason?: string; newDeadline?: string }
  ) => void;

  // 验收通过
  acceptCompletion: (id: string, comments?: string) => void;

  // 验收驳回（最多2次）
  rejectForRework: (id: string, reason: string) => void;

  // 继续执行（返工后）
  continueExecution: (id: string) => void;

  // 重新派发（failed/abandoned状态）
  reassignTask: (id: string, newAssigneeId: string, newAssigneeName: string) => void;

  // 催办
  sendReminder: (id: string, message?: string) => void;

  // 延期
  extendDeadline: (id: string, newDeadline: string, reason: string) => void;

  // 删除任务
  deleteTask: (id: string) => void;

  // 更新任务
  updateTask: (id: string, updates: Partial<Task>) => void;
}

// ============================================
// useTasks Hook
// ============================================
export function useTasks(): UseTasksReturn {
  // 从 localStorage 读取任务数据
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);

  // 操作记录
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);

  // 催办记录
  const [reminderRecords, setReminderRecords] = useState<ReminderRecord[]>([]);

  // 工单汇总同步hook
  const { syncWorkLogFromTask } = usePersistentWorkLogs();

  // 考勤记录hook
  const { attendance, addAttendance, updateAttendance } = usePersistentAttendance();

  // 从 localStorage 读取操作记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.TASKS}_records`);
      if (stored) {
        setTaskRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load task records:', e);
    }
  }, []);

  // 从 localStorage 读取催办记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.TASKS}_reminders`);
      if (stored) {
        setReminderRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load reminder records:', e);
    }
  }, []);

  // 保存操作记录到 localStorage
  const saveTaskRecords = useCallback((records: TaskRecord[]) => {
    setTaskRecords(records);
    localStorage.setItem(`${STORAGE_KEYS.TASKS}_records`, JSON.stringify(records));
  }, []);

  // 保存催办记录到 localStorage
  const saveReminderRecords = useCallback((records: ReminderRecord[]) => {
    setReminderRecords(records);
    localStorage.setItem(`${STORAGE_KEYS.TASKS}_reminders`, JSON.stringify(records));
  }, []);

  // 创建操作记录的辅助函数
  const createTaskRecord = useCallback(
    (
      task: Task,
      action: TaskAction,
      fromStatus?: TaskStatus,
      options?: {
        progress?: number;
        progressIncrement?: number;
        feedback?: TaskRecord['feedback'];
        comment?: string;
        reason?: string;
      }
    ): TaskRecord => {
      const now = new Date();
      const nowStr = now.toISOString().split('T')[0];
      return {
        id: `TR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        taskId: task.id,
        taskCode: task.taskCode,
        taskTitle: task.title,
        operatorId: task.assigneeId,
        operatorName: task.assigneeName,
        action,
        actionName: TASK_ACTION_CONFIG[action]?.label || action,
        fromStatus,
        toStatus: task.status,
        progress: options?.progress ?? task.progress,
        progressIncrement: options?.progressIncrement,
        feedback: options?.feedback,
        comment: options?.comment,
        reason: options?.reason,
        actionTime: now.toISOString(),
        createdAt: nowStr,
      };
    },
    []
  );

  // 创建任务（草稿）
  const createTask = useCallback((taskData: Partial<Task>): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `TASK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskCode: generateTaskCode(),
      title: taskData.title || '',
      type: taskData.type || '',
      typeName: taskData.typeName || '',
      status: 'draft',
      priority: taskData.priority || 'normal',
      progress: 0,
      sourceType: taskData.sourceType || 'dispatch',
      assigneeId: taskData.assigneeId || '',
      assigneeName: taskData.assigneeName || '',
      assignerId: taskData.assignerId || '',
      assignerName: taskData.assignerName || '',
      dueDate: taskData.dueDate,
      feedbackRequirements: taskData.feedbackRequirements || [],
      reworkCount: 0,
      reworkHistory: [],
      deadlineExtensions: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...taskData,
    };

    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, [setTasks]);

  // 发布任务
  const publishTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'draft') return task;

      const now = new Date().toISOString();
      const record = createTaskRecord({ ...task, status: 'pending' }, 'publish', 'draft');

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: 'pending',
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 撤回任务
  const withdrawTask = useCallback((id: string, reason: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'pending') return task;

      const now = new Date().toISOString();
      const record = createTaskRecord({ ...task, status: 'cancelled' }, 'withdraw', 'pending', { reason });

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: 'cancelled',
        cancelledReason: reason,
        cancelledAt: now,
        cancelledBy: task.assignerId,
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 取消任务
  const cancelTask = useCallback((id: string, reason: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      if (!['accepted', 'in_progress'].includes(task.status)) return task;

      const now = new Date().toISOString();
      const record = createTaskRecord({ ...task, status: 'cancelled' }, 'cancel', task.status, { reason });

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: 'cancelled',
        cancelledReason: reason,
        cancelledAt: now,
        cancelledBy: task.assignerId,
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 接受任务
  const acceptTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'pending') return task;

      const now = new Date();
      const nowStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);

      const record = createTaskRecord({ ...task, status: 'accepted' }, 'accept', 'pending');

      saveTaskRecords([record, ...taskRecords]);

      // 创建考勤记录
      addAttendance({
        workerId: task.assigneeId,
        name: task.assigneeName,
        dept: '生产部',
        date: nowStr,
        checkIn: timeStr,
        checkOut: '',
        hours: 0,
        status: '进行中',
        statusClass: 'info',
        taskId: task.id,
        batchId: task.batchId,
      });

      return {
        ...task,
        status: 'accepted',
        acceptedAt: now.toISOString(),
        startTime: nowStr,
        updatedAt: now.toISOString(),
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, addAttendance]);

  // 提交进度
  const submitProgress = useCallback((
    id: string,
    progress: number,
    options?: {
      workload?: number;
      unit?: string;
      area?: string;
      materials?: { name: string; qty: number; unit: string }[];
      remarks?: string;
      startTime?: string;
      endTime?: string;
      isFinal?: boolean;
    }
  ) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;

      const now = new Date();
      const nowStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);

      // 计算进度增量
      const progressIncrement = progress - task.progress;

      // 确定新状态
      let newStatus: TaskStatus = task.status;
      const action: TaskAction = options?.isFinal ? 'submit' : 'progress';

      if (options?.isFinal) {
        newStatus = 'waiting_acceptance';
      } else if (task.status === 'accepted') {
        newStatus = 'in_progress';
      }

      // 创建操作记录
      const record = createTaskRecord(
        { ...task, status: newStatus, progress },
        action,
        task.status,
        {
          progress,
          progressIncrement,
          feedback: options?.materials ? { materials: options.materials } : undefined,
          comment: options?.remarks,
        }
      );

      saveTaskRecords([record, ...taskRecords]);

      // 计算工作时长
      let workDuration = task.workDuration || 0;
      if (options?.startTime && options?.endTime) {
        const [sh, sm] = options.startTime.split(':').map(Number);
        const [eh, em] = options.endTime.split(':').map(Number);
        workDuration += (eh * 60 + em) - (sh * 60 + sm);
      }

      // 更新考勤记录
      if (options?.startTime && options?.endTime) {
        const [sh, sm] = options.startTime.split(':').map(Number);
        const [eh, em] = options.endTime.split(':').map(Number);
        const hoursWorked = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

        const attendanceRecord = attendance.find(a => a.taskId === task.id);
        if (attendanceRecord) {
          updateAttendance(attendanceRecord.id, {
            checkOut: options.endTime,
            hours: hoursWorked,
          });
        }
      }

      // 同步到每日工单汇总
      syncWorkLogFromTask(task, {
        progress,
        notes: options?.remarks,
        workload: options?.workload,
        unit: options?.unit,
        startTime: options?.startTime,
        endTime: options?.endTime,
      });

      return {
        ...task,
        progress,
        status: newStatus,
        startTime: task.startTime || options?.startTime,
        endTime: options?.endTime,
        workDuration,
        updatedAt: now.toISOString(),
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, attendance, updateAttendance, syncWorkLogFromTask]);

  // 超时处理
  const handleOvertime = useCallback((
    id: string,
    action: 'continue' | 'abandon',
    options?: { reason?: string; newDeadline?: string }
  ) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'in_progress') return task;

      const now = new Date().toISOString();
      const taskAction: TaskAction = action === 'continue' ? 'overtime_continue' : 'overtime_abandon';

      const record = createTaskRecord(
        {
          ...task,
          status: action === 'continue' ? 'in_progress' : 'abandoned',
        },
        taskAction,
        task.status,
        { reason: options?.reason }
      );

      saveTaskRecords([record, ...taskRecords]);

      if (action === 'continue') {
        // 继续执行：延期处理
        const extension: DeadlineExtension = {
          id: `EXT_${Date.now()}`,
          originalDeadline: task.dueDate || '',
          newDeadline: options?.newDeadline || '',
          reason: options?.reason || '',
          extendedBy: task.assigneeId,
          extendedAt: now,
        };

        return {
          ...task,
          status: 'in_progress',
          dueDate: options?.newDeadline || task.dueDate,
          deadlineExtensions: [...task.deadlineExtensions, extension],
          updatedAt: now,
          version: task.version + 1,
        };
      } else {
        // 放弃执行
        return {
          ...task,
          status: 'abandoned',
          abandonedReason: options?.reason,
          abandonedAt: now,
          updatedAt: now,
          version: task.version + 1,
        };
      }
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 验收通过
  const acceptCompletion = useCallback((id: string, comments?: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'waiting_acceptance') return task;

      const now = new Date().toISOString();

      const record = createTaskRecord(
        { ...task, status: 'completed' },
        'complete',
        'waiting_acceptance',
        { comment: comments }
      );

      saveTaskRecords([record, ...taskRecords]);

      // 更新考勤记录状态为已完成
      const attendanceRecord = attendance.find(a => a.taskId === task.id);
      if (attendanceRecord) {
        updateAttendance(attendanceRecord.id, {
          status: '已完成',
          statusClass: 'success',
        });
      }

      return {
        ...task,
        status: 'completed',
        completedAt: now,
        progress: 100,
        acceptanceRecord: {
          acceptedBy: task.assignerId,
          acceptedByName: task.assignerName,
          acceptedAt: now,
          comments,
        },
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, attendance, updateAttendance]);

  // 验收驳回
  const rejectForRework = useCallback((id: string, reason: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'waiting_acceptance') return task;

      const now = new Date().toISOString();
      const newReworkCount = task.reworkCount + 1;

      // 第2次驳回后变为 failed，需要重新派发
      const newStatus: TaskStatus = newReworkCount >= REWORK_CONFIG.maxReworkCount ? 'failed' : 'rejected';

      // 记录返工历史
      const reworkRecord: ReworkRecord = {
        reworkCount: newReworkCount,
        reworkReason: reason,
        reworkBy: task.assignerId,
        reworkAt: now,
        taskStatusBeforeRework: task.status,
      };

      const record = createTaskRecord(
        { ...task, status: newStatus, reworkCount: newReworkCount },
        'reject',
        'waiting_acceptance',
        { reason }
      );

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: newStatus,
        reworkCount: newReworkCount,
        reworkHistory: [...task.reworkHistory, reworkRecord],
        rejectReason: reason,
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 继续执行（返工后）
  const continueExecution = useCallback((id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id || task.status !== 'rejected') return task;

      const now = new Date().toISOString();

      const record = createTaskRecord(
        { ...task, status: 'in_progress' },
        'continue',
        'rejected'
      );

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: 'in_progress',
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 重新派发
  const reassignTask = useCallback((id: string, newAssigneeId: string, newAssigneeName: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      if (!['failed', 'abandoned'].includes(task.status)) return task;

      const now = new Date().toISOString();

      const record = createTaskRecord(
        { ...task, status: 'pending', assigneeId: newAssigneeId, assigneeName: newAssigneeName },
        'reassign',
        task.status
      );

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        status: 'pending',
        assigneeId: newAssigneeId,
        assigneeName: newAssigneeName,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 催办
  const sendReminder = useCallback((id: string, message?: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const now = new Date();
    const nowStr = now.toISOString();
    const today = nowStr.split('T')[0];

    // 检查催办限制
    const todayReminders = reminderRecords.filter(
      r => r.taskId === id && r.remindedAt.startsWith(today)
    );

    if (todayReminders.length >= REMINDER_CONFIG.maxRemindersPerDay) {
      console.warn('今日催办次数已达上限');
      return;
    }

    const lastReminder = reminderRecords.find(r => r.taskId === id);
    if (lastReminder) {
      const lastTime = new Date(lastReminder.remindedAt).getTime();
      const interval = now.getTime() - lastTime;
      if (interval < REMINDER_CONFIG.minIntervalMinutes * 60 * 1000) {
        console.warn('催办间隔需大于1小时');
        return;
      }
    }

    // 创建催办记录
    const reminder: ReminderRecord = {
      id: `REM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      taskCode: task.taskCode,
      remindedBy: task.assignerId,
      remindedByName: task.assignerName,
      remindedTo: task.assigneeId,
      remindedToName: task.assigneeName,
      remindType: 'manual',
      message,
      remindedAt: nowStr,
    };

    saveReminderRecords([reminder, ...reminderRecords]);

    // 同时创建任务操作记录
    const record = createTaskRecord(task, 'remind', undefined, { comment: message });
    saveTaskRecords([record, ...taskRecords]);
  }, [tasks, reminderRecords, saveReminderRecords, taskRecords, saveTaskRecords, createTaskRecord]);

  // 延期
  const extendDeadline = useCallback((id: string, newDeadline: string, reason: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;

      const now = new Date().toISOString();

      // 检查延期次数限制
      if (task.deadlineExtensions.length >= DEADLINE_CONFIG.maxExtensions) {
        console.warn('延期次数已达上限');
        return task;
      }

      const extension: DeadlineExtension = {
        id: `EXT_${Date.now()}`,
        originalDeadline: task.dueDate || '',
        newDeadline,
        reason,
        extendedBy: task.assigneeId,
        extendedAt: now,
      };

      const record = createTaskRecord(
        { ...task, dueDate: newDeadline },
        'extend_deadline',
        task.status,
        { comment: reason }
      );

      saveTaskRecords([record, ...taskRecords]);

      return {
        ...task,
        dueDate: newDeadline,
        deadlineExtensions: [...task.deadlineExtensions, extension],
        updatedAt: now,
        version: task.version + 1,
      };
    }));
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 删除任务
  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, [setTasks]);

  // 更新任务
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString(), version: task.version + 1 }
        : task
    ));
  }, [setTasks]);

  // 获取任务
  const getTask = useCallback((id: string) => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  // 获取执行人的任务
  const getTasksByAssignee = useCallback((assigneeId: string) => {
    return tasks.filter(task => task.assigneeId === assigneeId);
  }, [tasks]);

  // 获取任务的操作记录
  const getTaskRecordsByTaskId = useCallback((taskId: string) => {
    return taskRecords.filter(record => record.taskId === taskId);
  }, [taskRecords]);

  return {
    tasks,
    setTasks,
    taskRecords,
    reminderRecords,
    detectOvertime,
    getTask,
    getTasksByAssignee,
    getTaskRecordsByTaskId,
    createTask,
    publishTask,
    withdrawTask,
    cancelTask,
    acceptTask,
    submitProgress,
    handleOvertime,
    acceptCompletion,
    rejectForRework,
    continueExecution,
    reassignTask,
    sendReminder,
    extendDeadline,
    deleteTask,
    updateTask,
  };
}

// 导出类型
export type { Task, TaskStatus, TaskRecord, ReminderRecord };
