import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { UnifiedModal } from '../ui/UnifiedModal';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
        {/* 内容区域 */}
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条供应商数据</p>
          <div className="space-y-3">
            {[
              { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
              { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
              { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
            ].map((format) => (
              <Label
                key={format.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Input
                  type="radio"
                  name="exportFormat"
                  value={format.value}
                  checked={exportFormat === format.value}
                  onChange={() => onFormatChange(format.value)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                  <span className="block text-xs text-gray-500">{format.desc}</span>
                </div>
              </Label>
            ))}
          </div>
          {/* 底部按钮 */}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onExport}>
              确认导出
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
