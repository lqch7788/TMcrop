import { useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
          <div className="space-y-3">
            {formats.map((format) => (
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
          <button
            onClick={onExport}
            disabled={selectedCount === 0}
            className="w-full mt-6 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
}
