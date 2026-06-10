/**
 * 技术方案导出格式 Modal
 * 2026-06-10：与订单管理页面（src/components/common/ExportFormatModal）100% 对齐
 * - 使用 UnifiedModal
 * - 显式 showMaximize={false} enableDrag={false} enableResize={false}
 * - 选项/文案/颜色与 common 版本完全一致
 *
 * 保留原 props 接口（selectedFormat 必填 + onFormatChange）以兼容父组件调用
 */
import { UnifiedModal } from '@/components/ui';

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
        {EXPORT_FORMAT_OPTIONS.map((format) => (
          <label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              selectedFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-400 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={selectedFormat === format.value}
              onChange={(e) => onFormatChange(e.target.value)}
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
