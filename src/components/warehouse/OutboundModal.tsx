/**
 * 出库弹窗组件
 * 基于 inventoryService.ts 的 outbound() API 实现
 */
import { useState } from 'react';
import { X, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { outbound } from '../../services/inventoryService';
import { InventoryStock, BusinessType } from '../../types/inventory';
import { Button } from '../ui/button';

interface OutboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: InventoryStock | null;
  onSuccess: () => void;
}

export function OutboundModal({ isOpen, onClose, stock, onSuccess }: OutboundModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.OTHER);
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
      const result = await outbound({
        instanceId: stock.instanceId,
        businessId: stock.businessId,
        businessType: businessType,
        businessCode: businessCode || undefined,
        quantity: qty,
        operatorId: 'system',
        operatorName: '系统操作员',
        remarks: remarks || undefined,
      });

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || '出库失败');
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
    setBusinessType(BusinessType.OTHER);
    setBusinessCode('');
    setRemarks('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600 rounded-t-xl">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold text-white">出库操作</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 库存信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">库存信息</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
            {/* 出库数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出库数量 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`最大 ${availableQuantity}`}
                  min="0"
                  max={availableQuantity}
                  step="1"
                  className="flex-1 h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-gray-500">{stock.unit}</span>
              </div>
            </div>

            {/* 业务类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">业务类型</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={BusinessType.SEED_SOURCE}>种源管理</option>
                <option value={BusinessType.SEEDLING}>育苗管理</option>
                <option value={BusinessType.PLANTING}>种植管理</option>
                <option value={BusinessType.HARVEST}>采收入库</option>
                <option value={BusinessType.PURCHASE}>采购入库</option>
                <option value={BusinessType.OTHER}>其他</option>
              </select>
            </div>

            {/* 业务单号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">业务单号</label>
              <input
                type="text"
                value={businessCode}
                onChange={(e) => setBusinessCode(e.target.value)}
                placeholder="请输入业务单号（可选）"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="请输入备注信息（可选）"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !quantity || parseFloat(quantity) <= 0 || parseFloat(quantity) > availableQuantity}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                出库中...
              </>
            ) : (
              '确认出库'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
