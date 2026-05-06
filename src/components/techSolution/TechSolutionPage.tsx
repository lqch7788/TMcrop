import { useState, useCallback, useEffect } from 'react';
import { FileCode, Plus, Search, Download, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { useAuthPermission } from '../../hooks/usePermission';
import { useApproval } from '../../hooks/useApproval';
import { apiClient, USE_API } from '../../services/apiClient';

// 技术方案类型定义
export interface TechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  plantingMode: string;
  stage: string;
  author: string;
  authorId?: string;
  createDate: string;
  status: string;
  batchStatus?: string;
  statusClass?: 'normal' | 'pending' | 'draft';
  version: string;
  approveStatus?: string;
  content: string;
  approvalDate?: string;
  approver?: string;
  relatedBatchCode?: string;
  planDetailFileName?: string;
}

// 种植模式选项
const plantingModes = ['水培', '土培', '基质培', '雾培'];

export function TechSolutionPage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  // 审批相关
  const { refreshApprovals } = useApproval();

  const [code, setCode] = useState('');
  const [cropFilter, setCropFilter] = useState('全部');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('全部');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // 技术方案数据状态
  const [techSolutions, setTechSolutions] = useState<TechSolution[]>([]);

  // 从 API 加载技术方案数据
  const loadTechSolutions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_API) {
        const response = await apiClient.get<TechSolution[]>('/tech-solutions');
        if (response && response.length > 0) {
          setTechSolutions(response);
        } else {
          setTechSolutions([]);
        }
      } else {
        setTechSolutions([]);
      }
    } catch (error) {
      console.error('加载技术方案数据失败:', error);
      setTechSolutions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadTechSolutions();
  }, [loadTechSolutions]);

  // 页面可见性变化时自动刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTechSolutions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadTechSolutions]);

  // 过滤后的技术方案数据
  const filteredTechSolutions = techSolutions.filter(tech => {
    // 方案编号过滤
    if (code && !tech.code.toLowerCase().includes(code.toLowerCase())) {
      return false;
    }
    // 作物种类过滤
    if (cropFilter && cropFilter !== '全部' && tech.crop !== cropFilter) {
      return false;
    }
    // 编制人过滤
    if (author && !tech.author.toLowerCase().includes(author.toLowerCase())) {
      return false;
    }
    // 状态过滤
    if (status && status !== '全部' && tech.status !== status) {
      return false;
    }
    // 开始日期过滤
    if (startDate && tech.createDate < startDate) {
      return false;
    }
    // 结束日期过滤
    if (endDate && tech.createDate > endDate) {
      return false;
    }
    return true;
  });

  // 搜索处理函数
  const handleSearch = () => {
    setCurrentPage(1); // 重置到第一页
  };

  // 重置处理函数
  const handleReset = () => {
    setCode('');
    setCropFilter('全部');
    setAuthor('');
    setStatus('全部');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechSolution | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    crop: '',
    plantingMode: '',
    stage: '',
    version: '',
    content: '',
  });
  // 批量编辑相关状态
  const [editedTechCodes, setEditedTechCodes] = useState<string[]>([]);
  const [editedTechs, setEditedTechs] = useState<Record<string, Partial<TechSolution>>>({});
  const [selectedTechCode, setSelectedTechCode] = useState('');
  const [newPlanForm, setNewPlanForm] = useState({
    code: '',
    title: '',
    crop: '番茄',
    plantingMode: '水培',
    stage: '',
    version: 'V1.0',
    content: '',
    planDetailFileName: '',
    relatedBatchCode: '',
  });

  const generateCode = () => {
    return `T${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleTitleClick = (tech: TechSolution) => {
    setSelectedTech(tech);
    setViewModalOpen(true);
  };

  const handleViewClick = (tech: TechSolution) => {
    setSelectedTech(tech);
    setViewModalOpen(true);
  };

  const handleEditClick = (tech: TechSolution) => {
    setSelectedTech(tech);
    setEditForm({
      title: tech.title,
      crop: tech.crop,
      plantingMode: tech.plantingMode,
      stage: tech.stage,
      version: tech.version,
      content: tech.content,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    setEditModalOpen(false);
  };

  const handleCreateSubmit = async () => {
    const today = new Date().toISOString().split('T')[0];

    // 构造技术方案数据
    const techSolutionData = {
      solutionTitle: newPlanForm.title,
      cropName: newPlanForm.crop,
      plantingMode: newPlanForm.plantingMode,
      stage: newPlanForm.stage,
      version: newPlanForm.version || 'V1.0',
      content: newPlanForm.content,
      author: localStorage.getItem('username') || '陆启闯',
      authorId: localStorage.getItem('userId') || '',
      relatedBatchCode: newPlanForm.relatedBatchCode || '',
      planDetailFileName: newPlanForm.planDetailFileName || '',
      priority: 'normal',
      batchStatus: 'pending', // 待审批状态
    };

    try {
      if (USE_API) {
        // 调用后端 API 创建技术方案
        const result = await apiClient.post<{ id: string; code: string }>('/tech-solutions', techSolutionData);

        // 创建审批单推送到审批中心
        const approvalData = {
          id: `AP${Date.now()}`,
          type: 'tech_solution',
          typeName: '技术方案',
          title: `技术方案审批：${newPlanForm.title}`,
          description: `作物：${newPlanForm.crop}\n种植模式：${newPlanForm.plantingMode}\n适用范围：${newPlanForm.stage}`,
          applicantId: localStorage.getItem('userId') || '',
          applicantName: localStorage.getItem('username') || '陆启闯',
          applicantDepartment: localStorage.getItem('department') || '',
          applyDate: today,
          status: 'pending',
          priority: 'normal',
          businessLink: {
            type: 'tech_solution',
            requestId: result.id,
            requestCode: result.code,
            solutionTitle: newPlanForm.title,
            cropName: newPlanForm.crop,
            plantingMode: newPlanForm.plantingMode,
            stage: newPlanForm.stage,
            version: newPlanForm.version || 'V1.0',
          },
        };
        await apiClient.post('/approvals', approvalData);

        // 刷新审批中心数据
        await refreshApprovals();
      }

      // 刷新技术方案列表
      await loadTechSolutions();

      // 关闭模态框
      setCreateModalOpen(false);
      setNewPlanForm({
        code: '',
        title: '',
        crop: '番茄',
        plantingMode: '水培',
        stage: '',
        version: 'V1.0',
        content: '',
        planDetailFileName: '',
        relatedBatchCode: '',
      });
    } catch (error) {
      console.error('创建技术方案失败:', error);
      alert('创建技术方案失败，请重试');
    }
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === techSolutions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(techSolutions.map(t => t.id));
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    const selectedData = techSolutions.filter(t => selectedRows.includes(t.id));
    const headers = ['方案编号', '关联生产计划批次', '方案标题', '作物种类', '种植模式', '适用范围', '版本', '编制人', '创建日期', '审核人', '审批状态', '状态'];
    const exportData = selectedData.map(row => ({
      '方案编号': row.code,
      '关联生产计划批次': row.relatedBatchCode || '-',
      '方案标题': row.title,
      '作物种类': row.crop,
      '种植模式': row.plantingMode,
      '适用范围': row.stage,
      '版本': row.version,
      '编制人': row.author,
      '创建日期': row.createDate,
      '审核人': row.approver,
      '审批状态': row.approveStatus,
      '状态': row.status
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `技术方案_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要删除的数据');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    // 获取选中的技术方案的ID
    const selectedIds = techSolutions
      .filter(t => selectedRows.includes(t.id))
      .map(t => t.id);

    try {
      if (USE_API) {
        // 调用API批量删除
        await apiClient.post('/tech-solutions/batch-delete', { ids: selectedIds });
      }
      // 刷新技术方案列表
      await loadTechSolutions();
    } catch (error) {
      console.error('删除技术方案失败:', error);
      alert('删除失败，请重试');
    }

    setShowDeleteModal(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleOpenCreateModal = () => {
    setNewPlanForm({
      code: generateCode(),
      title: '',
      crop: '番茄',
      plantingMode: '水培',
      stage: '',
      version: 'V1.0',
      content: '',
      planDetailFileName: '',
      relatedBatchCode: '',
    });
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">技术方案列表</h1>
            <p className="text-gray-500">种植技术方案的管理与发布</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">方案编号</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入方案编号"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物</label>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>番茄</option>
              <option>黄瓜</option>
              <option>草莓</option>
              <option>辣椒</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">编制人</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入编制人"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option>全部</option>
              <option>已发布</option>
              <option>草稿</option>
              <option>审核中</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={handleReset}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">技术方案列表</h3>
          {exportMode || batchEditMode || batchDeleteMode ? (
            <div className="flex gap-2">
              {batchEditMode && (
                <>
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的数据');
                        return;
                      }
                      // 初始化批量编辑状态
                      const selectedTechsData = techSolutions.filter(t => selectedRows.includes(t.id));
                      if (selectedTechsData.length > 0) {
                        setSelectedTechCode(selectedTechsData[0].code);
                      }
                      setEditedTechCodes([]);
                      setEditedTechs({});
                      setShowBatchEditModal(true);
                    }}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      setBatchEditMode(false);
                      setSelectedRows([]);
                    }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要删除的数据');
                        return;
                      }
                      setShowDeleteModal(true);
                    }}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
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
                </>
              )}
              {exportMode && (
                <>
                  <button onClick={() => setShowExportModal(true)} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    取消
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <button onClick={handleOpenCreateModal} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => {
                    setBatchEditMode(true);
                    setSelectedRows([]);
                  }}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    setBatchDeleteMode(true);
                    setSelectedRows([]);
                  }}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {canExport && (
                <button onClick={handleExportClick} className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredTechSolutions.length && filteredTechSolutions.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联生产计划批次</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">适用范围</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">版本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">编制人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审批状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案详情文件</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTechSolutions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((tech) => (
                <tr key={tech.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(tech.id)}
                        onChange={() => handleSelectRow(tech.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer whitespace-nowrap" onClick={() => handleViewClick(tech)}>{tech.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{tech.relatedBatchCode || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-700 hover:text-green-900 cursor-pointer whitespace-nowrap" onClick={() => handleTitleClick(tech)}>{tech.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.plantingMode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.stage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.createDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.approver}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {tech.approveStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                      tech.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tech.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {tech.planDetailFileName ? (
                      <button
                        onClick={() => {
                          // 下载方案详情文件
                          const fileName = tech.planDetailFileName!;
                          const isDocx = fileName.endsWith('.docx');
                          const content = `# ${tech.title}\n\n方案编号：${tech.code}\n作物种类：${tech.crop}\n种植模式：${tech.plantingMode}\n适用范围：${tech.stage}\n版本：${tech.version}\n编制人：${tech.author}\n创建日期：${tech.createDate}\n\n---方案内容---\n${tech.content}`;
                          const blob = new Blob([content], {
                            type: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/markdown'
                          });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        title="点击下载方案详情"
                      >
                        {tech.planDetailFileName}
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {exportMode && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {selectedRows.length === techSolutions.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination - 固定在表格外部底部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredTechSolutions.length} 条</span>
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{currentPage} / {Math.ceil(filteredTechSolutions.length / pageSize) || 1}</span>
          <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredTechSolutions.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredTechSolutions.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="方案详情"
        size="lg"
        showFooter={false}
      >
        {selectedTech && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">方案编号</label>
                <p className="text-gray-900 font-medium">{selectedTech.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">版本</label>
                <p className="text-gray-900">{selectedTech.version}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">方案标题</label>
              <p className="text-gray-900 font-medium">{selectedTech.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">作物种类</label>
                <p className="text-gray-900">{selectedTech.crop}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">种植模式</label>
                <p className="text-gray-900">{selectedTech.plantingMode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">适用范围</label>
                <p className="text-gray-900">{selectedTech.stage}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">编制人</label>
                <p className="text-gray-900">{selectedTech.author}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">创建日期</label>
                <p className="text-gray-900">{selectedTech.createDate}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">审核人</label>
                <p className="text-gray-900">{selectedTech.approver}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">审批状态</label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  selectedTech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedTech.approveStatus}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">状态</label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  selectedTech.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
                  selectedTech.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedTech.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">审批人</label>
                <p className="text-gray-900">{selectedTech.approver}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">审批日期</label>
                <p className="text-gray-900">{selectedTech.approvalDate}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">方案内容</label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-700 text-sm leading-relaxed">
                {selectedTech.content}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="编辑方案"
        size="lg"
        onSubmit={handleEditSubmit}
        submitText="保存"
        cancelText="取消"
      >
        {selectedTech && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="方案编号">
                <Input value={selectedTech.code} disabled className="bg-gray-50" />
              </FormField>
              <FormField label="版本">
                <Input
                  value={editForm.version}
                  onChange={(e) => setEditForm({...editForm, version: e.target.value})}
                />
              </FormField>
            </div>
            <FormField label="方案标题">
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="作物种类">
                <Select
                  value={editForm.crop}
                  onChange={(e) => setEditForm({...editForm, crop: e.target.value})}
                  options={[
                    { value: '番茄', label: '番茄' },
                    { value: '黄瓜', label: '黄瓜' },
                    { value: '草莓', label: '草莓' },
                    { value: '辣椒', label: '辣椒' },
                  ]}
                />
              </FormField>
              <FormField label="种植模式">
                <Select
                  value={editForm.plantingMode}
                  onChange={(e) => setEditForm({...editForm, plantingMode: e.target.value})}
                  options={plantingModes.map(mode => ({ value: mode, label: mode }))}
                />
              </FormField>
            </div>
            <FormField label="适用范围">
              <Input
                value={editForm.stage}
                onChange={(e) => setEditForm({...editForm, stage: e.target.value})}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="编制人">
                <Input value={selectedTech.author} disabled className="bg-gray-50" />
              </FormField>
              <FormField label="创建日期">
                <Input value={selectedTech.createDate} disabled className="bg-gray-50" />
              </FormField>
            </div>
            <FormField label="方案内容">
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                rows={6}
              />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新增方案"
        size="xxxl"
        onSubmit={handleCreateSubmit}
        submitText="提交"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="方案编号">
              <div className="flex gap-2">
                <Input
                  value={newPlanForm.code}
                  onChange={(e) => setNewPlanForm({...newPlanForm, code: e.target.value})}
                  placeholder="请输入方案编号"
                />
                <button
                  type="button"
                  onClick={() => setNewPlanForm({...newPlanForm, code: generateCode()})}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
                >
                  生成
                </button>
              </div>
            </FormField>
            <FormField label="版本">
              <Input
                value={newPlanForm.version}
                onChange={(e) => setNewPlanForm({...newPlanForm, version: e.target.value})}
              />
            </FormField>
          </div>
          <FormField label="方案标题" required>
            <Input
              value={newPlanForm.title}
              onChange={(e) => setNewPlanForm({...newPlanForm, title: e.target.value})}
              placeholder="请输入方案标题"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="作物种类">
              <Select
                value={newPlanForm.crop}
                onChange={(e) => setNewPlanForm({...newPlanForm, crop: e.target.value})}
                options={[
                  { value: '番茄', label: '番茄' },
                  { value: '黄瓜', label: '黄瓜' },
                  { value: '草莓', label: '草莓' },
                  { value: '辣椒', label: '辣椒' },
                ]}
              />
            </FormField>
            <FormField label="种植模式">
              <Select
                value={newPlanForm.plantingMode}
                onChange={(e) => setNewPlanForm({...newPlanForm, plantingMode: e.target.value})}
                options={plantingModes.map(mode => ({ value: mode, label: mode }))}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="关联生产批次号">
              <Select
                value={newPlanForm.relatedBatchCode}
                onChange={(e) => setNewPlanForm({...newPlanForm, relatedBatchCode: e.target.value})}
                options={[
                  { value: 'ZZB2026-001', label: 'ZZB2026-001 - 番茄种植批次' },
                  { value: 'ZZB2026-002', label: 'ZZB2026-002 - 黄瓜种植批次' },
                  { value: 'ZZB2026-003', label: 'ZZB2026-003 - 草莓种植批次' },
                  { value: 'YMB2026-001', label: 'YMB2026-001 - 番茄育苗批次' },
                  { value: 'YMB2026-002', label: 'YMB2026-002 - 黄瓜育苗批次' },
                  { value: 'JZB2026-001', label: 'JZB2026-001 - 番茄种源批次' },
                  { value: 'JZB2026-002', label: 'JZB2026-002 - 黄瓜种源批次' },
                ]}
              />
            </FormField>
          </div>
          <FormField label="适用范围">
            <Input
              value={newPlanForm.stage}
              onChange={(e) => setNewPlanForm({...newPlanForm, stage: e.target.value})}
              placeholder="请输入适用范围"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="编制人">
              <Input placeholder="请输入编制人" />
            </FormField>
            <FormField label="创建日期">
              <Input value={new Date().toISOString().split('T')[0]} disabled className="bg-gray-50" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="审核人">
              <Input value="Susan" disabled className="bg-gray-50" />
            </FormField>
          </div>
          <FormField label="方案详细">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.txt,.md,.docx';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setNewPlanForm({...newPlanForm, content: event.target?.result as string});
                        // 从文件名生成方案文件名
                        const fileName = file.name;
                        setNewPlanForm({...newPlanForm, planDetailFileName: fileName});
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                <Upload className="w-3 h-3" />
                导入文件
              </button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式文件</span>
            </div>
          </FormField>
        </div>
      </Modal>

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Batch Edit Modal */}
      <Modal
        isOpen={showBatchEditModal}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
        }}
        title="批量编辑技术方案"
        size="xxl"
        showFooter={false}
      >
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              已选择 <strong>{selectedRows.length}</strong> 个技术方案进行批量编辑，
              已编辑 <strong>{editedTechCodes.length}</strong> 个
            </p>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择技术方案编号</label>
              <select
                value={selectedTechCode}
                onChange={(e) => setSelectedTechCode(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择方案编号</option>
                {techSolutions.filter(t => selectedRows.includes(t.id)).map(tech => (
                  <option key={tech.id} value={tech.code}>
                    {tech.code} - {tech.title}{' '}
                    {editedTechCodes.includes(tech.code) && (
                      <span className="bg-green-100 text-green-700">✅ 已编辑</span>
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Edit Form */}
          {selectedTechCode && (() => {
            const currentTech = techSolutions.find(t => t.code === selectedTechCode);
            if (!currentTech) return null;
            const editedData = editedTechs[selectedTechCode] || {};
            return (
              <div className="grid grid-cols-4 gap-3">
                {/* 方案编号 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">方案编号</div>
                  <div className="text-sm font-medium text-gray-900">{currentTech.code}</div>
                </div>

                {/* 版本 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">版本</div>
                  <input
                    type="text"
                    value={editedData.version ?? currentTech.version}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], version: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 方案标题 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                  <div className="text-xs text-gray-500 mb-1">方案标题</div>
                  <input
                    type="text"
                    value={editedData.title ?? currentTech.title}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], title: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 作物种类 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">作物种类</div>
                  <select
                    value={editedData.crop ?? currentTech.crop}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], crop: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option>番茄</option>
                    <option>黄瓜</option>
                    <option>草莓</option>
                    <option>辣椒</option>
                  </select>
                </div>

                {/* 种植模式 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">种植模式</div>
                  <select
                    value={editedData.plantingMode ?? currentTech.plantingMode}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], plantingMode: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {plantingModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                {/* 适用范围 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">适用范围</div>
                  <input
                    type="text"
                    value={editedData.stage ?? currentTech.stage}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], stage: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 编制人 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">编制人</div>
                  <div className="text-sm text-gray-700">{currentTech.author}</div>
                </div>

                {/* 创建日期 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">创建日期</div>
                  <div className="text-sm text-gray-700">{currentTech.createDate}</div>
                </div>

                {/* 审核人 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">审核人</div>
                  <div className="text-sm text-gray-700">{currentTech.approver}</div>
                </div>

                {/* 审批状态 - 不可编辑 */}
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">审批状态</div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    currentTech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {currentTech.approveStatus}
                  </span>
                </div>

                {/* 状态 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">状态</div>
                  <select
                    value={editedData.status ?? currentTech.status}
                    onChange={(e) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], status: e.target.value },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option>已发布</option>
                    <option>审核中</option>
                    <option>草稿</option>
                  </select>
                </div>

                {/* 方案详情文件 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2 col-span-4">
                  <div className="text-xs text-gray-500 mb-1">方案详情文件</div>
                  <div className="flex items-center gap-4">
                    {editedData.planDetailFileName ?? currentTech.planDetailFileName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          {editedData.planDetailFileName ?? currentTech.planDetailFileName}
                        </span>
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.md,.docx,.txt';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                // 更新文件名
                                const updated = {
                                  ...editedTechs,
                                  [selectedTechCode]: {
                                    ...editedTechs[selectedTechCode],
                                    planDetailFileName: file.name
                                  },
                                };
                                setEditedTechs(updated);
                                // 读取文件内容
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const updatedWithContent = {
                                    ...editedTechs,
                                    [selectedTechCode]: {
                                      ...editedTechs[selectedTechCode],
                                      planDetailFileName: file.name,
                                      content: event.target?.result as string
                                    },
                                  };
                                  setEditedTechs(updatedWithContent);
                                };
                                reader.readAsText(file);
                                if (!editedTechCodes.includes(selectedTechCode)) {
                                  setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                                }
                              }
                            };
                            input.click();
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          重新上传
                        </button>
                        <span className="text-xs text-gray-500">支持 .md, .docx, .txt 格式</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.md,.docx,.txt';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const updated = {
                                ...editedTechs,
                                [selectedTechCode]: {
                                  ...editedTechs[selectedTechCode],
                                  planDetailFileName: file.name
                                },
                              };
                              setEditedTechs(updated);
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const updatedWithContent = {
                                  ...editedTechs,
                                  [selectedTechCode]: {
                                    ...editedTechs[selectedTechCode],
                                    planDetailFileName: file.name,
                                    content: event.target?.result as string
                                  },
                                };
                                setEditedTechs(updatedWithContent);
                              };
                              reader.readAsText(file);
                              if (!editedTechCodes.includes(selectedTechCode)) {
                                setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                              }
                            }
                          };
                          input.click();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        上传方案文件
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowBatchEditModal(false);
                setBatchEditMode(false);
                setSelectedRows([]);
                setEditedTechCodes([]);
                setEditedTechs({});
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={() => {
                console.log('保存编辑:', editedTechs);
                setShowBatchEditModal(false);
                setBatchEditMode(false);
                setSelectedRows([]);
                setEditedTechCodes([]);
                setEditedTechs({});
                alert(`已保存 ${editedTechCodes.length} 个技术方案的修改`);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      {/* Export Format Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="选择导出格式"
        size="sm"
        onSubmit={handleConfirmExport}
        submitText="导出"
        cancelText="取消"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">已选择 {selectedRows.length} 条数据</p>
          <div className="space-y-3">
            {[
              { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
              { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
              { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
            ].map((format) => (
              <label
                key={format.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  value={format.value}
                  checked={exportFormat === format.value}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{format.label}</p>
                  <p className="text-xs text-gray-500">{format.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
