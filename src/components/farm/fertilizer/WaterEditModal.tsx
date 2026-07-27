/**
 * 浇水编辑弹窗（2026-07-20 水肥管理 Phase 1）
 * 仿 FertilizerEditModal，反序列化 record.waterPool
 * 编辑保护：recordType !== 'manual' → 全字段禁用 + 隐藏保存按钮
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §5.4 §5.6
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, X, Trash2, AlertTriangle } from 'lucide-react';
import { UnifiedModal, Button, Input, Label, TextArea, TabsList, TabsTrigger } from '@/components/ui';
import { useWateringStore, usePlantingStore, useSeedlingStore } from '@/stores';
import type { WateringData } from '@/stores';
import { showAlert, showToast } from '@/lib/dialogService';
import { WATERING_METHOD_MAP } from '@/constants/cropConstants';
import { WATER_UNITS, normalizeWaterUnit, getWaterUnitCategory } from '@/constants/waterUnits';

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
  // 2026-07-25：与 WaterAddModal 对齐 — 每行可填备注（按区域独立备注）
  remark: string;
}

function labelOfMethod(code: string): string {
  return WATERING_METHOD_MAP[code] || code || '-';
}

/**
 * 浇水池 JSON 行（最小可序列化结构）
 * 字段与 design §3.2 对齐，编辑时宽容解析（缺失字段走兜底）
 */
interface WateringPoolRow {
  type?: string;
  id?: string;
  code?: string;
  cropName?: string;
  area?: string;
  wateringMethod?: string;
  waterAmount?: number;
  waterUnit?: string;
  [key: string]: unknown;
}

/** 安全解析 record.waterPool JSON（修 silent failure） */
function parseWaterPool(json: string | null | undefined): WateringPoolRow[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r != null && typeof r === 'object');
  } catch (e) {
    console.warn('[WaterEditModal] 池 JSON 解析失败:', e);
    return [];
  }
}

/** 编辑保护：recordType 非 manual 时只读（施肥稀释 / 每日记录同步） */
function readonlyMessage(recordType: string | undefined): string {
  if (recordType === 'fertilizer_dilution') return '该浇水记录由施肥记录自动生成，请在施肥记录中修改';
  if (recordType === 'daily_sync') return '该浇水记录由每日记录同步，请在种植/育苗页面修改';
  return '该浇水记录不可编辑';
}

/** 浇水记录编辑弹窗 */
export function WaterEditModal({ isOpen, record, onClose, onSaved }: {
  isOpen: boolean;
  record: WateringData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const store = useWateringStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();

  const isReadonly = !record || record.recordType !== 'manual';

  const [form, setForm] = useState({ waterTime: '', operatorName: '', description: '', waterCost: '' });
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
  const [wateringRows, setWateringRows] = useState<WateringRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [poolBroken, setPoolBroken] = useState(false);

  const [areaTab, setAreaTab] = useState<'planting' | 'seedling'>('planting');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 初始化表单：必须从 record 反序列化浇水池
  useEffect(() => {
    if (!isOpen || !record) return;
    // 把时间戳格式化为 datetime-local 输入框期望的 YYYY-MM-DDTHH:mm
    const wt = record.waterTime || '';
    const wtForInput = wt.includes('T') ? wt.slice(0, 16) : (wt.length >= 16 ? wt.slice(0, 16).replace(' ', 'T') : wt);
    setForm({ waterTime: wtForInput, operatorName: record.operatorName || '', description: record.description || '', waterCost: record.waterCost != null ? String(record.waterCost) : '' });
    setPoolBroken(false);

    // 反序列化池
    const rows = parseWaterPool(record.waterPool);
    if (record.waterPool && rows.length === 0 && record.waterPool.length > 2) {
      // 池 JSON 存在但解析为空（损坏）→ 禁用保存
      setPoolBroken(true);
      setSelectedAreas([]);
      setWateringRows([]);
    } else {
      const seen = new Set<string>();
      const areas: SelectedArea[] = [];
      const poolR: WateringRow[] = [];
      for (const r of rows) {
        const id = String(r.id || '');
        if (id && !seen.has(id)) {
          seen.add(id);
          areas.push({
            type: (r.type === 'seedling' ? 'seedling' : 'planting') as 'planting' | 'seedling',
            id,
            code: String(r.code || ''),
            cropName: String(r.cropName || record.cropName || ''),
            area: String(r.area || ''),
            greenhouseId: record.greenhouseId,
            greenhouseName: record.greenhouseName,
          });
          poolR.push({
            area: areas[areas.length - 1],
            wateringMethod: String(r.wateringMethod || 'drip_irrigation'),
            waterAmount: r.waterAmount != null ? String(r.waterAmount) : '',
            waterUnit: String(r.waterUnit || 'L'),
            // 2026-07-25：与 WaterAddModal 对齐 — 反序列化时填充备注
            remark: String(r.remark || ''),
          });
        }
      }
      setSelectedAreas(areas);
      setWateringRows(poolR);
    }

    plantingStore.loadItems?.();
    seedlingStore.loadItems?.();
  }, [isOpen, record]); // 仅依赖 isOpen/record

  // 点击外部关闭下拉
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setShowAreaDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 区域选项（与 WaterAddModal 对齐：搜索支持品种字段）
  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
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
        || (s.cropName || '').toLowerCase().includes(kw)
        || (s.cropVariety || '').toLowerCase().includes(kw)
        || (s.subVariety1Name || '').toLowerCase().includes(kw)
        || (s.siteName || '').toLowerCase().includes(kw));
  }, [areaTab, areaSearch, plantingStore.items, seedlingStore.items]);

  // 2026-07-25：与 WaterAddModal 对齐 — 区域选项展示用品种名（与种植管理列表一致：红颜 > 草莓）
  const formatPlantingDisplay = (item: any) => item.subVariety1Name || item.cropVariety || item.cropName || '';

  const addArea = useCallback((item: any) => {
    // 2026-07-25：与 WaterAddModal 对齐 — 品种名优先（subVariety1Name / cropVariety）+ 取消同作物校验（支持跨作物批量浇水）
    const displayCrop = item.subVariety1Name || item.cropVariety || item.cropName || '';
    const area: SelectedArea = areaTab === 'planting'
      ? { type: 'planting', id: item.id, code: item.plantCode || item.code, cropName: displayCrop, area: item.rootName || item.areaName, greenhouseId: item.greenhouseId, greenhouseName: item.greenhouseName }
      : { type: 'seedling', id: item.id, code: item.seedlingCode || item.code, cropName: displayCrop, area: item.siteName || '育苗区', greenhouseId: item.greenhouseId, greenhouseName: item.greenhouseName };
    if (selectedAreas.some((a) => a.id === area.id)) {
      setAreaSearch('');
      setShowAreaDropdown(false);
      return;
    }
    setSelectedAreas((prev) => [...prev, area]);
    setWateringRows((prev) => [...prev, { area, wateringMethod: 'drip_irrigation', waterAmount: '', waterUnit: wateringRows[0]?.waterUnit || 'L', remark: '' }]);
    setAreaSearch('');
    setShowAreaDropdown(false);
  }, [areaTab, selectedAreas, wateringRows]);

  const removeArea = useCallback((id: string) => {
    setSelectedAreas((prev) => prev.filter((a) => a.id !== id));
    setWateringRows((prev) => prev.filter((r) => r.area.id !== id));
  }, []);

  const operatorOptions = useMemo(() => {
    const names = new Set<string>();
    plantingStore.items?.forEach((p: any) => p.manager && names.add(p.manager));
    seedlingStore.items?.forEach((s: any) => s.manager && names.add(s.manager));
    return Array.from(names);
  }, [plantingStore.items, seedlingStore.items]);

  const updateRow = (areaId: string, patch: Partial<Omit<WateringRow, 'area'>>) => {
    setWateringRows((prev) => prev.map((r) => r.area.id === areaId ? { ...r, ...patch } : r));
  };

  const handleSubmit = async () => {
    if (isReadonly) { await showAlert('该记录不可编辑'); return; }
    if (selectedAreas.length === 0) { await showAlert('请至少选择一个浇水区域'); return; }
    if (!form.waterTime) { await showAlert('请选择浇水时间'); return; }
    if (wateringRows.length === 0) { await showAlert('请至少填写一个区域的用水明细'); return; }
    const invalid = wateringRows.find((r) => !r.wateringMethod || !r.waterAmount || Number(r.waterAmount) <= 0);
    if (invalid) { await showAlert('每个区域的浇水方式和用水量（>0）都必须填写'); return; }
    // 2026-07-27 审核修复 C-3/H-13：单位归一化 + 物理量分类校验
    const normalizedUnits = wateringRows.map((r) => normalizeWaterUnit(r.waterUnit));
    const units = new Set(normalizedUnits);
    if (units.size > 1) { await showAlert('所有区域行的单位必须一致（当前使用了 ' + Array.from(units).join(', ') + '），请统一后再保存'); return; }
    const categories = new Set(normalizedUnits.map(getWaterUnitCategory));
    if (categories.size > 1) { await showAlert('不能混用体积单位（L/ml/m³）和质量单位（kg），请统一后再保存'); return; }

    setSubmitting(true);
    try {
      const waterTime = form.waterTime.replace('T', ' ');
      const poolRows = wateringRows.map((r, i) => ({
        type: r.area.type,
        id: r.area.id,
        code: r.area.code,
        cropName: r.area.cropName,
        cropCode: '',
        area: r.area.area,
        wateringMethod: r.wateringMethod,
        waterAmount: Number(r.waterAmount),
        waterUnit: normalizedUnits[i],  // 2026-07-27 修复 C-3：写入已归一化的单位
        // 2026-07-25：与 WaterAddModal 对齐 — 提交时写入备注
        remark: r.remark || '',
      }));
      const totalWater = poolRows.reduce((s, r) => s + r.waterAmount, 0);
      const unit = normalizedUnits[0];  // 2026-07-27 修复 C-3：主行用归一化单位
      const primary = selectedAreas[0];
      // 2026-07-25：与 WaterAddModal 对齐 — 汇总所有作物品种名（支持跨作物批量浇水）
      const allCropNames = [...new Set(selectedAreas.map((a) => a.cropName).filter(Boolean))];

      await store.updateItem(record.id, {
        cropName: primary.cropName,
        cropNames: allCropNames.length > 0 ? JSON.stringify(allCropNames) : undefined,
        greenhouseName: primary.greenhouseName || record.greenhouseName || primary.area || '',
        greenhouseId: primary.greenhouseId || record.greenhouseId,
        areaName: primary.area,
        plantingId: primary.type === 'planting' ? primary.id : record.plantingId,
        plantingCode: primary.type === 'planting' ? primary.code : record.plantingCode,
        seedlingId: primary.type === 'seedling' ? primary.id : record.seedlingId,
        seedlingCode: primary.type === 'seedling' ? primary.code : record.seedlingCode,
        waterPool: JSON.stringify(poolRows),
        totalWater,
        waterUnit: unit,
        waterTime,
        operatorName: form.operatorName || undefined,
        description: form.description || undefined,
        // 2026-07-25 P1：与详情/导出对齐 — 提交时写入水费
        waterCost: form.waterCost ? Number(form.waterCost) : undefined,
      });
      showToast('浇水记录已更新', 'success');
      onSaved();
      onClose();
    } catch (err) {
      console.error('[WaterEditModal] 保存出错:', err);
      await showAlert('保存失败，请稍后重试。如持续出现请联系管理员。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;
  // 2026-07-25：与 WaterAddModal 对齐 — 多作物展示 + record 兜底（编辑时初始 selectedAreas 可能为空）
  const allCropNames = Array.from(new Set(selectedAreas.map((a) => a.cropName).filter(Boolean)));
  const displayCrops = allCropNames.length > 0 ? allCropNames : (() => {
    try {
      const arr = JSON.parse(record.cropNames || '');
      if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
    } catch {}
    return record.cropName ? [record.cropName] : [];
  })();

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={`编辑浇水记录 — ${record.waterCode || ''}`} size="xxl" showFooter={false}>
      {/* 顶部编辑保护提示横幅 */}
      {isReadonly && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm shrink-0">
          <AlertTriangle className="w-5 h-5" />
          {readonlyMessage(record.recordType)}
        </div>
      )}
      {poolBroken && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">
          <AlertTriangle className="w-5 h-5" />
          该记录浇水明细数据格式异常，无法编辑保存。请联系管理员修复数据后再试。
        </div>
      )}
      <div className="flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* 基础信息 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">浇水编号</Label>
                <Input type="text" value={record.waterCode || ''} readOnly className="h-10 bg-gray-50 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-gray-900">浇水时间 <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.waterTime} onChange={(e) => setForm({ ...form, waterTime: e.target.value })}
                  disabled={isReadonly}
                  className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <Label className="text-gray-900">操作员</Label>
                {operatorOptions.length > 0 ? (
                  <select value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} disabled={isReadonly}
                    className="w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">选择操作员</option>
                    {operatorOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <Input type="text" value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} disabled={isReadonly} placeholder="操作员姓名" className="h-10 text-sm" />
                )}
              </div>
              {/* 2026-07-25 P1：与详情/导出对齐 — 水费输入字段 */}
              <div>
                <Label className="text-gray-900">水费（元）</Label>
                <Input type="number" step="0.01" min="0" value={form.waterCost}
                  onChange={(e) => setForm({ ...form, waterCost: e.target.value })}
                  disabled={isReadonly} placeholder="选填" className="h-10 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
            </div>
          </div>

          {/* 区域选择（非只读时可编辑；只读时仅展示 chips） */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📍 浇水区域</h3>
            {/* 2026-07-25：与 WaterAddModal 对齐 — 多作物展示（编辑模式下 record 兜底） */}
            {displayCrops.length > 0 && (
              <p className="text-xs text-emerald-600 mb-2">
                🌱 {displayCrops.length === 1 ? '当前作物' : `包含作物（${displayCrops.length}）`}：{displayCrops.join('、')}
              </p>
            )}
            {!isReadonly && (
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
                        {/* 2026-07-25：与 WaterAddModal 对齐 — 品种名优先展示，作物大类作为括号补充 */}
                        <span className="font-medium">{formatPlantingDisplay(item)}</span>
                        {item.cropName && formatPlantingDisplay(item) !== item.cropName && (
                          <span className="text-gray-400 text-xs ml-1">（{item.cropName}）</span>
                        )}
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-600">{areaTab === 'planting' ? item.rootName || item.areaName : item.siteName || '育苗区'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedAreas.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700">
                    {a.type === 'planting' ? '🌱' : '🌿'} {a.cropName} · {a.area} · {a.code}
                    {!isReadonly && <button onClick={() => removeArea(a.id)} className="ml-0.5 text-emerald-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 浇水池 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">💧 浇水明细</h3>
            {wateringRows.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">{poolBroken ? '池数据已损坏' : '无'}</p>
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
                      <select value={row.wateringMethod} onChange={(e) => updateRow(row.area.id, { wateringMethod: e.target.value })} disabled={isReadonly}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        {Object.entries(WATERING_METHOD_MAP).map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" step="0.01" min="0" value={row.waterAmount}
                        onChange={(e) => updateRow(row.area.id, { waterAmount: e.target.value })}
                        disabled={isReadonly} placeholder="用量" className="h-9 text-sm" />
                    </div>
                    <div className="col-span-1">
                      <select value={row.waterUnit} onChange={(e) => updateRow(row.area.id, { waterUnit: e.target.value })} disabled={isReadonly}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        {WATER_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    {/* 2026-07-25：与 WaterAddModal 对齐 — 备注列（按区域独立备注） */}
                    <div className="col-span-2">
                      <Input type="text" value={row.remark}
                        onChange={(e) => updateRow(row.area.id, { remark: e.target.value })}
                        disabled={isReadonly} placeholder="备注（选填）" className="h-9 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
                    </div>
                    {/* 2026-07-25：行内删除按钮（与列表 WaterTable 主行 Trash2 红标一致） */}
                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="icon" onClick={() => removeArea(row.area.id)} disabled={isReadonly}
                        className="text-gray-500 hover:text-red-600 h-8 w-8 disabled:opacity-30"
                        title="删除此区域">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* 2026-07-25：与 WaterAddModal 对齐 — 单位一致性提示 */}
                <p className="text-xs text-amber-600">提示：所有区域的单位必须一致，便于统计总用水量</p>
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">📝 备注</h3>
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={isReadonly} placeholder="浇水备注" rows={2}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>

        {/* 底部按钮：只读时隐藏保存按钮 */}
        <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}><X className="w-4 h-4" />取消</Button>
          {!isReadonly && (
            <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting || selectedAreas.length === 0 || !form.waterTime || wateringRows.length === 0 || poolBroken}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}

export default WaterEditModal;
