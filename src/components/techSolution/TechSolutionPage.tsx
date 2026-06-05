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
import { TechSolutionHeader } from './Header';
import { TechSolutionFilters, type TechSolutionFiltersValue } from './TechSolutionFilters';
import { TechSolutionTable, type TechSolutionTableHandlers } from './TechSolutionTable';
import { ExportFormatModal } from './ExportFormatModal';
import { EditModal, type EditForm } from './EditModal';
import { CreateModal, type NewPlanForm } from './CreateModal';
import { BatchEditModal, type BatchEditData } from './BatchEditModal';

// re-export 保持向后兼容（type-only re-export 编译时被擦除）
export type { TechSolution };

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

  // 操作人员选项（从数据字典获取）— 2026-06-05: 初始值直接放 4 个默认人，防止 useEffect 异步跑导致第一帧下拉空
  const [operatorOptions, setOperatorOptions] = useState<{ value: string; label: string }[]>([
    { value: '陆启闯', label: '陆启闯' },
    { value: '郭靖', label: '郭靖' },
    { value: '黄蓉', label: '黄蓉' },
    { value: '张无忌', label: '张无忌' },
  ]);

  // 作物品种选择（与种源管理一致，CropCodeSelector 内部自动初始化品种数据）
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 字典加载状态 - 确保字典加载完成后再渲染
  const [dictReady, setDictReady] = useState(false);

  // 2026-06-05: 合并字典 + tech.author 到 operatorOptions（防止字典收录不全时下拉空）
  useEffect(() => {
    let cancelled = false;
    async function loadAndMerge() {
      let base: { value: string; label: string }[] = [];
      try {
        const dictionaries = await getDictionaries('operator');
        base = dictionaries.map(d => ({ value: d.name, label: d.name }));
      } catch {
        // 忽略错误走默认
      }
      // 字典为空时使用默认 4 人
      if (base.length === 0) {
        base = [
          { value: '陆启闯', label: '陆启闯' },
          { value: '郭靖', label: '郭靖' },
          { value: '黄蓉', label: '黄蓉' },
          { value: '张无忌', label: '张无忌' },
        ];
      }
      // 合并列表里所有 author（去重）
      const known = new Set(base.map(o => o.value));
      techSolutions.forEach(t => {
        if (t.author && !known.has(t.author)) {
          base.push({ value: t.author, label: t.author });
          known.add(t.author);
        }
      });
      if (!cancelled) setOperatorOptions(base);
    }
    loadAndMerge();
    return () => { cancelled = true; };
  }, [techSolutions]);

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
    scopes: [] as string[], // V9.0: 适用范围数组
    author: '', // 2026-06-05: 补 author 字段，否则 EditModal 编制人 Select 显示空
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
    scopes: [] as string[], // V9.0: 适用范围数组
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
      scopes: tech.scopes || [], // V9.0: 适用范围数组
      author: tech.author || '', // 2026-06-05: 打开编辑时带原编制人
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
      // V9.0: 传 scopes 数组（替代 stage 字符串拼接）
      scopeNames: editForm.scopes,
      author: editForm.author, // 2026-06-05: 补 author，否则编制人编辑不保存
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
      // V9.0: 传 scopes 数组（替代 stage 字符串拼接）
      scopeNames: newPlanForm.scopes,
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
        scopes: [] as string[], // 2026-06-05: 补回 scopes，否则再次打开会 .includes 崩
        author: currentUsername, // 2026-06-05: 补回 author
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
      scopes: [] as string[], // V9.0: 适用范围数组（之前漏了导致 .includes 崩溃）
      author: currentUsername,  // 之前漏了
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
      <TechSolutionHeader />

      <TechSolutionFilters
        value={{
          code,
          crop: cropFilter,
          author,
          status,
          startDate,
          endDate,
        }}
        crops={Array.from(new Set(techSolutions.map((t) => t.crop).filter(Boolean)))}
        onChange={(field, value) => {
          switch (field) {
            case 'code': setCode(value); break;
            case 'crop': setCropFilter(value); break;
            case 'author': setAuthor(value); break;
            case 'status': setStatus(value); break;
            case 'startDate': setStartDate(value); break;
            case 'endDate': setEndDate(value); break;
          }
        }}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <TechSolutionTable
        techSolutions={filteredTechSolutions.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        )}
        selectedRows={selectedRows}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        batchDeleteMode={batchDeleteMode}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        getDictItemName={getDictItemName}
        handlers={{
          onViewClick: handleViewClick,
          onTitleClick: handleTitleClick,
          onEditClick: handleEditClick,
          onDeleteClick: (tech) => {
            setSelectedRows([tech.id]);
            setShowDeleteModal(true);
          },
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
          onOpenCreate: handleOpenCreateModal,
          onEnterBatchEdit: () => {
            setBatchEditMode(true);
            setSelectedRows([]);
          },
          onEnterBatchDelete: () => {
            setBatchDeleteMode(true);
            setSelectedRows([]);
          },
          onEnterExport: handleExportClick,
          onConfirmExport: () => setShowExportModal(true),
          onCancelExport: handleCancelExport,
          onConfirmBatchEdit: () => {
            if (selectedRows.length === 0) {
              showAlert('请先选择要编辑的数据');
              return;
            }
            const selectedTechsData = techSolutions.filter((t) => selectedRows.includes(t.id));
            if (selectedTechsData.length > 0) {
              setSelectedTechCode(selectedTechsData[0].code);
            }
            setEditedTechCodes([]);
            setEditedTechs({});
            setShowBatchEditModal(true);
          },
          onCancelBatchEdit: () => {
            setBatchEditMode(false);
            setSelectedRows([]);
          },
          onConfirmBatchDelete: () => {
            if (selectedRows.length === 0) {
              showAlert('请先选择要删除的数据');
              return;
            }
            setShowDeleteModal(true);
          },
          onCancelBatchDelete: () => {
            setBatchDeleteMode(false);
            setSelectedRows([]);
          },
          onDownloadDetail: (tech) => {
            const fileName = tech.planDetailFileName!;
            const isDocx = fileName.endsWith('.docx');
            const content = `# ${tech.title}\n\n方案编号：${tech.code}\n作物品种：${tech.crop}\n种植模式：${getDictItemName('planting_mode', tech.plantingMode)}\n适用范围：${tech.stage}\n版本：${tech.version}\n编制人：${tech.author}\n创建日期：${tech.createDate}\n\n---方案内容---\n${tech.content}`;
            const blob = new Blob([content], {
              type: isDocx
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'text/markdown',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          },
        }}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTechSolutions.length / pageSize) || 1}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          showPageSize={true}
        />
      </div>
      <TechSolutionDetailModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        tech={selectedTech}
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={editModalOpen}
        tech={selectedTech}
        form={editForm}
        scopeExpanded={scopeExpandedEdit}
        selectedCrop={selectedCropEdit}
        operatorOptions={operatorOptions}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        onFormChange={setEditForm}
        onScopeToggle={() => setScopeExpandedEdit(!scopeExpandedEdit)}
        onCropChange={handleCropChangeEdit}
      />

      {/* Create Modal */}
      <CreateModal
        isOpen={createModalOpen}
        form={newPlanForm}
        scopeExpanded={scopeExpanded}
        selectedCrop={selectedCrop}
        operatorOptions={operatorOptions}
        onClose={() => setCreateModalOpen(false)}
        onFormChange={setNewPlanForm}
        onScopeToggle={() => setScopeExpanded(!scopeExpanded)}
        onCropChange={handleCropChange}
        onGenerateCode={generateCode}
        onSubmitDraft={() => handleCreateSubmit('draft')}
        onSubmitApprove={() => handleCreateSubmit('submit')}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        techSolutions={techSolutions}
        selectedRows={selectedRows}
        selectedTechCode={selectedTechCode}
        editedTechCodes={editedTechCodes}
        editedTechs={editedTechs as Record<string, BatchEditData>}
        operatorOptions={operatorOptions}
        onClose={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
        }}
        onSelectTechCode={setSelectedTechCode}
        onEditField={(code, field, value) => {
          setEditedTechs({
            ...editedTechs,
            [code]: { ...editedTechs[code], [field]: value },
          });
          if (!editedTechCodes.includes(code)) {
            setEditedTechCodes([...editedTechCodes, code]);
          }
        }}
        onUploadFile={(code, file) => {
          setEditedTechs({
            ...editedTechs,
            [code]: { ...editedTechs[code], planDetailFileName: file.name },
          });
          const reader = new FileReader();
          reader.onload = (event) => {
            setEditedTechs({
              ...editedTechs,
              [code]: {
                ...editedTechs[code],
                planDetailFileName: file.name,
                content: event.target?.result as string,
              },
            });
          };
          reader.readAsText(file);
          if (!editedTechCodes.includes(code)) {
            setEditedTechCodes([...editedTechCodes, code]);
          }
        }}
        onCancel={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setEditedTechCodes([]);
          setEditedTechs({});
        }}
        onSave={async () => {
          try {
            if (USE_API) {
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
            await showAlert('保存失败，请重试');
          }
        }}
      />

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Export Format Modal */}
      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        selectedFormat={exportFormat}
        onClose={() => setShowExportModal(false)}
        onFormatChange={setExportFormat}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}
