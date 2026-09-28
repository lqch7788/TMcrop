/**
 * 生产退料导出格式选择弹窗
 * 复用 UnifiedModal，选项/文案与 common/techSolution 导出弹窗保持一致
 * 保留原 props 接口（exportFileType + onTypeChange）以兼容父组件调用
 */
import { UnifiedModal } from '@/components/ui';

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
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter
      onSubmit={onConfirm}
      submitText="确认导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <div className="space-y-3">
        {[
          { value: 'xlsx', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
          { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
          { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
        ].map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFileType === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="exportType"
              value={format.value}
              checked={exportFileType === format.value}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-4 h-4 text-emerald-600 border-gray-400 focus:ring-emerald-500"
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
