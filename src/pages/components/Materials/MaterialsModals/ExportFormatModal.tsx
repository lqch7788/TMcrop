/**
 * 导出格式选择弹窗组件
 */
import { Button } from '../../../../components/ui/button';

import { Download, X } from 'lucide-react';

interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedRowsCount: number;
  onClose: () => void;
  onExportFormatChange: (format: string) => void;
  onDoExport: () => void;
}

export default function ExportFormatModal({
  isOpen,
  exportFormat,
  selectedRowsCount,
  onClose,
  onExportFormatChange,
  onDoExport,
}: ExportFormatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white flex items-center justify-between">
          <h3 className="font-semibold">选择导出格式</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            已选择 <span className="text-emerald-600 font-medium">{selectedRowsCount}</span> 条数据
          </p>
          <div className="flex justify-center gap-3 mb-6">
            <Button
              variant={exportFormat === 'excel' ? 'blue' : 'ghost'}
              onClick={() => onExportFormatChange('excel')}
            >
              Excel (.xls)
            </Button>
            <Button
              variant={exportFormat === 'csv' ? 'blue' : 'ghost'}
              onClick={() => onExportFormatChange('csv')}
            >
              CSV (.csv)
            </Button>
            <Button
              variant={exportFormat === 'word' ? 'blue' : 'ghost'}
              onClick={() => onExportFormatChange('word')}
            >
              Word (.doc)
            </Button>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
            <Button variant="blue" onClick={onDoExport}><Download className="w-4 h-4" /> 确认导出</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
