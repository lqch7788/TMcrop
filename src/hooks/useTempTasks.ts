/**
 * 统一临时任务管理 Hook
 * 管理临时任务的增删改查、状态流转
 * 数据通过 Zustand Store 与后端 API 同步，实现持久化及刷新后数据不丢失
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTempTaskStore, type TempTaskData } from '../stores';
import { useFarmTaskStore } from '../stores/farmTaskStore';

// ============================================
// 临时任务状态流转
// ============================================
// draft → pending → in_progress → waiting_acceptance → completed
//                                      ↓
//                                  rejected → in_progress (第1次驳回)
//                                      ↓
//                              pending_reassign (第2次驳回，等待重新派发)

export type TempTaskStatus = 'draft' | 'pending' | 'in_progress' | 'waiting_acceptance' | 'completed' | 'rejected' | 'pending_reassign';

// 状态标签配置
export const TEMP_TASK_STATUS_CONFIG: Record<TempTaskStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-500', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '已驳回', color: 'text-red-600', bg: 'bg-red-100' },
  pending_reassign: { label: '待重新派发', color: 'text-purple-600', bg: 'bg-purple-100' },
};

// 紧急程度配置
export const URGENCY_CONFIG = {
  urgent: { label: '紧急', color: 'text-red-500' },
  high: { label: '高', color: 'text-orange-500' },
  normal: { label: '普通', color: 'text-gray-500' },
};

// ============================================
// 超时配置
// ============================================
const OVERDUE_CONFIG = {
  // pending（待接受）超时时间：24小时
  pendingThresholdHours: 24,
  // in_progress（进行中）超时时间：48小时
  inProgressThresholdHours: 48,
  // 警告阈值（百分比），超过此比例显示警告
  warningPercent: 0.7,
};

// 计算任务是否超时
export function getTaskOverdueStatus(task: TempTask): 'normal' | 'warning' | 'overdue' {
  const now = new Date();

  // 已完成、已取消、已驳回、待重新派发的任务不计算超时
  if (['completed', 'cancelled', 'rejected', 'pending_reassign'].includes(task.status)) {
    return 'normal';
  }

  // 获取截止日期
  if (!task.dueDate) {
    return 'normal';
  }

  const dueDate = new Date(task.dueDate);
  if (now <= dueDate) {
    // 截止日期未到，检查是否即将到期（7天内）
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24) {
      return 'warning';
    }
    return 'normal';
  }

  // 已超过截止日期
  return 'overdue';
}

// 计算超时时长描述
export function getTaskOverdueDesc(task: TempTask): string | null {
  const now = new Date();

  if (!task.dueDate) return null;

  const dueDate = new Date(task.dueDate);
  if (now <= dueDate) return null;

  const overdueMs = now.getTime() - dueDate.getTime();
  const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
  const overdueDays = Math.floor(overdueHours / 24);

  if (overdueDays > 0) {
    return `已超时${overdueDays}天`;
  }
  return `已超时${overdueHours}小时`;
}

// ============================================
// 临时任务类型定义
// ============================================
export interface TempTask {
  id: string;
  taskCode: string;           // 任务编号 TT+日期+序号

  // 任务基本信息
  title: string;              // 任务标题
  type: string;               // 任务类型值
  typeName: string;           // 任务类型名称
  urgency: 'urgent' | 'high' | 'normal';  // 紧急程度

  // 地点
  location: string;           // 工作地点
  greenhouseId?: string;
  greenhouseName?: string;

  // 优先级
  priority: 'urgent' | 'high' | 'normal';

  // 状态
  status: TempTaskStatus;

  // 执行信息
  assigneeId: string;         // 执行人ID
  assigneeName: string;       // 执行人名称
  assignerId: string;        // 分派人ID
  assignerName: string;      // 分派人名称

  // 预计工时
  estimatedHours: number;     // 预计总工时（小时）
  estimatedDays?: number;     // 预计天数
  workerCount?: number;       // 人工数量
  actualHours?: number;      // 实际工时

  // 描述
  description?: string;
  remarks?: string;

  // 驳回原因
  rejectReason?: string;

  // 验收意见
  acceptanceRemarks?: string;

  // 完成说明
  completionRemarks?: string;

  // 必填反馈
  requiredFeedback?: string[];

  // 驳回次数（第2次驳回后进入pending_reassign状态）
  rejectCount: number;

  // 截止日期
  dueDate: string;

  // 接受时间（开始执行时间，用于计算超时）
  acceptedAt?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // 进度（0-100）
  progress?: number;
}

// ============================================
// 临时任务操作记录
// ============================================
export interface TempTaskOperationRecord {
  id: string;
  recordCode: string;         // 操作记录编号

  // 关联任务
  taskId: string;
  taskCode: string;
  taskTitle: string;

  // 操作类型
  operationType: 'create' | 'accept' | 'progress' | 'complete' | 'reject' | 'accept_confirm';
  operationTypeName: string;

  // 执行信息
  operatorId: string;
  operatorName: string;
  operationDate: string;
  time?: string;

  // 工时
  hours?: number;

  // 备注
  remarks?: string;

  // 驳回原因
  rejectReason?: string;

  // 时间戳
  createdAt: string;
}

// ============================================
// 生成任务编号
// ============================================
function generateTempTaskCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = String(Math.random()).slice(2, 5);
  return `TT${dateStr}-${random}`;
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
// Store 数据结构 → TempTask 格式映射函数
// ============================================
/** 类型值→中文名称映射（兼容两套类型体系） */
const TYPE_LABEL_MAP: Record<string, string> = {
  fertilization: '施肥', irrigation: '灌溉', pruning: '修剪',
  pesticide: '植保', rootIrrigation: '灌根', planting: '定植',
  harvest: '采收', weeding: '除草',
  farm_repair: '农事抢修', equipment_repair: '设备维修',
  facility_maintenance: '设施维护', staff_dispatch: '人员调配',
  cleaning: '清洁整理', safety_check: '安全检查',
  other: '其他',
};

/** 将后端 Store 的数据格式映射为前端 TempTask 格式 */
function mapStoreTaskToTempTask(t: TempTaskData): TempTask {
  const typeVal = (t.type || t.task_type || t.tempTaskType || '') as string;
  return {
    id: t.id || '',
    taskCode: t.taskCode || t.task_code || '',
    title: t.title || t.taskTitle || t.task_title || '',
    type: typeVal,
    typeName: TYPE_LABEL_MAP[typeVal] || typeVal,
    urgency: (t.urgency || t.priority || 'normal') as TempTask['urgency'],
    location: t.location || t.area_name || '',
    greenhouseId: t.greenhouseId || t.greenhouse_id,
    greenhouseName: t.greenhouseName || t.greenhouse_name,
    priority: (t.priority || t.urgency || 'normal') as TempTask['priority'],
    status: (t.status || 'draft') as TempTaskStatus,
    assigneeId: t.assigneeId || t.assignee_id || '',
    assigneeName: t.assigneeName || t.assignee_name || '',
    assignerId: t.requesterId || t.requester_id || '',
    assignerName: t.requesterName || t.requester_name || '',
    estimatedHours: t.estimatedHours ?? 0,
    estimatedDays: t.estimatedDays ?? 0,
    workerCount: t.workerCount,
    actualHours: t.actualHours,
    description: t.description || t.task_content,
    remarks: t.remarks,
    rejectReason: t.rejectReason || t.reject_reason,
    acceptanceRemarks: t.acceptanceRemarks || t.acceptance_remarks,
    completionRemarks: t.completionRemarks || t.completion_note,
    requiredFeedback: (() => {
      const raw = t.requiredFeedback ?? t.required_feedback;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
      return [];
    })(),
    rejectCount: t.rejectCount ?? 0,
    dueDate: t.dueDate || '',
    acceptedAt: undefined,
    createdAt: t.createdAt || t.create_time || '',
    updatedAt: t.updatedAt || t.update_time || '',
    completedAt: t.completedAt || t.completion_date,
    progress: t.progress,
  };
}

// ============================================
// Hook 返回类型
// ============================================
export interface UseTempTasksReturn {
  // 临时任务列表
  tempTasks: TempTask[];
  setTempTasks: React.Dispatch<React.SetStateAction<TempTask[]>>;

  // 操作记录列表
  operationRecords: TempTaskOperationRecord[];

  // 添加临时任务
  addTempTask: (task: Omit<TempTask, 'id' | 'taskCode' | 'createdAt' | 'updatedAt'>) => TempTask;

  // 更新临时任务
  updateTempTask: (id: string, updates: Partial<TempTask>) => void;

  // 更新临时任务状态
  updateTempTaskStatus: (id: string, status: TempTaskStatus, rejectReason?: string) => void;

  // 提交完成（执行人提交完成待审核）
  submitCompletion: (id: string, hours: number, remarks: string) => void;

  // 审核通过
  acceptCompletion: (id: string, acceptanceRemarks?: string) => void;

  // 审核驳回
  rejectCompletion: (id: string, reason: string) => void;

  // 删除临时任务
  deleteTempTask: (id: string) => void;

  // 获取临时任务
  getTempTask: (id: string) => TempTask | undefined;

  // 获取执行人的临时任务
  getTempTasksByAssignee: (assigneeId: string) => TempTask[];

  // 获取临时任务的操作记录
  getOperationRecordsByTaskId: (taskId: string) => TempTaskOperationRecord[];
}

// ============================================
// useTempTasks Hook
// ============================================
export function useTempTasks(): UseTempTasksReturn {
  // 从 Zustand Store 获取临时任务数据（替代 localStorage）
  const store = useTempTaskStore();
  const storeTasks = useTempTaskStore(s => s.tasks);
  const [tempTasks, setTempTasks] = useState<TempTask[]>([]);

  // 首次加载时从 Store（后端 API）获取数据
  useEffect(() => {
    store.fetchTasks();
  }, []);

  // 订阅 Store 变更，自动同步本地状态（解决跨组件状态不一致问题）
  useEffect(() => {
    if (storeTasks.length > 0) {
      setTempTasks(storeTasks.map(mapStoreTaskToTempTask));
    }
  }, [storeTasks]);
  // 操作记录状态
  const [operationRecords, setOperationRecords] = useState<TempTaskOperationRecord[]>([]);

  // 从 localStorage 读取操作记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem('yuanxingtu_tempTasks_operations');
      if (stored) {
        setOperationRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load temp task operation records:', e);
    }
  }, []);

  // 保存操作记录到 localStorage
  const saveOperationRecords = useCallback((records: TempTaskOperationRecord[]) => {
    setOperationRecords(records);
    localStorage.setItem('yuanxingtu_tempTasks_operations', JSON.stringify(records));
  }, []);

  // 添加临时任务
  const addTempTask = useCallback((taskData: Omit<TempTask, 'id' | 'createdAt' | 'updatedAt'> & { taskCode?: string }): TempTask => {
    const now = new Date().toISOString();
    // 优先使用用户生成的任务编号（前端 form 已经生成了正确的 TT+日期+序号 格式）
    // 如果前端传递了 taskCode 则使用，否则调用 generateTempTaskCode 生成
    const finalTaskCode = taskData.taskCode || generateTempTaskCode();
    const newTask: TempTask = {
      ...taskData,
      id: taskData.id || `TEMP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskCode: finalTaskCode,
      status: taskData.status || 'pending',
      rejectCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setTempTasks(prev => [newTask, ...prev]);

    // 异步持久化到后端（通过 Zustand Store）
    store.createTask({
      id: newTask.id,
      taskCode: newTask.taskCode,
      title: newTask.title,
      type: newTask.type,
      description: newTask.description,
      assigneeId: newTask.assigneeId,
      assigneeName: newTask.assigneeName,
      requesterId: newTask.assignerId,
      requesterName: newTask.assignerName,
      greenhouseId: newTask.greenhouseId,
      greenhouseName: newTask.greenhouseName,
      location: newTask.location,
      status: newTask.status,
      priority: newTask.urgency || newTask.priority,
      urgency: newTask.urgency || newTask.priority,
      dueDate: newTask.dueDate,
      estimatedHours: newTask.estimatedHours,
      workerCount: newTask.workerCount,
      progress: newTask.progress,
      remarks: newTask.remarks,
      requiredFeedback: newTask.requiredFeedback || [],
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
    });

    // 创建操作记录
    const record: TempTaskOperationRecord = {
      id: `TEMP_OP_${Date.now()}`,
      recordCode: generateRecordCode(),
      taskId: newTask.id,
      taskCode: newTask.taskCode,
      taskTitle: newTask.title,
      operationType: 'create',
      operationTypeName: '创建临时任务',
      operatorId: newTask.assignerId,
      operatorName: newTask.assignerName,
      operationDate: now.split('T')[0],
      createdAt: now,
    };
    saveOperationRecords([record, ...operationRecords]);

    return newTask;
  }, [setTempTasks, operationRecords, saveOperationRecords, store]);

  // 更新临时任务
  const updateTempTask = useCallback((id: string, updates: Partial<TempTask>) => {
    setTempTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));

    // 异步持久化到后端（通过 Zustand Store）
    store.updateTask(id, {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.assigneeId !== undefined && { assigneeId: updates.assigneeId }),
      ...(updates.assigneeName !== undefined && { assigneeName: updates.assigneeName }),
      ...(updates.location !== undefined && { location: updates.location }),
      ...(updates.greenhouseId !== undefined && { greenhouseId: updates.greenhouseId }),
      ...(updates.greenhouseName !== undefined && { greenhouseName: updates.greenhouseName }),
      ...(updates.priority !== undefined && { priority: updates.priority, urgency: updates.priority }),
      ...(updates.estimatedHours !== undefined && { estimatedHours: updates.estimatedHours }),
      ...(updates.actualHours !== undefined && { actualHours: updates.actualHours }),
      ...(updates.workerCount !== undefined && { workerCount: updates.workerCount }),
      ...(updates.progress !== undefined && { progress: updates.progress }),
      ...(updates.remarks !== undefined && { remarks: updates.remarks }),
      ...(updates.rejectReason !== undefined && { rejectReason: updates.rejectReason }),
      ...(updates.rejectCount !== undefined && { rejectCount: updates.rejectCount }),
      ...(updates.completionRemarks !== undefined && { completionRemarks: updates.completionRemarks }),
      ...(updates.acceptanceRemarks !== undefined && { acceptanceRemarks: updates.acceptanceRemarks }),
      ...(updates.requiredFeedback !== undefined && { requiredFeedback: updates.requiredFeedback }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
      ...(updates.completedAt !== undefined && { completedAt: updates.completedAt }),
    });
  }, [setTempTasks, store]);

  // 更新临时任务状态
  const updateTempTaskStatus = useCallback((id: string, status: TempTaskStatus, rejectReason?: string) => {
    const computedUpdates: Partial<TempTask> = {};

    setTempTasks(prev => prev.map(task => {
      if (task.id !== id) return task;

      const now = new Date().toISOString();
      const updates: Partial<TempTask> = {
        status,
        updatedAt: now,
      };

      if (status === 'completed') {
        updates.completedAt = now;
      }

      // 开始执行时记录接受时间（仅在首次记录）
      if (status === 'in_progress' && !task.acceptedAt) {
        updates.acceptedAt = now;
      }

      if (rejectReason) {
        updates.rejectReason = rejectReason;
      }

      // 保存计算的更新，用于异步持久化
      Object.assign(computedUpdates, updates);

  return { ...task, ...updates };
    }));

    // 异步持久化到后端（通过 Zustand Store）
    if (computedUpdates.status) {
      store.updateTask(id, {
        status: computedUpdates.status,
        updatedAt: computedUpdates.updatedAt,
        ...(computedUpdates.completedAt && { completedAt: computedUpdates.completedAt }),
        ...(computedUpdates.rejectReason && { rejectReason: computedUpdates.rejectReason }),
      });
    }
  }, [setTempTasks, store]);

  // 提交完成（执行人提交）
  const submitCompletion = useCallback((id: string, hours: number, remarks: string) => {
    const task = tempTasks.find(t => t.id === id);
    if (!task) {
      console.warn('[useTempTasks] submitCompletion: 未找到任务', id);
      return;
    }

    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    // 创建操作记录
    const record: TempTaskOperationRecord = {
      id: `TEMP_OP_${Date.now()}`,
      recordCode: generateRecordCode(),
      taskId: task.id,
      taskCode: task.taskCode,
      taskTitle: task.title,
      operationType: 'complete',
      operationTypeName: '提交完成',
      operatorId: task.assigneeId,
      operatorName: task.assigneeName,
      operationDate: nowStr,
      time: timeStr,
      hours,
      remarks,
      createdAt: now.toISOString(),
    };
    saveOperationRecords([record, ...operationRecords]);

    // 更新任务
    updateTempTask(id, {
      status: 'waiting_acceptance',
      actualHours: hours,
      completionRemarks: remarks,
    });
  }, [tempTasks, operationRecords, saveOperationRecords, updateTempTask]);

  // 审核通过
  const acceptCompletion = useCallback((id: string, acceptanceRemarks?: string) => {
    const task = tempTasks.find(t => t.id === id || t.taskCode === id);
    if (!task) {
      console.warn('[useTempTasks] acceptCompletion: 未找到任务', id, '当前任务IDs:', tempTasks.map(t => t.id));
      return;
    }

    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    // 创建操作记录
    const record: TempTaskOperationRecord = {
      id: `TEMP_OP_${Date.now()}`,
      recordCode: generateRecordCode(),
      taskId: task.id,
      taskCode: task.taskCode,
      taskTitle: task.title,
      operationType: 'accept_confirm',
      operationTypeName: '审核通过',
      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: nowStr,
      time: timeStr,
      remarks: acceptanceRemarks,
      createdAt: now.toISOString(),
    };
    saveOperationRecords([record, ...operationRecords]);

    // 更新任务状态和验收意见
    updateTempTask(id, {
      status: 'completed',
      completedAt: now.toISOString(),
      acceptanceRemarks: acceptanceRemarks,
    });
  }, [tempTasks, operationRecords, saveOperationRecords, updateTempTask]);

  // 审核驳回
  const rejectCompletion = useCallback((id: string, reason: string) => {
    const task = tempTasks.find(t => t.id === id || t.taskCode === id);
    if (!task) {
      console.warn('[useTempTasks] rejectCompletion: 未找到任务', id);
      return;
    }

    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    // 创建操作记录
    const record: TempTaskOperationRecord = {
      id: `TEMP_OP_${Date.now()}`,
      recordCode: generateRecordCode(),
      taskId: task.id,
      taskCode: task.taskCode,
      taskTitle: task.title,
      operationType: 'reject',
      operationTypeName: '审核驳回',
      operatorId: task.assignerId,
      operatorName: task.assignerName,
      operationDate: nowStr,
      time: timeStr,
      rejectReason: reason,
      createdAt: now.toISOString(),
    };
    saveOperationRecords([record, ...operationRecords]);

    // 更新驳回次数和新状态
    const newRejectCount = (task.rejectCount || 0) + 1;
    updateTempTask(id, {
      rejectCount: newRejectCount,
      rejectReason: reason,
      // 第2次驳回后进入待重新派发状态
      status: newRejectCount >= 2 ? 'pending_reassign' : 'in_progress',
    });
  }, [tempTasks, operationRecords, saveOperationRecords, updateTempTask]);

  // 删除临时任务
  const deleteTempTask = useCallback((id: string) => {
    setTempTasks(prev => prev.filter(task => task.id !== id));

    // 同步删除后端数据（通过 Zustand Store）
    store.deleteTask(id);
  }, [setTempTasks, store]);

  // 获取临时任务
  const getTempTask = useCallback((id: string) => {
    return tempTasks.find(task => task.id === id);
  }, [tempTasks]);

  // 获取执行人的临时任务
  const getTempTasksByAssignee = useCallback((assigneeId: string) => {
    return tempTasks.filter(task => task.assigneeId === assigneeId);
  }, [tempTasks]);

  // 获取临时任务的操作记录
  const getOperationRecordsByTaskId = useCallback((taskId: string) => {
    return operationRecords.filter(record => record.taskId === taskId);
  }, [operationRecords]);

  return {
    tempTasks,
    setTempTasks,
    operationRecords,
    addTempTask,
    updateTempTask,
    updateTempTaskStatus,
    submitCompletion,
    acceptCompletion,
    rejectCompletion,
    deleteTempTask,
    getTempTask,
    getTempTasksByAssignee,
    getOperationRecordsByTaskId,
  };
}

// 导出类型
export type { TempTask, TempTaskOperationRecord };
