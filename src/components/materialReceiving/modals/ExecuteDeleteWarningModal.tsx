import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecuteDeleteWarningModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExecuteDeleteWarningModal: React.FC<ExecuteDeleteWarningModalProps> = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">批量删除警告</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>删除后可能存在以下问题：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>所有选中的领料出库单将被永久删除</li>
            <li>相关的物料明细也将被删除</li>
            <li>历史数据将无法恢复</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            确认
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExecuteDeleteWarningModal;
console.log('组件创建成功: ExecuteDeleteWarningModal');
