import React from 'react';
import { Trash2 } from 'lucide-react';

interface VoidModalProps {
  voidReason: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  recordCode?: string;
}

export const VoidModal: React.FC<VoidModalProps> = ({
  voidReason,
  onChange,
  onSubmit,
  onCancel,
  recordCode,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">作废申请</h3>
              <p className="text-sm text-gray-500">请填写作废原因</p>
            </div>
          </div>
          {recordCode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
              <p className="font-mono text-gray-900">{recordCode}</p>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              作废原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => onChange(e.target.value)}
              placeholder="请输入作废原因"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              确认申请
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoidModal;
console.log('组件创建成功: VoidModal');
