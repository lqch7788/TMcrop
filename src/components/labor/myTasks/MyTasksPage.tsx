/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect, useMemo } from 'react';
import { Edit, FileText, CheckCircle, XCircle, Play, Upload, Eye, Clock, AlertTriangle, MapPin, User } from 'lucide-react';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { Modal } from '../../ui/Modal';
import { TaskTypeConfigDisplay } from '../../farm/taskDispatch/components/TaskTypeConfigDisplay';
import { taskDispatchTasks, TaskDispatchTask } from '../../../data/farmMockData';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { FeedbackInput, FEEDBACK_OPTIONS } from '../../common/FeedbackInput';
import { TEMP_TASK_URGENCY_CONFIG } from '../../../types';

// 导入统一任务管理 Hook（数据闭环核心）
import { useTasks } from '../../../hooks/useTasks';
import { useOperationRecords } from '../../../hooks/useOperationRecords';

// 导入任务配置（用于详情弹窗的流转记录显示）
import { TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../config/taskConfig';

// 任务类型定义
const taskTypes = [
  { value: 'fertilization', label: '施肥', color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', color: 'bg-emerald-500' },
  { value: 'other', label: '其他', color: 'bg-gray-500' },
];

// 状态映射（扩展支持问题处理流程）
const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'bg-gray-100', color: 'text-gray-600', label: '草稿' },
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-600', label: '已接受' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '进行中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '已拒绝' },
  failed: { bg: 'bg-purple-100', color: 'text-purple-600', label: '任务失败' },
  cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: '已取消' },
  abandoned: { bg: 'bg-red-50', color: 'text-red-400', label: '已放弃' },
};

// 优先级映射
const priorityMap: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-red-500', label: '紧急' },
  high: { color: 'text-orange-500', label: '高' },
  medium: { color: 'text-yellow-500', label: '中' },
  low: { color: 'text-green-500', label: '低' },
  normal: { color: 'text-gray-500', label: '普通' },
};

// 获取任务类型颜色
const getTypeColor = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.color || 'bg-gray-500';
};

// 获取任务类型标签
const getTypeLabel = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.label || type;
};

export function MyTasksPage() {
  // 使用统一任务管理 Hook（数据闭环核心）
  const { tasks: unifiedTasks, updateTaskStatus, updateTask, updateTaskProgress, submitProgress, acceptTask, rejectByExecutor, continueExecution, operationRecords, getTaskRecordsByTaskId } = useTasks();
  const { addTaskRecord, records: operationRecordsList, getRecordsByTaskId } = useOperationRecords();

  // 从 localStorage 读取任务（仅用于兼容旧数据初始化）
  // 注意：问题分派的任务存储在 TASKS key 下
  const [localTasks, setLocalTasks] = useLocalStorage<TaskDispatchTask[]>(STORAGE_KEYS.TASKS, []);

  // 获取当前用户名（原型阶段默认使用陆启闯）
  const currentUserName = localStorage.getItem('username') || '陆启闯';

  // 使用统一任务数据（优先使用 unifiedTasks，因为它有正确的持久化）
  // 兼容处理：如果是 Task[] 类型直接使用，否则从 unifiedTasks 获取
  const myTasks: (TaskDispatchTask | Task)[] = unifiedTasks.length > 0
    ? unifiedTasks.map(t => ({
        id: t.id,
        taskCode: t.taskCode || t.id,
        title: t.title || '',
        types: t.types || [],
        typeLabel: t.typeName || '',
        typeName: t.typeName || '',
        field: t.field || t.greenhouseName || '',
        crop: t.crop || t.cropName || '',
        assignee: t.assigneeName || t.assignee || '',
        assigneeName: t.assigneeName || t.assignee || '',
        planStart: t.planStart || '',
        planEnd: t.planEnd || '',
        progress: t.progress || 0,
        status: t.status as string,
        priority: t.priority || 'normal',
        estimatedDays: t.estimatedDays || 0,
        estimatedHours: t.estimatedHours || 0,
        dueDate: t.dueDate || '',
        requiredFeedback: t.requiredFeedback || [],
        feedbackRequirements: t.feedbackRequirements || [],
        remarks: t.remarks || '',
        // 任务配置
        typeConfig: (t as any).typeConfig || {},
        sopContent: (t as any).sopContent || '',
        materials: t.materials || [],
        tools: t.tools || [],
        // 关联字段
        sourceProblemId: (t as any).sourceProblemId,
        // 来源类型（用于区分临时任务和生产任务）
        sourceType: (t as any).sourceType,
        // 临时任务特有字段
        workLocation: (t as any).workLocation || '',
        urgency: (t as any).urgency || 'normal',
        tempTaskType: (t as any).tempTaskType || '',
        workerCount: (t as any).workerCount || 1,
        totalEstimatedHours: (t as any).totalEstimatedHours || 0,
      }))
    : localTasks.length > 0 ? localTasks : taskDispatchTasks;

  // 任务筛选状态：全部 / 问题处理 / 生产任务 / 临时任务
  const [taskFilter, setTaskFilter] = useState<'all' | 'problem' | 'production' | 'temp'>('all');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 根据筛选过滤任务
  const filteredTasks = useMemo(() => {
    switch (taskFilter) {
      case 'problem':
        // 问题处理任务：有 sourceProblemId 的任务
        return myTasks.filter(task => task.sourceProblemId !== undefined);
      case 'production':
        // 生产任务：没有 sourceProblemId 且不是临时任务的任务
        return myTasks.filter(task => !task.sourceProblemId && (task as any).sourceType !== 'tempTask');
      case 'temp':
        // 临时任务 Tab：筛选 sourceType === 'tempTask' 且非草稿状态
        return myTasks.filter(task => (task as any).sourceType === 'tempTask' && task.status !== 'draft');
      default:
        return myTasks;
    }
  }, [myTasks, taskFilter]);

  // 计算分页
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTasks.length);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  // 统计各类型任务数量
  const taskCounts = useMemo(() => ({
    all: myTasks.length,
    problem: myTasks.filter(t => t.sourceProblemId !== undefined).length,
    production: myTasks.filter(t => !t.sourceProblemId && (t as any).sourceType !== 'tempTask').length,
    temp: myTasks.filter(t => (t as any).sourceType === 'tempTask').length,
  }), [myTasks]);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<TaskDispatchTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopTask, setSelectedSopTask] = useState<TaskDispatchTask | null>(null);

  // 详情弹窗引用（用于传递正确的数据）
  const openDetailModal = (task: TaskDispatchTask) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // 使用 useProblemDispatch 获取流转方法
  const { acceptProblem, rejectProblem, submitProblemFeedback, addProgressRecord, approveProblemCompletion, getProblemFlowRecords } = useProblemDispatch();
  const { problems } = usePersistentProblems();

  // 反馈表单状态
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    task: TaskDispatchTask | null;
  }>({ isOpen: false, task: null });

  const [feedbackForm, setFeedbackForm] = useState({
    resultText: '',
    progressText: '',
    workloadDays: '',
    workloadHours: '',
    workloadConfirm: null as { days: number; hours: number; workers: number } | null,
    photosBefore: [] as string[],
    photosAfter: [] as string[],
    gpsLocation: null as { lat: number; lng: number } | null,
    materialCode: '',
    voiceNote: '',
  });

  // 拒绝原因弹窗
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    task: TaskDispatchTask | null;
  }>({ isOpen: false, task: null });

  const [rejectReason, setRejectReason] = useState('');

  // 处理接单 - 使用统一任务管理
  const handleAccept = (task: TaskDispatchTask) => {
    if (task.sourceProblemId) {
      acceptProblem(task.sourceProblemId, 'U013', '陆启闯');
    }
    // 查找 unifiedTasks 中对应的任务并接受
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      acceptTask(unifiedTask.id);
      // 记录接单操作
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'accepted',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId: 'U013',
        operatorName: currentUserName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: unifiedTask.id,
        sourceCode: unifiedTask.taskCode,
        progress: 0,
        remarks: '执行人已接受任务',
      });
    }
    setShowDetailModal(false);
  };

  // 打开拒绝弹窗
  const openRejectModal = (task: TaskDispatchTask) => {
    setRejectModal({ isOpen: true, task });
    setRejectReason('');
  };

  // 处理拒绝 - 执行人拒绝任务，任务状态变为rejected，可重新派发
  const handleReject = () => {
    if (!rejectModal.task || !rejectReason.trim()) return;
    const task = rejectModal.task;
    if (task.sourceProblemId) {
      rejectProblem(task.sourceProblemId, 'U013', '陆启闯', rejectReason);
    }
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      rejectByExecutor(unifiedTask.id, rejectReason, unifiedTask.assigneeId, unifiedTask.assigneeName);
      // 记录拒绝操作
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'rejected',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId: 'U013',
        operatorName: currentUserName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: unifiedTask.id,
        sourceCode: unifiedTask.taskCode,
        progress: task.progress || 0,
        remarks: rejectReason,
        rejectReason: rejectReason,
      });
    }
    setRejectModal({ isOpen: false, task: null });
    setRejectReason('');
    setShowDetailModal(false);
  };

  // 开始处理 - 使用统一任务管理
  const handleStartProcessing = (task: TaskDispatchTask) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      updateTaskStatus(unifiedTask.id, 'in_progress');
    }
    setShowDetailModal(false);
  };

  // 打开反馈弹窗
  const openFeedbackModal = (task: TaskDispatchTask) => {
    setFeedbackModal({ isOpen: true, task });
    setFeedbackForm({
      resultText: '',
      progressText: '',
      workloadDays: '',
      workloadHours: '',
      photosBefore: [],
      photosAfter: [],
      gpsLocation: null,
      materialCode: '',
      voiceNote: '',
    });
    setShowDetailModal(false);
  };

  // 校验必填反馈是否完成
  const validateRequiredFeedback = (): { valid: boolean; message: string } => {
    if (!feedbackModal.task?.requiredFeedback || feedbackModal.task.requiredFeedback.length === 0) {
      return { valid: true, message: '' };
    }

    const required = feedbackModal.task.requiredFeedback;
    const { workloadConfirm, gpsLocation, photosBefore, photosAfter, materialCode, voiceNote } = feedbackForm;

    if (required.includes('workload_confirm') && !workloadConfirm) {
      return { valid: false, message: '请确认工作量' };
    }
    if (required.includes('gps') && !gpsLocation) {
      return { valid: false, message: '请完成位置打卡' };
    }
    if (required.includes('photo_before') && (!photosBefore || photosBefore.length === 0)) {
      return { valid: false, message: '请上传作业前照片' };
    }
    if (required.includes('photo_after') && (!photosAfter || photosAfter.length === 0)) {
      return { valid: false, message: '请上传作业后照片' };
    }
    if (required.includes('material') && !materialCode) {
      return { valid: false, message: '请扫码或输入物资编码' };
    }
    if (required.includes('voice') && !voiceNote) {
      return { valid: false, message: '请录制语音备注' };
    }

    return { valid: true, message: '' };
  };

  // 提交反馈
  const handleSubmitFeedback = () => {
    if (!feedbackModal.task) return;
    const task = feedbackModal.task;

    // 校验必填反馈
    const validation = validateRequiredFeedback();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    // 构建反馈数据（工作量、GPS、照片、语音等）
    const feedbackData = {
      workloadConfirm: feedbackForm.workloadConfirm || undefined,
      gpsLocation: feedbackForm.gpsLocation || undefined,
      photosBefore: feedbackForm.photosBefore.length > 0 ? feedbackForm.photosBefore : undefined,
      photosAfter: feedbackForm.photosAfter.length > 0 ? feedbackForm.photosAfter : undefined,
      materialCode: feedbackForm.materialCode || undefined,
      voiceNote: feedbackForm.voiceNote || undefined,
      progress: task.progress || 0,
    };

    if (task.sourceProblemId) {
      // 先记录进度流转（包含反馈数据）
      addProgressRecord(
        task.sourceProblemId,
        'U013',
        '陆启闯',
        task.progress || 0,
        feedbackForm.progressText || feedbackForm.resultText,
        feedbackData
      );
      // 进度100%时提交验收，否则只是进度反馈
      if (task.progress === 100) {
        submitProblemFeedback(task.sourceProblemId, 'U013', '陆启闯', {
          resultText: feedbackForm.resultText,
          actualWorkload: feedbackForm.workloadConfirm
            ? (feedbackForm.workloadConfirm.days * 24 + feedbackForm.workloadConfirm.hours)
            : (feedbackForm.workloadDays || feedbackForm.workloadHours
              ? (parseFloat(feedbackForm.workloadDays || '0') * 24 + parseFloat(feedbackForm.workloadHours || '0'))
              : undefined),
          feedbackData,
        });
      }
    }

    // ========== 数据闭环：同步到 useTasks ==========
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      const isFinal = task.progress === 100;
      // 调用 submitProgress 创建 TaskRecord（useTasks 系统的记录）
      submitProgress(unifiedTask.id, task.progress || 0, {
        remarks: feedbackForm.resultText || feedbackForm.progressText,
        workload: feedbackForm.workloadConfirm
          ? (feedbackForm.workloadConfirm.days * 24 + feedbackForm.workloadConfirm.hours)
          : (feedbackForm.workloadHours ? parseFloat(feedbackForm.workloadHours) : undefined),
        isFinal,
        gpsLocation: feedbackForm.gpsLocation || undefined,
        photosBefore: feedbackForm.photosBefore.length > 0 ? feedbackForm.photosBefore : undefined,
        photosAfter: feedbackForm.photosAfter.length > 0 ? feedbackForm.photosAfter : undefined,
        voiceNote: feedbackForm.voiceNote || undefined,
        materialCode: feedbackForm.materialCode || undefined,
        workloadDays: feedbackForm.workloadConfirm?.days,
        workloadHours: feedbackForm.workloadConfirm?.hours,
        workers: feedbackForm.workloadConfirm?.workers,
      });

      // ========== 数据闭环：同步到 useOperationRecords ==========
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: isFinal ? 'waiting_acceptance' : 'in_progress',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId: 'U013',
        operatorName: currentUserName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: unifiedTask.id,
        sourceCode: unifiedTask.taskCode,
        progress: task.progress,
        remarks: feedbackForm.resultText,
        workloadDays: feedbackForm.workloadConfirm?.days,
        workloadHours: feedbackForm.workloadConfirm?.hours,
        workers: feedbackForm.workloadConfirm?.workers,
        gpsLocation: feedbackForm.gpsLocation || undefined,
        photosBefore: feedbackForm.photosBefore.length > 0 ? feedbackForm.photosBefore : undefined,
        photosAfter: feedbackForm.photosAfter.length > 0 ? feedbackForm.photosAfter : undefined,
        voiceNote: feedbackForm.voiceNote || undefined,
        materialCode: feedbackForm.materialCode || undefined,
      });
    }

    setFeedbackModal({ isOpen: false, task: null });
  };

  // 获取当前任务关联的问题流转记录
  const getCurrentProblemFlowRecords = () => {
    if (!selectedTask?.sourceProblemId) return [];
    return getProblemFlowRecords(selectedTask.sourceProblemId);
  };

  // 获取当前任务关联的操作记录（useOperationRecords）
  const getCurrentOperationRecords = () => {
    if (!selectedTask) return [];
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find(t => t.taskCode === selectedTask.id || t.id === selectedTask.id);
    if (!unifiedTask) return [];
    // 使用 getRecordsByTaskId 根据 sourceId 获取记录
    return getRecordsByTaskId(unifiedTask.id);
  };

  // 获取当前任务关联的 TaskRecord 记录（useTasks 系统）
  const getCurrentTaskRecords = () => {
    if (!selectedTask) return [];
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find(t => t.taskCode === selectedTask.id || t.id === selectedTask.id);
    if (!unifiedTask) return [];
    // 使用 getTaskRecordsByTaskId 获取 useTasks 系统的记录
    return getTaskRecordsByTaskId(unifiedTask.id);
  };

  // 汇总任务记录中的实际完成工作量
  const getActualWorkload = () => {
    const records = getCurrentTaskRecords();
    let totalDays = 0;
    let totalHours = 0;
    let totalWorkers = 0;
    let recordCount = 0;

    records.forEach(record => {
      if (record.feedback) {
        if (record.feedback.workloadDays) {
          totalDays += record.feedback.workloadDays;
          recordCount++;
        }
        if (record.feedback.workloadHours) {
          totalHours += record.feedback.workloadHours;
          recordCount++;
        }
        // 人数取最大值（不累加，因为同一人执行）
        if (record.feedback.workers && record.feedback.workers > totalWorkers) {
          totalWorkers = record.feedback.workers;
        }
      }
    });

    // 如果没有记录，从 progress 字段估算
    if (recordCount === 0 && selectedTask?.progress && selectedTask.progress > 0) {
      const estimatedTotal = ((selectedTask.estimatedDays || 0) * 8 + (selectedTask.estimatedHours || 0));
      if (estimatedTotal > 0) {
        totalHours = Math.round(estimatedTotal * (selectedTask.progress / 100) * 10) / 10;
      }
    }

    return { days: totalDays, hours: totalHours, workers: totalWorkers };
  };

  // 打开SOP弹窗
  const openSopModal = (task: TaskDispatchTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSopTask(task);
    setShowSopModal(true);
  };

  // 更新任务进度 - 使用统一任务管理
  const handleProgressChange = (taskId: string, progress: number) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === taskId || t.id === taskId);
    if (unifiedTask) {
      updateTaskProgress(unifiedTask.id, progress);
    }
    // 更新当前选中的任务显示
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, progress } : null);
    }
    // 注意：进度100%时不自动改变状态，用户需要通过提交反馈来确认完成
  };

  // 确认完成 - 使用统一任务管理
  const handleConfirmComplete = (task: TaskDispatchTask) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      updateTaskStatus(unifiedTask.id, 'completed');
    }
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // 渲染任务类型单元格
  const renderTypeCell = (task: TaskDispatchTask) => {
    const types = task.types || [];
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {types.slice(0, 2).map((typeValue: string, idx: number) => {
          const typeLabel = getTypeLabel(typeValue);
          return typeLabel === '其他' ? (
            <span key={idx} className="text-orange-500 text-xs">其他</span>
          ) : (
            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
              {typeLabel}
            </span>
          );
        })}
        {types.length > 2 && (
          <span className="text-xs text-gray-500">+{types.length - 2}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800">我的任务</div>
            <div className="text-sm text-blue-600 mt-1">
              这里显示所有分配给您的任务。完成任务后，可通过进度滑块更新任务进度。
            </div>
          </div>
        </div>
      </div>

      {/* 任务类型标签页筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setTaskFilter('all'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'all'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            全部任务
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {taskCounts.all}
            </span>
          </button>
          <button
            onClick={() => { setTaskFilter('problem'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'problem'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            生产问题处理
            <span className="px-2 py-0.5 bg-orange-200 text-orange-600 rounded-full text-xs">
              {taskCounts.problem}
            </span>
          </button>
          <button
            onClick={() => { setTaskFilter('production'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'production'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            农事任务处理
            <span className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded-full text-xs">
              {taskCounts.production}
            </span>
          </button>
          <button
            onClick={() => { setTaskFilter('temp'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'temp'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            临时任务处理
            <span className="px-2 py-0.5 bg-orange-200 text-orange-600 rounded-full text-xs">
              {taskCounts.temp}
            </span>
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {taskFilter === 'temp' ? (
                  <>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">任务编号</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">任务名称</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">类型</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">工作地点</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">负责人</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">截止日期</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">预计天数</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">人工</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">总工时</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">紧急程度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">超时</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务ID</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">进度</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作业标准</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={taskFilter === 'temp' ? 13 : 14} className="px-4 py-12 text-center text-gray-400">
                    暂无任务
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const types = task.types || [];
                  const isTempTask = (task as any).sourceType === 'tempTask';
                  const totalHours = ((task.estimatedDays || 0) * 8 + (task.estimatedHours || 0)) * ((task as any).workerCount || 1);
                  return (
                    <tr key={task.id} className={`hover:bg-blue-50 transition-colors ${isTempTask && (task as any).urgency === 'critical' ? 'bg-red-50' : ''}`}>
                      {taskFilter === 'temp' ? (
                        <>
                          <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
                            <button
                              onClick={() => openDetailModal(task)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              title="点击查看详情"
                            >
                              {task.taskCode}
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isTempTask && (task as any).urgency === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                              <span className="font-medium text-gray-900 text-sm">{task.title}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{(task as any).typeName || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {task.field || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {task.assigneeName || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {(task as any).dueDate || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-gray-600">{(task as any).estimatedDays || 0}天</td>
                          <td className="px-3 py-3 text-center text-sm text-gray-600">{(task as any).workerCount || 1}人</td>
                          <td className="px-3 py-3 text-center text-sm font-medium text-emerald-600">{totalHours}h</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status]?.bg || 'bg-gray-100'} ${statusMap[task.status]?.color || 'text-gray-600'}`}>
                              {statusMap[task.status]?.label || task.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${TEMP_TASK_URGENCY_CONFIG[(task as any).urgency]?.badge || 'bg-gray-100 text-gray-600'}`}>
                              {TEMP_TASK_URGENCY_CONFIG[(task as any).urgency]?.label || (task as any).urgency || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {/* 超时状态由执行人端判断，暂不显示 */}
                            <span className="text-xs text-gray-400">-</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {task.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAccept(task)}
                                  className="flex items-center gap-1 px-2 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
                                  title="接受任务"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  接受
                                </button>
                                <button
                                  onClick={() => openRejectModal(task)}
                                  className="flex items-center gap-1 px-2 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
                                  title="拒绝任务"
                                >
                                  <XCircle className="w-3 h-3" />
                                  拒绝
                                </button>
                              </div>
                            )}
                            {(task.status === 'accepted' || task.status === 'in_progress') && (
                              <button
                                onClick={() => openFeedbackModal(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                                title="点击提交进度"
                              >
                                <Edit className="w-4 h-4" />
                                提交进度
                              </button>
                            )}
                            {task.status === 'rejected' && (
                              <button
                                onClick={() => {
                                  const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
                                  if (unifiedTask) {
                                    continueExecution(unifiedTask.id);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                                title="继续完成任务后重新提交"
                              >
                                <Play className="w-4 h-4" />
                                继续执行
                              </button>
                            )}
                            {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
                              <button
                                onClick={() => openDetailModal(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
                                title="点击查看详情"
                              >
                                <Eye className="w-4 h-4" />
                                查看
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
                            <button
                              onClick={() => openDetailModal(task)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              title="点击查看详情"
                            >
                              {task.id}
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {renderTypeCell(task)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.field || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.crop || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{task.assigneeName || '-'}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.planStart?.split(' ')[0] || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.planEnd || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {((task.estimatedDays || 0) * 8 + (task.estimatedHours || 0)) || 0}小时
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : (task.progress || 0) > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{task.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`text-xs font-medium ${priorityMap[task.priority]?.color || 'text-gray-500'}`}>
                              {priorityMap[task.priority]?.label || task.priority}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status]?.bg || 'bg-gray-100'} ${statusMap[task.status]?.color || 'text-gray-600'}`}>
                              {statusMap[task.status]?.label || task.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={task.typeLabel || '-'}>
                            {task.typeLabel || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {types.length >= 2 && task.sopContent ? (
                              <button
                                onClick={(e) => openSopModal(task, e)}
                                className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                SOP文件
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {task.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAccept(task)}
                                  className="flex items-center gap-1 px-2 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
                                  title="接受任务"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  接受
                                </button>
                                <button
                                  onClick={() => openRejectModal(task)}
                                  className="flex items-center gap-1 px-2 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
                                  title="拒绝任务"
                                >
                                  <XCircle className="w-3 h-3" />
                                  拒绝
                                </button>
                              </div>
                            )}
                            {(task.status === 'accepted' || task.status === 'in_progress') && (
                              <button
                                onClick={() => openFeedbackModal(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                                title="点击提交进度"
                              >
                                <Edit className="w-4 h-4" />
                                提交进度
                              </button>
                            )}
                            {task.status === 'rejected' && (
                              <>
                                <button
                                  onClick={() => {
                                    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
                                    if (unifiedTask) {
                                      continueExecution(unifiedTask.id);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                                  title="继续完成任务后重新提交"
                                >
                                  <Play className="w-4 h-4" />
                                  继续执行
                                </button>
                                <button
                                  onClick={() => openDetailModal(task)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
                                  title="点击查看详情"
                                >
                                  <Eye className="w-4 h-4" />
                                  查看
                                </button>
                              </>
                            )}
                            {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
                              <button
                                onClick={() => openDetailModal(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
                                title="点击查看详情"
                              >
                                <Eye className="w-4 h-4" />
                                查看
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {filteredTasks.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      <Modal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => { setShowDetailModal(false); setSelectedTask(null); }}
        title={`任务详情 - ${selectedTask?.id || ''}`}
        size="xl"
        showFooter={false}
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{selectedTask.field || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{selectedTask.crop || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">负责人</label>
                  <p className="font-semibold text-gray-900">陆启闯</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[selectedTask.priority]?.color || ''}`}>
                    {priorityMap[selectedTask.priority]?.label || selectedTask.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* 任务类型 - 单一类型显示详细信息，多类型显示SOP下载 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型配置</h4>
              {(selectedTask.types || []).length === 1 ? (
                <TaskTypeConfigDisplay
                  taskType={selectedTask.types[0]}
                  configValues={selectedTask.typeConfig || {}}
                />
              ) : (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">作业标准文件</span>
                  </div>
                  {selectedTask.sopContent ? (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-sm text-gray-600 mb-2">已导入SOP文档</p>
                      <button
                        onClick={() => {
                          const blob = new Blob([selectedTask.sopContent || ''], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `任务SOP_${selectedTask.id}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        下载SOP文件
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">暂无SOP文件</p>
                  )}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">已选择的操作类型：</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTask.types || []).map((t: string) => {
                        return (
                          <span
                            key={t}
                            className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
                          >
                            {getTypeLabel(t)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 所需物资 */}
            {selectedTask.materials && selectedTask.materials.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需物资</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="text-left pb-2">物资名称</th>
                        <th className="text-right pb-2">数量</th>
                        <th className="text-right pb-2">单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTask.materials.map((m: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-gray-900">{m.name}</td>
                          <td className="py-2 text-gray-900 text-right">{m.qty}</td>
                          <td className="py-2 text-gray-500 text-right">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planStart || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planEnd || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status]?.bg || ''} ${statusMap[selectedTask.status]?.color || ''}`}>
                      {statusMap[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">预计时长</label>
                  <p className="font-semibold text-gray-900">
                    {selectedTask.estimatedDays > 0 ? `${selectedTask.estimatedDays}天` : ''}
                    {selectedTask.estimatedHours > 0 ? `${selectedTask.estimatedHours}小时` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* 实际完成工作量 */}
            {(() => {
              const actualWorkload = getActualWorkload();
              const hasActualWorkload = actualWorkload.days > 0 || actualWorkload.hours > 0;
              if (!hasActualWorkload) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">实际完成工作量</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-green-600">实际工日</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.days > 0 ? `${actualWorkload.days}天` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-green-600">实际工时</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.hours > 0 ? `${actualWorkload.hours}小时` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-green-600">作业人数</label>
                        <p className="font-bold text-green-700 text-lg">
                          {actualWorkload.workers > 0 ? `${actualWorkload.workers}人` : '-'}
                        </p>
                      </div>
                    </div>
                    {selectedTask.estimatedDays !== undefined && selectedTask.estimatedHours !== undefined && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-green-600">
                          预估总工时：{(selectedTask.estimatedDays * 8 + selectedTask.estimatedHours)}小时 → 实际总工时：{actualWorkload.days * 8 + actualWorkload.hours}小时
                          {actualWorkload.days * 8 + actualWorkload.hours > 0 && (
                            <span className={`ml-2 ${actualWorkload.days * 8 + actualWorkload.hours > selectedTask.estimatedDays * 8 + selectedTask.estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                              ({actualWorkload.days * 8 + actualWorkload.hours > selectedTask.estimatedDays * 8 + selectedTask.estimatedHours ? '超出' : '节省'}
                              {Math.abs((actualWorkload.days * 8 + actualWorkload.hours) - (selectedTask.estimatedDays * 8 + selectedTask.estimatedHours)).toFixed(1)}小时)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 必填反馈 */}
            {selectedTask.requiredFeedback && selectedTask.requiredFeedback.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">必填反馈</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.requiredFeedback.map((fb: string) => (
                    <span key={fb} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {fb === 'gps' && '位置打卡'}
                      {fb === 'material' && '物资扫码'}
                      {fb === 'photo_before' && '作业前照片'}
                      {fb === 'photo_after' && '作业后照片'}
                      {fb === 'voice' && '语音备注'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 流转记录 */}
            {selectedTask.sourceProblemId && getCurrentProblemFlowRecords().length > 0 && (
              <div>
                <TaskFlowTimeline records={getCurrentProblemFlowRecords()} />
              </div>
            )}

            {/* 操作记录（useOperationRecords） */}
            {(() => {
              const opRecords = getCurrentOperationRecords();
              if (opRecords.length === 0) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">操作记录</h4>
                  <div className="space-y-4">
                    {opRecords.map((record) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {record.operationTypeName || record.operationType}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{record.operatorName}</span>
                          </div>
                          <span className="text-xs text-gray-500">{record.operationDate}</span>
                        </div>
                        {/* 显示子记录（children） */}
                        {record.children && record.children.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-gray-300 space-y-3">
                            {record.children.map((child) => (
                              <div key={child.id} className="bg-white rounded p-3 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                      {child.operationTypeName || child.operationType}
                                    </span>
                                    <span className="text-xs text-gray-600">{child.operatorName}</span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {child.time || child.operationDate}
                                  </span>
                                </div>
                                {/* 工作量 */}
                                {(child.workloadDays || child.workloadHours || child.workers) && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    工作量：{child.workloadDays && `${child.workloadDays}天`}
                                    {child.workloadHours && `${child.workloadHours}小时`}
                                    {child.workers && `×${child.workers}人`}
                                  </div>
                                )}
                                {/* 进度 */}
                                {child.progress !== undefined && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    进度：{child.progress}%
                                    {child.progressIncrement !== undefined && child.progressIncrement > 0 && (
                                      <span className="text-emerald-600 ml-1">(+{child.progressIncrement}%)</span>
                                    )}
                                  </div>
                                )}
                                {/* GPS位置 */}
                                {child.gpsLocation && (
                                  <div className="text-xs text-emerald-600 mb-1">
                                    GPS：{child.gpsLocation.lat.toFixed(6)}, {child.gpsLocation.lng.toFixed(6)}
                                  </div>
                                )}
                                {/* 照片 */}
                                {(child.photosBefore?.length || child.photosAfter?.length) && (
                                  <div className="text-xs text-blue-600 mb-1">
                                    照片：{child.photosBefore?.length || 0}张(前) + {child.photosAfter?.length || 0}张(后)
                                  </div>
                                )}
                                {/* 语音 */}
                                {child.voiceNote && (
                                  <div className="text-xs text-purple-600 mb-1">语音备注</div>
                                )}
                                {/* 物料 */}
                                {child.materials && child.materials.length > 0 && (
                                  <div className="text-xs text-orange-600 mb-1">
                                    物料：{child.materials.map(m => `${m.name}×${m.qty}`).join(', ')}
                                  </div>
                                )}
                                {/* 备注 */}
                                {child.remarks && (
                                  <div className="text-sm text-gray-700 bg-gray-50 rounded px-2 py-1 mt-1">
                                    {child.remarks}
                                  </div>
                                )}
                                {/* 驳回原因 */}
                                {child.rejectReason && (
                                  <div className="text-sm text-red-600 bg-red-50 rounded px-2 py-1 mt-1">
                                    驳回原因：{child.rejectReason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 任务流转记录（useTasks.taskRecords） */}
            {(() => {
              const taskRecords = getCurrentTaskRecords();
              if (taskRecords.length === 0) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">任务流转记录</h4>
                  <div className="space-y-4">
                    {taskRecords.map((record) => {
                      const actionConfig = TASK_ACTION_CONFIG[record.action as keyof typeof TASK_ACTION_CONFIG];
                      const statusFromConfig = record.fromStatus ? TASK_STATUS_CONFIG[record.fromStatus as keyof typeof TASK_STATUS_CONFIG] : null;
                      const statusToConfig = record.toStatus ? TASK_STATUS_CONFIG[record.toStatus as keyof typeof TASK_STATUS_CONFIG] : null;
                      return (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {actionConfig?.label || record.actionName || record.action}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{record.operatorName}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(record.actionTime).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {/* 状态变化 */}
                        {(record.fromStatus || record.toStatus) && (
                          <div className="flex items-center gap-1 mb-2 text-xs">
                            {record.fromStatus && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                                {statusFromConfig?.label || record.fromStatus}
                              </span>
                            )}
                            <span className="text-gray-400">→</span>
                            {record.toStatus && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                {statusToConfig?.label || record.toStatus}
                              </span>
                            )}
                          </div>
                        )}
                        {/* 进度 */}
                        {record.progress !== undefined && (
                          <div className="text-xs text-gray-600 mb-1">
                            进度：{record.progress}%
                            {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                              <span className="text-emerald-600 ml-1">(+{record.progressIncrement}%)</span>
                            )}
                          </div>
                        )}
                        {/* 反馈内容 */}
                        {record.feedback && (
                          <div className="mt-2 space-y-1">
                            {record.feedback.text && (
                              <div className="text-sm text-gray-700 bg-white rounded p-2">
                                {record.feedback.text}
                              </div>
                            )}
                            {record.feedback.gpsLocation && (
                              <div className="text-xs text-emerald-600">
                                GPS：{record.feedback.gpsLocation.lat.toFixed(6)}, {record.feedback.gpsLocation.lng.toFixed(6)}
                              </div>
                            )}
                            {record.feedback.images && record.feedback.images.length > 0 && (
                              <div className="text-xs text-blue-600">
                                照片：{record.feedback.images.length}张
                              </div>
                            )}
                            {record.feedback.voiceNote && (
                              <div className="text-xs text-purple-600">语音备注</div>
                            )}
                            {record.feedback.materials && record.feedback.materials.length > 0 && (
                              <div className="text-xs text-orange-600">
                                物料：{record.feedback.materials.map(m => `${m.name}×${m.qty}`).join(', ')}
                              </div>
                            )}
                            {/* 工作量确认 */}
                            {(record.feedback.workloadDays !== undefined || record.feedback.workloadHours !== undefined || record.feedback.workers !== undefined) && (
                              <div className="text-xs text-cyan-600">
                                工作量确认：
                                {record.feedback.workloadDays !== undefined && `${record.feedback.workloadDays}天`}
                                {record.feedback.workloadHours !== undefined && `${record.feedback.workloadHours}小时`}
                                {record.feedback.workers !== undefined && `×${record.feedback.workers}人`}
                              </div>
                            )}
                            {/* 物资编码 */}
                            {record.feedback.materialCode && (
                              <div className="text-xs text-pink-600">
                                物资编码：{record.feedback.materialCode}
                              </div>
                            )}
                          </div>
                        )}
                        {/* 备注 */}
                        {record.comment && (
                          <div className="text-sm text-gray-600 bg-white rounded p-2 mt-2">
                            {record.comment}
                          </div>
                        )}
                        {/* 驳回原因 */}
                        {record.reason && (
                          <div className="text-sm text-red-600 bg-red-50 rounded p-2 mt-2">
                            驳回原因：{record.reason}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 进度（只读） */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  />
                </div>
                <span className="w-14 text-sm font-medium text-gray-700 text-center">
                  {selectedTask.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedTask.progress === 100 ? '已完成' : selectedTask.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 反馈表单弹窗 */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => { setFeedbackModal({ isOpen: false, task: null }); }}
        title="任务处理"
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setFeedbackModal({ isOpen: false, task: null }); }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={
                !feedbackModal.task ||
                (feedbackModal.task.progress === 100
                  ? !(feedbackForm?.resultText || '').trim()
                  : !(feedbackForm?.progressText || '').trim()) ||
                !validateRequiredFeedback().valid
              }
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交反馈
            </button>
          </div>
        }
      >
        {feedbackModal.task && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.field || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.crop || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">负责人</label>
                  <p className="font-semibold text-gray-900">陆启闯</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[feedbackModal.task.priority]?.color || ''}`}>
                    {priorityMap[feedbackModal.task.priority]?.label || feedbackModal.task.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.planStart || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.planEnd || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[feedbackModal.task.status]?.bg || ''} ${statusMap[feedbackModal.task.status]?.color || ''}`}>
                      {statusMap[feedbackModal.task.status]?.label || feedbackModal.task.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">任务类型</label>
                  <p className="font-semibold text-gray-900">{getTypeLabel(feedbackModal.task.types?.[0] || '')}</p>
                </div>
              </div>
            </div>

            {/* 流转记录 */}
            {feedbackModal.task.sourceProblemId && getProblemFlowRecords(feedbackModal.task.sourceProblemId).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">流转记录</h4>
                <TaskFlowTimeline records={getProblemFlowRecords(feedbackModal.task.sourceProblemId)} />
              </div>
            )}

            {/* 执行进度（可操作） */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={feedbackModal.task.progress || 0}
                  onChange={(e) => {
                    const newProgress = parseInt(e.target.value);
                    // 只更新弹窗内的本地状态，实际提交通过 handleSubmitFeedback 使用 unifiedTasks
                    setFeedbackModal(prev => ({
                      ...prev,
                      task: prev.task ? { ...prev.task, progress: newProgress } : null
                    }));
                  }}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="w-14 text-sm font-medium text-gray-700 text-center bg-gray-100 rounded px-2 py-1">
                  {feedbackModal.task.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {feedbackModal.task.progress === 100 ? '已完成，可提交反馈' :
                 feedbackModal.task.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>

            {/* 必填反馈输入区域 */}
            {feedbackModal.task.requiredFeedback && feedbackModal.task.requiredFeedback.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  必填反馈项
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feedbackModal.task.requiredFeedback.includes('workload_confirm') && (
                    <FeedbackInput
                      type="workload_confirm"
                      value={feedbackForm.workloadConfirm}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, workloadConfirm: v }))}
                    />
                  )}
                  {feedbackModal.task.requiredFeedback.includes('gps') && (
                    <FeedbackInput
                      type="gps"
                      value={feedbackForm.gpsLocation}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, gpsLocation: v }))}
                    />
                  )}
                  {feedbackModal.task.requiredFeedback.includes('photo_before') && (
                    <FeedbackInput
                      type="photo_before"
                      value={feedbackForm.photosBefore}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, photosBefore: v }))}
                    />
                  )}
                  {feedbackModal.task.requiredFeedback.includes('photo_after') && (
                    <FeedbackInput
                      type="photo_after"
                      value={feedbackForm.photosAfter}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, photosAfter: v }))}
                    />
                  )}
                  {feedbackModal.task.requiredFeedback.includes('material') && (
                    <FeedbackInput
                      type="material"
                      value={feedbackForm.materialCode}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, materialCode: v }))}
                    />
                  )}
                  {feedbackModal.task.requiredFeedback.includes('voice') && (
                    <FeedbackInput
                      type="voice"
                      value={feedbackForm.voiceNote}
                      onChange={(v) => setFeedbackForm(prev => ({ ...prev, voiceNote: v }))}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 反馈表单（任何进度都可以提交） */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm text-amber-800">
                {feedbackModal.task.progress === 100
                  ? '提交反馈后，任务将进入"待验收"状态，等待管理者确认完成。'
                  : '提交进度反馈后，任务将继续进行，可再次提交直到100%。'}
              </div>
            </div>

            {/* 100%时显示处理结果和工作量 */}
            {feedbackModal.task.progress === 100 ? (
              <>
                {/* 处理结果 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    处理结果 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackForm.resultText}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, resultText: e.target.value }))}
                    placeholder="请描述处理过程和结果..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </>
            ) : (
              /* 小于100%时显示进展情况 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  进展情况 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedbackForm.progressText}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, progressText: e.target.value }))}
                  placeholder="请描述当前处理进度和下一步计划..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 拒绝原因弹窗 */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => { setRejectModal({ isOpen: false, task: null }); setRejectReason(''); }}
        title="拒绝任务"
        size="md"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setRejectModal({ isOpen: false, task: null }); setRejectReason(''); }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认拒绝
            </button>
          </div>
        }
      >
        {rejectModal.task && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                拒绝任务后，该问题将重新回到"待分派"状态。
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拒绝原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* SOP文件查看弹窗 */}
      <Modal
        isOpen={showSopModal}
        onClose={() => { setShowSopModal(false); setSelectedSopTask(null); }}
        title={`作业标准文件 - ${selectedSopTask?.id || ''}`}
        size="lg"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end">
            <button
              onClick={() => setShowSopModal(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        }
      >
        {selectedSopTask && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">任务类型：</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(selectedSopTask.types || []).map((t: string) => (
                  <span
                    key={t}
                    className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
                  >
                    {getTypeLabel(t)}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{selectedSopTask.sopContent || '暂无SOP内容'}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyTasksPage;
