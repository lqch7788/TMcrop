/**
 * 施肥管理 - 导出格式选择弹窗
 * 2026-07-19 P2：100% 对齐 components/common/ExportFormatModal（参照种源/育苗/种植/订单/出库）
 *   - 边框样式：border-gray-200 hover:border-gray-400（已 OK）
 *   - 去除文件类型图标（FileText/FileSpreadsheet/FileType）
 *   - 文案统一："已选择 X 条数据"（之前是"当前筛选条件下共 X 条施肥记录"）
 *   - 默认格式 'xlsx'（之前 'csv'，与种源统一）
 *
 * 保留 3 种自定义格式（XLSX / CSV / PDF）：
 *   - 与通用 ExportFormatModal (excel/csv/word) 不同 —— 施肥业务需要 PDF 报表
 *   - 保留 FertilizerPage.onConfirm(format: 'csv'|'xlsx'|'pdf') 接口（调用方 0 改动）
 */

import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';

interface FertilizerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 已选中行数（参照通用 ExportFormatModal 接口名） */
  selectedCount: number;
  /** 选择格式后调起，保留 Fertilizer 自有 'csv' | 'xlsx' | 'pdf' 三选一 */
  onConfirm: (format: 'csv' | 'xlsx' | 'pdf') => void;
}

// 3 种导出格式（保留 Fertilizer 自有 PDF；样式按 ExportFormatModal 通用）
const exportFormats = [
  { value: 'xlsx' as const, label: 'Excel (.xlsx)', desc: '前端生成，明细 + 汇总双 sheet' },
  { value: 'csv' as const, label: 'CSV (.csv)', desc: '后端生成，适用于数据交换' },
  { value: 'pdf' as const, label: 'PDF (.pdf)', desc: '前端 jspdf 生成，限 ≤ 2000 行' },
];

export default function FertilizerExportModal({ isOpen, onClose, selectedCount, onConfirm }: FertilizerExportModalProps) {
  // 默认 xlsx（参照种源/出库：默认第一项 Excel）
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');

  // 2026-07-19 P2：100% 对齐 common/ExportFormatModal 样式
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
                name="fertilizerExportFormat"
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