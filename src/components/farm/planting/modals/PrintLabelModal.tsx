/**
 * 种植标签打印弹窗 — 薄包装（2026-08-19 抽取共享组件）
 * 实际实现见 src/components/farm/labels/LabelPrintModal.tsx（config 驱动）
 * 本文件保留原路径/导出名，调用方零改动。
 */
import { LabelPrintModal, type LabelPrintConfig } from '@/components/farm/labels/LabelPrintModal';
import type { Planting } from '@/types/crop';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Planting;
}

// 种植模块差异配置（快捷口径按钮动态计算，在组件内注入）
const PLANTING_CONFIG: LabelPrintConfig = {
  module: 'planting',
  codeField: 'plantCode',
  areaField: 'areaName',
  dateField: 'plantingDate',
  linkField: 'plantingId',
  route: '/crop/planting',
  exportTitle: '种植标签',
  qrType: 'planting',
  showLabelType: true,
  count: (r) => {
    const surviving = Math.max(0, (r?.plantingCount || 0) + (r?.supplementCount || 0) - (r?.lossCount || 0));
    return surviving || (r?.plantingCount || 0);
  },
  surviving: (r) => Math.max(0, (r?.plantingCount || 0) + (r?.supplementCount || 0) - (r?.lossCount || 0)),
  previewRight: (r, surviving) => [
    { label: '种植数量', value: (r?.plantingCount ?? 0).toLocaleString(), cls: 'emerald-bold' },
    { label: '剩余数量', value: surviving.toLocaleString(), cls: 'emerald-bold' },
    { label: '种植日期', value: r?.plantingDate || '-' },
  ],
  qrExtra: (r) => ({
    sourceCode: r?.sourceCode,
    cropCode: r?.cropCode,
    cropName: r?.cropName,
    variety: r?.cropVariety,
    site: r?.areaName,
    date: r?.plantingDate,
  }),
  qrQuantity: (_r, surviving) => surviving,
  exportCols: { areaHeader: '种植区域', codeHeader: '种植批号', dateHeader: '种植日期' },
};

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  // 种植快捷口径（初始/剩余/新增）
  const initialQuantity = record?.plantingCount || 0;
  const currentSurviving = Math.max(0,
    (record?.plantingCount || 0) + (record?.supplementCount || 0) - (record?.lossCount || 0)
  );
  const recentNew = record?.supplementCount || 0;

  const config: LabelPrintConfig = {
    ...PLANTING_CONFIG,
    quickButtons: [
      { label: `初始 ${initialQuantity}`, value: initialQuantity },
      { label: `剩余 ${currentSurviving}`, value: currentSurviving },
      { label: `新增 ${recentNew}`, value: recentNew },
    ],
  };

  return (
    <LabelPrintModal
      isOpen={isOpen}
      onClose={onClose}
      record={record}
      config={config}
    />
  );
}

export default PrintLabelModal;
