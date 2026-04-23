/**
 * 问题分派页面
 * 将问题分派给员工处理，并创建关联任务
 */

import { useState, useMemo, useCallback } from 'react';
import { Send, X, AlertTriangle, CheckCircle, Clock, User, List, Eye, Plus, Edit, Trash2, Download, MapPin, Package, Camera, Mic, Sparkles, UserPlus } from 'lucide-react';
import { useProblemDispatch } from '../../../hooks';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import type { ProblemEntry } from '../../../hooks/usePersistentProblems';
import type { Task } from '../../../types';
import {
  DeleteWarningModal,
  ExportFormatModal,
} from './modals';
import { Modal } from '../../ui/Modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import type { ProblemFlowRecord } from '../../../hooks/useProblemDispatch';
import { SourceFilter } from './components/SourceFilter';
import { SourceCell } from './components/SourceCell';
import { SourceBadge } from './components/SourceBadge';
import type { SourceModuleType } from './constants/sourceConfig';
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import { useComprehensiveDispatch } from '../../../hooks/useComprehensiveDispatch';
import type { UnifiedDispatchTask } from '../../../hooks/useComprehensiveDispatch';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../../../types/dispatch';

// ========== 引入组件（组件化重构） ==========
import {
  ProblemStatsCards,
  ProblemPageHeader,
  ProblemTable,
  ProblemFilterToolbar,
} from './components';

export function ProblemDispatchPage() {
  const {
    pendingProblems,
    dispatchedProblems,
    handledProblems,
    totalCount,
    dispatchProblem,
    workerList,
    getTaskForProblem,
  } = useProblemDispatch();

  // 使用 useComprehensiveDispatch 获取AI推荐功能
  const { getRecommendations } = useComprehensiveDispatch();

  // 使用 usePersistentProblems 获取 addProblem 方法
  const { addProblem } = usePersistentProblems();

  // 读取关联的任务
  const [tasks] = useLocalStorage<Task[]>(STORAGE_KEYS.TASKS, []);

  // 按钮模式状态
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [batchDispatchMode, setBatchDispatchMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 选中行
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 弹窗状态
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // 导出格式
  const [exportFormat, setExportFormat] = useState('excel');

  // 新增表单数据
  const [formData, setFormData] = useState({
    greenhouseId: '',
    greenhouseName: '',
    cropName: '',
    inspectorId: 'U001',
    inspectorName: '系统管理员',
    checkDate: new Date().toISOString().slice(0, 10),
    checkTime: new Date().toTimeString().slice(0, 5),
    issueText: '',
    issueSeverity: '中等' as '轻微' | '中等' | '严重',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 标签页状态
  const [activeTab, setActiveTab] = useState<'problems' | 'tasks'>('problems');

  // 分派模式状态（ai_assisted | manual）
  const [dispatchMode, setDispatchMode] = useState<'ai_assisted' | 'manual'>('ai_assisted');

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'dispatched' | 'handled'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | '轻微' | '中等' | '严重'>('all');
  const [sourceModuleFilter, setSourceModuleFilter] = useState<SourceModuleType | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // 批量选择
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  // 分派弹窗状态
  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
    batchMode: boolean;
  }>({ isOpen: false, problem: null, batchMode: false });

  // 问题详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    problem: ProblemEntry | null;
  }>({ isOpen: false, problem: null });

  // 选中的执行人
  const [selectedWorker, setSelectedWorker] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 期望完成日期状态
  const [expectedCompletion, setExpectedCompletion] = useState<'today' | 'tomorrow' | '3days' | 'week' | 'custom'>('3days');
  const [customDueDate, setCustomDueDate] = useState('');

  // 必填反馈状态
  const [requiredFeedback, setRequiredFeedback] = useState<string[]>(['workload_confirm']);

  // 优先级状态
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // 必填反馈选项配置
  const feedbackOptions = [
    { key: 'workload_confirm', label: '工作量确认', icon: Clock },
    { key: 'gps', label: '位置打卡', icon: MapPin },
    { key: 'photo_before', label: '作业前照片', icon: Camera },
    { key: 'photo_after', label: '作业后照片', icon: Camera },
    { key: 'material', label: '物资扫码', icon: Package },
    { key: 'voice', label: '语音备注', icon: Mic },
  ];

  // 根据筛选过滤问题
  const filteredProblems = useMemo(() => {
    let list: ProblemEntry[] = [];

    switch (statusFilter) {
      case 'pending':
        list = pendingProblems;
        break;
      case 'dispatched':
        list = dispatchedProblems;
        break;
      case 'handled':
        list = handledProblems;
        break;
      default:
        list = [...pendingProblems, ...dispatchedProblems, ...handledProblems];
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
        // 本周一
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

  // 问题类型到任务类型的映射
  const getProblemType = (issueText: string): { type: string; typeName: string } => {
    if (issueText.includes('虫') || issueText.includes('蚜')) return { type: 'spraying', typeName: '病虫防治' };
    if (issueText.includes('病') || issueText.includes('斑') || issueText.includes('灰霉')) return { type: 'spraying', typeName: '病害处理' };
    if (issueText.includes('水') || issueText.includes('旱')) return { type: 'irrigation', typeName: '灌溉处理' };
    if (issueText.includes('肥')) return { type: 'fertilization', typeName: '施肥处理' };
    return { type: 'scouting', typeName: '问题处理' };
  };

  // 严重程度转优先级
  const severityToPriority: Record<string, UnifiedDispatchTask['priority']> = {
    '严重': 'urgent',
    '中等': 'high',
    '轻微': 'normal',
  };

  // 将问题转换为统一任务格式（用于AI推荐）
  const getProblemTaskInfo = useCallback((problem: ProblemEntry): UnifiedDispatchTask => {
    const typeInfo = getProblemType(problem.issueText);
    return {
      id: `inspection-${problem.id}`,
      source: 'inspection',
      sourceId: problem.id.toString(),
      taskCode: `PD-${problem.id}`,
      title: `【问题处理】${problem.issueText.slice(0, 30)}`,
      type: typeInfo.type,
      typeName: typeInfo.typeName,
      priority: severityToPriority[problem.issueSeverity] || 'normal',
      workZone: problem.greenhouseName || '',
      greenhouse: problem.greenhouseName || '',
      cropName: problem.cropName || '',
      batchId: problem.batchId,
      batchCode: problem.batchCode,
      requiredSkills: [], // AI推荐时会根据问题类型自动判断
      estimatedHours: 2,
      dueDate: '',
      description: problem.issueText,
      createdAt: new Date().toISOString(),
    };
  }, []);

  // 获取问题的AI推荐（病虫害问题特殊处理：提升技能匹配权重）
  const getProblemRecommendations = useCallback((problem: ProblemEntry) => {
    const taskInfo = getProblemTaskInfo(problem);
    const recommendations = getRecommendations(taskInfo, 5);

    // 病虫害问题：提升技能匹配权重，优先选择有病害处理经验的人员
    const isPestOrDisease = problem.issueText.includes('虫') ||
                           problem.issueText.includes('病') ||
                           problem.issueText.includes('蚜') ||
                           problem.issueText.includes('斑') ||
                           problem.issueText.includes('灰霉');

    if (isPestOrDisease && recommendations.length > 0) {
      // 对推荐结果按技能匹配度重新排序
      return [...recommendations].sort((a, b) => b.skillMatchRate - a.skillMatchRate);
    }

    return recommendations;
  }, [getProblemTaskInfo, getRecommendations]);

  // 计算期望完成日期
  const calculateDueDate = () => {
    const today = new Date();
    switch (expectedCompletion) {
      case 'today':
        return today.toISOString().slice(0, 10);
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 10);
      case '3days':
        const threeDays = new Date(today);
        threeDays.setDate(threeDays.getDate() + 3);
        return threeDays.toISOString().slice(0, 10);
      case 'week':
        const week = new Date(today);
        week.setDate(week.getDate() + 7);
        return week.toISOString().slice(0, 10);
      case 'custom':
        return customDueDate;
      default:
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 3);
        return defaultDate.toISOString().slice(0, 10);
    }
  };

  // 处理单选分派
  const handleDispatch = () => {
    if (!dispatchModal.problem || !selectedWorker) return;

    dispatchProblem(
      dispatchModal.problem.id,
      selectedWorker.id,
      selectedWorker.name,
      'U001',
      '系统管理员',
      calculateDueDate(),
      requiredFeedback,
      selectedPriority
    );

    // 重置状态
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorker(null);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
  };

  // 处理批量分派
  const handleBatchDispatch = () => {
    if (selectedProblems.length === 0 || !selectedWorker) return;

    selectedProblems.forEach(problemId => {
      const problem = pendingProblems.find(p => p.id === problemId);
      if (problem) {
        dispatchProblem(
          problem.id,
          selectedWorker.id,
          selectedWorker.name,
          'U001',
          '系统管理员',
          calculateDueDate(),
          requiredFeedback,
          selectedPriority
        );
      }
    });

    // 重置状态
    setSelectedProblems([]);
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorker(null);
    setExpectedCompletion('3days');
    setCustomDueDate('');
    setSelectedPriority('medium');
  };

  // 切换全选
  const toggleSelectAll = () => {
    if (selectedProblems.length === pendingProblems.length) {
      setSelectedProblems([]);
    } else {
      setSelectedProblems(pendingProblems.map(p => p.id));
    }
  };

  // 切换单选
  const toggleSelect = (id: number) => {
    if (selectedProblems.includes(id)) {
      setSelectedProblems(prev => prev.filter(p => p !== id));
    } else {
      setSelectedProblems(prev => [...prev, id]);
    }
  };

  // 验证新增表单
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

  // 处理新增提交
  const handleCreateSubmit = () => {
    if (!validateForm()) return;

    addProblem({
      greenhouseId: formData.greenhouseId,
      greenhouseName: formData.greenhouseName,
      cropName: formData.cropName,
      inspectorId: formData.inspectorId,
      inspectorName: formData.inspectorName,
      checkDate: formData.checkDate,
      checkTime: formData.checkTime,
      weather: '晴',
      temperature: 25,
      humidity: 60,
      cropStatus: '正常',
      issueText: formData.issueText,
      issueSeverity: formData.issueSeverity,
      status: '待处理',
      // 来源追踪字段
      sourceModule: 'manual',
    });

    setShowCreateModal(false);
    setFormData({
      greenhouseId: '',
      greenhouseName: '',
      cropName: '',
      inspectorId: 'U001',
      inspectorName: '系统管理员',
      checkDate: new Date().toISOString().slice(0, 10),
      checkTime: new Date().toTimeString().slice(0, 5),
      issueText: '',
      issueSeverity: '中等',
    });
    setErrors({});
  };

  // 处理新增关闭
  const handleCreateClose = () => {
    setShowCreateModal(false);
    setFormData({
      greenhouseId: '',
      greenhouseName: '',
      cropName: '',
      inspectorId: 'U001',
      inspectorName: '系统管理员',
      checkDate: new Date().toISOString().slice(0, 10),
      checkTime: new Date().toTimeString().slice(0, 5),
      issueText: '',
      issueSeverity: '中等',
    });
    setErrors({});
  };

  // 处理删除确认
  const handleDeleteConfirm = () => {
    // 过滤出可以删除的问题（只能删除待处理且未分派的问题）
    const allProblems = [...pendingProblems, ...dispatchedProblems, ...handledProblems];
    const toDelete = selectedRows.filter(id => {
      const problem = allProblems.find(p => p.id === id);
      return problem && problem.status === '待处理' && !problem.sourceTaskId;
    });

    // 这里需要调用 deleteProblem 方法
    // 由于 useProblemDispatch 没有导出 deleteProblem，需要从 usePersistentProblems 获取

    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  // 处理导出确认
  const handleConfirmExport = async () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    // 实际导出逻辑
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
      '处理人': row.handler || '-',
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

    const fileName = `问题分派_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      console.error('Export failed:', err);
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

  // 处理导出取消
  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 切换全选（编辑/删除/导出模式）
  const handleBatchSelectAll = () => {
    // 批量分派模式：只选择待处理且没有sourceTaskId的问题
    // 导出/删除模式：选择所有已筛选的问题
    const selectable = batchDispatchMode
      ? filteredProblems.filter(p => p.status === '待处理' && !p.sourceTaskId)
      : filteredProblems;
    if (selectedRows.length === selectable.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectable.map(p => p.id));
    }
  };

  // 切换单选（编辑/删除模式）
  const handleBatchSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(prev => prev.filter(p => p !== id));
    } else {
      setSelectedRows(prev => [...prev, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <ProblemPageHeader />

      {/* 统计卡片 */}
      <ProblemStatsCards
        totalCount={totalCount}
        pendingCount={pendingProblems.length}
        dispatchedCount={dispatchedProblems.length}
        handledCount={handledProblems.length}
      />

      {/* 标签页切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            问题列表
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {totalCount}
            </span>
          </button>
          <button
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
              {tasks.filter(t => t.sourceProblemId).length}
            </span>
          </button>
        </div>
      </div>

      {/* 问题列表 */}
      {activeTab === 'problems' && (
      <>
      {/* 筛选工具栏 */}
      <ProblemFilterToolbar
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
        onBatchDispatch={() => {
          setBatchDispatchMode(true);
          setSelectedProblems([]);
          setStatusFilter('pending');
        }}
        onBatchDelete={() => {}}
        onShowDeleteWarning={() => setShowDeleteWarning(true)}
        onExport={() => {
          setExportMode(true);
          setSelectedRows([]);
        }}
        onCancelExport={handleCancelExport}
        onCancelBatchDelete={() => {
          setBatchDeleteMode(false);
          setSelectedRows([]);
        }}
        onCancelBatchDispatch={() => {
          setBatchDispatchMode(false);
          setSelectedProblems([]);
        }}
      />

      {/* 问题表格 */}
      <ProblemTable
        problems={filteredProblems}
        selectedRows={selectedRows}
        selectedProblems={selectedProblems}
        batchDeleteMode={batchDeleteMode}
        batchDispatchMode={batchDispatchMode}
        exportMode={exportMode}
        pendingProblems={pendingProblems}
        onViewDetail={(problem) => setDetailModal({ isOpen: true, problem })}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={handleBatchSelectAll}
        onBatchSelectAll={toggleSelectAll}
        onBatchDispatch={() => setDispatchModal({ isOpen: true, problem: null, batchMode: true })}
        onSingleDispatch={(problem) => setDispatchModal({ isOpen: true, problem, batchMode: false })}
        onBatchDelete={() => setShowDeleteWarning(true)}
        onExport={() => setExportMode(true)}
        onCancelBatchDelete={() => {
          setBatchDeleteMode(false);
          setSelectedRows([]);
        }}
        onCancelBatchDispatch={() => {
          setBatchDispatchMode(false);
          setSelectedProblems([]);
        }}
        onCancelExport={handleCancelExport}
        onShowExportModal={() => setShowExportModal(true)}
      />

      {/* 分派弹窗 */}
      <Modal
        isOpen={dispatchModal.isOpen}
        onClose={() => {
          setDispatchModal({ isOpen: false, problem: null, batchMode: false });
          setSelectedWorker(null);
          setExpectedCompletion('3days');
          setCustomDueDate('');
          setSelectedPriority('medium');
          setDispatchMode('ai_assisted'); // 重置分派模式
        }}
        title={dispatchModal.batchMode ? '批量分派问题' : '分派问题'}
        size="xl"
        showFooter={true}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => {
                setDispatchModal({ isOpen: false, problem: null, batchMode: false });
                setSelectedWorker(null);
                setExpectedCompletion('3days');
                setCustomDueDate('');
                setSelectedPriority('medium');
                setDispatchMode('ai_assisted'); // 重置分派模式
              }}
              className="px-5 py-2.5 text-base font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={dispatchModal.batchMode ? handleBatchDispatch : handleDispatch}
              disabled={!selectedWorker}
              className={`px-6 py-2.5 text-base font-medium rounded-lg transition-colors ${
                selectedWorker
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              确认分派
            </button>
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
              <button
                type="button"
                onClick={() => setDispatchMode('ai_assisted')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  dispatchMode === 'ai_assisted'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI推荐（默认）
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  dispatchMode === 'manual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                手动选择
              </button>
            </div>

            {/* AI辅助模式（仅单选分派时显示AI推荐面板） */}
            {dispatchMode === 'ai_assisted' && !dispatchModal.batchMode && dispatchModal.problem && (
              <AIRecommendationPanel
                taskInfo={getProblemTaskInfo(dispatchModal.problem)}
                recommendations={getProblemRecommendations(dispatchModal.problem)}
                onWorkerSelect={(workerId, score) => {
                  const worker = workerList.find(w => w.id === workerId);
                  if (worker) {
                    setSelectedWorker({ id: worker.id, name: worker.name });
                  }
                }}
                onManualSelect={() => setDispatchMode('manual')}
                config={{ ...DEFAULT_AI_RECOMMEND_CONFIG, defaultSelectTop: true }}
                selectedWorkerId={selectedWorker?.id}
              />
            )}

            {/* 手动模式（批量分派或切换为手动时显示） */}
            {(dispatchMode === 'manual' || (dispatchModal.batchMode && dispatchMode === 'ai_assisted')) && (
              <Select
                value={selectedWorker?.id || ''}
                onValueChange={(value) => {
                  const worker = workerList.find(w => w.id === value);
                  if (worker) {
                    setSelectedWorker({ id: worker.id, name: worker.name });
                  }
                }}
              >
                <SelectTrigger className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500">
                  <SelectValue placeholder="请选择执行人..." />
                </SelectTrigger>
                <SelectContent>
                  {workerList.map(worker => (
                    <SelectItem key={worker.id} value={worker.id} className="text-base py-3">
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-gray-500">{worker.position}</div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          {worker.skillTags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedWorker && (
              <div className="mt-2 text-sm text-emerald-600 font-medium">
                已选择：{selectedWorker.name}
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
                <button
                  key={opt.value}
                  onClick={() => setSelectedPriority(opt.value as typeof selectedPriority)}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex flex-col items-start min-w-[100px] ${
                    selectedPriority === opt.value
                      ? `${opt.bg} ${opt.border} ${opt.text} shadow-sm`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.desc}</span>
                </button>
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
                <button
                  key={opt.value}
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
                </button>
              ))}
              <button
                onClick={() => setExpectedCompletion('custom')}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  expectedCompletion === 'custom'
                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                自定义
              </button>
              {expectedCompletion === 'custom' && (
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
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
              {feedbackOptions.map(item => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                    requiredFeedback.includes(item.key)
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-emerald-200'
                  }`}
                >
                  <input
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
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      </>)}

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
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">任务编号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">任务标题</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">温室</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">执行人</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">截止日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">优先级</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">来源问题</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.filter(t => t.sourceProblemId).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        暂无分派任务
                      </td>
                    </tr>
                  ) : (
                    tasks.filter(t => t.sourceProblemId).map(task => {
                      const problem = [...pendingProblems, ...dispatchedProblems, ...handledProblems].find(
                        p => p.id === task.sourceProblemId
                      );
                      return (
                        <tr key={task.id} className="hover:bg-emerald-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">
                            {task.taskCode}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 max-w-[200px] truncate">
                            {task.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.greenhouseName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.assigneeName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {task.dueDate}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {(task.priority === 'high') ? '高' : (task.priority === 'medium') ? '中' : (task.priority === 'low') ? '低' : '未知'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              task.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {task.status === 'pending' ? '待执行' :
                               task.status === 'in_progress' ? '进行中' :
                               task.status === 'completed' ? '已完成' :
                               task.status === 'cancelled' ? '已取消' :
                               task.status === 'not_started' ? '未开始' :
                               task.status === 'paused' ? '已暂停' : '未知'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {problem ? (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                                  problem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {problem.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* 问题详情弹窗 */}
      {detailModal.isOpen && detailModal.problem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                问题详情 {detailModal.problem.problemCode}
              </h3>
              <button
                onClick={() => setDetailModal({ isOpen: false, problem: null })}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* 来源信息 */}
              <SourceBadge problem={detailModal.problem} />

              {/* 基本信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">温室区域</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.greenhouseName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">作物名称</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.cropName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">巡查人员</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.inspectorName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">巡查时间</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.checkDate} {detailModal.problem.checkTime}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">天气</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.weather}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">温湿度</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.temperature}°C / {detailModal.problem.humidity}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">作物状态</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.cropStatus}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">严重程度</div>
                    <div className="text-sm font-medium">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        detailModal.problem.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                        detailModal.problem.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {detailModal.problem.issueSeverity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 问题描述 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">问题描述</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800">
                  {detailModal.problem.issueText}
                </div>
              </div>

              {/* 处理信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">处理信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">当前状态</div>
                    <div className="text-sm font-medium">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        detailModal.problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                        detailModal.problem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                        detailModal.problem.status === '待验收' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {detailModal.problem.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">处理人</div>
                    <div className="text-sm font-medium text-gray-800">{detailModal.problem.handler || '-'}</div>
                  </div>
                  {detailModal.problem.handleDate && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">处理日期</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.problem.handleDate}</div>
                    </div>
                  )}
                  {detailModal.problem.handleResult && (
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">处理结果</div>
                      <div className="text-sm font-medium text-gray-800">{detailModal.problem.handleResult}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 流转记录 */}
              <div>
                <TaskFlowTimeline
                  records={detailModal.problem.flowRecords || []}
                  showStatusChange={true}
                />
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setDetailModal({ isOpen: false, problem: null })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
