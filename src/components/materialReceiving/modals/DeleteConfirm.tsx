import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
              <p className="text-sm text-gray-500">此操作不可恢复</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>警告：</strong> 删除此领料记录可能会导致相关数据丢失，无法恢复。请确认是否继续删除操作。
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6">确定要删除这条领料记录吗？</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirm;
console.log('组件创建成功: DeleteConfirm');
