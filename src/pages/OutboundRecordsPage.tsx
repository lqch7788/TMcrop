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
import { Download, FileDown } from 'lucide-react';
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
  // 导出弹窗 state
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

  // 弹窗选中格式后调起实际导出
  async function handleExportConfirm(format: 'csv' | 'xlsx' | 'pdf') {
    setExportOpen(false);
    try {
      if (format === 'csv') {
        const blob = await exportOutboundCSV(query);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV 下载已开始');
      } else if (format === 'xlsx') {
        exportOutboundXLSX(rows, summary);
        toast.success('XLSX 下载已开始');
      } else if (format === 'pdf') {
        await exportOutboundPDF(rows, summary);
        toast.success('PDF 下载已开始');
      }
    } catch (e: any) {
      toast.error(`${format.toUpperCase()} 导出失败：${e?.message || '未知错误'}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题卡片（对齐订单管理 OrderPage.tsx 顶部卡片样式：白色大卡 + 渐变图标 + 标题/副标题） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
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

      {/* 列表标题 + 导出按钮（同行靠右） */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">出库记录列表</h2>
        <Button variant="default" size="sm" onClick={() => setExportOpen(true)}>
          <FileDown className="w-4 h-4 mr-1" />
          导出
        </Button>
      </div>

      {/* 数据表格 */}
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
