// ExecuteTabExportTypeModal 组件
// 导出类型选择弹窗
import { X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ExportTypeModalProps {
  // 弹窗状态
  isOpen: boolean;
  exportFileType: string;

  // 回调函数
  onChange: (type: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ExportTypeModal({
  isOpen,
  exportFileType,
  onChange,
  onConfirm,
  onClose,
}: ExportTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">选择导出格式</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              exportFileType === 'xlsx' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}>
              <input
                type="radio"
                name="exportType"
                value="xlsx"
                checked={exportFileType === 'xlsx'}
                onChange={() => onChange('xlsx')}
                className="sr-only"
              />
              <span className="text-lg font-medium text-gray-900">Excel</span>
              <span className="text-xs text-gray-500">.xlsx</span>
            </label>
            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              exportFileType === 'csv' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}>
              <input
                type="radio"
                name="exportType"
                value="csv"
                checked={exportFileType === 'csv'}
                onChange={() => onChange('csv')}
                className="sr-only"
              />
              <span className="text-lg font-medium text-gray-900">CSV</span>
              <span className="text-xs text-gray-500">.csv</span>
            </label>
            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              exportFileType === 'word' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}>
              <input
                type="radio"
                name="exportType"
                value="word"
                checked={exportFileType === 'word'}
                onChange={() => onChange('word')}
                className="sr-only"
              />
              <span className="text-lg font-medium text-gray-900">Word</span>
              <span className="text-xs text-gray-500">.doc</span>
            </label>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            确认导出
          </Button>
        </div>
      </div>
    </div>
  );
}
