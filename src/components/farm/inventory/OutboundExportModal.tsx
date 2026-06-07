/**
 * 出库记录导出格式选择弹窗 (V3.1)
 * 复用 components/common/ExportFormatModal 模式（UnifiedModal + 单选列表）
 * 但格式改为出库记录专用：CSV / XLSX / PDF
 *
 * 复用了：
 * - components/common/ExportFormatModal 的交互模式（UnifiedModal + 单选 + 底部按钮）
 * - 订单管理页面 OutboundExportModal 的布局风格
 *
 * 不复用：
 * - 不复用 common/ExportFormatModal 本身（它的格式是 excel/csv/word，不匹配出库需求）
 *   按"组件模式" — 现有组件不满足需求时新建，但用同样的设计语言
 */

import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';
import { FileText, FileSpreadsheet, FileType } from 'lucide-react';

interface OutboundExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowCount: number;
  /** 选择格式后调起，format='csv'|'xlsx'|'pdf' */
  onConfirm: (format: 'csv' | 'xlsx' | 'pdf') => void;
}

// 3 种导出格式（与设计文档 4.2 节对应）
// CSV 走后端 / XLSX 走前端 xlsx / PDF 走前端 jspdf
const exportFormats = [
  {
    value: 'csv' as const,
    label: 'CSV (.csv)',
    desc: '后端生成，适用于数据交换',
    icon: FileText,
  },
  {
    value: 'xlsx' as const,
    label: 'Excel (.xlsx)',
    desc: '前端生成，明细 + 汇总双 sheet',
    icon: FileSpreadsheet,
  },
  {
    value: 'pdf' as const,
    label: 'PDF (.pdf)',
    desc: '前端 jspdf 生成，限 ≤ 2000 行',
    icon: FileType,
  },
];

export function OutboundExportModal({ isOpen, onClose, rowCount, onConfirm }: OutboundExportModalProps) {
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
        当前筛选条件下共 <span className="font-semibold text-gray-900">{rowCount.toLocaleString()}</span> 条出库记录
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
                name="outboundExportFormat"
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
