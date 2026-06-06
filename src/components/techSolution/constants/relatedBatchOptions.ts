/**
 * 关联生产批次号下拉选项
 * 2026-06-06 抽取：CreateModal/EditModal/BatchEditModal 三处之前硬编码重复
 */
export interface RelatedBatchOption {
  value: string;
  label: string;
}

// 与项目种植/育苗/种源批次编码约定一致：ZZB=种植批次，YMB=育苗批次，JZB=种源批次
export const RELATED_BATCH_OPTIONS: RelatedBatchOption[] = [
  { value: '', label: '不关联' },
  { value: 'ZZB2026-001', label: 'ZZB2026-001 - 番茄种植批次' },
  { value: 'ZZB2026-002', label: 'ZZB2026-002 - 黄瓜种植批次' },
  { value: 'ZZB2026-003', label: 'ZZB2026-003 - 草莓种植批次' },
  { value: 'YMB2026-001', label: 'YMB2026-001 - 番茄育苗批次' },
  { value: 'YMB2026-002', label: 'YMB2026-002 - 黄瓜育苗批次' },
  { value: 'JZB2026-001', label: 'JZB2026-001 - 番茄种源批次' },
  { value: 'JZB2026-002', label: 'JZB2026-002 - 黄瓜种源批次' },
];
