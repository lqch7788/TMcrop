/**
 * 指标删除确认弹窗组件
 */
import { Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Modal } from '../../../../components/ui/Modal';
import type { Indicator } from '../../../types/indicators.types';

interface DeleteModalProps {
  isOpen: boolean;
  item: Indicator | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, item, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen || !item) return null;

  // 底部按钮
  const footer = (
    <div className="flex justify-center gap-3">
      <Button size="sm" variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button size="sm" variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4" /> 确认删除</Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="确认删除"
      size="sm"
      showFooter={true}
      footer={footer}
      showMaximize={false}
      enableDrag={true}
      enableResize={true}
    >
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
        <p className="text-gray-600 mb-1">确定要删除指标「{item.name}」吗？</p>
        <p className="text-gray-400 text-sm">删除后无法恢复</p>
      </div>
    </Modal>
  );
}
