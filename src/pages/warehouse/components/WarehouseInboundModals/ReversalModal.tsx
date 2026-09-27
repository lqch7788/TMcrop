/**
 * 入库冲销弹窗（2026-09-27 新增）
 *
 * 用途：对"已完成"入库单执行冲销——原单保留（审计），生成红字冲销单；
 * 冲销量 = min(明细入库量, 该批次当前剩余量)，已领用部分不可冲回（防负库存）。
 * 完全消耗的单可冲量为 0 → 冲销后仅做标记，库存不动。
 */
import React, { useEffect, useState } from 'react';
import { RotateCcw, X, AlertTriangle } from 'lucide-react';
import { InboundRecord } from '../../../../types/warehouseInbound.types';
import { UnifiedModal, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { getReversalPreview, createInboundReversal, ReversalPreview } from '@/services/apiWarehouseMaterialService';
import { showAlert } from '@/lib/dialogService';

interface InboundReversalModalProps {
  isOpen: boolean;
  record: InboundRecord | null;
  onClose: () => void;
  /** 冲销成功回调（父组件刷新列表） */
  onSuccess?: () => void;
}

export function InboundReversalModal({ isOpen, record, onClose, onSuccess }: InboundReversalModalProps) {
  const [preview, setPreview] = useState<ReversalPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 打开时加载预览（每次打开重置）
  useEffect(() => {
    if (!isOpen || !record) return;
    setReason('');
    setPreview(null);
    setLoading(true);
    let cancelled = false;
    getReversalPreview(record.id)
      .then((data) => { if (!cancelled) setPreview(data); })
      .catch((e) => { if (!cancelled) showAlert(`加载冲销预览失败：${(e as Error).message}`); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, record]);

  const handleConfirm = async () => {
    if (!record) return;
    setSubmitting(true);
    try {
      const res = await createInboundReversal(record.id, reason.trim());
      await showAlert(res?.message || '冲销完成');
      onSuccess?.();
      onClose();
    } catch (e) {
      await showAlert(`冲销失败：${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  const total = preview?.totalReversible ?? 0;
  const allConsumed = preview !== null && total === 0;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`冲销入库单 — ${record.code}`}
      size="lg"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="warning"
            onClick={handleConfirm}
            disabled={submitting || loading || preview === null || !!preview?.alreadyReversed}
          >
            <RotateCcw className="w-4 h-4" /> {submitting ? '冲销中...' : allConsumed ? '确认冲销标记' : `确认冲销（回收 ${total}）`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
          冲销将保留原单（审计可追溯），另生成一张红字冲销单并回收**当前仍在库存中的数量**。
          已被领用消耗的部分不可冲回（防止库存变负）。
        </div>

        {/* 原单信息 */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><span className="text-xs text-gray-500 block">原单号</span><span className="font-medium">{record.code}</span></div>
          <div><span className="text-xs text-gray-500 block">入库日期</span><span>{record.inboundDate}</span></div>
          <div><span className="text-xs text-gray-500 block">供应商</span><span>{record.supplier || '-'}</span></div>
        </div>

        {/* 明细与可冲量 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : preview ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</TableHead>
                  <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600">名称</TableHead>
                  <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600">批次</TableHead>
                  <TableHead className="px-3 py-2 text-right text-xs font-semibold text-gray-600">原入库量</TableHead>
                  <TableHead className="px-3 py-2 text-right text-xs font-semibold text-gray-600">剩余可冲</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((it, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="px-3 py-2 text-xs font-mono">{it.code}</TableCell>
                    <TableCell className="px-3 py-2 text-xs">{it.name || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-gray-500">{it.batchNo}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-right">{it.quantity} {it.unit}</TableCell>
                    <TableCell className={`px-3 py-2 text-xs text-right font-medium ${it.reversible > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {it.reversible} {it.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {preview?.alreadyReversed && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  该入库单<b>已被冲销</b>（冲销单：{preview.existingReversalCode || '-'}），不可重复冲销。此弹窗仅供查看。
                </span>
              </div>
            )}

            {allConsumed && !preview?.alreadyReversed && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  该单的货已被全部领用，<b>无可回收库存</b>。确认后将生成一张 0 量冲销单（仅完成冲销标记），
                  原单保留、库存不变，已消耗的历史流水不受影响。
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">预览加载失败</div>
        )}

        {/* 冲销原因 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">冲销原因（留痕，可选）</label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：重复录入 / 数量录错 / 供应商退货"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}

export default InboundReversalModal;
