/**
 * 种源标签打印弹窗 — 薄包装（2026-08-19 抽取共享组件）
 * 实际实现见 src/components/farm/labels/LabelPrintModal.tsx（config 驱动）
 * 本文件保留原路径/导出名，调用方零改动。
 */
import { LabelPrintModal, type LabelPrintConfig } from '@/components/farm/labels/LabelPrintModal';
import type { SeedSource } from '@/types/crop';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource;
}

// 种源模块差异配置（简化版：无标签粒度三态，每标签 1 单位）
const SEED_SOURCE_CONFIG: LabelPrintConfig = {
  module: 'seed_source',
  codeField: 'seedCode',
  areaField: 'supplierName',
  dateField: 'purchaseDate',
  linkField: 'seedSourceId',
  route: '/crop/seed-sources',
  exportTitle: '种源标签',
  qrType: 'seed-source',
  showLabelType: false,
  count: (r) => r?.availableCount || 0,
  surviving: (r) => r?.availableCount || 0,
  previewRight: (r, surviving) => [
    { label: '可用数量', value: `${surviving.toLocaleString()} ${r?.unit || '粒'}`, cls: 'emerald-bold' },
    { label: '入库数量', value: `${((r?.quantity ?? r?.initialCount) || 0).toLocaleString()} ${r?.unit || '粒'}` },
  ],
  qrExtra: (r) => ({
    seedCode: r?.seedCode,
    cropCode: r?.cropCode,
    cropName: r?.cropName,
    variety: r?.cropVariety,
    supplier: r?.supplierName,
    date: r?.purchaseDate,
  }),
  qrQuantity: (r) => `${r?.availableCount || 0} ${r?.unit || '粒'}`,
  exportCols: { areaHeader: '供应商', codeHeader: '种源批号', dateHeader: '采购日期' },
};

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  // 种源单位（默认"粒"）
  const config: LabelPrintConfig = {
    ...SEED_SOURCE_CONFIG,
    unit: record?.unit || '粒',
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
