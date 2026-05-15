/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect, useMemo } from 'react';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { useFarmTaskStore, type Task as FarmTask } from '../../../stores/farmTaskStore';

import { useUserStore } from '@/stores/useUserStore';

// 导入统一任务管理 Hook（数据闭环核心）
import { useTasks } from '../../../hooks/useTasks';
import { useOperationRecords } from '../../../hooks/useOperationRecords';

// 导入子组件
import { TaskFilterTabs } from './TaskFilterTabs';
import { TaskPagination } from './TaskPagination';
import { TempTaskTableRow } from './TempTaskTableRow';
import { ProblemTaskTableRow } from './ProblemTaskTableRow';
import { ProductionTaskTableRow } from './ProductionTaskTableRow';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskFeedbackModal } from './TaskFeedbackModal';
import { TaskRejectModal } from './TaskRejectModal';
import { TaskSopModal } from './TaskSopModal';

// 导入类型和常量
import { TaskFilterType, FeedbackFormData, TaskWithExtras } from './types';
import { formatDateShort, formatExpectedEndDate, STATUS_MAP } from './constants';

// 导入 Task 类型（从 useTasks）
import { Task } from '../../../hooks/useTasks';

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
  const { tasks: unifiedTasks, updateTaskStatus, updateTask, updateTaskProgress, submitProgress, acceptTask, rejectByExecutor, continueExecution, getTaskRecordsByTaskId } = useTasks();
  const { addTaskRecord, getRecordsByTaskId } = useOperationRecords();

  // 从 Zustand Store 获取任务数据（作为统一任务加载失败时的降级数据源）
  const storeTasks = useFarmTaskStore((s) => s.tasks);
  const fetchStoreTasks = useFarmTaskStore((s) => s.fetchTasks);

  // 组件挂载时确保 Store 有数据
  useEffect(() => {
    if (storeTasks.length === 0) {
      fetchStoreTasks();
    }
  }, []);

  // 强制刷新key，用于刷新任务列表状态
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取当前用户名（从 Zustand Store，原型阶段默认使用陆启闯）
  const currentUserName = useUserStore((s) => s.users[0]?.name) || '陆启闯';

  // 使用统一任务数据（优先使用 unifiedTasks，因为它有正确的持久化）
  // 降级：unifiedTasks 为空时使用 Store 数据
  const myTasks: (FarmTask | Task)[] = unifiedTasks.length > 0
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
        startDate: t.startDate || '',
        requiredFeedback: t.requiredFeedback || [],
        feedbackRequirements: t.feedbackRequirements || [],
        remarks: t.remarks || '',
        // 任务配置
        typeConfig: (t as TaskWithExtras).typeConfig || {},
        sopContent: (t as TaskWithExtras).sopContent || '',
        materials: t.materials || [],
        tools: t.tools || [],
        // 关联字段
        sourceProblemId: (t as TaskWithExtras).sourceProblemId,
        // 来源类型（用于区分临时任务和生产任务）
        sourceType: (t as TaskWithExtras).sourceType,
        // 临时任务特有字段
        workLocation: (t as TaskWithExtras).workLocation || '',
        urgency: (t as TaskWithExtras).urgency || 'normal',
        tempTaskType: (t as TaskWithExtras).tempTaskType || '',
        workerCount: (t as TaskWithExtras).workerCount || 1,
        totalEstimatedHours: (t as TaskWithExtras).totalEstimatedHours || 0,
        // 巡查反馈处理表格字段（用于 taskFilter === 'problem' 时显示）
        sourceId: (t as TaskWithExtras).sourceId,
        recordCode: (t as TaskWithExtras).recordCode,
        inspectionType: (t as TaskWithExtras).inspectionType || 'farm',
        submitterId: (t as TaskWithExtras).submitterId,
        submitterName: (t as TaskWithExtras).submitterName || (t as TaskWithExtras).assignerName || '',
        location: (t as TaskWithExtras).location || t.greenhouseName || t.field || '',
        checkDate: (t as TaskWithExtras).checkDate || t.planStart?.split(' ')[0] || '',
        checkTime: (t as TaskWithExtras).checkTime || '',
        checkResult: (t as TaskWithExtras).checkResult || '',
        issueCategories: (t as TaskWithExtras).issueCategories || [],
        issueSeverity: (t as TaskWithExtras).issueSeverity || '',
        issueText: (t as TaskWithExtras).issueText || '',
        photos: (t as TaskWithExtras).photos || [],
        feedbackStatus: (t as TaskWithExtras).feedbackStatus || t.status,
        feedbackUsers: (t as TaskWithExtras).feedbackUsers || [],
        processProgress: (t as TaskWithExtras).processProgress || t.progress || 0,
        inspectorId: (t as TaskWithExtras).inspectorId,
        inspectorName: (t as TaskWithExtras).inspectorName || (t as TaskWithExtras).assignerName || '',
        // 用于排序的创建时间字段
        createdAt: (t as TaskWithExtras).createdAt || '',
      }))
    : storeTasks.map(t => ({
        id: t.id,
        taskCode: t.taskCode || t.id,
        title: t.title || '',
        types: [] as string[],
        typeLabel: t.typeName || '',
        typeName: t.typeName || '',
        field: t.greenhouseName || t.field || '',
        crop: t.cropName || t.crop || '',
        assignee: t.assigneeName || t.assignee || '',
        assigneeName: t.assigneeName || t.assignee || '',
        planStart: t.planStart || t.startTime || '',
        planEnd: t.planEnd || t.dueDate || '',
        progress: t.progress || 0,
        status: t.status as string,
        priority: t.priority || 'normal',
        estimatedDays: t.estimatedDays || 0,
        estimatedHours: t.estimatedHours || 0,
        dueDate: t.dueDate || '',
        startDate: t.startTime || '',
        requiredFeedback: t.feedbackRequirements || [],
        feedbackRequirements: t.feedbackRequirements || [],
        remarks: t.remarks || '',
        typeConfig: t.typeConfig || {},
        sopContent: t.sopContent || '',
        materials: t.materials || [],
        tools: t.tools || [],
        sourceProblemId: t.sourceProblemId,
        sourceType: t.sourceType,
        workLocation: t.greenhouseName || '',
        urgency: t.priority || 'normal',
        tempTaskType: '',
        workerCount: 1,
        totalEstimatedHours: t.estimatedHours || 0,
        sourceId: t.sourceInspectionId,
        recordCode: '',
        inspectionType: 'farm',
        submitterId: t.assignerId,
        submitterName: t.assignerName || '',
        location: t.greenhouseName || t.field || '',
        checkDate: t.planStart?.split(' ')?.[0] || '',
        checkTime: '',
        checkResult: '',
        issueCategories: [] as string[],
        issueSeverity: '',
        issueText: '',
        photos: [] as string[],
        feedbackStatus: t.status,
        feedbackUsers: [] as string[],
        processProgress: t.progress || 0,
        inspectorId: '',
        inspectorName: t.assignerName || '',
        createdAt: t.createdAt || '',
      }));
      // 注：unifiedTasks 优先；Store 任务作为降级数据源，字段映射保持兼容

  // 任务筛选状态：全部 / 问题处理 / 生产任务 / 临时任务
  const [taskFilter, setTaskFilter] = useState<TaskFilterType>('all');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 根据筛选过滤任务（并按创建时间倒序排列，最新在前）
  const filteredTasks = useMemo(() => {
    // 排序函数：按创建时间倒序（最新在前）
    // 使用时间戳比较，确保无效日期也能正确排序
    const sortByCreatedAt = (a: FarmTask | Task | Task, b: FarmTask | Task | Task) => {
      const getCreatedAtTime = (task: FarmTask | Task | Task): number => {
        const timeStr = (task as TaskWithExtras).createdAt || (task as TaskWithExtras).planStart || (task as TaskWithExtras).startDate || '';
        if (!timeStr) return 0;
        const date = new Date(timeStr);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      };
      const aTime = getCreatedAtTime(a);
      const bTime = getCreatedAtTime(b);
      // 倒序，最新在前：bTime - aTime
      // 无效日期（0）会排在最后
      return bTime - aTime;
    };

    switch (taskFilter) {
      case 'problem':
        // 问题处理任务：有 sourceProblemId 的任务，按创建时间倒序
        return myTasks
          .filter(task => task.sourceProblemId !== undefined)
          .sort(sortByCreatedAt);
      case 'production':
        // 生产任务：没有 sourceProblemId 且不是临时任务的任务，按创建时间倒序
        return myTasks
          .filter(task => !task.sourceProblemId && (task as TaskWithExtras).sourceType !== 'tempTask')
          .sort(sortByCreatedAt);
      case 'temp':
        // 临时任务 Tab：筛选 sourceType === 'tempTask' 且非草稿状态，按开始时间倒序
        return myTasks
          .filter(task => (task as TaskWithExtras).sourceType === 'tempTask' && task.status !== 'draft')
          .sort((a, b) => {
            const getTime = (t: TaskWithExtras): number => {
              const timeStr = t.startDate || t.planStart || '';
              if (!timeStr) return 0;
              const date = new Date(timeStr);
              return isNaN(date.getTime()) ? 0 : date.getTime();
            };
            return getTime(b as TaskWithExtras) - getTime(a as TaskWithExtras);
          });
      default:
        // 全部任务也按创建时间倒序
        return [...myTasks].sort(sortByCreatedAt);
    }
  }, [myTasks, taskFilter, refreshKey]);

  // 计算分页
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTasks.length);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  // 统计各类型任务数量
  const taskCounts = useMemo(() => ({
    all: myTasks.length,
    problem: myTasks.filter(t => t.sourceProblemId !== undefined).length,
    production: myTasks.filter(t => !t.sourceProblemId && (t as TaskWithExtras).sourceType !== 'tempTask').length,
    temp: myTasks.filter(t => (t as TaskWithExtras).sourceType === 'tempTask').length,
  }), [myTasks]);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<FarmTask | Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopTask, setSelectedSopTask] = useState<FarmTask | Task | null>(null);

  // 详情弹窗引用（用于传递正确的数据）
  const openDetailModal = (task: FarmTask | Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // 使用 useProblemDispatch 获取流转方法
  const { acceptProblem, rejectProblem, submitProblemFeedback, addProgressRecord, getProblemFlowRecords } = useProblemDispatch();

  // 反馈表单状态
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    task: FarmTask | Task | null;
  }>({ isOpen: false, task: null });

  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormData>({
    resultStatus: '' as '' | '全部完成' | '部分完成' | '延迟完成' | '其他',
    resultText: '',
    progressText: '',
    progress: 0,
    workloadDays: '',
    workloadHours: '',
    workloadConfirm: null,
    photosBefore: [],
    photosAfter: [],
    gpsLocation: null,
    materialCode: '',
    voiceNote: '',
    cannotContinue: false,
    cannotContinueReason: '',
  });

  // 拒绝原因弹窗
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    task: FarmTask | Task | null;
  }>({ isOpen: false, task: null });

  const [rejectReason, setRejectReason] = useState('');

  // 处理接单 - 使用统一任务管理
  const handleAccept = (task: FarmTask | Task) => {
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
  const openRejectModal = (task: FarmTask | Task) => {
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
  const handleStartProcessing = (task: FarmTask | Task) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      updateTaskStatus(unifiedTask.id, 'in_progress');
    }
    setShowDetailModal(false);
  };

  // 打开反馈弹窗
  const openFeedbackModal = (task: FarmTask | Task) => {
    setFeedbackModal({ isOpen: true, task });
    setFeedbackForm({
      resultText: '',
      progressText: '',
      progress: task.progress || 0,
      workloadDays: '',
      workloadHours: '',
      photosBefore: [],
      photosAfter: [],
      gpsLocation: null,
      materialCode: '',
      voiceNote: '',
      cannotContinue: false,
      cannotContinueReason: '',
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
    try {
      if (!feedbackModal.task) {
        console.error('[提交反馈] 错误：feedbackModal.task 为空');
        return;
      }
      const task = feedbackModal.task;

      // 新增：处理"无法继续"逻辑
      if (feedbackForm.cannotContinue && feedbackForm.cannotContinueReason.trim()) {
        // 查找 unifiedTasks 中对应的任务
        const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
        if (unifiedTask) {
          // 1. 更新任务状态为已拒绝
          rejectByExecutor(
            unifiedTask.id,
            feedbackForm.cannotContinueReason,
            unifiedTask.assigneeId,
            unifiedTask.assigneeName
          );
          // 2. 同步更新问题状态（这样巡查反馈页面也能看到最新状态）
          if (task.sourceProblemId) {
            rejectProblem(task.sourceProblemId, 'U013', '陆启闯', feedbackForm.cannotContinueReason);
          }
          // 记录操作
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
            remarks: feedbackForm.cannotContinueReason,
            rejectReason: feedbackForm.cannotContinueReason,
          });
          // 触发刷新，确保任务列表显示最新状态
          setRefreshKey(prev => prev + 1);
        }
        setFeedbackModal({ isOpen: false, task: null });
        alert('已提交无法继续反馈，任务将重新分派');
        return;
      }

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
        progress: feedbackForm.progress,
      };

      if (task.sourceProblemId) {
        // 先记录进度流转（包含反馈数据）
        addProgressRecord(
          task.sourceProblemId,
          'U013',
          '陆启闯',
          feedbackForm.progress,
          feedbackForm.progressText || feedbackForm.resultText,
          feedbackData
        );
        // 进度100%时提交验收，否则只是进度反馈
        if (feedbackForm.progress === 100) {
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
        const isFinal = feedbackForm.progress === 100;
        // 调用 submitProgress 创建 TaskRecord（useTasks 系统的记录）
        submitProgress(unifiedTask.id, feedbackForm.progress, {
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
          progress: feedbackForm.progress,
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
      } else {
        console.error('[提交反馈] 错误：在 unifiedTasks 中找不到对应任务', { taskId: task.id, taskCode: task.taskCode });
      }

      setFeedbackModal({ isOpen: false, task: null });
      alert('提交成功！');
    } catch (error) {
      console.error('[提交反馈] 提交失败', error);
      alert('提交失败：' + (error instanceof Error ? error.message : String(error)));
    }
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
  const openSopModal = (task: FarmTask | Task, e: React.MouseEvent) => {
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
  const handleConfirmComplete = (task: FarmTask | Task) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      // 验收完成时确保进度为100%
      updateTaskProgress(unifiedTask.id, 100);
      updateTaskStatus(unifiedTask.id, 'completed');
    }
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // 继续执行 - 返工后恢复任务执行
  const handleContinueExecution = (task: FarmTask | Task) => {
    const unifiedTask = unifiedTasks.find(t => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      continueExecution(unifiedTask.id);
      // 记录操作
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'in_progress',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId: 'U013',
        operatorName: currentUserName,
        operationDate: new Date().toISOString().split('T')[0],
        sourceId: unifiedTask.id,
        sourceCode: unifiedTask.taskCode,
        progress: task.progress || 0,
        remarks: '执行人继续执行任务',
      });
      setRefreshKey(prev => prev + 1);
    }
  };

  // Tab切换时重置页码
  const handleFilterChange = (filter: TaskFilterType) => {
    setTaskFilter(filter);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 任务类型标签页筛选 */}
      <TaskFilterTabs
        taskFilter={taskFilter}
        taskCounts={taskCounts}
        onFilterChange={handleFilterChange}
      />

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
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">开始时间</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">预计结束</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">人工</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">总工时</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">紧急程度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">超时</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                  </>
                ) : taskFilter === 'problem' ? (
                  <>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查编号</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查类型</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">提交人</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">位置/对象</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查日期</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">巡查结果</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">问题分类</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">严重程度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">问题照片</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">反馈状态</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">反馈人员</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">处理进度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">备注</th>
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
                  <td colSpan={taskFilter === 'temp' ? 13 : taskFilter === 'problem' ? 14 : 14} className="px-4 py-12 text-center text-gray-400">
                    暂无任务
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const taskWithExtras = task as TaskWithExtras;
                  const isTempTask = taskWithExtras.sourceType === 'tempTask';
                  return (
                    <tr key={task.id} className={`hover:bg-blue-50 transition-colors ${isTempTask && taskWithExtras.urgency === 'critical' ? 'bg-red-50' : ''}`}>
                      {taskFilter === 'temp' ? (
                        <TempTaskTableRow
                          task={task}
                          onAccept={handleAccept}
                          onReject={openRejectModal}
                          onContinueExecution={handleContinueExecution}
                          onOpenFeedbackModal={openFeedbackModal}
                          onOpenDetailModal={openDetailModal}
                        />
                      ) : taskFilter === 'problem' ? (
                        <ProblemTaskTableRow
                          task={task}
                          unifiedTasks={unifiedTasks}
                          acceptTask={acceptTask}
                          onAccept={handleAccept}
                          onReject={openRejectModal}
                          onContinueExecution={handleContinueExecution}
                          onOpenFeedbackModal={openFeedbackModal}
                          onOpenDetailModal={openDetailModal}
                        />
                      ) : (
                        <ProductionTaskTableRow
                          task={task}
                          onAccept={handleAccept}
                          onReject={openRejectModal}
                          onContinueExecution={handleContinueExecution}
                          onOpenFeedbackModal={openFeedbackModal}
                          onOpenDetailModal={openDetailModal}
                          onOpenSopModal={openSopModal}
                        />
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <TaskPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={filteredTasks.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 详情弹窗 */}
      <TaskDetailModal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => { setShowDetailModal(false); setSelectedTask(null); }}
        task={selectedTask}
        problemFlowRecords={getCurrentProblemFlowRecords()}
        operationRecords={getCurrentOperationRecords()}
        taskRecords={getCurrentTaskRecords()}
        getActualWorkload={getActualWorkload}
      />

      {/* 反馈表单弹窗 */}
      <TaskFeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => { setFeedbackModal({ isOpen: false, task: null }); }}
        task={feedbackModal.task}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        problemFlowRecords={feedbackModal.task?.sourceProblemId ? getProblemFlowRecords(feedbackModal.task.sourceProblemId) : []}
        validateRequiredFeedback={validateRequiredFeedback}
        onSubmit={handleSubmitFeedback}
      />

      {/* 拒绝原因弹窗 */}
      <TaskRejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => { setRejectModal({ isOpen: false, task: null }); setRejectReason(''); }}
        task={rejectModal.task}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onConfirm={handleReject}
      />

      {/* SOP文件查看弹窗 */}
      <TaskSopModal
        isOpen={showSopModal}
        onClose={() => { setShowSopModal(false); setSelectedSopTask(null); }}
        task={selectedSopTask}
      />
    </div>
  );
}

export default MyTasksPage;
