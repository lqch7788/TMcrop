/**
 * 施肥管理 - 导出格式选择弹窗
 * 支持 CSV / Excel / Word 三种格式
 */
import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, File } from 'lucide-react';

interface FertilizerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: 'csv' | 'xlsx' | 'word') => void;
  selectedCount: number;
}

const FORMATS = [
  { key: 'csv' as const, label: 'CSV', description: '逗号分隔文本，通用性最好', icon: <FileText className="w-8 h-8" /> },
  { key: 'xlsx' as const, label: 'Excel', description: 'Microsoft Excel 表格格式', icon: <FileSpreadsheet className="w-8 h-8" /> },
  { key: 'word' as const, label: 'Word', description: '可直接打印的文档格式', icon: <File className="w-8 h-8" /> },
];

export default function FertilizerExportModal({ isOpen, onClose, onConfirm, selectedCount }: FertilizerExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'word'>('xlsx');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">导出格式选择</h3>
          <button onClick={onClose} className="text-white hover:bg-emerald-700 p-1.5 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">已选择 <span className="font-semibold text-emerald-600">{selectedCount}</span> 条记录</p>
          <div className="space-y-3">
            {FORMATS.map((f) => (
              <div
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3
                  ${format === f.key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
              >
                <div className={`${format === f.key ? 'text-emerald-600' : 'text-gray-400'}`}>{f.icon}</div>
                <div>
                  <div className="font-medium text-sm text-gray-800">{f.label}</div>
                  <div className="text-xs text-gray-500">{f.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            取消
          </button>
          <button onClick={() => onConfirm(format)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
            确认导出
          </button>
        </div>
      </div>
    </div>
  );
}
