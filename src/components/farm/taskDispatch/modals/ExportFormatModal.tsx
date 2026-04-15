import { Modal } from '../../../ui/Modal';

interface ExportFormatModalProps {
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

export function ExportFormatModal({
  isOpen,
  exportFormat,
  selectedCount,
  onFormatChange,
  onClose,
  onConfirm,
}: ExportFormatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      onSubmit={onConfirm}
      submitText="导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">已选择 {selectedCount} 条数据</p>
        <div className="space-y-3">
          {exportFormats.map((format) => (
            <label
              key={format.value}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                exportFormat === format.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value={format.value}
                checked={exportFormat === format.value}
                onChange={(e) => onFormatChange(e.target.value)}
                className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{format.label}</p>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
