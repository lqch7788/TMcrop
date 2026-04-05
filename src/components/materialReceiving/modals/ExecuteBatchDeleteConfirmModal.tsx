import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ExecuteBatchDeleteConfirmModalProps {
  show: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExecuteBatchDeleteConfirmModal: React.FC<ExecuteBatchDeleteConfirmModalProps> = ({
  show,
  count,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            批量删除确认
          </h3>
          <button onClick={onCancel} className="text-white hover:bg-red-700 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">警告：批量删除领料出库记录将造成严重后果！</h4>
              <p className="text-sm text-gray-500 mt-1">
                您正在删除 <strong>{count}</strong> 项领料出库记录
              </p>
              <ul className="text-sm text-red-500 mt-2 space-y-1">
                <li>• 此操作将删除所有选中的领料出库记录</li>
                <li>• 相关物料明细也将被删除</li>
                <li>• 历史数据将无法恢复</li>
                <li>• 可能导致库存数据错乱</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            此操作不可撤销！请确认是否继续删除？
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecuteBatchDeleteConfirmModal;
console.log('组件创建成功: ExecuteBatchDeleteConfirmModal');
