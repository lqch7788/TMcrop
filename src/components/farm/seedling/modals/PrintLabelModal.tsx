/**
 * 育苗标签打印弹窗 — 薄包装（2026-08-19 抽取共享组件）
 * 实际实现见 src/components/farm/labels/LabelPrintModal.tsx（config 驱动）
 * 本文件保留原路径/导出名，调用方零改动。
 */
import { LabelPrintModal, type LabelPrintConfig } from '@/components/farm/labels/LabelPrintModal';
import type { Seedling } from '@/types/crop';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

// 育苗模块差异配置（快捷口径/成活数量动态计算，在组件内注入）
// 2026-08-19 修正（第二次）：前端 transform 后有效字段是 siteName/startDate！
//   apiSeedlingService.transformSingleSeedling: siteName = greenhouse_name || area_name，
//   startDate = seedling_date；areaName 字段 transform 后不存在（undefined）。
//   → 打印入库 moveInAreaName 必须用 siteName、moveInDate 用 startDate
const SEEDLING_CONFIG: LabelPrintConfig = {
  module: 'seedling',
  codeField: 'seedlingCode',
  areaField: 'siteName',
  dateField: 'startDate',
  linkField: 'seedlingId',
  route: '/crop/seedlings',
  exportTitle: '育苗标签',
  qrType: 'seedling',
  showLabelType: true,
  count: (r) => {
    const mode = r?.propagationMode || 'one_to_one';
    return mode === 'one_to_many'
      ? (r?.motherPlantCount || r?.initialCount || 0)
      : (r?.initialCount || 0);
  },
  // 2026-06-28 关键口径：1:多 = 母株存活数 motherPlantCount；1:1 = 初始 - seedlingLossCount
  surviving: (r) => {
    const mode = r?.propagationMode || 'one_to_one';
    if (mode === 'one_to_many') {
      return r?.motherPlantCount || 0;
    }
    return Math.max(0, (r?.initialCount || 0) - (r?.seedlingLossCount || 0));
  },
  previewRight: (r, surviving) => [
    { label: '初始数量', value: (r?.initialCount ?? 0).toLocaleString() },
    { label: '成活数量', value: surviving.toLocaleString(), cls: 'emerald-bold' },
    {
      label: '成活率',
      value: (r?.initialCount || 0) > 0 ? `${Math.round((surviving / (r?.initialCount || 1)) * 100)}%` : '0%',
      cls: 'emerald-bold',
    },
    { label: '育苗日期', value: r?.startDate || '-' },
  ],
  qrExtra: (r) => ({
    sourceCode: r?.sourceCode,
    cropCode: r?.cropCode,
    cropName: r?.cropName,
    variety: r?.cropVariety,
    site: r?.siteName,
    date: r?.startDate,
  }),
  qrQuantity: (_r, surviving) => surviving,
  exportCols: { areaHeader: '场地', codeHeader: '育苗批号', dateHeader: '育苗日期' },
};

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  // 育苗快捷口径（初始/成活/新增）+ 成活数量（按模式实时计算）
  const propagationMode = record?.propagationMode || 'one_to_one';
  const initialQuantity = record?.initialCount || 0;
  const currentSurviving = propagationMode === 'one_to_many'
    ? Math.max(0, (record?.expandedPlantCount || 0) + (record?.replantCount || 0) - (record?.lossCount || 0))
    : Math.max(0, (record?.initialCount || 0) - (record?.lossCount || 0));
  const recentNew = propagationMode === 'one_to_many'
    ? (record?.expandedPlantCount || 0)
    : (record?.replantCount || 0);

  const config: LabelPrintConfig = {
    ...SEEDLING_CONFIG,
    quickButtons: [
      { label: `初始 ${initialQuantity}`, value: initialQuantity },
      { label: `成活 ${currentSurviving}`, value: currentSurviving },
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
