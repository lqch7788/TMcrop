import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plus, Warehouse, Calendar, User, Package, ChevronDown, Filter, ChevronLeft, ChevronRight, Download, Trash2, Check
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useUserStore, useGreenhouseStore, useHarvestStore, useWarehouseStore, useInventoryStore, usePlantingStore, useSeedlingStore, useSeedSourceStore, useCropVarietyStore, useToastStore } from '../../../stores';
import { BatchEditModal, DeleteWarningModal, HarvestDetailModal, AddModal } from './modals';
import { MaterialExportModal } from '@/components/warehouse/MaterialExportModal';
import {
  produceCategories,
  getProduceTypesByCategory,
} from '../../../data/produceCodeRule';
// 一次性动作（生成编码/扣减数量/打印标签/追溯）按修订后铁律直接调 service，
// 持久化数据（列表/详情/统计）走 Store。service 函数完整保留。
import { generateHarvestCode as genHarvestCode } from '../../../services/apiHarvestService';
import { todayLocal } from '@/lib/dateUtils';
import * as cropInstanceService from '../../../services/apiCropInstanceService';
import * as cropVarietyService from '../../../services/cropVarietyService';
import { inbound as inventoryInbound } from '../../../services/inventoryService';
import { StockType, BusinessType, SourceType } from '../../../types/inventory';
import { getCurrentUsername } from '../../../hooks/farm';
import { useAuthPermission } from '../../../hooks/usePermission';
import { validateUnitPrice, validateDateNotFuture } from '../../../lib/validators';
import { showAlert } from '@/lib/dialogService';
import { logger } from '@/lib/logger';

// ========== 引入组件（组件化重构） ==========
import {
  HarvestPageHeader,
  HarvestStatsCards,
  HarvestFilterToolbar,
  HarvestTableToolbar,
  HarvestTable,
} from './components';
import { Pagination } from '@/components/ui';

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

  // 仓库Store（用于筛选工具栏）
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const loadWarehouses = useWarehouseStore((s) => s.loadWarehouses);
  // 种植 / 育苗 Store（用于反查批次关联的多个温室）
  const plantingItems = usePlantingStore((s) => s.items);
  const loadPlantings = usePlantingStore((s) => s.loadItems);
  const seedlingItems = useSeedlingStore((s) => s.items);
  const loadSeedlings = useSeedlingStore((s) => s.loadItems);
  const seedSourceItems = useSeedSourceStore((s) => s.items);
  const loadSeedSources = useSeedSourceStore((s) => s.loadItems);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (warehouses.length === 0) {
      loadWarehouses();
    }
    if (plantingItems.length === 0) {
      loadPlantings();
    }
    if (seedlingItems.length === 0) {
      loadSeedlings();
    }
    if (seedSourceItems.length === 0) {
      loadSeedSources();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses, warehouses.length, loadWarehouses, plantingItems.length, loadPlantings, seedlingItems.length, loadSeedlings, seedSourceItems.length, loadSeedSources]);

  // 构建批次号 → 关联温室ID 映射
  // 数据源：1) 种植记录 (plantCode → areaId) 2) 育苗记录 (seedlingCode → siteId)
  // 用于过滤"采收区域"下拉，避免选错非种植区域
  const batchAreasMap: Record<string, string[]> = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const add = (key: string | undefined, areaId: string | undefined) => {
      if (!key || !areaId) return;
      if (!map[key]) map[key] = new Set();
      map[key].add(areaId);
    };
    // 种植记录 — 用 plantCode 作为关联 key
    for (const p of plantingItems) {
      add(p.plantCode, p.areaId);
    }
    // 育苗记录 — 用 seedlingCode 作为关联 key
    for (const s of seedlingItems) {
      add(s.seedlingCode, s.siteId);
    }
    // 种源记录 — 用 seedCode 作为关联 key，baseId 作为区域
    for (const ss of seedSourceItems) {
      add(ss.seedCode, ss.baseId);
    }
    // 转成普通对象
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(map)) {
      out[k] = Array.from(map[k]);
    }
    return out;
  }, [plantingItems, seedlingItems]);

  // 构建可关联批次列表（种植批次 + 育苗批次，去重）
  // 采收时直接关联执行层批次号，而非生产计划号
  const cropBatches = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      id: string;
      batchCode: string;
      batchStatus?: string;
      sourceType: 'seedling' | 'planting';
      cropName: string;
      variety: string;
      plantingMode: string;
      targetYield: number;
    }> = [];

    // 种植批次（成品采收入库时关联）
    for (const p of plantingItems) {
      if (seen.has(p.plantCode)) continue;
      seen.add(p.plantCode);
      result.push({
        id: p.id,
        batchCode: p.plantCode,
        batchStatus: p.status,
        sourceType: 'planting',
        cropName: p.cropName,
        variety: p.cropVariety,
        plantingMode: '',
        targetYield: p.targetYield || 0,
      });
    }

    // 育苗批次（种苗采收入库时关联）
    for (const s of seedlingItems) {
      if (seen.has(s.seedlingCode)) continue;
      seen.add(s.seedlingCode);
      result.push({
        id: s.id,
        batchCode: s.seedlingCode,
        batchStatus: s.status,
        sourceType: 'seedling',
        cropName: s.cropName,
        variety: s.cropVariety || s.cropName,
        plantingMode: s.seedlingType || '',
        targetYield: 0,
      });
    }

    // 种源批次（种源采收入库时关联）
    for (const ss of seedSourceItems) {
      if (seen.has(ss.seedCode)) continue;
      seen.add(ss.seedCode);
      result.push({
        id: ss.id,
        batchCode: ss.seedCode,
        batchStatus: ss.status,
        sourceType: 'seed',
        cropName: ss.cropName,
        variety: ss.cropVariety || '',
        plantingMode: '',
        targetYield: 0,
      });
    }

    return result;
  }, [plantingItems, seedlingItems, seedSourceItems]);

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

  // 从 Zustand Store 获取采收数据
  const { items: harvestRecords, isLoading: loading, error, clearError, loadItems, deleteItem, deleteItems, addItem, updateItem } = useHarvestStore();
  // 2026-06-06: 监听 store 错误并弹 Toast
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // 初始化数据（从 Store 加载）
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载采收数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

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
  // 安全解析采收人员数组（可能来自JSON字符串或直接数组）
  const parseHarvesterNames = (value: string[] | string | undefined): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 将采收人员数组转换为逗号分隔字符串
  const formatHarvesterNames = (value: string[] | string | undefined): string => {
    const names = parseHarvesterNames(value);
    return names.length > 0 ? names.join(', ') : '-';
  };

  const filteredRecords = harvestRecords.filter(record => {
    // 使用 startsWith 替代 includes，避免误匹配
    if (searchFilters.harvestCode && !record.harvestCode.startsWith(searchFilters.harvestCode)) return false;
    if (searchFilters.batchCode && !record.batchCode.startsWith(searchFilters.batchCode)) return false;
    if (searchFilters.greenhouseId && record.greenhouseId !== searchFilters.greenhouseId) return false;
    if (searchFilters.cropName && !record.cropName.startsWith(searchFilters.cropName)) return false;
    if (searchFilters.grade && record.grade !== searchFilters.grade) return false;
    if (searchFilters.harvesterName && !parseHarvesterNames(record.harvesterNames).some(name => name.startsWith(searchFilters.harvesterName))) return false;
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
      showAlert('请先选择要导出的数据');
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
      const headers = ['采收单号', '采收时间', '采收区域', '入库仓库', '采收人员', '单价(元/kg)', '收入(元)', '产品编码', '作物品种', '批次号', '种植模式', '采收量(kg)', '目标产量(kg)', '完成率', '品质等级', '状态', '审核人员', '备注'];

      // 展开产品明细生成导出数据
      const exportData: Record<string, string>[] = [];
      selectedData.forEach((record, recordIdx) => {
        // 安全获取数组字段
        const harvesterNames = formatHarvesterNames(record.harvesterNames);
        const products = record.products || [];
        const harvestQuantity = record.harvestQuantity || 0;
        const targetYield = record.targetYield || 0;
        const unit = record.unit || 'kg';

        // 如果有产品明细，展开显示
        if (products.length > 0) {
          products.forEach((product, productIdx) => {
            exportData.push({
              '采收单号': record.harvestCode || '-',
              '采收时间': record.harvestDate || '-',
              '采收区域': record.greenhouseName || '-',
              '入库仓库': record.warehouseName || '-',
              '采收人员': harvesterNames,
              '单价(元/kg)': (record.unitPrice != null) ? record.unitPrice.toFixed(2) : '-',
              '收入(元)': (record.totalAmount != null) ? record.totalAmount.toFixed(2) : '-',
              '作物编码': product.cropCode || '-',
              '作物品种': product.variety || record.variety || '-',
              '批次号': record.batchCode || '-',
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
            '采收时间': record.harvestDate || '-',
            '采收区域': record.greenhouseName || '-',
            '入库仓库': record.warehouseName || '-',
            '采收人员': harvesterNames,
            '单价(元/kg)': (record.unitPrice != null) ? record.unitPrice.toFixed(2) : '-',
            '收入(元)': (record.totalAmount != null) ? record.totalAmount.toFixed(2) : '-',
            '作物编码': '-',
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
      const fileName = `采收入库_${todayLocal()}.${extension}`;

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
      // logger.error('导出失败:', error);
      showAlert('导出失败，请重试');
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
          await updateItem(String(id), updatedRecord);
          updatedRecords[index] = updatedRecord;
        } catch (error) {
          // logger.error(`更新记录 ${id} 失败:`, error);
          failedIds.push(id);
        }
      }
    }

    if (failedIds.length > 0) {
      await showAlert(`部分记录更新失败: ${failedIds.join(', ')}`);
    }

    // 通过 Store 重新加载数据
    loadItems();
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

    // 通过 Store 批量删除
    try {
      await deleteItems(idsToDelete);
    } catch (error) {
      // logger.error('批量删除失败:', error);
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
    greenhouseIds: [] as string[],  // 多选采收区域
    harvestDate: new Date().toISOString().slice(0, 16),
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
      unit: string;
      targetYield: number;
      grade: string;
      auditor: string;
      remarks: string;
    }>,
    // V3.1 补录相关字段
    isSupplementary: false,  // 是否补录
    supplementaryReason: '',  // 补录原因
    // V3.2 单价和单位字段
    unitPrice: 0,  // 单价(元)
    unit: '公斤',  // 单位
    // V3.3 仓库
    warehouseId: '',  // 仓库ID
    // V3.4 采收去向
    saleType: 'external_sale' as 'self_use' | 'external_sale',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateHarvestCode = () => {
    const date = new Date();
    const code = `HS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    return code;
  };

  // 仓库选项（不过滤，用于筛选工具栏）
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
  const warehouseOptions = safeWarehouses
    .filter(w => w.status === 'active')
    .map(w => ({ value: w.id, label: w.name }));
  // 转换 warehouseOptions 为 BatchEditModal 期望的格式 { id, name }[]
  const warehousesForModal = warehouseOptions.map(w => ({ id: w.value, name: w.label }));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newRecord.harvestCode) newErrors.harvestCode = '请生成采收单号';
    if (!newRecord.batchCode) newErrors.batchCode = '请选择采收批次';
    if (!newRecord.greenhouseIds || newRecord.greenhouseIds.length === 0) {
      newErrors.greenhouseId = '请至少选择一个采收区域';
    }
    if (!newRecord.warehouseId) newErrors.warehouseId = '请选择目标仓库';
    if (!newRecord.harvestDate) newErrors.harvestDate = '请选择采收时间';

    // 数值验证（方案4.3 + 方案4.2）
    if (newRecord.unitPrice && !validateUnitPrice(newRecord.unitPrice)) {
      if (newRecord.unitPrice < 0) newErrors.unitPrice = '单价不能为负数';
      else if (newRecord.unitPrice > 1000000) newErrors.unitPrice = '单价不能超过 1,000,000 元/kg';
      else newErrors.unitPrice = '单价最多2位小数';
    }
    if (newRecord.harvestDate && !validateDateNotFuture(newRecord.harvestDate)) {
      newErrors.harvestDate = '采收时间不能超过当前时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 添加产品
  const handleAddProduct = () => {
    // 从当前选中的批次获取默认值
    const selectedBatchForProduct = cropBatches.find(b => b.batchCode === newRecord.batchCode);
    // 通过作物名称搜索作物编码（使用模糊搜索匹配 varietyName 或 subVariety1Name）
    const searchResults = selectedBatchForProduct?.cropName
      ? cropVarietyService.searchVarieties(selectedBatchForProduct.cropName)
      : [];
    const cropVarietyInfo = searchResults.length > 0 ? searchResults[0].variety : undefined;

    // 种植模式默认值链：批次自带的 → 兜底 'greenhouse'（温室种植）
    // 原因：很多老批次没填 plantingMode（老生产计划表单是 free text 录入），默认温室是
    //      中国种植最常见场景，且字典里有这个 code，避免产品明细空值导致列表显示 -
    const defaultPlantingMode = selectedBatchForProduct?.plantingMode
      || (selectedBatchForProduct?.greenhouseId ? 'greenhouse' : '')
      || '';

    setNewRecord(prev => ({
      ...prev,
      products: [...prev.products, {
        cropCode: cropVarietyInfo?.cropCode || '',  // 作物编码（11位）
        variety: selectedBatchForProduct?.cropName || '',  // 作物品种（最细化名，如"黑美人西瓜"）
        cropName: selectedBatchForProduct?.variety || '',  // 品种（类型名，如"西瓜"）
        plantingMode: defaultPlantingMode,  // ← 修复：批次没值时按关联温室默认
        harvestQuantity: 0,
        unit: prev.unit || '公斤',
        targetYield: selectedBatchForProduct?.targetYield || 0,
        grade: '',  // 默认空，让用户在产品明细里必选（不硬编码）
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

  // 监听批次号变化，自动更新产品行 + 联动采收类型/采收区域
  const prevBatchCodeRef = useRef<string | null>(null);
  useEffect(() => {
    // 当批次号变化且有批次时，更新产品明细
    if (newRecord.batchCode && newRecord.batchCode !== prevBatchCodeRef.current) {
      // 找到新批次的信息
      const newBatch = cropBatches.find(b => b.batchCode === newRecord.batchCode);

      // 联动1：根据 sourceType 自动设置采收类型
      let derivedHarvestType: 'seed' | 'seedling' | 'product' = 'product';
      if (newBatch?.sourceType === 'seed') derivedHarvestType = 'seed';
      else if (newBatch?.sourceType === 'seedling') derivedHarvestType = 'seedling';
      else if (newBatch?.sourceType === 'planting') derivedHarvestType = 'product';

      // 联动2：自动锁定采收区域为该批次实际种植/育苗的温室（多对一）
      // 优先级：batchAreasMap（从种植/育苗记录反查） > 批次自带的 greenhouseId
      const fromMap = batchAreasMap[newRecord.batchCode];
      const derivedGreenhouseIds: string[] = fromMap && fromMap.length > 0
        ? fromMap
        : (newBatch?.greenhouseId ? [newBatch.greenhouseId] : []);

      // 立即同步联动字段
      setNewRecord(prev => ({
        ...prev,
        harvestType: derivedHarvestType,
        targetInventory: derivedHarvestType,
        greenhouseIds: derivedGreenhouseIds,
        greenhouseId: derivedGreenhouseIds[0] || prev.greenhouseId,
      }));

      // 清空现有产品，重新根据新批次添加一行
      if (newRecord.products.length > 0) {
        setTimeout(() => {
          setNewRecord(prev => {
            const searchResults = newBatch?.cropName
              ? cropVarietyService.searchVarieties(newBatch.cropName)
              : [];
            const cropVarietyInfo = searchResults.length > 0 ? searchResults[0].variety : undefined;

            const updatedProducts = prev.products.map((p, idx) => ({
              ...p,
              cropCode: cropVarietyInfo?.cropCode || p.cropCode,
              variety: newBatch?.cropName || p.variety,
              cropName: newBatch?.variety || p.cropName,
              plantingMode: newBatch?.plantingMode || p.plantingMode,
              targetYield: newBatch?.targetYield || p.targetYield,
            }));
            return { ...prev, products: updatedProducts };
          });
        }, 0);
      } else if (!prevBatchCodeRef.current) {
        // 从无批次变为有批次且产品为空时，添加一行
        setTimeout(() => {
          handleAddProduct();
        }, 0);
      }
    }
    prevBatchCodeRef.current = newRecord.batchCode || null;
  }, [newRecord.batchCode, newRecord.products.length, cropBatches, batchAreasMap]);

  // 更新产品
  const handleProductChange = (index: number, field: string, value: any) => {
    setNewRecord(prev => ({
      ...prev,
      products: prev.products.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  // 刷新采收数据（通过 Store）
  const refreshHarvestData = () => {
    loadItems();
  };

  const handleCreateRecord = async () => {
    if (!validateForm()) return;

    // 至少选择一个采收区域
    if (!newRecord.greenhouseIds || newRecord.greenhouseIds.length === 0) {
      showAlert('请至少选择一个采收区域', 'error');
      return;
    }

    try {
    const selectedBatch = cropBatches.find(b => b.batchCode === newRecord.batchCode);
    const primaryGreenhouseId = newRecord.greenhouseIds[0];
    const selectedGreenhouse = greenhouses.find(g => g.id === primaryGreenhouseId);
    const allGreenhouseNames = newRecord.greenhouseIds
      .map(id => greenhouses.find(g => g.id === id)?.name || id)
      .join('、');
    const areaSummary = newRecord.greenhouseIds.length > 1
      ? `[采收区域：${allGreenhouseNames}] `
      : '';

    // V3.1: 1 条采收事件 = 1 条主单，N 个产品存到主单的 products JSON 字段
    // 库存按产品拆分成 N 条 inventory_stock（每个产品 1 条），businessId 都指向主单 id
    const productList = newRecord.products.length > 0 ? newRecord.products : [];
    const firstProduct = productList[0];
    const totalHarvestQuantity = productList.reduce((sum, p) => sum + (p.harvestQuantity || 0), 0);

    // 生成采收单号（一个采收事件 = 1 个单号）
    const harvestCode = newRecord.harvestCode || await genHarvestCode();
    const unitPrice = newRecord.unitPrice || 0;
    const selectedWarehouse = safeWarehouses.find(w => w.oid === newRecord.warehouseId);

    // 主档 cropName/grade/plantingMode/variety/targetYield 取第一个产品（兼容无产品场景回落 batch）
    const mainCropName = firstProduct?.cropName || selectedBatch?.cropName || '';
    const mainGrade = firstProduct?.grade || 'good';
    const mainVariety = firstProduct?.variety || selectedBatch?.variety || '';
    const mainPlantingMode = firstProduct?.plantingMode || selectedBatch?.plantingMode || '';
    const mainTargetYield = firstProduct?.targetYield ?? selectedBatch?.targetYield ?? 0;

    // 1 条主单（products 字段存 JSON 数组）
    const record = {
      harvestCode,
      batchCode: newRecord.batchCode,
      cropName: mainCropName,
      greenhouseId: primaryGreenhouseId,
      greenhouseName: allGreenhouseNames,
      harvestDate: newRecord.harvestDate,
      harvestQuantity: totalHarvestQuantity,
      unit: newRecord.unit,
      grade: mainGrade,
      harvesterIds: newRecord.harvesterIds,
      harvesterNames: newRecord.harvesterNames || [],
      warehouseId: newRecord.warehouseId,
      warehouseName: selectedWarehouse?.name || '',
      status: 'harvested' as const,
      remarks: `${areaSummary}${newRecord.remarks}`.trim(),
      auditor: newRecord.auditor,
      variety: mainVariety,
      plantingMode: mainPlantingMode,
      targetYield: mainTargetYield,
      quality: 'good' as const,
      unitPrice,
      totalAmount: totalHarvestQuantity * unitPrice,
      // V3.1 关键：1:N 产品明细数组（前端直接传数组，后端 Repository 序列化）
      products: productList.map(p => ({
        productCode: p.productCode || '',
        cropName: p.cropName || mainCropName,
        cropCode: p.cropCode || '',
        variety: p.variety || mainVariety,
        batchCode: p.batchCode || newRecord.batchCode,
        plantingMode: p.plantingMode || mainPlantingMode,
        harvestQuantity: p.harvestQuantity || 0,
        targetYield: p.targetYield ?? mainTargetYield,
        grade: p.grade || mainGrade,
        auditor: p.auditor || newRecord.auditor,
        remarks: p.remarks || '',
        unit: p.unit || newRecord.unit,
      })),
    };

    // 使用 Store 添加 1 条主单（架构：组件 → Store → API）
    const createdRecord = await addItem(record);

    if (!createdRecord) {
      showAlert('采收记录保存失败，请重试', 'error');
      return;
    }

    // 同步到库存中心：每个产品 1 条 inventory_stock，businessId 都用主单 id
    const stockTypeMap: Record<string, StockType> = {
      'seed': StockType.SEED,
      'seedling': StockType.SEEDLING,
      'product': StockType.PRODUCT,
    };
    const stockType = stockTypeMap[newRecord.targetInventory] || StockType.PRODUCT;

    // 兜底：万一 productList 为空，仍要写 1 条库存（兼容行为）
    const inventoryTargets = productList.length > 0 ? productList : [{
      cropName: mainCropName,
      cropCode: '',
      variety: mainVariety,
      plantingMode: mainPlantingMode,
      targetYield: mainTargetYield,
      grade: mainGrade,
      auditor: newRecord.auditor,
      remarks: newRecord.remarks,
      harvestQuantity: totalHarvestQuantity,
      unit: newRecord.unit,
    }];

    for (const product of inventoryTargets) {
      const quantity = product.harvestQuantity || 0;
      if (quantity <= 0) continue;

      const inventoryResult = await inventoryInbound({
        stockType,
        businessId: createdRecord.id,
        businessType: BusinessType.HARVEST,
        cropId: selectedBatch?.cropId || '',
        cropName: product.cropName || mainCropName,
        varietyId: selectedBatch?.varietyId,
        varietyName: product.variety || mainVariety,
        quantity,
        unit: product.unit || newRecord.unit,
        sourceType: SourceType.SELF_PRODUCED,
        baseName: selectedGreenhouse?.name,
        productionPlanId: selectedBatch?.productionPlanId,
        productionPlanCode: selectedBatch?.productionPlanCode,
        businessCode: record.harvestCode,
        cropCode: product.cropCode || '',
        plantingMode: product.plantingMode || mainPlantingMode,
        targetYield: product.targetYield ?? mainTargetYield,
        grade: product.grade || mainGrade,
        auditor: product.auditor || newRecord.auditor,
        greenhouseName: allGreenhouseNames,
        remarks: product.remarks || newRecord.remarks,
        extensions: {
          warehouseId: newRecord.warehouseId,
          warehouseName: selectedWarehouse?.name || '',
          inboundDate: newRecord.harvestDate,
        },
      }, 'system', '系统管理员');

      if (!inventoryResult.success) {
        try {
          await deleteItem(String(createdRecord.id));
        } catch (rollbackErr) {
          logger.error('[HarvestPage] 回滚采收记录失败', rollbackErr);
        }

        showAlert(
          `库存同步失败，采收记录已回滚。\n原因：${inventoryResult.error || '未知错误'}\n\n请检查：\n1. 仓库类型与采收类型是否匹配（种子/种苗/成品）\n2. 网络是否正常\n3. 后端服务是否运行`,
          'error'
        );
        return;
      }
    }

    useInventoryStore.getState().notifyChange();

    if (selectedBatch?.instanceId && totalHarvestQuantity > 0) {
      await cropInstanceService.updateQuantity(selectedBatch.instanceId, 'harvest', totalHarvestQuantity);
    }

    refreshHarvestData();

    setIsCreateModalOpen(false);
    setNewRecord({
      harvestCode: '',
      batchCode: '',
      greenhouseId: '',
      greenhouseIds: [],
      harvestDate: new Date().toISOString().slice(0, 16),
      harvesterIds: [],
      harvesterNames: [],
      auditor: currentAuditor,
      remarks: '',
      products: [],
      harvestType: 'product',
      targetInventory: 'product',
      isSupplementary: false,
      supplementaryReason: '',
      unitPrice: 0,
      unit: '公斤',
      warehouseId: '',
      saleType: 'external_sale' as 'self_use' | 'external_sale',
    });
    setErrors({});
    } catch (error) {
      showAlert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
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
      harvestCode: '',
      batchCode: '',
      greenhouseId: '',
      greenhouseIds: [],
      harvestDate: new Date().toISOString().slice(0, 16),
      harvesterIds: [],
      harvesterNames: [],
      auditor: currentAuditor,
      remarks: '',
      products: [],
      harvestType: 'product',
      targetInventory: 'product',
      isSupplementary: false,
      supplementaryReason: '',
      unitPrice: 0,
      unit: '公斤',
      warehouseId: '',
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
              showAlert('请先选择要导出的数据');
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Check className="w-4 h-4" />
                  {selectedRows.length === filteredRecords.length ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={Math.ceil(filteredRecords.length / pageSize) || 1}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            showPageSize
          />
        </div>
      </div>

      {/* Create Harvest Record Modal */}
      <AddModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSave={handleCreateRecord}
        addForm={newRecord}
        onFormChange={(field, value) => setNewRecord(prev => ({ ...prev, [field]: value }))}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onProductChange={handleProductChange}
        onGenerateCode={() => setNewRecord(prev => ({ ...prev, harvestCode: generateHarvestCode() }))}
        greenhouses={greenhouses}
        warehouses={safeWarehouses}
        cropBatches={cropBatches}
        batchAreasMap={batchAreasMap}
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
