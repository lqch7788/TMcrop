/**
 * 施肥管理 - 导出格式选择弹窗
 * 支持 CSV / Excel / Word 三种格式
 */
import React, { useState } from 'react';
import { Download, File, FileSpreadsheet, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui';

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
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-emerald-700">
            <X className="w-4 h-4" />
          </Button>
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
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button variant="default" size="sm" onClick={() => onConfirm(format)}>
            <Download className="w-4 h-4" /> 确认导出
          </Button>
        </div>
      </div>
    </div>
  );
}
