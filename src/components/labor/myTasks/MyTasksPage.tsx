/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect, useMemo } from 'react';
import { User, BookMarked } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { useFarmTaskStore, type Task as FarmTask } from '../../../stores/farmTaskStore';
import { useInspectionDataStore } from '../../../stores/useInspectionDataStore';

import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateUtils';

// 导入统一任务管理 Hook（数据闭环核心）
import { useTasks } from '../../../hooks/useTasks';
import { useOperationRecords } from '../../../hooks/useOperationRecords';

// 导入子组件
import { TaskFilterTabs } from './TaskFilterTabs';
import { WorkLogPage } from '../worklog/WorkLogPage';
import { Pagination } from '@/components/ui';
import { ProblemTaskTableRow } from './ProblemTaskTableRow';
import { ProductionTaskTableRow } from './ProductionTaskTableRow';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskFeedbackModal } from './TaskFeedbackModal';
import { TaskRejectModal } from './TaskRejectModal';
import { TaskSopModal } from './TaskSopModal';
// 2026-10-21 P4：巡查记录提交/重提弹窗（表单与巡查记录 tab 共用一份逻辑）
import { InspectionRecordModal } from '../../farm/hub/modals/InspectionRecordModal';

// 导入类型和常量
import { TaskFilterType, FeedbackFormData, TaskWithExtras } from './types';
import { formatDateShort, formatExpectedEndDate, STATUS_MAP } from './constants';

// 导入 UI 组件
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

// 导入 Task 类型（从 useTasks）
import { Task } from '../../../hooks/useTasks';
import { useUserStore } from '../../../stores/useUserStore';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';

// 任务类型定义
// 2026-10-20 P0-10：取值从唯一真相源派生（此前是第三份副本，含 pesticide/rootIrrigation 等别名）
const TYPE_COLOR_MAP: Record<string, string> = {
  planting: 'bg-lime-500',
  irrigation: 'bg-blue-500',
  fertilization: 'bg-green-500',
  pest_control: 'bg-red-500',
  pruning: 'bg-purple-500',
  harvest: 'bg-orange-500',
  weeding: 'bg-emerald-500',
  farm_repair: 'bg-amber-500',
  equipment_repair: 'bg-amber-600',
  cleaning: 'bg-slate-500',
  seedling: 'bg-teal-500',
  other: 'bg-gray-500',
};
const taskTypes = FARM_OPERATION_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
  color: TYPE_COLOR_MAP[t.value] ?? 'bg-gray-500',
}));

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

// ============================================================
// 2026-10-10（审核修复）：三个 tab 的过滤谓词提取为单一真相源。
//   此前列表过滤（filteredTasks）与徽章计数（taskCounts）各写一套条件、
//   口径互不一致（巡查反馈徽章 14 vs 内容 17、农事任务处理 37 vs 22）。
//   现两处共用以下谓词，口径永不分叉。
// ============================================================

/**
 * 「巡查计划任务」tab：巡查计划生成的待巡实例（2026-10-23 新增）
 *
 * 从「巡查反馈处理」里拆出来的原因：
 *   · 语义不同 —— 这里是「该去巡什么」（执行任务），那边是「巡出来的记录 + 问题整改」；
 *   · 动作不同 —— 这里接受/填写巡查记录，那边提交进度/验收整改；
 *   · 列不同 —— 任务要看"什么时候在哪巡什么"，记录要看"巡查结果/严重程度/问题分类"。
 * 混在一起时，实例用记录列展示导致字段全空、还与导入台账重复。
 */
function matchesInspectionPlanTabFilter(task: any): boolean {
  if (!task.inspectionPlanId) return false;
  // 已取消的实例不进本 tab（暂停/归档/改期会批量产生 cancelled 台账，
  // 实测 131 条里 66 条是 cancelled）。历史台账到「全部任务」或计划详情里查。
  if (String(task.status) === 'cancelled') return false;
  return true;
}

/** 「巡查反馈处理」tab：巡查记录台账 + 问题整改（不含巡查计划实例） */
function matchesProblemTabFilter(task: any): boolean {
  // 巡查计划实例归「巡查计划任务」tab，这里排除，避免两个 tab 重复
  if (task.inspectionPlanId) return false;
  const dm = task.dispatchMode;
  if (dm === 'problem' || dm === 'inspection') return true;
  // 2026-10-20：改用**真值**判断。后端未关联时返回 null/''，
  //   而 `!== undefined` 对 null 也成立 → 会把每条任务都误判成问题任务。
  if (task.sourceProblemId || task.sourceInspectionId) return true;
  return false;
}

/**
 * 未来巡查实例判定：巡查计划生成、且执行日晚于今天。
 * 2026-10-22（遗留项 1）：抽成模块级纯函数，分页分组与渲染共用同一判据。
 */
function isFutureInspectionTask(task: any, today: string): boolean {
  return !!task.inspectionPlanId
    && !!task.planOccurrenceDate
    && String(task.planOccurrenceDate) > today;
}

/**
 * 「农事任务处理」tab：纯农事任务
 *
 * 2026-10-20 修复（state-auditor MEDIUM-3）：此前用 `taskCode.startsWith('NS')` 判定，
 * 而农事任务中心用的是 `dispatchMode === 'farm'` —— 两套口径导致同一任务在两页归类不同
 * （如 smart 派工产生的 farm 任务、编号非 NS 前缀的任务，在中心可见、在这里消失）。
 * 现改为与服务端/农事任务中心一致的语义判定：排除 temp / 巡查 / 问题来源，其余即农事任务。
 */
function matchesProductionTabFilter(task: any): boolean {
  const dm = task.dispatchMode;
  if (dm === 'tempTask' || dm === 'problem' || dm === 'inspection') return false;
  // 2026-10-21（阶段 2）：不再按 sourceType==='tempTask' 排除 ——
  //   迁移后的任务 dispatchMode 已是 'farm'，sourceType 只是历史来源标记；
  //   继续排除会让它们在「农事任务处理」和「临时任务处理」两个 tab 都不显示。
  if (task.sourceProblemId || task.sourceInspectionId) return false;
  // 2026-10-23：巡查计划实例归到「巡查反馈处理」tab，这里排除，避免两个 tab 重复出现
  if (task.inspectionPlanId) return false;
  return true;
}


export function MyTasksPage() {
  // 使用统一任务管理 Hook（数据闭环核心）
  const { tasks: unifiedTasks, updateTaskStatus, updateTask, updateTaskProgress, submitProgress, acceptTask, rejectByExecutor, continueExecution, getTaskRecordsByTaskId } = useTasks() as any;
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

  // 2026-10-10（审核修复）：操作人取自当前登录用户 —— 原为 useUserStore.users[0].name +
  //   硬编码兜底「陆启闯」、操作 id 写死 'U013'，与登录账号无关，审计记录张冠李戴。
  //   本页所有 acceptProblem/rejectProblem/addTaskRecord/submitProblemFeedback 均以此为操作人
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentUserName = currentUser?.realName || currentUser?.username || '未知用户';
  const operatorId = currentUser?.oid || '';

  // 用户列表：用于把巡查"反馈人员"列存用户 OID 的值解析为姓名显示（2026-10-11）
  const users = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  const userDisplayName = (v: string) => {
    // 存量数据两种写法都有：users.id（USER_ID_xxx）与 oid（user-admin），双字段匹配
    const u = users.find((x) => x.id === v || x.oid === v);
    return u ? (u.name || (u as any).realName || u.username || v) : v;
  };

  /**
   * 巡查记录索引（2026-10-23）
   *
   * 巡查结果 / 严重程度 / 问题分类 / 巡查日期只存在 inspections 表，
   * farm_tasks 行上没有这些列。原来列表靠「空值当异常」的兜底显示，掩盖了字段缺失。
   * 这里按「任务 id」和「记录编号」两个键建索引，给任务行补全真实记录信息。
   */
  const inspectionRecordList = useInspectionDataStore((s) => s.records);
  const recordsByTaskId = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of inspectionRecordList as any[]) {
      if (r?.inspectionTaskId) m.set(String(r.inspectionTaskId), r);
    }
    return m;
  }, [inspectionRecordList]);
  const recordsByCode = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of inspectionRecordList as any[]) {
      if (r?.recordCode) m.set(String(r.recordCode), r);
    }
    return m;
  }, [inspectionRecordList]);

  /** 取任务对应的巡查记录：优先按任务 id，其次按记录编号 */
  const recordOf = (t: any) =>
    recordsByTaskId.get(String(t?.id ?? ''))
    || recordsByCode.get(String(t?.inspectionRecordCode || t?.recordCode || ''));

  /**
   * 记录 → 巡查结果文案。
   *
   * 巡查结果在后端有三个可能的落点，必须按优先级逐个试，否则有记录却显示「—」：
   *   1. checkResult（若已回填）
   *   2. result（提交载荷里的字段，不一定落库）
   *   3. status —— 实际落库位置：正常 = 'normal'，异常 = 'critical'
   *      （实测 XT20261024-001：checkResult=null、status='critical'）
   */
  const resultOf = (rec: any): string => {
    if (!rec) return '';
    const check = String(rec.checkResult || '').trim();
    if (check) return check;
    const r = String(rec.result || '').toLowerCase();
    if (r === 'normal') return '正常';
    if (r === 'abnormal') return '异常';
    const st = String(rec.status || '').toLowerCase();
    if (st === 'normal') return '正常';
    if (st === 'critical' || st === 'abnormal') return '异常';
    return '';
  };

  // 使用统一任务数据（优先使用 unifiedTasks，因为它有正确的持久化）
  // 降级：unifiedTasks 为空时使用 Store 数据
  const myTasks: any[] = unifiedTasks.length > 0
    ? unifiedTasks.map((t: any) => ({
        id: t.id,
        taskCode: t.taskCode || t.id,
        title: t.title || '',
        types: t.types || [],
        typeLabel: t.typeName || '',
        typeName: t.typeName || '',
        field: t.field || t.greenhouseName || '',
        crop: t.crop || t.cropName || '',
        // 2026-10-20：作物备注（「作物=其他」时的说明）
        cropRemarks: (t as TaskWithExtras).cropRemarks || '',
        assignee: t.assigneeName || t.assignee || '',
        assigneeName: t.assigneeName || t.assignee || '',
        // 2026-10-20 修复（用户反馈：返工中的任务在「我的任务」只剩「查看」）：
        //   此前只映射了 assignee/assigneeName，**漏了 assigneeId**。
        //   ProductionTaskTableRow 里「继续执行」的显示条件是
        //   `!isInspectionTask && !!task.assigneeId`，assigneeId 恒为 undefined
        //   → 按钮永不渲染，返工任务无法继续执行。
        assigneeId: t.assigneeId || '',
        planStart: t.planStart || '',
        planEnd: t.planEnd || '',
        progress: t.progress || 0,
        status: t.status as string,
        priority: t.priority || 'normal',
        estimatedDays: t.estimatedDays || 0,
        estimatedHours: t.estimatedHours || 0,
        dueDate: t.dueDate || '',
        startDate: t.startDate || '',
        requiredFeedback: t.requiredFeedback || (() => {
          // 兼容两种格式：后端返回 string[]（如 ['gps', 'photo_before']），
          // 种子数据返回 object[]（如 [{type:'gps', ...}]）
          const fq = t.feedbackRequirements;
          if (Array.isArray(fq)) {
            return fq.map((f: unknown) => typeof f === 'string' ? f : (f as { type?: string }).type || '');
          }
          return [];
        })(),
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
        // 2026-10-10（审核修复 H1）：补 dispatchMode / sourceInspectionId ——
        //   "巡查反馈处理"tab 过滤（filteredTasks case 'problem'）依赖这两个字段，
        //   修正前映射丢失它们 → 13 条巡查被整体过滤、tab 显示为 4 条错位内容
        dispatchMode: (t as any).dispatchMode,
        sourceInspectionId: (t as TaskWithExtras).sourceInspectionId,
        // 2026-10-21 P4：巡查计划实例标记（徽章 / 记录按钮 / 未来分组都依赖它，漏了三个功能全失效）
        inspectionPlanId: (t as TaskWithExtras).inspectionPlanId,
        planOccurrenceDate: (t as TaskWithExtras).planOccurrenceDate,
        inspectionRecordId: (t as TaskWithExtras).inspectionRecordId,
        inspectionRecordCode: (t as TaskWithExtras).inspectionRecordCode,
        // 临时任务特有字段
        workLocation: (t as TaskWithExtras).workLocation || '',
        urgency: (t as TaskWithExtras).urgency || 'normal',
        tempTaskType: (t as TaskWithExtras).tempTaskType || '',
        workerCount: (t as TaskWithExtras).workerCount || 1,
        totalEstimatedHours: (t as TaskWithExtras).totalEstimatedHours || 0,
        // 巡查反馈处理表格字段（用于 taskFilter === 'problem' 时显示）
        sourceId: (t as TaskWithExtras).sourceId,
        // 2026-10-23：补 sourceCode —— 巡查实例的 sourceCode 是**计划编号**（XHJH…），
        //   列表用它做主标识（否则只显示任务编号 NS…，看不出来自哪个计划）
        sourceCode: (t as TaskWithExtras).sourceCode,
        recordCode: (t as TaskWithExtras).recordCode,
        inspectionType: (t as TaskWithExtras).inspectionType || 'farm',
        submitterId: (t as TaskWithExtras).submitterId,
        submitterName: (t as TaskWithExtras).submitterName || (t as TaskWithExtras).assignerName || '',
        location: (t as TaskWithExtras).location || t.greenhouseName || t.field || '',
        // 2026-10-23：巡查计划实例的区域（plan.area）。提交巡查记录时应写它，
        //   而不是退回 location（= 温室名），否则计划配置的区域会被覆盖。
        areaName: (t as any).areaName || '',
        // 2026-10-23：巡查计划实例 / 有记录的任务，其「巡查结果 / 严重程度 / 问题分类 / 巡查日期」
        //   只存在 inspections 表，farm_tasks 行上没有这些列 → 原实现直接取空。
        //   这里用记录索引补全（不改变其它字段的来源）。
        checkDate: (t as TaskWithExtras).checkDate || recordOf(t)?.checkDate || t.planStart?.split(' ')[0] || '',
        checkTime: (t as TaskWithExtras).checkTime || recordOf(t)?.checkTime || '',
        checkResult: (t as TaskWithExtras).checkResult || resultOf(recordOf(t)),
        issueCategories: (t as TaskWithExtras).issueCategories || recordOf(t)?.issueCategories || [],
        issueSeverity: (t as TaskWithExtras).issueSeverity || recordOf(t)?.issueSeverity || '',
        issueText: (t as TaskWithExtras).issueText || '',
        photos: (t as TaskWithExtras).photos || [],
        feedbackStatus: (t as TaskWithExtras).feedbackStatus || t.status,
        // 2026-10-11：反馈人员存的是用户 OID（如 user-admin）时解析为姓名显示；
        //   兼容 string[]（实际数据）与 {id,name}[]（类型定义）两种形态
        feedbackUsers: (() => {
          const fq = (t as any).feedbackUsers;
          if (!Array.isArray(fq)) return [];
          return fq.map((v: any) => typeof v === 'string' ? userDisplayName(v) : (v?.name || v?.id || '')).filter(Boolean);
        })(),
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
        // 2026-10-20：降级映射同步补 cropRemarks
        cropRemarks: (t as { cropRemarks?: string }).cropRemarks || '',
        assignee: t.assigneeName || t.assignee || '',
        assigneeName: t.assigneeName || t.assignee || '',
        // 2026-10-20：降级分支同样补 assigneeId（与 unifiedTasks 映射口径一致）
        assigneeId: t.assigneeId || '',
        planStart: t.planStart || t.startTime || '',
        planEnd: t.planEnd || t.dueDate || '',
        progress: t.progress || 0,
        status: t.status as string,
        priority: t.priority || 'normal',
        estimatedDays: t.estimatedDays || 0,
        estimatedHours: t.estimatedHours || 0,
        dueDate: t.dueDate || '',
        startDate: t.startTime || '',
        requiredFeedback: (() => {
          // 兼容两种格式：后端返回 string[]，种子数据返回 object[]
          const fq = t.feedbackRequirements;
          if (Array.isArray(fq)) {
            return fq.map((f: unknown) => typeof f === 'string' ? f : (f as { type?: string }).type || '');
          }
          return [];
        })(),
        feedbackRequirements: t.feedbackRequirements || [],
        remarks: t.remarks || '',
        typeConfig: t.typeConfig || {},
        sopContent: t.sopContent || '',
        materials: t.materials || [],
        tools: t.tools || [],
        sourceProblemId: t.sourceProblemId,
        sourceType: t.sourceType,
        // 2026-10-10（审核修复 H1）：降级映射同步补字段，与 unifiedTasks 映射口径一致
        dispatchMode: (t as any).dispatchMode,
        sourceInspectionId: (t as any).sourceInspectionId,
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
        const timeStr = (task as unknown as TaskWithExtras).createdAt || (task as unknown as TaskWithExtras).planStart || (task as unknown as TaskWithExtras).startDate || '';
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
      case 'inspectionPlan':
        // 巡查计划任务（2026-10-23）：只含计划生成的待巡实例。
        // 排序：待执行优先 → 执行日升序（今天/逾期的最前）→ 创建时间倒序。
        return myTasks
          .filter(matchesInspectionPlanTabFilter)
          .sort((a, b) => {
            const actionable = (t: any) =>
              ['pending', 'accepted', 'in_progress', 'rejected'].includes(String(t.status)) ? 1 : 0;
            const aPri = actionable(a);
            const bPri = actionable(b);
            if (aPri !== bPri) return bPri - aPri;
            const aDate = String(a.planOccurrenceDate || a.planStart || '');
            const bDate = String(b.planOccurrenceDate || b.planStart || '');
            if (aDate !== bDate) return aDate.localeCompare(bDate);
            return sortByCreatedAt(a, b);
          });
      case 'problem':
        // 巡查记录台账 + 问题整改（过滤谓词见 matchesProblemTabFilter，与徽章计数共用）
        return myTasks
          .filter(matchesProblemTabFilter)
          .sort(sortByCreatedAt);
      case 'production':
        // 农事任务（过滤谓词见 matchesProductionTabFilter，与徽章计数共用）
        return myTasks
          .filter(matchesProductionTabFilter)
          .sort(sortByCreatedAt);
      // 2026-10-21（阶段 3）：临时任务 tab 已删除，其任务归入「农事任务处理」
      default:
        // 全部任务也按创建时间倒序
        return [...myTasks].sort(sortByCreatedAt);
    }
  }, [myTasks, taskFilter, refreshKey]);

  // 2026-10-21 P4：未来巡查分组（方案 §10.5）
  //   一个 daily 计划一次生成 14 条实例，若与今日待办平铺，今天要做的事会被未来计划淹没。
  //   判据：巡查计划任务且 plan_occurrence_date > 今天。
  const [showFutureInspections, setShowFutureInspections] = useState(false);
  const todayLocalStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD（本地时区）

  // 2026-10-22（遗留项 1）：改为「先分组、再分页」。
  //   原实现先按 filteredTasks 分页，再只在**当前页切片**里拆出未来任务：
  //   · 未来任务仍占用本页名额，可能出现「整页都是未来任务」的白跑页；
  //   · 折叠组的条数只是当前页的未来条数，其它页的未来任务散落在后面各页，
  //     用户必须逐页翻才能看到「未来一共排了多少」。
  //   现在分页只作用于今天及以前的待办；未来巡查组展示**全部**未来任务（默认收起）。
  const { currentPageTasks, futureInspectionTasks, totalPages } = useMemo(() => {
    const current: any[] = [];
    const future: any[] = [];
    for (const t of filteredTasks) {
      if (!isFutureInspectionTask(t, todayLocalStr)) {
        current.push(t);
      } else if (String(t.status) !== 'cancelled') {
        // 已取消的未来实例不进分组：暂停计划 / 编辑重排会批量产生 cancelled 台账
        //（实测 90 天测试计划一次留下 60 条），把它们算进「未来巡查（N）」
        // 会让用户以为有几十条待办要执行。台账仍在农事任务中心可查。
        future.push(t);
      }
    }
    const pages = Math.ceil(current.length / pageSize) || 1;
    const safePage = Math.min(currentPage, pages);
    const start = (safePage - 1) * pageSize;
    return {
      currentPageTasks: current.slice(start, start + pageSize),
      futureInspectionTasks: future,
      totalPages: pages,
    };
  }, [filteredTasks, todayLocalStr, currentPage, pageSize]);

  // 统计各类型任务数量
  // 2026-10-10（审核修复）：徽章计数与列表过滤共用同一组谓词（口径统一，
  //   修正前巡查反馈徽章 14 vs 内容 17、农事任务处理 37 vs 22 的两套标准问题）
  const taskCounts = useMemo(() => ({
    all: myTasks.length,
    problem: myTasks.filter(matchesProblemTabFilter).length,
    production: myTasks.filter(matchesProductionTabFilter).length,
    inspectionPlan: myTasks.filter(matchesInspectionPlanTabFilter).length,
  }), [myTasks]);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopTask, setSelectedSopTask] = useState<FarmTask | Task | null>(null);

  // 2026-10-21 P4：巡查记录提交/重提弹窗
  //   hasRecord 决定走「首次提交」还是「驳回重提」（后端两条不同路径）
  const [recordModal, setRecordModal] = useState<{
    isOpen: boolean;
    task: any | null;
    existingRecord: { id: string; recordCode: string } | null;
    /** true = 只读查看（已提交且非驳回态）；false = 填写或重提 */
    readOnly: boolean;
  }>({ isOpen: false, task: null, existingRecord: null, readOnly: false });

  /**
   * 打开巡查记录弹窗
   *
   * 2026-10-22（审核 P1-6）：要区分三种语义，原实现全走 resubmit：
   *   · 无记录              → 首次提交
   *   · 有记录 + 任务 rejected → 修改并重提（走 resubmit 端点）
   *   · 有记录 + 其它状态      → **只读查看**（此时 resubmit 必 409「仅驳回态允许」）
   */
  const openRecordModal = (task: any) => {
    const hasRecord = !!(task.inspectionRecordId || task.inspectionRecordCode);
    const canResubmit = String(task.status) === 'rejected';
    setRecordModal({
      isOpen: true,
      task,
      existingRecord: hasRecord
        ? { id: task.inspectionRecordId, recordCode: task.inspectionRecordCode }
        : null,
      readOnly: hasRecord && !canResubmit,
    });
  };

  // 详情弹窗引用（用于传递正确的数据）
  const openDetailModal = (task: any) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // 使用 useProblemDispatch 获取流转方法
  const { acceptProblem, rejectProblem, submitProblemFeedback, addProgressRecord, getProblemFlowRecords } = useProblemDispatch();

  // 反馈表单状态
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    task: any | null;
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
    task: any | null;
  }>({ isOpen: false, task: null });

  const [rejectReason, setRejectReason] = useState('');

  // 处理接单 - 使用统一任务管理
  const handleAccept = (task: any) => {
    // 2026-10-10（审核修复 H3/M1）：巡查来源的任务动作只走问题通道 ——
    //   巡查记录在 farm/temp store 中不存在，acceptTask 会发往 /farm-tasks（幽灵/404）
    const isInspectionTask = !!(task as any).sourceInspectionId;
    if (task.sourceProblemId) {
      acceptProblem(task.sourceProblemId, operatorId, currentUserName);
    }
    // 查找 unifiedTasks 中对应的任务并接受
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      if (!isInspectionTask) {
        acceptTask(unifiedTask.id);
      }
      // 记录接单操作（巡查/农事/临时统一记录，供详情弹窗"操作记录"读取）
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'accepted',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId,
        operatorName: currentUserName,
        operationDate: todayLocal(),
        sourceId: unifiedTask.id,
        sourceCode: unifiedTask.taskCode,
        progress: 0,
        remarks: '执行人已接受任务',
      });
    }
    setShowDetailModal(false);
  };

  // 打开拒绝弹窗
  const openRejectModal = (task: any) => {
    setRejectModal({ isOpen: true, task });
    setRejectReason('');
  };

  // 处理拒绝 - 执行人拒绝任务，任务状态变为rejected，可重新派发
  const handleReject = () => {
    if (!rejectModal.task || !rejectReason.trim()) return;
    const task = rejectModal.task;
    // 2026-10-10（审核修复 H3/M1）：巡查来源只走问题通道，不发 farm/temp 幽灵调用
    const isInspectionTask = !!(task as any).sourceInspectionId;
    if (task.sourceProblemId) {
      rejectProblem(task.sourceProblemId, operatorId, currentUserName, rejectReason);
    }
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      if (!isInspectionTask) {
        rejectByExecutor(unifiedTask.id, rejectReason, unifiedTask.assigneeId, unifiedTask.assigneeName);
      }
      // 记录拒绝操作
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'rejected',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId,
        operatorName: currentUserName,
        operationDate: todayLocal(),
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
  const handleStartProcessing = (task: any) => {
    // 2026-10-10（审核修复 H3/M1）：巡查来源不发 farm/temp 幽灵调用
    const isInspectionTask = !!(task as any).sourceInspectionId;
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask && !isInspectionTask) {
      updateTaskStatus(unifiedTask.id, 'in_progress');
    }
    setShowDetailModal(false);
  };

  // 打开反馈弹窗
  const openFeedbackModal = (task: any) => {
    // 打开反馈弹窗
    setFeedbackModal({ isOpen: true, task });
    // 2026-10-21：进度已满 100% 的任务（如返工后再次提交），预选「全部完成」，
    //   避免用户每次都要手动选一次；进度未满则留空让用户主动选。
    const initialProgress = task.progress || 0;
    setFeedbackForm({
      resultStatus: (initialProgress === 100 ? '全部完成' : '') as '' | '全部完成' | '部分完成' | '延迟完成' | '其他',
      resultText: '',
      progressText: '',
      progress: task.progress || 0,
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
  const handleSubmitFeedback = async () => {
    try {
      if (!feedbackModal.task) {
        // 反馈提交错误
        return;
      }
      const task = feedbackModal.task;

      // 新增：处理"无法继续"逻辑
      if (feedbackForm.cannotContinue && feedbackForm.cannotContinueReason.trim()) {
        // 查找 unifiedTasks 中对应的任务
        const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
        if (unifiedTask) {
          // 1. 更新任务状态为已拒绝（巡查来源跳过 farm/temp 幽灵调用，只走下方问题通道）
          if (!(task as any).sourceInspectionId) {
            rejectByExecutor(
              unifiedTask.id,
              feedbackForm.cannotContinueReason,
              unifiedTask.assigneeId,
              unifiedTask.assigneeName
            );
          }
          // 2. 同步更新问题状态（这样巡查反馈页面也能看到最新状态）
          if (task.sourceProblemId) {
            rejectProblem(task.sourceProblemId, operatorId, currentUserName, feedbackForm.cannotContinueReason);
          }
          // 记录操作
          addTaskRecord({
            operationType: unifiedTask.type,
            operationTypeName: unifiedTask.typeName,
            status: 'rejected',
            greenhouseId: '',
            greenhouseName: task.field || '',
            cropName: task.crop || '',
            operatorId,
            operatorName: currentUserName,
            operationDate: todayLocal(),
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
        showAlert('已提交无法继续反馈，任务将重新分派');
        return;
      }

      // 校验必填反馈
      const validation = validateRequiredFeedback();
      if (!validation.valid) {
        showAlert(validation.message);
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
          operatorId,
          currentUserName,
          feedbackForm.progress,
          feedbackForm.progressText || feedbackForm.resultText,
          feedbackData
        );
        // 进度100%时提交验收，否则只是进度反馈
        if (feedbackForm.progress === 100) {
          submitProblemFeedback(task.sourceProblemId, operatorId, currentUserName, {
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
      // 2026-10-20 修复：记录 submitProgress 的真实结果，只有成功才提示"提交成功"。
      //   此前不 await 且无条件弹成功 —— 后端 500 时用户同时看到"提交进度未生效"和"提交成功！"
      //   两条互相矛盾的提示，弹窗还照常关闭。
      let apiOk = true;
      const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
      if (unifiedTask) {
        const isFinal = feedbackForm.progress === 100;
        // 2026-10-10（审核修复 H3/M1）：巡查来源跳过 useTasks 同步链路（其进度走上方问题通道
        //   addProgressRecord/submitProblemFeedback），避免 submitProgress 发往 farm-tasks 幽灵端点
        if (!(task as any).sourceInspectionId) {
        // 调用 submitProgress 创建 TaskRecord（useTasks 系统的记录）
        apiOk = await submitProgress(unifiedTask.id, feedbackForm.progress, {
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
          // 2026-10-21：把处理结果结论随反馈落库（此前只存在表单内存，验收人看不到）
          resultStatus: feedbackForm.resultStatus,
        });
        }

        // ========== 数据闭环：同步到 useOperationRecords ==========
        addTaskRecord({
          operationType: unifiedTask.type,
          operationTypeName: unifiedTask.typeName,
          status: isFinal ? 'waiting_acceptance' : 'in_progress',
          greenhouseId: '',
          greenhouseName: task.field || '',
          cropName: task.crop || '',
          operatorId,
          operatorName: currentUserName,
          operationDate: todayLocal(),
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
        // 任务未找到
      }

      if (!apiOk) {
        // 失败时保持弹窗打开，让用户可以直接重试（错误详情已由 syncToApi 的 toast 给出）
        return;
      }
      setFeedbackModal({ isOpen: false, task: null });
      showAlert('提交成功！');
    } catch (error) {
      // 反馈提交失败
      showAlert('提交失败：' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 获取当前任务关联的问题流转记录
  const getCurrentProblemFlowRecords = () => {
    if (!selectedTask || !(selectedTask as any).sourceProblemId) return [];
    return getProblemFlowRecords((selectedTask as any).sourceProblemId);
  };

  // 获取当前任务关联的操作记录（useOperationRecords）
  const getCurrentOperationRecords = () => {
    if (!selectedTask) return [];
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === selectedTask.id || t.id === selectedTask.id);
    if (!unifiedTask) return [];
    // 使用 getRecordsByTaskId 根据 sourceId 获取记录
    return getRecordsByTaskId(unifiedTask.id);
  };

  // 获取当前任务关联的 TaskRecord 记录（useTasks 系统）
  const getCurrentTaskRecords = () => {
    if (!selectedTask) return [];
    // 查找 unifiedTasks 中对应的任务
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === selectedTask.id || t.id === selectedTask.id);
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

    records.forEach((record: any) => {
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
      // 2026-10-21 口径统一：estimated_hours 已含天数，总工时 = estimatedHours × 人工数量
      const estimatedTotal = (selectedTask.estimatedHours || 0) * (selectedTask.workerCount || 1);
      if (estimatedTotal > 0) {
        totalHours = Math.round(estimatedTotal * (selectedTask.progress / 100) * 10) / 10;
      }
    }

    return { days: totalDays, hours: totalHours, workers: totalWorkers };
  };

  // 打开SOP弹窗
  const openSopModal = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSopTask(task);
    setShowSopModal(true);
  };

  // 更新任务进度 - 使用统一任务管理
  const handleProgressChange = (taskId: string, progress: number) => {
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === taskId || t.id === taskId);
    if (unifiedTask) {
      updateTaskProgress(unifiedTask.id, progress);
    }
    // 更新当前选中的任务显示
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev: any) => prev ? { ...prev, progress } : null);
    }
    // 注意：进度100%时不自动改变状态，用户需要通过提交反馈来确认完成
  };

  // 确认完成 - 使用统一任务管理
  const handleConfirmComplete = (task: any) => {
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      // 验收完成时确保进度为100%
      updateTaskProgress(unifiedTask.id, 100);
      updateTaskStatus(unifiedTask.id, 'completed');
    }
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // 继续执行 - 返工后恢复任务执行
  const handleContinueExecution = (task: any) => {
    // 2026-10-10（审核修复 H3/M1）：巡查来源不发 farm/temp 幽灵调用（巡查行不显示"继续执行"按钮）
    const isInspectionTask = !!(task as any).sourceInspectionId;
    const unifiedTask = unifiedTasks.find((t: any) => t.taskCode === task.id || t.id === task.id);
    if (unifiedTask) {
      if (!isInspectionTask) {
        continueExecution(unifiedTask.id);
      }
      // 记录操作
      addTaskRecord({
        operationType: unifiedTask.type,
        operationTypeName: unifiedTask.typeName,
        status: 'in_progress',
        greenhouseId: '',
        greenhouseName: task.field || '',
        cropName: task.crop || '',
        operatorId,
        operatorName: currentUserName,
        operationDate: todayLocal(),
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
      {/* 页面标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的任务</h1>
            <p className="text-gray-500">查看并完成被分派的任务</p>
          </div>
        </div>
      </div>

      {/* 任务类型标签页筛选 */}
      <TaskFilterTabs
        taskFilter={taskFilter}
        taskCounts={taskCounts}
        onFilterChange={handleFilterChange}
      />

      {/* 根据筛选类型显示不同内容 */}
      {taskFilter === 'worklog' ? (
        <WorkLogPage />
      ) : (
      <>
      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {taskFilter === 'problem' ? (
                  <>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">巡查编号</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">巡查类型</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">提交人</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">位置/对象</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">巡查日期</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">巡查结果</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">问题分类</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">严重程度</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">问题照片</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">反馈状态</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">反馈人员</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">处理进度</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
                    <TableHead className="px-3 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">任务ID</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">任务类型</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">任务区域</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">作物</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">负责人</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">计划开始</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">计划结束</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">任务工时</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">进度</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">优先级</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">作业标准</TableHead>
                    <TableHead className="px-3 py-3 text-left text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="px-4 py-12 text-center text-gray-400">
                    暂无任务
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {currentPageTasks.map((task) => {
                    return (
                      <TableRow key={task.id} className="hover:bg-blue-50 transition-colors">
                        {/* 2026-10-23：巡查计划任务用「任务类」列（与农事任务同套），
                            不用「巡查记录类」列 —— 实例是任务，没有巡查结果/严重程度。 */}
                        {taskFilter === 'problem' ? (
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
                            onSubmitInspectionRecord={openRecordModal}
                          />
                        )}
                      </TableRow>
                    );
                  })}

                  {/* 2026-10-21 P4：未来巡查折叠分组（方案 §10.5） */}
                  {futureInspectionTasks.length > 0 && (
                    <>
                      <TableRow
                        className="bg-amber-50 cursor-pointer"
                        onClick={() => setShowFutureInspections((v) => !v)}
                      >
                        <TableCell colSpan={14} className="px-4 py-2">
                          <span className="text-sm text-amber-800 font-medium">
                            {showFutureInspections ? '▼' : '▶'} 未来巡查（{futureInspectionTasks.length}）
                          </span>
                          <span className="ml-2 text-xs text-amber-600">
                            计划任务已排到今天之后，暂不占用今日待办
                          </span>
                        </TableCell>
                      </TableRow>
                      {showFutureInspections && futureInspectionTasks.map((task) => (
                        <TableRow key={task.id} className="hover:bg-blue-50 transition-colors bg-amber-50/30">
                          <ProductionTaskTableRow
                            task={task}
                            onAccept={handleAccept}
                            onReject={openRejectModal}
                            onContinueExecution={handleContinueExecution}
                            onOpenFeedbackModal={openFeedbackModal}
                            onOpenDetailModal={openDetailModal}
                            onOpenSopModal={openSopModal}
                            onSubmitInspectionRecord={openRecordModal}
                          />
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>

      {/* 详情弹窗 */}
      <TaskDetailModal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => { setShowDetailModal(false); setSelectedTask(null); }}
        task={selectedTask}
        problemFlowRecords={getCurrentProblemFlowRecords() as any}
        operationRecords={getCurrentOperationRecords() as any}
        taskRecords={getCurrentTaskRecords() as any}
        getActualWorkload={getActualWorkload}
      />

      {/* 反馈表单弹窗 */}
      <TaskFeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => { setFeedbackModal({ isOpen: false, task: null }); }}
        task={feedbackModal.task}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        problemFlowRecords={(feedbackModal.task?.sourceProblemId ? getProblemFlowRecords(feedbackModal.task.sourceProblemId) : []) as any}
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

      {/* 2026-10-21 P4：巡查记录提交/重提弹窗 */}
      <InspectionRecordModal
        isOpen={recordModal.isOpen}
        task={recordModal.task ? {
          id: recordModal.task.id,
          taskCode: recordModal.task.taskCode,
          // 2026-10-22（审核 P1-2）：不要在这里回落到 'farm' —— 后端以计划类型为准，
          //   前端传 'farm' 只会在日志里制造混淆（后端已改为 plan > body）。
          inspectionType: recordModal.task.inspectionType,
          // 2026-10-22（审核 P1-1）：映射对象里没有 greenhouseName，只有 field/location；
          //   传 undefined 会让后端拿到空串，最终记录与问题都丢温室。
          greenhouseName: recordModal.task.greenhouseName || recordModal.task.field || '',
          assigneeId: recordModal.task.assigneeId,
          assigneeName: recordModal.task.assigneeName,
          // 2026-10-22（审核 P1-1）：planStart 是 "2026-10-22 11:00"，
          //   直接当 planTime 会被弹窗 .slice(0,5) 截成 "2026-"。
          //   这里只取时间部分。
          planTime: String(recordModal.task.planStart || '').split(' ')[1] || '',
          planOccurrenceDate: recordModal.task.planOccurrenceDate
            || String(recordModal.task.planStart || '').slice(0, 10),
          // 2026-10-23：优先取计划配置的区域（areaName），不再退回 location（温室名）
          area: recordModal.task.areaName || recordModal.task.area || '',
        } : null}
        // 2026-10-22（审核 P1-3）：计划配置的检查项模板必须进执行表单，
        //   否则「查什么」在执行侧完全丢失（checklistResults 恒为空数组）
        checklist={(() => {
          const list = recordModal.task?.typeConfig?.checklist;
          return Array.isArray(list) ? list : [];
        })()}
        existingRecord={recordModal.existingRecord}
        readOnly={recordModal.readOnly}
        onClose={() => setRecordModal({ isOpen: false, task: null, existingRecord: null, readOnly: false })}
        onSubmitted={() => {
          // 2026-10-23（高危修复）：原实现只 setRefreshKey(+1) —— 那只让 filteredTasks
          //   重算，数据源（store）没重新拉取，界面仍显示提交前的状态；
          //   用户再点一次「填写巡查记录」必撞 409（记录已存在）。
          //   现在强制重拉两个数据源（force 跳过 3 秒节流，否则刚加载就提交会刷不到）。
          setRefreshKey(prev => prev + 1);
          void useFarmTaskStore.getState().fetchTasks({ force: true });
          void useInspectionDataStore.getState().fetchRecords();
        }}
      />
        </>
      )}
    </div>
  );
}

export default MyTasksPage;
