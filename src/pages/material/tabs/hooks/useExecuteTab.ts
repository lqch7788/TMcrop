// useExecuteTab Hook
// 领料出库页面的状态管理和业务逻辑
import { useState, useMemo, useCallback, useEffect } from 'react';
import { MaterialReceivingRecord, ExecuteMaterialItem, MaterialExecuteRecord } from '@/types/materialReceiving';
import { useExecuteDataStore } from '@/stores/useExecuteDataStore';
import { useMaterialRequestDataStore } from '@/stores/useMaterialRequestDataStore';
import { showAlert } from '@/lib/dialogService';
import { logger } from '@/lib/logger';
import { todayLocal } from '@/lib/dateUtils';
import { fefoAllocate, batchDeduct, batchRestore } from '@/services/apiWarehouseMaterialService';
import type { UseExecuteTabReturn, ExecuteEditFormState, ExecuteAddFormState } from '../types/executeTab.types';

/**
 * useExecuteTab Hook
 * 管理领料出库页面的所有状态和业务逻辑
 */
export function useExecuteTab(materialData: MaterialReceivingRecord[] = []): UseExecuteTabReturn {
  // 领料出库 Zustand Store
  const executeStore = useExecuteDataStore();
  // 领料申请单 Store（用于物料池选择来源申请单）
  const materialRequestStore = useMaterialRequestDataStore();

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
  const [executeSelectedRows, setExecuteSelectedRows] = useState<(string | number)[]>([]);
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');

  // 详情/编辑/新增弹窗状态
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<MaterialExecuteRecord | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);

  // 展开行状态
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());

  // 批量编辑模式状态
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState<'edit' | 'delete' | null>(null);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, MaterialExecuteRecord>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);

  // 物料池状态
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);
  // V14.0: FEFO 分配预览（materialCode → 分配方案）
  const [executeFefoMap, setExecuteFefoMap] = useState<Record<string, Array<{ batchNo: string; expiryDate: string; quantity: number; unit: string }>>>({});

  // 编辑表单状态
  const [executeEditForm, setExecuteEditForm] = useState<ExecuteEditFormState>({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    operator: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 新增表单状态
  const [executeAddForm, setExecuteAddForm] = useState<ExecuteAddFormState>({
    code: '',
    date: todayLocal(),
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    operator: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 挂载时从 API 加载出库数据
  useEffect(() => {
    executeStore.fetchItems();
    materialRequestStore.loadItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 领料出库页面过滤后的数据（从 Zustand Store 读取）
  const executeFilteredData = useMemo(() => {
    return executeStore.items.filter(item => {
      if (executeSearchCode && !item.code.toLowerCase().includes(executeSearchCode.toLowerCase())) return false;
      if (executeSearchApplicant && !item.applicant.toLowerCase().includes(executeSearchApplicant.toLowerCase())) return false;
      if (executeSearchBatchCode && !item.productionBatchCode.toLowerCase().includes(executeSearchBatchCode.toLowerCase())) return false;
      if (executeSearchWarehouse && !item.warehouseLocation.toLowerCase().includes(executeSearchWarehouse.toLowerCase())) return false;
      if (executeStatusFilter !== 'all' && item.executeStatus !== executeStatusFilter) return false;
      return true;
    });
  }, [executeStore.items, executeSearchCode, executeSearchApplicant, executeSearchBatchCode, executeSearchWarehouse, executeStatusFilter]);

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
  const handleExecuteSelectRow = useCallback((id: string | number) => {
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
    const exportData = executeStore.items.filter(item => executeSelectedRows.includes(item.id));
    const headers = ['出库单号', '日期', '申领人', '仓库地点', '审核人', '操作人', '执行状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'operator', 'executeStatus'];
    const materialHeaders = ['来源领料单号', '物料编码', '物料名称', '批次号', '规格', '单位', '申请数量', '实际库存', '本次实发', '单价(元)', '仓库货位', '备注'];
    const materialFields = ['applicationCode', 'materialCode', 'materialName', 'batchNo', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'actualQuantity', 'unitPrice', 'warehousePosition', 'remark'];

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

    const fileName = `领料出库_${todayLocal()}.${extension}`;

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
      logger.error('Export failed', err);
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
  const handleExecuteView = useCallback((item: MaterialExecuteRecord) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
  }, []);

  // 领料出库页面新增
  const handleExecuteAdd = useCallback(() => {
    const newCode = executeStore.generateCode();
    setExecuteAddForm({
      code: newCode,
      date: todayLocal(),
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '',
      operator: '',
      productionBatchCode: '',
      materials: []
    });
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteShowAddModal(true);
  }, [executeStore]);

  // 添加选中物料到物料池
  const handleAddToMaterialPool = useCallback(() => {
    if (!executeSelectedApplicationCode || executeSelectedMaterialIndices.size === 0) {
      showAlert('请先选择领料单并勾选要出库的物料');
      return;
    }
    const selectedApp = materialRequestStore.items.find(app => app.code === executeSelectedApplicationCode);
    if (!selectedApp) return;

    const newMaterials: ExecuteMaterialItem[] = Array.from(executeSelectedMaterialIndices).map(idx => {
      const material = selectedApp.materials[idx];
      const actualQty = executeMaterialActualQuantities[idx] ?? material.requestedQuantity;
      return {
        materialCode: material.materialCode,
        materialName: material.materialName,
        batchNo: (material as any).batchNo || '',
        spec: material.spec,
        unit: material.unit,
        category: material.category,
        requestedQuantity: material.requestedQuantity,
        stockQuantity: material.stockQuantity ?? 0,  // 2026-08-10 修复：保持原申请单的库存快照，不与 actualQuantity 混用
        actualQuantity: actualQty,
        remark: actualQty === material.requestedQuantity ? '正常出库' : '部分出库',
        applicationCode: executeSelectedApplicationCode
      };
    });

    setExecuteMaterialPool([...executeMaterialPool, ...newMaterials]);
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteSelectedApplicationCode('');

    // V14.0: 加入物料池时自动获取 FEFO 分配预览
    newMaterials.forEach(m => {
      if (m.actualQuantity > 0 && m.materialCode) {
        fefoAllocate(m.materialCode, m.actualQuantity).then(result => {
          if (result.allocations?.length > 0) {
            setExecuteFefoMap(prev => ({ ...prev, [m.materialCode]: result.allocations }));
          }
        }).catch(() => {});
      }
    });
  }, [executeSelectedApplicationCode, executeSelectedMaterialIndices, executeMaterialActualQuantities, executeMaterialPool, materialRequestStore.items]);

  // 从物料池移除物料
  const handleRemoveFromMaterialPool = useCallback((index: number) => {
    setExecuteMaterialPool(executeMaterialPool.filter((_, i) => i !== index));
  }, [executeMaterialPool]);

  // 更新物料池中物料的实发数量 + 自动 FEFO
  const handleUpdateMaterialPoolQuantity = useCallback(async (index: number, actualQuantity: number) => {
    const updatedPool = [...executeMaterialPool];
    updatedPool[index] = {
      ...updatedPool[index],
      actualQuantity: actualQuantity,
      remark: actualQuantity === updatedPool[index].requestedQuantity ? '正常出库' : '部分出库'
    };
    setExecuteMaterialPool(updatedPool);

    // V14.0: 实发数量变更时自动获取 FEFO 分配预览
    const material = updatedPool[index];
    if (actualQuantity > 0 && material.materialCode) {
      try {
        const result = await fefoAllocate(material.materialCode, actualQuantity);
        if (result.allocations && result.allocations.length > 0) {
          setExecuteFefoMap(prev => ({ ...prev, [material.materialCode]: result.allocations }));
          // 同时回填 batchNo 字段到物料池
          updatedPool[index] = {
            ...updatedPool[index],
            batchNo: result.allocations.map(a => `${a.batchNo}(${a.quantity}${a.unit})`).join(',')
          };
          setExecuteMaterialPool(updatedPool);
        }
      } catch {
        // FEFO 分配失败不影响主流程
      }
    }
  }, [executeMaterialPool]);

  // 领料出库页面编辑
  const handleExecuteEdit = useCallback((item: MaterialExecuteRecord) => {
    setExecuteSelectedRecord(item);
    setExecuteEditForm({
      date: item.date,
      applicant: item.applicant,
      warehouseLocation: item.warehouseLocation,
      reviewer: item.reviewer,
      operator: item.operator || '',
      executeStatus: item.executeStatus,
      materials: item.materials
    });
    setExecuteShowEditModal(true);
  }, []);

  // 领料出库页面删除
  const handleExecuteDeleteClick = useCallback((id: string | number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  }, []);

  const confirmExecuteDelete = useCallback(async () => {
    if (executeDeletingId === null) return;

    // 2026-08-10 P2修复：删除出库单前先恢复库存
    const record = executeStore.items.find(i => i.id === executeDeletingId);
    if (record?.materials?.length) {
      const restores: Array<{ materialCode: string; batchNo: string; quantity: number }> = [];
      for (const m of record.materials) {
        if (m.batchNo && m.actualQuantity > 0) {
          // 解析 batchNo 字符串 "BATCH001(5个),BATCH002(3袋)" → 逐条恢复
          const matches = m.batchNo.matchAll(/([^(,\s]+)\((\d+(?:\.\d+)?)/g);
          for (const match of matches) {
            restores.push({ materialCode: m.materialCode, batchNo: match[1], quantity: Number(match[2]) });
          }
          // 如果解析不到批次细分，用整条恢复
          if (restores.filter(r => r.materialCode === m.materialCode).length === 0) {
            restores.push({ materialCode: m.materialCode, batchNo: '', quantity: m.actualQuantity });
          }
        }
      }
      if (restores.length > 0) {
        try {
          await batchRestore(restores);
        } catch (e) {
          console.warn('库存恢复失败（不影响删除）:', e);
        }
      }
    }

    const ok = await executeStore.deleteItem(executeDeletingId);
    if (ok) {
      // 删除后重新加载（触发 dispatch_status 重新计算）
      await executeStore.fetchItems();
      await materialRequestStore.loadItems();
    }
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  }, [executeDeletingId, executeStore, materialRequestStore]);

  const handleExecuteSaveEdit = useCallback(() => {
    if (!executeSelectedRecord) return;
    executeStore.updateItem(executeSelectedRecord.id, {
      date: executeEditForm.date,
      applicant: executeEditForm.applicant,
      warehouseLocation: executeEditForm.warehouseLocation,
      reviewer: executeEditForm.reviewer,
      operator: executeEditForm.operator,
      executeStatus: executeEditForm.executeStatus,
      materials: executeEditForm.materials,
    } as any);
    setExecuteShowEditModal(false);
    showAlert('保存成功');
  }, [executeSelectedRecord, executeEditForm, executeStore]);

  const handleExecuteSaveAdd = useCallback(async () => {
    if (executeMaterialPool.length === 0) {
      showAlert('请先添加物料到物料池');
      return;
    }

    // V14.0: FEFO 自动分配批次（按过期日期先进先出）
    // 2026-08-10 P0修复：无批次记录的物料用空 batchNo 兜底，batch-deduct仍会扣减materials主表
    const fefoAllocations: Array<{ materialCode: string; batchNo: string; quantity: number }> = [];
    try {
      for (const m of executeMaterialPool) {
        if (m.actualQuantity > 0 && m.materialCode) {
          const result = await fefoAllocate(m.materialCode, m.actualQuantity);
          if (result.allocations.length > 0) {
            m.batchNo = result.allocations.map(a => `${a.batchNo}(${a.quantity}${a.unit})`).join(',');
            for (const alloc of result.allocations) {
              fefoAllocations.push({ materialCode: m.materialCode, batchNo: alloc.batchNo, quantity: alloc.quantity });
            }
          } else {
            // 无批次记录兜底：用空batchNo直接扣主表库存（batch-deduct在batchNo为空时跳过batch_inventory）
            fefoAllocations.push({ materialCode: m.materialCode, batchNo: '', quantity: m.actualQuantity });
          }
        }
      }
    } catch (e) {
      console.warn('FEFO 分配失败，继续出库:', e);
    }

    const sourceAppCodes = [...new Set(executeMaterialPool.map(m => m.applicationCode))];
    const firstMaterial = executeMaterialPool[0];
    const sourceApp = materialRequestStore.items.find(app => app.code === firstMaterial.applicationCode);

    const newRecord = {
      id: Date.now(),
      code: executeAddForm.code || executeStore.generateCode(),
      date: executeAddForm.date,
      applicant: executeAddForm.applicant || sourceApp?.applicant || '',
      warehouseLocation: executeAddForm.warehouseLocation,
      reviewer: executeAddForm.reviewer || sourceApp?.reviewer || '',
      operator: executeAddForm.operator || '',
      sourceApplicationCodes: sourceAppCodes,
      executeStatus: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? '部分出库' : '已出库' as string,
      executeStatusClass: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? 'partial' : 'completed' as string,
      materials: executeMaterialPool
    };

    // 保存到 Zustand Store（写操作走 Store action，V2.1 铁律：API 直连无缓存）
    const result = await executeStore.createItem(newRecord);
    if (!result) {
      showAlert('出库失败，请重试');
      return;
    }

    // V14.0: 扣减批次库存
    if (fefoAllocations.length > 0) {
      try {
        await batchDeduct(fefoAllocations);
      } catch (e) {
        console.warn('批次库存扣减失败（不影响出库记录）:', e);
      }
    }

    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteAddForm({
      code: '',
      date: todayLocal(),
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '',
      operator: '',
      materials: []
    });
    showAlert('新增成功');
  }, [executeMaterialPool, executeAddForm, executeStore, materialRequestStore.items]);

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
        { materialCode: '', materialName: '', batchNo: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
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
        { materialCode: '', materialName: '', batchNo: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
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
    // V14.0: FEFO 分配预览
    executeFefoMap,
    setExecuteFefoMap,

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
