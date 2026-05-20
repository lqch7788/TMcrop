/**
 * 导出格式选择弹窗组件
 */

import { ExportFormat, EXPORT_FORMATS } from './types';
import { UnifiedModal } from '../ui/UnifiedModal';
import { Label } from '../ui/label';

interface ExportModalProps {
  isOpen: boolean;
  selectedCount: number;
  exportFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportModal({
  isOpen,
  selectedCount,
  exportFormat,
  onFormatChange,
  onClose,
  onConfirm,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      showFooter={true}
      onSubmit={onConfirm}
      submitText="导出"
      cancelText="取消"
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {EXPORT_FORMATS.map((format) => {
          const selected = exportFormat === format.value;
          return (
          <Label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              selected
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onFormatChange(format.value)}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-emerald-600' : 'border-gray-300'}`}>
              {selected && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        );
        })}
      </div>
    </UnifiedModal>
  );
}
