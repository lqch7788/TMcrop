/**
 * 交付记录弹窗
 */
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import type { CropOrder } from '@/types/crop';

interface DeliveryModalProps {
  isOpen: boolean;
  order: CropOrder | null;
  onClose: () => void;
  onSave: (data: { deliveryBatch: number; deliveryQuantity: number; deliveryDate: string }) => void;
}

export default function DeliveryModal({ isOpen, order, onClose, onSave }: DeliveryModalProps) {
  const [deliveryBatch, setDeliveryBatch] = useState(1);
  const [deliveryQuantity, setDeliveryQuantity] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && order) {
      // TODO: 从后端获取已交付批次数量来计算下一批次号
      setDeliveryBatch(1);
      setDeliveryQuantity(0);
      setDeliveryDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, order]);

  const handleSave = () => {
    onSave({ deliveryBatch, deliveryQuantity, deliveryDate });
  };

  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button size="sm" variant="secondary" onClick={onClose}>取消</Button>
      <Button size="sm" variant="default" onClick={handleSave}>确认交付</Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="添加交付记录" size="md" showFooter={true} footer={footer}>
      <div className="space-y-4">
        <div>
          <Label className="text-gray-700">订单编号</Label>
          <Input value={order?.orderCode || ''} disabled className="border-gray-300 bg-gray-50" />
        </div>
        <div>
          <Label className="text-gray-700">交付批次</Label>
          <Input
            type="number"
            value={deliveryBatch}
            onChange={(e) => setDeliveryBatch(parseInt(e.target.value) || 1)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="text-gray-700">交付数量</Label>
          <Input
            type="number"
            value={deliveryQuantity}
            onChange={(e) => setDeliveryQuantity(parseInt(e.target.value) || 0)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="text-gray-700">交付日期</Label>
          <DatePicker
            selected={new Date(deliveryDate)}
            onChange={(date) => setDeliveryDate(date.toISOString().split('T')[0])}
            className={deepInputClass}
          />
        </div>
      </div>
    </Modal>
  );
}
