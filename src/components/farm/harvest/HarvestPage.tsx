import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Warehouse, Calendar, User, Package, ChevronDown, Filter, X, ChevronLeft, ChevronRight, Download, Pencil, Trash2
} from 'lucide-react';
import { cropBatches } from '../../../data/mockData';
import { useUserStore, useGreenhouseStore } from '../../../stores';
import { warehouseOptions } from '../../../data/farmMockData';
import { BatchEditModal, DeleteWarningModal, HarvestDetailModal, AddModal } from './modals';
import { MaterialExportModal } from '@/components/warehouse/MaterialExportModal';
import {
  produceCategories,
  getProduceTypesByCategory,
} from '../../../data/produceCodeRule';
import * as harvestService from '../../../services/apiHarvestService';
import * as cropInstanceService from '../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../services/cropVarietyService';
import { inbound as inventoryInbound } from '../../../services/inventoryService';
import { StockType, BusinessType, SourceType } from '../../../types/inventory';
import { getCurrentUsername } from '../../../hooks/farm';
import { useAuthPermission } from '../../../hooks/usePermission';

// ========== 引入组件（组件化重构） ==========
import {
  HarvestPageHeader,
  HarvestStatsCards,
  HarvestFilterToolbar,
  HarvestTableToolbar,
  HarvestTable,
  HarvestPagination,
} from './components';

// 初始化品种库
cropVarietyService.initVarieties();

// 根据作物品种生成产品编码（使用品种库服务）
const generateProductCode = (cropName: string, variety: string, index: number): string => {
  // 使用品种库服务查找品种信息
  const varietyInfo = cropVarietyService.findVarietyByCropName(cropName);
  if (varietyInfo) {
    const seq = String(index + 1).padStart(3, '0');
    return `${varietyInfo.categoryCode}${varietyInfo.typeCode}${varietyInfo.varietyCode}${seq}`;
  }
  // 如果找不到，返回默认编码
  const seq = String(index + 1).padStart(3, '0');
  return `PD0101001${seq}`;
};

export default function HarvestPage() {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses]);

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 采收模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    harvestCode: '',
    batchCode: '',
    greenhouseId: '',
    cropName: '',
    grade: '',
    harvesterName: '',
    warehouseId: '',
    status: '',
  });

  // Harvest Records State - 从API加载数据，初始为空数组
  const [harvestRecords, setHarvestRecords] = useState<any[]>([]);
  // Loading状态
  const [loading, setLoading] = useState(false);

  // 初始化数据（从API加载）
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await harvestService.getHarvestRecords();
        setHarvestRecords(data);
      } catch (error) {
        console.error('获取采收数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Export state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);

  // Batch Edit state
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editedRecordIds, setEditedRecordIds] = useState<string[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, any>>({});
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Batch Delete state
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<typeof harvestRecords[0] | null>(null);

  // 展开/折叠状态
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // 展开/折叠行
  const toggleExpandRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Filter records based on search
  const filteredRecords = harvestRecords.filter(record => {
    // 使用 startsWith 替代 includes，避免误匹配
    if (searchFilters.harvestCode && !record.harvestCode.startsWith(searchFilters.harvestCode)) return false;
    if (searchFilters.batchCode && !record.batchCode.startsWith(searchFilters.batchCode)) return false;
    if (searchFilters.greenhouseId && record.greenhouseId !== searchFilters.greenhouseId) return false;
    if (searchFilters.cropName && !record.cropName.startsWith(searchFilters.cropName)) return false;
    if (searchFilters.grade && record.grade !== searchFilters.grade) return false;
    if (searchFilters.harvesterName && !record.harvesterNames.some(name => name.startsWith(searchFilters.harvesterName))) return false;
    if (searchFilters.warehouseId && record.warehouseId !== searchFilters.warehouseId) return false;
    if (searchFilters.status && record.status !== searchFilters.status) return false;
    return true;
  });

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchFilters({
      harvestCode: '',
      batchCode: '',
      greenhouseId: '',
      cropName: '',
      grade: '',
      harvesterName: '',
      warehouseId: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const handleExportClick = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportTypeModal(true);
  };

  const handleConfirmExport = () => {
    setShowExportTypeModal(true);
  };

  // 导出数据处理
  const handleDoExport = async () => {
    try {
      // Get selected data - use index-based selection from filtered records
      const selectedData = filteredRecords.filter((_, index) => selectedRows.includes(index));

      // 导出表头
      const headers = ['采收单号', '采收日期', '采收区域', '入库仓库', '采收人员', '产品编码', '作物品种', '批次号', '种植模式', '采收量(kg)', '目标产量(kg)', '完成率', '品质等级', '状态', '审核人员', '备注'];

      // 展开产品明细生成导出数据
      const exportData: Record<string, string>[] = [];
      selectedData.forEach((record, recordIdx) => {
        // 安全获取数组字段
        const harvesterNames = Array.isArray(record.harvesterNames) ? record.harvesterNames.join(', ') : (record.harvesterNames || '-');
        const products = record.products || [];
        const harvestQuantity = record.harvestQuantity || 0;
        const targetYield = record.targetYield || 0;
        const unit = record.unit || 'kg';

        // 如果有产品明细，展开显示
        if (products.length > 0) {
          products.forEach((product, productIdx) => {
            exportData.push({
              '采收单号': record.harvestCode || '-',
              '采收日期': record.harvestDate || '-',
              '采收区域': record.greenhouseName || '-',
              '入库仓库': record.warehouseName || '-',
              '采收人员': harvesterNames,
              '产品编码': product.productCode || generateProductCode(product.cropName || record.cropName || '', product.variety || record.variety || '', recordIdx * 100 + productIdx),
              '作物品种': product.variety || record.variety || '-',
              '批次号': product.batchCode || record.batchCode || '-',
              '种植模式': record.plantingMode || '-',
              '采收量(kg)': `${product.harvestQuantity || 0} ${unit}`,
              '目标产量(kg)': `${product.targetYield || 0} ${unit}`,
              '完成率': `${product.targetYield > 0 ? Math.round((product.harvestQuantity || 0) / product.targetYield * 100) : 0}%`,
              '品质等级': product.grade || record.grade || '-',
              '状态': record.status === 'harvested' ? '已采收' : record.status === 'graded' ? '已分级' : '已入库',
              '审核人员': record.auditor || '-',
              '备注': product.remarks || record.remarks || '-'
            });
          });
        } else {
          // 没有产品明细时，显示主行数据
          exportData.push({
            '采收单号': record.harvestCode || '-',
            '采收日期': record.harvestDate || '-',
            '采收区域': record.greenhouseName || '-',
            '入库仓库': record.warehouseName || '-',
            '采收人员': harvesterNames,
            '产品编码': generateProductCode(record.cropName || '', record.variety || '', recordIdx),
            '作物品种': record.variety || '-',
            '批次号': record.batchCode || '-',
            '种植模式': record.plantingMode || '-',
            '采收量(kg)': `${harvestQuantity} ${unit}`,
            '目标产量(kg)': `${targetYield} ${unit}`,
            '完成率': `${targetYield > 0 ? Math.round(harvestQuantity / targetYield * 100) : 0}%`,
            '品质等级': record.grade || '-',
            '状态': record.status === 'harvested' ? '已采收' : record.status === 'graded' ? '已分级' : '已入库',
            '审核人员': record.auditor || '-',
            '备注': record.remarks || '-'
          });
        }
      });

      // Create content based on format
      let content = '';
      let mimeType = '';
      let extension = '';

      if (exportFormat === 'csv') {
        // CSV format
        content = headers.join(',') + '\n' + exportData.map(row =>
          headers.map(h => `"${row[h] || ''}"`).join(',')
        ).join('\n');
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
      } else if (exportFormat === 'excel' || exportFormat === 'xlsx') {
        // Excel format (as HTML table)
        content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        mimeType = 'application/vnd.ms-excel;charset=utf-8';
        extension = 'xls';
      } else if (exportFormat === 'word') {
        // Word format (as HTML)
        content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        mimeType = 'application/vnd.ms-word;charset=utf-8';
        extension = 'doc';
      }

      // 文件名
      const fileName = `采收入库_${new Date().toISOString().slice(0, 10)}.${extension}`;

      // 使用 Blob 下载（兼容所有浏览器）
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setShowExportTypeModal(false);
      setExportMode(false);
      setSelectedRows([]);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
      setShowExportTypeModal(false);
      setExportMode(false);
      setSelectedRows([]);
    }
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // Batch Edit handlers
  const handleBatchEditClick = () => {
    setBatchEditMode(true);
  };

  const handleCancelBatchEdit = () => {
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  const handleConfirmBatchEdit = async () => {
    // Apply all edits
    const updatedRecords = [...harvestRecords];
    const failedIds: string[] = [];

    for (const id of editedRecordIds) {
      const index = updatedRecords.findIndex(r => r.id.toString() === id);
      if (index !== -1 && editedRecords[id]) {
        const record = updatedRecords[index];
        let updatedRecord = { ...record };

        // Find greenhouse name if greenhouseId changed
        if (editedRecords[id].greenhouseId && editedRecords[id].greenhouseId !== record.greenhouseId) {
          const gh = greenhouses.find(g => g.id === editedRecords[id].greenhouseId);
          updatedRecord = {
            ...updatedRecord,
            ...editedRecords[id],
            greenhouseName: gh?.name || record.greenhouseName,
          };
        } else {
          updatedRecord = { ...updatedRecord, ...editedRecords[id] };
        }
        // Find warehouse name if warehouseId changed
        if (editedRecords[id].warehouseId && editedRecords[id].warehouseId !== record.warehouseId) {
          const wh = warehouseOptions.find(w => w.value === editedRecords[id].warehouseId);
          updatedRecord = {
            ...updatedRecord,
            warehouseName: wh?.label || record.warehouseName,
          };
        }
        // Find batch cropName if batchCode changed
        if (editedRecords[id].batchCode && editedRecords[id].batchCode !== record.batchCode) {
          const batch = cropBatches.find(b => b.batchCode === editedRecords[id].batchCode);
          updatedRecord = {
            ...updatedRecord,
            cropName: batch?.cropName || record.cropName,
          };
        }

        // 同步到后端API
        try {
          await harvestService.updateHarvestRecord(id, updatedRecord);
          updatedRecords[index] = updatedRecord;
        } catch (error) {
          console.error(`更新记录 ${id} 失败:`, error);
          failedIds.push(id);
        }
      }
    }

    if (failedIds.length > 0) {
      alert(`部分记录更新失败: ${failedIds.join(', ')}`);
    }

    setHarvestRecords(updatedRecords);
    setShowBatchEditModal(false);
    setBatchEditMode(false);
    setSelectedRows([]);
    setEditedRecordIds([]);
    setEditedRecords({});
    setSelectedRecordId('');
  };

  // Batch Delete handlers
  const handleBatchDeleteClick = () => {
    setBatchDeleteMode(true);
  };

  const handleCancelBatchDelete = () => {
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleConfirmBatchDelete = async () => {
    // 获取要删除的记录ID
    const idsToDelete = selectedRows.map(index => filteredRecords[index]?.id).filter(Boolean);

    if (idsToDelete.length === 0) {
      setShowDeleteWarning(false);
      setBatchDeleteMode(false);
      setSelectedRows([]);
      return;
    }

    // 调用后端API删除
    try {
      await harvestService.deleteHarvestRecords(idsToDelete);
      // 删除成功后更新本地状态
      const indicesToDeleteSet = new Set(selectedRows);
      const remainingRecords = harvestRecords.filter((_, index) => {
        const filteredIndex = filteredRecords.findIndex(r => r.id === harvestRecords[index].id);
        return !indicesToDeleteSet.has(filteredIndex);
      });
      setHarvestRecords(remainingRecords);
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('删除失败，请重试');
    }

    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRecords.map((_, index) => index));
    }
  };

  const handleSelectRow = (index: number) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(i => i !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  // Create Harvest Record Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // 获取当前用户名作为默认审核员
  const currentAuditor = getCurrentUsername();

  const [newRecord, setNewRecord] = useState({
    harvestCode: '',
    batchCode: '',
    greenhouseId: '',
    harvestDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    harvesterIds: [] as string[],
    harvesterNames: [] as string[],
    auditor: currentAuditor,
    remarks: '',
    // V3.0 新增字段
    harvestType: 'product' as 'seed' | 'seedling' | 'product',  // 采收类型
    targetInventory: 'product' as 'seed' | 'seedling' | 'product',  // 目标库存
    products: [] as Array<{
      productCode: string;
      cropName: string;
      variety: string;
      batchCode: string;
      plantingMode: string;
      harvestQuantity: number;
      targetYield: number;
      grade: string;
      auditor: string;
      remarks: string;
    }>,
    // V3.1 入库类型
    inboundType: 'planting_harvest' as 'seed_source' | 'seedling' | 'planting_harvest',  // 入库类型
    // V3.1 补录相关字段
    isSupplementary: false,  // 是否补录
    supplementaryReason: '',  // 补录原因
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 转换 warehouseOptions 为 BatchEditModal 期望的格式 { id, name }[]
  const warehousesForModal = warehouseOptions.map(w => ({ id: w.value, name: w.label }));

  const generateHarvestCode = () => {
    const date = new Date();
    const code = `HS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    return code;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.harvestCode) newErrors.harvestCode = '请生成采收单号';
    if (!newRecord.batchCode) newErrors.batchCode = '请选择采收批次';
    if (!newRecord.greenhouseId) newErrors.greenhouseId = '请选择采收区域';
    if (!newRecord.harvestDate) newErrors.harvestDate = '请选择采收日期';
    if (!newRecord.warehouseId) newErrors.warehouseId = '请选择入库仓库';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 添加产品
  const handleAddProduct = () => {
    setNewRecord(prev => ({
      ...prev,
      products: [...prev.products, {
        productCode: '',
        cropName: '',
        variety: '',
        batchCode: prev.batchCode,
        plantingMode: '',
        harvestQuantity: 0,
        targetYield: 0,
        grade: 'A',
        auditor: prev.auditor,
        remarks: '',
      }],
    }));
  };

  // 删除产品
  const handleRemoveProduct = (index: number) => {
    setNewRecord(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  // 更新产品
  const handleProductChange = (index: number, field: string, value: any) => {
    setNewRecord(prev => ({
      ...prev,
      products: prev.products.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  // 刷新采收数据
  const refreshHarvestData = async () => {
    try {
      const data = await harvestService.getHarvestRecords();
      setHarvestRecords(data);
    } catch (error) {
      console.error('获取采收数据失败:', error);
    }
  };

  const handleCreateRecord = async () => {
    if (!validateForm()) return;

    const selectedBatch = cropBatches.find(b => b.batchCode === newRecord.batchCode);
    const selectedGreenhouse = greenhouses.find(g => g.id === newRecord.greenhouseId);
    const selectedWarehouse = warehouseOptions.find(w => w.value === newRecord.warehouseId);
    const selectedHarvesters = users.filter(u => newRecord.harvesterIds.includes(u.id));

    // 计算总采收量
    const totalHarvestQuantity = newRecord.products.reduce((sum, p) => sum + (p.harvestQuantity || 0), 0);

    // 为每个产品创建记录（目前一条采收单对应一个产品）
    const productRecords = newRecord.products.length > 0 ? newRecord.products : [{
      productCode: '',
      cropName: selectedBatch?.cropName || '',
      variety: selectedBatch?.variety || '',
      batchCode: newRecord.batchCode,
      plantingMode: selectedBatch?.plantingMode || '',
      harvestQuantity: totalHarvestQuantity || 0,
      targetYield: selectedBatch?.targetYield || 0,
      grade: 'A',
      auditor: newRecord.auditor,
      remarks: newRecord.remarks,
    }];

    for (const product of productRecords) {
      // 生成采收单号
      const harvestCode = newRecord.harvestCode || await harvestService.generateHarvestCode();

      const record = {
        harvestCode,
        batchCode: newRecord.batchCode,
        cropName: selectedBatch?.cropName || product.cropName,
        greenhouseId: newRecord.greenhouseId,
        greenhouseName: selectedGreenhouse?.name || '',
        harvestDate: newRecord.harvestDate,
        harvestQuantity: product.harvestQuantity || totalHarvestQuantity,
        unit: '公斤',
        grade: product.grade as 'A' | 'B' | 'C',
        warehouseId: newRecord.warehouseId,
        warehouseName: selectedWarehouse?.name || '',
        harvesterIds: newRecord.harvesterIds,
        harvesterNames: selectedHarvesters.map(u => u.name),
        status: 'harvested' as const,
        remarks: product.remarks || newRecord.remarks,
        auditor: product.auditor || newRecord.auditor,
        variety: product.variety || selectedBatch?.variety || '',
        plantingMode: product.plantingMode || selectedBatch?.plantingMode || '',
        targetYield: product.targetYield || selectedBatch?.targetYield || 0,
        quality: 'good' as const,
      };

      // 使用 apiHarvestService 添加记录
      const createdRecord = await harvestService.addHarvestRecord(record);

      // 同步到库存中心（V3.0统一库存）
      inventoryInbound({
        stockType: StockType.PRODUCT,
        businessId: createdRecord.id,
        businessType: BusinessType.HARVEST,
        cropId: selectedBatch?.cropId || '',
        cropName: record.cropName,
        varietyId: selectedBatch?.varietyId,
        varietyName: record.variety,
        quantity: product.harvestQuantity || totalHarvestQuantity,
        unit: '公斤',
        sourceType: SourceType.SELF_PRODUCED,
        baseName: selectedGreenhouse?.name,
        productionPlanId: selectedBatch?.productionPlanId,
        productionPlanCode: selectedBatch?.productionPlanCode,
        businessCode: record.harvestCode,
      }, 'system', '系统管理员').catch(err => {
        console.error('同步库存失败:', err);
      });

      // 更新作物实例的采收数量
      if (selectedBatch?.instanceId) {
        await cropInstanceService.updateQuantity(selectedBatch.instanceId, 'harvest', product.harvestQuantity || totalHarvestQuantity);
      }
    }
    refreshHarvestData();

    setIsCreateModalOpen(false);
    setNewRecord({
      harvestCode: '',
      batchCode: '',
      greenhouseId: '',
      harvestDate: new Date().toISOString().split('T')[0],
      warehouseId: '',
      harvesterIds: [],
      harvesterNames: [],
      auditor: currentAuditor,
      remarks: '',
      products: [],
    });
    setErrors({});
  };

  const toggleHarvester = (userId: string) => {
    const currentIds = newRecord.harvesterIds;
    if (currentIds.includes(userId)) {
      setNewRecord({ ...newRecord, harvesterIds: currentIds.filter(id => id !== userId) });
    } else {
      setNewRecord({ ...newRecord, harvesterIds: [...currentIds, userId] });
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setNewRecord({
      batchCode: '',
      greenhouseId: '',
      harvestDate: new Date().toISOString().split('T')[0],
      harvestQuantity: 0,
      grade: 'A',
      warehouseId: '',
      harvesterIds: [],
      remarks: '',
    });
    setErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HarvestPageHeader />

      {/* Stats */}
      <HarvestStatsCards records={harvestRecords} />

      {/* 搜索卡片 */}
      <HarvestFilterToolbar
        searchFilters={searchFilters}
        greenhouses={greenhouses}
        warehouseOptions={warehouseOptions}
        onFiltersChange={setSearchFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        onCreate={() => setIsCreateModalOpen(true)}
      />

      {/* Harvest Records */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <HarvestTableToolbar
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onCreate={() => setIsCreateModalOpen(true)}
          onBatchEdit={handleBatchEditClick}
          onBatchDelete={handleBatchDeleteClick}
          onExport={() => setExportMode(true)}
          onConfirmExport={() => {
            if (selectedRows.length === 0) {
              alert('请先选择要导出的数据');
              return;
            }
            // 点击确认导出时，打开导出格式选择弹窗
            setShowExportTypeModal(true);
          }}
          onCancelExport={handleCancelExport}
          onConfirmBatchEdit={() => setShowBatchEditModal(true)}
          onCancelBatchEdit={handleCancelBatchEdit}
          onConfirmBatchDelete={() => setShowDeleteWarning(true)}
          onCancelBatchDelete={handleCancelBatchDelete}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canExport={canExport}
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <HarvestTable
            records={filteredRecords}
            currentPage={currentPage}
            pageSize={pageSize}
            expandedRows={expandedRows}
            selectedRows={selectedRows}
            exportMode={exportMode}
            batchEditMode={batchEditMode}
            batchDeleteMode={batchDeleteMode}
            onToggleRow={toggleExpandRow}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            onViewDetail={(record) => { setSelectedDetailRecord(record); setShowDetailModal(true); }}
            generateProductCode={generateProductCode}
          />
          {(exportMode || batchEditMode || batchDeleteMode) && selectedRows.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {selectedRows.length === filteredRecords.length ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
          <HarvestPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredRecords.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Create Harvest Record Modal */}
      <AddModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateRecord}
        addForm={newRecord}
        onFormChange={(field, value) => setNewRecord(prev => ({ ...prev, [field]: value }))}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onProductChange={handleProductChange}
        onGenerateCode={() => setNewRecord(prev => ({ ...prev, harvestCode: generateHarvestCode() }))}
        greenhouses={greenhouses}
        warehouseOptions={warehouseOptions}
        cropBatches={cropBatches}
        users={users}
        errors={errors}
      />

      {/* Export Format Modal */}
      <MaterialExportModal
        isOpen={showExportTypeModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onClose={() => setShowExportTypeModal(false)}
        onFormatChange={setExportFormat}
        onExport={handleDoExport}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        records={filteredRecords}
        editedRecordIds={editedRecordIds}
        editedRecords={editedRecords}
        selectedRecordId={selectedRecordId}
        onSelectedRecordIdChange={setSelectedRecordId}
        onEditedRecordsChange={setEditedRecords}
        onEditedRecordIdsChange={setEditedRecordIds}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleConfirmBatchEdit}
        greenhouses={greenhouses}
        warehouses={warehousesForModal}
        users={users}
        cropBatches={cropBatches}
      />

      {/* Delete Warning Modal */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* Harvest Detail Modal */}
      <HarvestDetailModal
        isOpen={showDetailModal}
        record={selectedDetailRecord}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}
