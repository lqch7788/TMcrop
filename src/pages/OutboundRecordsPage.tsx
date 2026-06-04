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
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import {
  getOutboundList,
  exportOutboundCSV,
  OutboundQuery,
  OutboundRow,
  OutboundSummary,
} from '@/services/inventoryTransactionService';
import {
  OutboundRecordsStats,
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
  const [rows, setRows] = useState<OutboundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OutboundSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 导出：按 OrderPage 模式（先选行 exportMode，再确认弹窗）
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);  // 选中行的 instanceId
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();

  // 数据加载（筛选条件变化即重查）
  useEffect(() => { loadData(); }, [query]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getOutboundList(query);
      setRows(data.rows);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (e: any) {
      toast.error('加载失败：' + (e?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }

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

  // 2. 全选/取消全选
  const handleExportSelectAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map(r => r.instanceId));
    }
  };

  // 3. 取消导出模式
  const handleExportCancel = () => {
    setExportMode(false);
    setSelectedRows([]);
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
      // 选中的行（按 instanceId 过滤）
      const selectedData = rows.filter(r => selectedRows.includes(r.instanceId));
      if (format === 'csv') {
        // CSV 走后端（保持一致性）
        const blob = await exportOutboundCSV(query);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`CSV 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'xlsx') {
        // XLSX 走前端（按选中的行生成）
        exportOutboundXLSX(selectedData, summary);
        toast.success(`XLSX 下载已开始（共 ${selectedData.length} 条）`);
      } else if (format === 'pdf') {
        await exportOutboundPDF(selectedData, summary);
        toast.success(`PDF 下载已开始（共 ${selectedData.length} 条）`);
      }
    } catch (e: any) {
      toast.error(`${format.toUpperCase()} 导出失败：${e?.message || '未知错误'}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
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

      {/* 顶部：7 个紧凑型卡片（4 数值 + 3 分类）同一行 */}
      <OutboundRecordsStats summary={summary} loading={loading} />

      {/* 6 维筛选 */}
      <OutboundRecordsFilter value={query} onChange={handleFilterChange} onReset={handleReset} />

      {/* 工具栏：复用 ActionToolbar（对齐订单管理 OrderPage 模式：title + 导出/批量/删除等按钮） */}
      <ActionToolbar
        title="出库记录列表"
        batchEditMode={false}
        deleteMode={false}
        exportMode={exportMode}
        selectedRows={selectedRows as any}
        lowStockCount={0}
        filters={{ showLowStock: false }}
        onLowStockToggle={() => {}}
        onBatchEdit={() => {}}
        onDelete={() => {}}
        onExport={handleExportClick}
        onConfirmBatchEdit={() => {}}
        onCancelBatchEdit={() => {}}
        onConfirmDelete={() => {}}
        onCancelDelete={() => {}}
        onConfirmExport={handleExportClickConfirm}
        onCancelExport={handleExportCancel}
        canCreate={false}
        canEdit={false}
        canDelete={false}
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
    </div>
  );
}
