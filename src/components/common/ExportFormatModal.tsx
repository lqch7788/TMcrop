// 统一导出格式选择弹窗组件
import { UnifiedModal } from '../ui/UnifiedModal';

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportFormat?: string;
  exportFileType?: string;
  selectedCount: number;
  onFormatChange?: (format: string) => void;
  onChange?: (format: string) => void;
  onConfirm: () => void;
}

const exportFormats = [
  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
];

export function ExportFormatModal({
  isOpen,
  onClose,
  exportFormat,
  exportFileType,
  selectedCount,
  onFormatChange,
  onChange,
  onConfirm,
}: ExportFormatModalProps) {
  // 兼容两种prop名称
  const currentFormat = exportFormat || exportFileType || 'excel';
  const handleFormatChange = onFormatChange || onChange;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      onSubmit={onConfirm}
      submitText="导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              currentFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={currentFormat === format.value}
              onChange={(e) => handleFormatChange?.(e.target.value)}
              className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </UnifiedModal>
  );
}

// 向后兼容别名 - 支持旧版接口
export const ExportFormatModalLegacy = ExportFormatModal;

export default ExportFormatModal;
