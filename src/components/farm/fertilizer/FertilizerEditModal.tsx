/**
 * 施肥编辑弹窗（V2 改造 2026-07-12）
 * 从 record.fertilizationPool 反序列化池数据，使用 FertilizerPoolEditor 编辑
 * IoT 记录只读保护
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { TabsList, TabsTrigger } from '@/components/ui';
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore, FertilizerData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { FertilizerPoolEditor, FertilizerPoolItem } from './FertilizerPoolEditor';

interface SelectedArea {
  type: 'planting' | 'seedling';
  id: string; code: string; cropName: string; area: string;
  greenhouseId?: string; greenhouseName?: string;
}

export function FertilizerEditModal({ isOpen, record, onClose, onSaved }: {
  isOpen: boolean; record: FertilizerData; onClose: () => void; onSaved: () => void;
}) {
  const store = useFertilizerStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const libStore = useFertilizerLibraryStore();

  const isIot = record?.dataSource === 'auto_iot';
  const [form, setForm] = useState({ fertilizeTime: record?.fertilizeTime||'', operatorName: record?.operatorName||'', description: record?.description||'', greenhouseName: record?.greenhouseName||'' });
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [areaTab, setAreaTab] = useState<'planting'|'seedling'>('planting');
  // 2026-07-16：池 JSON 损坏标记（修 silent failure：损坏时禁用保存按钮，避免覆盖原数据）
  const [poolBroken, setPoolBroken] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 从记录初始化
  useEffect(() => {
    if (!isOpen || !record) return;
    setForm({ fertilizeTime: record.fertilizeTime||'', operatorName: record.operatorName||'', description: record.description||'', greenhouseName: record.greenhouseName||'' });
    // 反序列化区域
    setPoolBroken(false); // 重置状态
    try {
      const pool: any[] = record.fertilizationPool ? JSON.parse(record.fertilizationPool) : [];
      if (pool.length > 0) {
        const areas: SelectedArea[] = [];
        const ferts: FertilizerPoolItem[] = [];
        const seenAreaIds = new Set<string>();
        const seenSpecIds = new Set<string>();
        for (const row of pool) {
          if (row.id && !seenAreaIds.has(row.id)) {
            seenAreaIds.add(row.id);
            areas.push({ type: row.type||'planting', id: row.id, code: row.code||'', cropName: row.cropName||record.cropName, area: row.area||'', greenhouseId: record.greenhouseId, greenhouseName: record.greenhouseName });
          }
          // 2026-07-21：兼容旧字段名 fertilizerSpecId + 新统一字段名 specId
          const rowSpecId = row.specId || row.fertilizerSpecId;
          if (rowSpecId && !seenSpecIds.has(rowSpecId)) {
            seenSpecIds.add(rowSpecId);
            ferts.push({
              specId: rowSpecId, fertilizerName: row.fertilizerName,
              fertilizerCode: '', fertilizerType: record.fertilizerType||'',
              brandName: row.specBrandName||'', specContent: '', manufacturer: '',
              dosage: String(row.quantity), unit: row.unit||'kg', dilutionRatio: row.dilutionRatio||'',
              fertilizationMethod: row.fertilizationMethod||'',
              unitPrice: Number(row.unitPrice)||0, stockQuantity: 0, stockUnit: row.unit||'kg',
            });
          }
        }
        setSelectedAreas(areas);
        setFertilizerPool(ferts);
      } else {
        // 降级：无池数据时从旧字段构造
        setSelectedAreas([]);
        setFertilizerPool([]);
      }
    } catch (e) {
      // 2026-07-16：池 JSON 损坏时禁用保存 + 显示警告条（避免"打开即覆盖原数据"事故）
      console.warn('[FertilizerEditModal] 池 JSON 解析失败:', e);
      setPoolBroken(true);
      setSelectedAreas([]);
      setFertilizerPool([]);
    }
    // 加载数据
    plantingStore.loadItems?.();
    seedlingStore.loadItems?.();
    libStore.fetchItems();
  }, [isOpen, record]);

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => { if (areaRef.current && !areaRef.current.contains(e.target as Node)) setShowAreaDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
    if (areaTab==='planting') return (plantingStore.items as any[]).filter((p:any)=>!p.isHarvest).filter((p:any)=>!kw||(p.plantCode||'').toLowerCase().includes(kw)||(p.cropName||'').toLowerCase().includes(kw)||(p.rootName||'').toLowerCase().includes(kw));
    return (seedlingStore.items as any[]).filter((s:any)=>!kw||(s.seedlingCode||'').toLowerCase().includes(kw)||(s.cropName||'').toLowerCase().includes(kw)||(s.siteName||'').toLowerCase().includes(kw));
  }, [areaTab,areaSearch,plantingStore.items,seedlingStore.items]);

  // 2026-07-20：取消同作物限制，支持跨作物批量施肥
  const addArea = useCallback((item: any) => {
    const area: SelectedArea = areaTab==='planting'
      ? { type:'planting',id:item.id,code:item.plantCode||item.code,cropName:item.cropName,area:item.rootName||item.areaName,greenhouseId:item.greenhouseId,greenhouseName:item.greenhouseName}
      : { type:'seedling',id:item.id,code:item.seedlingCode||item.code,cropName:item.cropName,area:item.siteName||'育苗区',greenhouseId:item.greenhouseId,greenhouseName:item.greenhouseName||item.greenhouseName};
    if (selectedAreas.some(a=>a.id===area.id)) return;
    setSelectedAreas(p=>[...p,area]);
    if (!form.greenhouseName&&area.greenhouseName) setForm(f=>({...f,greenhouseName:area.greenhouseName}));
    setAreaSearch(''); setShowAreaDropdown(false);
  }, [areaTab,selectedAreas,form.greenhouseName]);

  const removeArea = useCallback((id: string) => setSelectedAreas(p=>p.filter(a=>a.id!==id)), []);

  const operatorOptions = useMemo(() => {
    const names = new Set<string>();
    plantingStore.items?.forEach((p:any)=>p.manager&&names.add(p.manager));
    seedlingStore.items?.forEach((s:any)=>s.manager&&names.add(s.manager));
    return Array.from(names);
  }, [plantingStore.items,seedlingStore.items]);

  const handleSubmit = async () => {
    if (selectedAreas.length===0) { await showAlert('请至少选择一个施肥区域'); return; }
    if (fertilizerPool.length===0) { await showAlert('请至少选择一种肥料'); return; }
    if (!form.fertilizeTime) { await showAlert('请选择施肥时间'); return; }
    const hasInvalid = fertilizerPool.some(p=>!p.dosage||Number(p.dosage)<=0);
    if (hasInvalid) { await showAlert('每种肥料的用量必须大于 0'); return; }
    setSubmitting(true);
    try {
      const poolRows = selectedAreas.flatMap(area=>fertilizerPool.map(fert=>({
        type:area.type,id:area.id,code:area.code,cropName:area.cropName,cropCode:'',area:area.area,
        quantity:Number(fert.dosage),unit:fert.unit,dilutionRatio:fert.dilutionRatio,
        fertilizationMethod:fert.fertilizationMethod,fertilizerName:fert.fertilizerName,
        unitPrice:Number(fert.unitPrice),specId:fert.specId,  // 2026-07-21 统一字段名
        specBrandName:fert.brandName,specUnitPrice:Number(fert.unitPrice),specBatchNumber:'',
      })));
      const totalQty=poolRows.reduce((s,r)=>s+r.quantity,0);
      const totalCost=poolRows.reduce((s,r)=>s+r.quantity*r.unitPrice,0);
      const pFert=fertilizerPool[0];
      // 2026-07-20：汇总所有作物名（支持跨作物批量施肥）
      const allCropNames = [...new Set(selectedAreas.map(a => a.cropName).filter(Boolean))];
      await store.updateItem(record.id,{
        cropNames: allCropNames.length > 0 ? JSON.stringify(allCropNames) : undefined,
        fertilizeTime:form.fertilizeTime,cropName:selectedAreas[0].cropName,
        greenhouseName:selectedAreas[0]?.greenhouseName||selectedAreas[0]?.area||form.greenhouseName||record.greenhouseName||'',
        greenhouseId:selectedAreas[0].greenhouseId,areaName:selectedAreas[0].area,
        plantingId:selectedAreas[0].type==='planting'?selectedAreas[0].id:undefined,
        plantingCode:selectedAreas[0].type==='planting'?selectedAreas[0].code:undefined,
        seedlingId:selectedAreas[0].type==='seedling'?selectedAreas[0].id:undefined,
        seedlingCode:selectedAreas[0].type==='seedling'?selectedAreas[0].code:undefined,
        fertilizerName:pFert.fertilizerName,fertilizerType:pFert.fertilizerType,
        dilutionRatio:pFert.dilutionRatio,quantity:totalQty,unit:pFert.unit,
        unitPrice:Number(pFert.unitPrice)||0,totalCost:Number(totalCost)||0,operatorName:form.operatorName||undefined,
        description:form.description||undefined,fertilizationPool:JSON.stringify(poolRows),
        specId:pFert.specId,specBrandName:pFert.brandName,specUnitPriceSnapshot:pFert.unitPrice,
      });
      onSaved();
    } catch(err) {
      // 2026-07-16：UI 错误脱敏
      console.error('[FertilizerEditModal] 保存出错:', err);
      await showAlert('保存失败，请稍后重试。如持续出现请联系管理员。');
    }
    finally { setSubmitting(false); }
  };

  if (!record) return null;
  const cropName = selectedAreas[0]?.cropName||record.cropName||'';
  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={`编辑施肥记录 — ${record.fertilizerCode}`} size="xxxl" showFooter={false}>
      {isIot && <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm shrink-0"><AlertTriangle className="w-5 h-5"/>IoT 自动记录，仅可查看不可修改</div>}
      {poolBroken && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0"><AlertTriangle className="w-5 h-5"/>该记录施肥方案数据格式异常，无法编辑保存。请联系管理员修复数据后再试。</div>}
      <div className="flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-gray-900">施肥编号</Label><Input type="text" value={record.fertilizerCode} readOnly className="h-10 bg-gray-50 font-mono text-sm" /></div>
              <div><Label className="text-gray-900">施肥时间 <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.fertilizeTime} onChange={e=>setForm({...form,fertilizeTime:e.target.value})}
                  className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" disabled={isIot} /></div>
              <div><Label className="text-gray-900">操作员</Label>
                {operatorOptions.length>0?<select value={form.operatorName} onChange={e=>setForm({...form,operatorName:e.target.value})} disabled={isIot}
                  className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"><option value="">选择操作员</option>{operatorOptions.map(n=><option key={n} value={n}>{n}</option>)}</select>
                  :<Input type="text" value={form.operatorName} onChange={e=>setForm({...form,operatorName:e.target.value})} disabled={isIot} placeholder="操作员姓名" className="h-10 text-sm" />}</div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📍 施肥区域</h3>
            {cropName&&<p className="text-xs text-emerald-600 mb-2">🌱 当前作物：{cropName}</p>}
            {!isIot && (<>
              <div className="relative" ref={areaRef}>
                <div className="flex items-center gap-2 mb-2">
                  <TabsList selectedValue={areaTab} onValueChange={(v) => setAreaTab(v as 'planting'|'seedling')}>
                    <TabsTrigger value="planting" className="text-sm">种植区域</TabsTrigger>
                    <TabsTrigger value="seedling" className="text-sm">育苗区域</TabsTrigger>
                  </TabsList>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                    <Input type="text" value={areaSearch} onChange={e=>{setAreaSearch(e.target.value);setShowAreaDropdown(true)}} onFocus={()=>setShowAreaDropdown(true)} placeholder={`搜索${areaTab==='planting'?'种植':'育苗'}批号/作物/区域`} className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                {showAreaDropdown&&areaOptions.length>0&&<div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {areaOptions.map((item:any)=><button key={item.id} onClick={()=>addArea(item)} className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 text-sm"><span className="font-medium">{item.cropName}</span><span className="text-gray-400 mx-1">·</span><span className="text-gray-600">{areaTab==='planting'?item.rootName||item.areaName:item.siteName||'育苗区'}</span></button>)}</div>}
              </div>
            </>)}
            {selectedAreas.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">
              {selectedAreas.map(a=><span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700">{a.type==='planting'?'🌱':'🌿'} {a.cropName} · {a.area} {!isIot&&<button onClick={()=>removeArea(a.id)} className="ml-0.5 text-emerald-400 hover:text-red-500"><X className="w-3 h-3"/></button>}</span>)}
            </div>}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 肥料选择与用量</h3>
            <FertilizerPoolEditor pool={fertilizerPool} onChange={isIot?()=>{}:setFertilizerPool} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📝 备注</h3>
            <TextArea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} disabled={isIot} placeholder="施肥备注" rows={2}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4"/>取消</Button>
          {!isIot&&<Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting||selectedAreas.length===0||fertilizerPool.length===0||!form.fertilizeTime||poolBroken}>{submitting?'保存中...':'保存'}</Button>}
        </div>
      </div>
    </UnifiedModal>
  );
}
