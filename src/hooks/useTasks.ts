/**
 * 统一任务管理 Hook
 * 管理农事任务的增删改查、状态流转、超时检测、催办等
 *
 * 数据层：所有数据通过 API 直接读写数据库，无本地缓存降级
 * - 农事任务：farmTaskStore (Zustand) → enhancedApiClient → API → DB
 * - 临时任务：useTempTaskStore (Zustand) → enhancedApiClient → API → DB
 * - 巡查记录：useInspectionDataStore (Zustand)
 * - 操作记录/催办记录：React 状态 + API 同步
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

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
} from '../types/task';
import {
  OVERTIME_CONFIG,
  DEADLINE_CONFIG,
  REMINDER_CONFIG,
  REWORK_CONFIG,
  TASK_PERMISSIONS,
  TASK_ACTION_CONFIG,

} from '../config/taskConfig';

// 导入育苗服务（用于任务验收后回传更新育苗状态）
import { updateSeedling } from '../services/apiSeedlingService';
// 导入操作日志服务（用于将操作记录写入后端数据库）
import { createOperationLog } from '../services/apiOperationLogService';
import { SeedlingStatus } from '../types/crop';
// 导入农事任务 Store（统一数据层）
import { useFarmTaskStore, Task as StoreTask } from '../stores/farmTaskStore';
// 导入临时任务 Store
import { useTempTaskStore, TempTaskData } from '../stores/useTempTaskStore';
// 导入巡查记录 Store
import { useInspectionDataStore, InspectionData } from '../stores/useInspectionDataStore';
// 导入增强版 API 客户端
import { enhancedApiClient } from '../lib/apiClient';
// 导入存储容量管理


// ========== API 同步辅助函数 ==========

/** 根据任务来源路由到正确的 Zustand Store */
function getStoreForTask(task: Task) {
  if (task.dispatchMode === 'tempTask' || task.sourceType === 'tempTask') {
    return useTempTaskStore.getState();
  }
  return useFarmTaskStore.getState();
}

/** 异步API同步（fire-and-forget），失败不影响本地操作 */
function syncToApi(apiCall: () => Promise<unknown>, label: string): void {
  Promise.resolve().then(async () => {
    try {
      await apiCall();
    } catch (error) {
      console.warn(`[useTasks] ${label} API同步失败:`, error);
    }
  });
}

// ============================================

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
// Store → Task 转换函数
// 将各 Zustand Store 的数据统一转换为 Task 格式
// ============================================

/** 将 useFarmTaskStore 的 StoreTask 转换为本地 Task 格式 */
function convertStoreFarmTaskToTask(t: StoreTask): Task {
  // 提取原始 requiredFeedback 字符串数组（用于 MyTasksPage TaskFeedbackModal 判定）
  const rawFeedbackList: string[] = (t.feedbackRequirements || t.requiredFeedback || []).map((f: unknown) => {
    if (typeof f === 'string') return f;
    if (typeof f === 'object' && f !== null && 'type' in (f as Record<string, unknown>)) {
      return (f as Record<string, string>).type;
    }
    return '';
  }).filter(Boolean);

  const defaultFeedback = (t.feedbackRequirements || t.requiredFeedback || []).map((f: unknown) => {
    if (typeof f === 'string') {
      const feedbackMap: Record<string, { type: 'gps' | 'image_before' | 'image_after' | 'text' | 'materials'; label: string; required: boolean }> = {
        gps: { type: 'gps', label: 'GPS位置', required: true },
        photo_before: { type: 'image_before', label: '作业前照片', required: true },
        photo_after: { type: 'image_after', label: '作业后照片', required: true },
        material: { type: 'materials', label: '物料使用', required: true },
      };
      return feedbackMap[f] || { type: 'text' as const, label: f, required: false };
    }
    return f as { type: 'gps' | 'image_before' | 'image_after' | 'text' | 'materials'; label: string; required: boolean };
  });

  return {
    id: t.id || '',
    taskCode: t.taskCode || t.id || '',
    title: t.title || '',
    type: t.type || 'other',
    typeName: t.typeName || t.type || '其他',
    status: (t.status as TaskStatus) || 'pending',
    priority: (t.priority as 'urgent' | 'high' | 'normal') || 'normal',
    progress: t.progress || 0,
    sourceType: (t.sourceType as 'dispatch' | 'tempTask' | 'smart') || 'dispatch',
    dispatchMode: (t.dispatchMode as 'farm' | 'tempTask' | 'smart') || 'farm',
    assigneeId: t.assigneeId || '',
    assigneeName: t.assigneeName || '',
    assignerId: t.assignerId || '',
    assignerName: t.assignerName || '',
    dueDate: t.dueDate || '',
    startTime: t.startTime || undefined,
    greenhouseId: t.greenhouseId || '',
    greenhouseName: t.greenhouseName || '',
    cropName: t.cropName || '',
    types: (() => {
      const raw = (t as Record<string, unknown>).types;
      if (Array.isArray(raw) && raw.length > 0) return raw as string[];
      const typeStr = t.type || t.typeName || '';
      return typeStr ? typeStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    })(),
    field: t.field || t.greenhouseName || '',
    assignee: (t as Record<string, unknown>).assignee as string || t.assigneeName || '',
    crop: (t as Record<string, unknown>).crop as string || t.cropName || '',
    planStart: t.planStart || '',
    planEnd: t.planEnd || '',
    estimatedDays: t.estimatedDays || 0,
    estimatedHours: t.estimatedHours || 0,
    feedbackRequirements: defaultFeedback,
    requiredFeedback: rawFeedbackList, // 保留字符串数组格式，供 MyTasksPage TaskFeedbackModal 使用
    materials: t.materials || [],
    tools: t.tools || [],
    sopContent: t.sopContent || '',
    typeConfig: t.typeConfig || {},
    sourceProblemId: t.sourceProblemId || undefined,
    sourceInspectionId: t.sourceInspectionId || undefined,
    reworkCount: t.reworkCount || 0,
    reworkHistory: t.reworkHistory || [],
    deadlineExtensions: t.deadlineExtensions || [],
    version: t.version || 1,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

/** 将 useTempTaskStore 的 TempTaskData 转换为本地 Task 格式 */
function convertStoreTempTaskToTask(t: TempTaskData): Task {
  // 统一字段（兼容 snake_case 和 camelCase）
  const id = t.taskCode || t.id || '';
  const title = t.title || t.task_title || '';
  const type = t.type || t.task_type || '';
  const assigneeId = t.assigneeId || t.assignee_id || '';
  const assigneeName = t.assigneeName || t.assignee_name || '';
  const requesterId = t.requesterId || t.requester_id || '';
  const requesterName = t.requesterName || t.requester_name || '';
  const location = t.location || t.greenhouseName || t.greenhouse_name || t.area_name || '';
  const greenhouseId = t.greenhouseId || t.greenhouse_id || '';
  const greenhouseName = t.greenhouseName || t.greenhouse_name || location || '';
  const createdAt = t.createdAt || t.createTime || t.create_time || new Date().toISOString();
  const status = t.status || 'pending';

  return {
    id,
    taskCode: id,
    title,
    type: type || 'other',
    typeName: type || '其他',
    status: status as TaskStatus,
    priority: (t.priority as 'urgent' | 'high' | 'normal') || (t.urgency as 'urgent' | 'high' | 'normal') || 'normal',
    progress: t.progress || 0,
    sourceType: 'tempTask',
    dispatchMode: 'tempTask',
    assigneeId,
    assigneeName,
    assignerId: requesterId,
    assignerName: requesterName,
    dueDate: t.dueDate || '',
    feedbackRequirements: (() => {
      const raw = t.requiredFeedback ?? (t as Record<string, unknown>).required_feedback;
      if (Array.isArray(raw)) return raw.map((f: string) => {
        const fbMap: Record<string, { type: 'gps' | 'image_before' | 'image_after' | 'text' | 'materials'; label: string; required: boolean }> = {
          gps: { type: 'gps', label: 'GPS位置', required: true },
          photo_before: { type: 'image_before', label: '作业前照片', required: true },
          photo_after: { type: 'image_after', label: '作业后照片', required: true },
          material: { type: 'materials', label: '物料使用', required: true },
        };
        return fbMap[f] || { type: 'text' as const, label: f, required: false };
      });
      if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map((f: string) => {
          const fbMap: Record<string, { type: 'gps' | 'image_before' | 'image_after' | 'text' | 'materials'; label: string; required: boolean }> = {
            gps: { type: 'gps', label: 'GPS位置', required: true },
            photo_before: { type: 'image_before', label: '作业前照片', required: true },
            photo_after: { type: 'image_after', label: '作业后照片', required: true },
            material: { type: 'materials', label: '物料使用', required: true },
          };
          return fbMap[f] || { type: 'text' as const, label: f, required: false };
        }) : []; } catch { return []; }
      }
      return [];
    })(),
    greenhouseId,
    greenhouseName,
    cropName: '',
    field: location,
    reworkCount: t.rejectCount || 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt,
    updatedAt: t.updatedAt || t.updateTime || t.update_time || createdAt,
    acceptedAt: undefined,
    completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    workLocation: location,
    urgency: (t.urgency as 'urgent' | 'high' | 'normal') || 'normal',
    tempTaskType: type,
    estimatedDays: 0,
    estimatedHours: t.estimatedHours || 0,
    workerCount: t.workerCount || 1,
    remarks: t.remarks || t.description || '',
    requiredFeedback: (() => {
      const raw = t.requiredFeedback ?? (t as Record<string, unknown>).required_feedback;
      console.warn('[useTasks] convertStoreTempTaskToTask requiredFeedback:', { id, title, raw, rawType: typeof raw, isArr: Array.isArray(raw), rawKeys: typeof raw === 'object' && raw !== null ? Object.keys(raw as object) : 'N/A' });
      if (Array.isArray(raw)) return raw as string[];
      if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
      return [];
    })(),
    startDate: '',
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

/** 将 useInspectionDataStore 的 InspectionData 转换为本地 Task 格式 */
function convertStoreInspectionToTask(t: InspectionData): Task {
  const id = t.id || '';
  const recordCode = t.recordCode || t.record_code || id;
  const greenhouseName = t.greenhouseName || t.greenhouse_name || '园区';
  const inspectorId = t.inspectorId || t.inspector_id || '';
  const inspectorName = t.inspectorName || t.inspector_name || '';
  const checkDate = t.checkDate || t.check_date || '';
  const checkTime = t.checkTime || t.check_time || '08:00';
  const issues = Array.isArray(t.issues) ? t.issues : [];
  const feedbackUsers = Array.isArray(t.feedbackUsers) ? t.feedbackUsers : [];
  const assigneeName = feedbackUsers.length > 0 ? feedbackUsers[0] : inspectorName;
  const status = t.status || 'pending';
  const issueSeverity = t.issueSeverity || t.issue_severity || '轻微';

  return {
    id,
    taskCode: recordCode,
    title: `${greenhouseName} 巡查反馈`,
    type: 'other',
    typeName: '巡查反馈处理',
    status: status as TaskStatus,
    priority: issueSeverity === '严重' ? 'high' : 'normal',
    progress: PROGRESS_MAP[status] || 0,
    sourceType: 'dispatch',
    dispatchMode: 'inspection',
    assigneeId: feedbackUsers.length > 0 ? `EMP_${assigneeName.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)}` : '',
    assigneeName,
    assignerId: inspectorId,
    assignerName: inspectorName,
    dueDate: checkDate,
    startTime: undefined,
    greenhouseId: t.greenhouseId || t.greenhouse_id || '',
    greenhouseName,
    cropName: t.cropName || '',
    types: issues,
    field: greenhouseName,
    assignee: assigneeName,
    crop: t.cropName || '',
    planStart: checkDate ? `${checkDate} ${checkTime}` : '',
    planEnd: checkDate ? `${checkDate} 17:00` : '',
    estimatedDays: 1,
    estimatedHours: 8,
    feedbackRequirements: [],
    materials: [],
    tools: [],
    sopContent: '',
    typeConfig: {},
    sourceProblemId: undefined,
    sourceInspectionId: id,
    sourceId: id,
    recordCode,
    inspectionType: t.inspectionType || t.inspection_type || '',
    submitterId: inspectorId,
    submitterName: inspectorName,
    location: greenhouseName,
    checkDate,
    checkTime,
    checkResult: t.checkResult || t.check_result || (issueSeverity === '严重' ? '严重' : issueSeverity === '中等' ? '异常' : '轻微'),
    issueCategories: issues,
    issueSeverity,
    issueText: t.issueText || t.issue_text || '',
    photos: Array.isArray(t.images) ? t.images : [],
    feedbackStatus: status === 'pending' ? '待接受' : status === 'in_progress' ? '处理中' : status === 'rejected' ? '已返工' : status === 'waiting_acceptance' ? '待验收' : status === 'completed' ? '已完成' : '未知',
    feedbackUsers,
    processProgress: PROGRESS_MAP[status] ? String(PROGRESS_MAP[status]) : '0',
    inspectorId,
    inspectorName,
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    version: 1,
    createdAt: t.createdAt || t.createTime || t.create_time || (checkDate ? `${checkDate}T${checkTime}:00Z` : new Date().toISOString()),
    updatedAt: t.updatedAt || t.updateTime || t.update_time || new Date().toISOString(),
  };
}


// ============================================
// 超时检测
// ============================================
export function detectOvertime(task: Task): TaskTimeout | undefined {
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
  // 任务列表（响应式派生自 farmTaskStore + tempTaskStore + inspectionDataStore）
  tasks: Task[];

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
  createTask: (taskData: Partial<Task>, dispatchMode?: 'farm' | 'tempTask' | 'smart' | 'problem' | 'inspection', initialStatus?: TaskStatus) => Task;

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
  deleteTask: (id: string) => Promise<void>;

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
  // ========== 响应式数据：从 Zustand Store 读取（升级方案V1.0：localStorage → Store）==========
  const storeTasks = useFarmTaskStore(s => s.tasks);
  const tempTasks = useTempTaskStore(s => s.tasks);
  const inspectionRecords = useInspectionDataStore(s => s.records);

  // 合并三类任务为统一 Task 格式（响应式派生）
  const tasks = useMemo(() => {
    const farmTasks = storeTasks.map(convertStoreFarmTaskToTask);
    const convertedTempTasks = tempTasks.map(convertStoreTempTaskToTask);
    const convertedInspectionTasks = inspectionRecords.map(convertStoreInspectionToTask);
    const all = [...farmTasks, ...convertedTempTasks, ...convertedInspectionTasks];
    console.warn('[useTasks] useMemo 合并任务: 农事=', farmTasks.length, '临时=', convertedTempTasks.length, '巡查=', convertedInspectionTasks.length, '总计=', all.length);
    // 打印临时任务的 requiredFeedback 字段
    if (convertedTempTasks.length > 0) {
      console.warn('[useTasks] 临时任务 requiredFeedback 示例:', convertedTempTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title, rf: (t as Record<string, unknown>).requiredFeedback, rfLen: Array.isArray((t as Record<string, unknown>).requiredFeedback) ? (t as Record<string, unknown>).requiredFeedback?.length : 'NOT_ARRAY', status: t.status })));
    }
    return Array.isArray(all) ? all : [];
  }, [storeTasks, tempTasks, inspectionRecords]);

  // 初始化：触发所有 Store 从 API 拉取数据
  useEffect(() => {
    console.warn('[useTasks] 初始化 fetchTasks 调用');
    useFarmTaskStore.getState().fetchTasks();
    useTempTaskStore.getState().fetchTasks();
  }, []);

  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  // 使用 ref 保存最新的 taskRecords，避免闭包问题
  const taskRecordsRef = useRef<TaskRecord[]>([]);

  // 催办记录
  const [reminderRecords, setReminderRecords] = useState<ReminderRecord[]>([]);

  // 工单汇总同步hook
  const { syncWorkLogFromTask } = usePersistentWorkLogs();

  // 考勤记录hook
  const { attendance, addAttendance, updateAttendance } = usePersistentAttendance();

  // 保存操作记录到 React 状态 + 同步写入后端数据库
  const saveTaskRecords = useCallback((records: TaskRecord[]) => {
    taskRecordsRef.current = records;
    setTaskRecords(records);

    // 将最新一条记录同步写入后端数据库（异步，不阻塞UI）
    const latest = records[0];
    if (latest) {
      createOperationLog({
        userId: latest.operatorId,
        username: latest.operatorName,
        action: latest.action,
        module: '农事任务',
        resourceType: 'task',
        resourceId: latest.taskId,
        description: `${latest.operatorName} ${TASK_ACTION_CONFIG[latest.action]?.label || latest.action} 任务【${latest.taskTitle}】`,
        status: 'success',
      }).catch((e) => {
        console.warn('[useTasks] 操作日志API写入失败:', e);
      });
    }
  }, []);

  // 保存催办记录到 React 状态
  const saveReminderRecords = useCallback((records: ReminderRecord[]) => {
    setReminderRecords(records);
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
  const createTask = useCallback((taskData: Partial<Task>, dispatchMode?: 'farm' | 'tempTask' | 'smart' | 'problem' | 'inspection', initialStatus?: TaskStatus): Task => {
    const now = new Date().toISOString();

    // 确保执行人信息完整
    const finalAssigneeName = taskData.assigneeName || (taskData as unknown as { assignee?: string }).assignee || '';
    const finalAssigneeId = taskData.assigneeId ||
      (finalAssigneeName ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}` : '');

    // 准备 Store 需要的任务数据（完整字段映射，确保数据不丢失）
    const apiTaskData = {
      title: taskData.title || '',
      type: taskData.type || '',
      typeName: taskData.typeName || '',
      status: initialStatus || taskData.status || 'pending',
      priority: taskData.priority || 'normal',
      progress: 0,
      sourceType: taskData.sourceType || 'dispatch',
      dispatchMode: dispatchMode || taskData.dispatchMode || 'farm',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
      assignerId: taskData.assignerId || '',
      assignerName: taskData.assignerName || '',
      dueDate: taskData.dueDate,
      planStart: (taskData as Task).planStart || (taskData as any).plannedDate || '',
      planEnd: (taskData as Task).planEnd || (taskData as any).plannedDate || '',
      estimatedDays: (taskData as Task).estimatedDays,
      estimatedHours: (taskData as Task).estimatedHours,
      materials: (taskData as Task).materials || [],
      tools: (taskData as Task).tools || [],
      sopContent: (taskData as Task).sopContent,
      typeConfig: (taskData as Task).typeConfig,
      feedbackRequirements: taskData.feedbackRequirements || taskData.requiredFeedback || [],
      greenhouseId: (taskData as Task).greenhouseId,
      greenhouseName: (taskData as Task).greenhouseName,
      cropName: (taskData as Task).cropName,
      // 补充 CreateTaskModal 传入但之前缺失的字段
      batchId: (taskData as Task).batchId || '',
      batchCode: (taskData as Task).batchCode || '',
      description: (taskData as Task).description || '',
      remarks: (taskData as Task).remarks || '',
      field: (taskData as Task).field || '',
      assignee: (taskData as Task).assignee || '',
      crop: (taskData as Task).crop || '',
      teamId: (taskData as any).teamId || '',
      teamName: (taskData as any).teamName || '',
      toolsRemarks: (taskData as any).toolsRemarks || '',
      requiredFeedback: (taskData as any).requiredFeedback || [],
      // 问题分派关联字段（确保分派的问题任务能在"巡查反馈处理"Tab正确显示）
      sourceProblemId: (taskData as any).sourceProblemId || '',
      sourceId: (taskData as any).sourceId || '',
      sourceCode: (taskData as any).sourceCode || '',
    };

    // 使用 farmTaskStore 的 addTask（乐观本地更新 + API 同步 + 离线队列）
    // 注意：addTask 内部先做乐观本地更新（同步），再做 API 调用（异步）
    // 因此调用后 store 状态已立即更新，可以从 getState().tasks[0] 读取新任务
    useFarmTaskStore.getState().addTask(apiTaskData).then(s => {
      if (s) console.log('[createTask] 后端API创建任务成功:', s.id);
    }).catch(error => {
      console.error('[createTask] 后端API创建任务失败:', error);
    });

    // 读取乐观更新的任务（addTask 将新任务 prepend 到数组头部）
    const storeTask = useFarmTaskStore.getState().tasks[0];
    const result = storeTask ? convertStoreFarmTaskToTask(storeTask) : null;
    console.log('[createTask] 返回任务:', result?.id || 'null');
    return result || ({
      id: '',
      taskCode: '',
      title: taskData.title || '',
      type: taskData.type || '',
      typeName: taskData.typeName || '',
      status: initialStatus || taskData.status || 'pending',
      priority: taskData.priority || 'normal',
      progress: 0,
      sourceType: taskData.sourceType || 'dispatch',
      dispatchMode: dispatchMode || taskData.dispatchMode || 'farm',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
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
    } as Task);
  }, []);

  // 发布任务
  const publishTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'draft') return;

    const now = new Date().toISOString();
    const record = createTaskRecord({ ...task, status: 'pending' }, 'publish', 'draft');
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: 'pending',
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 撤回任务（pending → cancelled，撤回原因记录在操作记录中）
  const withdrawTask = useCallback((id: string, reason: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'pending') return;

    const now = new Date().toISOString();
    const record = createTaskRecord({ ...task, status: 'cancelled' }, 'withdraw', 'pending', { reason });
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: 'cancelled',
      cancelledReason: reason,
      cancelledAt: now,
      cancelledBy: task.assignerId,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 取消任务（彻底取消，后续不再执行，保留执行人信息用于审计追溯）
  const cancelTask = useCallback((id: string, reason: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !['pending', 'accepted', 'in_progress'].includes(task.status)) return;

    const now = new Date().toISOString();
    const record = createTaskRecord({ ...task, status: 'cancelled' }, 'cancel', task.status, { reason });
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: 'cancelled',
      cancelledReason: reason,
      cancelledAt: now,
      cancelledBy: task.assignerId,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 接受任务（执行人在任务中心点击接受）- 状态从 pending 变为 accepted（已接受），提交首次进度后自动进入 in_progress
  const acceptTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'pending') return;

    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    const record = createTaskRecord({ ...task, status: 'accepted' }, 'accept', 'pending');
    saveTaskRecords([record, ...taskRecordsRef.current]);

    // 创建考勤记录（从任务上下文获取部门信息）
    try {
      addAttendance({
        workerId: task.assigneeId,
        name: task.assigneeName,
        dept: (task as { dept?: string }).dept || '生产部',
        date: nowStr,
        checkIn: timeStr,
        checkOut: '',
        hours: 0,
        status: '进行中',
        statusClass: 'info',
        taskId: task.id,
        batchId: (task as { batchId?: string }).batchId,
      });
    } catch (error) {
      console.error('创建考勤记录失败:', error);
    }

    getStoreForTask(task).updateTask(id, {
      status: 'accepted',
      acceptedAt: now.toISOString(),
      startTime: nowStr,
      updatedAt: now.toISOString(),
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords, addAttendance]);

  // 选择执行人（用于待派工任务）- 设置执行人，状态变为 pending（待接受）
  const acceptAndAssign = useCallback((id: string, assigneeId: string, assigneeName: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const now = new Date().toISOString();

    const record = createTaskRecord(
      { ...task, assigneeId, assigneeName },
      'assign',
      task.status
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      assigneeId,
      assigneeName,
      status: 'pending',
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

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
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const nowStr = nowIso.split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    const progressIncrement = progress - task.progress;

    let newStatus: TaskStatus = task.status;
    const action: TaskAction = options?.isFinal ? 'submit' : 'progress';

    if (options?.isFinal) {
      newStatus = 'waiting_acceptance';
    } else if (task.status === 'accepted') {
      newStatus = 'in_progress';
    }

    const feedbackData: TaskRecord['feedback'] = {
      text: options?.remarks,
      materials: options?.materials,
      gpsLocation: options?.gpsLocation,
      images: [
        ...(options?.photosBefore || []),
        ...(options?.photosAfter || []),
      ],
      voiceNote: options?.voiceNote,
      workloadDays: options?.workloadDays,
      workloadHours: options?.workloadHours,
      workers: options?.workers,
      materialCode: options?.materialCode,
    };

    const record = createTaskRecord(
      { ...task, status: newStatus, progress },
      action,
      task.status,
      { progress, progressIncrement, feedback: feedbackData, comment: options?.remarks }
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

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
      batchId: (task as { batchId?: string }).batchId,
      batchCode: (task as { batchCode?: string }).batchCode,
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

    getStoreForTask(task).updateTask(id, {
      progress,
      status: newStatus,
      startTime: task.startTime || options?.startTime,
      endTime: options?.endTime,
      workDuration,
      updatedAt: nowIso,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords, attendance, updateAttendance, syncWorkLogFromTask]);

  // 超时处理
  const handleOvertime = useCallback((
    id: string,
    action: 'continue' | 'abandon',
    options?: { reason?: string; newDeadline?: string }
  ) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'in_progress') return;

    const now = new Date().toISOString();
    const taskAction: TaskAction = action === 'continue' ? 'overtime_continue' : 'overtime_abandon';

    const record = createTaskRecord(
      { ...task, status: action === 'continue' ? 'in_progress' : 'abandoned' },
      taskAction,
      task.status,
      { reason: options?.reason }
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

    if (action === 'continue') {
      const extension: DeadlineExtension = {
        id: `EXT_${Date.now()}`,
        originalDeadline: task.dueDate || '',
        newDeadline: options?.newDeadline || '',
        reason: options?.reason || '',
        extendedBy: task.assigneeId,
        extendedAt: now,
      };

      getStoreForTask(task).updateTask(id, {
        status: 'in_progress',
        dueDate: options?.newDeadline || task.dueDate,
        deadlineExtensions: [...task.deadlineExtensions, extension],
        updatedAt: now,
        version: task.version + 1,
      });
    } else {
      getStoreForTask(task).updateTask(id, {
        status: 'abandoned',
        abandonedReason: options?.reason,
        abandonedAt: now,
        updatedAt: now,
        version: task.version + 1,
      });
    }
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 验收通过
  const acceptCompletion = useCallback((id: string, comments?: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'waiting_acceptance') return;

    const now = new Date().toISOString();

    const record = createTaskRecord(
      { ...task, status: 'completed' },
      'complete',
      'waiting_acceptance',
      { comment: comments }
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

    // 更新考勤记录状态为已完成
    const attendanceRecord = attendance.find(a => a.taskId === task.id);
    if (attendanceRecord) {
      updateAttendance(attendanceRecord.id, {
        status: '已完成',
        statusClass: 'success',
      });
    }

    // 回传更新育苗状态
    if (task.type === 'seedling' && task.sourceId) {
      Promise.resolve().then(async () => {
        try {
          await updateSeedling(task.sourceId!, {
            status: SeedlingStatus.COMPLETED,
            isFinished: true
          });
          console.log('[acceptCompletion] 育苗状态已更新为已完成:', task.sourceId);
        } catch (error) {
          console.error('[acceptCompletion] 更新育苗状态失败:', error);
        }
      });
    }

    getStoreForTask(task).updateTask(id, {
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
    });
  }, [tasks, createTaskRecord, saveTaskRecords, attendance, updateAttendance]);

  // 验收驳回
  const rejectForRework = useCallback((id: string, reason: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'waiting_acceptance') return;

    const now = new Date().toISOString();
    const newReworkCount = task.reworkCount + 1;
    const newStatus: TaskStatus = newReworkCount >= REWORK_CONFIG.maxReworkCount ? 'failed' : 'rejected';

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
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: newStatus,
      reworkCount: newReworkCount,
      reworkHistory: [...task.reworkHistory, reworkRecord],
      rejectReason: reason,
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 继续执行（返工后）
  const continueExecution = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'rejected') return;

    const now = new Date().toISOString();

    const record = createTaskRecord(
      { ...task, status: 'in_progress' },
      'continue',
      'rejected'
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: 'in_progress',
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 执行人拒绝任务（拒绝后任务状态变为rejected，可重新派发）
  const rejectByExecutor = useCallback((id: string, rejectReason: string, executorId: string, executorName: string) => {
    const task = tasks.find(t => t.id === id || t.taskCode === id);
    if (!task) {
      console.warn('[useTasks] rejectByExecutor: 任务不存在 id=', id);
      return;
    }

    const now = new Date().toISOString();

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
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(task.id, {
      status: 'rejected',
      assigneeId: '',
      assigneeName: '',
      rejectReason: rejectReason,
      executorRejectCount: ((task as { executorRejectCount?: number }).executorRejectCount || 0) + 1,
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, saveTaskRecords]);

  // 重新派发
  const reassignTask = useCallback((id: string, newAssigneeId: string, newAssigneeName: string) => {
    console.log('[reassignTask] called with:', id, newAssigneeId, newAssigneeName);
    const task = tasks.find(t => t.id === id);
    if (!task || !['failed', 'abandoned', 'rejected'].includes(task.status)) return;

    const now = new Date().toISOString();

    const rejectCount = (task as { executorRejectCount?: number }).executorRejectCount || 0;
    const mustClearAssignee = rejectCount >= 2;
    const finalAssigneeId = mustClearAssignee ? '' : newAssigneeId;
    const finalAssigneeName = mustClearAssignee ? '' : newAssigneeName;
    const finalStatus: TaskStatus = 'pending';

    const record = createTaskRecord(
      { ...task, status: finalStatus, assigneeId: finalAssigneeId, assigneeName: finalAssigneeName },
      'reassign',
      task.status
    );
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      status: finalStatus,
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
      reworkCount: 0,
      reworkHistory: [],
      deadlineExtensions: [],
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

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

    // API异步同步：催办（保留 — 催办API不由farmTaskStore管理）
    syncToApi(
      () => enhancedApiClient.post(`/farm-tasks/${id}/remind`, { message }),
      `sendReminder(${id})`
    );
  }, [tasks, reminderRecords, saveReminderRecords, taskRecords, saveTaskRecords, createTaskRecord]);

  // 延期
  const extendDeadline = useCallback((id: string, newDeadline: string, reason: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // 检查延期次数限制
    if (task.deadlineExtensions.length >= DEADLINE_CONFIG.maxExtensions) {
      console.warn('延期次数已达上限');
      return;
    }

    const now = new Date().toISOString();

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
    saveTaskRecords([record, ...taskRecordsRef.current]);

    getStoreForTask(task).updateTask(id, {
      dueDate: newDeadline,
      deadlineExtensions: [...task.deadlineExtensions, extension],
      updatedAt: now,
      version: task.version + 1,
    });
  }, [tasks, createTaskRecord, saveTaskRecords]);

  // 删除任务（Store 层统一管理：根据任务来源路由到正确 Store）
  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    const store = task ? getStoreForTask(task) : useFarmTaskStore.getState();
    await store.deleteTask(id);
  }, [tasks]);

  // 更新任务（本地乐观更新 + API同步，根据任务来源路由到正确 Store）
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    const store = task ? getStoreForTask(task) : useFarmTaskStore.getState();
    store.updateTask(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }, [tasks]);

  // 更新任务状态（通用状态更新，根据任务来源路由到正确 Store）
  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    const store = task ? getStoreForTask(task) : useFarmTaskStore.getState();
    store.updateTask(id, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }, [tasks]);

  // 更新任务进度
  const updateTaskProgress = useCallback((id: string, progress: number, options?: {
    remarks?: string;
    workload?: number;
    isFinal?: boolean;
  }) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = options?.isFinal ? 'waiting_acceptance'
      : progress > 0 && task.status === 'accepted' ? 'in_progress'
      : task.status;

    getStoreForTask(task).updateTask(id, {
      progress,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      version: task.version + 1,
    });
  }, [tasks]);

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
