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
import { ClipboardList, Download, Trash2, X } from 'lucide-react';
import { Button, DeleteConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
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
// 2026-07-15：移除 ActionToolbar import（改为直接渲染按钮组）

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

  // ===== 导出：参照 SeedSourcePage 2 步流程 =====
  // 2026-07-19 P1-fix：完整参照 SeedSource 的导出模式（handleExportClick → setBatchOp export +
  //   handleExportClickConfirm → 校验 selectedRows → setShowExportModal）
  // 第 1 步：点导出 → 进入 exportMode（表格显示 checkbox + 全选）
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  // 第 2 步：勾选完成后再次点击「确认导出」 → 校验 + 弹格式选择弹窗
  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先勾选要导出的出库记录');
      return;
    }
    setExportOpen(true);
  };

  // 取消导出模式
  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 全选/取消全选（用 row.id 而非 instanceId —— 同一库存可有多条流水）
  const handleExportSelectAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map(r => r.id));
    }
  };

  // ===== 删除：参照作物库存 ActionToolbar 模式 =====
  // 1. 第一次点击 → 进入 deleteMode（表格显示 checkbox）
  // 2. 选行后再次点击 → 弹 DeleteConfirmModal 确认
  // 2026-07-19 P0-fix: 原版 disabled={selectedRows.length===0} 永远为 true,
  //                    因为从未 setDeleteMode(true) 进入勾选模式 → 用户根本进不去
  const handleDeleteClick = () => {
    if (deleteMode) {
      // 二次确认模式：弹删除警告弹窗
      if (selectedRows.length === 0) {
        showAlert('请先勾选要删除的出库记录');
        return;
      }
      setShowDeleteModal(true);
      return;
    }
    // 第一次进入 deleteMode
    setDeleteMode(true);
    setSelectedRows([]);
  };

  // 取消删除模式
  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedRows([]);
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

  // 2026-07-15：删除 handleExportClickConfirm 死代码（ActionToolbar 移除后无调用方，handleExportClick 直接弹窗）

  // 5. 弹窗选中格式后实际导出（**只导出选中行**，不是全表）
  // 2026-07-19 P2：format 类型改为 'excel'|'csv'|'word' 对齐 ExportFormatModal
  //   - 'excel' → 走 exportOutboundXLSX（前端 XLSX 双 sheet：明细 + 汇总）
  //   - 'csv'   → 走 exportOutboundCSV（后端生成）
  //   - 'word'  → toast.warning 提示（出库业务暂不支持 docx，与种源不一致但保留选项对齐）
  // 注：原 'pdf' 格式移除（按 ExportFormatModal 100% 一致原则），原 PDF 报表功能并入 XLSX 汇总 sheet
  async function handleExportConfirm(format: 'excel' | 'csv' | 'word') {
    setExportOpen(false);
    setExportMode(false);
    setSelectedRows([]);
    try {
      // 选中的行（按 row.id 过滤 — selectedRows 现在存的是 row.id 而非 instanceId）
      const selectedData = rows.filter(r => selectedRows.includes(r.id));
      if (format === 'csv') {
        // CSV 走后端（保持一致性）
        const blob = await exportOutboundCSV(query);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug
        a.download = `outbound-${todayLocal()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`CSV 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'excel') {
        // Excel 走前端（按选中的行生成 XLSX 双 sheet）
        exportOutboundXLSX(selectedData, summary);
        toast.success(`Excel 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'word') {
        // 2026-07-19 P2：Word 格式出库暂不支持（与种源对齐，但出库业务无需 docx）
        toast.warning('Word 格式出库暂不支持，请选 Excel 或 CSV');
      }
    } catch (e) {
      // 2026-07-10 P0-2 修复：catch(e) + instanceof 守卫
      toast.error(`${format.toUpperCase()} 导出失败：${e instanceof Error ? e.message : '未知错误'}`);
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

      {/* 工具栏：2026-07-19 参照作物库存 ActionToolbar 模式重写
          - 默认模式：蓝色「导出」+ 红色「删除」（variant=default / destructive，与全站统一）
          - 选中模式：蓝色「确认导出 (N)」+ 红色「确认删除 (N)」+ 灰色「取消」
      */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 mb-3">
        <h2 className="text-base font-semibold text-gray-900">出库记录列表</h2>
        <div className="flex items-center gap-2">
          {/* 默认模式：仅 2 个主按钮 */}
          {!exportMode && !deleteMode && (
            <>
              {selectedRows.length > 0 && (
                <span className="text-sm text-gray-600 mr-2">已选 {selectedRows.length} 条</span>
              )}
              <Button
                size="sm"
                onClick={handleExportClick}
                disabled={loading || total === 0}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            </>
          )}
          {/* 选中模式：确认 + 取消按钮组（与 SeedSource ActionToolbar 一致） */}
          {(exportMode || deleteMode) && (
            <>
              <span className="text-sm text-gray-600 mr-2">已选 {selectedRows.length} 条</span>
              {exportMode && (
                <Button size="sm" onClick={handleExportClickConfirm}>
                  <Download className="w-4 h-4" />
                  确认导出 ({selectedRows.length})
                </Button>
              )}
              {deleteMode && (
                <Button size="sm" variant="destructive" onClick={handleDeleteClick}>
                  <Trash2 className="w-4 h-4" />
                  确认删除 ({selectedRows.length})
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={exportMode ? handleCancelExport : handleCancelDelete}>
                <X className="w-4 h-4" />
                取消
              </Button>
            </>
          )}
        </div>
      </div>

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
        onNavigateToInstance={(id) => setDetailInstanceId(id)}
      />

      {/* 导出格式选择弹窗（2026-07-19：参照 SeedSource 强制勾选 + selectedCount 文案） */}
      <OutboundExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        selectedCount={selectedRows.length}
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
