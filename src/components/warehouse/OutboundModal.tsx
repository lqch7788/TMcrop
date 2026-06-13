/**
 * 出库弹窗组件
 * 2026-06-04 V2.1 铁律改造：写操作走 useInventoryTransactionStore.addTransaction()
 *                  → POST /api/inventory-transactions → 路由内扣减库存 + 写 inventory_transaction 老表
 */
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { InventoryStock } from '../../types/inventory';
import { useInventoryTransactionStore } from '../../stores/useInventoryTransactionStore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { OutboundBusinessType, OUTBOUND_BUSINESS_TYPE_META } from '../../constants/outboundConstants';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface OutboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: InventoryStock | null;
  onSuccess: () => void;
}

export function OutboundModal({ isOpen, onClose, stock, onSuccess }: OutboundModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [businessType, setBusinessType] = useState<OutboundBusinessType>(OutboundBusinessType.OTHER);
  const [businessCode, setBusinessCode] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen || !stock) return null;

  // 计算可用数量
  const availableQuantity = stock.currentQuantity - stock.frozenQuantity;

  // 处理出库提交
  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('请输入有效的出库数量');
      return;
    }
    if (qty > availableQuantity) {
      setError(`出库数量不能超过可用数量（${availableQuantity}）`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 2026-06-04 V2.1 铁律改造：写操作走 Store action（addTransaction 内部已 notifyChange 跨页刷新）
      const result = await useInventoryTransactionStore.getState().addTransaction({
        instanceId: stock.instanceId,
        businessId: stock.businessId,
        businessType: businessType,
        businessCode: businessCode || undefined,
        quantity: qty,
        operatorId: 'system',
        operatorName: '系统操作员',
        remarks: remarks || undefined,
      });

      // 2026-06-08 修复：addTransaction 现在按 Fail Loud 铁律 throw 真实错误（不再吞掉返回 null），
      // 成功路径才走这里；失败时抛错被下方 catch (err) 接手显示真实 message
      if (result) {
        // 防御性兜底：Store action 内部已调 notifyChange，但若未生效则手动调一次
        useInventoryStore.getState().notifyChange();
        onSuccess();
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '出库失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 关闭弹窗并重置表单
  const handleClose = () => {
    setQuantity('');
    setBusinessType(OutboundBusinessType.OTHER);
    setBusinessCode('');
    setRemarks('');
    setError('');
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="出库操作"
      size="xxxl"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !quantity || parseFloat(quantity) <= 0 || parseFloat(quantity) > availableQuantity}
          >
            {isSubmitting ? '出库中...' : '确认出库'}
          </Button>
        </div>
      }
    >
      {/* 库存信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">库存信息</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500 block">实例ID</span>
            <span className="font-mono text-gray-900">{stock.instanceId}</span>
          </div>
          <div>
            <span className="text-gray-500 block">作物名称</span>
            <span className="text-gray-900">{stock.cropName}</span>
          </div>
          <div>
            <span className="text-gray-500 block">当前库存</span>
            <span className="text-gray-900 font-medium">{stock.currentQuantity} {stock.unit}</span>
          </div>
          <div>
            <span className="text-gray-500 block">可用数量</span>
            <span className="text-emerald-600 font-medium">{availableQuantity} {stock.unit}</span>
          </div>
          <div>
            <span className="text-gray-500 block">已冻结</span>
            <span className="text-blue-600">{stock.frozenQuantity} {stock.unit}</span>
          </div>
          <div>
            <span className="text-gray-500 block">入库日期</span>
            <span className="text-gray-900">{new Date(stock.inboundDate).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      {quantity && parseFloat(quantity) > availableQuantity && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">出库数量不能超过可用数量（{availableQuantity}）</span>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* 出库表单 */}
      <div className="space-y-4">
        {/* 出库数量 / 业务类型 / 业务单号 — 同一排 */}
        <div className="grid grid-cols-3 gap-4">
          {/* 出库数量 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              出库数量 <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={quantity}
                onChange={(val) => setQuantity(val)}
                placeholder={`最大 ${availableQuantity}`}
                decimals={2}
                className="h-10 px-3 flex-1 min-w-0"
              />
              <span className="text-gray-500 shrink-0">{stock.unit}</span>
            </div>
          </div>

          {/* 业务类型 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">业务类型</Label>
            <Select value={businessType} onValueChange={(val) => setBusinessType(val as OutboundBusinessType)}>
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="其他" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OutboundBusinessType.CUSTOMER_SALE}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.CUSTOMER_SALE].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.TRANSFER_OUT}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.TRANSFER_OUT].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.DAMAGE_LOSS}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.DAMAGE_LOSS].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.INTERNAL_PLANTING}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.INTERNAL_PLANTING].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.INTERNAL_SEEDLING}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.INTERNAL_SEEDLING].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.INTERNAL_SEED_SOURCE}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.INTERNAL_SEED_SOURCE].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.GIFT_SAMPLE}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.GIFT_SAMPLE].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.RETURN_INBOUND}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.RETURN_INBOUND].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.INVENTORY_ADJUST}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.INVENTORY_ADJUST].label}
                </SelectItem>
                <SelectItem value={OutboundBusinessType.OTHER}>
                  {OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.OTHER].label}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 业务单号 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">业务单号</Label>
            <Input
              type="text"
              value={businessCode}
              onChange={(e) => setBusinessCode(e.target.value)}
              placeholder="请输入业务单号（可选）"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 备注 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
          <TextArea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="请输入备注信息（可选）"
            rows={3}
            className={deepInputClass.replace('text-sm', 'text-sm resize-none')}
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
