/**
 * 肥料入库弹窗（2026-07-12）
 * 2026-07-27：升级为详情卡（12+ 字段）+ 单价可编辑（采购入库用实际购买价）
 * 对指定肥料 spec 增加库存数量，支持填写备注（采购/调拨等）
 */
import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { FertilizerSpec, useFertilizerLibraryStore, getDictItemName } from '@/stores';
import { useAuthStore } from '@/stores/useAuthStore';
import { showAlert } from '@/lib/dialogService';

interface FertilizerStockInModalProps {
  isOpen: boolean;
  record: FertilizerSpec;
  onClose: () => void;
  onSaved: () => void;
}

// 施肥时期 Badge 配置（与详情弹窗一致）
const TIMING_OPTIONS: Array<{ value: string; label: string; bg: string; text: string }> = [
  { value: 'base', label: '底肥', bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'dressing', label: '追肥', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'foliar', label: '叶面肥', bg: 'bg-blue-100', text: 'text-blue-700' },
];

export function FertilizerStockInModal({ isOpen, record, onClose, onSaved }: FertilizerStockInModalProps) {
  const store = useFertilizerLibraryStore();
  const [quantity, setQuantity] = useState<string>('');
  const [remark, setRemark] = useState('');
  // 2026-07-27：单价可编辑（默认填肥料库当前单价；采购入库允许填写实际购买价）
  const [unitPriceInput, setUnitPriceInput] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开时重置表单（默认单价 = record.unitPrice）
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setRemark('');
      setUnitPriceInput(record?.unitPrice != null ? String(record.unitPrice) : '');
    }
  }, [isOpen, record?.id, record?.unitPrice]);

  // 派生：施肥时期 Badge（多选逗号分隔）
  const renderTimingBadges = (timing?: string) => {
    if (!timing) return <span className="text-gray-400">-</span>;
    const timings = timing.split(',').map((t) => t.trim()).filter(Boolean);
    if (timings.length === 0) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {timings.map((t, idx) => {
          const cfg = TIMING_OPTIONS.find((x) => x.value === t) || { bg: 'bg-gray-100', text: 'text-gray-700', label: t };
          return (
            <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          );
        })}
      </div>
    );
  };

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      await showAlert('请输入有效的入库数量（大于 0）');
      return;
    }

    const price = unitPriceInput.trim() === '' ? null : parseFloat(unitPriceInput);
    if (price != null && (isNaN(price) || price < 0)) {
      await showAlert('单价必须是非负数字');
      return;
    }

    setSubmitting(true);
    try {
      // 2026-07-27：从 auth store 取当前操作人 + 弹窗里可编辑的单价，写入入库审计记录
      const user = useAuthStore.getState().user as { oid?: string; realName?: string } | null;
      const newStock = await store.stockIn(record.id, qty, remark || undefined, {
        unitPrice: price,
        operatorId: user?.oid,
        operatorName: user?.realName || user?.oid,
      });
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
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* 肥料详情卡（2026-07-27：扩展 12 字段，单价可改） */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
          {/* 第一行：编码 + 名称 + 类型 + 当前库存 */}
          <div className="flex items-center gap-3 flex-wrap pb-3 mb-3 border-b border-blue-200/60">
            <Package className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-mono text-blue-700 font-bold">{record.fertilizerCode}</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-800 text-base">{record.fertilizerName}</span>
            {record.fertilizerType && (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {getDictItemName('fertilizer_type', record.fertilizerType) || record.fertilizerType}
              </span>
            )}
            {record.applicationTiming && (
              <div className="flex flex-wrap gap-1">{renderTimingBadges(record.applicationTiming)}</div>
            )}
            <span className="ml-auto text-sm text-gray-500">
              当前库存：<span className="font-mono font-semibold text-gray-800">
                {(record.stockQuantity ?? 0).toFixed(2)} {record.stockUnit || 'kg'}
              </span>
            </span>
          </div>

          {/* 字段 grid：4 列布局，12 字段 */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">品牌名称</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800">
                {record.brandName || '主品牌'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">成份与含量</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800">
                {record.specContent || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">生产厂家</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800">
                {record.manufacturer || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">包装规格</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800">
                {record.packageSpec || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">库存单位</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 font-mono">
                {record.stockUnit || 'kg'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">保质期</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800">
                {record.shelfLife || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">产品批次</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 font-mono">
                {record.batchNumber || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">过期日期</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 font-mono">
                {record.expirationDate || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">建议用量</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 font-mono">
                {record.suggestedDosage || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">稀释比例</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 font-mono">
                {record.suggestedRatio || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">供应商信息</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 truncate" title={record.supplierInfo || ''}>
                {record.supplierInfo || '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-0.5">存储条件</Label>
              <div className="rounded-md p-2 min-h-[36px] border border-gray-200 bg-white text-gray-800 truncate" title={record.storageCondition || ''}>
                {record.storageCondition || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 入库输入区：数量 + 单价（可编辑） */}
        <div className="grid grid-cols-2 gap-4">
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
                入库后库存：<span className="font-mono font-semibold text-emerald-700">
                  {((record.stockQuantity ?? 0) + parseFloat(quantity)).toFixed(2)} {record.stockUnit || 'kg'}
                </span>
              </p>
            )}
          </div>
          <div>
            <Label className="text-gray-900">
              单价 (元/{record.stockUnit || 'kg'}) <span className="text-xs text-gray-400">（采购入库可填实际购买价）</span>
            </Label>
            <Input
              type="number"
              value={unitPriceInput}
              onChange={(e) => setUnitPriceInput(e.target.value)}
              placeholder={record.unitPrice != null ? String(record.unitPrice) : '请输入单价'}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {unitPriceInput && parseFloat(unitPriceInput) >= 0 && quantity && parseFloat(quantity) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                本次入库小计：<span className="font-mono font-semibold text-amber-700">
                  ¥{(parseFloat(unitPriceInput) * parseFloat(quantity)).toFixed(2)}
                </span>
              </p>
            )}
          </div>
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
