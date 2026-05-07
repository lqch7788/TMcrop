import { useState } from 'react';
import { Search, Download, Plus, Edit, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Eye, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

// 类型导入
import { MaterialReceivingRecord, ExecuteMaterialItem } from '../../../types/materialReceiving';

// 从数据文件导入Mock数据
import { materialReceivingDetails, materialExecuteDetails } from '../../../data/materialReceivingData';

// 弹窗组件
import { ExportTypeModal } from '../../../components/materialReceiving/modals/ExportTypeModal';
import { ExecuteDetailModal } from '../../../components/materialReceiving/modals/ExecuteDetailModal';
import { ExecuteAddModal } from '../../../components/materialReceiving/modals/ExecuteAddModal';
import { ExecuteEditModal } from '../../../components/materialReceiving/modals/ExecuteEditModal';
import { ExecuteEditWarningModal } from '../../../components/materialReceiving/modals/ExecuteEditWarningModal';
import { ExecuteDeleteWarningModal } from '../../../components/materialReceiving/modals/ExecuteDeleteWarningModal';
import { ExecuteBatchDeleteConfirmModal } from '../../../components/materialReceiving/modals/ExecuteBatchDeleteConfirmModal';
import { ExecuteBatchEditModal } from '../../../components/materialReceiving/modals/ExecuteBatchEditModal';

// Props接口定义
interface ExecuteTabProps {
  materialData: MaterialReceivingRecord[];
}

// ExecuteTab组件 - 领料出库
export default function ExecuteTab({ materialData }: ExecuteTabProps) {
  // 搜索状态
  const [executeSearchCode, setExecuteSearchCode] = useState('');
  const [executeSearchApplicant, setExecuteSearchApplicant] = useState('');
  const [executeSearchBatchCode, setExecuteSearchBatchCode] = useState('');
  const [executeSearchWarehouse, setExecuteSearchWarehouse] = useState('');
  const [executeStatusFilter, setExecuteStatusFilter] = useState('all');
  const [executeCurrentPage, setExecuteCurrentPage] = useState(1);
  const [executePageSize, setExecutePageSize] = useState(10);

  // 导出模式状态
  const [executeExportMode, setExecuteExportMode] = useState(false);
  const [executeSelectedRows, setExecuteSelectedRows] = useState<number[]>([]);
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');

  // 详情/编辑/新增弹窗状态
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);

  // 展开行状态
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());

  // 批量编辑模式状态
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState(false);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, typeof materialExecuteDetails[0]>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);

  // 物料池状态
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  // 编辑表单状态
  const [executeEditForm, setExecuteEditForm] = useState({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 新增表单状态
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

  // 重置搜索
  const handleExecuteReset = () => {
    setExecuteSearchCode('');
    setExecuteSearchApplicant('');
    setExecuteSearchBatchCode('');
    setExecuteSearchWarehouse('');
    setExecuteStatusFilter('all');
    setExecuteCurrentPage(1);
  };

  // 展开/折叠行
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
      let csvContent = '﻿' + headers.map(h => escapeCSV(h)).join(',') + ',' + materialHeaders.map(h => escapeCSV(h)).join(',') + '\n';
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

  // JSX部分
  return (
    <>
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
        materialReceivingDetails={materialData}
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
    </>
  );
}
