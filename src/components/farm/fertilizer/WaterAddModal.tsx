/**
 * 浇水新增弹窗（2026-07-20 水肥管理 Phase 1）
 * 仿 FertilizerAddModal，每个已选区域一行（浇水方式/用水量/单位）
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §5.6
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { UnifiedModal, Button, Input, Label, TextArea, TabsList, TabsTrigger } from '@/components/ui';
import { useWateringStore, usePlantingStore, useSeedlingStore } from '@/stores';
import { showAlert, showToast } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { WATERING_METHOD_MAP } from '@/constants/cropConstants';

interface SelectedArea {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;
  greenhouseId?: string;
  greenhouseName?: string;
}

interface WateringRow {
  area: SelectedArea;
  wateringMethod: string;
  waterAmount: string;
  waterUnit: string;
  remark: string;
}

const WATER_UNITS = ['L', 'ml', 'm3', 'kg'] as const;

function labelOfMethod(code: string): string {
  return WATERING_METHOD_MAP[code] || code || '-';
}

/** 浇水记录新增弹窗 */
export function WaterAddModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const store = useWateringStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();

  const [form, setForm] = useState({ waterTime: '', operatorName: '', description: '', waterCost: '' });
  const [waterCode, setWaterCode] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
  const [wateringRows, setWateringRows] = useState<WateringRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 区域搜索状态
  const [areaTab, setAreaTab] = useState<'planting' | 'seedling'>('planting');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 默认时间 = 当前本地时间（datetime-local 格式 YYYY-MM-DDTHH:mm）
  useEffect(() => {
    if (!isOpen) return;
    plantingStore.loadItems?.();
    seedlingStore.loadItems?.();
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    setForm({ waterTime: `${todayLocal(now)}T${hh}:${mi}`, operatorName: '', description: '', waterCost: '' });
    setWaterCode('');
    setSelectedAreas([]);
    setWateringRows([]);
  }, [isOpen]); // 仅依赖 isOpen；loadItems 来自稳定 Store 引用

  // 编号生成（失败时不再静默吞错）
  const generateCode = useCallback(async () => {
    try {
      const code = await store.generateCode();
      if (code) setWaterCode(code);
    } catch (err) {
      await showAlert('编号生成失败，请重试或手动输入：' + (err instanceof Error ? err.message : String(err)));
    }
  }, [store]);

  useEffect(() => { if (isOpen) generateCode(); }, [isOpen, generateCode]);

  // 点击外部关闭下拉
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setShowAreaDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 区域选项（Tab + 关键字模糊匹配）
  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
    // 2026-07-24：显示品种（subVariety1Name / cropVariety）而非作物大类（cropName）
    const displayName = (p: any) => p.subVariety1Name || p.cropVariety || p.cropName || '';
    if (areaTab === 'planting') {
      return (plantingStore.items as any[]).filter((p: any) => !p.isHarvest).filter((p: any) =>
        !kw || (p.plantCode || '').toLowerCase().includes(kw)
          || (p.cropName || '').toLowerCase().includes(kw)
          || (p.cropVariety || '').toLowerCase().includes(kw)
          || (p.subVariety1Name || '').toLowerCase().includes(kw)
          || (p.rootName || '').toLowerCase().includes(kw));
    }
    return (seedlingStore.items as any[]).filter((s: any) =>
      !kw || (s.seedlingCode || '').toLowerCase().includes(kw)
        || (s.displayName || '').toLowerCase().includes(kw)
        || (s.cropName || '').toLowerCase().includes(kw)
        || (s.siteName || '').toLowerCase().includes(kw));
  }, [areaTab, areaSearch, plantingStore.items, seedlingStore.items]);

  // 2026-07-24：种植项展示用品种（与种植管理列表一致：红颜 > 草莓）
  const formatPlantingDisplay = (p: any) => {
    const variety = p.subVariety1Name || p.cropVariety || p.cropName || '';
    return variety;
  };

  // 添加区域（与施肥一致：支持跨作物多区域，自动追加空浇水行）
  const addArea = useCallback((item: any) => {
    // 2026-07-24：cropName 优先存品种（与种植管理列表一致：红颜），作物大类作为 _cropCategory 备份
    const displayCrop = item.subVariety1Name || item.cropVariety || item.cropName || '';
    const area: SelectedArea = areaTab === 'planting'
      ? { type: 'planting', id: item.id, code: item.plantCode || item.code, cropName: displayCrop, area: item.rootName || item.areaName, greenhouseId: item.greenhouseId, greenhouseName: item.greenhouseName }
      : { type: 'seedling', id: item.id, code: item.seedlingCode || item.code, cropName: displayCrop, area: item.siteName || '育苗区', greenhouseId: item.greenhouseId, greenhouseName: item.greenhouseName || item.greenhouseName };
    if (selectedAreas.some((a) => a.id === area.id)) {
      setAreaSearch('');
      setShowAreaDropdown(false);
      return;
    }
    setSelectedAreas((prev) => [...prev, area]);
    setWateringRows((prev) => [...prev, { area, wateringMethod: 'drip_irrigation', waterAmount: '', waterUnit: 'L', remark: '' }]);
    setAreaSearch('');
    setShowAreaDropdown(false);
  }, [areaTab, selectedAreas]);

  // 移除区域（同步移除对应浇水行）
  const removeArea = useCallback((id: string) => {
    setSelectedAreas((prev) => prev.filter((a) => a.id !== id));
    setWateringRows((prev) => prev.filter((r) => r.area.id !== id));
  }, []);

  // 操作员列表（从种植/育苗 manager 字段提取）
  const operatorOptions = useMemo(() => {
    const names = new Set<string>();
    plantingStore.items?.forEach((p: any) => p.manager && names.add(p.manager));
    seedlingStore.items?.forEach((s: any) => s.manager && names.add(s.manager));
    return Array.from(names);
  }, [plantingStore.items, seedlingStore.items]);

  // 浇水池单行字段更新（不可变）
  const updateRow = (areaId: string, patch: Partial<Omit<WateringRow, 'area'>>) => {
    setWateringRows((prev) => prev.map((r) => r.area.id === areaId ? { ...r, ...patch } : r));
  };

  // 提交
  const handleSubmit = async () => {
    if (selectedAreas.length === 0) { await showAlert('请至少选择一个浇水区域'); return; }
    if (!form.waterTime) { await showAlert('请选择浇水时间'); return; }
    if (wateringRows.length === 0) { await showAlert('请至少填写一个区域的用水明细'); return; }
    const invalid = wateringRows.find((r) => !r.wateringMethod || !r.waterAmount || Number(r.waterAmount) <= 0);
    if (invalid) { await showAlert('每个区域的浇水方式和用水量（>0）都必须填写'); return; }
    // 校验单位一致（避免总用水量单位歧义）
    const units = new Set(wateringRows.map((r) => r.waterUnit));
    if (units.size > 1) { await showAlert('所有区域行的单位必须一致（当前使用了 ' + Array.from(units).join(', ') + '），请统一后再保存'); return; }

    setSubmitting(true);
    try {
      const waterTime = form.waterTime.replace('T', ' ');
      const poolRows = wateringRows.map((r) => ({
        type: r.area.type,
        id: r.area.id,
        code: r.area.code,
        cropName: r.area.cropName,
        cropCode: '',
        area: r.area.area,
        wateringMethod: r.wateringMethod,
        waterAmount: Number(r.waterAmount),
        waterUnit: r.waterUnit,
        remark: r.remark || '',
      }));
      const totalWater = poolRows.reduce((s, r) => s + r.waterAmount, 0);
      const unit = wateringRows[0].waterUnit;
      const primary = selectedAreas[0];
      // 2026-07-24：跨作物多区域时汇总所有作物名（与施肥一致）
      const allCropNames = [...new Set(selectedAreas.map((a) => a.cropName).filter(Boolean))];

      await store.createItem({
        waterCode: waterCode || undefined,
        recordType: 'manual',
        dataSource: 'manual',
        cropName: primary.cropName,
        cropNames: allCropNames.length > 0 ? JSON.stringify(allCropNames) : undefined,
        greenhouseName: primary.greenhouseName || primary.area || (areaTab === 'seedling' ? '育苗温室' : ''),
        greenhouseId: primary.greenhouseId,
        areaName: primary.area,
        plantingId: primary.type === 'planting' ? primary.id : undefined,
        plantingCode: primary.type === 'planting' ? primary.code : undefined,
        seedlingId: primary.type === 'seedling' ? primary.id : undefined,
        seedlingCode: primary.type === 'seedling' ? primary.code : undefined,
        waterPool: JSON.stringify(poolRows),
        totalWater,
        waterUnit: unit,
        waterTime,
        operatorName: form.operatorName || undefined,
        description: form.description || undefined,
        // 2026-07-25 P1：与详情/导出对齐 — 提交时写入水费
        waterCost: form.waterCost ? Number(form.waterCost) : undefined,
      });
      showToast('浇水记录已新增', 'success');
      onSaved();
      onClose();
    } catch (err) {
      console.error('[WaterAddModal] 保存出错:', err);
      await showAlert('保存失败，请稍后重试。如持续出现请联系管理员。');
    } finally {
      setSubmitting(false);
    }
  };

  const cropName = selectedAreas[0]?.cropName || '';
// 2026-07-24：支持跨作物，与施肥一致
const allCropNames = Array.from(new Set(selectedAreas.map((a) => a.cropName).filter(Boolean)));

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="新增浇水记录" size="xxl" showFooter={false}>
      <div className="flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* 基础信息 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">浇水编号</Label>
                <div className="flex gap-1">
                  <Input type="text" value={waterCode} readOnly className="flex-1 h-10 bg-gray-50 font-mono text-sm" />
                  <Button variant="secondary" size="sm" onClick={generateCode} title="重新生成" className="h-10"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-gray-900">浇水时间 <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.waterTime} onChange={(e) => setForm({ ...form, waterTime: e.target.value })}
                  className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-900">操作员</Label>
                {operatorOptions.length > 0 ? (
                  <select value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">选择操作员</option>
                    {operatorOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <Input type="text" value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} placeholder="操作员姓名" className="h-10 text-sm" />
                )}
              </div>
              {/* 2026-07-25 P1：与详情/导出对齐 — 水费输入字段 */}
              <div>
                <Label className="text-gray-900">水费（元）</Label>
                <Input type="number" step="0.01" min="0" value={form.waterCost}
                  onChange={(e) => setForm({ ...form, waterCost: e.target.value })}
                  placeholder="选填" className="h-10 text-sm" />
              </div>
            </div>
          </div>

          {/* 区域选择 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📍 浇水区域（多选，支持不同作物不同区域）</h3>
            {allCropNames.length > 0 && (
              <p className="text-xs text-emerald-600 mb-2">
                🌱 {allCropNames.length === 1 ? '当前作物' : `包含作物（${allCropNames.length}）`}：{allCropNames.join('、')}
              </p>
            )}
            <div className="relative" ref={areaRef}>
              <div className="flex items-center gap-2 mb-2">
                <TabsList selectedValue={areaTab} onValueChange={(v) => setAreaTab(v as 'planting' | 'seedling')}>
                  <TabsTrigger value="planting" className="text-sm">种植区域</TabsTrigger>
                  <TabsTrigger value="seedling" className="text-sm">育苗区域</TabsTrigger>
                </TabsList>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input type="text" value={areaSearch} onChange={(e) => { setAreaSearch(e.target.value); setShowAreaDropdown(true); }} onFocus={() => setShowAreaDropdown(true)}
                    placeholder={`搜索${areaTab === 'planting' ? '种植' : '育苗'}批号/作物/区域`} className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              {showAreaDropdown && areaOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {areaOptions.map((item: any) => (
                    <button key={item.id} onClick={() => addArea(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 text-sm">
                      <span className="font-medium">{formatPlantingDisplay(item)}</span>
                      {item.cropName && formatPlantingDisplay(item) !== item.cropName && (
                        <span className="text-gray-400 text-xs ml-1">（{item.cropName}）</span>
                      )}
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-600">{areaTab === 'planting' ? item.rootName || item.areaName : item.siteName || '育苗区'}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-xs text-gray-500 font-mono">{areaTab === 'planting' ? item.plantCode : item.seedlingCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedAreas.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700">
                    {a.type === 'planting' ? '🌱' : '🌿'} {a.cropName} · {a.area} · {a.code}
                    <button onClick={() => removeArea(a.id)} className="ml-0.5 text-emerald-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 浇水池 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">💧 浇水明细（按区域填写）</h3>
            {wateringRows.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">请先在上方选择浇水区域</p>
            ) : (
              <div className="space-y-2">
                {wateringRows.map((row) => (
                  <div key={row.area.id} className="grid grid-cols-12 gap-2 items-center bg-emerald-50/40 border border-emerald-100 rounded-lg px-3 py-2">
                    <div className="col-span-3 text-sm">
                      <span className="text-gray-400 mr-1">{row.area.type === 'planting' ? '🌱' : '🌿'}</span>
                      <span className="font-medium text-gray-800">{row.area.area}</span>
                      <span className="ml-1 text-xs text-gray-500">· {row.area.code}</span>
                    </div>
                    <div className="col-span-3">
                      <select value={row.wateringMethod} onChange={(e) => updateRow(row.area.id, { wateringMethod: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        title={labelOfMethod(row.wateringMethod)}>
                        {Object.entries(WATERING_METHOD_MAP).map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" step="0.01" min="0" value={row.waterAmount}
                        onChange={(e) => updateRow(row.area.id, { waterAmount: e.target.value })}
                        placeholder="用量" className="h-9 text-sm" />
                    </div>
                    <div className="col-span-1">
                      <select value={row.waterUnit} onChange={(e) => updateRow(row.area.id, { waterUnit: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                        {WATER_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input type="text" value={row.remark}
                        onChange={(e) => updateRow(row.area.id, { remark: e.target.value })}
                        placeholder="备注（选填）" className="h-9 text-sm" />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-amber-600">提示：所有区域的单位必须一致，便于统计总用水量</p>
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📝 备注</h3>
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="浇水备注" rows={2}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4" />取消</Button>
          <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting || selectedAreas.length === 0 || !form.waterTime || wateringRows.length === 0}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default WaterAddModal;
