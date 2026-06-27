/**
 * 种源管理主页面
 * 功能：种源列表展示、筛选、新增、编辑、删除、标签打印、图片查看、导出Excel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Package, Download } from 'lucide-react';
import { SeedSourceFilter } from './components/SeedSourceFilter';
import { SeedSourceTable } from './components/SeedSourceTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { todayLocal } from '@/lib/dateUtils';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { InventoryTransferPanel } from './modals/InventoryTransferPanel';
import { SeedSourceReturnModal } from './modals/SeedSourceReturnModal';
import { SeedSourceInboundModal } from './modals/SeedSourceInboundModal';

import { seedSourceTransferService } from '@/services/seedSourceTransferService';
import { Button, DeleteConfirmModal, UnifiedModal } from '../../../components/ui';
import {
  cropCategories,
  suppliers,
  units,
  seedSourceStatusOptions
} from '../../../data/cropData';
import { SeedSource, SeedSourceFilters, StockStatus, SourceType } from '../../../types/crop';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSeedSourceStore } from '../../../stores/useSeedSourceStore';
import { useToastStore } from '../../../stores/useToastStore';
import { computeStockStatus } from '../../../lib/stockStatus';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { useFilteredSeedSources } from '@/hooks/useFilteredSeedSources';
import { useInventoryInboundStore } from '@/stores/useInventoryInboundStore';
import { InventoryInboundModal } from '../inventory/InventoryInboundModal';
import type { InventoryInboundRecord } from '@/types/inventoryInbound';
// 2026-06-04: 移除 RefreshCw import（重算按钮已删除）

export default function SeedSourcePage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 种源模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;
  const canPrint = true;

  // 从 Zustand Store 获取种源数据和操作方法
  const {
    items: seedSources,
    isLoading,
    loadItems,
    deleteItems,
    checkDeletable,
    endSeedSource,
    error: storeError,
    clearError,
  } = useSeedSourceStore();

  // Toast 通知
  const toast = useToastStore((s) => s.toast);
  // 2026-06-25 v3: 获取当前用户信息（用于调拨操作的操作人记录）
  const authCurrentUser = useAuthStore((s) => s.currentUser);
  const currentUser = authCurrentUser
    ? { id: authCurrentUser.oid, name: authCurrentUser.realName || authCurrentUser.username || '' }
    : null;

  // 状态
  const [filters, setFilters] = useState<SeedSourceFilters>({
    cropCategory: '',
    cropName: '',
    seedCode: '',
    sourceType: '',
    supplierName: '',
    startDate: '',
    endDate: '',
    status: '',
    createBy: '',
    cropType: '',
    orgId: '',
    recorderId: '',
    surplusMin: undefined,
    surplusMax: undefined,
    propagationType: undefined,
    propagationStatus: undefined
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 组件挂载时加载数据
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 2026-06-26 修复：种源列表加载完后，自动为每条种源拉取入库记录
  // 之前只在用户点"入库登记"时才拉，子表一直显示 0 条
  const items = useSeedSourceStore((s) => s.items);

  useEffect(() => {
    if (!items || items.length === 0) return;
    // 当前页可见的种源都拉一次（limit 通常 10-20，并发安全）
    const currentPageItems = items.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize,
    );
    currentPageItems.forEach((it) => {
      void loadInboundRecords(`seed_source:${it.id}`, {
        sourceModule: 'seed_source',
        sourceId: it.id,
        limit: 100,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pagination.current, pagination.pageSize]);

  // 2026-06-06: R3 — 监听 store.loadItems 错误并弹 Toast（不修改 store 内部实现）
  // store 内部已在 catch 中 set({ error: msg })，此处仅做 UI 展示
  // 用 useRef 记录上次已展示的错误，避免同一错误重复弹 toast
  const lastShownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (storeError && storeError !== lastShownErrorRef.current) {
      lastShownErrorRef.current = storeError;
      toast.error(`加载种源数据失败：${storeError}`);
      clearError();
    }
  }, [storeError, toast, clearError]);

  // 2026-06-04: status 改为实时计算，移除静默重算 useEffect（不再需要）

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SeedSource | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);
  // 2026-06-09 删除警告弹窗（与技术方案/作物库存/出库记录/施肥管理/病虫害管理统一用 UI 库 DeleteConfirmModal）
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 2026-06-06: 合并 3 个独立 state 为 BatchOpState discriminated union
  // 原 operationMode + exportMode(bool) + printMode(bool) → 一个 state 决定 5 种批量操作模式
  type BatchOpState =
    | { mode: 'normal' }
    | { mode: 'edit' }
    | { mode: 'delete' }
    | { mode: 'export' }
    | { mode: 'print' };
  const [batchOp, setBatchOp] = useState<BatchOpState>({ mode: 'normal' });

  // 派生标志（供 SeedSourceTable 保持向后兼容的 props 形态）
  const operationMode = batchOp.mode === 'edit' || batchOp.mode === 'delete' ? batchOp.mode : 'normal';
  const exportMode = batchOp.mode === 'export';
  const printMode = batchOp.mode === 'print';

  // 打印记录（待打印队列）
  const [printRecords, setPrintRecords] = useState<SeedSource[]>([]);

  // 2026-06-25 v3: 种源是纯仓库 — 移除繁殖过程/阶段推进/回流记录弹窗
  // 2026-06-18: 任务 4 — 入库登记弹窗状态 + 入库记录子表数据
  const [inboundModal, setInboundModal] = useState<{ open: boolean; record: SeedSource | null }>({
    open: false,
    record: null,
  });
  const inboundRecordsMap = useInventoryInboundStore((s) => s.recordsBySource);
  const loadInboundRecords = useInventoryInboundStore((s) => s.loadRecords);

  // 把 recordsBySource flat 成数组（按 createTime 倒序）
  const allInboundRecords: InventoryInboundRecord[] = Object.values(inboundRecordsMap)
    .flat()
    .sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));

  // 留种初始化数据（从种植页面跳转来）
  const [seedSavingInit, setSeedSavingInit] = useState<{
    linkedPlantingId?: string;
    linkedPlantingCode?: string;
    cropName?: string;
  } | null>(null);

  // 处理从种植页面跳转来的留种请求
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'seed-saving') {
      const plantingId = params.get('plantingId') || '';
      const plantingCode = params.get('plantingCode') || '';
      const cropName = params.get('cropName') || '';
      setSeedSavingInit({ linkedPlantingId: plantingId, linkedPlantingCode: plantingCode, cropName });
      setAddModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 2026-06-06: M3 — 12 项过滤逻辑下沉到 useFilteredSeedSources Hook
  const filteredData = useFilteredSeedSources(seedSources, filters);

  // 2026-06-05: 顶部统计卡片已删除（user 要求）

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  // 处理重置
  const handleReset = () => {
    setFilters({
      cropCategory: '',
      cropName: '',
      seedCode: '',
      sourceType: '',
      supplierName: '',
      startDate: '',
      endDate: '',
      status: '',
      createBy: '',
      cropType: '',
      orgId: '',
      recorderId: '',
      surplusMin: undefined,
      surplusMax: undefined,
      propagationType: undefined,
      propagationStatus: undefined
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 2026-06-04: handleRecalculateStatus 已删除，status 改为实时计算，无需手动重算

  // 处理新增
  const handleAdd = () => {
    setCurrentRecord(null);
    setAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (record: SeedSource) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  // 处理详情
  const handleDetail = (record: SeedSource) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  // 处理打印
  const handlePrint = (record: SeedSource) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  // 处理图片放大
  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  // 2026-06-09 改造：单条/批量删除入口（仅弹 DeleteConfirmModal，不再直接删除）
  // 删除前引用检查 + Store action 在 handleDeleteConfirm 里执行
  const handleDelete = useCallback((ids: string[]) => {
    setSelectedIdsFromCaller(ids);
  }, []);

  // 弹窗回调：真正执行删除（含引用检查）
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...selectedRows];
    if (ids.length === 0) return;
    setShowDeleteModal(false);
    // 1. 删除前检查关联引用（保留原 checkDeletable 业务）
    for (const id of ids) {
      try {
        const res = await checkDeletable(id);
        if (!res.deletable && res.references.length) {
          // 2026-06-19: 按模块分组展示，便于用户快速定位"哪个页面引用了"
          const groupedByModule: Record<string, typeof res.references> = {};
          res.references.forEach((r) => {
            if (!groupedByModule[r.module]) groupedByModule[r.module] = [];
            groupedByModule[r.module].push(r);
          });

          const sections: string[] = [];
          Object.entries(groupedByModule).forEach(([moduleName, refs]) => {
            sections.push(`【${moduleName}】共 ${refs.length} 条：`);
            refs.slice(0, 5).forEach((r) => {
              const parts: string[] = [];
              // 优先显示 targetCode（种植批号），其次 code（CIRC 内部 ID）
              const target = (r as any).targetCode || (r as any).targetId;
              if (target) {
                parts.push(`「${target}」`);
              } else {
                parts.push(`「${r.code}」`);
              }
              if (r.cropName) parts.push(r.cropName);
              if (r.cropVariety && r.cropVariety !== r.cropName) parts.push(r.cropVariety);
              if (r.date) parts.push(r.date);
              if (r.status) parts.push(r.status);
              sections.push('  • ' + parts.join(' · '));
            });
            if (refs.length > 5) sections.push(`  …及其他 ${refs.length - 5} 条`);
          });

          await showAlert(
            `该种源被 ${res.references.length} 条关联记录引用，无法删除：\n\n${sections.join('\n')}\n\n请先到对应模块（如种植管理 / 育苗管理）处理关联后再删除。`
          );
          return;
        }
      } catch (e: any) {
        // 2026-06-06: R4 — 检查失败不阻止删除，仅暴露错误给 UI
        const msg = e?.message || String(e);
        toast.error(`检查种源引用失败：${msg}`);
      }
    }
    // 2. 调 Store action 删除
    try {
      await deleteItems(ids);
      setSelectedRows([]);
    } catch (e: any) {
      await showAlert(`删除失败：${e?.message || String(e)}`);
    }
  }, [selectedRows, checkDeletable, deleteItems, showAlert, toast]);

  // 弹窗入口：单条删除走 handleDelete(ids: [id])；
  // setSelectedIdsFromCaller 包装 setSelectedRows 同步弹模态
  const setSelectedIdsFromCaller = useCallback((ids: string[]) => {
    setSelectedRows(ids);
    setShowDeleteModal(true);
  }, []);

  // 处理批量删除（兼容老入口，校验后弹模态）
  const handleBatchDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择要删除的记录');
      return;
    }
    setShowDeleteModal(true);
  }, [selectedRows, toast]);

  // 2026-06-25 v3: 种源是纯仓库 — 移除 handleEnd（正常/异常结束）

  // 导出相关处理
  const handleExportClick = () => {
    setBatchOp({ mode: 'export' });
    setSelectedRows([]);
  };

  const handleExportSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleExportCancel = () => {
    setBatchOp({ mode: 'normal' });
    setSelectedRows([]);
  };

  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 确认打印
  const handlePrintConfirm = (records: SeedSource[]) => {
    if (records.length === 0) {
      showAlert('请先选择要打印的记录');
      return;
    }
    setPrintRecords(records);
    setCurrentRecord(records[0]);
    setPrintModalOpen(true);
    setBatchOp({ mode: 'normal' });
    setSelectedRows([]);
  };

  // 2026-06-25 v3: 种源是纯仓库 — 移除 handlePropagationRecord / handleCirculation
  // 2026-06-25 v3: handleTransfer（调拨入库 append_existing 模式）— 弹 InventoryTransferPanel
  const [transferModal, setTransferModal] = useState<{ open: boolean; record: SeedSource | null }>({
    open: false,
    record: null,
  });
  const handleTransfer = (record: SeedSource) => {
    setTransferModal({ open: true, record });
  };

  // 2026-06-26 Q1: handleReturn（退库到原库存 1:1 关联）— 弹 SeedSourceReturnModal
  const [returnModal, setReturnModal] = useState<{ open: boolean; record: SeedSource | null }>({
    open: false,
    record: null,
  });
  const handleReturn = (record: SeedSource) => {
    setReturnModal({ open: true, record });
  };
  const handleReturnClose = useCallback(() => {
    setReturnModal({ open: false, record: null });
  }, []);
  const handleReturnConfirm = useCallback(
    async (items: Array<{ inboundRecordId: string; quantity: number; unit: string }>) => {
      const record = returnModal.record;
      if (!record) return;
      try {
        const result = await seedSourceTransferService.returnToInventory({
          targetSeedSourceId: record.id,
          items,
          operator: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
        });
        toast.success(
          `退库成功：退回 ${result.returnedCount} ${record.unit}，剩余可用 ${result.newSourceRemaining}`,
        );
        handleReturnClose();
        await loadItems();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await showAlert(`退库失败：${msg}`);
      }
    },
    [returnModal.record, currentUser, loadItems, toast],
  );

  // 关闭调拨弹窗
  const handleTransferClose = useCallback(() => {
    setTransferModal({ open: false, record: null });
  }, []);

  // 调拨确认 — appendToExistingSeedSource
  const handleTransferConfirm = useCallback(
    async (items: Array<{ sourceStockId: string; transferQuantity: number; unit: string }>) => {
      const record = transferModal.record;
      if (!record) return;
      try {
        const result = await seedSourceTransferService.appendToExistingSeedSource({
          targetSeedSourceId: record.id,
          items,
          operator: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
        });
        toast.success(
          `调拨成功：追加 ${result.appendedCount} ${record.unit}，当前可用 ${result.newAvailableCount}`
        );
        handleTransferClose();
        await loadItems();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await showAlert(`调拨失败：${msg}`);
      }
    },
    [transferModal.record, currentUser, loadItems, toast]
  );

  // 2026-06-18: 任务 4 — 入库登记入口 + 加载/导出辅助
  const handleInbound = (record: SeedSource) => {
    setInboundModal({ open: true, record });
    // 打开弹窗时拉取该种源的入库记录（key 与 store 保持一致）
    void loadInboundRecords(`seed_source:${record.id}`, {
      sourceModule: 'seed_source',
      sourceId: record.id,
      limit: 100,
    });
  };

  // 弹窗提交成功后刷新该种源数据 + 入库记录子表
  // 2026-06-26 修复：之前漏调 loadItems()，种源列表的入库数量/剩余数量不会更新
  const handleInboundSuccess = () => {
    const rec = inboundModal.record;
    if (!rec) return;
    void loadItems();  // 刷新种源列表（入库数量 + 剩余数量）
    void loadInboundRecords(`seed_source:${rec.id}`, {
      sourceModule: 'seed_source',
      sourceId: rec.id,
      limit: 100,
    });
    toast.success('入库成功');
  };

  // CSV 导出（UTF-8 BOM 防 Excel 乱码）
  const exportInboundCSV = () => {
    if (allInboundRecords.length === 0) {
      showAlert('没有入库记录可导出');
      return
    }
    const headers = ['入库日期', '来源编码', '来源模块', '仓库', '数量', '单位', '品质', '操作员', '备注']
    const rows = allInboundRecords.map((r) => [
      r.recordDate,
      r.sourceCode || r.sourceId,
      r.sourceModule,
      r.warehouseName || r.warehouseId || '',
      r.quantity.toString(),
      r.unit,
      r.qualityGrade || '',
      r.operatorName || r.createBy || '',
      r.notes || '',
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `种源入库记录_${todayLocal()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 2026-06-25 v3: 移除 handlePropagationStage（阶段推进功能）

  const handleConfirmExport = async () => {
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头（含图片列）
    // 2026-06-06: L7 对齐表格列名 — 表格「作物品种」实际为 cropVariety||cropName，拆为「最细化」+「细分品种」两列
    const headers = ['种源图片', '种源批号', '种源类型', '作物类别', '作物品种（最细化）', '作物品种（细分品种）', '品种路径', '供应商', '采购日期', '采购数量', '单位', '单价(元)', '总金额(元)', '初始数量', '可用数量', '库存状态', '溯源码', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '种源图片': (record.pictures && record.pictures.length > 0) ? record.pictures[0] : '',
      '种源批号': record.seedCode,
      '种源类型': record.sourceType === SourceType.SEED ? '种子' :
                  record.sourceType === SourceType.SEEDLING ? '种苗/实生苗' :
                  record.sourceType === SourceType.CUTTING ? '扦插苗' :
                  record.sourceType === SourceType.GRAFTING ? '嫁接苗' :
                  record.sourceType === SourceType.TISSUE_CULTURE ? '组培苗' :
                  record.sourceType === SourceType.SPLIT ? '分株苗' :
                  record.sourceType === SourceType.BULB ? '种球/球根' :
                  record.sourceType === SourceType.SELF_PRODUCED ? '自繁苗' :
                  record.sourceType === SourceType.EXTERNAL ? '外购苗' : '其他',
      '作物类别': record.cropCategory,
      // 2026-06-06: L7 对齐表格列名 — 表格列「作物品种」实际显示 cropVariety||cropName（最细分）
      '作物品种（最细化）': record.cropName,
      '作物品种（细分品种）': record.cropVariety,
      '供应商': record.supplierName,
      '采购日期': record.purchaseDate,
      '采购数量': record.quantity,
      '单位': record.unit,
      '单价(元)': record.unitPrice,
      '总金额(元)': record.totalAmount,
      '初始数量': record.initialCount,
      '可用数量': record.availableCount,
      '库存状态': (() => {
        // 2026-06-04: 实时计算 status
        const live = computeStockStatus(record.availableCount, record.initialCount);
        return live === StockStatus.SUFFICIENT ? '充足' : live === StockStatus.LOW ? '不足' : '耗尽';
      })(),
      '溯源码': record.traceabilityCode || '',
      '创建人': record.createBy,
      '创建时间': record.createTime,
      '备注': record.remarks || ''
    }));

    const fileName = `种源管理_${todayLocal()}.${exportFormat}`;

    try {
      if (exportFormat === 'xlsx') {
        // 使用 SheetJS 导出 xlsx（含图片列）
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        // 设置图片列宽约 240px (30字符) + 行高
        ws['!cols'] = headers.map((h, i) => {
          if (h === '种源图片') return { wch: 30 }; // 图片列宽
          if (h === '备注') return { wch: 25 };
          return { wch: 15 };
        });
        XLSX.utils.book_append_sheet(wb, ws, '种源记录');
        XLSX.writeFile(wb, fileName);

        // 如果有图片数据，尝试嵌入base64图片（xlsx原生图片支持）
        selectedData.forEach((record, rowIdx) => {
          if (record.pictures && record.pictures.length > 0) {
            const imgData = record.pictures[0];
            if (imgData.startsWith('data:image/')) {
              try {
                // 将base64图片嵌入到单元格（通过xlsx cell comment方式存储URL）
                const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 0 });
                if (ws[cellRef]) {
                  ws[cellRef].l = { Target: imgData }; // 存储为超链接
                }
              } catch { /* 图片嵌入失败不影响导出 */ }
            }
          }
        });
      } else if (exportFormat === 'csv') {
        const content = headers.join(',') + '\n' + exportData.map(row =>
          headers.map(h => `"${typeof row[h] === 'string' ? row[h].replace(/"/g, '""') : row[h] || ''}"`).join(',')
        ).join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('xlsx', 'xls');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // logger.error('Export failed:', err);
      // 降级：xls格式
      const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `种源管理_${todayLocal()}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setBatchOp({ mode: 'normal' });
    setSelectedRows([]);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">种源管理</h1>
              <p className="text-gray-500">管理种源批次、采购入库和库存记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2026-06-05: 顶部统计卡片已删除（user 要求） */}

      {/* 2026-06-04: 移除重算库存状态按钮，status 改为实时计算无需手动重算 */}

      {/* 2026-06-24: 新流程说明 banner — 引导用户从种植/育苗走 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 mb-3">
        <span className="font-medium">新流程说明：</span>
        种源管理为内部仓库，仅支持 <b>外购入库</b> 与 <b>库存调拨</b>。
        自有种源请通过「种植管理 / 育苗管理 → 行级采收入库」入作物库存后，再调拨到此处。
      </div>

      <SeedSourceFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        cropCategories={cropCategories}
        suppliers={suppliers}
        statusOptions={seedSourceStatusOptions}
      />

      {/* 数据表格 */}
      <SeedSourceTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onAdd={handleAdd}
        operationMode={operationMode}
        onOperationModeChange={(m) => setBatchOp({ mode: m })}
        exportMode={exportMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
        printMode={printMode}
        onPrintModeChange={(v) => setBatchOp({ mode: v ? 'print' : 'normal' })}
        onConfirmPrint={handlePrintConfirm}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        canPrint={canPrint}
        onTransfer={handleTransfer}
        onReturn={handleReturn}
        onInbound={handleInbound}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSeedSavingInit(null); }}
        onSuccess={() => { loadItems(); setSeedSavingInit(null); }}
        units={units}
        seedSavingInit={seedSavingInit}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
          suppliers={suppliers}
        />
      )}

      {currentRecord && (
        <DetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <PrintLabelModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          record={currentRecord}
        />
      )}

      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={currentImages}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />

      {/* 繁殖途径弹窗 */}
      {/* 2026-06-25 v3: 移除 3 个 Modal — 繁殖过程记录 / 阶段推进 / 回流记录 */}

      {/* 2026-06-26: 重构 — 替换 UnifiedRowHarvestInboundModal 为 SeedSourceInboundModal（采购语义） */}
      {inboundModal.record && (
        <SeedSourceInboundModal
          isOpen={inboundModal.open}
          onClose={() => setInboundModal({ open: false, record: null })}
          onSuccess={handleInboundSuccess}
          sourceRecord={{
            id: inboundModal.record.id,
            code: inboundModal.record.seedCode,
            cropName: inboundModal.record.cropName || '',
            cropVariety: inboundModal.record.cropVariety || '',
            cropCode: inboundModal.record.cropCode || '',
            unit: inboundModal.record.unit,
          }}
        />
      )}

      {/* 2026-06-25 v3: 调拨入库弹窗（append_existing 模式 — 不创建新种源，追加到目标） */}
      {transferModal.record && (
        <UnifiedModal
          isOpen={transferModal.open}
          onClose={handleTransferClose}
          title={`调拨入库 - ${transferModal.record.seedCode}（追加模式）`}
          size="xl"
          showFooter={false}
        >
          <InventoryTransferPanel
            mode="append_existing"
            targetSeedSourceId={transferModal.record.id}
            targetCropName={transferModal.record.cropName}
            targetCropVariety={transferModal.record.cropVariety || transferModal.record.varietyName}
            onConfirm={handleTransferConfirm}
          />
        </UnifiedModal>
      )}

      {/* 2026-06-26 Q1: 退库弹窗（严格 1:1 关联原库存） */}
      {returnModal.record && (
        <UnifiedModal
          isOpen={returnModal.open}
          onClose={handleReturnClose}
          title={`退库 - ${returnModal.record.seedCode}（退回原作物库存）`}
          size="xl"
          showFooter={false}
        >
          <SeedSourceReturnModal
            targetSeedSourceId={returnModal.record.id}
            targetSeedSourceCode={returnModal.record.seedCode}
            onConfirm={handleReturnConfirm}
          />
        </UnifiedModal>
      )}

      {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案一致） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
