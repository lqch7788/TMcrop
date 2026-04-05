import { Edit } from 'lucide-react';

interface EditAlertModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  onVoidApply: () => void;
}

export function EditAlertModal({ open, message, onClose, onVoidApply }: EditAlertModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Edit className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">无法编辑</h3>
              <p className="text-sm text-gray-500">退料单状态限制</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              {message}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              知道了
            </button>
            <button
              onClick={() => {
                onClose();
                onVoidApply();
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              前往作废申请
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
