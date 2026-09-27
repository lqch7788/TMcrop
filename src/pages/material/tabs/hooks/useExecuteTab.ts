// useExecuteTab Hook
// 领料出库页面的状态管理和业务逻辑
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { MaterialReceivingRecord, ExecuteMaterialItem, MaterialExecuteRecord } from '@/types/materialReceiving';
import { useExecuteDataStore } from '@/stores/useExecuteDataStore';
import { useMaterialRequestDataStore } from '@/stores/useMaterialRequestDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { logger } from '@/lib/logger';
import { enhancedApiClient } from '@/lib/apiClient';
import { todayLocal } from '@/lib/dateUtils';
// 2026-09-26：batchDeduct/batchRestore 不再由前端调用（扣/恢复库存已下沉后端事务），fefoAllocate 仅用于物料池分配预览
import { fefoAllocate } from '@/services/apiWarehouseMaterialService';
import type { UseExecuteTabReturn, ExecuteEditFormState, ExecuteAddFormState } from '../types/executeTab.types';

/** 2026-09-27：出库单草稿 localStorage 键（与申请单草稿区分） */
const EXEC_DRAFT_KEY = 'me_exec_draft_v1';

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
  // 2026-09-27 能力对齐：详情弹窗的来源申请单执行情况
  const [executeDetailSources, setExecuteDetailSources] = useState<Record<string, unknown>[] | null>(null);
  // 2026-09-27 能力对齐：出库单草稿（localStorage，纯客户端草稿非数据缓存）
  const [executeHasDraft, setExecuteHasDraft] = useState(false);
  // 2026-09-27 能力对齐：快捷筛选（待出库 / 今日出库 / 我经手的）
  const [executePendingOnly, setExecutePendingOnly] = useState(false);
  const [executeTodayOnly, setExecuteTodayOnly] = useState(false);
  const [executeMineOnly, setExecuteMineOnly] = useState(false);
  // 当前登录用户（"我经手的"筛选用）
  const execCurrentUser = useAuthStore((s) => s.currentUser?.name || '');
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
  // 2026-09-27 审计方案：作废确认弹窗状态（已发料单据唯一撤销方式）
  const [executeShowVoidConfirm, setExecuteShowVoidConfirm] = useState(false);
  const [executeVoidTarget, setExecuteVoidTarget] = useState<MaterialExecuteRecord | null>(null);
  const [executeVoidReason, setExecuteVoidReason] = useState('');

  // 展开行状态
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());

  // 批量删除模式状态（2026-09-26：批量编辑已移除，编辑下放到行操作列）
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState<'edit' | 'delete' | null>(null);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
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
    productionBatchCode: '',
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
      // 2026-09-27 快捷筛选
      if (executePendingOnly && item.executeStatusClass !== 'pending_out') return false;
      if (executeTodayOnly && item.date !== todayLocal()) return false;
      if (executeMineOnly && execCurrentUser) {
        if (!String(item.operator || '').includes(execCurrentUser) && !String(item.applicant || '').includes(execCurrentUser)) return false;
      }
      return true;
    });
  }, [executeStore.items, executeSearchCode, executeSearchApplicant, executeSearchBatchCode, executeSearchWarehouse, executeStatusFilter, executePendingOnly, executeTodayOnly, executeMineOnly, execCurrentUser]);

  // ============================================
  // 2026-09-27 能力对齐：统计摘要（今日出库/待出库/本月实发金额/超发单）
  // ============================================
  const executeSummary = useMemo(() => {
    const today = todayLocal();
    const thisMonth = today.slice(0, 7);
    let todayCount = 0, pendingCount = 0, monthAmount = 0, overIssueCount = 0;
    for (const item of executeStore.items) {
      if (item.date === today) todayCount += 1;
      if (item.executeStatusClass === 'pending_out') pendingCount += 1;
      // 2026-09-27 审计修复：只统计已扣库存的单据（completed/partial）——
      // 此前把"待出库"计划量也算进"本月实发金额"，与卡片标签（实发）矛盾
      const cls = String((item as any).executeStatusClass || '');
      if ((cls === 'completed' || cls === 'partial') && String(item.date || '').startsWith(thisMonth)) {
        monthAmount += (item.materials || []).reduce((s: number, m: any) => s + (Number(m.actualQuantity) || 0) * (Number(m.unitPrice) || 0), 0);
      }
      // 超发：实发 > 申请（历史数据可能存在，新提交已被后端拦截）
      if ((item.materials || []).some((m: any) => (Number(m.actualQuantity) || 0) > (Number(m.requestedQuantity) || 0) && (Number(m.requestedQuantity) || 0) > 0)) {
        overIssueCount += 1;
      }
    }
    return { todayCount, pendingCount, monthAmount: Math.round(monthAmount * 100) / 100, overIssueCount };
  }, [executeStore.items]);

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
    // 2026-09-27 导出修正：预计算小计（此前缺该列）+ 单元格 HTML 转义（防注入）
    exportData.forEach((row) => {
      ((row as any).materials || []).forEach((m: any) => {
        m.subtotal = (((Number(m.actualQuantity) || 0) * (Number(m.unitPrice) || 0))).toFixed(2);
      });
    });
    const headers = ['出库单号', '日期', '申领人', '仓库地点', '审核人', '操作人', '执行状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'operator', 'executeStatus'];
    const materialHeaders = ['来源领料单号', '物料编码', '物料名称', '批次号', '规格', '单位', '申请数量', '实际库存', '本次实发', '单价(元)', '小计(元)', '仓库货位', '备注'];
    const materialFields = ['applicationCode', 'materialCode', 'materialName', 'batchNo', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'actualQuantity', 'unitPrice', 'subtotal', 'warehousePosition', 'remark'];

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
      // 2026-09-27 导出修正：改为真 XLSX（此前输出 HTML 伪表且扩展名写 .xls，Excel 打开报格式错）
      const aoa: any[][] = [];
      aoa.push([...headers, ...materialHeaders]);
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
      XLSX.utils.book_append_sheet(wb, ws, '领料出库');
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      content = new Uint8Array(xlsxBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else if (executeExportFileType === 'word') {
      // 2026-09-27：单元格 HTML 转义（此前未转义，物料名含 <script> 之类会注入）
      const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}${materialHeaders.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${esc((row as any)[f])}</td>`).join('')}${materialFields.map(f => `<td>${esc(mat[f])}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${esc(mat[f])}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${esc((row as any)[f])}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
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
  const handleExecuteView = useCallback(async (item: MaterialExecuteRecord) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
    // 2026-09-27 能力对齐：拉取来源申请单的出库执行情况（已领/申请/剩余）
    setExecuteDetailSources(null);
    const codes: string[] = (item as any).sourceApplicationCodes || [];
    if (codes.length === 0) return;
    try {
      const results = await Promise.all(
        codes.slice(0, 5).map((c) => enhancedApiClient.get<Record<string, unknown> | null>(`/material-requests/${c}/executions`))
      );
      setExecuteDetailSources(results.filter(Boolean) as Record<string, unknown>[]);
    } catch (e) {
      logger.warn('获取来源申请单执行情况失败', e);
    }
  }, []);

  // 2026-09-27 能力对齐：出库草稿（打开新增弹窗时检测 / 恢复 / 丢弃）
  const checkExecDraft = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(EXEC_DRAFT_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed?.form && (parsed.form.materialPool?.length > 0 || parsed.form.applicant));
    } catch { return false; }
  }, []);

  const restoreExecDraft = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(EXEC_DRAFT_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed?.form) {
        setExecuteAddForm(parsed.form.form || executeAddForm);
        if (Array.isArray(parsed.form.materialPool)) setExecuteMaterialPool(parsed.form.materialPool);
        return true;
      }
    } catch { /* 忽略 */ }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeAddForm]);

  const discardExecDraft = useCallback(() => {
    try { localStorage.removeItem(EXEC_DRAFT_KEY); } catch { /* 忽略 */ }
    setExecuteHasDraft(false);
  }, []);

  // 物料池/表单变化时自动存草稿（弹窗打开时，防抖 800ms）
  useEffect(() => {
    if (!executeShowAddModal) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(EXEC_DRAFT_KEY, JSON.stringify({
          form: { form: executeAddForm, materialPool: executeMaterialPool },
          savedAt: new Date().toISOString(),
        }));
      } catch { /* 忽略 */ }
    }, 800);
    return () => clearTimeout(t);
  }, [executeAddForm, executeMaterialPool, executeShowAddModal]);

  // 领料出库页面新增
  const handleExecuteAdd = useCallback(() => {
    // 打开时检测草稿
    try {
      const raw = localStorage.getItem(EXEC_DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      setExecuteHasDraft(!!(parsed?.form && (parsed.form.materialPool?.length > 0 || parsed.form.applicant)));
    } catch { setExecuteHasDraft(false); }
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

    // 2026-09-27 修复 P0：计算"已发数量"（与 AddModal 的 dispatchedMap 同口径），
    // 默认发料量改用"剩余可发量"——此前回退到 requestedQuantity（申请全额），
    // 部分已领的申请单会被默认超领（UI 显示剩余量、实际提交全额，两者不一致）
    // 2026-09-27 审计修复：排除已取消单（与 AddModal 口径一致，防剩余量偏小）
    const dispatchedMap: Record<string, number> = {};
    for (const exec of executeStore.items) {
      if ((exec as any).executeStatusClass === 'cancelled') continue;
      const srcList = (exec as any).sourceApplicationCodes || [];
      if (!srcList.includes(executeSelectedApplicationCode)) continue;
      for (const m of (exec.materials || [])) {
        const code = (m as any).materialCode || '';
        if (!code) continue;
        dispatchedMap[code] = (dispatchedMap[code] || 0) + (Number((m as any).actualQuantity) || 0);
      }
    }

    const newMaterials: ExecuteMaterialItem[] = Array.from(executeSelectedMaterialIndices).map(idx => {
      const material = selectedApp.materials[idx];
      const dispatched = dispatchedMap[material.materialCode] || 0;
      const remaining = Math.max(0, (material.requestedQuantity || 0) - dispatched);
      const actualQty = executeMaterialActualQuantities[idx] ?? remaining;
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
        // 2026-09-27：以"本次可发量(remaining)"为基准判断是否足额（此前对比申请全额，部分已领时误判）
        remark: actualQty >= remaining ? '正常出库' : '部分出库',
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
  }, [executeSelectedApplicationCode, executeSelectedMaterialIndices, executeMaterialActualQuantities, executeMaterialPool, materialRequestStore.items, executeStore.items]);

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

  // 领料出库页面编辑（2026-09-26：编辑入口下放到行操作列，点行内"编辑"按钮触发）
  const handleExecuteEdit = useCallback((item: MaterialExecuteRecord) => {
    // 2026-09-27 审计修复：放开"已完成不允许编辑"——编辑已完成单时后端按新旧明细
    // 差额调整库存（事务内，库存不足整体回滚），发错数量不再需要整单删除重建
    setExecuteSelectedRecord(item);
    setExecuteEditForm({
      date: item.date,
      applicant: item.applicant,
      warehouseLocation: item.warehouseLocation,
      reviewer: item.reviewer,
      operator: item.operator || '',
      executeStatus: item.executeStatus,
      productionBatchCode: item.productionBatchCode || '',
      materials: item.materials
    });
    setExecuteShowEditModal(true);
  }, []);

  // 领料出库页面删除
  const handleExecuteDeleteClick = useCallback((id: string | number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  }, []);

  // 2026-09-27 审计方案：reason 由删除确认弹窗 onConfirm(reason) 直接传入
  const confirmExecuteDelete = useCallback(async (reason: string) => {
    if (executeDeletingId === null) return;

    // 2026-09-26 P0 重构：删除前的库存恢复已下沉到后端 DELETE 事务
    // （此前前端先 batchRestore 再删，删除失败会"多恢复"库存；且 batchRestore 失败仅 console.warn）
    const ok = await executeStore.deleteItem(executeDeletingId, reason);
    if (ok) {
      // 删除后重新加载（触发 dispatch_status 重新计算）
      await executeStore.fetchItems();
      await materialRequestStore.loadItems();
    } else {
      await showAlert(executeStore.error || '删除失败，请重试');
    }
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  }, [executeDeletingId, executeStore, materialRequestStore]);

  /** 中文状态 → 状态类（2026-09-27：编辑弹窗状态与 class 必须联动，否则徽章与文字脱钩、禁编辑保护失效） */
  const statusClassOf = (status: string): string => {
    if (status === '已出库') return 'completed';
    if (status === '部分出库') return 'partial';
    if (status === '已取消') return 'cancelled';
    return 'pending_out';
  };

  const handleExecuteSaveEdit = useCallback(async () => {
    if (!executeSelectedRecord) return;
    // 2026-09-26 P0 修复：await 保存结果（此前 fire-and-forget 无条件提示"保存成功"），
    // 物料数量变化时后端在事务内做库存差额调整
    // 2026-09-27 修复：补传 executeStatusClass（状态联动）/ sourceApplicationCodes（派单状态重算）/
    //   productionBatchCode（此前是死输入，保存不提交）
    const ok = await executeStore.updateItem(executeSelectedRecord.id, {
      date: executeEditForm.date,
      applicant: executeEditForm.applicant,
      warehouseLocation: executeEditForm.warehouseLocation,
      reviewer: executeEditForm.reviewer,
      operator: executeEditForm.operator,
      executeStatus: executeEditForm.executeStatus,
      executeStatusClass: statusClassOf(executeEditForm.executeStatus),
      productionBatchCode: (executeEditForm as any).productionBatchCode || executeSelectedRecord.productionBatchCode || '',
      sourceApplicationCodes: executeSelectedRecord.sourceApplicationCodes || [],
      materials: executeEditForm.materials,
    } as any);
    if (!ok) {
      await showAlert(executeStore.error || '保存失败，请重试');
      return;
    }
    await executeStore.fetchItems();
    await materialRequestStore.loadItems();
    setExecuteShowEditModal(false);
    showAlert('保存成功');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeSelectedRecord, executeEditForm, executeStore]);

  /**
   * 确认发料（2026-09-27 两步出库）：待出库单 → 事务内扣库存 + 置为已出库/部分出库
   */
  const handleConfirmIssue = useCallback(async (item: MaterialExecuteRecord) => {
    const ok = await showConfirm(`确认对出库单 ${item.code} 发料吗？确认后将扣减库存。`);
    if (!ok) return;
    const success = await executeStore.confirmItem(item.id);
    if (!success) {
      await showAlert(executeStore.error || '确认发料失败，请重试');
      return;
    }
    await executeStore.fetchItems();
    await materialRequestStore.loadItems();
    await showAlert('已确认发料，库存已扣减');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeStore]);

  /**
   * 作废出库单（2026-09-27 审计方案：已发料单据禁止删除，改作废）
   * 作废后：库存按原明细恢复，单据本体保留（"已取消"筛选可查），追溯链不断裂。
   * 2026-09-27 修正：确认与原因输入内嵌弹窗（替代 showConfirm+window.prompt，
   * prompt 在 Electron/无头环境被拦截返回 null 会静默放弃操作）
   */
  const handleExecuteVoid = useCallback((item: MaterialExecuteRecord) => {
    setExecuteVoidTarget(item);
    setExecuteVoidReason('');
    setExecuteShowVoidConfirm(true);
  }, []);

  /** 确认作废（弹窗回传原因） */
  const confirmExecuteVoid = useCallback(async (reason: string) => {
    const item = executeVoidTarget;
    if (!item) return;
    const success = await executeStore.voidItem(item.id, reason);
    if (!success) {
      await showAlert(executeStore.error || '作废失败，请重试');
      return;
    }
    await executeStore.fetchItems();
    await materialRequestStore.loadItems();
    setExecuteShowVoidConfirm(false);
    setExecuteVoidTarget(null);
    await showAlert(`出库单 ${item.code} 已作废，库存已恢复`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeVoidTarget, executeStore, materialRequestStore]);

  const handleExecuteSaveAdd = useCallback(async () => {
    if (executeMaterialPool.length === 0) {
      showAlert('请先添加物料到物料池');
      return;
    }

    // 2026-09-26 P0 重构：FEFO 分配与库存扣减已下沉到后端 POST 事务
    // （此前前端分离调用 fefoAllocate + batchDeduct，扣减失败仅 console.warn，
    //   浏览器崩溃在"已建出库单、未扣库存"的中间态；batchNo 显示串由后端扣减时回写）

    const sourceAppCodes = [...new Set(executeMaterialPool.map(m => m.applicationCode))];
    const firstMaterial = executeMaterialPool[0];
    const sourceApp = materialRequestStore.items.find(app => app.code === firstMaterial.applicationCode);

    // 2026-09-27 两步出库（用户决策）：默认建"待出库"单（不扣库存），
    // 仓库在列表中点"确认发料"后才扣库存；勾选"直接出库"则一步直达（保留即时领料场景）
    const isPartial = executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity);
    const directIssue = (executeAddForm as any).directIssue === true;
    const newRecord = {
      id: Date.now(),
      code: executeAddForm.code || executeStore.generateCode(),
      date: executeAddForm.date,
      applicant: executeAddForm.applicant || sourceApp?.applicant || '',
      warehouseLocation: executeAddForm.warehouseLocation,
      reviewer: executeAddForm.reviewer || sourceApp?.reviewer || '',
      operator: executeAddForm.operator || '',
      productionBatchCode: executeAddForm.productionBatchCode || '',
      sourceApplicationCodes: sourceAppCodes,
      executeStatus: directIssue ? (isPartial ? '部分出库' : '已出库') : '待出库',
      executeStatusClass: directIssue ? (isPartial ? 'partial' : 'completed') : 'pending_out',
      materials: executeMaterialPool
    };

    // 保存到 Zustand Store（写操作走 Store action，V2.1 铁律：API 直连无缓存）
    const result = await executeStore.createItem(newRecord);
    if (!result) {
      // 2026-09-26 P0 修复：显示后端真实错误（如"物料 XX 批次库存不足"），不再笼统"请重试"
      await showAlert(executeStore.error || '出库失败，请重试');
      return;
    }

    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    // 2026-09-27：提交成功后清草稿
    try { localStorage.removeItem(EXEC_DRAFT_KEY); } catch { /* 忽略 */ }
    setExecuteHasDraft(false);
    setExecuteAddForm({
      code: '',
      date: todayLocal(),
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '',
      operator: '',
      materials: []
    });
    showAlert(directIssue ? '出库完成，库存已扣减' : '已建单（待出库），仓库确认发料后扣减库存');
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

    // 批量删除模式状态（2026-09-26：批量编辑已移除）
    executeBatchEditMode,
    setExecuteBatchEditMode,
    executeShowBatchDeleteConfirm,
    setExecuteShowBatchDeleteConfirm,
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

    // 2026-09-27 能力对齐：统计摘要 + 快捷筛选 + 详情来源申请单 + 草稿
    executeDetailSources,
    executeHasDraft,
    checkExecDraft,
    restoreExecDraft,
    discardExecDraft,
    executeSummary,
    executePendingOnly,
    setExecutePendingOnly,
    executeTodayOnly,
    setExecuteTodayOnly,
    executeMineOnly,
    setExecuteMineOnly,

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
    // 2026-09-27 审计方案：作废（已发料单据唯一撤销方式）
    handleExecuteVoid,
    // 2026-09-27 审计方案：作废确认弹窗状态与确认动作
    executeShowVoidConfirm,
    setExecuteShowVoidConfirm,
    executeVoidTarget,
    executeVoidReason,
    setExecuteVoidReason,
    confirmExecuteVoid,
    // 2026-09-27 两步出库：确认发料
    handleConfirmIssue,
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
