/**
 * 公告删除确认弹窗组件
 */
import { Trash2 } from 'lucide-react';
import type { Notice } from '../../../types/announcement.types';
import { Button } from '../../../../components/ui/button';

interface DeleteModalProps {
  isOpen: boolean;
  item: Notice | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ isOpen, item, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
          <p className="text-gray-600 mb-1">确定要删除公告「{item.title}」吗？</p>
          <p className="text-gray-400 text-sm mb-6">删除后无法恢复</p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
            <Button variant="destructive" size="sm" onClick={onConfirm}>确认删除</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
