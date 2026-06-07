import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';

interface OvertimeExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const exportFormats = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
];

export function OvertimeExportFormatModal({
  isOpen,
  exportFormat,
  selectedCount,
  onFormatChange,
  onClose,
  onConfirm,
}: OvertimeExportFormatModalProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      showFooter={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedCount} 条数据</p>
        <div className="space-y-3">
          {exportFormats.map((format) => (
            <Label
              key={format.value}
              onClick={() => onFormatChange(format.value)}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                exportFormat === format.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
                {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{format.label}</p>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            </Label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={onConfirm}>导出</Button>
      </div>
    </UnifiedModal>
  );
}
