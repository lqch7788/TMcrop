/**
 * 库存冻结弹窗（订单关联 / 手动独立 双模式）
 * 2026-07-02 新建 + Phase 3 订单下拉选择
 * 样式对齐 AddStockModal：Modal 组件 + 渐变绿头部 + 可拖拽缩放最大化
 *
 * 入口：库存表格操作列"冻结"按钮
 * 数据流：组件 → freezeInventory API → POST /api/inventory/freeze → inventory_freeze + inventory_stock
 */
import React, { useState, useEffect } from 'react';
import {
  Snowflake, ShoppingCart, User, AlertCircle, Loader2,
} from 'lucide-react';
import { Modal, FormField } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { freezeInventory, getActiveOrders } from '@/services/inventoryService';
import type { ActiveOrder } from '@/services/inventoryService';
import type { InventoryStock } from '@/types/inventory';

interface FreezeModalProps {
  isOpen: boolean;
  stock: InventoryStock | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type FreezeMode = 'order' | 'manual';

export function FreezeModal({ isOpen, stock, onClose, onSuccess }: FreezeModalProps) {
  const [mode, setMode] = useState<FreezeMode>('manual');
  const [freezeQuantity, setFreezeQuantity] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  // 订单关联状态
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  // 2026-07-14：订单加载失败时显示具体错误（之前失败时无任何提示）
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);

  // 加载活跃订单 + 重置表单
  useEffect(() => {
    if (isOpen) {
      setMode('manual');
      setFreezeQuantity(0);
      setPurpose('');
      setRemarks('');
      setError('');
      setSelectedOrderId('');
      setOrdersLoading(true);
      setOrdersLoadError(null);
      getActiveOrders().then(orders => {
        setActiveOrders(orders);
        setOrdersLoading(false);
      }).catch((e) => {
        console.error('[FreezeModal] 加载活跃订单失败:', e);
        setOrdersLoadError(e instanceof Error ? e.message : '加载订单列表失败');
        setOrdersLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  // 可用冻结上限
  const available = (stock.currentQuantity ?? 0) - (stock.frozenQuantity ?? 0);

  // 提交冻结
  const handleSubmit = async () => {
    setError('');
    if (!stock?.instanceId) return;

    if (freezeQuantity <= 0) {
      setError('请输入有效的冻结数量');
      return;
    }
    if (freezeQuantity > available) {
      setError(`冻结数量不能超过可冻结数量（${available}）`);
      return;
    }
    if (mode === 'manual' && !purpose.trim()) {
      setError('请填写冻结用途');
      return;
    }
    if (mode === 'order' && !selectedOrderId) {
      setError('请选择关联订单');
      return;
    }

    const result = await freezeInventory({
      instanceId: stock.instanceId,
      freezeType: mode,
      freezeQuantity,
      orderId: mode === 'order' ? selectedOrderId : undefined,
      purpose: mode === 'manual' ? purpose.trim() : `订单预留: ${selectedOrder?.orderCode || selectedOrderId}`,
      remarks: remarks.trim() || undefined,
    });

    if (result.success) {
      showAlert(`已成功冻结 ${freezeQuantity} ${stock.unit || ''}`);
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || '冻结失败');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-2">
          <Snowflake className="w-5 h-5 text-white" />
          <span>冻结库存 - {stock.instanceId}</span>
        </div>
      }
      submitText="确认冻结"
      cancelText="取消"
      size="lg"
      width={680}
      height={580}
    >
      <div className="space-y-4">
        {/* 库存概览 */}
        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">当前数量</div>
            <div className="text-lg font-semibold text-gray-900">{stock.currentQuantity} {stock.unit}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">已冻结</div>
            <div className="text-lg font-semibold text-blue-600">{stock.frozenQuantity} {stock.unit}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">可冻结</div>
            <div className="text-lg font-semibold text-emerald-600">{available} {stock.unit}</div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* 冻结方式切换 */}
        <div>
          <Label className="text-gray-700 mb-2">冻结方式</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setMode('manual'); setError(''); }}
              className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                mode === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" />
              手动冻结
            </button>
            <button
              type="button"
              onClick={() => { setMode('order'); setError(''); }}
              className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                mode === 'order'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" />
              关联订单
            </button>
          </div>
        </div>

        {/* 订单关联模式 */}
        {mode === 'order' && (
          <div className="space-y-3">
            <FormField label="选择订单">
              {ordersLoading ? (
                <div className="flex items-center gap-2 py-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载活跃订单中...
                </div>
              ) : ordersLoadError ? (
                <div className="text-sm text-red-600 flex items-start gap-1">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  加载订单失败：{ordersLoadError}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="text-sm text-amber-600 flex items-start gap-1">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  暂无可关联的活跃订单（状态为"进行中"或"已确认"的订单）
                </div>
              ) : (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择订单..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOrders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        <span className="font-mono text-xs">{order.orderCode}</span>
                        <span className="mx-1.5 text-gray-400">|</span>
                        <span className="text-gray-700">{(order.cropName || order.cropVariety) || '-'}</span>
                        {order.cropName && order.cropVariety ? <span className="text-gray-400 ml-0.5">·{order.cropVariety}</span> : null}
                        <span className="ml-2 text-emerald-600 font-medium">{order.plannedQuantity}{order.unit || ''}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {/* 选中订单详情 */}
            {selectedOrder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">订单编号</span>
                    <div className="font-mono font-medium">{selectedOrder.orderCode}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">客户</span>
                    <div className="font-medium">{selectedOrder.customerName || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">作物</span>
                    <div>{selectedOrder.cropName || selectedOrder.cropVariety || '-'}{selectedOrder.cropName && selectedOrder.cropVariety ? ` · ${selectedOrder.cropVariety}` : ''}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">交货日期</span>
                    <div className="font-medium">{selectedOrder.expectedDeliveryDate || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">计划数量</span>
                    <div className="font-medium text-emerald-600">{selectedOrder.plannedQuantity} {selectedOrder.unit || ''}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 冻结数量 */}
        <FormField label={`冻结数量 (${stock.unit || '-'})`}>
          <Input
            type="number"
            min={0}
            max={available}
            value={freezeQuantity || ''}
            onChange={(e) => { setFreezeQuantity(Number(e.target.value) || 0); setError(''); }}
            placeholder={mode === 'order' && selectedOrder ? `订单计划 ${selectedOrder.plannedQuantity}${selectedOrder.unit || ''} | 库存可冻 ${available}` : `最大可冻结: ${available}`}
          />
        </FormField>

        {/* 手动冻结：用途 */}
        {mode === 'manual' && (
          <FormField label="冻结用途">
            <Input
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setError(''); }}
              placeholder="如: 内部留种 / 品质待检 / 实验预留 / ..."
            />
          </FormField>
        )}

        {/* 备注 */}
        <FormField label="备注（可选）">
          <TextArea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="补充说明..."
            rows={2}
          />
        </FormField>
      </div>
    </Modal>
  );
}
