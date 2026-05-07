import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ExecuteEditWarningModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExecuteEditWarningModal: React.FC<ExecuteEditWarningModalProps> = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>编辑后可能存在以下问题：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>该领料单的历史记录可能无法追溯</li>
            <li>已生成的出库单据数据可能不一致</li>
            <li>相关的统计报表数据可能需要重新核算</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecuteEditWarningModal;
console.log('组件创建成功: ExecuteEditWarningModal');
