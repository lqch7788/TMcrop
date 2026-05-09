/**
 * 指标导出弹窗组件
 */
import { Download } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface ExportModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  totalCount: number;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
}

export default function ExportModal({
  isOpen,
  exportFormat,
  selectedCount,
  totalCount,
  onClose,
  onFormatChange,
  onConfirm,
}: ExportModalProps) {
  if (!isOpen) return null;

  const exportCount = selectedCount > 0 ? selectedCount : totalCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出数据
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white">
            &times;
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-700 mb-2">
            确认导出 <span className="text-blue-600 font-medium">{exportCount}</span> 条数据
          </p>
          <p className="text-gray-500 text-sm mb-4">选择导出格式：</p>
          <div className="flex justify-center gap-3 mb-6">
            <Button
              variant={exportFormat === 'excel' ? 'blue' : 'ghost'}
              onClick={() => onFormatChange('excel')}
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant={exportFormat === 'csv' ? 'blue' : 'ghost'}
              onClick={() => onFormatChange('csv')}
            >
              CSV (.csv)
            </Button>
            <Button
              variant={exportFormat === 'word' ? 'blue' : 'ghost'}
              onClick={() => onFormatChange('word')}
            >
              Word (.docx)
            </Button>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button variant="blue" onClick={onConfirm}>确认导出</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
