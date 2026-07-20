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
  area?: string;
  wateringMethod?: string;
  waterAmount?: number;
  waterUnit?: string;
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

  const fields = [
    { label: '浇水编号', value: <span className="font-mono">{record.waterCode || '-'}</span> },
    { label: '浇水时间', value: record.waterTime || '-' },
    { label: '作物', value: <span className="font-bold">{record.cropName || '-'}</span> },
    { label: '温室位置', value: record.greenhouseName || '-' },
    { label: '区域', value: record.areaName || '-' },
    { label: '操作员', value: record.operatorName || '-' },
    { label: '数据来源', value: dataSourceLabel(record.dataSource) },
    { label: '业务来源', value: recordTypeLabel(record.recordType) },
    { label: '备注', value: record.description || '-', full: true },
  ];

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="浇水记录详情" size="xxl" showFooter={false}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 头部绿色渐变横幅 */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-emerald-700 font-bold text-lg">{record.waterCode}</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-800">{record.cropName}</span>
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
        <div className="grid grid-cols-3 gap-3">
          {fields.map((f, i) => (
            <div key={i} className={f.full ? 'col-span-full' : ''}>
              <Label className="text-sm text-gray-500">{f.label}</Label>
              <div className="text-base rounded-lg p-3 min-h-[40px] border border-gray-300 text-gray-800">{f.value}</div>
            </div>
          ))}
        </div>

        {/* 浇水池明细：按区域分组 */}
        {pool.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">💧 浇水明细 · {areaGroups.size} 个区域 / {pool.length} 条记录</h3>
            <div className="space-y-3">
              {Array.from(areaGroups.entries()).map(([areaName, rows]) => {
                const subQty = rows.reduce((s, r) => s + (Number(r.waterAmount) || 0), 0);
                const subUnit = rows[0]?.waterUnit || record.waterUnit || 'L';
                return (
                  <div key={areaName} className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 text-emerald-900 text-sm font-bold border-b border-emerald-200">
                      📍 {areaName}
                      <span className="ml-2 text-xs font-normal text-emerald-600">用水量 {subQty.toLocaleString()} {subUnit}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">浇水方式</th>
                          <th className="px-3 py-2 text-right">用量</th>
                          <th className="px-3 py-2 text-left">单位</th>
                          <th className="px-3 py-2 text-left">批号</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((r, i) => (
                          <tr key={i} className="hover:bg-emerald-50/40">
                            <td className="px-3 py-2 text-gray-800 font-medium">{WATERING_METHOD_MAP[String(r.wateringMethod || '')] || r.wateringMethod || '-'}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-600">{r.waterAmount ?? '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.waterUnit || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.code || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4" />关闭</Button>
      </div>
    </UnifiedModal>
  );
}

export default WaterDetailModal;
