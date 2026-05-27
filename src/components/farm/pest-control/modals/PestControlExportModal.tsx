/**
 * 病虫害防治管理 - 导出格式选择弹窗
 * 支持 CSV / Excel / Word 三种格式
 */
import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, File } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';

interface PestControlExportModalProps {
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

export function PestControlExportModal({ isOpen, onClose, onConfirm, selectedCount }: PestControlExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'word'>('xlsx');

  if (!isOpen) return null;

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="导出格式选择" size="md" showFooter={false}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          已选择 <span className="font-semibold text-emerald-600">{selectedCount}</span> 条记录
        </p>
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
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" size="sm" onClick={() => onConfirm(format)}>
            确认导出
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
