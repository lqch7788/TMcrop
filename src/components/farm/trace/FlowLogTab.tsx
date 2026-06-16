/**
 * 流转记录 Tab — 表格形式 + Excel 导出
 * 2026-06-16: 业务流水的全链路追溯（基于业务批号，不依赖库存实例）
 * 数据源：material_flow_log 表（种源→育苗→种植→采收 全链）
 *
 * 与 TraceChain 的区别：
 *   - TraceChain：基于 instanceId（库存系统），部分记录没接库存就显示空
 *   - FlowLogTab：基于 businessCode（业务批号），所有写入 flow_log 的记录都能查到
 */

import React, { useEffect, useMemo, useState } from 'react';
import { History, Loader2, AlertCircle, Filter, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { traceFlow, getFlowLogs } from '../../../services/apiMaterialFlowService';
import * as XLSX from 'xlsx';

interface FlowLog {
  id: string;
  flowType: string;        // seed_source→seedling / seedling→planting 等
  cropName: string;
  cropVariety?: string;
  sourceType?: string;
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  sourceCategory?: string;
  targetType?: string;
  targetCode?: string;
  targetQuantity?: number;
  targetUnit?: string;
  businessCode?: string;
  createdAt: string;
  createdBy?: string;
}

interface FlowLogTabProps {
  /** 业务批号（种源批号 / 育苗批号 / 种植批号） */
  code: string;
  /** 关联业务 ID（用于显示区分） */
  businessId?: string;
}

const FLOW_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'seed_source→seedling': { label: '种源 → 育苗', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  'seedling→planting':    { label: '育苗 → 种植', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  'planting→harvest':     { label: '种植 → 采收', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  'external→seedling':    { label: '外部种源 → 育苗', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  'external→planting':    { label: '外部 → 种植', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  'correction':           { label: '数量修正', color: 'bg-red-100 text-red-800 border-red-300' },
  'default':              { label: '其他流转', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

const SOURCE_CATEGORY_LABELS: Record<string, string> = {
  'self_produced': '自产',
  'external_purchase': '外采',
  'asexual': '无性繁殖',
  'external': '外部',
  'other': '其他',
};

const formatDate = (s: string) => {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('zh-CN', { hour12: false });
};

const formatQty = (q?: number, u?: string) => {
  if (q == null) return '-';
  return `${q.toLocaleString()}${u ? ' ' + u : ''}`;
};

export const FlowLogTab: React.FC<FlowLogTabProps> = ({ code, businessId }) => {
  const [logs, setLogs] = useState<FlowLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const loadData = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await traceFlow(code);
      let list: FlowLog[] = Array.isArray(res) ? res : (res?.data || []);
      if (list.length === 0) {
        const [asSource, asTarget] = await Promise.all([
          getFlowLogs({ sourceCode: code, pageSize: 100 }),
          getFlowLogs({ targetCode: code, pageSize: 100 }),
        ]);
        const sl = (asSource as any)?.data?.list || [];
        const tl = (asTarget as any)?.data?.list || [];
        const map = new Map<string, FlowLog>();
        [...sl, ...tl].forEach((it: FlowLog) => map.set(it.id, it));
        list = Array.from(map.values()).sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        list = list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      setLogs(list);
    } catch (e: any) {
      setError(e?.message || '加载流转记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, businessId]);

  const flowTypes = useMemo(() => Array.from(new Set(logs.map(l => l.flowType))), [logs]);
  const filtered = useMemo(
    () => (filterType === 'all' ? logs : logs.filter(l => l.flowType === filterType)),
    [logs, filterType]
  );

  /** 统计：累计源/目标数量（用于顶部摘要） */
  const summary = useMemo(() => {
    const totalIn = filtered.reduce((s, l) => s + (l.targetQuantity || 0), 0);
    const totalOut = filtered.reduce((s, l) => s + (l.sourceQuantity || 0), 0);
    return { totalIn, totalOut, count: filtered.length };
  }, [filtered]);

  /** 导出 Excel */
  const handleExport = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map((l, i) => ({
      '序号': i + 1,
      '时间': formatDate(l.createdAt),
      '流向': FLOW_TYPE_LABELS[l.flowType]?.label || l.flowType,
      '作物': l.cropName || '',
      '品种': l.cropVariety || '',
      '源批号': l.sourceCode || '',
      '源类型': l.sourceType || '',
      '源数量': l.sourceQuantity ?? '',
      '源单位': l.sourceUnit || '',
      '来源分类': SOURCE_CATEGORY_LABELS[l.sourceCategory || ''] || l.sourceCategory || '',
      '目标类型': l.targetType || '',
      '目标批号': l.targetCode || '',
      '目标数量': l.targetQuantity ?? '',
      '目标单位': l.targetUnit || '',
      '操作人': l.createdBy || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '流转记录');
    // 列宽
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
      { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
    ];
    XLSX.writeFile(wb, `流转记录_${code}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        加载流转记录...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData} className="mt-3">重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 头部：标题 + 摘要 + 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-700">
            流转记录
            <span className="ml-2 text-xs text-gray-500">
              ({summary.count} 条 · 目标累计 {summary.totalIn.toLocaleString()} · 源累计 {summary.totalOut.toLocaleString()})
            </span>
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {flowTypes.length > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3 h-3 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="all">全部流向</option>
                {flowTypes.map(ft => (
                  <option key={ft} value={ft}>
                    {FLOW_TYPE_LABELS[ft]?.label || ft}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={loadData} className="text-xs">刷新</Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="text-xs flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            导出 Excel
          </Button>
        </div>
      </div>

      {/* 表格 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无流转记录</p>
          <p className="text-xs mt-1">该业务批号 {code} 未写入 material_flow_log（可能在旧版本数据中）</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-500 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold w-12">#</th>
                  <th className="px-2 py-2 text-left font-semibold w-40">时间</th>
                  <th className="px-2 py-2 text-left font-semibold w-32">流向</th>
                  <th className="px-2 py-2 text-left font-semibold">源批号 / 数量</th>
                  <th className="px-2 py-2 text-center font-semibold w-8"></th>
                  <th className="px-2 py-2 text-left font-semibold">目标批号 / 数量</th>
                  <th className="px-2 py-2 text-left font-semibold w-24">作物</th>
                  <th className="px-2 py-2 text-left font-semibold w-20">操作人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((l, idx) => {
                  const ftLabel = FLOW_TYPE_LABELS[l.flowType] || FLOW_TYPE_LABELS.default;
                  const isSourceOfThis = l.sourceCode === code;
                  const isTargetOfThis = l.targetCode === code;
                  return (
                    <tr
                      key={l.id}
                      className={`hover:bg-gray-50 ${isSourceOfThis || isTargetOfThis ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded border ${ftLabel.color}`}>
                          {ftLabel.label}
                        </span>
                      </td>
                      <td className={`px-2 py-1.5 ${isSourceOfThis ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                        <div className="font-mono text-xs truncate max-w-[200px]" title={l.sourceCode || ''}>
                          {l.sourceCode || '-'}
                        </div>
                        <div className="text-xs text-amber-600">{formatQty(l.sourceQuantity, l.sourceUnit)}</div>
                      </td>
                      <td className="px-1 py-1.5 text-center text-gray-400">
                        <ArrowRight className="w-3 h-3 inline" />
                      </td>
                      <td className={`px-2 py-1.5 ${isTargetOfThis ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                        <div className="font-mono text-xs truncate max-w-[200px]" title={l.targetCode || ''}>
                          {l.targetCode || '-'}
                        </div>
                        <div className="text-xs text-emerald-600">{formatQty(l.targetQuantity, l.targetUnit)}</div>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-700">
                        <div className="truncate max-w-[120px]" title={l.cropName}>
                          {l.cropName || '-'}
                        </div>
                        {l.cropVariety && (
                          <div className="text-xs text-gray-500 truncate max-w-[120px]" title={l.cropVariety}>
                            {l.cropVariety}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-600">{l.createdBy || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowLogTab;
