/**
 * 问题分派页面
 * 将问题分派给员工处理，并创建关联任务
 */

import { useState, useMemo } from 'react';
import { Send, X, AlertTriangle, CheckCircle, Clock, User, List, Eye, Plus, Edit, Trash2, Download } from 'lucide-react';
import { useProblemDispatch } from '../../../hooks';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import type { ProblemEntry } from '../../../hooks/usePersistentProblems';
import type { Task } from '../../../types';
import {
  DeleteWarningModal,
  ExportFormatModal,
} from './modals';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import type { ProblemFlowRecord } from '../../../hooks/useProblemDispatch';
import { SourceFilter } from './components/SourceFilter';
import { SourceCell } from './components/SourceCell';
import { SourceBadge } from './components/SourceBadge';
import type { SourceModuleType } from './constants/sourceConfig';

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

  // 处理单选分派
  const handleDispatch = () => {
    if (!dispatchModal.problem || !selectedWorker) return;

    dispatchProblem(
      dispatchModal.problem.id,
      selectedWorker.id,
      selectedWorker.name
    );

    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorker(null);
  };

  // 处理批量分派
  const handleBatchDispatch = () => {
    if (selectedProblems.length === 0 || !selectedWorker) return;

    selectedProblems.forEach(problemId => {
      const problem = pendingProblems.find(p => p.id === problemId);
      if (problem) {
        dispatchProblem(problem.id, selectedWorker.id, selectedWorker.name);
      }
    });

    setSelectedProblems([]);
    setDispatchModal({ isOpen: false, problem: null, batchMode: false });
    setSelectedWorker(null);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">问题分派</h1>
            <p className="text-sm text-gray-500">将巡检发现的问题分派给员工处理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
              <div className="text-sm text-gray-500">问题总数</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{pendingProblems.length}</div>
              <div className="text-sm text-gray-500">待分派</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{dispatchedProblems.length}</div>
              <div className="text-sm text-gray-500">已分派</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{handledProblems.length}</div>
              <div className="text-sm text-gray-500">已处理</div>
            </div>
          </div>
        </div>
      </div>

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
              {tasks.length}
            </span>
          </button>
        </div>
      </div>

      {/* 问题列表 */}
      {activeTab === 'problems' && (
      <>
      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 时间筛选 */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                { value: 'all', label: '全部' },
                { value: 'week', label: '本周' },
                { value: 'month', label: '本月' },
                { value: 'year', label: '本年' },
                { value: 'custom', label: '时间段' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeFilter(opt.value as typeof timeFilter)}
                  className={`px-3 py-1.5 text-sm ${
                    timeFilter === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义时间段筛选 */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-400">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">状态：</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                { value: 'all', label: '全部' },
                { value: 'pending', label: '待分派' },
                { value: 'dispatched', label: '已分派' },
                { value: 'handled', label: '已处理' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value as typeof statusFilter)}
                  className={`px-3 py-1.5 text-sm ${
                    statusFilter === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 严重程度筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">严重程度：</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as typeof severityFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="轻微">轻微</option>
              <option value="中等">中等</option>
              <option value="严重">严重</option>
            </select>
          </div>

          {/* 来源模块筛选 */}
          <SourceFilter
            value={sourceModuleFilter}
            onChange={setSourceModuleFilter}
          />

          {/* 操作按钮 */}
          {exportMode ? (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setShowExportModal(true)}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={handleCancelExport}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setShowDeleteWarning(true)}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
              <button
                onClick={() => {
                  setBatchDeleteMode(false);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : batchDispatchMode ? (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setDispatchModal({ isOpen: true, problem: null, batchMode: true })}
                disabled={selectedProblems.length === 0}
                className="h-8 px-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                确认分派
              </button>
              <button
                onClick={() => {
                  setBatchDispatchMode(false);
                  setSelectedProblems([]);
                }}
                className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => {
                  setBatchDispatchMode(true);
                  setSelectedProblems([]); // 清空已选
                  setStatusFilter('pending'); // 自动切换到待分派筛选
                }}
                className="h-8 px-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                批量分派
              </button>
              <button
                onClick={() => {
                  setExportMode(true);
                  setSelectedRows([]);
                }}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 问题列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                  {(batchDeleteMode || exportMode || batchDispatchMode) && filteredProblems.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        batchDispatchMode
                          ? selectedProblems.length === pendingProblems.length && pendingProblems.length > 0
                          : selectedRows.length === filteredProblems.length
                      }
                      onChange={batchDispatchMode ? toggleSelectAll : handleBatchSelectAll}
                      className="w-4 h-4 rounded border-white/30 bg-white/20"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">来源</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">问题描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">严重程度</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">处理人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无问题数据
                  </td>
                </tr>
              ) : (
                filteredProblems.map(problem => (
                  <tr key={problem.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      {batchDispatchMode ? (
                        problem.status === '待处理' && !problem.sourceTaskId ? (
                          <input
                            type="checkbox"
                            checked={selectedProblems.includes(problem.id)}
                            onChange={() => toggleSelect(problem.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        ) : null
                      ) : (batchDeleteMode || exportMode) ? (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(problem.id)}
                          onChange={() => handleBatchSelectRow(problem.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      <button
                        onClick={() => setDetailModal({ isOpen: true, problem })}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                        title="点击查看详情"
                      >
                        {problem.problemCode}
                      </button>
                    </td>
                    {/* 来源列 */}
                    <td className="px-4 py-3">
                      <SourceCell problem={problem} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate">
                      {problem.issueText}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        problem.issueSeverity === '严重' ? 'bg-red-100 text-red-700' :
                        problem.issueSeverity === '中等' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {problem.issueSeverity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                        problem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {problem.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {problem.handler || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {problem.status === '待处理' && !problem.sourceTaskId && (
                        <button
                          onClick={() => setDispatchModal({ isOpen: true, problem, batchMode: false })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600"
                        >
                          <Send className="w-3 h-3" />
                          分派
                        </button>
                      )}
                      {problem.sourceTaskId && (
                        <span className="text-xs text-blue-600">已分派</span>
                      )}
                      {problem.status === '已处理' && (
                        <span className="text-xs text-green-600">已完成</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分派弹窗 */}
      {dispatchModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {dispatchModal.batchMode ? '批量分派问题' : '分派问题'}
              </h3>
              <button
                onClick={() => {
                  setDispatchModal({ isOpen: false, problem: null, batchMode: false });
                  setSelectedWorker(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {/* 问题信息 */}
              {dispatchModal.problem && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">问题描述</div>
                  <div className="text-sm font-medium text-gray-800 mb-2">
                    {dispatchModal.problem.issueText}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>温室：{dispatchModal.problem.greenhouseName}</span>
                    <span>严重程度：{dispatchModal.problem.issueSeverity}</span>
                  </div>
                </div>
              )}

              {dispatchModal.batchMode && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-orange-800">
                    选中了 {selectedProblems.length} 个问题，将分派给同一执行人
                  </div>
                </div>
              )}

              {/* 执行人选择 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  选择执行人
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {workerList.map(worker => (
                    <div
                      key={worker.id}
                      onClick={() => setSelectedWorker({ id: worker.id, name: worker.name })}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedWorker?.id === worker.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{worker.name}</div>
                          <div className="text-xs text-gray-500">{worker.position}</div>
                        </div>
                        <div className="flex gap-1">
                          {worker.skillTags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setDispatchModal({ isOpen: false, problem: null, batchMode: false });
                  setSelectedWorker(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={dispatchModal.batchMode ? handleBatchDispatch : handleDispatch}
                disabled={!selectedWorker}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                确认分派
              </button>
            </div>
          </div>
        </div>
      )}
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
                <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
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
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        暂无分派任务
                      </td>
                    </tr>
                  ) : (
                    tasks.map(task => {
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
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
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
                               task.status === 'cancelled' ? '已取消' : task.status}
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
