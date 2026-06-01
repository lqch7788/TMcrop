import { useState, useEffect } from 'react';
import { FileCode, Plus, Search, Download, Eye, Edit, Trash2, Upload, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Modal, FormField, Input, Select, Textarea } from '../ui/Modal';
import { Label } from '../ui/label';
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input as UIInput } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { DictSelect } from '../common/settings/DictSelect';
import { DeleteWarningModal } from './DeleteWarningModal';
import { TechSolutionDetailModal } from './TechSolutionDetailModal';
import { useAuthPermission } from '../../hooks/usePermission';
import { useApproval } from '../../hooks/useApproval';
import { apiClient, USE_API } from '../../services/apiClient';
import { getDictionaries } from '../../services/dictionaryService';
import { useTechSolutionStore, useDictionaryStore, useAuthStore, getDictItemName } from '../../stores';
import { showAlert } from '@/lib/dialogService';
import { CropVariety } from '../../types/cropVariety';
import { Pagination } from '@/components/ui/Pagination';
import CropCodeSelector from '../farm/common/CropCodeSelector';
import { getVarietyByCode } from '../../services/cropVarietyService';
// 使用 import type 确保类型导入在编译时被擦除
import type { TechSolution } from '../../types/techSolution';

// re-export 保持向后兼容（type-only re-export 编译时被擦除）
export type { TechSolution };

// 适用范围选项（多选）
const scopeOptions = [
  '品种选育', '种子生产', '种源采集', '种子加工', '种子检测',
  '播种育苗', '催芽管理', '苗期管理', '出圃管理', '嫁接育苗', '组培育苗',
  '土壤准备', '定植移栽', '生长期管理', '开花结果期', '采收期管理',
  '温室环境调控', '大棚管理', '灌溉管理', '施肥管理', '病虫害防治',
  '采收管理', '分级包装', '贮藏保鲜', '加工处理',
  '全周期管理', '综合技术方案', '应急处理', '其他'
];

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

  // 从 Zustand Store 获取技术方案数据和操作方法
  const {
    solutions: techSolutions,
    isLoading,
    fetchSolutions,
    addSolution,
    updateSolution,
    deleteSolutions,
  } = useTechSolutionStore();

  // 从 useAuthStore 获取当前登录用户（避免直接读 localStorage）
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentUsername = currentUser?.username || '陆启闯';
  const currentUserId = currentUser?.oid || '';
  const currentDepartment = currentUser?.orgOid || '';

  // 操作人员选项（从数据字典获取）
  const [operatorOptions, setOperatorOptions] = useState<{ value: string; label: string }[]>([]);

  // 作物品种选择（与种源管理一致，CropCodeSelector 内部自动初始化品种数据）
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 字典加载状态 - 确保字典加载完成后再渲染
  const [dictReady, setDictReady] = useState(false);

  // 加载操作人员数据（从数据字典获取）
  useEffect(() => {
    async function loadOperators() {
      try {
        const dictionaries = await getDictionaries('operator');
        const options = dictionaries.map(d => ({
          value: d.name,
          label: d.name,
        }));
        // 如果数据字典为空，使用默认选项
        if (options.length === 0) {
          options.push(
            { value: '陆启闯', label: '陆启闯' },
            { value: '郭靖', label: '郭靖' },
            { value: '黄蓉', label: '黄蓉' },
            { value: '张无忌', label: '张无忌' }
          );
        }
        setOperatorOptions(options);
      } catch (error) {
        // logger.error('加载操作人员失败:', error);
        // 使用默认选项
        setOperatorOptions([
          { value: '陆启闯', label: '陆启闯' },
          { value: '郭靖', label: '郭靖' },
          { value: '黄蓉', label: '黄蓉' },
          { value: '张无忌', label: '张无忌' }
        ]);
      }
    }
    loadOperators();
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    fetchSolutions();
    // 确保字典数据已加载
    const loadDict = async () => {
      const state = useDictionaryStore.getState();
      if (state.dictionaries.length === 0) {
        await state.loadDictionaries();
      }
      setDictReady(true);
    };
    loadDict();
  }, [fetchSolutions]);

  // 页面可见性变化时自动刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSolutions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchSolutions]);

  // 窗口聚焦时刷新（解决审批通过后状态不同步问题）
  useEffect(() => {
    const handleFocus = () => {
      fetchSolutions();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSolutions]);

  // 过滤后的技术方案数据
  const filteredTechSolutions = techSolutions.filter(tech => {
    // 方案编号过滤
    if (code && !tech.code.toLowerCase().includes(code.toLowerCase())) {
      return false;
    }
    // 作物品种过滤
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
  const [scopeExpanded, setScopeExpanded] = useState(false); // 适用范围折叠状态
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
    cropCode: '',
    plantingMode: '',
    stage: '',
    version: '',
    content: '',
    remarks: '',
    relatedBatchCode: '',
    planDetailFileName: '',
    isValid: '有效',
    lastSubmitTime: '',
  });
  // 批量编辑相关状态
  const [editedTechCodes, setEditedTechCodes] = useState<string[]>([]);
  const [editedTechs, setEditedTechs] = useState<Record<string, Partial<TechSolution>>>({});
  const [selectedTechCode, setSelectedTechCode] = useState('');
  const [newPlanForm, setNewPlanForm] = useState({
    code: '',
    title: '',
    crop: '',
    cropCode: '',
    plantingMode: '水培',
    stage: '',
    author: currentUsername,
    version: 'V1.0',
    content: '',
    remarks: '',
    planDetailFileName: '',
    relatedBatchCode: '',
  });

  // 作物品种选择回调（与种源管理一致，CropCodeSelector 内部自动初始化品种数据）
  const [scopeExpandedEdit, setScopeExpandedEdit] = useState(false); // 编辑弹窗适用范围折叠状态

  const handleCropChange = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setNewPlanForm(prev => ({
        ...prev,
        crop: varietyInfo.subVariety1Name || varietyInfo.varietyName,
        cropCode: varietyInfo.cropCode,
      }));
    } else {
      setSelectedCrop(null);
      setNewPlanForm(prev => ({
        ...prev,
        crop: '',
        cropCode: '',
      }));
    }
  };

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

  // 编辑弹窗的作物品种选择
  const [selectedCropEdit, setSelectedCropEdit] = useState<CropVariety | null>(null);
  const handleCropChangeEdit = (code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCropEdit(varietyInfo);
      setEditForm(prev => ({
        ...prev,
        crop: varietyInfo.subVariety1Name || varietyInfo.varietyName,
        cropCode: varietyInfo.cropCode,
      }));
    } else {
      setSelectedCropEdit(null);
      setEditForm(prev => ({
        ...prev,
        crop: '',
        cropCode: '',
      }));
    }
  };

  const handleEditClick = (tech: TechSolution) => {
    // 作废的方案不能编辑
    if (tech.isValid === '作废') {
      showAlert('该方案已作废，无法编辑');
      return;
    }
    // 根据 cropCode 获取品种信息
    const varietyInfo = tech.cropCode ? getVarietyByCode(tech.cropCode) : null;
    setSelectedCropEdit(varietyInfo);
    setSelectedTech(tech);
    setEditForm({
      title: tech.title,
      crop: tech.crop,
      cropCode: tech.cropCode || '',
      plantingMode: tech.plantingMode,
      stage: tech.stage,
      version: tech.version,
      content: tech.content,
      remarks: tech.remarks || '',
      relatedBatchCode: tech.relatedBatchCode || '',
      planDetailFileName: tech.planDetailFileName || '',
      isValid: tech.isValid || '有效',
      // 保留原始最后提交时间，不重置（避免编辑时误覆盖）
      lastSubmitTime: tech.lastSubmitTime || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTech) return;

    const updateData = {
      solutionTitle: editForm.title,
      cropName: editForm.crop,
      cropCode: editForm.cropCode,
      plantingMode: editForm.plantingMode,
      stage: editForm.stage,
      version: editForm.version,
      content: editForm.content,
      remarks: editForm.remarks,
      relatedBatchCode: editForm.relatedBatchCode || '',
      planDetailFileName: editForm.planDetailFileName || '',
      priority: selectedTech.priority || 'normal',
      isValid: editForm.isValid,
      // 仅在原值为空时兜底，不强制覆盖
      lastSubmitTime: editForm.lastSubmitTime || selectedTech.lastSubmitTime || '',
    };

    try {
      if (USE_API) {
        await updateSolution(selectedTech.id, updateData);
        await fetchSolutions(); // 刷新列表
      }
      setEditModalOpen(false);
    } catch (error) {
      // logger.error('更新技术方案失败:', error);
      await showAlert('更新失败，请重试');
    }
  };

  const handleCreateSubmit = async (submitMode: 'draft' | 'submit') => {
    const today = new Date().toISOString().split('T')[0];

    // 构造技术方案数据
    const techSolutionData = {
      code: newPlanForm.code, // 方案编号
      solutionCode: newPlanForm.code, // 后端字段名（与 database map 兼容）
      solutionTitle: newPlanForm.title,
      cropName: newPlanForm.crop,
      cropCode: newPlanForm.cropCode,
      plantingMode: newPlanForm.plantingMode,
      stage: newPlanForm.stage,
      version: newPlanForm.version || 'V1.0',
      content: newPlanForm.content,
      remarks: newPlanForm.remarks,
      author: newPlanForm.author || currentUsername,
      authorId: currentUserId,
      relatedBatchCode: newPlanForm.relatedBatchCode || '',
      planDetailFileName: newPlanForm.planDetailFileName || '',
      priority: 'normal',
      batchStatus: submitMode === 'draft' ? 'draft' : 'pending', // 草稿或待审批
    };

    try {
      if (USE_API) {
        // 通过 Zustand Store 创建技术方案
        const result = await addSolution(techSolutionData);

        // 只有提交审批模式才创建审批单
        if (submitMode === 'submit') {
          const approvalData = {
            id: `AP${Date.now()}`,
            type: 'tech_solution',
            typeName: '技术方案',
            title: `技术方案审批：${newPlanForm.title}`,
            description: `作物：${newPlanForm.crop}\n种植模式：${getDictItemName('planting_mode', newPlanForm.plantingMode)}\n适用范围：${newPlanForm.stage}`,
            applicantId: currentUserId,
            applicantName: currentUsername,
            applicantDepartment: currentDepartment,
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

        // 刷新列表数据
        await fetchSolutions();
      }

      // 关闭模态框
      setCreateModalOpen(false);
      setNewPlanForm({
        code: '',
        title: '',
        crop: '',
        cropCode: '',
        plantingMode: '水培',
        stage: '',
        version: 'V1.0',
        content: '',
        remarks: '',
        planDetailFileName: '',
        relatedBatchCode: '',
      });
    } catch (error) {
      // logger.error('创建技术方案失败:', error);
      await showAlert('创建技术方案失败，请重试');
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
      showAlert('请先选择要导出的数据');
      return;
    }
    handleDoExport();
  };

  // 导出数据处理
  const handleDoExport = async () => {
    const selectedData = techSolutions.filter(t => selectedRows.includes(t.id));
    const headers = ['方案编号', '关联生产计划批次', '方案标题', '作物品种', '种植模式', '适用范围', '版本', '编制人', '创建日期', '状态', '方案是否有效'];
    const exportData = selectedData.map(row => ({
      '方案编号': row.code,
      '关联生产计划批次': row.relatedBatchCode || '-',
      '方案标题': row.title,
      '作物品种': row.crop,
      '种植模式': getDictItemName('planting_mode', row.plantingMode),
      '适用范围': row.stage,
      '版本': row.version,
      '编制人': row.author,
      '创建日期': row.createDate,
      '状态': row.status,
      '方案是否有效': row.isValid || '有效'
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
      showAlert('请先选择要删除的数据');
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
        // 通过 Store 批量删除
        await deleteSolutions(selectedIds);
      }
    } catch (error) {
      // logger.error('删除技术方案失败:', error);
      await showAlert('删除失败，请重试');
    }

    setShowDeleteModal(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleOpenCreateModal = () => {
    setNewPlanForm({
      code: generateCode(),
      title: '',
      crop: '',
      cropCode: '',
      plantingMode: '水培',
      stage: '',
      version: 'V1.0',
      content: '',
      remarks: '',
      planDetailFileName: '',
      relatedBatchCode: '',
    });
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-none">
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
            <Label>方案编号</Label>
            <UIInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入方案编号"
            />
          </div>
          <div className="min-w-[150px]">
            <Label>作物</Label>
            <UISelect value={cropFilter} onValueChange={(v) => setCropFilter(v)}>
              <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {/* 从已加载数据动态提取作物品种，避免硬编码 */}
                {Array.from(new Set(techSolutions.map(t => t.crop).filter(Boolean))).map(crop => (
                  <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                ))}
              </SelectContent>
            </UISelect>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>编制人</Label>
            <UIInput
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入编制人"
            />
          </div>
          <div className="min-w-[150px]">
            <Label>状态</Label>
            <UISelect value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="已发布">已发布</SelectItem>
                <SelectItem value="草稿">草稿</SelectItem>
                <SelectItem value="审核中">审核中</SelectItem>
              </SelectContent>
            </UISelect>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>开始日期</Label>
            <UIInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>结束日期</Label>
            <UIInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default" size="sm" onClick={handleReset}>
              重置
            </Button>
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
                  <Button variant="blue" size="sm" onClick={() => {
                      if (selectedRows.length === 0) {
                        showAlert('请先选择要编辑的数据');
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
                    }}>
                    <Edit className="w-4 h-4" />
                    编辑
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                      setBatchEditMode(false);
                      setSelectedRows([]);
                    }}>
                    取消
                  </Button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => {
                      if (selectedRows.length === 0) {
                        showAlert('请先选择要删除的数据');
                        return;
                      }
                      setShowDeleteModal(true);
                    }} disabled={selectedRows.length === 0}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                      setBatchDeleteMode(false);
                      setSelectedRows([]);
                    }}>
                    取消
                  </Button>
                </>
              )}
              {exportMode && (
                <>
                  <Button variant="default" size="sm" onClick={() => setShowExportModal(true)}>
                    <Download className="w-4 h-4" />
                    确认导出
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCancelExport}>
                    取消
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <Button variant="default" size="sm" onClick={handleOpenCreateModal}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && (
                <Button variant="blue" size="sm" onClick={() => {
                    setBatchEditMode(true);
                    setSelectedRows([]);
                  }}>
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => {
                    setBatchDeleteMode(true);
                    setSelectedRows([]);
                  }}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && (
                <Button variant="default" size="sm" onClick={handleExportClick}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </div>
          )}
        </div>
        {!dictReady ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">正在加载字典数据...</div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode || batchDeleteMode) && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === filteredTechSolutions.length && filteredTechSolutions.length > 0}
                    onCheckedChange={() => handleSelectAll()}
                  />
                </th>}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联生产计划批次</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案标题</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物品种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植模式</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">适用范围</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">版本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">编制人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案是否有效</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">方案详情文件</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTechSolutions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((tech) => (
                <tr key={tech.id} className="hover:bg-blue-100 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.includes(tech.id)}
                        onCheckedChange={() => handleSelectRow(tech.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleViewClick(tech)}>{tech.code}</Button>
                </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{tech.relatedBatchCode || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap">
                  <Button variant="ghost" size="sm" className="text-green-700 hover:text-green-900" onClick={() => handleTitleClick(tech)}>{tech.title}</Button>
                </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getDictItemName('planting_mode', tech.plantingMode)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.stage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{tech.createDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.status === '已发布' ? 'bg-green-100 text-green-700' :
                      tech.status === '待审批' ? 'bg-amber-100 text-amber-700' :
                      tech.status === '已拒绝' ? 'bg-red-100 text-red-700' :
                      tech.status === '已作废' ? 'bg-gray-300 text-gray-600' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tech.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tech.isValid === '作废' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {tech.isValid || '有效'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-xs truncate" title={tech.remarks}>
                    {tech.remarks || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {tech.isValid !== '作废' && (
                        <>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-1" title="编辑" onClick={() => handleEditClick(tech)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 p-1" title="删除" onClick={() => {
                            setSelectedRows([tech.id]);
                            setShowDeleteModal(true);
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {tech.isValid === '作废' && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 p-1" title="删除" onClick={() => {
                          setSelectedRows([tech.id]);
                          setShowDeleteModal(true);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {tech.planDetailFileName ? (
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" title="点击下载方案详情" onClick={() => {
                        // 下载方案详情文件
                        const fileName = tech.planDetailFileName!;
                        const isDocx = fileName.endsWith('.docx');
                        const content = `# ${tech.title}\n\n方案编号：${tech.code}\n作物品种：${tech.crop}\n种植模式：${getDictItemName('planting_mode', tech.plantingMode)}\n适用范围：${tech.stage}\n版本：${tech.version}\n编制人：${tech.author}\n创建日期：${tech.createDate}\n\n---方案内容---\n${tech.content}`;
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
                      }}>
                        {tech.planDetailFileName}
                      </Button>
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
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedRows.length === techSolutions.length ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTechSolutions.length / pageSize) || 1}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          showPageSize={true}
        />
      </div>

      {/* View Modal */}
      <TechSolutionDetailModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        tech={selectedTech}
      />

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
            {/* 方案编号 + 版本 */}
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

            {/* 方案标题 */}
            <FormField label="方案标题">
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              />
            </FormField>

            {/* 作物品种 + 种植模式 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="作物品种">
                <CropCodeSelector
                  value={editForm.cropCode || ''}
                  onChange={handleCropChangeEdit}
                  placeholder="搜索或选择作物品种..."
                  size="md"
                  showFullPath={true}
                />
                {selectedCropEdit && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700 flex items-center gap-1">
                      <Leaf className="w-3 h-3 flex-shrink-0" />
                      {selectedCropEdit.categoryName} &gt; {selectedCropEdit.typeName} &gt; {selectedCropEdit.varietyName}
                      {selectedCropEdit.subVariety1Name && ` > ${selectedCropEdit.subVariety1Name}`}
                    </div>
                    <div className="text-emerald-600 mt-0.5">
                      编码：{selectedCropEdit.cropCode}
                    </div>
                  </div>
                )}
              </FormField>
              <FormField label="种植模式">
                <DictSelect
                  category="planting_mode"
                  value={editForm.plantingMode}
                  onChange={(value) => setEditForm({...editForm, plantingMode: value})}
                  placeholder="选择种植模式"
                />
              </FormField>
            </div>

            {/* 适用范围（多选Checkbox） */}
            <FormField label="适用范围（可多选）">
              <div className="space-y-2">
                {/* 折叠/展开按钮 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScopeExpandedEdit(!scopeExpandedEdit)}
                  className="flex items-center gap-1 text-gray-600"
                >
                  {scopeExpandedEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{scopeExpandedEdit ? '收起' : '展开'}</span>
                </Button>
                {/* 选项列表 - 折叠时隐藏 */}
                {scopeExpandedEdit && (
                  <div className="flex flex-wrap gap-2">
                    {scopeOptions.map(option => (
                      <label key={option} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={editForm.stage.split(',').includes(option)}
                          onCheckedChange={(checked) => {
                            const currentStages = editForm.stage ? editForm.stage.split(',').filter(s => s) : [];
                            if (checked) {
                              setEditForm({...editForm, stage: [...currentStages, option].join(',')});
                            } else {
                              setEditForm({...editForm, stage: currentStages.filter(s => s !== option).join(',')});
                            }
                          }}
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            {/* 关联生产批次号 */}
            <FormField label="关联生产批次号">
              <Select
                value={editForm.relatedBatchCode}
                onChange={(e) => setEditForm({...editForm, relatedBatchCode: e.target.value})}
                options={[
                  { value: '', label: '不关联生产批次' },
                  { value: 'ZZB2026-001', label: 'ZZB2026-001' },
                  { value: 'ZZB2026-002', label: 'ZZB2026-002' },
                  { value: 'ZZB2026-003', label: 'ZZB2026-003' },
                  { value: 'YMB2026-001', label: 'YMB2026-001' },
                  { value: 'YMB2026-002', label: 'YMB2026-002' },
                  { value: 'JZB2026-001', label: 'JZB2026-001' },
                  { value: 'JZB2026-002', label: 'JZB2026-002' },
                ]}
              />
            </FormField>

            {/* 编制人 + 创建日期 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="编制人">
                <Input value={selectedTech.author} disabled className="bg-gray-50" />
              </FormField>
              <FormField label="创建日期">
                <Input value={selectedTech.createDate} disabled className="bg-gray-50" />
              </FormField>
            </div>

            {/* 备注 */}
            <FormField label="备注">
              <Textarea
                value={editForm.remarks}
                onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                rows={2}
              />
            </FormField>

            {/* 方案是否有效 */}
            <FormField label="方案是否有效">
              <Select
                value={editForm.isValid}
                onChange={(e) => setEditForm({...editForm, isValid: e.target.value})}
                options={[
                  { value: '有效', label: '有效' },
                  { value: '作废', label: '作废' },
                ]}
              />
              {editForm.isValid === '作废' && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ 选择"作废"后方案将无法使用，提交后将进入审核流程
                </p>
              )}
            </FormField>

            {/* 方案内容 */}
            <FormField label="方案内容">
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                rows={6}
              />
            </FormField>

            {/* 方案详细文件上传 */}
            <FormField label="方案详情文件">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="blue"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.md,.docx';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditForm({...editForm, content: event.target?.result as string});
                          setEditForm({...editForm, planDetailFileName: file.name});
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  导入文件
                </Button>
                <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式</span>
                {editForm.planDetailFileName && (
                  <span className="text-xs text-emerald-600">{editForm.planDetailFileName}</span>
                )}
                {editForm.planDetailFileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditForm({...editForm, content: '', planDetailFileName: ''});
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </Button>
                )}
              </div>
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
        showFooter={true}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCreateSubmit('draft')}
            >
              存为草稿
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => handleCreateSubmit('submit')}
            >
              提交审批
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 第一行：方案编号 + 方案标题 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="方案编号">
              <div className="flex gap-2 w-full">
                <div className="flex-1">
                  <Input
                    value={newPlanForm.code}
                    onChange={(e) => setNewPlanForm({...newPlanForm, code: e.target.value})}
                    placeholder="请输入方案编号"
                  />
                </div>
                <Button variant="default" size="sm" type="button" onClick={() => setNewPlanForm({...newPlanForm, code: generateCode()})}>
                  生成
                </Button>
              </div>
            </FormField>
            <FormField label="方案标题" required>
              <Input
                value={newPlanForm.title}
                onChange={(e) => setNewPlanForm({...newPlanForm, title: e.target.value})}
                placeholder="请输入方案标题"
              />
            </FormField>
          </div>

          {/* 第二行：版本 + 创建日期 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="版本">
              <Input
                value={newPlanForm.version}
                onChange={(e) => setNewPlanForm({...newPlanForm, version: e.target.value})}
              />
            </FormField>
            <FormField label="创建日期">
              <Input value={new Date().toISOString().split('T')[0]} disabled className="bg-gray-50" />
            </FormField>
          </div>

          {/* 第三行：作物品种 + 种植模式 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 作物品种 - 使用统一的 CropCodeSelector（与种源管理一致） */}
            <FormField label="作物品种" required>
              <CropCodeSelector
                value={newPlanForm.cropCode || ''}
                onChange={handleCropChange}
                placeholder="搜索或选择作物品种..."
                size="md"
                showFullPath={true}
              />
              {/* 显示选中作物的详细信息 */}
              {selectedCrop && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="text-emerald-700 flex items-center gap-1">
                    <Leaf className="w-3 h-3 flex-shrink-0" />
                    {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                    {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                  </div>
                  <div className="text-emerald-600 mt-0.5">
                    编码：{selectedCrop.cropCode}
                  </div>
                </div>
              )}
            </FormField>
            <FormField label="种植模式">
              <DictSelect
                category="planting_mode"
                value={newPlanForm.plantingMode}
                onChange={(value) => setNewPlanForm({...newPlanForm, plantingMode: value})}
                placeholder="选择种植模式"
              />
            </FormField>
          </div>

          {/* 第四行：适用范围（多选Checkbox）+ 关联生产批次号 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="适用范围（可多选）">
              <div className="space-y-2">
                {/* 折叠/展开按钮 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScopeExpanded(!scopeExpanded)}
                  className="flex items-center gap-1 text-gray-600"
                >
                  {scopeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{scopeExpanded ? '收起' : '展开'}</span>
                </Button>
                {/* 选项列表 - 折叠时隐藏 */}
                {scopeExpanded && (
                  <div className="flex flex-wrap gap-2">
                    {scopeOptions.map(option => (
                      <label key={option} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={newPlanForm.stage.split(',').includes(option)}
                          onCheckedChange={(checked) => {
                            const currentStages = newPlanForm.stage ? newPlanForm.stage.split(',').filter(s => s) : [];
                            if (checked) {
                              setNewPlanForm({...newPlanForm, stage: [...currentStages, option].join(',')});
                            } else {
                              setNewPlanForm({...newPlanForm, stage: currentStages.filter(s => s !== option).join(',')});
                            }
                          }}
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
            <FormField label="关联生产批次号">
              <Select
                value={newPlanForm.relatedBatchCode}
                onChange={(e) => setNewPlanForm({...newPlanForm, relatedBatchCode: e.target.value})}
                options={[
                  { value: '', label: '不关联生产批次' },
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

          {/* 第五行：编制人 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="编制人">
              <Select
                value={newPlanForm.author}
                onChange={(e) => setNewPlanForm({...newPlanForm, author: e.target.value})}
                options={operatorOptions}
              />
            </FormField>
          </div>

          {/* 第六行：备注（单独一行） */}
          <FormField label="备注">
            <Textarea
              value={newPlanForm.remarks}
              onChange={(e) => setNewPlanForm({...newPlanForm, remarks: e.target.value})}
              placeholder="请输入备注信息"
              rows={3}
            />
          </FormField>

          {/* 第七行：方案详细文件上传（单独一行） */}
          <FormField label="方案详细">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="blue"
                size="sm"
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
                        setNewPlanForm({...newPlanForm, planDetailFileName: file.name});
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-3 h-3 mr-1" />
                导入文件
              </Button>
              <span className="text-xs text-gray-500">支持 .txt, .md, .docx 格式</span>
              {newPlanForm.planDetailFileName && (
                <span className="text-xs text-emerald-600">{newPlanForm.planDetailFileName}</span>
              )}
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
              <Label>选择技术方案编号</Label>
              <UISelect value={selectedTechCode} onValueChange={(v) => setSelectedTechCode(v)}>
                <SelectTrigger><SelectValue placeholder="请选择方案编号" /></SelectTrigger>
                <SelectContent>
                  {techSolutions.filter(t => selectedRows.includes(t.id)).map(tech => (
                    <SelectItem key={tech.id} value={tech.code}>
                      {tech.code} - {tech.title}{' '}
                      {editedTechCodes.includes(tech.code) ? '✅ 已编辑' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </UISelect>
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
                  <UIInput
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
                    className="h-7 py-0 text-xs"
                  />
                </div>

                {/* 方案标题 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                  <div className="text-xs text-gray-500 mb-1">方案标题</div>
                  <UIInput
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
                    className="h-7 py-0 text-xs"
                  />
                </div>

                {/* 作物品种 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">作物品种</div>
                  <UISelect value={editedData.crop ?? currentTech.crop} onValueChange={(v) => {
                    const updated = {
                      ...editedTechs,
                      [selectedTechCode]: { ...editedTechs[selectedTechCode], crop: v },
                    };
                    setEditedTechs(updated);
                    if (!editedTechCodes.includes(selectedTechCode)) {
                      setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                    }
                  }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {/* 从已加载数据动态提取作物品种，避免硬编码 */}
                      {Array.from(new Set(techSolutions.map(t => t.crop).filter(Boolean))).map(crop => (
                        <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                      ))}
                    </SelectContent>
                  </UISelect>
                </div>

                {/* 种植模式 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">种植模式</div>
                  <DictSelect
                    category="planting_mode"
                    value={editedData.plantingMode ?? currentTech.plantingMode}
                    onChange={(v) => {
                      const updated = {
                        ...editedTechs,
                        [selectedTechCode]: { ...editedTechs[selectedTechCode], plantingMode: v },
                      };
                      setEditedTechs(updated);
                      if (!editedTechCodes.includes(selectedTechCode)) {
                        setEditedTechCodes([...editedTechCodes, selectedTechCode]);
                      }
                    }}
                    placeholder="选择种植模式"
                  />
                </div>

                {/* 适用范围 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">适用范围</div>
                  <UIInput
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
                    className="h-7 py-0 text-xs"
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

                {/* 方案详情文件 - 可编辑 */}
                <div className="bg-gray-50 rounded-lg p-2 col-span-4">
                  <div className="text-xs text-gray-500 mb-1">方案详情文件</div>
                  <div className="flex items-center gap-4">
                    {editedData.planDetailFileName ?? currentTech.planDetailFileName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          {editedData.planDetailFileName ?? currentTech.planDetailFileName}
                        </span>
                        <Button
                          variant="blue"
                          size="sm"
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
                        >
                          <Upload className="w-3 h-3" />
                          重新上传
                        </Button>
                        <span className="text-xs text-gray-500">支持 .md, .docx, .txt 格式</span>
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
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
                      >
                        <Upload className="w-3 h-3" />
                        上传方案文件
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBatchEditModal(false);
                setBatchEditMode(false);
                setSelectedRows([]);
                setEditedTechCodes([]);
                setEditedTechs({});
              }}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                try {
                  if (USE_API) {
                    // 通过 Store 逐条更新技术方案
                    for (const tech of techSolutions) {
                      const edited = editedTechs[tech.code];
                      if (edited) {
                        await updateSolution(tech.id, {
                          solutionTitle: edited.title ?? tech.title,
                          cropName: edited.crop ?? tech.crop,
                          plantingMode: edited.plantingMode ?? tech.plantingMode,
                          stage: edited.stage ?? tech.stage,
                          version: edited.version ?? tech.version,
                          content: edited.content ?? tech.content,
                          relatedBatchCode: tech.relatedBatchCode || '',
                          planDetailFileName: tech.planDetailFileName || '',
                          priority: tech.priority || 'normal',
                          remarks: '',
                        });
                      }
                    }
                  }
                  setShowBatchEditModal(false);
                  setBatchEditMode(false);
                  setSelectedRows([]);
                  setEditedTechCodes([]);
                  setEditedTechs({});
                  await showAlert(`已保存 ${editedTechCodes.length} 个技术方案的修改`);
                } catch (error) {
                  // logger.error('批量保存失败:', error);
                  await showAlert('保存失败，请重试');
                }
              }}
            >
              保存
            </Button>
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
              <div
                key={format.value}
                onClick={() => setExportFormat(format.value)}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  exportFormat === format.value
                    ? 'border-emerald-500'
                    : 'border-gray-400'
                }`}>
                  {exportFormat === format.value && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{format.label}</p>
                  <p className="text-xs text-gray-500">{format.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
