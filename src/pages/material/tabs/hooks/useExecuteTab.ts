// useExecuteTab Hook
// 领料出库页面的状态管理和业务逻辑
import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { MaterialReceivingRecord, ExecuteMaterialItem } from '@/types/materialReceiving';
import { materialReceivingDetails, materialExecuteDetails } from '@/data/materialReceivingData';
import type { UseExecuteTabReturn, ExecuteEditFormState, ExecuteAddFormState } from '../types/executeTab.types';

/**
 * useExecuteTab Hook
 * 管理领料出库页面的所有状态和业务逻辑
 */
export function useExecuteTab(materialData: MaterialReceivingRecord[]): UseExecuteTabReturn {
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
  const [executeEditForm, setExecuteEditForm] = useState<ExecuteEditFormState>({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 新增表单状态
  const [executeAddForm, setExecuteAddForm] = useState<ExecuteAddFormState>({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 领料出库页面过滤后的数据
  const executeFilteredData = useMemo(() => {
    return materialExecuteDetails.filter(item => {
      if (executeSearchCode && !item.code.toLowerCase().includes(executeSearchCode.toLowerCase())) return false;
      if (executeSearchApplicant && !item.applicant.toLowerCase().includes(executeSearchApplicant.toLowerCase())) return false;
      if (executeSearchBatchCode && !item.productionBatchCode.toLowerCase().includes(executeSearchBatchCode.toLowerCase())) return false;
      if (executeSearchWarehouse && !item.warehouseLocation.toLowerCase().includes(executeSearchWarehouse.toLowerCase())) return false;
      if (executeStatusFilter !== 'all' && item.executeStatus !== executeStatusFilter) return false;
      return true;
    });
  }, [executeSearchCode, executeSearchApplicant, executeSearchBatchCode, executeSearchWarehouse, executeStatusFilter]);

  const executeTotalPages = Math.ceil(executeFilteredData.length / executePageSize);

  // 重置搜索
  const handleExecuteReset = useCallback(() => {
    setExecuteSearchCode('');
    setExecuteSearchApplicant('');
    setExecuteSearchBatchCode('');
    setExecuteSearchWarehouse('');
    setExecuteStatusFilter('all');
    setExecuteCurrentPage(1);
  }, []);

  // 展开/折叠行
  const toggleExecuteExpandRow = useCallback((id: number) => {
    setExecuteExpandedRows(prev => {
      const newExpandedRows = new Set(prev);
      if (newExpandedRows.has(id)) {
        newExpandedRows.delete(id);
      } else {
        newExpandedRows.add(id);
      }
      return newExpandedRows;
    });
  }, []);

  // 领料出库页面全选
  const handleExecuteSelectAll = useCallback(() => {
    if (executeSelectedRows.length === executeFilteredData.length) {
      setExecuteSelectedRows([]);
    } else {
      setExecuteSelectedRows(executeFilteredData.map(item => item.id));
    }
  }, [executeSelectedRows, executeFilteredData]);

  // 领料出库页面选择单行
  const handleExecuteSelectRow = useCallback((id: number) => {
    if (executeSelectedRows.includes(id)) {
      setExecuteSelectedRows(executeSelectedRows.filter(rowId => rowId !== id));
    } else {
      setExecuteSelectedRows([...executeSelectedRows, id]);
    }
  }, [executeSelectedRows]);

  // 领料出库页面导出
  const handleExecuteExportClick = useCallback(() => {
    setExecuteShowExportTypeModal(true);
  }, []);

  const confirmExecuteExport = useCallback(async () => {
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
  }, [executeSelectedRows, executeExportFileType]);

  // 领料出库页面取消导出
  const handleExecuteCancelExport = useCallback(() => {
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  }, []);

  // 领料出库页面查看详情
  const handleExecuteView = useCallback((item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
  }, []);

  // 领料出库页面新增
  const handleExecuteAdd = useCallback(() => {
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
  }, []);

  // 添加选中物料到物料池
  const handleAddToMaterialPool = useCallback(() => {
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
  }, [executeSelectedApplicationCode, executeSelectedMaterialIndices, executeMaterialActualQuantities, executeMaterialPool]);

  // 从物料池移除物料
  const handleRemoveFromMaterialPool = useCallback((index: number) => {
    setExecuteMaterialPool(executeMaterialPool.filter((_, i) => i !== index));
  }, [executeMaterialPool]);

  // 更新物料池中物料的实发数量
  const handleUpdateMaterialPoolQuantity = useCallback((index: number, actualQuantity: number) => {
    const updatedPool = [...executeMaterialPool];
    updatedPool[index] = {
      ...updatedPool[index],
      actualQuantity: actualQuantity,
      remark: actualQuantity === updatedPool[index].requestedQuantity ? '正常出库' : '部分出库'
    };
    setExecuteMaterialPool(updatedPool);
  }, [executeMaterialPool]);

  // 领料出库页面编辑
  const handleExecuteEdit = useCallback((item: typeof materialExecuteDetails[0]) => {
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
  }, []);

  // 领料出库页面删除
  const handleExecuteDeleteClick = useCallback((id: number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  }, []);

  const confirmExecuteDelete = useCallback(() => {
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  }, []);

  const handleExecuteSaveEdit = useCallback(() => {
    setExecuteShowEditModal(false);
    alert('保存成功');
  }, []);

  const handleExecuteSaveAdd = useCallback(() => {
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
  }, [executeMaterialPool, executeAddForm]);

  const handleExecuteCancelAdd = useCallback(() => {
    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
  }, []);

  const handleExecuteCancelEdit = useCallback(() => {
    setExecuteShowEditModal(false);
  }, []);

  const handleExecuteCancelDetail = useCallback(() => {
    setExecuteShowDetailModal(false);
  }, []);

  const handleExecuteEditAddMaterial = useCallback(() => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: [
        ...executeEditForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  }, [executeEditForm]);

  const handleExecuteEditRemoveMaterial = useCallback((index: number) => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: executeEditForm.materials.filter((_, i) => i !== index)
    });
  }, [executeEditForm]);

  const handleExecuteEditMaterialChange = useCallback((index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeEditForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteEditForm({ ...executeEditForm, materials: newMaterials });
  }, [executeEditForm]);

  const handleExecuteAddAddMaterial = useCallback(() => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: [
        ...executeAddForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  }, [executeAddForm]);

  const handleExecuteAddRemoveMaterial = useCallback((index: number) => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: executeAddForm.materials.filter((_, i) => i !== index)
    });
  }, [executeAddForm]);

  const handleExecuteAddMaterialChange = useCallback((index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeAddForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteAddForm({ ...executeAddForm, materials: newMaterials });
  }, [executeAddForm]);

  return {
    // Props 数据
    materialData,

    // 搜索状态
    executeSearchCode,
    setExecuteSearchCode,
    executeSearchApplicant,
    setExecuteSearchApplicant,
    executeSearchBatchCode,
    setExecuteSearchBatchCode,
    executeSearchWarehouse,
    setExecuteSearchWarehouse,
    executeStatusFilter,
    setExecuteStatusFilter,

    // 分页状态
    executeCurrentPage,
    setExecuteCurrentPage,
    executePageSize,
    setExecutePageSize,

    // 导出模式状态
    executeExportMode,
    setExecuteExportMode,
    executeSelectedRows,
    setExecuteSelectedRows,
    executeShowExportTypeModal,
    setExecuteShowExportTypeModal,
    executeExportFileType,
    setExecuteExportFileType,

    // 详情/编辑/新增弹窗状态
    executeShowDetailModal,
    setExecuteShowDetailModal,
    executeShowEditModal,
    setExecuteShowEditModal,
    executeShowDeleteConfirm,
    setExecuteShowDeleteConfirm,
    executeShowAddModal,
    setExecuteShowAddModal,
    executeSelectedRecord,
    setExecuteSelectedRecord,
    executeDeletingId,
    setExecuteDeletingId,

    // 展开行状态
    executeExpandedRows,
    toggleExecuteExpandRow,

    // 批量编辑模式状态
    executeBatchEditMode,
    setExecuteBatchEditMode,
    executeShowBatchEditModal,
    setExecuteShowBatchEditModal,
    executeShowBatchDeleteConfirm,
    setExecuteShowBatchDeleteConfirm,
    executeShowEditWarning,
    setExecuteShowEditWarning,
    executeShowDeleteWarning,
    setExecuteShowDeleteWarning,
    executeBatchEditedRecords,
    setExecuteBatchEditedRecords,
    executeCurrentBatchEditIndex,
    setExecuteCurrentBatchEditIndex,

    // 物料池状态
    executeSelectedApplicationCode,
    setExecuteSelectedApplicationCode,
    executeSelectedMaterialIndices,
    setExecuteSelectedMaterialIndices,
    executeMaterialActualQuantities,
    setExecuteMaterialActualQuantities,
    executeMaterialPool,
    setExecuteMaterialPool,

    // 编辑表单状态
    executeEditForm,
    setExecuteEditForm,

    // 新增表单状态
    executeAddForm,
    setExecuteAddForm,

    // 过滤后的数据
    executeFilteredData,
    executeTotalPages,

    // 处理函数
    handleExecuteReset,
    handleExecuteSelectAll,
    handleExecuteSelectRow,
    handleExecuteExportClick,
    confirmExecuteExport,
    handleExecuteCancelExport,
    handleExecuteView,
    handleExecuteAdd,
    handleAddToMaterialPool,
    handleRemoveFromMaterialPool,
    handleUpdateMaterialPoolQuantity,
    handleExecuteEdit,
    handleExecuteDeleteClick,
    confirmExecuteDelete,
    handleExecuteSaveEdit,
    handleExecuteSaveAdd,
    handleExecuteCancelAdd,
    handleExecuteCancelEdit,
    handleExecuteCancelDetail,
    handleExecuteEditAddMaterial,
    handleExecuteEditRemoveMaterial,
    handleExecuteEditMaterialChange,
    handleExecuteAddAddMaterial,
    handleExecuteAddRemoveMaterial,
    handleExecuteAddMaterialChange,
  };
}
