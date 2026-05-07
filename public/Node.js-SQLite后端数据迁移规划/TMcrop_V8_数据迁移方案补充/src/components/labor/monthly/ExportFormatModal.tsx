/**
 * 导出格式选择弹窗组件
 */

import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { EXPORT_FORMATS } from './types';

interface ExportFormatModalProps {
  isOpen: boolean;
  selectedCount: number;
  exportFormat: 'excel' | 'csv' | 'word';
  onFormatChange: (format: 'excel' | 'csv' | 'word') => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportFormatModal({
  isOpen,
  selectedCount,
  exportFormat,
  onFormatChange,
  onClose,
  onConfirm,
}: ExportFormatModalProps) {
  if (!isOpen) return null;

  const content = (
    <div>
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
              onChange={(e) => onFormatChange(e.target.value as 'excel' | 'csv' | 'word')}
              className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={onClose}
        className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
      >
        取消
      </button>
      <button
        onClick={onConfirm}
        className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
      >
        导出
      </button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      headerAction={
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
