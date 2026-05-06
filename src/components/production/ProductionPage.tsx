import { useState, useCallback, useEffect } from 'react';
import {
  Plus, FileText, Edit, Trash2, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cropBatches, cropTypes, plantingModes } from '../../data/mockData';
import { useGreenhouses } from '../common/settings';
import { CropBatch, PlanType, PlanTypeCodePrefix } from '../../types';
import { useAuthPermission } from '../../hooks/usePermission';
import { useApproval } from '../../hooks/useApproval';
import { apiClient, USE_API } from '../../services/apiClient';

import { ProductionStatsCards } from './ProductionStatsCards';
import { ProductionFilters } from './ProductionFilters';
import { ProductionTable } from './ProductionTable';
import {
  CreateBatchModal,
  BatchDetailModal,
  BatchEditModal,
  ExportFormatModal,
  VoidWarningModal,
  DeleteWarningModal,
} from './modals';

export default function ProductionPage() {
  const { greenhouses } = useGreenhouses();
  const { refreshApprovals } = useApproval();

  // 权限控制 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  const [statusFilter, setStatusFilter] = useState('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<CropBatch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batches, setBatches] = useState<CropBatch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // 从 API 加载生产计划数据
  const loadProductionData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (USE_API) {
        // 尝试从 API 获取生产计划数据
        const apiData = await apiClient.get<CropBatch[]>('/production/plans');
        if (apiData && apiData.length > 0) {
          setBatches(apiData);
        } else {
          setBatches(cropBatches);
        }
      } else {
        // 非 API 模式，检查是否后端已实现
        try {
          const apiData = await apiClient.get<CropBatch[]>('/production/plans');
          if (apiData && apiData.length > 0) {
            setBatches(apiData);
          } else {
            setBatches(cropBatches);
          }
        } catch {
          // API 不可用，使用 mock 数据
          setBatches(cropBatches);
        }
      }
    } catch (error) {
      console.error('加载生产计划数据失败，使用 mock 数据:', error);
      setBatches(cropBatches);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  // 页面可见性变化时自动刷新数据（从审批中心返回时自动更新）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProductionData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadProductionData]);

  // 模态框打开时初始化表单默认值
  useEffect(() => {
    if (showCreateModal) {
      // 获取第一个活跃的温室、默认种植模式、第一个负责人
      const activeGreenhouses = greenhouses.filter(g => g.status === 'active');
      const firstGreenhouseId = activeGreenhouses[0]?.id || '';
      const defaultMode = 'open_field'; // 露天栽培
      const firstResponsiblePerson = '郭靖'; // 默认负责人

      setFormData(prev => ({
        ...prev,
        greenhouseId: firstGreenhouseId,
        plantingMode: defaultMode,
        responsiblePerson: firstResponsiblePerson,
      }));
    }
  }, [showCreateModal, greenhouses]);

  // Search filters
  const [batchCodeSearch, setBatchCodeSearch] = useState('');
  const [plantingModeSearch, setPlantingModeSearch] = useState('');
  const [cropNameSearch, setCropNameSearch] = useState('');
  const [varietySearch, setVarietySearch] = useState('');
  const [greenhouseSearch, setGreenhouseSearch] = useState('');

  // Reset filters
  const resetFilters = () => {
    setBatchCodeSearch('');
    setPlantingModeSearch('');
    setCropNameSearch('');
    setVarietySearch('');
    setGreenhouseSearch('');
    setStatusFilter('all');
    setPlanTypeFilter('all');
  };

  // Form state
  const [formData, setFormData] = useState(() => ({
    batchCode: '',
    planType: PlanType.PLANTING as PlanType,  // 默认种植计划
    planTypeName: '种植计划',
    cropCode: '',  // 作物编码（11位）
    cropName: '',
    variety: '',
    greenhouseId: '',
    plantingArea: '',
    startDate: '',
    expectedHarvestDate: '',
    targetYield: '',
    plantingMode: '',
    responsiblePerson: '',
    publisher: localStorage.getItem('username') || '陆启闯',
    description: '',
    planDetail: ''
  }));

  // 使用useCallback确保onFormChange引用稳定
  const handleFormChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [editedBatchCodes, setEditedBatchCodes] = useState<string[]>([]);
  const [editedBatches, setEditedBatches] = useState<Record<string, Partial<CropBatch>>>({});
  const [showVoidWarning, setShowVoidWarning] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  const filteredBatches = batches.filter((batch) => {
    const matchBatchCode = !batchCodeSearch || batch.batchCode.toLowerCase().includes(batchCodeSearch.toLowerCase());
    const matchPlantingMode = !plantingModeSearch || batch.plantingMode.toLowerCase().includes(plantingModeSearch.toLowerCase());
    const matchCropName = !cropNameSearch || batch.cropName.toLowerCase().includes(cropNameSearch.toLowerCase());
    const matchVariety = !varietySearch || batch.variety.toLowerCase().includes(varietySearch.toLowerCase());
    const matchGreenhouse = !greenhouseSearch || batch.greenhouseName.toLowerCase().includes(greenhouseSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || batch.batchStatus === statusFilter;
    const matchPlanType = planTypeFilter === 'all' || batch.planType === planTypeFilter;
    return matchBatchCode && matchPlantingMode && matchCropName && matchVariety && matchGreenhouse && matchStatus && matchPlanType;
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = '请输入批次编号';
    if (!formData.cropName) newErrors.cropName = '请选择作物';
    if (!formData.variety.trim()) newErrors.variety = '请输入品种';
    if (!formData.greenhouseId) newErrors.greenhouseId = '请选择区域';
    if (!formData.plantingArea) newErrors.plantingArea = '请输入种植面积';
    if (!formData.startDate) newErrors.startDate = '请选择定植日期';
    if (!formData.expectedHarvestDate) newErrors.expectedHarvestDate = '请选择预计采收日期';
    if (!formData.targetYield) newErrors.targetYield = '请输入目标产量';
    if (!formData.plantingMode) newErrors.plantingMode = '请选择种植模式';
    if (!formData.responsiblePerson) newErrors.responsiblePerson = '请选择负责人';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 存为草稿
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    const greenhouse = greenhouses.find(g => g.id === formData.greenhouseId);
    const crop = cropTypes.find(c => c.name === formData.cropName);
    const today = new Date().toISOString().slice(0, 10);

    // 构造符合后端期望的字段格式 (camelCase)
    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      variety: formData.variety,
      greenhouseId: formData.greenhouseId,
      greenhouseName: greenhouse?.name || '',
      areaName: greenhouse?.name || '',
      areaId: '',
      targetQuantity: parseInt(formData.targetYield) || 0,
      targetYield: parseInt(formData.targetYield) || 0,
      actualYield: 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      actualHarvestDate: '',
      status: 'draft',
      stage: 'seedling',
      stageName: '苗期',
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || localStorage.getItem('username') || '陆启闯',
      createBy: formData.publisher || localStorage.getItem('username') || '陆启闯',
      responsiblePerson: formData.responsiblePerson,
      unit: 'kg',
      publishDate: '',
      batchStatus: 'draft',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingMode: formData.plantingMode,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
    };

    try {
      // 调用后端 API 创建生产计划
      if (USE_API) {
        await apiClient.post('/production/plans', apiData);
      }

      // 构造前端本地状态使用的 CropBatch 对象
      const newBatch: CropBatch = {
        id: apiData.id,
        batchCode: formData.batchCode,
        cropName: formData.cropName,
        cropType: crop?.category || '',
        variety: formData.variety,
        greenhouseId: formData.greenhouseId,
        greenhouseName: greenhouse?.name || '',
        plantingArea: parseInt(formData.plantingArea),
        stage: 'seedling',
        stageName: '苗期',
        startDate: formData.startDate,
        expectedHarvestDate: formData.expectedHarvestDate,
        targetYield: parseInt(formData.targetYield),
        actualYield: 0,
        status: 'planned',
        plantingMode: formData.plantingMode,
        responsiblePerson: formData.responsiblePerson,
        publisher: formData.publisher,
        publishDate: undefined,
        lastModifyDate: today,
        batchStatus: 'draft',
        planType: formData.planType,
        planTypeName: formData.planTypeName,
      };

      // 更新本地状态
      setBatches([newBatch, ...batches]);
      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      console.error('保存草稿失败:', error);
      alert('保存草稿失败，请重试');
    }
  };

  // 提交审批
  const handleSubmitForApproval = async () => {
    if (!validateForm()) return;

    const greenhouse = greenhouses.find(g => g.id === formData.greenhouseId);
    const crop = cropTypes.find(c => c.name === formData.cropName);
    const today = new Date().toISOString().slice(0, 10);

    // 构造符合后端期望的字段格式 (camelCase)
    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      variety: formData.variety,
      greenhouseId: formData.greenhouseId,
      greenhouseName: greenhouse?.name || '',
      areaName: greenhouse?.name || '',
      areaId: '',
      targetQuantity: parseInt(formData.targetYield) || 0,
      targetYield: parseInt(formData.targetYield) || 0,
      actualYield: 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      actualHarvestDate: '',
      status: 'pending',
      stage: 'seedling',
      stageName: '苗期',
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || localStorage.getItem('username') || '陆启闯',
      createBy: formData.publisher || localStorage.getItem('username') || '陆启闯',
      responsiblePerson: formData.responsiblePerson,
      unit: 'kg',
      publishDate: today,
      batchStatus: 'pending',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingMode: formData.plantingMode,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
    };

    try {
      // 调用后端 API 创建生产计划
      if (USE_API) {
        await apiClient.post('/production/plans', apiData);

        // 创建审批单
        const approvalData = {
          id: `AP${Date.now()}`,
          type: 'production_plan',
          typeName: '生产计划',
          title: `生产计划审批：${formData.batchCode}`,
          description: `作物：${formData.cropName} ${formData.variety}\n种植区域：${greenhouse?.name || ''}\n目标产量：${formData.targetYield}kg`,
          applicantId: localStorage.getItem('userId') || '',
          applicantName: formData.publisher || localStorage.getItem('username') || '陆启闯',
          applicantDepartment: localStorage.getItem('department') || '',
          applyDate: today,
          status: 'pending',
          priority: 'normal',
          businessLink: {
            type: 'production',
            requestId: apiData.id,
            requestCode: apiData.batchCode,
            cropName: formData.cropName,
            variety: formData.variety,
            greenhouseName: greenhouse?.name || '',
            startDate: formData.startDate,
            expectedHarvestDate: formData.expectedHarvestDate,
            responsiblePerson: formData.responsiblePerson,
            targetYield: parseInt(formData.targetYield) || 0,
            plantingArea: parseFloat(formData.plantingArea) || 0,
            plantingMode: formData.plantingMode,
          },
        };
        await apiClient.post('/approvals', approvalData);
        // 刷新审批中心数据
        await refreshApprovals();
      }

      // 构造前端本地状态使用的 CropBatch 对象
      const newBatch: CropBatch = {
        id: apiData.id,
        batchCode: formData.batchCode,
        cropName: formData.cropName,
        cropType: crop?.category || '',
        variety: formData.variety,
        greenhouseId: formData.greenhouseId,
        greenhouseName: greenhouse?.name || '',
        plantingArea: parseInt(formData.plantingArea),
        stage: 'seedling',
        stageName: '苗期',
        startDate: formData.startDate,
        expectedHarvestDate: formData.expectedHarvestDate,
        targetYield: parseInt(formData.targetYield),
        actualYield: 0,
        status: 'planned',
        plantingMode: formData.plantingMode,
        responsiblePerson: formData.responsiblePerson,
        publisher: formData.publisher,
        publishDate: today,
        lastModifyDate: today,
        batchStatus: 'pending',
        planType: formData.planType,
        planTypeName: formData.planTypeName,
      };

      // 更新本地状态
      setBatches([newBatch, ...batches]);
      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      console.error('提交审批失败:', error);
      alert('提交审批失败，请重试');
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      batchCode: '',
      planType: PlanType.PLANTING as PlanType,
      planTypeName: '种植计划',
      cropName: '',
      variety: '',
      greenhouseId: '',
      plantingArea: '',
      startDate: '',
      expectedHarvestDate: '',
      targetYield: '',
      plantingMode: '',
      responsiblePerson: '',
      publisher: localStorage.getItem('username') || '陆启闯',
      description: '',
      planDetail: ''
    });
  };

  const handleClose = () => {
    setShowCreateModal(false);
    resetForm();
    setErrors({});
  };

  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredBatches.map(b => b.id));
    }
  };

  const handleSelectRow = (id: number) => {
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
    const selectedData = batches.filter(b => selectedRows.includes(b.id));
    const headers = ['生产计划批次号', '种植模式', '作物名称', '作物品种', '种植区域', '种植面积', '开始时间', '预计结束时间', '负责人', '目标产量', '发布人', '初次发布时间', '最后修改时间', '当前状态', '版本号', '备注'];
    const exportData = selectedData.map(row => ({
      '生产计划批次号': row.batchCode,
      '种植模式': row.plantingMode,
      '作物名称': row.cropName,
      '作物品种': row.variety,
      '种植区域': row.greenhouseName,
      '种植面积': row.plantingArea,
      '开始时间': row.startDate,
      '预计结束时间': row.expectedHarvestDate,
      '负责人': row.responsiblePerson,
      '目标产量': row.targetYield,
      '发布人': row.publisher || '-',
      '初次发布时间': row.publishDate || '-',
      '最后修改时间': row.lastModifyDate || '-',
      '当前状态': batchStatusLabels[row.batchStatus || 'draft'] || '-',
      '版本号': 'V1.0',
      '备注': row.description || '-',
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

    const fileName = `生产计划_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const generateBatchCode = () => {
    const year = new Date().getFullYear();
    const num = batches.length + 1;
    // 根据计划类型使用不同的前缀
    const prefix = PlanTypeCodePrefix[formData.planType as PlanType] || 'FQ';
    const code = `${prefix}${year}-${String(num).padStart(3, '0')}`;
    setFormData({ ...formData, batchCode: code });
  };

  const handleBatchSelectAll = () => {
    const selectable = filteredBatches.filter(b => b.batchStatus !== 'completed' && b.batchStatus !== 'cancelled');
    if (selectedRows.length === selectable.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectable.map(b => b.id));
    }
  };

  const handleBatchDeleteSelectAll = () => {
    const draftBatches = filteredBatches.filter(b => b.batchStatus === 'draft');
    if (selectedRows.length === draftBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(draftBatches.map(b => b.id));
    }
  };

  const handleConfirmNext = () => {
    if (selectedBatchCode && !editedBatchCodes.includes(selectedBatchCode)) {
      setEditedBatchCodes([...editedBatchCodes, selectedBatchCode]);
    }
    // Move to next batch
    const currentIndex = selectedRows.findIndex(id => {
      const batch = batches.find(b => b.id === id);
      return batch?.batchCode === selectedBatchCode;
    });
    if (currentIndex < selectedRows.length - 1) {
      const nextBatch = batches.find(b => b.id === selectedRows[currentIndex + 1]);
      if (nextBatch) {
        setSelectedBatchCode(nextBatch.batchCode);
      }
    }
  };

  const handleVoidConfirm = () => {
    setShowVoidWarning(false);
    setShowBatchEditModal(false);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    const toDelete = selectedRows.filter(id => {
      const batch = batches.find(b => b.id === id);
      return batch?.batchStatus === 'draft';
    });
    setBatches(batches.filter(b => !toDelete.includes(b.id)));
    setSelectedRows([]);
  };

  const handlePublish = async () => {
    // Apply all edits and save to backend
    if (Object.keys(editedBatches).length > 0) {
      try {
        if (USE_API) {
          // Save each edited batch to backend
          for (const batch of batches) {
            const edited = editedBatches[batch.batchCode];
            if (edited) {
              // Prepare API data with proper field mapping
              const apiData = {
                targetQuantity: edited.targetQuantity ?? batch.targetQuantity,
                targetYield: edited.targetYield ?? batch.targetYield,
                cropName: edited.cropName ?? batch.cropName,
                variety: edited.variety ?? batch.variety,
                greenhouseName: edited.greenhouseName ?? batch.greenhouseName,
                greenhouseId: edited.greenhouseId ?? batch.greenhouseId,
                plantingArea: edited.plantingArea ?? batch.plantingArea,
                plantingMode: edited.plantingMode ?? batch.plantingMode,
                startDate: edited.startDate ?? batch.startDate,
                expectedHarvestDate: edited.expectedHarvestDate ?? batch.expectedHarvestDate,
                responsiblePerson: edited.responsiblePerson ?? batch.responsiblePerson,
                remarks: edited.remarks ?? batch.remarks,
                planDetail: edited.planDetail ?? batch.planDetail,
                planDetailFileName: edited.planDetailFileName ?? batch.planDetailFileName,
              };
              await apiClient.put(`/production/plans/${batch.id}`, apiData);
            }
          }
        }
      } catch (error) {
        console.error('保存编辑失败:', error);
        alert('保存编辑失败，请重试');
        return;
      }

      // Update local state after successful API save
      setBatches(batches.map(batch => {
        const edited = editedBatches[batch.batchCode];
        if (edited) {
          return { ...batch, ...edited, lastModifyDate: new Date().toISOString().slice(0, 10) };
        }
        return batch;
      }));
    }
    setShowBatchEditModal(false);
    setEditedBatches({});
    setEditedBatchCodes([]);
    setSelectedRows([]);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产计划</h1>
            <p className="text-gray-500">管理种植批次、生产计划和技术方案</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ProductionStatsCards batches={batches} />

      {/* Filters */}
      <ProductionFilters
        batchCodeSearch={batchCodeSearch}
        plantingModeSearch={plantingModeSearch}
        cropNameSearch={cropNameSearch}
        varietySearch={varietySearch}
        greenhouseSearch={greenhouseSearch}
        statusFilter={statusFilter}
        planTypeFilter={planTypeFilter}
        onBatchCodeChange={setBatchCodeSearch}
        onPlantingModeChange={setPlantingModeSearch}
        onCropNameChange={setCropNameSearch}
        onVarietyChange={setVarietySearch}
        onGreenhouseChange={setGreenhouseSearch}
        onStatusChange={setStatusFilter}
        onPlanTypeChange={setPlanTypeFilter}
        onReset={resetFilters}
        onSearch={() => {}}
      />

      {/* 生产计划列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">生产计划列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
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
          ) : batchEditMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchEditModal(true)}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4" />
                批量编辑
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
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2">
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
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
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
                <button
                  onClick={handleExportClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>

        <ProductionTable
          filteredBatches={filteredBatches}
          currentPage={currentPage}
          pageSize={pageSize}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          onBatchSelectAll={handleBatchSelectAll}
          onBatchDeleteSelectAll={handleBatchDeleteSelectAll}
          onBatchCodeClick={setSelectedBatch}
          totalCount={filteredBatches.length}
        />
      </div>

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={showCreateModal}
        onClose={handleClose}
        onSaveDraft={handleSaveDraft}
        onSubmitForApproval={handleSubmitForApproval}
        formData={formData}
        errors={errors}
        greenhouses={greenhouses}
        cropTypes={cropTypes}
        plantingModes={plantingModes}
        onFormChange={handleFormChange}
        onGenerateCode={generateBatchCode}
      />

      {/* Batch Detail Modal */}
      <BatchDetailModal
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
      />

      {/* Export Format Modal */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        batches={batches}
        greenhouses={greenhouses}
        cropTypes={cropTypes}
        plantingModes={plantingModes}
        editedBatchCodes={editedBatchCodes}
        editedBatches={editedBatches}
        selectedBatchCode={selectedBatchCode}
        onSelectedBatchCodeChange={setSelectedBatchCode}
        onEditedBatchesChange={setEditedBatches}
        onEditedBatchCodesChange={setEditedBatchCodes}
        onClose={() => setShowBatchEditModal(false)}
        onVoidWarning={() => setShowVoidWarning(true)}
        onPublish={handlePublish}
        onConfirmNext={handleConfirmNext}
      />

      {/* Void Warning Modal */}
      <VoidWarningModal
        isOpen={showVoidWarning}
        onClose={() => setShowVoidWarning(false)}
        onConfirm={handleVoidConfirm}
      />

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
