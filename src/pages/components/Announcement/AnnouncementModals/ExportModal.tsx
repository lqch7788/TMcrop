/**
 * 公告导出弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';

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
  const exportCount = selectedCount > 0 ? selectedCount : totalCount;

  const formats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

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
      <div className="space-y-3">
        <p className="text-gray-600 text-sm mb-2">
          确认导出 <span className="text-blue-600 font-medium">{exportCount}</span> 条数据
        </p>
        {formats.map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400'
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
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </UnifiedModal>
  );
}
