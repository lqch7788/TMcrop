import { useState } from 'react';
import { ClipboardList, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X, ClipboardCheck, BarChart3, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown, Package, MapPin, Calendar, BarChart2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

// 类型导入
import { MaterialItem, ExecuteMaterialItem, MaterialReceivingRecord } from '../types/materialReceiving';
import { Approval, ApprovalType, ApprovalStatus } from '../types/approval';
import { useApprovalContext } from '../contexts/ApprovalContext';

// 从数据文件导入所有Mock数据
import {
  materialReceivingDetails,
  materialExecuteDetails,
  monthlyStatisticsData,
  materialStatisticsData,
  departmentStatisticsData,
  greenhouseStatisticsData,
  fieldStatisticsData,
  batchStatisticsData,
  CATEGORY_COLORS,
  categorySummaryData,
  categoryTrendData,
  trendChartData,
  departmentPieData,
  categoryPieData,
  getCategoryByCode,
  getMonthCategoryData,
  getMonthSummary,
  getMonthSummaries,
  getMonthDetails,
  getYearTotalQuantity,
  getYearTotalAmount,
  getSingleMonthTableData,
  getSingleMonthTotal,
} from '../data/materialReceivingData';

// 弹窗组件
import { ExportTypeModal } from '../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../components/materialReceiving/modals/DetailModal';
import { EditModal } from '../components/materialReceiving/modals/EditModal';
import { AddModal } from '../components/materialReceiving/modals/AddModal';
import { UserSelect } from '../components/common/settings/UserSelect';
import { DeleteConfirm } from '../components/materialReceiving/modals/DeleteConfirm';
import { VoidModal } from '../components/materialReceiving/modals/VoidModal';
import { BatchEditModal } from '../components/materialReceiving/modals/BatchEditModal';
import { ExecuteBatchEditModal } from '../components/materialReceiving/modals/ExecuteBatchEditModal';
import { EditWarningModal } from '../components/materialReceiving/modals/EditWarningModal';
import { DeleteWarningModal } from '../components/materialReceiving/modals/DeleteWarningModal';
import { BatchDeleteConfirmModal } from '../components/materialReceiving/modals/BatchDeleteConfirmModal';
import { ExecuteEditWarningModal } from '../components/materialReceiving/modals/ExecuteEditWarningModal';
import { ExecuteDeleteWarningModal } from '../components/materialReceiving/modals/ExecuteDeleteWarningModal';
import { ExecuteBatchDeleteConfirmModal } from '../components/materialReceiving/modals/ExecuteBatchDeleteConfirmModal';
import { ExecuteDetailModal } from '../components/materialReceiving/modals/ExecuteDetailModal';
import { ExecuteAddModal } from '../components/materialReceiving/modals/ExecuteAddModal';
import { ExecuteEditModal } from '../components/materialReceiving/modals/ExecuteEditModal';
import { StatDetailModal } from '../components/materialReceiving/modals/StatDetailModal';
import { StatSearchBar } from '../components/materialReceiving/stats/StatSearchBar';

// 成本核算Tab组件
import CostTab from '../components/materialReceiving/tabs/CostTab';

// 领料统计Tab组件
import StatisticsTab from './material/tabs/StatisticsTab';

export default function MaterialReceiving() {
  // 领料申请数据状态化（支持 CRUD 操作）
  const [materialData, setMaterialData] = useState<MaterialReceivingRecord[]>(materialReceivingDetails);

  // 获取审批上下文（用于联动）
  const approvalContext = useApprovalContext();

  const [activeTab, setActiveTab] = useState('application');
  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<typeof materialReceivingDetails[0] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, typeof materialReceivingDetails[0]>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 领料出库页面状态
  const [executeSearchCode, setExecuteSearchCode] = useState('');
  const [executeSearchApplicant, setExecuteSearchApplicant] = useState('');
  const [executeSearchBatchCode, setExecuteSearchBatchCode] = useState('');
  const [executeSearchWarehouse, setExecuteSearchWarehouse] = useState('');
  const [executeStatusFilter, setExecuteStatusFilter] = useState('all');
  const [executeCurrentPage, setExecuteCurrentPage] = useState(1);
  const [executePageSize, setExecutePageSize] = useState(10);
  const [executeExportMode, setExecuteExportMode] = useState(false);
  const [executeSelectedRows, setExecuteSelectedRows] = useState<number[]>([]);
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState(false);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, typeof materialExecuteDetails[0]>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  const [executeEditForm, setExecuteEditForm] = useState({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  const [executeAddForm, setExecuteAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 领料出库页面过滤后的数据
  const executeFilteredData = materialExecuteDetails.filter(item => {
    if (executeSearchCode && !item.code.toLowerCase().includes(executeSearchCode.toLowerCase())) return false;
    if (executeSearchApplicant && !item.applicant.toLowerCase().includes(executeSearchApplicant.toLowerCase())) return false;
    if (executeSearchBatchCode && !item.productionBatchCode.toLowerCase().includes(executeSearchBatchCode.toLowerCase())) return false;
    if (executeSearchWarehouse && !item.warehouseLocation.toLowerCase().includes(executeSearchWarehouse.toLowerCase())) return false;
    if (executeStatusFilter !== 'all' && item.executeStatus !== executeStatusFilter) return false;
    return true;
  });

  const executeTotalPages = Math.ceil(executeFilteredData.length / executePageSize);

  // 领料出库页面重置搜索
  const handleExecuteReset = () => {
    setExecuteSearchCode('');
    setExecuteSearchApplicant('');
    setExecuteSearchBatchCode('');
    setExecuteSearchWarehouse('');
    setExecuteStatusFilter('all');
    setExecuteCurrentPage(1);
  };

  // 领料出库页面展开/折叠行
  const toggleExecuteExpandRow = (id: number) => {
    const newExpandedRows = new Set(executeExpandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExecuteExpandedRows(newExpandedRows);
  };

  // 领料出库页面全选
  const handleExecuteSelectAll = () => {
    if (executeSelectedRows.length === executeFilteredData.length) {
      setExecuteSelectedRows([]);
    } else {
      setExecuteSelectedRows(executeFilteredData.map(item => item.id));
    }
  };

  // 领料出库页面选择单行
  const handleExecuteSelectRow = (id: number) => {
    if (executeSelectedRows.includes(id)) {
      setExecuteSelectedRows(executeSelectedRows.filter(rowId => rowId !== id));
    } else {
      setExecuteSelectedRows([...executeSelectedRows, id]);
    }
  };

  // 领料出库页面导出
  const handleExecuteExportClick = () => {
    setExecuteShowExportTypeModal(true);
  };

  const confirmExecuteExport = async () => {
    const exportData = materialExecuteDetails.filter(item => executeSelectedRows.includes(item.id));
    const headers = ['出库单号', '日期', '申领人', '仓库地点', '审核人', '操作人', '生产批次号', '执行状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'operator', 'productionBatchCode', 'executeStatus'];
    // 物料明细表头（与实际数据字段一致，不包括计算字段）
    const materialHeaders = ['来源领料单号', '物料编码', '物料名称', '规格', '单位', '申请数量', '实际库存', '本次实发', '单价(元)', '仓库货位', '备注'];
    const materialFields = ['applicationCode', 'materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'actualQuantity', 'unitPrice', 'warehousePosition', 'remark'];

    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content: string | Uint8Array = '';
    let mimeType = '';
    let extension = '';

    if (executeExportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.map(h => escapeCSV(h)).join(',') + ',' + materialHeaders.map(h => escapeCSV(h)).join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => escapeCSV((row as any)[f] || '')).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (executeExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (executeExportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `领料出库_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: executeExportFileType.toUpperCase() + ' Files',
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

    setExecuteShowExportTypeModal(false);
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面取消导出
  const handleExecuteCancelExport = () => {
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面查看详情
  const handleExecuteView = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
  };

  // 领料出库页面新增
  const handleExecuteAdd = () => {
    const newCode = 'CK' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(materialExecuteDetails.length + 1).padStart(3, '0');
    setExecuteAddForm({
      code: newCode,
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteShowAddModal(true);
  };

  // 添加选中物料到物料池
  const handleAddToMaterialPool = () => {
    if (!executeSelectedApplicationCode || executeSelectedMaterialIndices.size === 0) {
      alert('请先选择领料单并勾选要出库的物料');
      return;
    }
    const selectedApp = materialReceivingDetails.find(app => app.code === executeSelectedApplicationCode);
    if (!selectedApp) return;

    const newMaterials: ExecuteMaterialItem[] = Array.from(executeSelectedMaterialIndices).map(idx => {
      const material = selectedApp.materials[idx];
      const actualQty = executeMaterialActualQuantities[idx] ?? material.requestedQuantity;
      return {
        materialCode: material.materialCode,
        materialName: material.materialName,
        spec: material.spec,
        unit: material.unit,
        category: material.category,
        requestedQuantity: material.requestedQuantity,
        stockQuantity: actualQty,
        actualQuantity: actualQty,
        remark: actualQty === material.requestedQuantity ? '正常出库' : '部分出库',
        applicationCode: executeSelectedApplicationCode
      };
    });

    setExecuteMaterialPool([...executeMaterialPool, ...newMaterials]);
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteSelectedApplicationCode('');
  };

  // 从物料池移除物料
  const handleRemoveFromMaterialPool = (index: number) => {
    setExecuteMaterialPool(executeMaterialPool.filter((_, i) => i !== index));
  };

  // 更新物料池中物料的实发数量
  const handleUpdateMaterialPoolQuantity = (index: number, actualQuantity: number) => {
    const updatedPool = [...executeMaterialPool];
    updatedPool[index] = {
      ...updatedPool[index],
      actualQuantity: actualQuantity,
      remark: actualQuantity === updatedPool[index].requestedQuantity ? '正常出库' : '部分出库'
    };
    setExecuteMaterialPool(updatedPool);
  };

  // 领料出库页面编辑
  const handleExecuteEdit = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteEditForm({
      date: item.date,
      applicant: item.applicant,
      warehouseLocation: item.warehouseLocation,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      executeStatus: item.executeStatus,
      materials: item.materials
    });
    setExecuteShowEditModal(true);
  };

  // 领料出库页面删除
  const handleExecuteDeleteClick = (id: number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  };

  const confirmExecuteDelete = () => {
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  };

  const handleExecuteSaveEdit = () => {
    setExecuteShowEditModal(false);
    alert('保存成功');
  };

  const handleExecuteSaveAdd = () => {
    if (executeMaterialPool.length === 0) {
      alert('请先添加物料到物料池');
      return;
    }

    const sourceAppCodes = [...new Set(executeMaterialPool.map(m => m.applicationCode))];
    const firstMaterial = executeMaterialPool[0];
    const sourceApp = materialReceivingDetails.find(app => app.code === firstMaterial.applicationCode);

    const newRecord = {
      id: materialExecuteDetails.length + 1,
      code: executeAddForm.code || `CK${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(materialExecuteDetails.length + 1).padStart(3, '0')}`,
      date: executeAddForm.date,
      applicant: sourceApp?.applicant || '',
      warehouseLocation: executeAddForm.warehouseLocation,
      reviewer: sourceApp?.reviewer || '',
      operator: executeAddForm.reviewer,
      productionBatchCode: sourceApp?.productionBatchCode || '',
      sourceApplicationCodes: sourceAppCodes,
      executeStatus: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? '部分出库' : '已出库',
      executeStatusClass: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? 'partial' : 'completed',
      materials: executeMaterialPool
    };

    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    alert('新增成功');
  };

  const handleExecuteCancelAdd = () => {
    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
  };

  const handleExecuteCancelEdit = () => {
    setExecuteShowEditModal(false);
  };

  const handleExecuteCancelDetail = () => {
    setExecuteShowDetailModal(false);
  };

  const handleExecuteEditAddMaterial = () => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: [
        ...executeEditForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  };

  const handleExecuteEditRemoveMaterial = (index: number) => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: executeEditForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteEditMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeEditForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteEditForm({ ...executeEditForm, materials: newMaterials });
  };

  const handleExecuteAddAddMaterial = () => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: [
        ...executeAddForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  };

  const handleExecuteAddRemoveMaterial = (index: number) => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: executeAddForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteAddMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeAddForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteAddForm({ ...executeAddForm, materials: newMaterials });
  };

  const [editForm, setEditForm] = useState({
    date: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    plantArea: '',
    reviewer: '',
    productionBatchCode: '',
    status: '',
    materials: [] as MaterialItem[]
  });

  const [addForm, setAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    department: '',
    warehouseLocation: '仓库A区',
    plantArea: '',
    reviewer: '王志刚',
    productionBatchCode: '',
    batchRemark: '',
    materials: [] as MaterialItem[]
  });

  // 过滤后的数据
  const filteredData = materialData.filter(item => {
    if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
    if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
    if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
    if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 重置搜索
  const handleReset = () => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // 展开/折叠行
  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  // 选择单行
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出
  const handleExportClick = () => {
    setShowExportTypeModal(true);
  };

  const confirmExport = async () => {
    // 获取选中的数据
    const exportData = materialReceivingDetails.filter(item => selectedRows.includes(item.id));

    // 主表表头和字段映射
    const headers = ['领料单号', '日期', '申领人', '仓库地点', '审核人', '生产批次号', '状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'productionBatchCode', 'status'];

    // 物料明细表头和字段映射（与表格列一致：物料编码, 物料名称, 规格, 单位, 申领数量, 当前库存, 单价, 小计, 仓库货位, 备注）
    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '申领数量', '当前库存', '单价(元)', '小计(元)', '仓库货位', '备注'];
    // 小计(元)是计算字段，使用warehousePosition占位
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'unitPrice', 'warehousePosition', 'warehousePosition', 'remark'];

    // 准备导出内容
    let content: string | Uint8Array = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      // 使用xlsx库生成真正的Excel文件（中文表头）
      const aoa: any[][] = [];

      // 添加表头
      aoa.push([...headers, ...materialHeaders]);

      // 添加数据
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            const rowData: any[] = [];
            if (idx === 0) {
              fields.forEach(f => { rowData.push((row as any)[f]); });
            } else {
              fields.forEach(() => { rowData.push(''); });
            }
            materialFields.forEach(f => { rowData.push(mat[f]); });
            aoa.push(rowData);
          });
        } else {
          const rowData: any[] = [];
          fields.forEach(f => { rowData.push((row as any)[f]); });
          materialFields.forEach(() => { rowData.push(''); });
          aoa.push(rowData);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '领料单');

      // 生成二进制文件
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      content = new Uint8Array(xlsxBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else if (exportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产领料_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFileType.toUpperCase() + ' Files',
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

    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 查看详情
  const handleView = (item: typeof materialReceivingDetails[0]) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  };

  // 编辑
  const handleEdit = (item: typeof materialReceivingDetails[0]) => {
    // 只有待审批状态的记录可以编辑
    if (item.status !== '待审批') {
      setEditAlertMessage(`该领料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      plantArea: item.plantArea,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      status: item.status,
      materials: [...item.materials],
    });
    setShowEditModal(true);
  };

  // 编辑弹窗 - 添加物料行
  const handleEditAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setEditForm({ ...editForm, materials: [...editForm.materials, newMaterial] });
  };

  // 编辑弹窗 - 删除物料行
  const handleEditRemoveMaterial = (index: number) => {
    const newMaterials = [...editForm.materials];
    newMaterials.splice(index, 1);
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 编辑弹窗 - 更新物料行
  const handleEditMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...editForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 删除确认
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  // 保存编辑（重新提交）
  const handleSaveEdit = () => {
    if (!selectedRecord) return;

    // 查找当前编辑的记录
    const currentRecord = materialData.find(r => r.id === selectedRecord.id);
    if (!currentRecord) return;

    const updatedRecord: MaterialReceivingRecord = {
      ...currentRecord,
      date: editForm.date,
      applicant: editForm.applicant,
      department: editForm.department,
      warehouseLocation: editForm.warehouseLocation,
      plantArea: editForm.plantArea,
      reviewer: editForm.reviewer,
      productionBatchCode: editForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: editForm.materials.map(m => ({ ...m, actualQuantity: 0 }))
    };

    // 使用不可变方式更新
    setMaterialData(prev => prev.map(r => r.id === selectedRecord.id ? updatedRecord : r));

    setShowEditModal(false);
    alert('编辑已保存，领料单已重新提交，等待审批');
  };

  // 作废申请按钮点击
  const handleVoidApply = () => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  };

  // 提交作废申请
  const submitVoidApply = () => {
    if (!voidReason.trim()) {
      alert('请填写作废原因');
      return;
    }
    if (!selectedRecord) return;

    // 使用不可变方式更新
    setMaterialData(prev => prev.map(r =>
      r.id === selectedRecord.id
        ? { ...r, status: '已作废', statusClass: 'voided' }
        : r
    ));

    setShowVoidModal(false);
    setShowEditModal(false);
  };

  // 添加物料行
  const handleAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setAddForm({ ...addForm, materials: [...addForm.materials, newMaterial] });
  };

  // 删除物料行
  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...addForm.materials];
    newMaterials.splice(index, 1);
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 更新物料行
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...addForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 生成领料单号
  const handleGenerateAddCode = () => {
    const newCode = `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(materialData.length + 1).padStart(3, '0')}`;
    setAddForm({ ...addForm, code: newCode });
  };

  // 保存新增
  const handleSaveAdd = () => {
    // 1. 验证表单
    if (!addForm.applicant) {
      alert('请选择申请人');
      return;
    }
    if (addForm.materials.length === 0) {
      alert('请添加至少一个物料');
      return;
    }

    // 2. 生成单号
    const newCode = `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(materialData.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // 3. 创建领料记录
    const newRecord: MaterialReceivingRecord = {
      id: materialData.length + 1,
      code: newCode,
      date: addForm.date,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      plantArea: addForm.plantArea,
      reviewer: addForm.reviewer,
      productionBatchCode: addForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: addForm.materials.map(m => ({ ...m, actualQuantity: 0 }))
    };

    // 4. 写入领料数据
    setMaterialData(prev => [newRecord, ...prev]);

    // 5. 同步创建审批记录（核心联动功能）
    if (approvalContext) {
      const approval: Approval = {
        id: `MAT-AP-${Date.now()}`,
        code: newRecord.code,
        type: ApprovalType.MATERIAL_REQUEST,
        typeName: '领料单',
        category: 'business',
        title: `${newRecord.applicant}的领料申请`,
        description: `申请从${newRecord.warehouseLocation}领取物料，用于${newRecord.plantArea}`,
        applicantId: `user_${newRecord.applicant}`,
        applicantName: newRecord.applicant,
        applicantDepartment: newRecord.department,
        applyDate: newRecord.date,
        applyTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        currentStep: 1,
        totalSteps: 1,
        approvers: [{
          userId: `user_${newRecord.reviewer}`,
          userName: newRecord.reviewer,
          role: '审批人',
          order: 1,
          status: 'pending'
        }],
        records: [],
        status: ApprovalStatus.PENDING,
        priority: 'normal',
        reminderCount: 0,
        createdAt: now,
        updatedAt: now,
        notificationSent: false,
        materials: addForm.materials.map(m => ({
          materialId: m.materialCode,
          materialCode: m.materialCode,
          materialName: m.materialName,
          requestedQuantity: m.requestedQuantity,
          unit: m.unit
        })),
        businessLink: {
          type: 'material',
          requestId: String(newRecord.id),
          requestCode: newRecord.code,
          plantArea: addForm.plantArea,
          warehouseLocation: addForm.warehouseLocation,
          batchCode: addForm.productionBatchCode,
          materials: addForm.materials.map(m => ({
            materialId: m.materialCode,
            materialCode: m.materialCode,
            materialName: m.materialName,
            requestedQuantity: m.requestedQuantity,
            unit: m.unit
          }))
        }
      };
      approvalContext.addApproval(approval);
    }

    // 6. 关闭弹窗，重置表单
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      batchRemark: '',
      materials: []
    });
  };

  // 取消新增
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      batchRemark: '',
      materials: []
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
            <p className="text-gray-500">生产领料记录管理</p>
          </div>
        </div>
      </div>

      {/* Tab切换区域 - 顶部标签页样式 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-6 pb-0 mb-4">
        <div className="flex gap-8 border-b border-gray-200">
          {[
            { key: 'application', label: '申请领料', icon: FileText },
            { key: 'execute', label: '领料出库', icon: ClipboardCheck },
            { key: 'statistics', label: '领料统计', icon: BarChart3 },
            { key: 'cost', label: '成本核算', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-base font-semibold transition-all relative ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

    {/* Tab内容区域 */}
    <div>
      {/* 领料申请 Tab内容 */}
      <div className={activeTab === 'application' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索领料单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={searchBatchCode}
                onChange={(e) => { setSearchBatchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={searchWarehouse}
              onChange={(e) => { setSearchWarehouse(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待审批">待审批</option>
              <option value="已审批">已审批</option>
              <option value="已拒绝">已拒绝</option>
              <option value="已作废">已作废</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">领料申请单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {/* 编辑删除按钮 - 默认显示 */}
              {!batchEditMode && (
                <>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}

              {/* 选择模式下显示确认/取消按钮 */}
              {batchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}

              {!batchEditMode && (
                <button
                  onClick={() => setExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
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
                {(exportMode || batchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">领料单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植区域/用途</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => handleView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.plantArea}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                          item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                          item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                          item.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                          item.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                          item.statusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                        {item.statusClass === 'rejected' && item.rejectReason && (
                          <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.rejectReason}>
                            原因：{item.rejectReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {item.materials.length > 0 ? item.materials[0].remark : '-'}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = material.requestedQuantity * material.unitPrice;
                                  const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                  return (
                                    <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === filteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <DetailModal
          isOpen={showDetailModal}
          record={selectedRecord}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑领料单</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 领料单号 - 只读 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                  <div className="text-sm font-medium text-gray-900">{selectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
                  <UserSelect
                    value={editForm.applicant}
                    onChange={(value) => setEditForm({ ...editForm, applicant: value })}
                    placeholder="选择申请人"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">部门</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择部门</option>
                    <option value="生产部">生产部</option>
                    <option value="后勤部">后勤部</option>
                    <option value="设备部">设备部</option>
                    <option value="技术部">技术部</option>
                    <option value="采后处理部">采后处理部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={editForm.warehouseLocation}
                    onChange={(e) => setEditForm({ ...editForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">种植区域/用途</label>
                  <input
                    type="text"
                    value={editForm.plantArea}
                    onChange={(e) => setEditForm({ ...editForm, plantArea: e.target.value })}
                    placeholder="如：1号棚-叶菜区"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
                  <UserSelect
                    value={editForm.reviewer}
                    onChange={(value) => setEditForm({ ...editForm, reviewer: value })}
                    placeholder="选择审核人"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={editForm.productionBatchCode}
                    onChange={(e) => setEditForm({ ...editForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleEditAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {editForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editForm.materials.map((material, idx) => {
                        const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                        const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.remark || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleEditRemoveMaterial(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              {(selectedRecord?.status === '待审批' || selectedRecord?.status === '已审批') && (
                <button
                  onClick={handleVoidApply}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  作废申请
                </button>
              )}
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑警告弹窗 */}
      <EditWarningModal
        show={showEditWarning}
        onCancel={() => { setShowEditWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
        onConfirm={() => { setShowEditWarning(false); }}
      />

      {/* 删除警告弹窗 */}
      <DeleteWarningModal
        show={showDeleteWarning}
        onCancel={() => { setShowDeleteWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
        onConfirm={() => { setShowDeleteWarning(false); }}
      />

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <DeleteConfirm
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 批量删除确认弹窗 */}
      <BatchDeleteConfirmModal
        show={showBatchDeleteConfirm}
        count={selectedRows.length}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          setShowBatchDeleteConfirm(false);
          setSelectedRows([]);
          setBatchEditMode(false);
          alert(`已删除 ${selectedRows.length} 项领料记录`);
        }}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        batchEditedRecords={batchEditedRecords}
        currentBatchEditIndex={currentBatchEditIndex}
        recordsList={materialReceivingDetails.filter(r => selectedRows.includes(r.id))}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedRecords({}); setCurrentBatchEditIndex(0); }}
        onRecordChange={(idx) => setCurrentBatchEditIndex(idx)}
        onFieldChange={(recordId, field, value) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, [field]: value }
          });
        }}
        onMaterialChange={(recordId, materialIdx, field, value) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials[materialIdx] = { ...materials[materialIdx], [field]: value };
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onMaterialDelete={(recordId, materialIdx) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials.splice(materialIdx, 1);
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onNextRecord={() => {
          const nextIndex = currentBatchEditIndex + 1;
          setCurrentBatchEditIndex(nextIndex < selectedRows.length ? nextIndex : 0);
        }}
        onVoidApply={() => {
          const currentRecordId = selectedRows[currentBatchEditIndex];
          const currentRecord = materialReceivingDetails.find(r => r.id === currentRecordId);
          setSelectedRecord(currentRecord);
          setShowBatchEditModal(false);
          setShowVoidModal(true);
        }}
        onSaveAll={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setBatchEditedRecords({});
          setCurrentBatchEditIndex(0);
        }}
      />

      {/* 编辑提示弹窗 */}
      {showEditAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Edit className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">无法编辑</h3>
                  <p className="text-sm text-gray-500">领料单状态限制</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  {editAlertMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditAlert(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  知道了
                </button>
                <button
                  onClick={() => {
                    setShowEditAlert(false);
                    handleVoidApply();
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  前往作废申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作废申请弹窗 */}
      {showVoidModal && (
        <VoidModal
          voidReason={voidReason}
          onChange={setVoidReason}
          onSubmit={submitVoidApply}
          onCancel={() => setShowVoidModal(false)}
          recordCode={selectedRecord?.code}
        />
      )}

      {/* 新增领料单弹窗 */}
      {showAddModal && (
        <AddModal
          isOpen={showAddModal}
          addForm={addForm}
          onChange={(field, value) => setAddForm({ ...addForm, [field]: value })}
          onSave={handleSaveAdd}
          onClose={handleCancelAdd}
          onAddMaterial={handleAddMaterial}
          onRemoveMaterial={handleRemoveMaterial}
          onMaterialChange={handleMaterialChange}
          onGenerateCode={handleGenerateAddCode}
        />
      )}

      {/* 导出文件类型选择弹窗 */}
      <ExportTypeModal
        isOpen={showExportTypeModal}
        exportFileType={exportFileType}
        onChange={setExportFileType}
        onConfirm={confirmExport}
        onClose={() => setShowExportTypeModal(false)}
      />
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">出库单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索出库单号..."
                value={executeSearchCode}
                onChange={(e) => { setExecuteSearchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={executeSearchApplicant}
                onChange={(e) => { setExecuteSearchApplicant(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={executeSearchBatchCode}
                onChange={(e) => { setExecuteSearchBatchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={executeSearchWarehouse}
              onChange={(e) => { setExecuteSearchWarehouse(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">执行状态</label>
            <select
              value={executeStatusFilter}
              onChange={(e) => { setExecuteStatusFilter(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待出库">待出库</option>
              <option value="部分出库">部分出库</option>
              <option value="已出库">已出库</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleExecuteReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">出库单列表</h3>
          {executeExportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleExecuteCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteAdd}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {!executeBatchEditMode && (
                <>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}
              {executeBatchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (executeSelectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setExecuteBatchEditMode(false);
                      } else {
                        setExecuteShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setExecuteShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}
              {!executeBatchEditMode && (
                <button
                  onClick={() => setExecuteExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
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
                {(executeExportMode || executeBatchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={executeSelectedRows.length === executeFilteredData.length && executeFilteredData.length > 0}
                      onChange={handleExecuteSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {executeFilteredData.slice((executeCurrentPage - 1) * executePageSize, executeCurrentPage * executePageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(executeExportMode || executeBatchEditMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={executeSelectedRows.includes(item.id)}
                          onChange={() => handleExecuteSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleExecuteExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {executeExpandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => handleExecuteView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                        item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                        item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                        item.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.executeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExecuteView(item)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {executeExpandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(executeExportMode || executeBatchEditMode) ? 14 : 13} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申请数量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">实际库存</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次实发</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">差异</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                  const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                  return (
                                    <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                          {material.stockQuantity}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        {material.actualQuantity > 0 ? (
                                          <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                            {material.actualQuantity}
                                          </span>
                                        ) : (
                                          <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                            {material.actualQuantity}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{(material.unitPrice || 0).toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
                                      <td className="px-3 py-2 text-sm">
                                        {material.requestedQuantity - material.actualQuantity > 0 ? (
                                          <span className="text-red-600 font-medium">-{material.requestedQuantity - material.actualQuantity}</span>
                                        ) : (
                                          <span className="text-green-600">0</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {executeExportMode && executeSelectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecuteSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {executeSelectedRows.length === executeFilteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {executeSelectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={executePageSize}
              onChange={(e) => { setExecutePageSize(Number(e.target.value)); setExecuteCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {executeFilteredData.length} 条</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.max(1, executeCurrentPage - 1))}
              disabled={executeCurrentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{executeCurrentPage} / {executeTotalPages || 1}</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.min(executeTotalPages, executeCurrentPage + 1))}
              disabled={executeCurrentPage >= executeTotalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      <ExecuteDetailModal
        isOpen={executeShowDetailModal}
        record={executeSelectedRecord}
        onClose={() => setExecuteShowDetailModal(false)}
      />

      {/* 新增领料出库弹窗 */}
      <ExecuteAddModal
        isOpen={executeShowAddModal}
        addForm={executeAddForm}
        selectedApplicationCode={executeSelectedApplicationCode}
        selectedMaterialIndices={executeSelectedMaterialIndices}
        materialActualQuantities={executeMaterialActualQuantities}
        materialPool={executeMaterialPool}
        materialReceivingDetails={materialReceivingDetails}
        onClose={() => setExecuteShowAddModal(false)}
        onAddFormChange={(field, value) => setExecuteAddForm({ ...executeAddForm, [field]: value })}
        onSelectedApplicationCodeChange={setExecuteSelectedApplicationCode}
        onSelectedMaterialIndicesChange={setExecuteSelectedMaterialIndices}
        onMaterialActualQuantitiesChange={setExecuteMaterialActualQuantities}
        onAddToMaterialPool={handleAddToMaterialPool}
        onRemoveFromMaterialPool={handleRemoveFromMaterialPool}
        onUpdateMaterialPoolQuantity={handleUpdateMaterialPoolQuantity}
        onCancel={handleExecuteCancelAdd}
        onSave={handleExecuteSaveAdd}
      />

      {/* 编辑领料出库弹窗 */}
      <ExecuteEditModal
        isOpen={executeShowEditModal}
        record={executeSelectedRecord}
        editForm={executeEditForm}
        onClose={() => setExecuteShowEditModal(false)}
        onEditFormChange={(field, value) => setExecuteEditForm({ ...executeEditForm, [field]: value })}
        onMaterialChange={handleExecuteEditMaterialChange}
        onAddMaterial={handleExecuteEditAddMaterial}
        onRemoveMaterial={handleExecuteEditRemoveMaterial}
        onCancel={handleExecuteCancelEdit}
        onSave={handleExecuteSaveEdit}
      />

      {/* 删除确认弹窗 */}
      {executeShowDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500">确定要删除这条领料出库记录吗？此操作不可撤销。</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setExecuteShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出类型选择弹窗 */}
      <ExportTypeModal
        isOpen={executeShowExportTypeModal}
        exportFileType={executeExportFileType}
        onChange={setExecuteExportFileType}
        onConfirm={confirmExecuteExport}
        onClose={() => setExecuteShowExportTypeModal(false)}
      />

      {/* 编辑警告弹窗 */}
      <ExecuteEditWarningModal
        show={executeShowEditWarning}
        onCancel={() => { setExecuteShowEditWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowEditWarning(false); }}
      />

      {/* 删除警告弹窗 */}
      <ExecuteDeleteWarningModal
        show={executeShowDeleteWarning}
        onCancel={() => { setExecuteShowDeleteWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowDeleteWarning(false); }}
      />

      {/* 批量删除确认弹窗 */}
      <ExecuteBatchDeleteConfirmModal
        show={executeShowBatchDeleteConfirm}
        count={executeSelectedRows.length}
        onCancel={() => setExecuteShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          setExecuteShowBatchDeleteConfirm(false);
          setExecuteSelectedRows([]);
          setExecuteBatchEditMode(false);
          alert(`已删除 ${executeSelectedRows.length} 项领料出库记录`);
        }}
      />

      {/* 批量编辑出库弹窗 */}
      <ExecuteBatchEditModal
        show={executeShowBatchEditModal}
        selectedRows={executeSelectedRows}
        batchEditedRecords={executeBatchEditedRecords}
        currentBatchEditIndex={executeCurrentBatchEditIndex}
        recordsList={materialExecuteDetails.filter(r => executeSelectedRows.includes(r.id))}
        onClose={() => { setExecuteShowBatchEditModal(false); setExecuteBatchEditedRecords({}); setExecuteCurrentBatchEditIndex(0); }}
        onRecordChange={(idx) => setExecuteCurrentBatchEditIndex(idx)}
        onFieldChange={(recordId, field, value) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, [field]: value }
          });
        }}
        onMaterialChange={(recordId, materialIdx, field, value) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials[materialIdx] = { ...materials[materialIdx], [field]: value };
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onMaterialDelete={(recordId, materialIdx) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials.splice(materialIdx, 1);
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onSaveAll={() => {
          setExecuteShowBatchEditModal(false);
          setExecuteBatchEditedRecords({});
          setExecuteCurrentBatchEditIndex(0);
          setExecuteBatchEditMode(false);
          setExecuteSelectedRows([]);
          alert('批量编辑成功');
        }}
      />
      </div>

      {/* 领料统计 Tab内容 */}
      <div className={activeTab === 'statistics' ? '' : 'hidden'}>
        <StatisticsTab />
      </div>

      {/* 成本核算 Tab内容 */}
      <div className={activeTab === 'cost' ? '' : 'hidden'}>
        <CostTab />
      </div>
      </div>
    </div>
  );
}
