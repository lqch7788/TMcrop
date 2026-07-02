/**
 * 出库记录主页面 (V3.1)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md
 *
 * 布局（按用户原话调整）：
 * - 顶部：4 个紧凑型统计卡
 * - 分类汇总（复用作物库存 InventoryStockTypeCards）
 * - 6 维筛选
 * - 列表标题 + 导出按钮（同行靠右）
 *   按 Materials.tsx 模式：1 个"导出"按钮 + 弹窗（OutboundExportModal）选 CSV/XLSX/PDF
 * - 数据表格
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button, DeleteConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
// 2026-06-04 V2.1 铁律改造：持久化数据走 Store，CSV 导出保留直调（一次性动作）
import { exportOutboundCSV } from '@/services/inventoryTransactionService';
import type { OutboundQuery as ServiceOutboundQuery, OutboundRow as ServiceOutboundRow, OutboundSummary as ServiceOutboundSummary } from '@/services/inventoryTransactionService';
import { useInventoryTransactionStore, type OutboundQuery } from '@/stores/useInventoryTransactionStore';
// 2026-06-04 紧急修复：跨页刷新订阅（任何写操作 → useInventoryStore.notifyChange()
// → version 自增 → 此 useEffect 重跑 → 重新加载最新数据）
import { useInventoryStore } from '@/stores/useInventoryStore';
import {
  OutboundRecordsFilter,
  OutboundRecordsTable,
} from '@/components/farm/inventory/OutboundRecordsComponents';
import { OutboundExportModal } from '@/components/farm/inventory/OutboundExportModal';
import { InventoryDetailModal } from '@/components/farm/inventory/InventoryDetailModal';
import { exportOutboundPDF, exportOutboundXLSX } from '@/utils/outboundPdfExporter';
import ActionToolbar from '@/components/warehouse/ActionToolbar';

/** 默认本月 1 号到今天（V3.1 关键：useEffect 同步设值避免 400） */
export function getThisMonthRange(): { from: string; to: string } {
  const now = new Date();
  // 用本地时间格式化（不用 toISOString，避免 UTC 时区漂移）
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = fmt(now);
  return { from, to };
}

export default function OutboundRecordsPage() {
  // 默认本月（避免 from/to 空 → 400）
  const [query, setQuery] = useState<OutboundQuery>(() => ({
    ...getThisMonthRange(),
    page: 1,
    limit: 50,
  }));
  // 2026-06-04 V2.1 铁律改造：持久化数据从 useState 迁到 Store
  const rows = useInventoryTransactionStore((s) => s.rows);
  const total = useInventoryTransactionStore((s) => s.total);
  const summary = useInventoryTransactionStore((s) => s.summary);
  const loading = useInventoryTransactionStore((s) => s.loading);
  const loadOutbound = useInventoryTransactionStore((s) => s.loadOutbound);
  const deleteTransactions = useInventoryTransactionStore((s) => s.deleteTransactions);
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 工具栏模式（与作物库存 ActionToolbar 协同）
  const [exportMode, setExportMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);  // 选中行的 row.id（流水唯一 ID）
  const [exportOpen, setExportOpen] = useState(false);
  // 2026-06-09 删除警告弹窗（与"技术方案"页面一致：DeleteConfirmModal）
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { toast } = useToast();

  // 数据加载：筛选条件变化即重查 + 跨页刷新订阅（出库/入库后自动重查）
  const inventoryVersion = useInventoryStore((s) => s.version);
  useEffect(() => { loadOutbound(query); }, [query, loadOutbound, inventoryVersion]);

  // 退出任何模式时清空选中
  useEffect(() => {
    if (!exportMode && !deleteMode) {
      setSelectedRows([]);
    }
  }, [exportMode, deleteMode]);

  function handleFilterChange(q: OutboundQuery) {
    setQuery({ ...q, page: 1 }); // 改筛选条件回到第 1 页
  }

  function handleReset() {
    setQuery({ ...getThisMonthRange(), page: 1, limit: 50 });
  }

  function handleViewDetail(instanceId: string) {
    setDetailInstanceId(instanceId);
    setDetailOpen(true);
  }

  // ===== 导出：按 OrderPage 3 步流程 =====
  // 1. 点 ActionToolbar "导出" → 进入 exportMode（表格出现 checkbox + 全选）
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  // 2. 全选/取消全选（用 row.id 而非 instanceId —— 同一库存可有多条流水）
  const handleExportSelectAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map(r => r.id));
    }
  };

  // 3. 取消导出模式
  const handleExportCancel = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // ===== 删除：参照作物库存模式（先选行 deleteMode，再确认弹窗） =====
  // 1. 点 ActionToolbar "删除" → 进入 deleteMode
  const handleDeleteClick = () => {
    setDeleteMode(true);
    setSelectedRows([]);
  };

  // 2. 全选/取消全选（复用导出模式的 selectAll 逻辑）
  //    — 已在 handleExportSelectAll 中实现（共用 selectedRows）

  // 3. 取消删除模式
  const handleDeleteCancel = () => {
    setDeleteMode(false);
    setSelectedRows([]);
  };

  // 4. 校验 selectedRows 不空 → 弹 DeleteConfirmModal（与"技术方案"流程一致）
  const handleDeleteConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要删除的出库记录');
      return;
    }
    setShowDeleteModal(true);
  };

  // 2026-06-09 改造：弹窗回调直接调 Store action（替代旧 showConfirm 流程）
  const handleDeleteModalConfirm = async () => {
    const result = await deleteTransactions(selectedRows);
    setShowDeleteModal(false);
    if (result.success) {
      showAlert(`已删除 ${result.deletedCount} 条记录`);
      setSelectedRows([]);
      setDeleteMode(false);
    } else {
      showAlert(`删除失败：${result.error || '未知错误'}`);
    }
  };

  // 4. 校验 selectedRows 不空 → 弹格式选择弹窗
  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      toast.error('请先选择要导出的数据（点表格左侧 checkbox）');
      return;
    }
    setExportOpen(true);
  };

  // 5. 弹窗选中格式后实际导出（**只导出选中行**，不是全表）
  async function handleExportConfirm(format: 'csv' | 'xlsx' | 'pdf') {
    setExportOpen(false);
    setExportMode(false);
    setSelectedRows([]);
    try {
      // 选中的行（按 row.id 过滤 — selectedRows 现在存的是 row.id 而非 instanceId）
      const selectedData = rows.filter(r => selectedRows.includes(r.id));
      if (format === 'csv') {
        // CSV 走后端（保持一致性）
        const blob = await exportOutboundCSV(query as unknown as ServiceOutboundQuery);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`CSV 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'xlsx') {
        // XLSX 走前端（按选中的行生成）
        exportOutboundXLSX(selectedData as unknown as ServiceOutboundRow[], summary as unknown as ServiceOutboundSummary);
        toast.success(`XLSX 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'pdf') {
        await exportOutboundPDF(selectedData as unknown as ServiceOutboundRow[], summary as unknown as ServiceOutboundSummary);
        toast.success(`PDF 下载已开始（共 ${selectedData.length} 条）`);
      }
    } catch (e: any) {
      toast.error(`${format.toUpperCase()} 导出失败：${e?.message || '未知错误'}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题卡片（100% 对齐 OrderPage.tsx 顶部卡片样式） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">出库记录</h1>
              <p className="text-gray-500">管理出库流水、按多维筛选查询、导出 CSV/XLSX/PDF 报表</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6 维筛选 */}
      <OutboundRecordsFilter value={query as unknown as ServiceOutboundQuery} onChange={handleFilterChange} onReset={handleReset} />

      {/* 工具栏：复用 ActionToolbar（对齐订单管理 OrderPage 模式：title + 导出/批量/删除等按钮） */}
      <ActionToolbar
        title="出库记录列表"
        batchEditMode={false}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows as any}
        lowStockCount={0}
        filters={{ showLowStock: false }}
        onLowStockToggle={() => {}}
        onBatchEdit={() => {}}
        onDelete={handleDeleteClick}
        onExport={handleExportClick}
        onConfirmBatchEdit={() => {}}
        onCancelBatchEdit={() => {}}
        onConfirmDelete={handleDeleteConfirm}
        onCancelDelete={handleDeleteCancel}
        onConfirmExport={handleExportClickConfirm}
        onCancelExport={handleExportCancel}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canExport={true}
        showLowStockButton={false}
        showCustomerButton={false}
        noCard={true}
      />

      {/* 数据表格 */}
      <OutboundRecordsTable
        data={rows}
        loading={loading}
        pagination={{ current: query.page ?? 1, pageSize: query.limit ?? 50 }}
        total={total}
        onChange={(p) => setQuery((q) => ({ ...q, page: p.current, limit: p.pageSize }))}
        onViewDetail={handleViewDetail}
        exportMode={exportMode}
        deleteMode={deleteMode}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onSelectAll={handleExportSelectAll}
      />

      {/* 详情弹窗（按 instanceId 跳详情，复用 InventoryDetailModal） */}
      <InventoryDetailModal
        isOpen={detailOpen}
        stock={detailInstanceId ? ({ instanceId: detailInstanceId } as any) : null}
        onClose={() => setDetailOpen(false)}
      />

      {/* 导出格式选择弹窗（按 Materials.tsx 模式） */}
      <OutboundExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        rowCount={total}
        onConfirm={handleExportConfirm}
      />

      {/* 2026-06-09 删除警告弹窗（与"技术方案"页面统一为 DeleteConfirmModal） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteModalConfirm}
      />
    </div>
  );
}
