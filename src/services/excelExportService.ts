/**
 * Excel 导出 Service（2026-06-28）
 * 通用工具：种植管理每日记录导出
 */

import * as XLSX from 'xlsx';
import type { Planting, PlantingDailyRecord } from '../types/crop';
import { WATERING_METHOD_MAP, WATERING_UNIT_MAP, FEED_UNIT_MAP } from '../constants/cropConstants';

/**
 * 导出种植管理每日记录为 Excel（2026-06-28）
 * @param planting 种植记录（用于文件名 + 表头）
 * @param records 每日记录列表
 */
export function exportPlantingDailyRecordsToExcel(
  planting: Planting,
  records: PlantingDailyRecord[]
): void {
  if (records.length === 0) return;

  const data = records.map((r) => {
    const fertText = (r.fertilizerRecords || [])
      .map(
        (f) =>
          `${f.name} ${f.amount || 0}${FEED_UNIT_MAP[f.unit as string] || f.unit}${
            f.dilutionType === 'dilute' && f.dilution ? `×${f.dilution}倍` : '(干施)'
          }`
      )
      .join('; ');
    const pestText = (r.pesticideRecords || [])
      .map(
        (p) =>
          `${p.name} ${p.amount || 0}${FEED_UNIT_MAP[p.unit as string] || p.unit}${
            p.dilutionType === 'dilute' && p.dilution ? `×${p.dilution}倍` : ''
          }${p.targetPest ? `/${p.targetPest}` : ''}${
            p.safetyInterval ? `(安全间隔${p.safetyInterval}天)` : ''
          }`
      )
      .join('; ');
    return {
      日期: r.recordDate,
      // 2026-08-21：环境参数 8 字段（新字段优先，旧字段 fallback 兼容历史数据）
      空气温度: r.airTemperature ?? r.temperature ?? '',
      空气湿度: r.airHumidity ?? r.humidity ?? '',
      光照度: r.lightIntensity != null ? `${r.lightIntensity} lux` : '',
      CO2含量: r.co2 != null ? `${r.co2} ppm` : '',
      土壤温度: r.soilTemperature != null ? `${r.soilTemperature}℃` : '',
      土壤湿度: r.soilHumidity != null ? `${r.soilHumidity}%` : '',
      土壤pH值: r.soilPhValue ?? r.phValue ?? '',
      土壤EC值: r.soilEcValue ?? r.ecValue != null ? `${r.soilEcValue} mS/cm` : '',
      浇水: r.watering ? '是' : '否',
      浇水方式: r.watering
        ? WATERING_METHOD_MAP[r.wateringMethod as string] || r.wateringMethod || '-'
        : '-',
      浇水量:
        r.watering && r.wateringAmount != null
          ? `${r.wateringAmount} ${WATERING_UNIT_MAP[r.wateringUnit as string] || r.wateringUnit || ''}`
          : '-',
      施肥种类: (r.fertilizerRecords || []).length,
      施肥明细: fertText || '-',
      用药种类: (r.pesticideRecords || []).length,
      用药明细: pestText || '-',
      损耗: r.lossChange ?? '',
      补栽: r.supplementChange ?? '',
      异常情况: r.abnormality ?? '',
      操作员: r.operator ?? '',
      备注: r.remarks ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 9 }, // 空气温度
    { wch: 9 }, // 空气湿度
    { wch: 10 }, // 光照度
    { wch: 10 }, // CO2
    { wch: 9 }, // 土壤温度
    { wch: 9 }, // 土壤湿度
    { wch: 9 }, // 土壤pH
    { wch: 10 }, // 土壤EC
    { wch: 6 }, // 浇水
    { wch: 12 }, // 浇水方式
    { wch: 14 }, // 浇水量
    { wch: 8 }, // 施肥种类
    { wch: 40 }, // 施肥明细
    { wch: 8 }, // 用药种类
    { wch: 40 }, // 用药明细
    { wch: 8 }, // 损耗
    { wch: 8 }, // 补栽
    { wch: 20 }, // 异常情况
    { wch: 10 }, // 操作员
    { wch: 20 }, // 备注
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '每日记录');
  const filename = `种植每日记录_${planting.plantCode || planting.id}_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;
  XLSX.writeFile(wb, filename);
}