/**
 * 农事任务中心 - 问题管理Tab
 * 完整功能集成自 ProblemDispatchPage
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useProblemStore } from '../../../stores';
import type { ProblemEntry } from '../../../hooks/usePersistentProblems';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { useComprehensiveDispatch } from '../../../hooks/useComprehensiveDispatch';
import { useTasks } from '../../../hooks/useTasks';
import { useUserStore } from '../../../stores';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useInspectionDataStore } from '../../../stores/useInspectionDataStore';
import { ProblemFilterToolbar, ProblemTable } from '../problemDispatch/components';
import { CreateProblemModal, DeleteWarningModal } from '../problemDispatch/modals';
// 2026-10-10（审核修复）：复用巡查侧通用验收弹窗，为问题管理 tab 的「验收」按钮提供真实动作
import { InspectionAcceptanceModal } from './modals/InspectionAcceptanceModal';
import { ExportFormatModal } from '../problemDispatch/modals'
import { todayLocal } from '@/lib/dateUtils';;
import { showAlert } from '@/lib/dialogService';
import { dispatchTempTaskForProblem } from '../../../services/apiProblemService';
import { Modal } from '@/components/ui';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../../../types/dispatch';
// 2026-10-21：AlertTriangle 随「问题追踪」子Tab 按钮删除后已无引用，从 import 移除
import { Camera, Check, CheckCircle, Clock, Download, Eye, FileText, Hand, List, MapPin, Mic, Package, Plus, Send, Sparkles, Trash2, User, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
// 2026-10-21：Table 系列（Table/TableHeader/TableBody/TableRow/TableHead/TableCell）
//   随「问题追踪」子Tab 的 10 列表格删除后已无引用，从 import 移除；
//   新增的详情弹窗「关联任务」区块用普通 div 布局，不再依赖 Table。
import { Label, DatePicker } from '@/components/ui';
import { Pagination } from '@/components/ui';
import type { SourceModuleType } from '../problemDispatch/constants/sourceConfig';
import { SourceBadge } from '../problemDispatch/components/SourceBadge';
import { problemStatusToCN } from '../../../utils/problemStatus';
// 2026-10-21：关联任务区块的状态文案直接复用两个既有常量，避免自维护一份映射
//   STATUS_MAP    —— 农事/临时任务（两表 status 枚举兼容，覆盖 draft/pending/accepted/
//                   in_progress/waiting_acceptance/completed/rejected/failed/cancelled/abandoned）
//   STATUS_CONFIG —— 巡查记录（normal/attention/critical，是巡查结果关注度，语义空间不同）
import { STATUS_MAP } from './constants_taskDispatch';
import { STATUS_CONFIG as INSPECTION_STATUS_CONFIG } from './InspectionTab';
// 2026-10-21：优先级复用 types 里的共享紧急程度配置（含完整徽章 class）
/**
 * 优先级徽章映射（2026-10-21 阶段 3）
 * 原复用临时任务的 TEMP_TASK_URGENCY_CONFIG，临时任务下线后改为本地定义，
 * 覆盖农事数据里实际出现的全部取值（含历史 medium/low）。
 */
const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  critical: { label: '非常紧急', badge: 'bg-red-500 text-white' },
  urgent: { label: '紧急', badge: 'bg-amber-100 text-amber-700' },
  high: { label: '高', badge: 'bg-orange-100 text-orange-700' },
  medium: { label: '中', badge: 'bg-amber-100 text-amber-700' },
  normal: { label: '普通', badge: 'bg-gray-100 text-gray-700' },
  low: { label: '低', badge: 'bg-green-100 text-green-700' },
};

// 必填反馈选项常量（避免在组件内重复定义）
const FEEDBACK_OPTIONS = [
  { key: 'workload_confirm', label: '工作量确认', icon: Clock },
  { key: 'gps', label: '位置打卡', icon: MapPin },
  { key: 'photo_before', label: '作业前照片', icon: Camera },
  { key: 'photo_after', label: '作业后照片', icon: Camera },
  { key: 'material', label: '物资扫码', icon: Package },
  { key: 'voice', label: '语音备注', icon: Mic },
] as const;

// 状态映射：后端英文 → 前端中文（与 ProblemTable 保持一致）
// 2026-09-21：状态映射表已上移到 src/utils/problemStatus.ts（唯一真相源）。
//   此处保留原来的函数名做薄封装，避免改动本文件内已有的多处调用点。
const getStatusCN = problemStatusToCN;

// 问题创建默认值常量
const DEFAULT_PROBLEM_VALUES = {
  weather: '晴',
  temperature: 25,
  humidity: 60,
  cropStatus: '正常',
} as const;

interface ProblemTabProps {
  // 问题数据（来自外部的回调）
  onProblemDispatched?: () => void;
  // 可选的外部任务数据（如果传入则使用，否则使用内部hooks）
  externalTasks?: import('../../../hooks/useTasks').Task[];
  // 统计信息
  stats?: {
    total: number;
    pending: number;
    processing: number;
    resolved: number;
  };
}

/**
 * 问题管理Tab组件 - 完整功能版
 */
export function ProblemTab({ onProblemDispatched, externalTasks, stats }: ProblemTabProps) {
  // ========== 数据Hooks ==========
  // 使用 useProblemStore 获取实时问题数据
  const store = useProblemStore();

  // 组件挂载时从 API 加载问题数据
  useEffect(() => {
    store.fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 使用 useProblemDispatch 获取分派功能
  // 2026-09-20：补 waitingAcceptanceProblems —— hook 早已导出但组件从未消费，
  //   导致"待验收"状态的问题既不在"全部"列表、也没有筛选入口（后端 28 条只渲染 19 条）
  // 2026-10-21：totalCount 随「问题追踪」子Tab 徽章删除后已无使用，从解构中去掉
  const { dispatchProblem, workerList, pendingProblems, dispatchedProblems, waitingAcceptanceProblems, handledProblems, approveProblemCompletion, rejectAcceptance } = useProblemDispatch();
  // 使用 useComprehensiveDispatch 获取AI推荐功能
  const { getRecommendations } = useComprehensiveDispatch();
  // 使用 useTasks 获取任务数据（用于关联任务标签页）
  const { tasks } = useTasks();
  // 从Zustand store获取用户列表
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  // 获取默认巡查人员（避免硬编码）
  const defaultInspector = useMemo(() => {
    // 优先使用 admin 用户，否则使用第一个用户
    const adminUser = users.find(u => u.id === 'U001' || u.name?.includes('管理员'));
    return adminUser || users[0] || null;
  }, [users]);

  // 2026-10-21：「问题追踪」子Tab 已删除。
  //   问题→任务的正查入口迁入问题详情弹窗底部「关联任务」区块（见 detailLinkedTasks）；
  //   任务→问题的反查入口迁入农事任务表格新增的「来源问题」列（见 TaskTab.problemMap）。
  //   故此处不再需要子Tab 切换态与 hover 说明态。

  // ========== 筛选状态 ==========
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'dispatched' | 'waiting_acceptance' | 'handled'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | '轻微' | '中等' | '严重'>('all');
  const [sourceModuleFilter, setSourceModuleFilter] = useState<SourceModuleType | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // ========== 批量操作状态 ==========
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [batchDispatchMode, setBatchDispatchMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  // 2026-10-11：问题 ID 为 number | string（useProblemStore.Problem.id），选中集按真实类型声明
  const [selectedRows, setSelectedRows] = useState<Array<number | string>>([]);
  const [selectedProblems, setSelectedProblems] = useState<Array<number | string>>([]);

  // 2026-09-21：问题列表分页（与农事任务表格一致：底部 Pagination 组件）
  //   2026-10-21：原「关联任务分页」两个 state 随问题追踪子Tab 一并删除（详情弹窗内不分页）
  const [problemsCurrentPage, setProblemsCurrentPage] = useState(1);
  const [problemsPageSize, setProblemsPageSize] = useState(10);

  // ========== 弹窗状态 ==========
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // ========== 内部统计数据（使用与表格相同的数据源：pending + dispatched + waitingAcceptance + handled）==========
  const internalStats = useMemo(() => ({
    total: pendingProblems.length + dispatchedProblems.length + waitingAcceptanceProblems.length + handledProblems.length,
    pending: pendingProblems.length,
    processing: dispatchedProblems.length,
    waitingAcceptance: waitingAcceptanceProblems.length,
    resolved: handledProblems.length,
  }), [pendingProblems, dispatchedProblems, waitingAcceptanceProblems, handledProblems]);

  // 使用内部计算的统计（优先）或外部传入的统计
  const displayStats = internalStats;

  // ========== 分派弹窗状态 ==========
  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
    batchMode: boolean;
  }>({ isOpen: false, problem: null, batchMode: false });

  // ========== 详情弹窗状态 ==========
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
  }>({ isOpen: false, problem: null });

  // ========== 验收弹窗状态（2026-10-10）：问题管理 tab 的「验收」入口 ==========
  const [acceptanceModal, setAcceptanceModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
  }>({ isOpen: false, problem: null });

  // ========== 分派表单状态 ==========
  const [dispatchMode, setDispatchMode] = useState<'ai_assisted' | 'manual'>('ai_assisted');
  const [selectedWorkers, setSelectedWorkers] = useState<{ id: string; name: string }[]>([]);
  const [expectedCompletion, setExpectedCompletion] = useState<'today' | 'tomorrow' | '3days' | 'week' | 'custom'>('3days');
  const [customDueDate, setCustomDueDate] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [requiredFeedback, setRequiredFeedback] = useState<string[]>(['workload_confirm']);
  // 2026-09-21：分派的同时派生一条临时任务（应急场景：现场先处理，再走农事任务闭环）。
  //   该能力原先只存在于 hub/ProblemDispatchModal.tsx，但那个组件整体不可达 ——
  //   FarmTaskHub 的 setDispatchProblemId 从未被赋值过，弹窗恒不渲染，
  //   连带后端 /problems/:id/dispatch-temp 接口在 UI 层无从触达。
  //   而本组件已经有一个功能更完整的自建分派弹窗，故把入口移到这里。
  const [alsoDispatchTempTask, setAlsoDispatchTempTask] = useState(true);

  // ========== 新增表单状态 ==========
  const [formData, setFormData] = useState({
    greenhouseId: '',
    greenhouseName: '',
    cropName: '',
    // 2026-10-10（审核修复）：可选链防御 —— 冷启动直开 /farm-hub 时 users 尚未加载，
    //   原 defaultInspector.id 对 null 取属性直接白屏崩溃（打开新建弹窗时会重设实际巡查人）
    inspectorId: defaultInspector?.id || '',
    inspectorName: defaultInspector?.name || '',
    checkDate: todayLocal(),
    checkTime: new Date().toTimeString().slice(0, 5),
    issueText: '',
    issueSeverity: '中等' as '轻微' | '中等' | '严重',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ========== 根据筛选过滤问题 ==========
  const filteredProblems = useMemo(() => {
    let list: ProblemEntry[] = [];

    switch (statusFilter) {
      case 'pending':
        list = pendingProblems as any;
        break;
      case 'dispatched':
        list = dispatchedProblems as any;
        break;
      // 2026-09-20：补"待验收"分支（原实现遗漏，导致该状态问题全列表不可见）
      case 'waiting_acceptance':
        list = waitingAcceptanceProblems as any;
        break;
      case 'handled':
        list = handledProblems as any;
        break;
      default:
        list = [...pendingProblems, ...dispatchedProblems, ...waitingAcceptanceProblems, ...handledProblems] as any;
    }

    if (severityFilter !== 'all') {
      list = list.filter(p => p.issueSeverity === severityFilter);
    }

    if (sourceModuleFilter !== 'all') {
      list = list.filter(p => p.sourceModule === sourceModuleFilter);
    }

    // 时间筛选
    if (timeFilter !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (timeFilter === 'week') {
        const day = now.getDay() || 7;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day + 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeFilter === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (timeFilter === 'custom' && dateRange.start) {
        startDate = new Date(dateRange.start);
        if (dateRange.end) {
          endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      if (startDate) {
        list = list.filter(p => {
          const checkDate = new Date(p.checkDate);
          if (endDate) {
            return checkDate >= startDate! && checkDate <= endDate;
          }
          return checkDate >= startDate!;
        });
      }
    }

    // 2026-09-20：按创建时间倒序（最新在最前）——覆盖所有筛选分支。
    //   原实现 default 分支把 pending/dispatched/handled 三个列表直接拼接，
    //   按"状态分组"而非时间排序：旧的待处理问题会排在新的已处理问题前面。
    //   后端 /api/problems 已有 ORDER BY create_time DESC，但拼接打乱了全局时间序。
    //   用 [...list] 复制后再 sort，避免就地修改 store 数组引用。
    return [...list].sort((a, b) => {
      const ta = new Date((a as any).createTime || (a as any).create_time || (a as any).createdAt || 0).getTime();
      const tb = new Date((b as any).createTime || (b as any).create_time || (b as any).createdAt || 0).getTime();
      return tb - ta;
    });
  }, [statusFilter, pendingProblems, dispatchedProblems, waitingAcceptanceProblems, handledProblems, severityFilter, sourceModuleFilter, timeFilter, dateRange]);

  // 2026-09-21：问题列表分页（10 条/页，按 createTime DESC 已排好序）
  const paginatedProblems = useMemo(() => {
    const start = (problemsCurrentPage - 1) * problemsPageSize;
    return filteredProblems.slice(start, start + problemsPageSize);
  }, [filteredProblems, problemsCurrentPage, problemsPageSize]);

  // 筛选条件变化时把页码重置回第 1 页（否则筛选后数据变少会停在空页）
  useEffect(() => { setProblemsCurrentPage(1); }, [statusFilter, severityFilter, sourceModuleFilter, timeFilter, dateRange]);

  // ========== 问题类型到任务类型的映射（避免硬编码） ==========
  const PROBLEM_TYPE_MAPPING = [
    { keywords: ['虫', '蚜'], type: 'spraying', typeName: '病虫防治' },
    { keywords: ['病', '斑', '灰霉'], type: 'spraying', typeName: '病害处理' },
    { keywords: ['水', '旱'], type: 'irrigation', typeName: '灌溉处理' },
    { keywords: ['肥'], type: 'fertilization', typeName: '施肥处理' },
  ] as const;

  const getProblemType = (issueText: string): { type: string; typeName: string } => {
    const text = issueText || '';
    for (const mapping of PROBLEM_TYPE_MAPPING) {
      if (mapping.keywords.some(kw => text.includes(kw))) {
        return { type: mapping.type, typeName: mapping.typeName };
      }
    }
    return { type: 'scouting', typeName: '问题处理' };
  };

  // ========== 严重程度转优先级 ==========
  const SEVERITY_TO_PRIORITY: Record<string, 'urgent' | 'high' | 'normal'> = {
    '严重': 'urgent',
    '中等': 'high',
    '轻微': 'normal',
  };

  // ========== 将问题转换为统一任务格式（用于AI推荐） ==========
  const getProblemTaskInfo = useCallback((problem: ProblemEntry) => {
    const issueText = problem.issueText || '';
    const typeInfo = getProblemType(issueText);
    return {
      id: `inspection-${problem.id}`,
      source: 'inspection' as const,
      sourceId: problem.id.toString(),
      taskCode: `PD-${problem.id}`,
      title: `【问题处理】${issueText.slice(0, 30)}`,
      type: typeInfo.type,
      typeName: typeInfo.typeName,
      priority: SEVERITY_TO_PRIORITY[problem.issueSeverity] || 'normal',
      workZone: problem.greenhouseName || '',
      greenhouse: problem.greenhouseName || '',
      cropName: problem.cropName || '',
      batchId: (problem as any).batchId,
      batchCode: (problem as any).batchCode,
      requiredSkills: [],
      estimatedHours: 2,
      dueDate: '',
      description: issueText,
      createdAt: new Date().toISOString(),
    };
  }, []);

  // ========== 获取问题的AI推荐 ==========
  const getProblemRecommendations = useCallback((problem: ProblemEntry) => {
    const taskInfo = getProblemTaskInfo(problem);
    const recommendations = getRecommendations(taskInfo, 5);

    // 病虫害问题：提升技能匹配度权重
    const issueText = problem.issueText || '';
    const isPestOrDisease = issueText.includes('虫') ||
                           issueText.includes('病') ||
                           issueText.includes('蚜') ||
                           issueText.includes('斑') ||
                           issueText.includes('灰霉');

    if (isPestOrDisease && recommendations.length > 0) {
      return [...recommendations].sort((a, b) => b.skillMatchRate - a.skillMatchRate);
    }

    return recommendations;
  }, [getProblemTaskInfo, getRecommendations]);

  // ========== 计算期望完成日期 ==========
  const calculateDueDate = () => {
    const today = new Date();
    switch (expectedCompletion) {
      case 'today':
        return todayLocal(today);
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return todayLocal(tomorrow);
      }
      case '3days': {
        const threeDays = new Date(today);
        threeDays.setDate(threeDays.getDate() + 3);
        return todayLocal(threeDays);
      }
      case 'week': {
        const week = new Date(today);
        week.setDate(week.getDate() + 7);
        return todayLocal(week);
      }
      case 'custom':
        return customDueDate;
      default: {
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 3);
        return todayLocal(defaultDate);
      }
    }
  };

  // ========== 处理分派（支持多选执行人） ==========
  // 2026-09-21 修复：
  //   ① 原先在 forEach 里调 dispatchProblem，既不 await 也无任何错误处理 ——
  //      失败时弹窗照关、零提示，用户以为已分派成功；
  //   ② 新增「同时派一条临时任务」，该能力原在 hub/ProblemDispatchModal.tsx 中，
  //      但那个组件整体不可达（FarmTaskHub 的 setDispatchProblemId 从未被赋值），
  //      导致后端 POST /problems/:id/dispatch-temp 在 UI 层无从触发，故迁至此处。
  const handleDispatch = async () => {
    if (!dispatchModal.problem || selectedWorkers.length === 0) return;
    const problem = dispatchModal.problem;
    const dispatchTargets = [...selectedWorkers];
    const dueDate = calculateDueDate();

    // 先重置 UI，避免重复提交
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorkers([]);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
    setRequiredFeedback(['workload_confirm']);

    // 注意：dispatchProblem 是【同步函数】，返回 Task | null，
    //   其内部的 createTask / updateProblemInStore 为 fire-and-forget（不返回 Promise），
    //   因此这里只能兜住同步异常；其内部异步失败在本层无法感知
    //   （属该 hook 的既有设计限制，已记入审核结论）。
    let failed = 0;
    for (const worker of dispatchTargets) {
      try {
        const created = dispatchProblem(
          problem.id,
          worker.id,
          worker.name,
          defaultInspector?.id || 'U001',
          defaultInspector?.name || '系统管理员',
          dueDate,
          requiredFeedback,
          selectedPriority
        );
        if (!created) failed++;
      } catch (error) {
        failed++;
        console.error('[ProblemTab] 分派失败:', worker.name, error);
      }
    }

    // 同时派生一条临时任务（应急场景；只取首位执行人，避免派生出多条）
    if (alsoDispatchTempTask && dispatchTargets.length > 0) {
      const worker = dispatchTargets[0];
      try {
        await dispatchTempTaskForProblem(String(problem.id), {
          assigneeId: worker.id,
          assigneeName: worker.name,
          title: problem.issueText?.slice(0, 30) || '问题应急处理',
          taskType: 'other',
          urgency:
            selectedPriority === 'high' ? 'urgent' : selectedPriority === 'low' ? 'normal' : 'high',
          dueDate,
          description: problem.issueText || '',
          greenhouseName: problem.greenhouseName || undefined,
        });
      } catch (error) {
        console.error('[ProblemTab] 派生农事任务失败:', error);
        showAlert(`问题已分派，但派生农事任务失败：${(error as Error).message}`);
      }
    }

    onProblemDispatched?.();
    if (failed > 0) {
      showAlert(`分派失败：${failed}/${dispatchTargets.length} 位执行人未分派成功`);
    }
  };

  // ========== 处理批量分派（支持多选执行人） ==========
  // 2026-09-21：同样改为 allSettled 汇总 + 失败提示（原为 forEach 静默）。
  //   批量模式不派生临时任务 —— 问题数 × 执行人数会成倍放大，误建风险过高。
  const handleBatchDispatch = async () => {
    if (selectedProblems.length === 0 || selectedWorkers.length === 0) return;

    const targets: Array<{ problemId: string | number }> = [];
    selectedProblems.forEach(problemId => {
      const problem = pendingProblems.find(p => p.id === problemId);
      if (problem) targets.push({ problemId: problem.id });
    });
    const workers = [...selectedWorkers];
    const dueDate = calculateDueDate();

    setSelectedProblems([]);
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorkers([]);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
    setRequiredFeedback(['workload_confirm']);
    setBatchDispatchMode(false);

    // dispatchProblem 为同步函数（见上方 handleDispatch 的说明），此处同样逐条 try/catch
    let failed = 0;
    let total = 0;
    for (const { problemId } of targets) {
      for (const worker of workers) {
        total++;
        try {
          const created = dispatchProblem(
            problemId as any,
            worker.id,
            worker.name,
            'U001',
            '系统管理员',
            dueDate,
            requiredFeedback,
            selectedPriority
          );
          if (!created) failed++;
        } catch (error) {
          failed++;
          console.error('[ProblemTab] 批量分派失败:', problemId, worker.name, error);
        }
      }
    }

    onProblemDispatched?.();
    if (failed > 0) {
      showAlert(`批量分派存在失败：${failed}/${total} 条未分派成功`);
    }
  };

  // ========== 切换全选 ==========
  const toggleSelectAll = () => {
    if (selectedProblems.length === pendingProblems.length) {
      setSelectedProblems([]);
    } else {
      setSelectedProblems(pendingProblems.map(p => p.id) as any);
    }
  };

  // ========== 切换单选 ==========
  // 2026-09-21 修复：按当前模式分派到正确的选中集合。
  //   本组件维护两个独立集合：selectedRows（导出 / 批量删除用）与
  //   selectedProblems（批量分派用）。ProblemTable 的复选框在导出/删除模式下
  //   checked 读的是 selectedRows，但 onChange 一直调这个函数、只写 selectedProblems，
  //   于是勾选后 checked 仍为 false（复选框不变勾）、"确认导出"的禁用态也不解除。
  //   这里按模式写入对应集合即可，ProblemTable 侧无需改动。
  const toggleSelect = (id: number | string) => {
    if (exportMode || batchDeleteMode) {
      setSelectedRows(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
    } else {
      setSelectedProblems(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
    }
  };

  // ========== 批量选择相关 ==========
  const handleBatchSelectAll = () => {
    const selectable = batchDispatchMode
      ? filteredProblems.filter(p => getStatusCN(p.status) === '待处理' && !p.sourceTaskId)
      : filteredProblems;
    if (selectedRows.length === selectable.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectable.map(p => p.id));
    }
  };

  const handleBatchSelectRow = (id: number | string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(prev => prev.filter(p => p !== id));
    } else {
      setSelectedRows(prev => [...prev, id]);
    }
  };

  // ========== 验证新增表单 ==========
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.greenhouseId) newErrors.greenhouseId = '请选择温室区域';
    if (!formData.cropName) newErrors.cropName = '请选择作物名称';
    if (!formData.inspectorName.trim()) newErrors.inspectorName = '请输入巡检人员';
    if (!formData.checkDate) newErrors.checkDate = '请选择巡检日期';
    if (!formData.checkTime) newErrors.checkTime = '请选择巡检时间';
    if (!formData.issueText.trim()) newErrors.issueText = '请输入问题描述';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== 处理新增提交 ==========
  const handleCreateSubmit = async () => {
    if (!validateForm()) return;

    // 2026-10-10（审核修复）：检查创建结果 —— 原实现不 await 不看返回值，
    //   创建失败（如后端 500）时弹窗照关、零提示（假成功）。失败时保持弹窗打开便于重试
    const created = await store.createProblem({
      title: formData.issueText.slice(0, 100),
      description: formData.issueText,
      severity: formData.issueSeverity,
      greenhouseId: formData.greenhouseId,
      greenhouseName: formData.greenhouseName,
      status: 'pending',
      sourceType: 'manual',
      // 以下为扩展字段（Store 会合并到对象中）
      cropName: formData.cropName,
      inspectorId: formData.inspectorId,
      inspectorName: formData.inspectorName,
      checkDate: formData.checkDate,
      checkTime: formData.checkTime,
      weather: DEFAULT_PROBLEM_VALUES.weather,
      temperature: DEFAULT_PROBLEM_VALUES.temperature,
      humidity: DEFAULT_PROBLEM_VALUES.humidity,
      cropStatus: DEFAULT_PROBLEM_VALUES.cropStatus,
      issueText: formData.issueText,
      issueSeverity: formData.issueSeverity,
      sourceModule: 'manual',
    } as Record<string, unknown>);

    if (!created) {
      // 创建失败：保持弹窗打开，提示用户重试（Fail Loud）
      showAlert('创建问题失败，请稍后重试');
      return;
    }

    setShowCreateModal(false);
    setFormData({
      greenhouseId: '',
      greenhouseName: '',
      cropName: '',
      inspectorId: defaultInspector?.id || 'U001',
      inspectorName: defaultInspector?.name || '系统管理员',
      checkDate: todayLocal(),
      checkTime: new Date().toTimeString().slice(0, 5),
      issueText: '',
      issueSeverity: '中等',
    });
    setErrors({});
    onProblemDispatched?.();
  };

  // ========== 处理新增关闭 ==========
  const handleCreateClose = () => {
    setShowCreateModal(false);
    setFormData({
      greenhouseId: '',
      greenhouseName: '',
      cropName: '',
      inspectorId: defaultInspector?.id || 'U001',
      inspectorName: defaultInspector?.name || '系统管理员',
      checkDate: todayLocal(),
      checkTime: new Date().toTimeString().slice(0, 5),
      issueText: '',
      issueSeverity: '中等',
    });
    setErrors({});
  };

  // ========== 处理删除确认 ==========
  // 2026-09-21 修复（两处静默问题）：
  //   ① 原实现 `store.deleteProblems(ids)` 既不 await 也不看结果，后端失败时用户毫不知情；
  //   ② 选中集（全状态）与实际可删集（仅「待处理」且未派发）口径不同，
  //      差额被静默丢弃——用户点了"确定删除 N 条"却什么都没发生，也没有任何解释。
  const handleDeleteConfirm = async () => {
    const allProblems = [...pendingProblems, ...dispatchedProblems, ...handledProblems];
    const idsToDelete = allProblems
      .filter(p => selectedRows.includes(p.id) && getStatusCN(p.status) === '待处理' && !p.sourceTaskId)
      .map(p => p.id);

    setShowDeleteWarning(false);
    setBatchDeleteMode(false);

    if (idsToDelete.length === 0) {
      // Fail Loud：明确告知为什么删不掉，而不是静默关闭弹窗
      showAlert(
        selectedRows.length === 0
          ? '请先选择要删除的问题'
          : '所选问题中没有可删除的记录（仅「待处理」且尚未派发任务的问题允许删除）'
      );
      setSelectedRows([]);
      return;
    }

    try {
      await store.deleteProblems(idsToDelete);
      setSelectedRows([]);
      onProblemDispatched?.();
    } catch (error) {
      // store 已回滚本地改动，这里只负责告知用户
      showAlert(`删除失败：${(error as Error).message}`);
    }
  };

  // ========== 处理导出确认 ==========
  const handleConfirmExport = async () => {
    if (selectedRows.length === 0) {
      return;
    }
    const allProblems = [...pendingProblems, ...dispatchedProblems, ...handledProblems];
    const selectedData = allProblems.filter(p => selectedRows.includes(p.id));

    const headers = ['问题编号', '温室', '作物', '问题描述', '严重程度', '状态', '处理人', '巡检日期', '巡检时间'];
    const exportData = selectedData.map(row => ({
      '问题编号': row.id,
      '温室': row.greenhouseName,
      '作物': row.cropName,
      '问题描述': row.issueText,
      '严重程度': row.issueSeverity,
      // 2026-10-19：状态统一中文（与列表同一真相源），避免导出英文枚举
      '状态': getStatusCN(row.status),
      '处理人': row.handler || row.handlerName || (row as any).assigneeName || '-',
      '巡检日期': row.checkDate,
      '巡检时间': row.checkTime,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `问题分派_${todayLocal()}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // 导出失败时仍尝试使用备用方式下载
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // ========== 渲染分派弹窗 ==========
  const renderDispatchModal = () => (
    <Modal
      isOpen={dispatchModal.isOpen}
      onClose={() => {
        setDispatchModal({ isOpen: false, problem: null, batchMode: false });
        setSelectedWorkers([]);
        setExpectedCompletion('3days');
        setCustomDueDate('');
        setSelectedPriority('medium');
        setDispatchMode('ai_assisted');
      }}
      title={dispatchModal.batchMode ? '批量分派问题' : '分派问题'}
      size="xl"
      showFooter={true}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={() => {
              setDispatchModal({ isOpen: false, problem: null, batchMode: false });
              setSelectedWorkers([]);
              setExpectedCompletion('3days');
              setCustomDueDate('');
              setSelectedPriority('medium');
              setDispatchMode('ai_assisted');
            }}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant={selectedWorkers.length > 0 ? 'blue' : 'secondary'}
            onClick={dispatchModal.batchMode ? handleBatchDispatch : handleDispatch}
            disabled={selectedWorkers.length === 0}
          >
            <Check className="w-4 h-4" /> 确认分派
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 问题信息 */}
        {dispatchModal.problem && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm text-slate-500 mb-1 font-medium">问题描述</div>
            <div className="text-base font-semibold text-indigo-700 mb-3">
              {dispatchModal.problem.issueText}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-600">
                <span className="font-medium">温室：</span>
                <span className="text-emerald-600 font-medium">{dispatchModal.problem.greenhouseName}</span>
              </span>
              <span className="text-slate-600">
                <span className="font-medium">严重程度：</span>
                <span className={`font-semibold ${
                  dispatchModal.problem.issueSeverity === '严重' ? 'text-red-600' :
                  dispatchModal.problem.issueSeverity === '中等' ? 'text-amber-600' :
                  'text-blue-600'
                }`}>{dispatchModal.problem.issueSeverity}</span>
              </span>
            </div>
          </div>
        )}

        {dispatchModal.batchMode && (
          <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
            <div className="text-base text-orange-800 font-medium">
              选中了 {selectedProblems.length} 个问题，将分派给同一执行人
            </div>
          </div>
        )}

        {/* 执行人选择 */}
        <div>
          <div className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            选择执行人
          </div>

          {/* 分派模式切换 */}
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDispatchMode('ai_assisted')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                dispatchMode === 'ai_assisted'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI推荐（默认）
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDispatchMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                dispatchMode === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              手动选择
            </Button>
          </div>

          {/* AI辅助模式 */}
          {dispatchMode === 'ai_assisted' && !dispatchModal.batchMode && dispatchModal.problem && (
            <AIRecommendationPanel
              taskInfo={getProblemTaskInfo(dispatchModal.problem)}
              recommendations={getProblemRecommendations(dispatchModal.problem)}
              onWorkerSelect={(workerId, score) => {
                const worker = workerList.find(w => w.id === workerId);
                if (worker) {
                  setSelectedWorkers([{ id: worker.id, name: worker.name }]);
                }
              }}
              onManualSelect={() => setDispatchMode('manual')}
              config={{ ...DEFAULT_AI_RECOMMEND_CONFIG, defaultSelectTop: true }}
              selectedWorkerId={selectedWorkers[0]?.id}
            />
          )}

          {/* 手动模式 — 多选 checkbox 列表 */}
          {(dispatchMode === 'manual' || (dispatchModal.batchMode && dispatchMode === 'ai_assisted')) && (
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {workerList.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">暂无可用执行人</div>
              ) : (
                workerList.map(worker => {
                  const isChecked = selectedWorkers.some(w => w.id === worker.id);
                  const handleToggle = () => {
                    if (isChecked) {
                      setSelectedWorkers(selectedWorkers.filter(w => w.id !== worker.id));
                    } else {
                      setSelectedWorkers([...selectedWorkers, { id: worker.id, name: worker.name }]);
                    }
                  };
                  return (
                    <Label
                      key={worker.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                        isChecked ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <Input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleToggle}
                        className="w-4 h-4 text-blue-600 rounded accent-blue-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{worker.name}</span>
                        <span className="text-sm text-gray-500">（{worker.position}）</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {(worker.skillTags || []).slice(0, 2).map((tag: any) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Label>
                  );
                })
              )}
            </div>
          )}

          {selectedWorkers.length > 0 && (
            <div className="mt-2 text-sm text-emerald-600 font-medium">
              已选择 {selectedWorkers.length} 人：{selectedWorkers.map(w => w.name).join('、')}
            </div>
          )}
        </div>

        {/* 优先级选择 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 text-center text-red-500 font-bold">!</span>
            选择优先级
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'high', label: '高', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', desc: '需立即处理' },
              { value: 'medium', label: '中', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', desc: '按时处理' },
              { value: 'low', label: '低', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', desc: '可稍后处理' },
            ].map(opt => (
              <Button
                key={opt.value}
                variant="ghost"
                onClick={() => setSelectedPriority(opt.value as typeof selectedPriority)}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex flex-col items-start min-w-[100px] ${
                  selectedPriority === opt.value
                    ? `${opt.bg} ${opt.border} ${opt.text} shadow-sm`
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs opacity-80">{opt.desc}</span>
              </Button>
            ))}
          </div>
          {dispatchModal.problem && (
            <div className="mt-2 text-sm text-slate-500">
              问题严重程度：<span className={`font-medium ${
                dispatchModal.problem.issueSeverity === '严重' ? 'text-red-600' :
                dispatchModal.problem.issueSeverity === '中等' ? 'text-amber-600' : 'text-blue-600'
              }`}>{dispatchModal.problem.issueSeverity}</span>
              {selectedPriority !== 'medium' && (
                <span className="ml-2 text-blue-600">（已调整为：{selectedPriority === 'high' ? '高' : '低'}优先级）</span>
              )}
            </div>
          )}
        </div>

        {/* 期望完成时间 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            期望完成时间
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: '今天', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
              { value: 'tomorrow', label: '明天', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
              { value: '3days', label: '3天内', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
              { value: 'week', label: '本周', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
            ].map(opt => (
              <Button
                key={opt.value}
                variant="ghost"
                onClick={() => {
                  setExpectedCompletion(opt.value as typeof expectedCompletion);
                  setCustomDueDate('');
                }}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  expectedCompletion === opt.value && !customDueDate
                    ? `${opt.bg} ${opt.border} ${opt.text}`
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => setExpectedCompletion('custom')}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                expectedCompletion === 'custom'
                  ? 'bg-violet-50 border-violet-200 text-violet-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              自定义
            </Button>
            {expectedCompletion === 'custom' && (
              <DatePicker
                selected={customDueDate ? new Date(customDueDate) : undefined}
                onChange={(date) => setCustomDueDate(todayLocal(date))}
                className="px-4 py-2 border-2 border-violet-200 rounded-lg text-base focus:outline-none focus:border-violet-500"
              />
            )}
          </div>
          {expectedCompletion !== 'custom' && (
            <div className="mt-2 text-sm text-slate-500">
              预计完成日期：<span className="font-medium text-violet-600">{calculateDueDate()}</span>
            </div>
          )}
        </div>

        {/* 必填反馈要求 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            必填反馈要求
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FEEDBACK_OPTIONS.map(item => (
              <Label
                key={item.key}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  requiredFeedback.includes(item.key)
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-emerald-200'
                }`}
              >
                <Input
                  type="checkbox"
                  checked={requiredFeedback.includes(item.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRequiredFeedback([...requiredFeedback, item.key]);
                    } else {
                      setRequiredFeedback(requiredFeedback.filter(f => f !== item.key));
                    }
                  }}
                  className="sr-only"
                />
                <item.icon className={`w-4 h-4 ${requiredFeedback.includes(item.key) ? 'text-emerald-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${requiredFeedback.includes(item.key) ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                {requiredFeedback.includes(item.key) && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                )}
              </Label>
            ))}
          </div>
        </div>

        {/* 同时派一条应急农事任务（2026-09-21 新增；2026-10-21 阶段 3 起写入 farm_tasks）
            仅单条分派提供 —— 批量模式下问题数 × 执行人数会成倍放大，误建风险过高 */}
        {!dispatchModal.batchMode && (
          <div className="border-t border-gray-200 pt-4">
            <Label className="flex items-start gap-3 px-3 py-3 rounded-lg border-2 cursor-pointer transition-all border-gray-200 bg-white hover:border-amber-200">
              <Input
                type="checkbox"
                checked={alsoDispatchTempTask}
                onChange={(e) => setAlsoDispatchTempTask(e.target.checked)}
                className="mt-0.5 w-4 h-4"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">
                  同时派一条应急农事任务
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  应急场景使用：现场先按临时任务处理，工单记录同样挂到当前问题下，
                  可在问题详情的「关联任务」中查看。
                </div>
              </div>
            </Label>
          </div>
        )}
      </div>
    </Modal>
  );

  // ========== 渲染详情弹窗 ==========
  const renderDetailModal = () => {
    if (!detailModal.isOpen || !detailModal.problem) return null;

    const problem = detailModal.problem;
    return (
      <Modal
        isOpen={detailModal.isOpen && !!problem}
        onClose={() => setDetailModal({ isOpen: false, problem: null })}
        title={`问题详情 - ${problem.problemCode || ''}`}
        size="xl"
        showFooter={false}
      >
      <div className="space-y-4">
          {/* 弹窗内容 - 优化视觉设计 */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* 来源信息 - 灰色背景 */}
            <div className="mb-4">
              <SourceBadge problem={problem} />
            </div>

            {/* 问题描述卡片 - 红色背景 */}
            <div className="mb-4 bg-red-50 rounded-lg p-4 border border-red-100">
              <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                问题描述
              </h4>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">!</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      problem.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                      problem.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {problem.issueSeverity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{problem.issueText}</p>
                </div>
              </div>
            </div>

            {/* 基本信息卡片 - 蓝色背景 */}
            <div className="mb-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                基本信息
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">温室区域</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.greenhouseName || '-'}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">作物名称</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.cropName || '-'}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">巡查人员</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.inspectorName}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">巡查时间</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.checkDate} {problem.checkTime}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">天气</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.weather}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">温湿度</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.temperature}°C / {problem.humidity}%</div>
                </div>
              </div>
            </div>

            {/* 处理信息卡片 - 橙色背景 */}
            <div className="mb-4 bg-orange-50 rounded-lg p-4 border border-orange-100">
              <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                处理信息
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-orange-600 mb-1">当前状态</div>
                  <div className="text-sm font-semibold">
                    {/* 2026-09-21 修复：原用中文直接比对英文枚举，三个分支全不命中 → 一律灰色兜底；
                        且状态文本原样输出，会把 waiting_acceptance 这类英文暴露给用户 */}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      getStatusCN(problem.status) === '已处理' ? 'bg-green-100 text-green-700' :
                      getStatusCN(problem.status) === '处理中' ? 'bg-amber-100 text-amber-700' :
                      getStatusCN(problem.status) === '待验收' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusCN(problem.status)}
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-orange-600 mb-1">处理人</div>
                  <div className="text-sm font-semibold text-gray-900">{problem.handler || '-'}</div>
                </div>
                {problem.handleDate && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-orange-600 mb-1">处理日期</div>
                    <div className="text-sm font-semibold text-gray-900">{problem.handleDate}</div>
                  </div>
                )}
                {problem.expectedCompletion && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-orange-600 mb-1">期望完成</div>
                    <div className="text-sm font-semibold text-gray-900">{problem.expectedCompletion}</div>
                  </div>
                )}
                {problem.handleResult && (
                  <div className="col-span-2 bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">处理结果</div>
                    <div className="text-sm font-semibold text-gray-900">{problem.handleResult}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 流转记录 - 石板灰背景
                2026-10-21：去掉外层标题 —— TaskFlowTimeline 自身已渲染「流转记录（N条）」，
                此前两层标题叠加显示成「📋 流转记录 / 流转记录（1条）」 */}
            <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
              <TaskFlowTimeline
                records={problem.flowRecords || []}
                showStatusChange={true}
              />
            </div>

            {/* 2026-10-21 新增：关联任务区块（「问题追踪」子Tab 删除后的正查入口）
                数据源仍是三表聚合的 linkedTasks，按当前问题 id 过滤；
                编号点击复用 FarmTaskHub 已监听的 open-task-detail / open-inspection-detail 事件。 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  关联任务
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                    {detailLinkedTasks.length}
                  </span>
                </h4>
              </div>
              {detailLinkedTasks.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">该问题暂无关联任务（尚未分派，或关联记录已删除）</p>
              ) : (
                <div className="space-y-2">
                  {detailLinkedTasks.map((task: any) => {
                    // 类型徽章：农事 / 巡查（临时任务已并入农事，2026-10-21 阶段 3）
                    const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
                      farm: { label: '农事', bg: 'bg-blue-100', text: 'text-blue-700' },
                      inspection: { label: '巡查', bg: 'bg-emerald-100', text: 'text-emerald-700' },
                    };
                    const typeInfo = typeConfig[task.type] || { label: '未知', bg: 'bg-gray-100', text: 'text-gray-600' };
                    // 状态文案分两类语义空间（详见文件顶部 import 处的说明）：
                    //   两个常量的字段名不同（color vs text），故分开取，不用联合类型。
                    const isInspection = task.type === 'inspection';
                    const inspMeta = isInspection ? INSPECTION_STATUS_CONFIG[task.status] : undefined;
                    const farmMeta = isInspection ? undefined : STATUS_MAP[task.status];
                    const statusLabel = inspMeta?.label || farmMeta?.label || task.status || '未知';
                    const statusCls = inspMeta
                      ? `${inspMeta.bg} ${inspMeta.text}`
                      : farmMeta
                        ? `${farmMeta.bg} ${farmMeta.color}`
                        : 'bg-gray-100 text-gray-700';
                    // 优先级：两类来源语义不同 ——
                    //   农事任务走英文枚举（critical/urgent/high/medium/normal/low）；
                    //   巡查存的是中文严重程度（严重/中等/轻微），不在英文枚举里，原样显示。
                    const priorityRaw = String(task.priority || '');
                    const urgMeta = PRIORITY_META[priorityRaw];
                    const priorityLabel = isInspection
                      ? (priorityRaw || '—')
                      : urgMeta?.label
                        || (priorityRaw === 'medium' ? '中' : priorityRaw === 'low' ? '低' : '')
                        || priorityRaw
                        || '普通';
                    const priorityCls = isInspection
                      ? (priorityRaw === '严重' ? 'bg-red-100 text-red-700'
                        : priorityRaw === '中等' ? 'bg-amber-100 text-amber-700'
                          : priorityRaw === '轻微' ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700')
                      : (urgMeta?.badge
                        || (priorityRaw === 'medium' ? 'bg-amber-100 text-amber-700'
                          : priorityRaw === 'low' ? 'bg-green-100 text-green-700'
                            : '')
                        || 'bg-gray-100 text-gray-700');
                    return (
                      <div
                        key={`${task.type}-${task.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-emerald-50 transition-colors"
                      >
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${typeInfo.bg} ${typeInfo.text}`}>
                          {typeInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (task.type === 'farm') {
                              window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: task.id } }));
                            } else {
                              window.dispatchEvent(new CustomEvent('open-inspection-detail', { detail: { recordId: task.id } }));
                            }
                          }}
                          className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium flex-shrink-0"
                          title="点击查看任务详情"
                        >
                          {task.taskCode || '—'}
                        </button>
                        <span className="text-sm text-gray-800 truncate flex-1" title={task.title}>
                          {task.title || '—'}
                        </span>
                        {/* 温室（2026-10-21 补：原「问题追踪」tab 有此列，删除时未迁入，
                            数据源 linkedTasks.greenhouseName 一直在） */}
                        <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 max-w-[110px] truncate" title={task.greenhouseName || ''}>
                          {task.greenhouseName || '—'}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {task.assigneeName || '—'}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                          {task.dueDate || '—'}
                        </span>
                        {/* 优先级（2026-10-21 补，同上） */}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${priorityCls}`}>
                          {priorityLabel}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </div>
      </Modal>
    );
  };

  // ========== 主渲染 ==========
  // 2026-09-21：关联任务列表聚合 farm_tasks / inspections 两张表。
  // 2026-10-21（阶段 3）：临时任务已并入 farm_tasks，原先单列的 tempLinked 分支删除。
  const inspectionStoreAll = useInspectionDataStore((s) => s.records);
  // 2026-10-21：原「待我验收」快捷按钮依赖的 currentUserName 随「问题追踪」子Tab 一并删除。
  //   验收能力本身未丢失 —— 问题列表的「验收」按钮走下方 operatorId/operatorName 的
  //   InspectionAcceptanceModal，与 currentUserName 无关。
  // 2026-10-10（审核修复）：验收等写操作的操作人取当前登录用户（原多处硬编码 U001/U013）
  const operatorId = useAuthStore((s: any) => s.currentUser?.oid || '');
  const operatorName = useAuthStore(
    (s: any) => s.currentUser?.realName || s.currentUser?.username || ''
  );
  const linkedTasks = useMemo(() => {
    const farmList = (externalTasks || tasks || []) as any[];
    const farmLinked = farmList
      .filter((t) => t.sourceProblemId)
      .map((t) => ({
        kind: 'task' as const,
        type: 'farm' as const,
        id: t.id,
        taskCode: t.taskCode,
        title: t.title,
        assigneeName: t.assigneeName,
        assigneeId: t.assigneeId || '',
        greenhouseName: t.greenhouseName,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        sourceProblemId: String(t.sourceProblemId),
        createdAt: t.createdAt || '',
      }));

    // 巡查记录：DB 列 source_problem_id（snake_case）映射
    const inspectLinked = (inspectionStoreAll as any[])
      .filter((i) => i.source_problem_id || i.sourceProblemId)
      .map((i) => ({
        kind: 'inspection' as const,
        type: 'inspection' as const,
        id: i.id,
        taskCode: i.record_code || i.recordCode || '',
        title: (i.issue_text || i.issueText || i.check_result || i.checkResult || '').slice(0, 60) || '巡查记录',
        assigneeName: i.inspector_name || i.inspectorName || '',
        assigneeId: '',
        greenhouseName: i.greenhouse_name || i.greenhouseName || '',
        dueDate: i.check_date || i.checkDate || '',
        priority: i.issue_severity || i.issueSeverity || '',
        status: i.status || '',
        sourceProblemId: String(i.source_problem_id ?? i.sourceProblemId),
        createdAt: i.create_time || i.createTime || '',
        recordCode: i.record_code || i.recordCode || '',
      }));

    return [...farmLinked, ...inspectLinked];
  }, [externalTasks, tasks, inspectionStoreAll]);

  // 2026-10-21：「问题追踪」子Tab 已删除，问题→任务的正查入口迁移到问题详情弹窗。
  //   这里从同一份 linkedTasks 里按当前详情问题过滤（数据口径与原子Tab 完全一致，
  //   避免出现两套聚合逻辑）。单问题实测最多 2-3 条关联任务，不分页。
  const detailLinkedTasks = useMemo(() => {
    if (!detailModal.isOpen || !detailModal.problem) return [];
    const pid = String(detailModal.problem.id);
    return (linkedTasks as any[]).filter((t) => String(t.sourceProblemId) === pid);
  }, [linkedTasks, detailModal.isOpen, detailModal.problem]);

  return (
    <div className="space-y-6">
      {/* 2026-10-21：「问题追踪」子Tab 与整个子Tab 切换条一并删除，
          问题列表内容改为无条件渲染。
          被删切换条上的「问题列表 / 总数 totalCount」徽章信息未丢失 ——
          下方「问题管理列表」标题行的 displayStats 已完整呈现总数与四态统计。 */}
      <div className="space-y-4">
        {/* 筛选工具栏 */}
        <ProblemFilterToolbar
          onBatchDispatch={() => {}}
          onBatchDelete={() => {}}
          onExport={() => {}}
          timeFilter={timeFilter}
          dateRange={dateRange}
          statusFilter={statusFilter}
          severityFilter={severityFilter}
          sourceModuleFilter={sourceModuleFilter}
          exportMode={exportMode}
          batchDeleteMode={batchDeleteMode}
          batchDispatchMode={batchDispatchMode}
          selectedRowsLength={selectedRows.length}
          selectedProblemsLength={selectedProblems.length}
          onTimeFilterChange={setTimeFilter}
          onDateRangeChange={setDateRange}
          onStatusFilterChange={setStatusFilter}
          onSeverityFilterChange={setSeverityFilter}
          onSourceModuleChange={setSourceModuleFilter}
          onCancelExport={() => {
            setExportMode(false);
            setSelectedRows([]);
          }}
          onCancelBatchDelete={() => {
            setBatchDeleteMode(false);
            setSelectedRows([]);
          }}
          onCancelBatchDispatch={() => {
            setBatchDispatchMode(false);
            setSelectedProblems([]);
          }}
          onConfirmDispatch={() => setDispatchModal({ isOpen: true, problem: null, batchMode: true })}
          onConfirmExport={() => setShowExportModal(true)}
          onConfirmDelete={() => setShowDeleteWarning(true)}
        />

        {/* 问题管理列表标题 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">问题管理列表</h3>
              {displayStats && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">共</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">{displayStats.total}</span>
                  <span className="text-gray-500">条</span>
                  <span className="text-red-600">| 待处理 {displayStats.pending}</span>
                  <span className="text-blue-600">| 处理中 {displayStats.processing}</span>
                  {/* 2026-09-20：补待验收统计（与 internalStats 新增字段对齐） */}
                  {(displayStats as any).waitingAcceptance > 0 && (
                    <span className="text-purple-600">| 待验收 {(displayStats as any).waitingAcceptance}</span>
                  )}
                  <span className="text-green-600">| 已处理 {displayStats.resolved}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="blue"
                size="sm"
                onClick={() => {
                  // 2026-10-10（审核修复）：打开弹窗时重设实际巡查人 —— formData 只在挂载时
                  //   初始化一次，冷启动 users 晚加载时初始 inspectorId 为空，这里补齐
                  setFormData(prev => ({
                    ...prev,
                    inspectorId: defaultInspector?.id || '',
                    inspectorName: defaultInspector?.name || '',
                  }));
                  setShowCreateModal(true);
                }}
              >
                <Plus className="w-4 h-4" />
                新建
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => {
                  setBatchDispatchMode(true);
                  setSelectedProblems([]);
                  setStatusFilter('pending');
                }}
              >
                <Send className="w-4 h-4" />
                批量分派
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setExportMode(true);
                  setSelectedRows([]);
                }}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
              {/* 2026-09-21 新增：批量删除此前完全没有入口 ——
                  setBatchDeleteMode(true) 在全文件从未被调用（只有置 false），
                  DeleteWarningModal 与工具栏的「确认删除」分支都是死 UI，
                  用户实际上无法删除任何问题。此处补齐入口。 */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            </div>
          </div>

        {/* 问题表格 */}
        <ProblemTable
          problems={paginatedProblems}
          selectedRows={selectedRows}
          selectedProblems={selectedProblems}
          batchDeleteMode={batchDeleteMode}
          batchDispatchMode={batchDispatchMode}
          exportMode={exportMode}
          pendingProblems={pendingProblems as any}
          onViewDetail={(problem) => setDetailModal({ isOpen: true, problem })}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={handleBatchSelectAll}
          onBatchSelectAll={toggleSelectAll}
          onSingleDispatch={(problem) => setDispatchModal({ isOpen: true, problem, batchMode: false })}
          // 2026-10-10（审核修复）：「验收」按钮接真实验收动作（原只打开详情）
          // （as any：两个模块各自定义的同名 ProblemEntry 类型不互通，与上方既有 prop 同款处理）
          onAcceptance={((problem: any) => setAcceptanceModal({ isOpen: true, problem })) as any}
        />

        {/* 2026-09-21：问题列表分页（与农事任务表格一致：底部 Pagination 组件） */}
        <Pagination
          currentPage={problemsCurrentPage}
          totalPages={Math.ceil(filteredProblems.length / problemsPageSize) || 1}
          pageSize={problemsPageSize}
          onPageChange={setProblemsCurrentPage}
          onPageSizeChange={(size) => { setProblemsPageSize(size); setProblemsCurrentPage(1); }}
          showPageSize={true}
        />
        </div>

        {/* AI推荐面板 - 当有待分派问题时显示 */}
        {pendingProblems.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-purple-700 mb-2">AI智能推荐</h4>
                <p className="text-sm text-gray-600 mb-3">
                  系统检测到 <span className="font-medium text-purple-600">{pendingProblems.length}</span> 个待分派问题，AI已自动分析最优执行人匹配方案
                </p>
                <div className="flex gap-2">
                  <Button variant="default" size="sm">
                    <Eye className="w-4 h-4" /> 查看AI推荐
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Hand className="w-4 h-4" /> 手动选择执行人
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      {renderDispatchModal()}

      {/* 详情弹窗 */}
      {renderDetailModal()}

      {/* 新增问题弹窗 */}
      <CreateProblemModal
        isOpen={showCreateModal}
        onClose={handleCreateClose}
        onSubmit={handleCreateSubmit}
        formData={formData}
        errors={errors}
        onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
      />

      {/* 删除警告弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />

      {/* 验收弹窗（2026-10-10 审核修复）：问题管理 tab「验收」按钮的真实验收入口 ——
          复用巡查侧通用弹窗；通过 → 问题标记已处理 + 关联任务联动完成；驳回 → 返回处理人 */}
      {acceptanceModal.isOpen && acceptanceModal.problem && (() => {
        // 流转记录取 store 里的最新值（弹窗打开期间可能有进度更新）
        const liveProblem = store.problems.find(
          (p) => String(p.id) === String(acceptanceModal.problem!.id)
        );
        const target = (liveProblem || acceptanceModal.problem!) as any;
        return (
          <InspectionAcceptanceModal
            isOpen={acceptanceModal.isOpen}
            problem={target}
            records={(target.flowRecords || []) as any}
            onAccept={(comments) => {
              approveProblemCompletion(
                target.id,
                operatorId,
                operatorName,
                comments || '验收通过'
              );
              setAcceptanceModal({ isOpen: false, problem: null });
            }}
            onReject={(reason) => {
              rejectAcceptance(target.id, operatorId, operatorName, reason);
              setAcceptanceModal({ isOpen: false, problem: null });
            }}
            onClose={() => setAcceptanceModal({ isOpen: false, problem: null })}
          />
        );
      })()}
    </div>
  );
}

export default ProblemTab;
