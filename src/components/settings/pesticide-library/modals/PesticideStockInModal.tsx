/**
 * 药剂入库弹窗组件（2026-07-12 新增）
 * 对齐肥料库 FertilizerStockInModal 模式
 */
import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { PesticideSpec, usePesticideLibraryStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';

interface PesticideStockInModalProps {
  isOpen: boolean;
  record: PesticideSpec;
  onClose: () => void;
  onSaved: () => void;
}

export function PesticideStockInModal({ isOpen, record, onClose, onSaved }: PesticideStockInModalProps) {
  const store = usePesticideLibraryStore();
  const [quantity, setQuantity] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 重置表单
  React.useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setRemark('');
    }
  }, [isOpen]);

  const currentStock = record.stockQuantity ?? 0;
  const stockUnit = record.stockUnit || 'kg';

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
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
      await showAlert('入库失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="药剂入库"
      size="md"
      showFooter={false}
    >
      {/* 药剂信息摘要 */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 mb-4 border border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <span className="font-mono text-sm text-emerald-700">{record.pesticideCode}</span>
        </div>
        <div className="text-lg font-bold text-gray-900">{record.pesticideName}</div>
        {record.specContent && (
          <div className="text-sm text-gray-600 mt-1">
            含量：{record.specContent}
            {record.manufacturer && ` · ${record.manufacturer}`}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="text-gray-500">
            当前库存：<span className={`font-bold ${currentStock === 0 ? 'text-red-600' : currentStock < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{currentStock.toFixed(2)}</span> {stockUnit}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 入库数量 */}
        <div>
          <Label className="text-gray-900">
            入库数量 <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="请输入入库数量"
              min="0"
              step="0.01"
              className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">{stockUnit}</span>
          </div>
          {quantity && !isNaN(parseFloat(quantity)) && (
            <p className="text-xs text-gray-500 mt-1">
              入库后库存：{(currentStock + parseFloat(quantity)).toFixed(2)} {stockUnit}
            </p>
          )}
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="入库备注（可选）"
            rows={2}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
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
          <Package className="w-4 h-4" />
          {submitting ? '入库中...' : '确认入库'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
