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
import { useTempTaskStore } from '../../../stores/useTempTaskStore';
import { useInspectionDataStore } from '../../../stores/useInspectionDataStore';
import { ProblemFilterToolbar, ProblemTable } from '../problemDispatch/components';
import { CreateProblemModal, DeleteWarningModal } from '../problemDispatch/modals';
import { ExportFormatModal } from '../problemDispatch/modals'
import { todayLocal } from '@/lib/dateUtils';;
import { showAlert } from '@/lib/dialogService';
import { Modal } from '@/components/ui';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../../../types/dispatch';
import { AlertTriangle, Camera, Check, CheckCircle, Clock, Download, Eye, FileText, Hand, List, MapPin, Mic, Package, Plus, Send, Sparkles, Trash2, User, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label, DatePicker, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import type { SourceModuleType } from '../problemDispatch/constants/sourceConfig';
import { SourceBadge } from '../problemDispatch/components/SourceBadge';
import { problemStatusToCN } from '../../../utils/problemStatus';

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
  const { dispatchProblem, workerList, pendingProblems, dispatchedProblems, waitingAcceptanceProblems, handledProblems, totalCount } = useProblemDispatch();
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
    const adminUser = users.find(u => u.id === 'U001' || u.name.includes('管理员'));
    return adminUser || users[0] || null;
  }, [users]);

  // ========== 标签页状态 ==========
  const [activeTab, setActiveTab] = useState<'problems' | 'tasks'>('problems');

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
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  // 2026-09-21：问题列表 + 关联任务分页（与农事任务表格一致：底部 Pagination 组件）
  const [problemsCurrentPage, setProblemsCurrentPage] = useState(1);
  const [problemsPageSize, setProblemsPageSize] = useState(10);
  const [linkedCurrentPage, setLinkedCurrentPage] = useState(1);
  const [linkedPageSize, setLinkedPageSize] = useState(10);

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

  // ========== 分派表单状态 ==========
  const [dispatchMode, setDispatchMode] = useState<'ai_assisted' | 'manual'>('ai_assisted');
  const [selectedWorkers, setSelectedWorkers] = useState<{ id: string; name: string }[]>([]);
  const [expectedCompletion, setExpectedCompletion] = useState<'today' | 'tomorrow' | '3days' | 'week' | 'custom'>('3days');
  const [customDueDate, setCustomDueDate] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [requiredFeedback, setRequiredFeedback] = useState<string[]>(['workload_confirm']);

  // ========== 新增表单状态 ==========
  const [formData, setFormData] = useState({
    greenhouseId: '',
    greenhouseName: '',
    cropName: '',
    inspectorId: defaultInspector.id,
    inspectorName: defaultInspector.name,
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
  const handleDispatch = () => {
    if (!dispatchModal.problem || selectedWorkers.length === 0) return;

    selectedWorkers.forEach(worker => {
      dispatchProblem(
        dispatchModal.problem!.id,
        worker.id,
        worker.name,
        defaultInspector?.id || 'U001',
        defaultInspector?.name || '系统管理员',
        calculateDueDate(),
        requiredFeedback,
        selectedPriority
      );
    });

    // 重置状态
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorkers([]);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
    setRequiredFeedback(['workload_confirm']);
    onProblemDispatched?.();
  };

  // ========== 处理批量分派（支持多选执行人） ==========
  const handleBatchDispatch = () => {
    if (selectedProblems.length === 0 || selectedWorkers.length === 0) return;

    selectedProblems.forEach(problemId => {
      const problem = pendingProblems.find(p => p.id === problemId);
      if (problem) {
        selectedWorkers.forEach(worker => {
          dispatchProblem(
            problem.id,
            worker.id,
            worker.name,
            'U001',
            '系统管理员',
            calculateDueDate(),
            requiredFeedback,
            selectedPriority
          );
        });
      }
    });

    // 重置状态
    setSelectedProblems([]);
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorkers([]);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
    setRequiredFeedback(['workload_confirm']);
    setBatchDispatchMode(false);
    onProblemDispatched?.();
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
  const toggleSelect = (id: number) => {
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

  const handleBatchSelectRow = (id: number) => {
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
  const handleCreateSubmit = () => {
    if (!validateForm()) return;

    // 通过 Zustand Store 创建问题（API 写入 + 乐观更新）
    store.createProblem({
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
      '状态': row.status,
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

            {/* 流转记录 - 石板灰背景 */}
            <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                流转记录
              </h4>
              <TaskFlowTimeline
                records={problem.flowRecords || []}
                showStatusChange={true}
              />
            </div>
          </div>
      </div>
      </Modal>
    );
  };

  // ========== 主渲染 ==========
  // 2026-09-21：关联任务列表聚合三个表（farm_tasks / temp_tasks / inspections）。
  //   此前只查 farm_tasks，所以临时任务和巡查记录即使 source_problem_id 有值也看不到。
  //   现在补两 store + 统一字段映射（前端字段 camelCase，DB 列 snake_case）。
  const tempTaskStoreAll = useTempTaskStore((s) => s.tasks);
  const inspectionStoreAll = useInspectionDataStore((s) => s.records);
  // 2026-09-21：当前登录用户（用于「待我验收」快捷按钮的条件判断）
  //   必须用 realName 而不是 username —— 任务的 assigneeName 存的是真实姓名（"张三"），
  //   而 username 是账号名，两者不是同一命名空间。原先比对 username，
  //   导致「待我验收」按钮的第三个条件恒为 false、按钮永不出现。
  //   （useAuthStore 同时提供 username 与 realName，见其 login 分支的 CurrentUser 构造）
  const currentUserName = useAuthStore(
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

    // 临时任务：DB 列 source_problem_id（snake_case）映射
    const tempLinked = (tempTaskStoreAll as any[])
      .filter((t) => t.source_problem_id || t.sourceProblemId)
      .map((t) => ({
        kind: 'tempTask' as const,
        type: 'tempTask' as const,
        id: t.id,
        taskCode: t.task_code || t.taskCode || '',
        title: t.title || '',
        assigneeName: t.assignee_name || t.assigneeName || '',
        assigneeId: t.assignee_id || t.assigneeId || '',
        greenhouseName: t.greenhouse_name || t.greenhouseName || '',
        dueDate: t.due_date || t.dueDate || '',
        priority: t.urgency || t.priority || '',
        status: t.status || '',
        sourceProblemId: String(t.source_problem_id ?? t.sourceProblemId),
        createdAt: t.create_time || t.createTime || '',
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

    return [...farmLinked, ...tempLinked, ...inspectLinked];
  }, [externalTasks, tasks, tempTaskStoreAll, inspectionStoreAll]);

  // 2026-09-21：关联任务分页（10 条/页）
  const paginatedLinkedTasks = useMemo(() => {
    const start = (linkedCurrentPage - 1) * linkedPageSize;
    return linkedTasks.slice(start, start + linkedPageSize);
  }, [linkedTasks, linkedCurrentPage, linkedPageSize]);

  return (
    <div className="space-y-6">
      {/* 标签页切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200 px-4">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('problems')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-3 border-b-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>问题列表</span>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {totalCount}
            </span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
            关联任务
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {linkedTasks.length}
            </span>
          </Button>
        </div>
      </div>

      {/* 问题列表标签页 */}
      {activeTab === 'problems' && (
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
                onClick={() => setShowCreateModal(true)}
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
      )}

      {/* 关联任务标签页 */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <List className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-800">关联任务说明</div>
                {/* 2026-09-21：更新文案（更准确描述3 类任务的来源 + 验收流程） */}
                <div className="text-sm text-blue-600 mt-1 space-y-1">
                  <div>
                    本面板列出与<strong>本问题</strong>关联的全部任务与巡查记录，包含由"问题分派"接口派出的<strong>农事任务</strong>和<strong>临时任务</strong>，以及手工关联的<strong>巡查记录</strong>。
                  </div>
                  <div>
                    完成任务后（农事/临时任务），需由分派员或验收员在任务详情页<strong>点击"验收通过"</strong>，才会自动将本问题标记为"已处理"。
                  </div>
                  <div>
                    点击表格中的<strong>任务编号</strong>可跳转到对应任务的详情/验收页。
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">类型</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">任务编号</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">任务标题</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">温室</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">执行人</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">截止日期</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">优先级</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">状态</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">来源问题</TableHead>
                    {/* 2026-09-20：新增问题处理结果列（关联任务里原本只有任务侧字段，问题侧处理结果无处可见） */}
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">问题处理结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {linkedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="px-4 py-12 text-center text-gray-400">
                        暂无分派任务
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLinkedTasks.map((task: any) => {
                      // 2026-09-20：补 waitingAcceptanceProblems —— 原查找漏了"待验收"状态，
                      //   处于待验收的问题在关联任务里会被当成"无来源问题"（显示 -）
                      const problem = [
                        ...pendingProblems,
                        ...dispatchedProblems,
                        ...waitingAcceptanceProblems,
                        ...handledProblems,
                      ].find(p => String(p.id) === String(task.sourceProblemId));
                      // 问题处理结果：优先取 handle_result；为空则回退到流转记录里最后一次
                      // submit/approve 的备注（本系统问题的处理结果正是由提交/验收写入）
                      const flowRecords = ((problem as any)?.flowRecords || []) as any[];
                      const lastFlow = [...flowRecords].reverse().find(
                        (f) => f.action === 'approve' || f.action === 'submit'
                      );
                      const problemResult = (problem as any)?.handleResult || lastFlow?.comment || '';
                      const problemResultDate =
                        (problem as any)?.handleResult
                          ? (problem as any)?.handleDate || ''
                          : (lastFlow?.actionTime || '').slice(0, 10);
                      // 2026-09-20：来源问题状态原来是英文（completed 等），改用中文映射；
                      //   颜色分支同时改用中文比对（原来按中文比对英文值，永远走灰色默认）
                      const problemStatusCn = problem ? getStatusCN((problem as any).status) : '';
                      // 2026-09-21：任务类型徽章（农事/临时/巡查）+ 待我验收快捷按钮
                      const taskTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
                        farm:       { label: '农事', bg: 'bg-blue-100',   text: 'text-blue-700' },
                        tempTask:   { label: '临时', bg: 'bg-amber-100',  text: 'text-amber-700' },
                        inspection: { label: '巡查', bg: 'bg-emerald-100', text: 'text-emerald-700' },
                      };
                      const taskType = taskTypeConfig[task.type || task.kind] || { label: task.kind || '?', bg: 'bg-gray-100', text: 'text-gray-600' };
                      // 「待我验收」快捷按钮可见条件：
                      //   1. 任务状态为 waiting_acceptance
                      //   2. 任务执行人姓名 === 当前登录用户的真实姓名
                      //      （V1.1 的 assigneeName 是自由文本姓名，assigneeId 是姓名哈希，
                      //       故只能用姓名比对；currentUserName 已取 realName，见本文件上方定义）
                      //   3. 仅农事任务参与判断（临时任务 / 巡查的 assignee 字段未填）
                      const isWaitingAcceptance = task.status === 'waiting_acceptance';
                      const isMyAcceptanceTask =
                        task.type === 'farm' &&
                        currentUserName &&
                        task.assigneeName === currentUserName;
                      return (
                        <TableRow key={task.id} className="hover:bg-emerald-50 transition-colors">
                          <TableCell className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${taskType.bg} ${taskType.text}`}>
                              {taskType.label}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-mono text-gray-600">
                            {task.taskCode}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-800 max-w-[200px] truncate">
                            {task.title}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-600">
                            {task.greenhouseName}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-600">
                            {task.assigneeName}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.dueDate}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.priority === 'high' || task.priority === 'urgent' ? '高' :
                               task.priority === 'medium' ? '中' :
                               task.priority === 'low' ? '低' : '普通'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                task.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                                task.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {task.status === 'pending' ? '待执行' :
                                 task.status === 'in_progress' ? '进行中' :
                                 task.status === 'completed' ? '已完成' :
                                 task.status === 'cancelled' ? '已取消' :
                                 task.status === 'not_started' ? '未开始' :
                                 task.status === 'paused' ? '已暂停' : '未知'}
                              </span>
                              {/* 2026-09-21：「待我验收」快捷按钮（仅农事任务 + 任务执行人 = 当前用户时显示） */}
                              {isWaitingAcceptance && isMyAcceptanceTask && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // 跳转到任务详情弹窗（已在 FarmTaskHub 中通过 setDetailTaskId 控制）
                                    // 这里用全局事件总线触发：dispatchEvent 模拟一次详情打开
                                    // 简化方案：直接通过 window.history 跳到任务详情页
                                    // 农事任务详情页路径：根据 App.tsx 通常是 /tasks/:id 或弹窗
                                    // 这里采用 URL 跳转 + 后续 tab 状态保持（如有 hash）
                                    if (task.type === 'farm') {
                                      // 触发自定义事件，让 FarmTaskHub 打开 TaskDetailModal
                                      window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: task.id } }));
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                                  title="点击打开任务详情并直接进入验收"
                                >
                                  ✓ 待我验收
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            {problem ? (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  problemStatusCn === '已处理' ? 'bg-green-100 text-green-700' :
                                  problemStatusCn === '处理中' ? 'bg-amber-100 text-amber-700' :
                                  problemStatusCn === '待验收' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {problemStatusCn}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          {/* 2026-09-20：问题处理结果（handle_result，空则回退流转记录备注） */}
                          <TableCell className="px-4 py-3 text-sm text-gray-700">
                            {problemResult ? (
                              <span className="block max-w-[240px] truncate" title={problemResult}>
                                {problemResult}
                                {problemResultDate ? `（${problemResultDate}）` : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 2026-09-21：关联任务分页（与农事任务表格一致） */}
            <Pagination
              currentPage={linkedCurrentPage}
              totalPages={Math.ceil(linkedTasks.length / linkedPageSize) || 1}
              pageSize={linkedPageSize}
              onPageChange={setLinkedCurrentPage}
              onPageSizeChange={(size) => { setLinkedPageSize(size); setLinkedCurrentPage(1); }}
              showPageSize={true}
            />
          </div>
        </div>
      )}
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
    </div>
  );
}

export default ProblemTab;
