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
import { ProblemFilterToolbar, ProblemTable } from '../problemDispatch/components';
import { CreateProblemModal, DeleteWarningModal } from '../problemDispatch/modals';
import { ExportFormatModal } from '../problemDispatch/modals'
import { todayLocal } from '@/lib/dateUtils';;
import { Modal } from '@/components/ui';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../../../types/dispatch';
import { AlertTriangle, Camera, Check, CheckCircle, Clock, Download, Eye, FileText, Hand, List, MapPin, Mic, Package, Plus, Send, Sparkles, Trash2, User, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label, DatePicker, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import type { SourceModuleType } from '../problemDispatch/constants/sourceConfig';
import { SourceBadge } from '../problemDispatch/components/SourceBadge';

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
const STATUS_CN_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'waiting_acceptance': '待验收',
  'completed': '已处理',
};
const getStatusCN = (status: string): string => STATUS_CN_MAP[status] || status;

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
  const { dispatchProblem, workerList, pendingProblems, dispatchedProblems, handledProblems, totalCount } = useProblemDispatch();
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'dispatched' | 'handled'>('all');
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

  // ========== 弹窗状态 ==========
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // ========== 内部统计数据（使用与表格相同的数据源：pending + dispatched + handled）==========
  const internalStats = useMemo(() => ({
    total: pendingProblems.length + dispatchedProblems.length + handledProblems.length,
    pending: pendingProblems.length,
    processing: dispatchedProblems.length,
    resolved: handledProblems.length,
  }), [pendingProblems, dispatchedProblems, handledProblems]);

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
      case 'handled':
        list = handledProblems as any;
        break;
      default:
        list = [...pendingProblems, ...dispatchedProblems, ...handledProblems] as any;
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

    return list;
  }, [statusFilter, pendingProblems, dispatchedProblems, handledProblems, severityFilter, sourceModuleFilter, timeFilter, dateRange]);

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
  const toggleSelect = (id: number) => {
    if (selectedProblems.includes(id)) {
      setSelectedProblems(prev => prev.filter(p => p !== id));
    } else {
      setSelectedProblems(prev => [...prev, id]);
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
  const handleDeleteConfirm = () => {
    const allProblems = [...pendingProblems, ...dispatchedProblems, ...handledProblems];
    const idsToDelete = allProblems
      .filter(p => selectedRows.includes(p.id) && getStatusCN(p.status) === '待处理' && !p.sourceTaskId)
      .map(p => p.id);

    if (idsToDelete.length > 0) {
      store.deleteProblems(idsToDelete);
    }

    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
    onProblemDispatched?.();
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
          {/* 弹窗头部 - 绿色背景 */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  问题详情
                </h3>
                <p className="text-sm text-white/80 font-mono">{problem.problemCode}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDetailModal({ isOpen: false, problem: null })}
              className="hover:bg-white/20 rounded-full"
            >
              <X className="w-4 h-4 text-white" />
            </Button>
          </div>

          {/* 弹窗内容 - 优化视觉设计 */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                      problem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                      problem.status === '待验收' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {problem.status}
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

          {/* 弹窗底部 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-white">
            <Button
              variant="secondary"
              onClick={() => setDetailModal({ isOpen: false, problem: null })}
            >
              <X className="w-4 h-4" /> 关闭
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ========== 主渲染 ==========
  // 获取关联任务列表（sourceProblemId 不为空的任务）
  const linkedTasks = useMemo(() => {
    const allTasks = externalTasks || tasks || [];
    return allTasks.filter((t: any) => t.sourceProblemId);
  }, [externalTasks, tasks]);

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
            </div>
          </div>

        {/* 问题表格 */}
        <ProblemTable
          problems={filteredProblems}
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
                <div className="text-sm text-blue-600 mt-1">
                  这些任务是由问题分派创建的。完成任务后，问题状态会自动更新为"已处理"。
                  请前往 <span className="font-medium">任务中心</span> 或 <span className="font-medium">任务工单管理</span> 页面完成任务。
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
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">任务编号</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">任务标题</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">温室</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">执行人</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">截止日期</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">优先级</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">状态</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold">来源问题</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {linkedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        暂无分派任务
                      </TableCell>
                    </TableRow>
                  ) : (
                    linkedTasks.map((task: any) => {
                      const problem = [...pendingProblems, ...dispatchedProblems, ...handledProblems].find(
                        p => p.id === task.sourceProblemId
                      );
                      return (
                        <TableRow key={task.id} className="hover:bg-emerald-50 transition-colors">
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
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            {problem ? (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                                  problem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                                  problem.status === '待验收' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {problem.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
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
