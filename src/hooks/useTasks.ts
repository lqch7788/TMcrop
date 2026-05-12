/**
 * 统一任务管理 Hook
 * 管理农事任务的增删改查、状态流转、超时检测、催办等
 * 数据存储在 localStorage，实现刷新后数据不丢失
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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

// 导入原始任务数据（保留原有数据）
import { taskDispatchTasks, TaskDispatchTask } from '../data/farmMockData';

// 导入育苗服务（用于任务验收后回传更新育苗状态）
import { updateSeedling } from '../services/apiSeedlingService';
import { SeedlingStatus } from '../types/crop';
// 导入临时任务数据和巡查反馈处理任务数据
import { tempTasks as mockTempTasks, inspectionFeedbackTasks as mockInspectionFeedbackTasks, InspectionFeedbackTaskData } from '../data/mockData';
import { TempTask } from '../hooks/useTempTasks';
// 导入农事任务 Store（统一数据层）
import { useFarmTaskStore } from '../stores/farmTaskStore';
// 导入增强版 API 客户端
import { enhancedApiClient } from '../lib/apiClient';

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
// 原始任务数据转换函数
// 将 taskDispatchTasks 转换为 Task 格式
// ============================================
function convertToTask(t: TaskDispatchTask): Task {
  // 获取第一个任务类型作为主类型
  const primaryType = t.types[0] || 'other';
  const typeNameMap: Record<string, string> = {
    fertilization: '施肥',
    irrigation: '灌溉',
    pruning: '修剪',
    harvest: '采收',
    plant_protection: '植保',
    pesticide: '植保',
    weeding: '除草',
    other: '其他',
  };

  return {
    id: t.id,
    taskCode: t.id,
    title: `${t.field}${t.crop}${typeNameMap[primaryType] || '任务'}`,
    type: primaryType,
    typeName: t.typeLabel || typeNameMap[primaryType] || '其他',
    status: t.status as TaskStatus,
    priority: t.priority as 'urgent' | 'high' | 'normal',
    progress: t.progress,
    sourceType: 'dispatch',
    dispatchMode: 'farm', // 标记为农事任务
    assigneeId: `W${t.assignee.charCodeAt(0)}`,
    assigneeName: t.assignee,
    assignerId: 'M001',
    assignerName: '王主管',
    dueDate: t.planEnd?.split(' ')[0] || '',
    startTime: t.progress > 0 ? t.planStart : undefined,
    // 兼容旧界面字段
    greenhouseId: t.field,
    greenhouseName: t.field,
    cropName: t.crop,
    types: t.types,
    field: t.field,
    assignee: t.assignee,
    crop: t.crop,
    planStart: t.planStart,
    planEnd: t.planEnd,
    estimatedDays: t.estimatedDays,
    estimatedHours: t.estimatedHours,
    // 转换必填反馈
    feedbackRequirements: (t.requiredFeedback || []).map((f: string) => {
      const feedbackMap: Record<string, { type: 'gps' | 'image_before' | 'image_after' | 'text'; label: string; required: boolean }> = {
        gps: { type: 'gps', label: 'GPS位置', required: true },
        photo_before: { type: 'image_before', label: '作业前照片', required: true },
        photo_after: { type: 'image_after', label: '作业后照片', required: true },
        material: { type: 'materials', label: '物料使用', required: true },
      };
      return feedbackMap[f] || { type: 'text', label: f, required: false };
    }),
    // 其他字段
    materials: t.materials,
    tools: t.tools,
    sopContent: t.sopContent,
    typeConfig: t.typeConfig,
    sourceProblemId: t.sourceProblemId,
    // sourceInspectionId 可能存在于 TaskDispatchTask 但不在 Task 类型中
    sourceInspectionId: (t as unknown as { sourceInspectionId?: string }).sourceInspectionId,
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    // 从任务 ID 解析日期：格式如 NS20260417-001，取中间的日期部分
    createdAt: t.id && t.id.length >= 10
      ? `2026-${t.id.substring(5, 7)}-${t.id.substring(7, 9)}T08:00:00Z`
      : new Date().toISOString(),
    updatedAt: t.id && t.id.length >= 10
      ? `2026-${t.id.substring(5, 7)}-${t.id.substring(7, 9)}T08:00:00Z`
      : new Date().toISOString(),
  };
}

// ============================================
// 巡查反馈处理任务转换函数
// 将 InspectionFeedbackTask 转换为 Task 格式
// ============================================
function convertInspectionFeedbackTaskToTask(t: InspectionFeedbackTaskData): Task {
  const catMap: Record<string, string> = { environment: '环境', pest: '病虫害', equipment: '设备', infrastructure: '基础设施', other: '其他' };
  const chineseCats = (t.issueCategories || []).map(c => catMap[c] || c);
  return {
    id: t.id,
    taskCode: t.recordCode,
    title: `${t.greenhouseName || '园区'} 巡查反馈`,
    type: 'other',
    typeName: '巡查反馈处理',
    status: t.status as TaskStatus,
    priority: t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'normal' : 'normal',
    progress: PROGRESS_MAP[t.status] || 0,
    sourceType: 'dispatch',
    dispatchMode: 'inspection',
    assigneeId: 'U013',
    assigneeName: t.assigneeName,
    assignerId: t.inspectorId,
    assignerName: t.inspectorName,
    dueDate: t.checkDate,
    startTime: undefined,
    greenhouseId: t.greenhouseId,
    greenhouseName: t.greenhouseName,
    cropName: t.cropName,
    types: chineseCats,
    field: t.greenhouseName,
    assignee: t.assignee,
    crop: t.cropName,
    planStart: t.checkDate + ' ' + t.checkTime,
    planEnd: t.checkDate + ' 17:00',
    estimatedDays: 1,
    estimatedHours: 8,
    feedbackRequirements: t.requiredFeedback.map((f: string) => {
      const feedbackMap: Record<string, { type: 'gps' | 'image_before' | 'image_after' | 'text'; label: string; required: boolean }> = {
        gps: { type: 'gps', label: 'GPS位置', required: true },
        photo_before: { type: 'image_before', label: '作业前照片', required: true },
        photo_after: { type: 'image_after', label: '作业后照片', required: true },
      };
      return feedbackMap[f] || { type: 'text', label: f, required: false };
    }),
    materials: t.materials,
    tools: t.tools,
    sopContent: t.sopContent,
    typeConfig: {},
    sourceProblemId: t.problemId,
    sourceInspectionId: t.inspectionId,
    // 巡查编号（来自巡查记录）
    sourceId: t.inspectionId,
    recordCode: t.recordCode,
    inspectionType: t.inspectionType,
    submitterId: t.submitterId || t.inspectorId,
    submitterName: t.submitterName || t.inspectorName,
    location: t.location || t.greenhouseName || '园区',
    checkDate: t.checkDate,
    checkTime: t.checkTime,
    checkResult: t.checkResult || (t.issueSeverity === '严重' ? '严重' : t.issueSeverity === '中等' ? '异常' : '轻微'),
    issueCategories: chineseCats,
    issueSeverity: t.issueSeverity,
    issueText: t.issueText,
    photos: t.photos || [],
    feedbackStatus: t.feedbackStatus || (t.status === 'pending' ? '待接受' : t.status === 'in_progress' ? '处理中' : t.status === 'rejected' ? '已返工' : t.status === 'waiting_acceptance' ? '待验收' : t.status === 'completed' ? '已完成' : '未知'),
    feedbackUsers: t.feedbackUsers || [t.assigneeName],
    processProgress: t.processProgress || (PROGRESS_MAP[t.status] ? String(PROGRESS_MAP[t.status]) : '0'),
    inspectorId: t.inspectorId,
    inspectorName: t.inspectorName,
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: t.checkDate + 'T' + t.checkTime + 'Z',
    updatedAt: t.checkDate + 'T' + t.checkTime + 'Z',
  };
}

const PROGRESS_MAP: Record<string, number> = {
  pending: 0,
  accepted: 0,
  in_progress: 50,
  waiting_acceptance: 100,
  completed: 100,
  rejected: 0,
};

// ============================================
// 演示任务初始数据（来自原始 taskDispatchTasks）
// ============================================
const INITIAL_TASKS: Task[] = taskDispatchTasks.map(convertToTask);

// ============================================
// 临时任务转换函数
// 将 mockTempTasks 转换为 Task 格式
// ============================================
function convertTempTaskToTask(t: TempTask): Task {
  const progress = t.actualHours
    ? Math.min(100, Math.round((t.actualHours / t.estimatedHours) * 100))
    : 0;

  // 将 TempTaskStatus 映射为 TaskStatus
  // pending_reassign 映射为 rejected（等待重新派发的任务相当于被驳回）
  const statusMap: Record<string, TaskStatus> = {
    draft: 'draft',
    pending: 'pending',
    in_progress: 'in_progress',
    waiting_acceptance: 'waiting_acceptance',
    completed: 'completed',
    rejected: 'rejected',
    pending_reassign: 'rejected',
  };
  const taskStatus = statusMap[t.status] || 'pending';

  return {
    id: t.taskCode,
    taskCode: t.taskCode,
    title: t.title,
    type: t.type,
    typeName: t.typeName,
    status: taskStatus,
    priority: t.priority === 'urgent' ? 'urgent' : t.priority === 'high' ? 'high' : 'normal',
    progress,
    sourceType: 'tempTask',
    dispatchMode: 'tempTask',
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    assignerId: t.assignerId,
    assignerName: t.assignerName,
    dueDate: t.dueDate,
    feedbackRequirements: t.requiredFeedback || [],
    greenhouseId: t.greenhouseId || '',
    greenhouseName: t.workLocation || t.location || '',
    cropName: '',
    field: t.workLocation || t.location || t.greenhouseName || '',
    reworkCount: t.rejectCount,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    acceptedAt: t.acceptedAt,
    completedAt: t.status === 'completed' ? new Date().toISOString() : undefined,
    // 临时任务特有字段
    workLocation: t.workLocation || t.location || t.greenhouseName || '',
    urgency: t.urgency || 'normal',
    tempTaskType: t.tempTaskType || t.type || '',
    estimatedDays: t.estimatedDays || 0,
    estimatedHours: t.estimatedHours || 0,
    workerCount: t.workerCount || 1,
    remarks: t.remarks || '',
    requiredFeedback: t.requiredFeedback || [],
    // 开始时间
    startDate: t.startDate || '',
  };
}

// ============================================
// 合并初始任务数据（农事任务 + 临时任务 + 巡查反馈处理任务）
// ============================================
const INITIAL_TASKS_WITH_TEMP: Task[] = [
  ...INITIAL_TASKS,
  ...mockTempTasks.map(convertTempTaskToTask),
  ...mockInspectionFeedbackTasks.map(convertInspectionFeedbackTaskToTask),
];

// 数据版本控制（用于检测数据结构变化，自动重置数据）
const DATA_VERSION = 10; // 强制刷新，清除旧缓存
const STORAGE_VERSION_KEY = 'yuanxingtu_tasks_version';

// ============================================
// 生成任务编号 NS+年月日+3位流水号
// ============================================
function generateTaskCode(existingTasks: Task[]): string {
  const date = new Date();
  const datePrefix = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');

  // 查找当天的最大流水号
  let maxSequence = 0;
  existingTasks.forEach(t => {
    // 匹配格式：NS20260417-xxx
    if (t.taskCode && t.taskCode.startsWith('NS' + datePrefix + '-')) {
      const seqStr = t.taskCode.slice(-3);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  // 下一个序号
  const nextSequence = maxSequence + 1;
  return `NS${datePrefix}-${String(nextSequence).padStart(3, '0')}`;
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
  const roleAllowed = (permission.roles as readonly string[]).includes(userRole);
  if (!roleAllowed) {
    return false;
  }

  // 检查状态
  const statuses = permission.statuses as unknown;
  if (typeof statuses === 'string') {
    // 如果是 '*'，表示所有状态都允许
    if (statuses !== '*') return false;
  } else if (!(statuses as readonly string[]).includes(task.status)) {
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
  createTask: (taskData: Partial<Task>, dispatchMode?: 'farm' | 'tempTask' | 'smart') => Task;

  // 发布任务
  publishTask: (id: string) => void;

  // 撤回任务（仅pending状态）
  withdrawTask: (id: string, reason: string) => void;

  // 取消任务（accepted/in_progress状态）
  cancelTask: (id: string, reason: string) => void;

  // 接受任务
  acceptTask: (id: string) => void;

  // 选择执行人并直接接受（用于待派工任务）
  acceptAndAssign: (id: string, assigneeId: string, assigneeName: string) => void;

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

  // 更新任务状态（通用状态更新）
  updateTaskStatus: (id: string, status: TaskStatus) => void;

  // 更新任务进度
  updateTaskProgress: (id: string, progress: number, options?: {
    remarks?: string;
    workload?: number;
    isFinal?: boolean;
  }) => void;
}

// ============================================
// useTasks Hook
// ============================================
export function useTasks(): UseTasksReturn {
  // 从 localStorage 读取任务数据（包含农事任务和临时任务）
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS_WITH_TEMP);
  // 标记是否已从API加载过数据
  const [apiLoaded, setApiLoaded] = useState(false);

  // 版本检测：如果存储的版本低于当前版本，合并数据而不是覆盖
  useEffect(() => {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (!storedVersion || parseInt(storedVersion, 10) < DATA_VERSION) {
      // 版本不匹配，读取当前任务并与初始数据合并
      // 这样可以保留问题分派等用户创建的任务
      try {
        const existingData = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (existingData) {
          const parsed = JSON.parse(existingData);
          const existingTasks = parsed.data || parsed; // 兼容新旧格式
          // 过滤出用户创建的任务（非初始数据中的任务）
          const initialIds = INITIAL_TASKS_WITH_TEMP.map(t => t.id);
          const userCreatedTasks = Array.isArray(existingTasks)
            ? existingTasks.filter((t: Task) => !initialIds.includes(t.id))
            : [];
          // 合并初始数据和用户创建的任务
          const mergedTasks = [...INITIAL_TASKS_WITH_TEMP, ...userCreatedTasks];
          setTasks(mergedTasks);
          console.log(`[useTasks] 合并任务数据：初始${INITIAL_TASKS_WITH_TEMP.length}个 + 用户创建${userCreatedTasks.length}个 = ${mergedTasks.length}个`);
          // 调试：检查用户创建的任务是否有 requiredFeedback
          if (userCreatedTasks.length > 0) {
            console.log('[useTasks] 用户创建任务示例:', JSON.stringify(userCreatedTasks[0], null, 2));
          }
        } else {
          setTasks(INITIAL_TASKS_WITH_TEMP);
        }
      } catch (e) {
        console.warn('[useTasks] 读取任务数据失败，使用初始数据', e);
        setTasks(INITIAL_TASKS_WITH_TEMP);
      }
      localStorage.setItem(STORAGE_VERSION_KEY, String(DATA_VERSION));
    }
  }, [setTasks]);

  // 尝试从API加载任务数据
  // 注意：此函数只在初始化时调用一次，后续任务更新通过 createTask/updateTask 等函数处理
  useEffect(() => {
    let cancelled = false;

    const loadFromAPI = async () => {
      try {
        const apiTasks = await enhancedApiClient.get<Task[]>('/farm-tasks', {
          useCache: false,
        });

        if (cancelled) return;

        console.log('[useTasks] API返回:', Array.isArray(apiTasks) ? `${apiTasks.length}条` : '非数组');

        if (Array.isArray(apiTasks) && apiTasks.length > 0) {
          console.log('[useTasks] 从API获取到任务数据:', apiTasks.length, '条');
          setTasks(apiTasks);
          setApiLoaded(true);
        } else {
          console.log('[useTasks] API返回空，使用种子数据');
          setTasks(INITIAL_TASKS_WITH_TEMP);
          setApiLoaded(true);
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('[useTasks] API调用失败:', error);
        // API失败时使用种子数据
        setTasks(INITIAL_TASKS_WITH_TEMP);
        setApiLoaded(true);
      }
    };

    loadFromAPI();

    return () => {
      cancelled = true;
    };
  }, []); // 空依赖数组，只在挂载时运行一次

  // 操作记录
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  // 使用 ref 保存最新的 taskRecords，避免闭包问题
  const taskRecordsRef = useRef<TaskRecord[]>([]);

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
        const parsed = JSON.parse(stored);
        taskRecordsRef.current = parsed;  // 同步到 ref
        setTaskRecords(parsed);
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
    taskRecordsRef.current = records;  // 更新 ref
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

  // 创建任务
  const createTask = useCallback((taskData: Partial<Task>, dispatchMode?: 'farm' | 'tempTask' | 'smart', initialStatus?: TaskStatus): Task => {
    const now = new Date().toISOString();
    const taskId = generateTaskCode([]);

    // 确保执行人信息完整
    // assignee 可能存在于 TaskDispatchTask 但不在 Task 类型中
    const finalAssigneeName = taskData.assigneeName || (taskData as unknown as { assignee?: string }).assignee || '';
    const finalAssigneeId = taskData.assigneeId ||
      (finalAssigneeName ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}` : '');

    const newTask: Task = {
      id: taskId,
      taskCode: taskId,
      title: taskData.title || '',
      type: taskData.type || '',
      typeName: taskData.typeName || '',
      priority: taskData.priority || 'normal',
      progress: 0,
      sourceType: taskData.sourceType || 'dispatch',
      assignerId: taskData.assignerId || '',
      assignerName: taskData.assignerName || '',
      dueDate: taskData.dueDate,
      feedbackRequirements: taskData.feedbackRequirements || taskData.requiredFeedback || [],
      reworkCount: 0,
      reworkHistory: [],
      deadlineExtensions: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      // 先展开 taskData，这样 taskData 中的 status 会覆盖默认值
      ...taskData,
      // 在展开 taskData 之后再强制覆盖关键字段，确保 dispatchMode 不被覆盖
      dispatchMode: dispatchMode || taskData.dispatchMode || 'farm',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
    };

    let savedTask: Task | null = null;
    setTasks(prev => {
      const realTaskId = generateTaskCode(prev);
      savedTask = { ...newTask, id: realTaskId, taskCode: realTaskId };
      const updated = [savedTask, ...prev];
      console.log('[createTask] 创建任务:', JSON.stringify({ id: realTaskId, title: savedTask.title, dispatchMode: savedTask.dispatchMode, status: savedTask.status }));
      console.log('[createTask] 更新后任务总数:', updated.length, '其中农事任务数量:', updated.filter(t => t.dispatchMode === 'farm').length);
      console.log('[createTask] 任务 dispatchMode 详情:', savedTask.dispatchMode);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });

    console.log('[createTask] 返回任务:', savedTask ? savedTask.id : 'null');

    // 调用后端API创建任务（失败不影响本地操作）
    if (savedTask) {
      Promise.resolve().then(async () => {
        try {
          // 准备API创建任务的数据（排除自动生成的字段）
          const apiTaskData = {
            title: savedTask.title,
            type: savedTask.type,
            typeName: savedTask.typeName,
            status: savedTask.status,
            priority: savedTask.priority,
            sourceType: savedTask.sourceType,
            assigneeId: savedTask.assigneeId,
            assigneeName: savedTask.assigneeName,
            assignerId: savedTask.assignerId,
            assignerName: savedTask.assignerName,
            dueDate: savedTask.dueDate,
            planStart: savedTask.planStart,
            planEnd: savedTask.planEnd,
            estimatedDays: savedTask.estimatedDays,
            estimatedHours: savedTask.estimatedHours,
            description: savedTask.description,
            remarks: savedTask.remarks,
            materials: savedTask.materials,
            tools: savedTask.tools,
            requiredFeedback: savedTask.requiredFeedback,
            typeConfig: savedTask.typeConfig,
            greenhouseId: savedTask.greenhouseId,
            greenhouseName: savedTask.greenhouseName,
            cropName: savedTask.cropName,
            batchId: savedTask.batchId,
            batchCode: savedTask.batchCode,
          };
          // 使用 farmTaskStore 的 addTask（内置三级降级和离线队列）
          await useFarmTaskStore.getState().addTask(apiTaskData);
          console.log('[createTask] 后端API创建任务成功:', savedTask.id);
        } catch (error) {
          console.error('[createTask] 后端API创建任务失败:', error);
        }
      });
    }

    return savedTask || newTask;
  }, [setTasks]);

  // 发布任务
  const publishTask = useCallback((id: string) => {
    let updatedTasks: Task[] | null = null;
    setTasks(prev => {
      const newTasks = prev.map(task => {
        if (task.id !== id || task.status !== 'draft') return task;

        const now = new Date().toISOString();
        const record = createTaskRecord({ ...task, status: 'pending' }, 'publish', 'draft');

        // 立即保存操作记录
      saveTaskRecords([record, ...taskRecordsRef.current]);

        updatedTasks = prev.map(t =>
          t.id === id
            ? { ...t, status: 'pending', updatedAt: now, version: t.version + 1 }
            : t
        );

        return {
          ...task,
          status: 'pending',
          updatedAt: now,
          version: task.version + 1,
        };
      });
      return newTasks;
    });

    // 确保持久化到 localStorage
    if (updatedTasks) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updatedTasks }));
    }
  }, [taskRecords, saveTaskRecords, createTaskRecord]);

  // 撤回任务（撤回执行人，任务可重新派发）
  const withdrawTask = useCallback((id: string, reason: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id || task.status !== 'pending') return task;

        const now = new Date().toISOString();
        const record = createTaskRecord({ ...task, assigneeId: '', assigneeName: '' }, 'withdraw', 'pending', { reason });

        saveTaskRecords([record, ...taskRecords]);

        return {
          ...task,
          // 撤回：清空执行人，状态保持 pending（可重新派发）
          assigneeId: '',
          assigneeName: '',
          updatedAt: now,
          version: task.version + 1,
        };
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 取消任务（彻底取消，后续不再执行）
  const cancelTask = useCallback((id: string, reason: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id) return task;
        if (!['pending', 'accepted', 'in_progress'].includes(task.status)) return task;

        const now = new Date().toISOString();
        const record = createTaskRecord({ ...task, status: 'cancelled' }, 'cancel', task.status, { reason });

        saveTaskRecords([record, ...taskRecords]);

        return {
          ...task,
          status: 'cancelled',
          cancelledReason: reason,
          cancelledAt: now,
          cancelledBy: task.assignerId,
          // 取消：清空执行人，任务彻底终止
          assigneeId: '',
          assigneeName: '',
          updatedAt: now,
          version: task.version + 1,
        };
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 接受任务（执行人在任务中心点击接受）- 状态从 pending 变为 in_progress
  const acceptTask = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id || task.status !== 'pending') return task;

        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        const record = createTaskRecord({ ...task, status: 'in_progress' }, 'accept', 'pending');

        saveTaskRecords([record, ...taskRecords]);

        // 创建考勤记录（从任务上下文获取部门信息）
        try {
          addAttendance({
            workerId: task.assigneeId,
            name: task.assigneeName,
            dept: (task as { dept?: string }).dept || '生产部', // 从任务获取部门，默认生产部
            date: nowStr,
            checkIn: timeStr,
            checkOut: '',
            hours: 0,
            status: '进行中',
            statusClass: 'info',
            taskId: task.id,
            batchId: task.batchId,
          });
        } catch (error) {
          console.error('创建考勤记录失败:', error);
          // 考勤记录失败不影响任务接受流程
        }

        return {
          ...task,
          status: 'in_progress',
          acceptedAt: now.toISOString(),
          startTime: nowStr,
          updatedAt: now.toISOString(),
          version: task.version + 1,
        };
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, addAttendance]);

  // 选择执行人（用于待派工任务）- 设置执行人，状态变为 pending（待接受）
  const acceptAndAssign = useCallback((id: string, assigneeId: string, assigneeName: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id) return task;

        const now = new Date().toISOString();

        // 创建操作记录
        const record = createTaskRecord(
          { ...task, assigneeId, assigneeName },
          'assign',
          task.status
        );

        saveTaskRecords([record, ...taskRecords]);

        return {
          ...task,
          assigneeId,
          assigneeName,
          status: 'pending',  // 状态变为待接受，执行人可见并可接受/拒绝
          updatedAt: now,
          version: task.version + 1,
        };
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

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
      // 新增反馈字段
      gpsLocation?: { lat: number; lng: number };
      photosBefore?: string[];
      photosAfter?: string[];
      voiceNote?: string;
      materialCode?: string;
      workloadDays?: number;
      workloadHours?: number;
      workers?: number;
    }
  ) => {
    setTasks(prev => {
      const updated = prev.map(task => {
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

        // 构建完整的反馈对象
        const feedbackData: TaskRecord['feedback'] = {
          text: options?.remarks,
          materials: options?.materials,
          gpsLocation: options?.gpsLocation,
          // images 字段用于存储照片（兼容 photosBefore + photosAfter）
          images: [
            ...(options?.photosBefore || []),
            ...(options?.photosAfter || []),
          ],
          voiceNote: options?.voiceNote,
          // 工作量确认
          workloadDays: options?.workloadDays,
          workloadHours: options?.workloadHours,
          workers: options?.workers,
          // 物资编码
          materialCode: options?.materialCode,
        };

        // 创建操作记录
        const record = createTaskRecord(
          { ...task, status: newStatus, progress },
          action,
          task.status,
          {
            progress,
            progressIncrement,
            feedback: feedbackData,
            comment: options?.remarks,
          }
        );

        saveTaskRecords([record, ...taskRecords]);

        // 计算工作时长
        let workDuration = 0;
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
        syncWorkLogFromTask({
          id: task.id,
          taskCode: task.taskCode,
          assigneeName: task.assigneeName,
          cropName: task.cropName || '',
          greenhouseName: task.greenhouseName || '',
          title: task.title,
          batchId: task.batchId,
          batchCode: task.batchCode,
          type: task.type,
          typeName: task.typeName,
        }, {
          progress,
          notes: options?.remarks,
          workload: options?.workload,
          workloadDays: options?.workloadDays,
          workloadHours: options?.workloadHours,
          workers: options?.workers,
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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, attendance, updateAttendance, syncWorkLogFromTask]);

  // 超时处理
  const handleOvertime = useCallback((
    id: string,
    action: 'continue' | 'abandon',
    options?: { reason?: string; newDeadline?: string }
  ) => {
    setTasks(prev => {
      const updated = prev.map(task => {
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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 验收通过
  const acceptCompletion = useCallback((id: string, comments?: string) => {
    // 用于存储需要更新育苗的任务信息（在 setTasks 回调中提取）
    let seedlingSourceId: string | null = null;

    setTasks(prev => {
      const updated = prev.map(task => {
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

        // ========== 回传更新育苗状态 ==========
        // 如果是育苗任务，验收通过后更新育苗状态为已完成
        // 注意：现在使用 apiSeedlingService，需要异步等待
        if (task.type === 'seedling' && task.sourceId) {
          seedlingSourceId = task.sourceId;
        }
        // ==========================================

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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });

    // 在 setTasks 完成后执行异步更新育苗状态
    if (seedlingSourceId) {
      Promise.resolve().then(async () => {
        try {
          await updateSeedling(seedlingSourceId!, {
            status: SeedlingStatus.COMPLETED,
            isFinished: true
          });
          console.log('[acceptCompletion] 育苗状态已更新为已完成:', seedlingSourceId);
        } catch (error) {
          console.error('[acceptCompletion] 更新育苗状态失败:', error);
        }
      });
    }

    // 调用后端API完成任务验收（使用 farmTaskStore）
    Promise.resolve().then(async () => {
      try {
        // 使用 farmTaskStore 的 updateTaskStatus（内置三级降级）
        await useFarmTaskStore.getState().updateTaskStatus(id, 'completed');
        console.log('[acceptCompletion] 后端API完成任务验收成功:', id);
      } catch (error) {
        console.error('[acceptCompletion] 后端API完成任务验收失败:', error);
      }
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord, attendance, updateAttendance]);

  // 验收驳回
  const rejectForRework = useCallback((id: string, reason: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 继续执行（返工后）
  const continueExecution = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(task => {
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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 执行人拒绝任务（拒绝后任务状态变为rejected，可重新派发）
  const rejectByExecutor = useCallback((id: string, rejectReason: string, executorId: string, executorName: string) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id || t.taskCode === id);
      if (taskIndex === -1) {
        console.warn('[useTasks] rejectByExecutor: 任务不存在 id=', id);
        return prev;
      }

      const task = prev[taskIndex];
      const now = new Date().toISOString();

      // 创建拒绝记录（保留完整历史）
      const record: TaskRecord = {
        id: `TR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        taskId: task.id,
        taskCode: task.taskCode,
        taskTitle: task.title,
        operatorId: executorId,
        operatorName: executorName,
        action: 'reject',
        actionName: '执行人拒绝',
        fromStatus: task.status,
        toStatus: 'rejected',
        reason: rejectReason,
        actionTime: now,
        createdAt: now.split('T')[0],
      };

      // 更新任务：清空执行人，状态改为 rejected，增加拒绝计数
      const updatedTasks = prev.map((t, idx) => {
        if (idx !== taskIndex) return t;
        console.log('[rejectByExecutor] setting executorRejectCount:', (t.executorRejectCount || 0) + 1);
        return {
          ...t,
          status: 'rejected',
          assigneeId: '',
          assigneeName: '',
          rejectReason: rejectReason,
          executorRejectCount: (t.executorRejectCount || 0) + 1,
          updatedAt: now,
          version: t.version + 1,
        };
      });

      // 立即保存到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updatedTasks }));
      saveTaskRecords([record, ...taskRecords]);

      return updatedTasks;
    });
  }, [setTasks, taskRecords, saveTaskRecords]);

  // 重新派发
  const reassignTask = useCallback((id: string, newAssigneeId: string, newAssigneeName: string) => {
    console.log('[reassignTask] called with:', id, newAssigneeId, newAssigneeName);
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id) return task;
        if (!['failed', 'abandoned', 'rejected'].includes(task.status)) return task;

        const now = new Date().toISOString();

        // 如果执行人拒绝次数 >= 2，必须清空执行人（强制更换执行人），但状态仍为 pending
        const rejectCount = task.executorRejectCount || 0;
        console.log('[reassignTask] task:', task.id, 'status:', task.status, 'executorRejectCount:', rejectCount);
        const mustClearAssignee = rejectCount >= 2;
        console.log('[reassignTask] mustClearAssignee:', mustClearAssignee);
        const finalAssigneeId = mustClearAssignee ? '' : newAssigneeId;
        const finalAssigneeName = mustClearAssignee ? '' : newAssigneeName;
        const finalStatus: TaskStatus = 'pending'; // 始终保持 pending，这样任务会出现在派发列表中等待选择新执行人
        console.log('[reassignTask] finalStatus:', finalStatus);

        const record = createTaskRecord(
          { ...task, status: finalStatus, assigneeId: finalAssigneeId, assigneeName: finalAssigneeName },
          'reassign',
          task.status
        );

        saveTaskRecords([record, ...taskRecords]);

        return {
          ...task,
          status: finalStatus,
          assigneeId: finalAssigneeId,
          assigneeName: finalAssigneeName,
          reworkCount: 0,
          reworkHistory: [],
          deadlineExtensions: [],
          updatedAt: now,
          version: task.version + 1,
        };
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
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
    setTasks(prev => {
      const updated = prev.map(task => {
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
      });

      // 持久化到 localStorage
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks, taskRecords, saveTaskRecords, createTaskRecord]);

  // 删除任务（同时从本地和后端删除）
  const deleteTask = useCallback(async (id: string) => {
    // 先从本地删除
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });

    // 同时调用后端API删除（失败不影响本地）
    try {
      await enhancedApiClient.delete(`/farm-tasks/${id}`);
      console.log('[deleteTask] 后端删除成功:', id);
    } catch (error) {
      console.warn('[deleteTask] 后端删除失败:', id, error);
    }
  }, [setTasks]);

  // 更新任务
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date().toISOString(), version: task.version + 1 }
          : task
      );
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks]);

  // 更新任务状态（通用状态更新）
  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => {
      const updated = prev.map(task =>
        task.id === id
          ? { ...task, status, updatedAt: new Date().toISOString(), version: task.version + 1 }
          : task
      );
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
  }, [setTasks]);

  // 更新任务进度
  const updateTaskProgress = useCallback((id: string, progress: number, options?: {
    remarks?: string;
    workload?: number;
    isFinal?: boolean;
  }) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id !== id) return task;
        const newStatus: TaskStatus = options?.isFinal ? 'waiting_acceptance'
          : progress > 0 && task.status === 'accepted' ? 'in_progress'
          : task.status;
        return {
          ...task,
          progress,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          version: task.version + 1,
        };
      });
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify({ version: DATA_VERSION, data: updated }));
      return updated;
    });
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

  // 确保 tasks 总是数组，防止 undefined 导致渲染错误
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return {
    tasks: safeTasks,
    unifiedTasks: safeTasks, // 统一任务列表（unifiedTasks作为tasks的别名）
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
    acceptAndAssign,
    submitProgress,
    handleOvertime,
    acceptCompletion,
    rejectForRework,
    rejectByExecutor,
    continueExecution,
    reassignTask,
    sendReminder,
    extendDeadline,
    deleteTask,
    updateTask,
    updateTaskStatus,
    updateTaskProgress,
  };
}

// 导出类型
export type { Task, TaskStatus, TaskRecord, ReminderRecord };
