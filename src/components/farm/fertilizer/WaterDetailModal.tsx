/**
 * 浇水详情弹窗（2026-07-20 水肥管理 Phase 1）
 * 仿 FertilizerDetailModal，展示头部横幅 + 基本信息网格 + 浇水池明细
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §5.7
 */
import React from 'react';
import { X } from 'lucide-react';
import { UnifiedModal, Button, Label } from '@/components/ui';
import { useWateringStore } from '@/stores';
import type { WateringData } from '@/stores';
import { WATERING_METHOD_MAP } from '@/constants/cropConstants';

interface PoolRow {
  type?: string;
  id?: string;
  code?: string;
  // 2026-07-25：与 WaterTable v4 / WaterEditModal 对齐 — 池行完整字段
  cropName?: string;
  cropCode?: string;
  area?: string;
  wateringMethod?: string;
  waterAmount?: number;
  waterUnit?: string;
  remark?: string;
  [key: string]: unknown;
}

function parsePool(json: string | null | undefined): PoolRow[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r != null && typeof r === 'object');
  } catch (e) {
    console.warn('[WaterDetailModal] 池 JSON 解析失败:', e);
    return [];
  }
}

/** 数据来源（dataSource）的可读标签 */
function dataSourceLabel(s: string | undefined): string {
  if (s === 'auto_iot') return 'IoT 自动';
  return '手动录入';
}

/** recordType 的可读标签 */
function recordTypeLabel(rt: WateringData['recordType'] | undefined): string {
  if (rt === 'fertilizer_dilution') return '施肥稀释';
  if (rt === 'daily_sync') return '每日记录同步';
  return '手动录入';
}

export function WaterDetailModal({ isOpen, record, onClose }: {
  isOpen: boolean;
  record: WateringData | null;
  onClose: () => void;
}) {
  if (!record) return null;
  const pool = parsePool(record.waterPool);
  // 按区域分组
  const areaGroups = new Map<string, PoolRow[]>();
  for (const r of pool) {
    const k = String(r.area || '未命名区域');
    if (!areaGroups.has(k)) areaGroups.set(k, []);
    areaGroups.get(k)!.push(r);
  }

  // 2026-07-24：聚合所有区域的名称（去重）
  const allAreaNames = [...new Set(pool.map((r) => String(r.area || '').trim()).filter(Boolean))];

  // 2026-07-24：作物名三重兜底（与 WaterTable 一致）— 历史数据 cropNames 字段为 null 时从 waterPool 提取
  const cropListFromNames = (() => { try { const arr = JSON.parse(record.cropNames || ''); return Array.isArray(arr) ? arr.filter(Boolean) : []; } catch { return []; } })();
  const cropListFromPool = [...new Set(pool.map((r) => String(r.cropName || '').trim()).filter(Boolean))];
  const cropsDisplay = cropListFromNames.length > 0
    ? cropListFromNames
    : cropListFromPool.length > 0
    ? cropListFromPool
    : [record.cropName].filter(Boolean);

  const fields = [
    { label: '浇水编号', value: <span className="font-mono">{record.waterCode || '-'}</span> },
    { label: '浇水时间', value: record.waterTime || '-' },
    // 2026-07-25 P0：补充 recordType（业务类型：施肥稀释/每日记录同步/手动录入）
    { label: '浇水类型', value: recordTypeLabel(record.recordType) },
    { label: '数据来源', value: dataSourceLabel(record.dataSource) },
    { label: '作物', value: <span className="font-bold">{cropsDisplay.length > 0 ? cropsDisplay.join('、') : '-'}</span> },
    { label: '区域', value: allAreaNames.length > 0 ? allAreaNames.join('、') : (record.areaName || '-') },
    // 2026-07-25 P0：补充温室（横幅已有，但 fields 中也展示便于复制）
    { label: '温室', value: record.greenhouseName || '-' },
    { label: '操作员', value: record.operatorName || '-' },
    // 2026-07-25 P0：补充水费
    { label: '水费（元）', value: record.waterCost != null ? `¥${Number(record.waterCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-' },
    // 2026-07-25 P0：补充关联追溯（施肥稀释/每日记录同步时显示 ID）
    { label: '关联施肥记录', value: record.fertilizerRecordId ? <span className="font-mono text-xs">{record.fertilizerRecordId}</span> : '-' },
    { label: '关联每日记录', value: record.sourceDailyRecordId ? <span className="font-mono text-xs">{record.sourceDailyRecordId}</span> : '-' },
    { label: '备注', value: record.description || '-', full: true },
  ];

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="浇水记录详情" size="xxl" showFooter={false}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 头部绿色渐变横幅 */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-emerald-700 font-bold text-lg">{record.waterCode}</span>
            {/* 2026-07-25 P0：横幅补充温室字段 */}
            {record.greenhouseName && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-700">🏠 {record.greenhouseName}</span>
              </>
            )}
            <span className="text-gray-300">|</span>
            {/* 2026-07-24：作物也用三重兜底，呼应下方字段 */}
            <span className="font-bold text-gray-800">{cropsDisplay.length > 0 ? cropsDisplay.join('、') : '-'}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">总用水量 {record.totalWater?.toLocaleString()} {record.waterUnit || 'L'}</span>
            {record.waterCost != null && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm font-medium text-amber-600">¥{Number(record.waterCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </>
            )}
          </div>
        </div>

        {/* 基本信息网格 */}
        {/* 2026-07-25：缩小一号 — 标签 text-xs / 值 text-sm / padding p-2 / min-h-32，与施肥详情对称 */}
        <div className="grid grid-cols-3 gap-2">
          {fields.map((f, i) => (
            <div key={i} className={f.full ? 'col-span-full' : ''}>
              <Label className="text-xs text-gray-500">{f.label}</Label>
              <div className="text-sm rounded-md p-2 min-h-[32px] border border-gray-300 text-gray-800">{f.value}</div>
            </div>
          ))}
        </div>

        {/* 浇水池明细：单表 + 跨组连续序号 + 区域 rowspan（2026-07-25 与 WaterTable v4 对齐）
            - 列：序号 | 批号 | 区域 | 作物品种 | 浇水方式 | 用水量 | 单位 | 备注
            - 区域 cell 仅 rowspan 该组明细行数
            - 单区域/单记录场景也正常渲染（rowspan=1） */}
        {pool.length > 0 && (() => {
          // 展平所有分组为单行数组，跨区域连续累计序号
          const flat: Array<{ aName: string; r: PoolRow; seq: number; isFirst: boolean; groupSize: number }> = [];
          let seq = 1;
          for (const [aName, rows] of areaGroups.entries()) {
            rows.forEach((r, i) => {
              flat.push({ aName, r, seq: seq++, isFirst: i === 0, groupSize: rows.length });
            });
          }
          return (
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-3">💧 浇水明细 · {areaGroups.size} 个区域 / {pool.length} 条记录</h3>
              <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-center w-[7%]">序号</th>
                        <th className="px-3 py-2 text-center w-[14%]">批号</th>
                        <th className="px-3 py-2 text-center w-[12%]">区域</th>
                        <th className="px-3 py-2 text-center w-[13%]">作物品种</th>
                        <th className="px-3 py-2 text-center w-[16%]">浇水方式</th>
                        <th className="px-3 py-2 text-center w-[14%]">用水量</th>
                        <th className="px-3 py-2 text-center w-[11%]">单位</th>
                        <th className="px-3 py-2 text-center w-[13%]">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {flat.map(({ aName, r, seq, isFirst, groupSize }) => {
                        const methodLabel = WATERING_METHOD_MAP[String(r.wateringMethod || '')] || r.wateringMethod || '-';
                        return (
                          <tr key={`${aName}-${seq}`} className="hover:bg-emerald-50/40">
                            <td className="px-3 py-2 text-center text-gray-500">{seq}</td>
                            <td className="px-3 py-2 text-center text-gray-600 font-mono text-xs">{r.code || '-'}</td>
                            {isFirst && (
                              <td rowSpan={groupSize} className="px-3 py-2 text-center align-middle text-sm font-bold text-emerald-900 bg-emerald-50/40 border-r border-emerald-100">
                                🌿 {aName}
                              </td>
                            )}
                            {/* 2026-07-25 P0：池行精准显示作物品种（按 code 反查） */}
                            <td className="px-3 py-2 text-center text-gray-800 font-medium text-xs">{r.cropName || '-'}</td>
                            <td className="px-3 py-2 text-center text-gray-800 font-medium">{methodLabel}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-600">
                              {Number(r.waterAmount ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{r.waterUnit || '-'}</td>
                            {/* 2026-07-25 P0：池行备注 */}
                            <td className="px-3 py-2 text-center text-gray-600">{r.remark || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4" />关闭</Button>
      </div>
    </UnifiedModal>
  );
}

export default WaterDetailModal;
