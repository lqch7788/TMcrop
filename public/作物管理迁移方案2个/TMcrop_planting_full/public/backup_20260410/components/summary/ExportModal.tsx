/**
 * 导出格式选择弹窗组件
 */

import { ExportFormat, EXPORT_FORMATS } from './types';
import { UnifiedModal } from '../ui/UnifiedModal';

interface ExportModalProps {
  isOpen: boolean;
  selectedCount: number;
  exportFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportModal({
  isOpen,
  selectedCount,
  exportFormat,
  onFormatChange,
  onClose,
  onConfirm,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      showFooter={true}
      onSubmit={onConfirm}
      submitText="导出"
      cancelText="取消"
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {EXPORT_FORMATS.map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={exportFormat === format.value}
              onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
              className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </UnifiedModal>
  );
}
