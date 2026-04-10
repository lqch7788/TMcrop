import { UnifiedModal } from '../../ui/UnifiedModal';

interface ExportTypeModalProps {
  isOpen: boolean;
  exportFileType: string;
  onClose: () => void;
  onConfirm: () => void;
  onTypeChange: (type: string) => void;
}

export function ExportTypeModal({
  isOpen,
  exportFileType,
  onClose,
  onConfirm,
  onTypeChange,
}: ExportTypeModalProps) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出文件类型"
      size="sm"
      showFooter
      onSubmit={onConfirm}
      submitText="确认导出"
      cancelText="取消"
    >
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="xlsx"
            checked={exportFileType === 'xlsx'}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Excel 文件 (.xlsx)</span>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="csv"
            checked={exportFileType === 'csv'}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">CSV 文件 (.csv)</span>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="exportType"
            value="word"
            checked={exportFileType === 'word'}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Word 文件 (.doc)</span>
          </div>
        </label>
      </div>
    </UnifiedModal>
  );
}
