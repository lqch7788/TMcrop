// 供应商导出弹窗组件
import { Download, X } from 'lucide-react';

interface SupplierExportModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onExport: () => void;
}

export default function SupplierExportModal({ isOpen, exportFormat, selectedCount, onClose, onFormatChange, onExport }: SupplierExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">导出供应商数据</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            已选择 <span className="font-bold text-emerald-600">{selectedCount}</span> 条数据
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportFormat"
                value="excel"
                checked={exportFormat === 'excel'}
                onChange={() => onFormatChange('excel')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Excel 格式 (.xls)</span>
                <p className="text-xs text-gray-500">适用于 Excel 等表格软件打开</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={() => onFormatChange('csv')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">CSV 格式 (.csv)</span>
                <p className="text-xs text-gray-500">逗号分隔值，通用数据格式</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportFormat"
                value="word"
                checked={exportFormat === 'word'}
                onChange={() => onFormatChange('word')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Word 格式 (.doc)</span>
                <p className="text-xs text-gray-500">适用于 Word 文档打开</p>
              </div>
            </label>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button onClick={onExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            确认导出
          </button>
        </div>
      </div>
    </div>
  );
}
