/**
 * 施肥新增弹窗（V2 改造 2026-07-12）
 * 仿病虫害药剂池模式：关联业务选区域 → 肥料类型筛选 → 肥料池 → 提交
 * 使用 FertilizerPoolEditor 组件管理多肥料选择
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { TabsList, TabsTrigger } from '@/components/ui';
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { FertilizerPoolEditor } from './FertilizerPoolEditor';
import type { FertilizerPoolItem } from './FertilizerPoolEditor';

/** 区域选取项 */
interface SelectedArea {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;
  greenhouseId?: string;
  greenhouseName?: string;
}

export function FertilizerAddModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const store = useFertilizerStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const libStore = useFertilizerLibraryStore();

  const [form, setForm] = useState({ fertilizeTime: '', operatorName: '', description: '', greenhouseName: '' });
  const [fertilizerCode, setFertilizerCode] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 区域搜索
  const [areaTab, setAreaTab] = useState<'planting' | 'seedling'>('planting');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => { if (isOpen) {
    plantingStore.loadItems?.();
    seedlingStore.loadItems?.();
    libStore.fetchItems();
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    setForm({ fertilizeTime: `${todayLocal(now)} ${hh}:00`, operatorName: '', description: '', greenhouseName: '' });
    setFertilizerCode('');
    setSelectedAreas([]);
    setFertilizerPool([]);
  }}, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => { if (areaRef.current && !areaRef.current.contains(e.target as Node)) setShowAreaDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 种植/育苗选项
  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
    if (areaTab === 'planting') {
      return (plantingStore.items as any[]).filter((p: any) => !p.isHarvest).filter((p: any) =>
        !kw || (p.plantCode||'').toLowerCase().includes(kw) || (p.cropName||'').toLowerCase().includes(kw) || (p.rootName||'').toLowerCase().includes(kw));
    }
    return (seedlingStore.items as any[]).filter((s: any) =>
      !kw || (s.seedlingCode||'').toLowerCase().includes(kw) || (s.cropName||'').toLowerCase().includes(kw) || (s.siteName||'').toLowerCase().includes(kw));
  }, [areaTab, areaSearch, plantingStore.items, seedlingStore.items]);

  // 添加区域（同作物校验）
  const addArea = useCallback((item: any) => {
    const area: SelectedArea = areaTab === 'planting'
      ? { type:'planting', id:item.id, code:item.plantCode||item.code, cropName:item.cropName, area:item.rootName||item.areaName, greenhouseId:item.greenhouseId, greenhouseName:item.greenhouseName }
      : { type:'seedling', id:item.id, code:item.seedlingCode||item.code, cropName:item.cropName, area:item.siteName||'育苗区', greenhouseId:item.greenhouseId, greenhouseName:item.greenhouseName||item.greenhouseName };
    const existingCrop = selectedAreas[0]?.cropName;
    if (existingCrop && area.cropName !== existingCrop) {
      showAlert(`所选区域作物为「${area.cropName}」，与已选「${existingCrop}」不一致。同一次施肥只能针对同一作物。`);
      return;
    }
    if (selectedAreas.some((a) => a.id === area.id)) return;
    setSelectedAreas((prev) => [...prev, area]);
    if (!form.greenhouseName && area.greenhouseName) setForm((f) => ({ ...f, greenhouseName: area.greenhouseName }));
    setAreaSearch('');
    setShowAreaDropdown(false);
  }, [areaTab, selectedAreas, form.greenhouseName]);

  const removeArea = useCallback((id: string) => setSelectedAreas((p) => p.filter((a) => a.id !== id)), []);

  // 生成编号（2026-07-16：失败时弹 toast，不再静默吞错）
  const generateCode = useCallback(async () => {
    try {
      const code = await store.generateCode();
      if (code) setFertilizerCode(code);
    } catch (err) {
      // 静默吞错修复：弹 toast 告知用户"编号生成失败"
      await showAlert('编号生成失败，请重试或手动输入：' + (err instanceof Error ? err.message : String(err)));
    }
  }, [store]);

  useEffect(() => { if (isOpen) generateCode(); }, [isOpen]);

  // 获取操作员列表
  const operatorOptions = useMemo(() => {
    const names = new Set<string>();
    plantingStore.items?.forEach((p: any) => p.manager && names.add(p.manager));
    seedlingStore.items?.forEach((s: any) => s.manager && names.add(s.manager));
    return Array.from(names);
  }, [plantingStore.items, seedlingStore.items]);

  // 提交
  const handleSubmit = async () => {
    const gh = selectedAreas[0]?.greenhouseName || selectedAreas[0]?.area || form.greenhouseName || '';
    if (selectedAreas.length === 0) { await showAlert('请至少选择一个施肥区域'); return; }
    if (fertilizerPool.length === 0) { await showAlert('请至少选择一种肥料'); return; }
    if (!form.fertilizeTime) { await showAlert('请选择施肥时间'); return; }

    // 校验每行用量 > 0
    const hasInvalid = fertilizerPool.some((p) => !p.dosage || Number(p.dosage) <= 0);
    if (hasInvalid) { await showAlert('每种肥料的用量必须大于 0'); return; }

    setSubmitting(true);
    try {
      // 构造池 JSON：每个区域 × 每个肥料 = 一行
      const poolRows = selectedAreas.flatMap((area) =>
        fertilizerPool.map((fert) => ({
          type: area.type,
          id: area.id,
          code: area.code,
          cropName: area.cropName,
          cropCode: '',
          area: area.area,
          quantity: Number(fert.dosage),
          unit: fert.unit,
          dilutionRatio: fert.dilutionRatio,
          fertilizationMethod: fert.fertilizationMethod,
          fertilizerName: fert.fertilizerName,
          unitPrice: Number(fert.unitPrice),
          fertilizerSpecId: fert.specId,
          specBrandName: fert.brandName,
          specUnitPrice: Number(fert.unitPrice),
          specBatchNumber: '',
        }))
      );

      const totalQty = poolRows.reduce((s, r) => s + Number(r.quantity), 0);
      const totalCost = poolRows.reduce((s, r) => s + Number(r.quantity) * Number(r.unitPrice), 0);
      const primaryArea = selectedAreas[0];
      const primaryFert = fertilizerPool[0];

      await store.createItem({
        fertilizerCode: fertilizerCode || undefined,
        fertilizeTime: form.fertilizeTime,
        cropName: primaryArea.cropName,
        greenhouseName: gh || (areaTab==='seedling'?'育苗温室':selectedAreas[0]?.area||''),
        greenhouseId: primaryArea.greenhouseId,
        areaName: primaryArea.area,
        plantingId: primaryArea.type === 'planting' ? primaryArea.id : undefined,
        plantingCode: primaryArea.type === 'planting' ? primaryArea.code : undefined,
        seedlingId: primaryArea.type === 'seedling' ? primaryArea.id : undefined,
        seedlingCode: primaryArea.type === 'seedling' ? primaryArea.code : undefined,
        fertilizerName: primaryFert.fertilizerName,
        fertilizerType: primaryFert.fertilizerType,
        dilutionRatio: primaryFert.dilutionRatio,
        quantity: totalQty,
        unit: fertilizerPool[0]?.unit || 'kg',
        unitPrice: Number(primaryFert.unitPrice) || 0,
        totalCost: Number(totalCost) || 0,
        operatorName: form.operatorName || undefined,
        description: form.description || undefined,
        dataSource: 'manual' as const,
        fertilizationPool: JSON.stringify(poolRows),
        specId: primaryFert.specId,
        specBrandName: primaryFert.brandName,
        specUnitPriceSnapshot: primaryFert.unitPrice,
        specBatchNumber: '',
      });
      onSaved();
    } catch (err) {
      await showAlert('保存出错：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const cropName = selectedAreas[0]?.cropName || '';

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="新增施肥记录" size="xxxl" showFooter={false}>
      <div className="flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {/* 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-900">施肥编号</Label>
              <div className="flex gap-1">
                <Input type="text" value={fertilizerCode} readOnly className="flex-1 h-10 bg-gray-50 font-mono text-sm" />
                <Button variant="secondary" size="sm" onClick={generateCode} title="重新生成" className="h-10"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-gray-900">施肥时间 <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" value={form.fertilizeTime} onChange={(e) => setForm({...form, fertilizeTime: e.target.value})}
                className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <Label className="text-gray-900">操作员</Label>
              {operatorOptions.length > 0 ? (
                <select value={form.operatorName} onChange={(e) => setForm({...form, operatorName: e.target.value})}
                  className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">选择操作员</option>
                  {operatorOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <Input type="text" value={form.operatorName} onChange={(e) => setForm({...form, operatorName: e.target.value})} placeholder="操作员姓名" className="h-10 text-sm" />
              )}
            </div>
          </div>
        </div>

        {/* 关联业务 → 选择区域 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📍 施肥区域（多选，必须同一作物）</h3>
          {cropName && <p className="text-xs text-emerald-600 mb-2">🌱 当前作物：{cropName}</p>}
          <div className="relative" ref={areaRef}>
            <div className="flex items-center gap-2 mb-2">
              <TabsList selectedValue={areaTab} onValueChange={(v) => setAreaTab(v as 'planting'|'seedling')}>
                <TabsTrigger value="planting" className="text-sm">种植区域</TabsTrigger>
                <TabsTrigger value="seedling" className="text-sm">育苗区域</TabsTrigger>
              </TabsList>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="text" value={areaSearch} onChange={(e)=>{setAreaSearch(e.target.value);setShowAreaDropdown(true)}} onFocus={()=>setShowAreaDropdown(true)}
                  placeholder={`搜索${areaTab==='planting'?'种植':'育苗'}批号/作物/区域`} className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            {showAreaDropdown && areaOptions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {areaOptions.map((item: any) => (
                  <button key={item.id} onClick={() => addArea(item)}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 text-sm">
                    <span className="font-medium">{item.cropName}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-600">{areaTab==='planting'?item.rootName||item.areaName:item.siteName||'育苗区'}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-xs text-gray-500 font-mono">{areaTab==='planting'?item.plantCode:item.seedlingCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 已选区域 chips */}
          {selectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedAreas.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700">
                  {a.type==='planting'?'🌱':'🌿'} {a.cropName} · {a.area} · {a.code}
                  <button onClick={()=>removeArea(a.id)} className="ml-0.5 text-emerald-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 肥料池编辑器 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 肥料选择与用量</h3>
          <FertilizerPoolEditor pool={fertilizerPool} onChange={setFertilizerPool} />
        </div>

        {/* 备注 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📝 备注</h3>
          <TextArea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="施肥备注" rows={2}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        </div>
      </div>
      {/* 固定在底部的操作按钮 */}
      <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-200 flex justify-end gap-3 shrink-0">
        <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4"/>取消</Button>
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting||selectedAreas.length===0||fertilizerPool.length===0||!form.fertilizeTime}>
          {submitting?'保存中...':'保存'}
        </Button>
      </div>
    </div>
    </UnifiedModal>
  );
}
