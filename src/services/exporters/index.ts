/**
 * 导出器统一入口（2026-07-10 P1-1）
 * 抽自 7 个 Page 的 handleConfirmExport（种源/育苗/种植/库存/出库/施肥/病虫害）
 *
 * 用法：
 *   import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
 *   await exportCsv({ filename, headers, rows });
 *
 * 设计：每个函数只负责"序列化 + 下载"，业务层负责 prepare headers/rows。
 */

export { exportCsv, serializeCsv } from './csv';
export { exportXlsx, serializeHtmlTable } from './xlsx';
export { exportWord } from './word';