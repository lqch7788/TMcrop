// 供应商导出弹窗组件
import { Download } from 'lucide-react';
import { UnifiedModal } from '../ui/UnifiedModal';

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
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="导出供应商数据"
      size="sm"
      showFooter={true}
      showMaximize={false}
      enableResize={false}
      onSubmit={onExport}
      submitText="确认导出"
      cancelText="取消"
      headerAction={<Download className="w-5 h-5 text-emerald-600" />}
    >
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
    </UnifiedModal>
  );
}
