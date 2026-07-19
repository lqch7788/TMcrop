/**
 * 出库记录导出格式选择弹窗
 * 2026-07-19 P2：完全 100% 对齐 components/common/ExportFormatModal 样式 + 选择模式
 *   - 边框样式 border-gray-200 hover:border-gray-400（修复"边框粗黑"差异）
 *   - 格式列表 Excel / CSV / Word（移除 PDF，对齐种源；原 PDF 报表改由 XLSX 双 sheet 替代）
 *   - radio 边框 border-gray-300（与种源 ExportFormatModal 一致）
 *
 * 与 common/ExportFormatModal 差异（按"100% 一样"严格对齐）：
 *   - 保留独立 OutboundExportModal 文件（不影响其他页面）
 *   - 格式限定 csv/xlsx/word（业务决定，不接受自定义 props）
 *   - 必传 selectedCount（参照 SeedSource 强制勾选 + ExportFormatModal 字段名）
 */

import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';

interface OutboundExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 已选中行数（> 0 才有意义，参照 SeedSource 强制勾选） */
  selectedCount: number;
  /** 选择格式后调起，format='excel'|'csv'|'word'（对齐 ExportFormatModal） */
  onConfirm: (format: 'excel' | 'csv' | 'word') => void;
}

// 3 种导出格式（2026-07-19 P2：与 common/ExportFormatModal 100% 一致）
//   excel → 前端 xlsx 双 sheet（明细 + 汇总，原 PDF 报表功能并入）
//   csv   → 后端生成
//   word  → 前端 docx（与种源一致，备用）
const exportFormats = [
  { value: 'excel' as const, label: 'Excel (.xlsx)', desc: '前端生成，明细 + 汇总双 sheet' },
  { value: 'csv' as const, label: 'CSV (.csv)', desc: '后端生成，适用于数据交换' },
  { value: 'word' as const, label: 'Word (.docx)', desc: '前端生成，适用于文档编辑和分享' },
];

export function OutboundExportModal({ isOpen, onClose, selectedCount, onConfirm }: OutboundExportModalProps) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'word'>('excel');

  // 2026-07-19 P2：完全按 common/ExportFormatModal 样式
  //   - size="md" 默认（500px 居中布局，与 SeedSource 一致）
  //   - 边框：border-gray-200（默认浅边框） + hover:border-gray-400（hover 加深）
  //   - 选中：border-emerald-500 bg-emerald-50
  //   - radio 边框：border-gray-300
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
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount.toLocaleString()} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((f) => {
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
              <div className="ml-3">
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