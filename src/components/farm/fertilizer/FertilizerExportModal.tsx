/**
 * 施肥管理 - 导出格式选择弹窗 (V2 改造 2026-07-12)
 * 对齐作物库存 OutboundExportModal 的设计模式
 */
import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';
import { FileText, FileSpreadsheet, FileType } from 'lucide-react';

interface FertilizerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowCount: number;
  onConfirm: (format: 'csv' | 'xlsx' | 'pdf') => void;
}

const exportFormats = [
  { value: 'csv' as const, label: 'CSV (.csv)', desc: '后端生成，适用于数据交换', icon: FileText },
  { value: 'xlsx' as const, label: 'Excel (.xlsx)', desc: '前端生成，明细 + 汇总双 sheet', icon: FileSpreadsheet },
  { value: 'pdf' as const, label: 'PDF (.pdf)', desc: '前端 jspdf 生成，限 ≤ 2000 行', icon: FileType },
];

export default function FertilizerExportModal({ isOpen, onClose, rowCount, onConfirm }: FertilizerExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter
      onSubmit={() => onConfirm(format)}
      submitText="导出"
      cancelText="取消"
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
    >
      <p className="text-sm text-gray-500 mb-4">
        当前筛选条件下共 <span className="font-semibold text-gray-900">{rowCount.toLocaleString()}</span> 条施肥记录
      </p>
      <div className="space-y-3">
        {exportFormats.map((f) => {
          const Icon = f.icon;
          const selected = format === f.value;
          return (
            <label
              key={f.value}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                selected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="fertilizerExportFormat"
                value={f.value}
                checked={selected}
                onChange={() => setFormat(f.value)}
                className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
              />
              <Icon className={`ml-3 w-5 h-5 ${selected ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="ml-2">
                <span className="block text-sm font-medium text-gray-900">{f.label}</span>
                <span className="block text-xs text-gray-500">{f.desc}</span>
              </div>
            </label>
          );
        })}
      </div>
    </UnifiedModal>
  );
}
