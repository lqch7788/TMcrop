/**
 * 施肥数据表格组件（V2 改造 2026-07-12）
 * 分组折叠模式：主行显示摘要，展开后按肥料分组展示区域用量明细
 * 参考病虫害表格的折叠展开模式
 */
import React from 'react';
import { ChevronDown, ChevronRight, Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { FertilizerData, getDictItemName } from '@/stores';
import { parseFertilizationPool, type FertilizationPoolRow } from '@/lib/fertilizerPool';
import { calculateDilutionWater, calcWaterFromPoolRow } from '@/lib/dilutionWater';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import IotDataIndicator, { IotDeviceStatus } from './IotDataIndicator';

interface FertilizerTableProps {
  data: FertilizerData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (r: FertilizerData) => void;
  onEdit: (r: FertilizerData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onExportMode: () => void;
  // 2026-07-19 P2：参照 SeedSource/Seedling 2 步流程加 exportMode 相关 props
  exportMode?: boolean;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
  iotDevices?: IotDeviceStatus[];
  iotLoading?: boolean;
}

export function FertilizerTable({ data, isLoading, operationMode, selectedIds, onSelectionChange,
  onDetail, onEdit, onDelete, onAdd, onBatchDeleteMode, onConfirmBatchDelete, onCancelBatchDelete, onExportMode,
  exportMode, onConfirmExport, onCancelExport,
  iotDevices=[], iotLoading=false }: FertilizerTableProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const totalPages = Math.ceil(data.length/pageSize)||1;
  const current = data.slice((page-1)*pageSize, page*pageSize);
  React.useEffect(() => { if (page>totalPages) setPage(1); }, [data.length,totalPages,page]);

  const toggle = (id: string) => { const n=new Set(expanded); if (n.has(id)) n.delete(id); else n.add(id); setExpanded(n); };
  // 2026-07-19 P2：checkbox 在 delete 模式或 export 模式都显示
  const showCb = operationMode==='delete' || !!exportMode;

  const getMethodLabel = (m: string) => getDictItemName('fertilization_method', m)||m;

  if (isLoading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"/>加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">施肥记录列表</h3>
          <IotDataIndicator devices={iotDevices} loading={iotLoading}/>
        </div>
        <div className="flex items-center gap-2">
          {/* 2026-07-19 P2：参照 SeedSource 100% 对齐 2 步导出流程
              - 导出模式（exportMode）：显示 "已选 N 条 / 确认导出 / 取消"（优先级最高）
              - 删除模式（showCb）：显示 "已选 N 条 / 确认删除 / 取消"
              - 默认模式：显示 "新增 / 批量删除 / 导出"

              注意：必须 exportMode 优先于 showCb（showCb = operationMode==='delete' || !!exportMode，
              当 exportMode=true 时 showCb=true，会优先匹配 delete UI 而不是 export UI）
          */}
          {exportMode ? (<>
            <span className="text-sm text-gray-600">已选择 {selectedIds.length} 条</span>
            <Button variant="default" size="sm" onClick={onConfirmExport} disabled={selectedIds.length===0}><Download className="w-4 h-4"/>确认导出</Button>
            <Button variant="secondary" size="sm" onClick={onCancelExport}>取消</Button>
          </>) : showCb ? (<>
            <span className="text-sm text-red-700">已选择 {selectedIds.length} 条</span>
            <Button variant="destructive" size="sm" onClick={onConfirmBatchDelete} disabled={selectedIds.length===0}><Trash2 className="w-4 h-4"/>确认删除</Button>
            <Button variant="secondary" size="sm" onClick={onCancelBatchDelete}>取消</Button>
          </>) : (<>
            <Button variant="default" size="sm" onClick={onAdd}><Plus className="w-4 h-4"/>新增</Button>
            <Button variant="destructive" size="sm" onClick={onBatchDeleteMode}><Trash2 className="w-4 h-4"/>批量删除</Button>
            <Button variant="default" size="sm" onClick={onExportMode}><Download className="w-4 h-4"/>导出</Button>
          </>)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table style={{ minWidth: '1200px' }}>
          <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCb && <TableHead className="py-3 w-12"><Input type="checkbox" checked={data.length>0&&selectedIds.length===data.length} onChange={(e)=>onSelectionChange(e.target.checked?data.map(d=>d.id):[])} className="w-4 h-4"/></TableHead>}
              <TableHead className="py-3 w-10"></TableHead>
              <TableHead className="py-3 whitespace-nowrap">施肥编号</TableHead>
              <TableHead className="py-3 whitespace-nowrap">施肥时间</TableHead>
              <TableHead className="py-3 whitespace-nowrap">作物</TableHead>
              <TableHead className="py-3 whitespace-nowrap">区域数</TableHead>
              <TableHead className="py-3 whitespace-nowrap">肥料数</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-right">总用量</TableHead>
              <TableHead className="py-3 whitespace-nowrap text-right">总成本</TableHead>
              <TableHead className="py-3 whitespace-nowrap">操作员</TableHead>
              <TableHead className="py-3 whitespace-nowrap">数据来源</TableHead>
              {!showCb && <TableHead className="py-3 whitespace-nowrap sticky right-0 bg-green-600 z-10">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200">
            {current.length===0 ? (
              <TableRow><TableCell colSpan={showCb?12:11} className="px-4 py-12 text-center text-gray-400">暂无施肥记录</TableCell></TableRow>
            ) : current.map((rec) => {
              const pool = parseFertilizationPool(rec.fertilizationPool);
              const areaNames = [...new Set(pool.map(p=>String(p.area??'')))];
              const fertNames = [...new Set(pool.map(p=>String(p.fertilizerName??'')))];
              // 2026-07-20：支持多作物 — 优先用 crop_names JSON，fallback 到 pool 去重
              let cropNames: string[] = [];
              try { cropNames = JSON.parse((rec as any).cropNames || '[]'); } catch { cropNames = []; }
              if (cropNames.length === 0) {
                cropNames = [...new Set(pool.map(p=>String(p.cropName??'')))].filter(Boolean);
              }
              if (cropNames.length === 0 && rec.cropName) cropNames = [rec.cropName];
              const areaSummary = [...new Set(pool.map(p=>`${p.cropName||''}·${p.area||''}`))].filter(Boolean).join('；');
              const totalQty = pool.reduce((s,r)=>s+Number(r.quantity),0)||rec.quantity||0;
              const totalCost = pool.reduce((s,r)=>s+Number(r.quantity)*Number(r.unitPrice),0)||rec.totalCost||0;
              const isIot = rec.dataSource==='auto_iot';
              const exp = expanded.has(rec.id);
              // 按肥料名分组
              const fertGroups = new Map<string,FertilizationPoolRow[]>();
              pool.forEach(p=>{ const k=String(p.fertilizerName??'未知'); if(!fertGroups.has(k))fertGroups.set(k,[]); fertGroups.get(k)!.push(p); });
              // 作物 Badge 色板
              const CROP_COLORS = ['bg-amber-100 text-amber-700','bg-sky-100 text-sky-700','bg-rose-100 text-rose-700','bg-violet-100 text-violet-700','bg-teal-100 text-teal-700','bg-orange-100 text-orange-700','bg-cyan-100 text-cyan-700','bg-pink-100 text-pink-700'];

              return (<React.Fragment key={rec.id}>
                {/* 主行 */}
                <TableRow className={`hover:bg-emerald-50 transition-colors ${isIot?'border-l-4 border-l-green-400':''}`}>
                  {showCb && <TableCell className="px-4"><Input type="checkbox" checked={selectedIds.includes(rec.id)} onChange={()=>onSelectionChange(selectedIds.includes(rec.id)?selectedIds.filter(k=>k!==rec.id):[...selectedIds,rec.id])} className="w-4 h-4"/></TableCell>}
                  <TableCell className="px-2">
                    {pool.length>0 ? <Button variant="ghost" size="icon" onClick={()=>toggle(rec.id)} className="text-gray-500 hover:text-emerald-600" title={exp?'收起':'展开'}>{exp?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}</Button> : <span className="w-4 h-4 inline-block"/>}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button variant="link" size="sm" onClick={()=>onDetail(rec)} className="font-mono p-0 h-auto text-blue-600">{rec.fertilizerCode}</Button>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{rec.fertilizeTime||'-'}</TableCell>
                  {/* 2026-07-20：作物列 — 多作物 Badge 展示 */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {cropNames.slice(0, 3).map((cn, i) => (
                        <span key={cn} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${CROP_COLORS[i % CROP_COLORS.length]}`}>{cn}</span>
                      ))}
                      {cropNames.length > 3 && <span className="text-xs text-gray-400">+{cropNames.length - 3}</span>}
                    </div>
                  </TableCell>
                  {/* 2026-07-20：区域列 — 摘要 text + tooltip */}
                  <TableCell className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                    <span className="truncate block" title={areaSummary}>
                      {areaSummary.length > 25 ? areaSummary.slice(0, 25) + '…' : areaSummary}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fertNames.length||1} 种</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-bold text-emerald-600 text-right whitespace-nowrap">{totalQty.toLocaleString()} {pool[0]?.unit||rec.unit||'kg'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-amber-600 text-right whitespace-nowrap">¥{totalCost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{rec.operatorName||'-'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">{isIot?<span className="inline-flex gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/>IoT自动</span>:<span className="inline-flex gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>手动</span>}</TableCell>
                  {!showCb && <TableCell className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white z-10">
                    {!isIot && <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={()=>onEdit(rec)} className="text-gray-500 hover:text-amber-600" title="编辑"><Edit2 className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={()=>onDelete(rec.id)} className="text-gray-500 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4"/></Button>
                    </div>}
                  </TableCell>}
                </TableRow>

                {/* 展开行 */}
                {exp && pool.length>0 && (
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={showCb?12:11} className="px-6 py-4">
                      <div className="space-y-3">
                        <div className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-lg">
                          🧪 施肥方案明细 · 共 {fertNames.length} 种肥料 / {areaNames.length} 个区域 / {pool.length} 行用量
                        </div>
                        {Array.from(fertGroups.entries()).map(([fName,rows])=>{
                          const fert = rows[0];
                          const subTotalQty = rows.reduce((s,r)=>s+r.quantity,0);
                          const subTotalCost = rows.reduce((s,r)=>s+r.quantity*r.unitPrice,0);
                          return (
                            <div key={fName} className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                              <div className="px-3 py-2 bg-emerald-50 text-emerald-900 text-sm font-bold border-b border-emerald-200">
                                🌱 {fName}
                                {fert.specBrandName && <span className="ml-1 text-xs text-emerald-600">· {fert.specBrandName}</span>}
                                <span className="ml-2 text-xs font-normal text-emerald-600">
                                  用量合计 {subTotalQty.toLocaleString()} {rows[0]?.unit}
                                  · 小计 ¥{subTotalCost.toLocaleString(undefined,{minimumFractionDigits:2})}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs uppercase">
                                    <tr>
                                      <th className="px-3 py-2 text-center">#</th>
                                      <th className="px-3 py-2 text-center">作物</th>
                                      <th className="px-3 py-2 text-center">来源</th>
                                      <th className="px-3 py-2 text-center">批号</th>
                                      <th className="px-3 py-2 text-center">区域</th>
                                      <th className="px-3 py-2 text-center">用量</th>
                                      <th className="px-3 py-2 text-center">稀释倍数</th>
                                      <th className="px-3 py-2 text-center">用水量</th>
                                      <th className="px-3 py-2 text-center">施肥方式</th>
                                      <th className="px-3 py-2 text-center">单价</th>
                                      <th className="px-3 py-2 text-center">小计</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {rows.map((r,i)=>(
                                      <tr key={`${r.type}-${r.id}-${i}`} className="hover:bg-emerald-50/40">
                                        <td className="px-3 py-2 text-center text-gray-500">{i+1}</td>
                                        <td className="px-3 py-2 text-center text-gray-800 font-medium text-xs">{r.cropName||'-'}</td>
                                        <td className="px-3 py-2 text-center text-gray-700">{r.type==='planting'?'🌱种植':'🌿育苗'}</td>
                                        <td className="px-3 py-2 text-center font-mono text-xs text-gray-600">{r.code||'-'}</td>
                                        <td className="px-3 py-2 text-center text-gray-800 font-medium">{r.area}</td>
                                        <td className="px-3 py-2 text-center font-bold text-emerald-600">{r.quantity.toLocaleString()} {r.unit}</td>
                                        <td className="px-3 py-2 text-center text-gray-600">{r.dilutionRatio||'-'}</td>
                                        <td className="px-3 py-2 text-center text-blue-600 font-medium">
                                          {(() => { const w = calcWaterFromPoolRow(r as any); return w ? `${w.amount.toLocaleString()} ${w.unit}` : '-'; })()}
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-600">{r.fertilizationMethod?getMethodLabel(r.fertilizationMethod):'-'}</td>
                                        <td className="px-3 py-2 text-center text-gray-600">{r.unitPrice.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                                        <td className="px-3 py-2 text-center font-bold text-amber-600">{(r.quantity*r.unitPrice).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>);
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={(s)=>{setPageSize(s);setPage(1);}} pageSizeOptions={[10,20,50]} showPageSize/>
      </div>
    </div>
  );
}
