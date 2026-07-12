/**
 * 肥料入库弹窗（2026-07-12）
 * 对指定肥料 spec 增加库存数量，支持填写备注（采购/调拨等）
 */
import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { FertilizerSpec, useFertilizerLibraryStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';

interface FertilizerStockInModalProps {
  isOpen: boolean;
  record: FertilizerSpec;
  onClose: () => void;
  onSaved: () => void;
}

export function FertilizerStockInModal({ isOpen, record, onClose, onSaved }: FertilizerStockInModalProps) {
  const store = useFertilizerLibraryStore();
  const [quantity, setQuantity] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开时重置表单
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setRemark('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      await showAlert('请输入有效的入库数量（大于 0）');
      return;
    }

    setSubmitting(true);
    try {
      const newStock = await store.stockIn(record.id, qty, remark || undefined);
      if (newStock != null) {
        onSaved();
      } else {
        await showAlert('入库失败，请重试');
      }
    } catch (err) {
      await showAlert('入库出错：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`肥料入库 — ${record.fertilizerName}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 肥料信息摘要 */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-3 flex-wrap">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-mono text-blue-700 font-bold">{record.fertilizerCode}</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-800">{record.fertilizerName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">
              当前库存：<span className="font-mono font-semibold text-gray-800">{(record.stockQuantity ?? 0).toFixed(2)} {record.stockUnit || 'kg'}</span>
            </span>
          </div>
        </div>

        {/* 入库数量 */}
        <div>
          <Label className="text-gray-900">
            入库数量 ({record.stockUnit || 'kg'}) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="请输入入库数量"
            step="0.01"
            min="0.01"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {quantity && parseFloat(quantity) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              入库后库存：{(record.stockQuantity ?? 0) + parseFloat(quantity)} {record.stockUnit || 'kg'}
            </p>
          )}
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注（选填）</Label>
          <TextArea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="如：采购入库、基地调拨等"
            rows={2}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !quantity || parseFloat(quantity) <= 0}
        >
          {submitting ? '入库中...' : '确认入库'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
