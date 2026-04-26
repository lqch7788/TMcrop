/**
 * 导出格式选择弹窗
 */

import React from 'react';
import { X, FileText, FileSpreadsheet } from 'lucide-react';

interface ExportFormatModalProps {
  isOpen: boolean;
  exportFileType: string;
  onChange: (type: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export function ExportFormatModal({
  isOpen,
  exportFileType,
  onChange,
  onClose,
  onConfirm,
  selectedCount,
}: ExportFormatModalProps) {
  if (!isOpen) return null;

  const formatOptions = [
    { value: 'xlsx', label: 'Excel 文件 (.xls)', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV 文件 (.csv)', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">选择导出格式</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            已选择 <span className="font-medium text-emerald-600">{selectedCount}</span> 条数据
          </p>

          <div className="space-y-2">
            {formatOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  exportFileType === option.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  value={option.value}
                  checked={exportFileType === option.value}
                  onChange={() => onChange(option.value)}
                  className="w-4 h-4 text-emerald-600"
                />
                <option.icon className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            确认导出
          </button>
        </div>
      </div>
    </div>
  );
}
