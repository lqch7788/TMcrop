import { useState, useCallback, useEffect } from 'react';
import {
  Plus, FileText, Edit, Trash2, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
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
    // 草稿和已作废状态都可以删除
    const deletableBatches = filteredBatches.filter(b => b.batchStatus === 'draft' || b.batchStatus === 'cancelled');
    if (selectedRows.length === deletableBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(deletableBatches.map(b => b.id));
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

  // 申请作废 - 创建作废审批（只对当前选中的计划执行）
  const handleVoidConfirm = async () => {
    // 获取当前用户信息
    const currentUserId = localStorage.getItem('userId') || '';
    const currentUserName = localStorage.getItem('username') || '陆启闯';
    const currentDepartment = localStorage.getItem('department') || '';
    const today = new Date().toISOString().slice(0, 10);

    // 找到当前选中的计划
    const currentBatch = batches.find(b => b.batchCode === selectedBatchCode);
    if (!currentBatch) {
      alert('请先选择一个生产计划');
      return;
    }

    // 记录已申请作废的批次ID，用于从选择列表中移除
    const voidedBatchIds: number[] = [];

    try {
      // 创建批次作废审批 - 只对当前选中的批次
      const voidId = `BV${Date.now()}_${currentBatch.id}`;
      const voidCode = `BV${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const approvalData = {
        id: voidId,
        type: 'production_plan',
        typeName: '生产计划',
        title: `生产计划作废审批：${currentBatch.batchCode}`,
        description: `申请作废生产计划：${currentBatch.batchCode}\n作物：${currentBatch.cropName} ${currentBatch.variety}\n区域：${currentBatch.greenhouseName}`,
        applicantId: currentUserId,
        applicantName: currentUserName,
        applicantDepartment: currentDepartment,
        applyDate: today,
        status: 'pending',
        priority: 'normal',
        businessLink: {
          type: 'production',
          approvalAction: 'void', // 标记为作废操作
          requestId: currentBatch.id,
          requestCode: currentBatch.batchCode,
          cropName: currentBatch.cropName,
          variety: currentBatch.variety,
          greenhouseName: currentBatch.greenhouseName,
          startDate: currentBatch.startDate,
          expectedHarvestDate: currentBatch.expectedHarvestDate,
          responsiblePerson: currentBatch.responsiblePerson,
        },
      };

      if (USE_API) {
        // 同时更新生产计划的 batchStatus 为 pending
        await apiClient.put(`/production/plans/${currentBatch.id}`, { batchStatus: 'pending' });
        await apiClient.post('/approvals', approvalData);
      }

      // 记录已申请作废的批次ID
      voidedBatchIds.push(currentBatch.id);

      // 刷新审批中心数据
      await refreshApprovals();

      // 更新本地状态 - 设置为待审批状态
      setBatches(batches.map(batch => {
        if (voidedBatchIds.includes(batch.id)) {
          return { ...batch, batchStatus: 'pending' as const };
        }
        return batch;
      }));

      // 从已选择列表中移除已申请作废的批次（不再允许编辑）
      setSelectedRows(selectedRows.filter(id => !voidedBatchIds.includes(id)));

      // 清除已申请作废批次的编辑数据
      delete editedBatches[currentBatch.batchCode];
      setEditedBatches({ ...editedBatches });

      // 提示用户
      alert(`已提交作废申请：${currentBatch.batchCode}`);

      // 关闭弹窗，因为只处理一个
      setShowBatchEditModal(false);
    } catch (error) {
      console.error('提交作废申请失败:', error);
      alert('提交作废申请失败，请重试');
    }

    setShowVoidWarning(false);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    // selectedRows 是 id 数组，需要用 id 查找实际的 batch
    // 草稿和已作废状态都可以删除
    const toDelete = selectedRows
      .map(id => batches.find(b => b.id === id))
      .filter(batch => batch && (batch.batchStatus === 'draft' || batch.batchStatus === 'cancelled'))
      .map(batch => batch.id);

    if (toDelete.length === 0) {
      setSelectedRows([]);
      return;
    }

    try {
      if (USE_API) {
        for (const id of toDelete) {
          await apiClient.delete(`/production/plans/${id}`);
        }
      }
      setBatches(batches.filter(b => !toDelete.includes(b.id)));
      setSelectedRows([]);
    } catch (error) {
      console.error('删除生产计划失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 提交编辑审批
  const handlePublish = async () => {
    // Apply all edits and create approval for each edited batch
    if (Object.keys(editedBatches).length > 0) {
      // 记录已提交的批次ID
      const submittedBatchIds: number[] = [];

      try {
        // 获取当前用户信息
        const currentUserId = localStorage.getItem('userId') || '';
        const currentUserName = localStorage.getItem('username') || '陆启闯';
        const currentDepartment = localStorage.getItem('department') || '';

        // 为每个编辑的批次创建审批
        for (const batch of batches) {
          const edited = editedBatches[batch.batchCode];
          if (edited) {
            // 1. 先更新后端数据（不改变状态，等审批通过后才会变更）
            if (USE_API) {
              // Prepare API data with proper field mapping
              const apiData: Record<string, unknown> = {};
              if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
              if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
              if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
              if (edited.variety !== undefined) apiData.variety = edited.variety;
              if (edited.greenhouseName !== undefined) apiData.greenhouseName = edited.greenhouseName;
              if (edited.greenhouseId !== undefined) apiData.greenhouseId = edited.greenhouseId;
              if (edited.plantingArea !== undefined) apiData.plantingArea = edited.plantingArea;
              if (edited.plantingMode !== undefined) apiData.plantingMode = edited.plantingMode;
              if (edited.startDate !== undefined) apiData.startDate = edited.startDate;
              if (edited.expectedHarvestDate !== undefined) apiData.expectedHarvestDate = edited.expectedHarvestDate;
              if (edited.responsiblePerson !== undefined) apiData.responsiblePerson = edited.responsiblePerson;
              if (edited.remarks !== undefined) apiData.remarks = edited.remarks;
              if (edited.planDetail !== undefined) apiData.planDetail = edited.planDetail;
              if (edited.planDetailFileName !== undefined) apiData.planDetailFileName = edited.planDetailFileName;

              // 重要：同时更新 batchStatus 为 pending，表示已提交审批
              apiData.batchStatus = 'pending';

              console.log('保存编辑:', batch.id, apiData);
              await apiClient.put(`/production/plans/${batch.id}`, apiData);
            }

            // 2. 创建批次变更审批
            const today = new Date().toISOString().slice(0, 10);
            const changeId = `BC${Date.now()}_${batch.id}`;
            const changeCode = `BG${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            // 构造变更描述
            const changes: string[] = [];
            if (edited.cropName) changes.push(`作物名称: ${batch.cropName} → ${edited.cropName}`);
            if (edited.variety) changes.push(`品种: ${batch.variety} → ${edited.variety}`);
            if (edited.plantingArea) changes.push(`种植面积: ${batch.plantingArea} → ${edited.plantingArea}`);
            if (edited.startDate) changes.push(`开始时间: ${batch.startDate} → ${edited.startDate}`);
            if (edited.expectedHarvestDate) changes.push(`预计结束: ${batch.expectedHarvestDate} → ${edited.expectedHarvestDate}`);
            if (edited.responsiblePerson) changes.push(`负责人: ${batch.responsiblePerson} → ${edited.responsiblePerson}`);
            if (edited.targetYield) changes.push(`目标产量: ${batch.targetYield} → ${edited.targetYield}`);

            const approvalData = {
              id: changeId,
              type: 'production_plan',
              typeName: '生产计划',
              title: `生产计划编辑审批：${batch.batchCode}`,
              description: changes.join('\n'),
              applicantId: currentUserId,
              applicantName: currentUserName,
              applicantDepartment: currentDepartment,
              applyDate: today,
              status: 'pending',
              priority: 'normal',
              businessLink: {
                type: 'production',
                requestId: batch.id,
                requestCode: batch.batchCode,
                cropName: edited.cropName || batch.cropName,
                variety: edited.variety || batch.variety,
                greenhouseName: edited.greenhouseName || batch.greenhouseName,
                startDate: edited.startDate || batch.startDate,
                expectedHarvestDate: edited.expectedHarvestDate || batch.expectedHarvestDate,
                responsiblePerson: edited.responsiblePerson || batch.responsiblePerson,
                targetYield: edited.targetYield || batch.targetYield,
                plantingArea: edited.plantingArea || batch.plantingArea,
                plantingMode: edited.plantingMode || batch.plantingMode,
              },
            };

            if (USE_API) {
              await apiClient.post('/approvals', approvalData);
            }

            // 记录已提交的批次ID
            submittedBatchIds.push(batch.id);
          }
        }

        // 刷新审批中心数据
        await refreshApprovals();
      } catch (error) {
        console.error('提交审批失败:', error);
        alert('提交审批失败，请重试');
        return;
      }

      // Update local state - 设置为待审批状态
      setBatches(batches.map(batch => {
        const edited = editedBatches[batch.batchCode];
        if (edited) {
          // 只有编辑了数据的批次才进入待审批状态
          return { ...batch, ...edited, lastModifyDate: new Date().toISOString().slice(0, 10), batchStatus: 'pending' as const };
        }
        return batch;
      }));

      // 从已选择列表中移除已提交的批次（它们已经是待审批状态了）
      const remainingSelectedRows = selectedRows.filter(id => !submittedBatchIds.includes(id));
      setSelectedRows(remainingSelectedRows);

      // 清除已提交批次的编辑数据
      const remainingEditedBatches: Record<string, Partial<typeof batches[0]>> = {};
      const remainingEditedBatchCodes: string[] = [];
      batches.forEach(batch => {
        if (submittedBatchIds.includes(batch.id)) {
          // 这个批次已提交，清除它的编辑数据
        } else if (editedBatches[batch.batchCode]) {
          remainingEditedBatches[batch.batchCode] = editedBatches[batch.batchCode];
          remainingEditedBatchCodes.push(batch.batchCode);
        }
      });
      setEditedBatches(remainingEditedBatches);
      setEditedBatchCodes(remainingEditedBatchCodes);

      // 如果所有选中项都已提交，关闭弹窗；否则提示用户
      if (submittedBatchIds.length === selectedRows.length) {
        setShowBatchEditModal(false);
        setEditedBatches({});
        setEditedBatchCodes([]);
        setSelectedRows([]);
      } else {
        alert(`已提交 ${submittedBatchIds.length} 项编辑申请，还有 ${remainingSelectedRows.length} 项待处理`);
      }
    } else {
      // 没有编辑任何批次，不做任何操作
      alert('请先编辑至少一个生产计划');
    }
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
              <Button size="sm" onClick={() => setShowExportModal(true)}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCancelExport}>
                取消
              </Button>
            </div>
          ) : batchEditMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="blue"
                onClick={() => setShowBatchEditModal(true)}
                disabled={selectedRows.length === 0}
              >
                <Edit className="w-4 h-4" />
                批量编辑
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                setBatchEditMode(false);
                setSelectedRows([]);
              }}>
                取消
              </Button>
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteWarning(true)}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                setBatchDeleteMode(false);
                setSelectedRows([]);
              }}>
                取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {canCreate && (
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && (
                <Button size="sm" variant="blue" onClick={() => {
                  setBatchEditMode(true);
                  setSelectedRows([]);
                }}>
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="destructive" onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && (
                <Button size="sm" onClick={handleExportClick}>
                  <Download className="w-4 h-4" />
                  导出
                </Button>
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
