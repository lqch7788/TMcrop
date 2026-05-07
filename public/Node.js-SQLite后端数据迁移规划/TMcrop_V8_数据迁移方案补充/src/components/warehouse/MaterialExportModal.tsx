import { useState } from 'react';
import { UnifiedModal } from '../ui/UnifiedModal';

interface MaterialExportModalProps {
  isOpen: boolean;
  selectedCount: number;
  exportFormat: string;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onExport: () => void;
}

export function MaterialExportModal({
  isOpen,
  selectedCount,
  exportFormat,
  onClose,
  onFormatChange,
  onExport,
}: MaterialExportModalProps) {
  if (!isOpen) return null;

  const formats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      onSubmit={onExport}
      submitText="导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="space-y-3">
        {formats.map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={exportFormat === format.value}
              onChange={(e) => onFormatChange(e.target.value)}
              className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </UnifiedModal>
  );
}
