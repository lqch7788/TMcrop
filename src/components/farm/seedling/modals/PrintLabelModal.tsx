/**
 * 育苗标签打印弹窗 — 薄包装（2026-08-19 抽取共享组件）
 * 实际实现见 src/components/farm/labels/LabelPrintModal.tsx（config 驱动）
 * 本文件保留原路径/导出名，调用方零改动。
 */
import { LabelPrintModal, type LabelPrintConfig } from '@/components/farm/labels/LabelPrintModal';
import type { Seedling } from '@/types/crop';
// 2026-10-17：存活数量统一走 src/lib/seedlingPool.ts（列表/详情/导出/标签同一个口径）
import { getMotherAliveCount, isOneToOneMode } from '@/lib/seedlingPool';

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
  // 2026-10-17 统一口径：存活 = 初始(母株) + 补苗 − 损耗累计（1:1 含历史小苗损耗）
  //   与列表「母株/植株存活数」列、详情弹窗、导出完全同源（src/lib/seedlingPool.ts）
  surviving: (r) => getMotherAliveCount(r),
  previewRight: (r, surviving) => [
    { label: '初始数量', value: (r?.initialCount ?? 0).toLocaleString() },
    { label: '成活数量', value: surviving.toLocaleString(), cls: 'emerald-bold' },
    {
      label: '成活率',
      // 2026-10-17：分母改为"累计投入（初始 + 补苗）" —— 存活数已含补苗，
      //   若仍除以初始数会出现 >100% 的荒谬值（如初始 5 + 补苗 2500 → 50040%）
      value: (() => {
        const invested = (r?.initialCount || 0) + (r?.replantCount || 0);
        return invested > 0 ? `${Math.round((surviving / invested) * 100)}%` : '0%';
      })(),
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
  // 育苗快捷口径（初始/成活/新增）
  // 2026-10-17：成活数量统一走 seedlingPool（此前这里第三套独立算式，与列表、标签模板、后端三处不一致）
  const initialQuantity = record?.initialCount || 0;
  const currentSurviving = getMotherAliveCount(record);
  // 新增口径：1:多 = 小苗累计产出；1:1 = 补苗累计
  const recentNew = isOneToOneMode(record)
    ? (record?.replantCount || 0)
    : (record?.expandedPlantCount || 0);

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
