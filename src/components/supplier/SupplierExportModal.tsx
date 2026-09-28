// 供应商导出格式选择弹窗 — 复用 UnifiedModal，与生产退料/物料导出弹窗保持一致
import { UnifiedModal } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';

interface SupplierExportModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onExport: () => void;
}

export default function SupplierExportModal({ isOpen, exportFormat, selectedCount, onClose, onFormatChange, onExport }: SupplierExportModalProps) {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter
      onSubmit={onExport}
      submitText="确认导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条供应商数据</p>
      <div className="space-y-3">
        {[
          // 2026-09-28 审计修复：标签与实际产物一致（此前写 .xlsx 实为 HTML 伪装的 .xls，Excel 会提示格式不符）
          { value: 'excel', label: 'Excel (.xls)', desc: '适用于数据分析和处理' },
          { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
          { value: 'word', label: 'Word (.doc)', desc: '适用于文档编辑和分享' },
        ].map((format) => (
          <Label
            key={format.value}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <Input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={exportFormat === format.value}
              onChange={() => onFormatChange(format.value)}
              className="w-4 h-4 text-emerald-600 border-gray-400 focus:ring-emerald-500"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </Label>
        ))}
      </div>
    </UnifiedModal>
  );
}
