/**
 * 种源管理主页面
 * 功能：种源列表展示、筛选、新增、编辑、删除、标签打印、图片查看、导出Excel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Package, Download } from 'lucide-react';
// 2026-07-14：移除 useNavigate import（入库汇总入口已删除）
import { SeedSourceFilter } from './components/SeedSourceFilter';
import { SeedSourceTable } from './components/SeedSourceTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-1：抽取公共导出函数（替代原内联 csv/xls 分支）
import { exportCsv, exportXlsx } from '@/services/exporters';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { InventoryTransferPanel } from './modals/InventoryTransferPanel';
import { SeedSourceReturnModal } from './modals/SeedSourceReturnModal';
import SeedSourceLabelManageModal from './modals/SeedSourceLabelManageModal';

import { seedSourceTransferService } from '@/services/seedSourceTransferService';
import { Button, DeleteConfirmModal, UnifiedModal } from '../../../components/ui';
import {
  cropCategories,
  suppliers,
  units,
  seedSourceStatusOptions
} from '../../../data/cropData';
import { SeedSource, SeedSourceFilters, StockStatus, SourceType } from '../../../types/crop';
// 2026-07-14：移除 cropBatchService/useAuthPermission 死 import（未使用）
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSeedSourceStore } from '../../../stores/useSeedSourceStore';
import { useToastStore } from '../../../stores/useToastStore';
import { computeStockStatus } from '../../../lib/stockStatus';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { useFilteredSeedSources } from '@/hooks/useFilteredSeedSources';

/**
 * 2026-07-14：5 种批量操作模式——normal/edit/delete/export/print（之前散在 3 个独立 state，合并为 discriminated union）
 * 提升到模块顶层避免每次组件 re-render 重建类型
 */
type BatchOpState =
  | { mode: 'normal' }
  | { mode: 'edit' }
  | { mode: 'delete' }
  | { mode: 'export' }
  | { mode: 'print' };

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

  // 组件挂载时加载数据
  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
  // 2026-07-14：BatchOpState 类型已上移至模块顶层
  const [batchOp, setBatchOp] = useState<BatchOpState>({ mode: 'normal' });

  // 派生标志（供 SeedSourceTable 保持向后兼容的 props 形态）
  const operationMode = batchOp.mode === 'edit' || batchOp.mode === 'delete' ? batchOp.mode : 'normal';
  const exportMode = batchOp.mode === 'export';
  const printMode = batchOp.mode === 'print';

  // 打印记录（待打印队列）
  const [printRecords, setPrintRecords] = useState<SeedSource[]>([]);

  // 2026-07-01: 标签管理弹窗状态
  const [labelManageModal, setLabelManageModal] = useState<{ open: boolean; record: SeedSource | null }>({
    open: false,
    record: null,
  });
  const handleLabelManage = (record: SeedSource) => {
    setLabelManageModal({ open: true, record });
  };

  // 2026-06-25 v3: 种源是纯仓库 — 移除繁殖过程/阶段推进/回流记录弹窗
  // 2026-07-07 V3.4：取消「入库登记（外购）」弹窗，删除 inboundModal state / 派生数组 / seedSavingInit / URL 参数 useEffect

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
  // 2026-07-14：handleDelete 是冗余 wrapper，直接把 setSelectedIdsFromCaller 传给 onDelete

  // 弹窗回调：真正执行删除（含引用检查）
  // 2026-07-01 P0-5 修复：先全部预检，列出所有有冲突的种源，再由用户选择"删除可删的"或"取消"
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...selectedRows];
    if (ids.length === 0) return;

    // 1. 全部预检，区分"可删除"和"有冲突"
    const deletable: string[] = [];
    const conflicted: Array<{ id: string; references: any[] }> = [];
    const errored: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const res = await checkDeletable(id);
        if (res.deletable) {
          deletable.push(id);
        } else {
          conflicted.push({ id, references: res.references });
        }
      } catch (e) {
        // 2026-07-10 P0-2 修复：catch(e: any) → catch(e) (TS 默认 unknown) + instanceof 守卫
        const msg = e instanceof Error ? e.message : String(e);
        errored.push({ id, error: msg });
        // 2026-06-06: R4 — 检查失败不阻止删除
        deletable.push(id);
      }
    }

    // 2. 如果全部可删，直接执行
    if (conflicted.length === 0) {
      setShowDeleteModal(false);
      try {
        await deleteItems(deletable);
        setSelectedRows([]);
        if (errored.length > 0) {
          toast.warning(`已删除 ${deletable.length} 个种源（${errored.length} 个引用检查失败，已强行删除）`);
        }
      } catch (e) {
        // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫
        await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    // 3. 有冲突 — 列出所有冲突项，问用户"只删可删的"还是"取消"
    const sections: string[] = [];
    conflicted.forEach((c) => {
      const refCount = c.references.length;
      const refSummary = c.references.slice(0, 3).map((r) => {
        const target = (r as any).targetCode || (r as any).targetId || r.code;
        return `「${target}」`;
      }).join('、');
      sections.push(`• 种源 [${c.id}] 被 ${refCount} 条引用：${refSummary}${c.references.length > 3 ? '…' : ''}`);
    });

    const confirmed = await showConfirm(
      `⚠️ 批量删除检测：\n\n` +
      `• 可删除：${deletable.length} 个\n` +
      `• 有冲突：${conflicted.length} 个（详见下方）\n` +
      (errored.length > 0 ? `• 检查失败：${errored.length} 个（将强行删除）\n` : '') +
      `\n${sections.join('\n')}\n\n` +
      `点击「确定」删除可删除的 ${deletable.length} 个，跳过有冲突的。\n` +
      `点击「取消」放弃全部删除。`
    );
    if (!confirmed) return;

    setShowDeleteModal(false);
    if (deletable.length === 0) {
      toast.warning(`全部 ${conflicted.length} 个都有冲突，未删除任何记录`);
      return;
    }
    try {
      await deleteItems(deletable);
      setSelectedRows([]);
      toast.success(`已删除 ${deletable.length} 个，跳过 ${conflicted.length} 个有冲突的`);
    } catch (e) {
      // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫
      await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [selectedRows, checkDeletable, deleteItems, showAlert, showConfirm, toast]);

  // 弹窗入口：单条删除走 handleDelete(ids: [id])；
  // setSelectedIdsFromCaller 包装 setSelectedRows 同步弹模态
  const setSelectedIdsFromCaller = useCallback((ids: string[]) => {
    setSelectedRows(ids);
    setShowDeleteModal(true);
  }, []);

  // 2026-07-14：移除 handleBatchDelete 死函数（表格行级删除入口已改为 setSelectedIdsFromCaller）

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

  // 2026-07-07 V3.4：取消「入库登记（外购）」入口，删除 handleInbound / handleInboundSuccess / exportInboundCSV

  // 2026-06-25 v3: 移除 handlePropagationStage（阶段推进功能）

  const handleConfirmExport = async () => {
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头（含图片列）
    // 2026-06-06: L7 对齐表格列名 — 表格「作物品种」实际为 cropVariety||cropName，拆为「最细化」+「细分品种」两列
    const headers = ['种源图片（链接）', '种源批号', '种源类型', '作物类别', '作物品种（最细化）', '作物品种（细分品种）', '品种路径', '供应商', '采购日期', '采购数量', '单位', '单价(元)', '总金额(元)', '初始数量', '可用数量', '库存状态', '溯源码', '创建人', '创建时间', '备注'];

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

    const fileName = `内部种源_${todayLocal()}.${exportFormat}`;

    try {
      if (exportFormat === 'xlsx') {
        // 使用 SheetJS 导出 xlsx（含图片列）
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        // 设置图片列宽约 240px (30字符) + 行高
        ws['!cols'] = headers.map((h, i) => {
          if (h === '种源图片（链接）') return { wch: 30 }; // 图片列宽
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
        // 2026-07-10 P1-1：抽到底层公共函数
        await exportCsv({ filename: fileName, headers, rows: exportData });
      } else {
        // xls fallback（保持原有行为：application/vnd.ms-excel 假装 xls，P2-5 待修）
        await exportXlsx({ filename: fileName.replace('xlsx', 'xls'), headers, rows: exportData });
      }
    } catch (err) {
      // 2026-07-10 P1-1：catch 改 await exportXlsx；保留原降级行为（xls 格式）
      // 2026-07-10 P0-2：catch(e) + instanceof 守卫
      console.warn('[SeedSourcePage] 导出失败，降级为 xls:', err instanceof Error ? err.message : String(err));
      await exportXlsx({ filename: `内部种源_${todayLocal()}.xls`, headers, rows: exportData });
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
              <h1 className="text-2xl font-bold text-gray-900">内部种源</h1>
              <p className="text-gray-500">管理种源批次、采购入库和库存记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2026-06-05: 顶部统计卡片已删除（user 要求） */}

      {/* 2026-06-04: 移除重算库存状态按钮，status 改为实时计算无需手动重算 */}

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
        onDelete={setSelectedIdsFromCaller}
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
        onLabelManage={handleLabelManage}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); }}
        onSuccess={() => { loadItems(); }}
        units={units}
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
      {/* 2026-07-07 V3.4：移除 SeedSourceInboundModal 渲染块（外购入库入口已关闭） */}

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

      {/* 2026-07-01: 种源标签管理弹窗 */}
      {labelManageModal.record && (
        <SeedSourceLabelManageModal
          isOpen={labelManageModal.open}
          onClose={() => setLabelManageModal({ open: false, record: null })}
          seedSourceId={labelManageModal.record.id}
          seedSourceCode={labelManageModal.record.seedCode}
          unit={labelManageModal.record.unit || '粒'}
        />
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
