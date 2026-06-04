/**
 * 出库记录主页面 (V3.1)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md
 *
 * 组装 4 个组件 + 默认本月 + 6 维筛选 + 3 种导出
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown, FileDown as FilePdf } from 'lucide-react';
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
  OutboundRecordsStockTypeCards,
  OutboundRecordsFilter,
  OutboundRecordsTable,
} from '@/components/farm/inventory/OutboundRecordsComponents';
import { InventoryDetailModal } from '@/components/farm/inventory/InventoryDetailModal';
import { exportOutboundPDF, exportOutboundXLSX } from '@/utils/outboundPdfExporter';

/** 默认本月 1 号到今天（V3.1 关键：useEffect 同步设值避免 400） */
function getThisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
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

  async function handleExportCSV() {
    try {
      const blob = await exportOutboundCSV(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV 下载已开始');
    } catch (e: any) {
      toast.error('CSV 导出失败：' + (e?.message || '未知错误'));
    }
  }

  function handleExportXLSX() {
    try {
      exportOutboundXLSX(rows, summary);
      toast.success('XLSX 下载已开始');
    } catch (e: any) {
      toast.error('XLSX 导出失败：' + (e?.message || '未知错误'));
    }
  }

  async function handleExportPDF() {
    try {
      await exportOutboundPDF(rows, summary);
      toast.success('PDF 下载已开始');
    } catch (e: any) {
      toast.error('PDF 导出失败：' + (e?.message || '未知错误'));
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题 + 导出按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6 text-emerald-600" />
          出库记录
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileText className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportXLSX}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            XLSX
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FilePdf className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <OutboundRecordsStats summary={summary} loading={loading} />
      <OutboundRecordsStockTypeCards byStockType={summary?.byStockType ?? {}} loading={loading} />
      <OutboundRecordsFilter value={query} onChange={handleFilterChange} onReset={handleReset} />
      <OutboundRecordsTable
        data={rows}
        loading={loading}
        pagination={{ current: query.page ?? 1, pageSize: query.limit ?? 50 }}
        total={total}
        onChange={(p) => setQuery((q) => ({ ...q, page: p.current, limit: p.pageSize }))}
        onViewDetail={handleViewDetail}
      />

      {/* 详情弹窗（按 instanceId 跳详情，复用 InventoryDetailModal） */}
      <InventoryDetailModal
        isOpen={detailOpen}
        stock={detailInstanceId ? ({ instanceId: detailInstanceId } as any) : null}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
