/**
 * 种源详情 — 出入库记录面板（入库 + 冲销/作废审计 + 出库）
 * 2026-10-18：从 DetailModal.tsx 拆出（纯移动，无逻辑变更）
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, Package, RotateCcw, AlertTriangle, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { Badge, TextArea, Label, Button, Alert, AlertDescription } from '@/components/ui';
import * as XLSX from 'xlsx';
import { useToastStore } from '@/stores/useToastStore';
import { todayLocal } from '@/lib/dateUtils';
import { useSeedSourceStore } from '@/stores/useSeedSourceStore';
import type { InboundRecord as InboundRecordType } from '@/types/crop';
import {
  getInboundRecords,
  getInboundEditLogs,
  getOutboundRecords,
  OUTBOUND_TYPE_LABEL,
  type InboundEditLog,
  type SeedSourceOutboundRecord,
} from '@/services/apiSeedSourceService';
import { SOURCE_MODULE_MAP } from './constants';

type InboundRecord = InboundRecordType;

export function InboundRecordsPanel({ seedSourceId, seedCode }: { seedSourceId: string; seedCode: string }) {
  const [records, setRecords] = useState<InboundRecord[]>([])
  // 2026-07-19 P0-4：改用全局 useToastStore（useToast() 是组件私有 state，不渲染 ToastContainer 看不到）
  const toast = useToastStore((s) => s.toast);
  // 2026-07-18: 冲销对话框状态（C-1 修复）
  const [reversingRecord, setReversingRecord] = useState<InboundRecord | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseSubmitting, setReverseSubmitting] = useState(false);
  // 2026-08-16：作废行展开 — 紧贴对应入库记录行下方（用 flatMap + array 返回多个 tr）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // 2026-08-16：作废审计日志（懒加载 — 首次展开时拉取）
  const [auditLogs, setAuditLogs] = useState<InboundEditLog[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // 2026-08-16：首次展开时拉取审计日志
  const ensureAuditLoaded = async () => {
    if (auditLoaded || auditLoading) return;
    setAuditLoading(true);
    try {
      const data = await getInboundEditLogs(seedSourceId);
      setAuditLogs(Array.isArray(data) ? data : []);
      setAuditLoaded(true);
    } catch (e) {
      console.error('[InboundRecordsPanel] 加载作废审计失败:', e);
      toast.error('加载作废审计失败');
    } finally {
      setAuditLoading(false);
    }
  };
  // 2026-08-16：根据入库记录 id 查该行的作废审计
  const getAuditForRecord = (recordId: string): InboundEditLog[] =>
    auditLogs.filter(l => l.inboundId === recordId);

  // 2026-08-16 v3：渲染"作废审计"折叠行 — 直接放在对应入库记录行下方（flatMap + array）
  const renderAuditRow = (record: InboundRecord): React.ReactNode => {
    const audits = getAuditForRecord(record.id);
    return (
      <tr key={`${record.id}-audit`} className="bg-red-50/40">
        {/* 2026-10-16 修复：colSpan 17 → 16（入库表头实际 16 列，原值导致审计行宽度溢出一列） */}
        <td colSpan={16} className="px-3 py-2">
          <div className="overflow-x-auto border border-red-100 rounded-lg bg-white">
            <table className="w-full text-xs">
              <thead className="bg-red-50 text-red-800">
                <tr>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">操作时间</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">操作</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">来源</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">单据号</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">单据日期</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">作物/品种</th>
                  <th className="px-2 py-1.5 text-right whitespace-nowrap">原数量</th>
                  <th className="px-2 py-1.5 text-right whitespace-nowrap">数量变化</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">单位</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">供应商/源</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">回流方式</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap">操作人</th>
                  <th className="px-2 py-1.5 text-left whitespace-nowrap" style={{ minWidth: '180px' }}>撤回原因</th>
                </tr>
              </thead>
              {audits.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={13} className="px-2 py-1.5 text-gray-500 text-center">
                      已冲销（{record.reversedAt ? new Date(record.reversedAt).toLocaleString('zh-CN') : '-'}）· 详细审计数据待同步
                    </td>
                  </tr>
                </tbody>
              ) : (
              <tbody className="divide-y divide-gray-100">
                {audits.map((log) => {
                  const before = log.beforeQuantity;
                  const after = log.afterQuantity ?? 0;
                  // 2026-10-11：beforeQuantity 可为 null，?? 0 与 JS 中 null 的数值隐式转换等价（原写法触发 TS18047）
                  const delta = after - (before ?? 0);
                  const sign = delta > 0 ? '+' : '';
                  const qtyChange = `${before ?? '-'} → ${after}${log.unit ? ` ${log.unit}` : ''}（${sign}${delta}）`;
                  const actionLabel = log.sourceType === 'crop_circulation_records'
                    ? (log.action === 'reverse' ? '撤销' : '修改')
                    : (log.action === 'reverse' ? '冲销' : '修改');
                  const sourceLabel = log.sourceType === 'crop_circulation_records' ? '留种回流' : '调拨入库';
                  const cropDisplay = log.cropName
                    ? `${log.cropName}${log.varietyName ? ` / ${log.varietyName}` : ''}`
                    : (log.sourceType === 'crop_circulation_records' ? '（见种源）' : '-');
                  return (
                    <tr key={log.id} className="hover:bg-red-50/30">
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <Badge variant="destructive" className="text-xs">{actionLabel}</Badge>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs text-gray-500">{sourceLabel}</Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        <code className="text-xs font-mono text-gray-700">{log.inboundId}</code>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                        {log.recordDate ? log.recordDate.split('T')[0] : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-700" style={{ maxWidth: '180px' }}>
                        {cropDisplay}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-700 whitespace-nowrap">
                        {log.originalQuantity != null ? log.originalQuantity.toLocaleString() : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <span className="text-red-600 font-medium">{qtyChange}</span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{log.unit || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-600" style={{ maxWidth: '120px' }} title={log.supplierName || log.sourceId || ''}>
                        {log.supplierName || log.sourceId || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                        {log.mergeAction === 'create_new' ? '新建种源' : log.mergeAction === 'merge_into_existing' ? '合并命中' : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                        {log.editedByName || log.editedBy || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-700" style={{ maxWidth: '240px' }}>
                        <div className="line-clamp-2" title={log.reason || ''}>
                          {log.reason || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              )}
            </table>
          </div>
        </td>
      </tr>
    );
  };

  // 2026-07-18: 冲销处理函数；2026-07-19: 按 recordSource 路由（调拨 → reverseInbound；留种回流 → revokeCirculation）
  // 2026-07-28 审核 LOW：函数声明会 hoist 到模块顶部，对 useState 引用安全；这里仅注释说明
  async function handleReverse() {
    if (!reversingRecord || !reverseReason.trim()) return;
    setReverseSubmitting(true);
    const isCirculation = reversingRecord.recordSource === 'crop_circulation_records';
    try {
      if (isCirculation) {
        // 留种回流撤销
        await useSeedSourceStore.getState().revokeCirculation({
          circulationId: reversingRecord.id,
          reason: reverseReason.trim(),
        });
        toast.success(`撤销成功：留种回流 ${reversingRecord.id.substring(0, 12)}... 已作废，库存与 reflowCount 同步回退`);
      } else {
        // 调拨/外购入库冲销
        const returnableQty = (reversingRecord.quantity || 0) - (reversingRecord.returnedQuantity || 0);
        const returnableUnit = reversingRecord.unit || '';
        await useSeedSourceStore.getState().reverseInbound(seedSourceId, {
          inboundRecordId: reversingRecord.id,
          reason: reverseReason.trim(),
        });
        toast.success(
          `冲销成功：入库 ${reversingRecord.id.substring(0, 12)}... 减少 ${returnableQty} ${returnableUnit} 可用`
        );
      }
      setReversingRecord(null);
      setReverseReason('');
      // 刷新种源（更新 remainingQuantity）+ 刷新入库记录（更新 reversedAt 标记）
      await useSeedSourceStore.getState().loadItems();
      // 重新加载当前面板的 records
      getInboundRecords(seedSourceId)
        .then((data) => setRecords(Array.isArray(data) ? data : []))
        .catch((e) => {
          // 2026-07-19 P1：不再静默吞错，操作后刷新失败要提示
          console.error('[DetailModal] 刷新入库记录失败:', e);
          toast.error('刷新入库记录失败，请手动关闭重开');
        });
      // 2026-07-18: 跨页面刷新 - 通知 inventory store 同步（库存数量变化）
      try {
        // 动态 import 避免循环依赖
        const { useInventoryStore } = await import('@/stores/useInventoryStore');
        useInventoryStore.getState().notifyChange();
      } catch {}
    } catch (e: any) {
      toast.error(`${isCirculation ? '撤销' : '冲销'}失败：${e.message || '未知错误'}`);
    } finally {
      setReverseSubmitting(false);
    }
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 2026-10-16：出库流水（退库到作物库存）——「出入库记录」出库区
  const [outboundRecords, setOutboundRecords] = useState<SeedSourceOutboundRecord[]>([])
  const [outboundError, setOutboundError] = useState<string | null>(null)

  useEffect(() => {
    if (!seedSourceId) return
    setLoading(true)
    setError(null)
    setOutboundError(null)
    // 2026-07-18：入库改用 getInboundRecords（UNION inventory_inbound + crop_circulation PROPAGATION）
    // 2026-10-16：并行加载出库流水（退库）；出库失败不阻塞入库区，但显式提示（不静默）
    Promise.all([
      getInboundRecords(seedSourceId),
      getOutboundRecords(seedSourceId).catch((e) => {
        console.error('[DetailModal] 出库记录加载失败:', e)
        setOutboundError((e && (e as { message?: string }).message) || '出库记录加载失败')
        return [] as SeedSourceOutboundRecord[]
      }),
    ])
      .then(([inbound, outbound]) => {
        setRecords(Array.isArray(inbound) ? inbound : [])
        setOutboundRecords(outbound)
      })
      .catch((e) => { console.error('[DetailModal] 入库记录加载失败:', e); setError((e && (e as { message?: string }).message) || '加载失败'); })
      .finally(() => setLoading(false))
  }, [seedSourceId])

  // 2026-07-06：顶部统计汇总（原始/已退/可退 + 单位），让用户一眼看到退库累计
  // 2026-07-18：过滤已冲销记录（C-2 修复）
  // ⚠️ 必须在所有 early return 之前调用 — React hooks 调用次数必须保持一致
  const summary = useMemo(() => {
    // 只统计未冲销的记录（被冲销的已不占用库存）
    const activeRecords = records.filter(r => !r.reversedAt);
    const totalOriginal = activeRecords.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalReturned = activeRecords.reduce((s, r) => s + (Number(r.returnedQuantity) || 0), 0);
    const totalReturnable = totalOriginal - totalReturned;
    // 取所有行的单位（通常一致，取第一个非空）
    const unit = activeRecords.find(r => r.unit)?.unit || '';
    return { totalOriginal, totalReturned, totalReturnable, unit, count: activeRecords.length };
  }, [records]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中…</div>
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <div className="text-sm">暂无入库记录</div>
        <div className="text-xs mt-1 text-gray-400">
          通过「外购入库」「库存调拨」「种植留种」等入口添加后会显示在此
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          入库记录（共 {records.length} 条）
        </h4>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          title="导出出入库记录（含「入库记录」「出库记录」两个工作表）"
          onClick={() => {
            // 2026-07-19 P1：Excel 导出增加"记录类型"+"作废状态"列，已冲销行显示"—（已冲销）"
            const headers = ['日期', '入库方式', '入库单号', '作物', '品种', '仓库', '原始数量', '已退数量', '可退数量', '单价', '总金额', '供应商', '操作员', '记录类型', '作废状态', '备注'];
            const data = records.map(r => {
              const isCirculation = r.recordSource === 'crop_circulation_records';
              const isReversed = !!r.reversedAt;
              return [
                r.recordDate || '',
                SOURCE_MODULE_MAP[r.sourceModule || ''] || r.sourceModule || '',
                r.id || '',
                r.cropName || '',
                r.varietyName || '',
                r.warehouseName || '',
                r.quantity ?? 0,
                r.returnedQuantity ?? 0,
                isReversed ? '—（已冲销）' : ((r.quantity || 0) - (r.returnedQuantity || 0)),
                r.unitPrice ?? 0,
                r.totalAmount ?? 0,
                r.supplierName || '',
                r.operatorName || '',
                // 2026-10-16：种植留种入库凭证（source_module='planting'）原误标为「调拨入库」，按其来源修正
                isCirculation ? '留种回流' : (r.sourceModule === 'planting' ? '种植采收回流' : '调拨入库'),
                isReversed ? (isCirculation ? '已撤销' : '已冲销') : '',
                r.notes || '',
              ];
            });
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = headers.map(() => ({ wch: 16 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '入库记录');
            // 2026-10-16：补出库记录 sheet（用户报告：导出只能到入库记录，出库区数据缺失）
            // 2026-10-16 v2：出库区合并使用记录（退库/育苗使用/种植移入），列同步
            // 数量取负与页面显示一致（种源视角扣减）
            const outHeaders = ['日期', '类型', '数量（种源扣减）', '去向', '操作员', '备注'];
            const outData = outboundRecords.map(r => [
              r.recordDate || (r.createdAt || '').slice(0, 10),
              OUTBOUND_TYPE_LABEL[r.outType]?.label || r.outType,
              -(Number(r.quantity) || 0),
              r.targetDesc || '',
              r.operatorName || '',
              r.remarks || '',
            ]);
            const wsOut = XLSX.utils.aoa_to_sheet([outHeaders, ...outData]);
            wsOut['!cols'] = outHeaders.map(() => ({ wch: 18 }));
            XLSX.utils.book_append_sheet(wb, wsOut, '出库记录');
            // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug
            const today = todayLocal().replace(/-/g, '');
            XLSX.writeFile(wb, `出入库记录_${today}_入库${records.length}条_出库${outboundRecords.length}条.xlsx`);
          }}
        >
          <Download className="w-4 h-4 mr-1" />
          导出 Excel
        </Button>
      </div>
      {/* 顶部汇总条 — 让用户一眼看到退库累计（无需切换 Tab） */}
      <div className="grid grid-cols-4 gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <div>
          <div className="text-xs text-amber-700">入库条数</div>
          <div className="text-lg font-semibold text-amber-900">{summary.count} <span className="text-xs font-normal">条</span></div>
        </div>
        <div>
          <div className="text-xs text-amber-700">原始数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalOriginal.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-amber-700">已退数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalReturned > 0 ? (
              <span className="text-red-600">{summary.totalReturned.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span></span>
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-amber-700">可退数量</div>
          <div className="text-lg font-semibold text-amber-900">
            {summary.totalReturnable.toLocaleString()} <span className="text-xs font-normal">{summary.unit}</span>
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-blue-500 text-white sticky top-0">
            <tr>
              {/* 2026-08-16 v3：行首展开列（已作废行点击展开下方"作废审计"折叠面板） */}
              <th className="px-1 py-2 w-8" />
              <th className="px-2 py-2 text-left">日期</th>
              <th className="px-2 py-2 text-left">入库方式</th>
              <th className="px-2 py-2 text-left">入库单号</th>
              <th className="px-2 py-2 text-left">作物</th>
              <th className="px-2 py-2 text-left">品种</th>
              <th className="px-2 py-2 text-left">仓库</th>
              <th className="px-2 py-2 text-right">原始数量</th>
              <th className="px-2 py-2 text-right">已退数量</th>
              <th className="px-2 py-2 text-right">可退数量</th>
              <th className="px-2 py-2 text-right">单价</th>
              <th className="px-2 py-2 text-right">总金额</th>
              <th className="px-2 py-2 text-left">供应商</th>
              <th className="px-2 py-2 text-left">操作员</th>
              <th className="px-2 py-2 text-left">备注</th>
              {/* 2026-07-18: 冲销按钮列（C-1 修复） */}
              <th className="px-2 py-2 text-left w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.flatMap((r) => {
              const returnable = (r.quantity || 0) - (r.returnedQuantity || 0);
              const isReversed = !!r.reversedAt;
              const isExpanded = expandedIds.has(r.id);
              return [
                <tr
                  key={r.id}
                  // 2026-08-16：已作废行整行红色背景 + hover 略深红 — 视觉强化区别
                  className={`border-b border-gray-100 hover:bg-gray-50 ${isReversed ? 'bg-red-50/60' : ''}`}
                >
                  {/* 2026-08-16 v3：行首展开按钮 — 已作废行点击展开下方"作废审计"折叠面板 */}
                  <td className="px-1 py-1.5 text-center w-8">
                    {isReversed ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await ensureAuditLoaded();
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                            return next;
                          });
                        }}
                        className="w-7 h-7 inline-flex items-center justify-center rounded text-lg font-bold text-gray-600 hover:bg-red-100 hover:text-red-700"
                        title={isExpanded ? '折叠作废审计' : '展开作废审计（含原冲销记录全部字段）'}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-sm">·</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{r.recordDate || '-'}</td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs">
                      {SOURCE_MODULE_MAP[r.sourceModule || ''] || r.sourceModule || '-'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <code className="text-xs">{r.id || '-'}</code>
                  </td>
                  <td className="px-2 py-1.5">{r.cropName || '-'}</td>
                  <td className="px-2 py-1.5">{r.varietyName || '-'}</td>
                  <td className="px-2 py-1.5">{r.warehouseName || '-'}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{(r.quantity || 0).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">
                    {(r.returnedQuantity || 0) > 0 ? (
                      <span className="text-amber-600 font-medium">{(r.returnedQuantity || 0).toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {/* 2026-07-19 P1：已冲销/已撤销行可退数量显示为 —，避免业务认知错误 */}
                    {r.reversedAt ? (
                      <span className="text-gray-400">—（已冲销）</span>
                    ) : returnable > 0 ? (
                      <span className="text-emerald-600 font-medium">{returnable.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">{(r.unitPrice || 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">{(r.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{r.supplierName || '-'}</td>
                  <td className="px-2 py-1.5">{r.operatorName || '-'}</td>
                  <td
                    className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]"
                    title={r.notes || ''}
                  >
                    {r.notes || '-'}
                  </td>
                  {/* 2026-07-18: 冲销按钮（C-1 修复） */}
                  {/* 2026-07-19: 留种回流也支持撤销 — onClick 内按 recordSource 路由
                      （移除 recordSource 禁用，禁用条件只剩"已退完 / 不可操作"两类） */}
                  <td className="px-2 py-1.5">
                    {r.reversedAt ? (
                      <Badge variant="destructive" className="text-xs">
                        {r.recordSource === 'crop_circulation_records' ? '已撤销' : '已冲销'}
                      </Badge>
                    ) : (
                      (() => {
                        const isCirculation = r.recordSource === 'crop_circulation_records';
                        const disabledReason = !isCirculation && returnable <= 0
                          ? '已全部退完，无需冲销'
                          : '';
                        return (
                          <Button
                            size="sm"
                            variant="ghost"
                            // 2026-08-16：蓝色高亮提示可点击（之前 ghost 灰色看不出来）
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200"
                            onClick={() => {
                              if (disabledReason) {
                                toast.error(disabledReason);
                                return;
                              }
                              setReversingRecord(r);
                            }}
                            title={
                              disabledReason
                                || (isCirculation ? '撤销该次留种回流（整批作废）' : '冲销此入库')
                            }
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span className="text-xs">
                              {isCirculation ? '撤销' : '冲销'}
                            </span>
                          </Button>
                        );
                      })()
                    )}
                  </td>
                </tr>,
                isReversed && isExpanded ? renderAuditRow(r) : null,
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* 2026-10-16：出库记录区（退库到作物库存）—「出入库记录」Tab 的出库部分
          用户需求：一个 Tab 查看 入库+冲销+退库 全部数据；育苗/种植领用流水在「使用记录」Tab */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Undo2 className="w-4 h-4 text-amber-600" />
          出库记录（共 {outboundRecords.length} 条）
        </h4>
        {outboundError ? (
          <Alert variant="destructive">
            <AlertDescription>{outboundError}</AlertDescription>
          </Alert>
        ) : outboundRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <div className="text-sm">暂无出库记录</div>
            <div className="text-xs mt-1 text-gray-400">
              通过「退库（退回原作物库存）」操作后会显示在此
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              {/* 2026-10-16：表头样式与入库记录统一（蓝底白字） */}
              <thead className="bg-blue-500 text-white sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left w-24">日期</th>
                  <th className="px-2 py-2 text-left w-36">类型</th>
                  <th className="px-2 py-2 text-right w-32">数量（种源扣减）</th>
                  {/* 2026-10-16：合并使用记录后列名由「退回至（原库存）」改「去向」（覆盖三种出库来源） */}
                  <th className="px-2 py-2 text-left w-56">去向</th>
                  <th className="px-2 py-2 text-left w-24">操作员</th>
                  <th className="px-2 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody>
                {outboundRecords.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-1.5">{r.recordDate || (r.createdAt || '').slice(0, 10) || '-'}</td>
                    <td className="px-2 py-1.5">
                      {/* 2026-10-16：类型徽章按出库来源（退库/育苗使用/种植移入）映射 */}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${OUTBOUND_TYPE_LABEL[r.outType]?.cls || 'bg-gray-50 text-gray-700'}`}>
                        {OUTBOUND_TYPE_LABEL[r.outType]?.label || r.outType}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className="text-red-600 font-medium">
                        -{(Number(r.quantity) || 0).toLocaleString()}
                      </span>
                      <span className="text-gray-500 ml-1">{r.unit || ''}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <code className="text-xs text-gray-700">{r.targetDesc || '-'}</code>
                    </td>
                    <td className="px-2 py-1.5">{r.operatorName || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-500 truncate max-w-[240px]" title={r.remarks || ''}>
                      {r.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2026-07-18: 冲销确认对话框（C-1 修复） */}
      {/* 2026-07-19 P1：提交期间阻止关闭（避免中断进行中的库存扣减）*/}
      <Dialog
        open={reversingRecord !== null}
        onOpenChange={(open) => {
          if (!open && reverseSubmitting) return; // 提交期间禁止关闭
          if (!open) { setReversingRecord(null); setReverseReason(''); }
        }}
      >
        <DialogContent
          className="max-w-lg"
          onKeyDown={(e) => {
            // 2026-07-18: 键盘快捷键 - Enter 提交（Ctrl+Enter）、Esc 关闭
            if (e.key === 'Escape') {
              e.preventDefault();
              setReversingRecord(null);
              setReverseReason('');
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && reverseReason.trim() && !reverseSubmitting) {
              e.preventDefault();
              handleReverse();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {reversingRecord?.recordSource === 'crop_circulation_records' ? '撤销留种回流' : '冲销入库记录'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {/* 完整 context 显示：让用户清楚知道要冲什么 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">单据号</span>
                <code className="text-xs font-mono text-gray-700">{reversingRecord?.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{reversingRecord?.recordSource === 'crop_circulation_records' ? '回流来源' : '入库方式'}</span>
                <span className="text-gray-700">
                  {SOURCE_MODULE_MAP[reversingRecord?.sourceModule || ''] || reversingRecord?.sourceModule || '外购入库'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{reversingRecord?.recordSource === 'crop_circulation_records' ? '回流日期' : '入库日期'}</span>
                <span className="text-gray-700">{reversingRecord?.recordDate || '—'}</span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">{reversingRecord?.recordSource === 'crop_circulation_records' ? '回流量' : '原始入库数量'}</span>
                  <span className="text-gray-700">{(reversingRecord?.quantity || 0).toLocaleString()} {reversingRecord?.unit}</span>
                </div>
                {reversingRecord?.recordSource !== 'crop_circulation_records' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">已退数量</span>
                      <span className="text-amber-600">{(reversingRecord?.returnedQuantity || 0).toLocaleString()} {reversingRecord?.unit}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-700">本次可冲销数量</span>
                      <span className="text-red-600 text-base">
                        {((reversingRecord?.quantity || 0) - (reversingRecord?.returnedQuantity || 0)).toLocaleString()} {reversingRecord?.unit}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {reversingRecord?.recordSource === 'crop_circulation_records' ? (
              <>
                <p className="text-gray-600 text-xs">撤销后：</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                  <li>回流记录标记为「已撤销」（<code>circulation_edit_log</code> 留痕）</li>
                  <li>种源 <code className="font-mono text-gray-700">{seedCode}</code> 可用数量相应减少</li>
                  <li>合并计数 <code>reflow_count</code> -1（仅合并命中的回流）</li>
                  <li>种植端 <code>planting_harvest_records.circulation_revoked_at</code> 同步标记（种植事实保留）</li>
                  <li className="text-red-600 font-medium">此操作不可撤销（需新建正向回流补偿）</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-xs">冲销后将：</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                  <li>入库记录标记为「已冲销」（<code>inbound_edit_log</code> 留痕）</li>
                  <li>种源 <code className="font-mono text-gray-700">{seedCode}</code> 可用数量相应减少</li>
                  <li className="text-red-600 font-medium">此操作不可撤销（需新建正向入库单补偿）</li>
                </ul>
              </>
            )}

            <div>
              <Label>{reversingRecord?.recordSource === 'crop_circulation_records' ? '撤销原因' : '冲销原因'} <span className="text-red-600">*</span></Label>
              <TextArea
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value.slice(0, 200))}
                placeholder={reversingRecord?.recordSource === 'crop_circulation_records' ? '错回流 / 误操作 / 数据错误...' : '录入错误 / 重复提交 / 误操作...'}
                rows={2}
                maxLength={200}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>必填，将写入审计日志</span>
                <span>{reverseReason.length} / 200</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            {/* 2026-07-19 P1：提交期间禁用取消按钮 */}
            <Button
              variant="outline"
              disabled={reverseSubmitting}
              onClick={() => { setReversingRecord(null); setReverseReason(''); }}
            >
              取消 <span className="ml-1 text-xs text-gray-400">Esc</span>
            </Button>
            <Button
              variant="destructive"
              disabled={!reverseReason.trim() || reverseSubmitting}
              onClick={handleReverse}
            >
              {reverseSubmitting ? (
                <>
                  <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                  {reversingRecord?.recordSource === 'crop_circulation_records' ? '撤销中...' : '冲销中...'}
                </>
              ) : (
                <>
                  {reversingRecord?.recordSource === 'crop_circulation_records' ? '确认撤销' : '确认冲销'}
                  <span className="ml-1 text-xs opacity-70">Ctrl+Enter</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
