// 删除确认对话框组件
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export function DeleteWarningDialog({ isOpen, onClose, onConfirm, title = '确认删除' }: DeleteWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        <div className="p-4">
          <p className="text-gray-600 mb-4">确定要删除选中的供应商吗？此操作不可撤销。</p>
          <ul className="list-disc list-inside text-sm text-gray-500 mb-4">
            <li>删除后将无法恢复数据</li>
            <li>相关联的业务记录可能会受到影响</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BatchDeleteConfirmDialogProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteConfirmDialog({ isOpen, count, onClose, onConfirm }: BatchDeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">批量删除确认</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            确定要删除选中的 <span className="font-bold text-red-600">{count}</span> 个供应商吗？此操作不可撤销。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
