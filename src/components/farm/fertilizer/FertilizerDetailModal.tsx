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

function parsePool(json: string|null|undefined): any[] {
  if (!json) return [];
  try { const a=JSON.parse(json); return Array.isArray(a)?a.filter((it:any)=>it).map((it:any)=>({...it,quantity:Number(it.quantity)||0,unitPrice:Number(it.unitPrice)||0})):[]; } catch { return []; }
}

export function FertilizerDetailModal({ isOpen, record, onClose }: {
  isOpen: boolean; record: FertilizerData; onClose: () => void;
}) {
  if (!record) return null;
  const pool = parsePool((record as any).fertilizationPool);
  const areaNames = [...new Set(pool.map((p:any)=>p.area).filter(Boolean))];
  const fertGroups = new Map<string,any[]>();
  pool.forEach((p:any)=>{ const k=p.fertilizerName||'未知'; if(!fertGroups.has(k))fertGroups.set(k,[]); fertGroups.get(k)!.push(p); });

  const fields = [
    { label: '施肥编号', value: <span className="font-mono">{record.fertilizerCode||'-'}</span> },
    { label: '施肥时间', value: record.fertilizeTime||'-' },
    { label: '作物', value: <span className="font-bold">{record.cropName||'-'}</span> },
    { label: '温室位置', value: record.greenhouseName||'-' },
    { label: '操作员', value: record.operatorName||'-' },
    { label: '数据来源', value: record.dataSource==='auto_iot'?'IoT自动':'手动录入' },
    { label: '关联生产计划', value: record.productionPlanCode||'-' },
    { label: '关联种植批号', value: record.plantingCode||'-' },
    { label: '关联育苗批号', value: (record as any).seedlingCode||'-' },
    { label: '备注', value: record.description||'-', full: true },
  ];

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="施肥记录详情" size="xxl" showFooter={false}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-emerald-700 font-bold text-lg">{record.fertilizerCode}</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-800">{record.cropName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">总用量 {record.quantity?.toLocaleString()} {record.unit||'kg'}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-amber-600">¥{record.totalCost?.toLocaleString()}</span>
          </div>
        </div>

        {/* 基本信息网格 */}
        <div className="grid grid-cols-3 gap-3">
          {fields.map((f,i)=>(
            <div key={i} className={f.full?'col-span-full':''}>
              <Label className="text-sm text-gray-500">{f.label}</Label>
              <div className="text-base rounded-lg p-3 min-h-[40px] border border-gray-300 text-gray-800">{f.value}</div>
            </div>
          ))}
        </div>

        {/* 施肥方案池明细 */}
        {pool.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">🧪 施肥方案明细 · {fertGroups.size} 种肥料 / {areaNames.length} 个区域</h3>
            <div className="space-y-3">
              {Array.from(fertGroups.entries()).map(([fName,rows])=>{
                const subQty = rows.reduce((s,r)=>s+r.quantity,0);
                const subCost = rows.reduce((s,r)=>s+r.quantity*r.unitPrice,0);
                return (
                  <div key={fName} className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 text-emerald-900 text-sm font-bold border-b border-emerald-200">
                      🌱 {fName}
                      <span className="ml-2 text-xs font-normal text-emerald-600">用量 {subQty.toLocaleString()} {rows[0]?.unit} · 小计 ¥{subCost.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                        <tr><th className="px-3 py-2 text-left">区域</th><th className="px-3 py-2 text-right">用量</th><th className="px-3 py-2 text-left">稀释</th><th className="px-3 py-2 text-left">方式</th><th className="px-3 py-2 text-right">单价</th><th className="px-3 py-2 text-right">小计</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((r,i)=>(<tr key={i} className="hover:bg-emerald-50/40">
                          <td className="px-3 py-2 text-gray-800 font-medium">{r.area}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">{r.quantity} {r.unit}</td>
                          <td className="px-3 py-2 text-gray-600">{r.dilutionRatio||'-'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.fertilizationMethod?getDictItemName('fertilization_method',r.fertilizationMethod):'-'}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{r.unitPrice.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                          <td className="px-3 py-2 text-right font-bold text-amber-600">{(r.quantity*r.unitPrice).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                        </tr>))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end"><Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4"/>关闭</Button></div>
    </UnifiedModal>
  );
}
