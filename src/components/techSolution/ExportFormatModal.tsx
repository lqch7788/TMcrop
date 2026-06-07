/**
 * 技术方案导出格式 Modal
 * 父组件控制 selectedFormat 和开关
 */
import { Modal } from '@/components/ui';

export interface ExportFormatOption {
  value: string;
  label: string;
  desc: string;
}

export const EXPORT_FORMAT_OPTIONS: ExportFormatOption[] = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
];

export interface ExportFormatModalProps {
  isOpen: boolean;
  selectedCount: number;
  selectedFormat: string;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
}

export function ExportFormatModal({
  isOpen,
  selectedCount,
  selectedFormat,
  onClose,
  onFormatChange,
  onConfirm,
}: ExportFormatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="sm"
      onSubmit={onConfirm}
      submitText="导出"
      cancelText="取消"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedCount} 条数据</p>
        <div className="space-y-3">
          {EXPORT_FORMAT_OPTIONS.map((format) => (
            <div
              key={format.value}
              onClick={() => onFormatChange(format.value)}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                selectedFormat === format.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedFormat === format.value
                    ? 'border-emerald-500'
                    : 'border-gray-400'
                }`}
              >
                {selectedFormat === format.value && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{format.label}</p>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
