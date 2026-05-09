/**
 * 公告导出弹窗组件
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
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-700 mb-2">
            确认导出 <span className="text-blue-600 font-medium">{exportCount}</span> 条数据
          </p>
          <p className="text-gray-500 text-sm mb-4">选择导出格式：</p>
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => onFormatChange('excel')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                exportFormat === 'excel'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => onFormatChange('csv')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                exportFormat === 'csv'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              CSV (.csv)
            </button>
            <button
              onClick={() => onFormatChange('word')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                exportFormat === 'word'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              Word (.docx)
            </button>
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
