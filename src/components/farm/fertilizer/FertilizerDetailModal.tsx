/**
 * 施肥详情弹窗（V2 改造 2026-07-12）
 * 展示基本信息 + 施肥方案池明细（按肥料分组）
 */
import React from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { FertilizerData, getDictItemName } from '@/stores';
import { parseFertilizationPool, type FertilizationPoolRow } from '@/lib/fertilizerPool';
import { calcWaterFromPoolRow } from '@/lib/dilutionWater';

export function FertilizerDetailModal({ isOpen, record, onClose }: {
  isOpen: boolean; record: FertilizerData; onClose: () => void;
}) {
  if (!record) return null;
  const pool = parseFertilizationPool(record.fertilizationPool);
  const areaNames = [...new Set(pool.map((p:FertilizationPoolRow)=>String(p.area??'')).filter(Boolean))];
  // 2026-07-20：多作物支持 — 解析 crop_names JSON
  let cropNames: string[] = [];
  try { cropNames = JSON.parse((record as any).cropNames || '[]'); } catch { cropNames = []; }
  if (cropNames.length === 0) {
    cropNames = [...new Set(pool.map(p=>String(p.cropName??'')))].filter(Boolean);
  }
  if (cropNames.length === 0 && record.cropName) cropNames = [record.cropName];
  const fertGroups = new Map<string,FertilizationPoolRow[]>();
  pool.forEach((p:FertilizationPoolRow)=>{ const k=String(p.fertilizerName??'未知'); if(!fertGroups.has(k))fertGroups.set(k,[]); fertGroups.get(k)!.push(p); });

  // 2026-07-25 P0：业务类型（sourceType）的可读标签 — 对标 WaterDetailModal 的 recordTypeLabel
function sourceTypeLabel(st: string | undefined): string {
  if (st === 'fertilizer_dilution') return '施肥稀释';
  if (st === 'daily_sync') return '每日记录同步';
  return '手动录入';
}

// 2026-07-25 P0 修复：dataSource（录入来源）的可读标签（fields 数组引用）
function dataSourceLabel(s: string | undefined): string {
  if (s === 'auto_iot') return 'IoT 自动';
  return '手动录入';
}

  const fields = [
    { label: '施肥编号', value: <span className="font-mono">{record.fertilizerCode||'-'}</span> },
    { label: '施肥时间', value: record.fertilizeTime||'-' },
    // 2026-07-25 P0：补全业务类型（施肥稀释/每日记录同步/手动录入）
    { label: '施肥类型', value: sourceTypeLabel(record.sourceType) },
    { label: '数据来源', value: dataSourceLabel(record.dataSource) },
    { label: '作物', value: <span className="font-bold">{cropNames.length > 1 ? cropNames.join('、') : (record.cropName||'-')}</span> },
    { label: '区域', value: areaNames.length > 0 ? areaNames.join('、') : (record.areaName||'-') },
    // 2026-07-25 P0：温室（横幅已有但 fields 也展示便于复制）
    { label: '温室', value: record.greenhouseName||'-' },
    // 2026-07-25 P0：肥料类型 + 稀释倍数（之前缺失）
    { label: '肥料类型', value: getDictItemName('fertilizer_type', record.fertilizerType) || '-' },
    { label: '稀释倍数', value: record.dilutionRatio||'-' },
    // 2026-07-25 P0：spec 信息（肥料品牌快照）
    { label: '肥料品牌', value: record.specBrandName||'-' },
    { label: '操作员', value: record.operatorName||'-' },
    // 2026-07-25 P0：IoT 设备/记录（IoT 来源记录时才有值）
    { label: 'IoT 设备', value: record.iotDeviceId||'-' },
    { label: 'IoT 记录', value: record.iotRecordId||'-' },
    // 2026-07-25 P0：关联追溯
    { label: '关联 FarmTask', value: record.farmTaskId ? <span className="font-mono text-xs">{record.farmTaskId}</span> : '-' },
    { label: '关联生产计划', value: record.productionPlanCode||'-' },
    { label: '关联种植批号', value: record.plantingCode||'-' },
    { label: '关联育苗批号', value: record.seedlingCode||'-' },
    { label: '备注', value: record.description||'-', full: true },
  ];

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="施肥记录详情" size="xxl" showFooter={false}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-emerald-700 font-bold text-lg">{record.fertilizerCode}</span>
            {/* 2026-07-25：横幅补充温室（与详情/导出对齐） */}
            {record.greenhouseName && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-700">🏠 {record.greenhouseName}</span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-800">{cropNames.length > 1 ? cropNames.join('、') : record.cropName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">总用量 {record.quantity?.toLocaleString()} {record.unit||'kg'}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-amber-600">¥{record.totalCost?.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
          </div>
        </div>

        {/* 基本信息网格 */}
        {/* 2026-07-25：缩小一号 — 标签 text-xs / 值 text-sm / padding p-2 / min-h-32，与浇水详情对称 */}
        <div className="grid grid-cols-3 gap-2">
          {fields.map((f,i)=>(
            <div key={i} className={f.full?'col-span-full':''}>
              <Label className="text-xs text-gray-500">{f.label}</Label>
              <div className="text-sm rounded-md p-2 min-h-[32px] border border-gray-300 text-gray-800">{f.value}</div>
            </div>
          ))}
        </div>

        {/* 施肥方案池明细：单表 + 跨组连续序号 + 肥料 rowspan（2026-07-25 对齐 FertilizerTable v4）
            - 13 列：序号 | 肥料（含品牌）| 作物 | 来源 | 区域 | 批号 | 作物品种 | 用量 | 稀释 | 用水量 | 方式 | 单价 | 小计
            - 肥料 cell 仅 rowspan 该组明细行数
            - 单肥料/单行场景也正常渲染（rowspan=1） */}
        {pool.length > 0 && (() => {
          // 展平所有肥料分组为单行数组，跨组连续累计序号
          const flat: Array<{ fName: string; r: FertilizationPoolRow; seq: number; isFirst: boolean; groupSize: number; brand: string | undefined }> = [];
          let seq = 1;
          for (const [fName, rows] of fertGroups.entries()) {
            rows.forEach((r, i) => {
              flat.push({ fName, r, seq: seq++, isFirst: i === 0, groupSize: rows.length, brand: rows[0]?.specBrandName });
            });
          }
          return (
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-3">🧪 施肥方案明细 · {fertGroups.size} 种肥料 / {areaNames.length} 个区域 / {pool.length} 行用量</h3>
              <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                      <tr>
                        <th className="px-2 py-2 text-center w-[5%]">序号</th>
                        {/* 2026-07-25：肥料列缩窄到 8%（原约 15%，缩窄一半）— 配合 truncate 防止品牌撑高 */}
                        <th className="px-2 py-2 text-center w-[8%]">肥料</th>
                        <th className="px-2 py-2 text-center w-[7%]">作物</th>
                        <th className="px-2 py-2 text-center w-[6%]">来源</th>
                        <th className="px-2 py-2 text-center w-[9%]">区域</th>
                        <th className="px-2 py-2 text-center w-[8%]">批号</th>
                        <th className="px-2 py-2 text-center w-[8%]">作物品种</th>
                        <th className="px-2 py-2 text-center w-[7%]">用量</th>
                        <th className="px-2 py-2 text-center w-[6%]">稀释</th>
                        <th className="px-2 py-2 text-center w-[10%]">用水量</th>
                        <th className="px-2 py-2 text-center w-[8%]">方式</th>
                        <th className="px-2 py-2 text-center w-[8%]">单价</th>
                        <th className="px-2 py-2 text-center w-[10%]">小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {flat.map(({ fName, r, seq, isFirst, groupSize, brand }) => {
                        const subTotal = Number(r.quantity || 0) * Number(r.unitPrice || 0);
                        const methodLabel = r.fertilizationMethod ? (getDictItemName('fertilization_method', r.fertilizationMethod) || r.fertilizationMethod) : '-';
                        return (
                          <tr key={`${fName}-${seq}`} className="hover:bg-emerald-50/40">
                            <td className="px-2 py-2 text-center text-gray-500 truncate">{seq}</td>
                            {isFirst && (
                              <td rowSpan={groupSize} className="px-2 py-2 text-center align-middle text-xs font-bold text-emerald-900 bg-emerald-50/40 border-r border-emerald-100">
                                {/* 2026-07-25：肥料列缩窄 — 名称 truncate + 品牌 truncate（hover tooltip） */}
                                <div className="truncate" title={fName}>🌱 {fName}</div>
                                {brand && <div className="text-[10px] text-emerald-600 font-normal mt-0.5 truncate" title={brand}>{brand}</div>}
                              </td>
                            )}
                            <td className="px-2 py-2 text-center text-gray-800 font-medium text-xs truncate" title={r.cropName || ''}>{r.cropName || '-'}</td>
                            <td className="px-2 py-2 text-center text-gray-700 truncate">{r.type === 'planting' ? '🌱种植' : r.type === 'seedling' ? '🌿育苗' : '-'}</td>
                            <td className="px-2 py-2 text-center text-gray-800 font-medium truncate" title={r.area || ''}>{r.area || '-'}</td>
                            <td className="px-2 py-2 text-center font-mono text-xs text-gray-600 truncate" title={r.code || ''}>{r.code || '-'}</td>
                            <td className="px-2 py-2 text-center text-gray-800 font-medium text-xs truncate" title={r.cropName || ''}>{r.cropName || '-'}</td>
                            <td className="px-2 py-2 text-center font-bold text-emerald-600 truncate">{r.quantity} {r.unit}</td>
                            <td className="px-2 py-2 text-center text-gray-600 truncate">{r.dilutionRatio || '-'}</td>
                            <td className="px-2 py-2 text-center text-blue-600 font-medium truncate">
                              {/* 2026-07-25：优先读 poolRow 持久化的 waterAmount/waterUnit（AddModal 提交时写入），老数据兜底用 calcWaterFromPoolRow 实时计算 */}
                              {r.waterAmount != null
                                ? `${Number(r.waterAmount).toLocaleString()} ${r.waterUnit || 'L'}`
                                : (() => { const w = calcWaterFromPoolRow(r as any); return w ? `${w.amount.toLocaleString()} ${w.unit}` : '-'; })()}
                            </td>
                            <td className="px-2 py-2 text-center text-gray-600 truncate" title={methodLabel}>{methodLabel}</td>
                            <td className="px-2 py-2 text-center text-gray-600 truncate">{r.unitPrice.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                            <td className="px-2 py-2 text-center font-bold text-amber-600 truncate">{subTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
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
      <div className="mt-6 flex justify-end"><Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4"/>关闭</Button></div>
    </UnifiedModal>
  );
}
