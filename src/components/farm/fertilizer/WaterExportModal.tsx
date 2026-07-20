/**
 * 浇水管理 - 导出格式选择弹窗
 * 2026-07-20：100% 对齐 components/common/ExportFormatModal 风格（参照施肥/病虫害弹窗）
 *   - 边框样式：border-gray-200 hover:border-gray-400（细边框）
 *   - radio 边框：border-gray-300
 *   - 文案统一："已选择 X 条数据"
 *   - 标题"选择导出格式"
 *   - 不带大图标，紧凑布局
 *
 * 浇水自有格式：csv / xlsx / word（与通用 ExportFormatModal 一致）
 */

import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';

interface WaterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 已选中行数（参照通用 ExportFormatModal 接口名） */
  selectedCount: number;
  /** 选择格式后调起 */
  onConfirm: (format: 'csv' | 'xlsx' | 'word') => void;
}

// 3 种导出格式（与通用 ExportFormatModal 100% 一致）
const exportFormats = [
  { value: 'xlsx' as const, label: 'Excel (.xlsx)', desc: '前端生成，明细 + 汇总双 sheet' },
  { value: 'csv' as const, label: 'CSV (.csv)', desc: '后端生成，适用于数据交换' },
  { value: 'word' as const, label: 'Word (.docx)', desc: '前端生成，适用于文档编辑和分享' },
];

export function WaterExportModal({ isOpen, onClose, selectedCount, onConfirm }: WaterExportModalProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'word'>('xlsx');

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
                name="waterExportFormat"
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

export default WaterExportModal;