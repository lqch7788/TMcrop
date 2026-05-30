import { Trash2 } from 'lucide-react';
import { ReturnRecord } from '../types';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface VoidModalProps {
  open: boolean;
  record: ReturnRecord | null;
  voidReason: string;
  onClose: () => void;
  onSubmit: () => void;
  onReasonChange: (reason: string) => void;
}

export function VoidModal({
  open,
  record,
  voidReason,
  onClose,
  onSubmit,
  onReasonChange,
}: VoidModalProps) {
  if (!open || !record) return null;

  // 获取物料概略信息
  const materialSummary = record.materials?.length > 0
    ? record.materials.slice(0, 3).map(m => m.materialName).join('、')
    : '无';
  const moreCount = (record.materials?.length || 0) > 3 ? `等${record.materials.length}项` : '';

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
          {/* 退料单概略信息 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">退料单号：</span>
                <span className="font-mono font-medium text-gray-900">{record.code}</span>
              </div>
              <div>
                <span className="text-gray-500">申请人：</span>
                <span className="text-gray-900">{record.applicant}</span>
              </div>
              <div>
                <span className="text-gray-500">退料部门：</span>
                <span className="text-gray-900">{record.department}</span>
              </div>
              <div>
                <span className="text-gray-500">物料数量：</span>
                <span className="text-gray-900">{record.materials?.length || 0} 项</span>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-gray-500">物料名称：</span>
              <span className="text-gray-900">{materialSummary}{moreCount}</span>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作废原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="请输入作废原因"
              rows={4}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${deepInputClass}`}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              提交作废申请
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
