/**
 * 施肥编辑弹窗组件
 * 2026-07-05 重构：完整对齐新增弹窗字段/布局/功能
 * - 关联业务选择器（种植/育苗二选一，自动填充+锁定）
 * - 施肥量小数输入修复
 * - 单位换算预览 + 库存校验
 * - 温室负责人下拉操作员
 * - 去分区标题（时间/操作与备注合并）
 * - IoT 只读保护
 * 提交时调用 store.updateItem()
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import { UnifiedModal, Button, Input, Label, TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { DictSelect } from '../../common/settings/DictSelect';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore, FertilizerData } from '@/stores';
import { useGreenhouseStore } from '@/stores';
import { validateDateNotFuture } from '@/lib/validators';
import type { CropVariety } from '@/types/cropVariety';
import { showAlert } from '@/lib/dialogService';
import { toBaseUnit, isConvertibleUnit } from '@/lib/unitConversions';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface FertilizerEditModalProps {
  isOpen: boolean;
  record: FertilizerData;
  onClose: () => void;
  onSaved: () => void;
}

export function FertilizerEditModal({ isOpen, record, onClose, onSaved }: FertilizerEditModalProps) {
  const store = useFertilizerStore();
  const fertilizerLibraryStore = useFertilizerLibraryStore();
  const isIot = record.dataSource === 'auto_iot';

  const [form, setForm] = useState({
    fertilizerCode: '',
    fertilizerName: '',
    fertilizerType: '',
    cropName: '',
    greenhouseName: '',
    dilutionRatio: '',
    quantity: 0,
    unit: '千克',
    unitPrice: 0,
    totalCost: 0,
    fertilizeTime: '',
    operatorName: '',
    description: '',
    inputMode: 'library' as 'library' | 'manual',
    selectedFertilizerId: '',
    plantingId: '',
    plantingCode: '',
    seedlingId: '',
    seedlingCode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 施肥量原始输入追踪
  const [quantityInputText, setQuantityInputText] = useState('');

  // 关联业务选择器
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [selectedBizLabel, setSelectedBizLabel] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const [bizType, setBizType] = useState<'planting' | 'seedling'>('planting');
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 种植记录列表
  const plantingOptions = useMemo(() => {
    if (bizType !== 'planting') return [];
    const plantings = usePlantingStore.getState().items;
    if (!bizSearchKeyword.trim()) return plantings;
    const kw = bizSearchKeyword.toLowerCase();
    return plantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizType]);

  // 育苗记录列表
  const seedlingOptions = useMemo(() => {
    if (bizType !== 'seedling') return [];
    const seedlings = useSeedlingStore.getState().items as any[];
    if (!bizSearchKeyword.trim()) return seedlings;
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizType]);

  // 操作员选项（从温室负责人提取）
  const greenhouses = useGreenhouseStore(state => state.greenhouses);
  const operatorOptions = useMemo(() => {
    const seen = new Set<string>();
    return greenhouses
      .map(g => (g.manager || '').trim())
      .filter(name => name && !seen.has(name) && seen.add(name))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .map(name => ({ value: name, label: name }));
  }, [greenhouses]);

  const selectedFertilizerBrand = useMemo(() => {
    const selected = fertilizerLibraryStore.items.find(i => i.id === form.selectedFertilizerId);
    return selected?.specs?.[0]?.brandName || '-';
  }, [fertilizerLibraryStore.items, form.selectedFertilizerId]);

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bizSearchRef.current && !bizSearchRef.current.contains(e.target as Node)) {
        setShowBizSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCropCodeChange = useCallback((_code: string, varietyInfo: CropVariety | null) => {
    if (isIot) return;
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({ ...prev, cropName: cropNameValue }));
    }
  }, [isIot]);

  const fetchLibraryItems = useFertilizerLibraryStore(state => state.fetchItems);

  useEffect(() => {
    fetchLibraryItems({ limit: '10000' });
  }, [fetchLibraryItems]);

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      const hasFertilizerId = !!(record as any).fertilizerId;
      const hasPlanting = !!(record.plantingId || record.plantingCode);
      const hasSeedling = !!(record as any).seedlingId || (record as any).seedlingCode;
      const ghName = record.greenhouseName || '';

      setForm({
        fertilizerCode: record.fertilizerCode || '',
        fertilizerName: record.fertilizerName || '',
        fertilizerType: record.fertilizerType || '',
        cropName: record.cropName || '',
        greenhouseName: ghName,
        dilutionRatio: record.dilutionRatio || '',
        quantity: record.quantity || 0,
        unit: record.unit || '千克',
        unitPrice: record.unitPrice || 0,
        totalCost: record.totalCost || 0,
        fertilizeTime: record.fertilizeTime || '',
        operatorName: record.operatorName || '',
        description: record.description || '',
        inputMode: hasFertilizerId ? 'library' : 'manual',
        selectedFertilizerId: (record as any).fertilizerId || '',
        plantingId: record.plantingId || '',
        plantingCode: record.plantingCode || '',
        seedlingId: (record as any).seedlingId || '',
        seedlingCode: (record as any).seedlingCode || '',
      });
      setQuantityInputText(record.quantity ? String(record.quantity) : '');
      setCropCode((record as any).cropCode || '');

      // 还原关联业务标签
      if (hasPlanting) {
        setBizType('planting');
        setSelectedBizLabel(`种植 · ${record.plantingCode} · ${record.cropName || ''}`);
      } else if (hasSeedling) {
        setBizType('seedling');
        setSelectedBizLabel(`育苗 · ${(record as any).seedlingCode} · ${record.cropName || ''}`);
      }

      // 加载下拉数据
      usePlantingStore.getState().loadItems();
      useSeedlingStore.getState().loadItems();
      if (useGreenhouseStore.getState().greenhouses.length === 0) {
        useGreenhouseStore.getState().loadGreenhouses();
      }
    }
  }, [isOpen, record]);

  const updateField = useCallback((field: string, value: any) => {
    if (isIot) return;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        next.totalCost = (field === 'quantity' ? value : prev.quantity) * (field === 'unitPrice' ? value : prev.unitPrice);
      }
      return next;
    });
  }, [isIot]);

  const handleSubmit = async () => {
    if (isIot) return;
    // 前端必填校验
    if (!form.fertilizerName.trim()) { await showAlert('请填写肥料名称'); return; }
    if (!form.fertilizerType) { await showAlert('请选择肥料类型'); return; }
    if (!form.cropName.trim()) { await showAlert('请选择作物品种'); return; }
    if (!form.greenhouseName.trim()) { await showAlert('请填写区域位置'); return; }
    if (!form.dilutionRatio.trim()) { await showAlert('请填写稀释比例'); return; }
    if (!form.fertilizeTime) { await showAlert('请选择施肥时间'); return; }
    if (form.fertilizeTime && !validateDateNotFuture(form.fertilizeTime)) {
      await showAlert('施肥日期不能大于当前时间');
      return;
    }

    setSubmitting(true);
    const quantityConverted = toBaseUnit(Number(form.quantity) || 0, form.unit);
    const payload: Record<string, any> = {
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: form.dilutionRatio,
      quantity: quantityConverted ? quantityConverted.baseQuantity : Number(form.quantity) || 0,
      unit: form.unit,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      description: form.description,
      fertilizerId: form.selectedFertilizerId || null,
      plantingId: form.plantingId,
      plantingCode: form.plantingCode,
      seedlingId: form.seedlingId,
      seedlingCode: form.seedlingCode,
    };
    const result = await store.updateItem(record.id, payload);
    if (!result) {
      setSubmitting(false);
      const errMsg = useFertilizerStore.getState().error;
      await showAlert(errMsg || '保存失败，请重试');
      return;
    }
    if (form.selectedFertilizerId) {
      try { await fetchLibraryItems(); } catch { /* ignore */ }
    }
    setSubmitting(false);
    onSaved();
  };

  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  const iotClass = isIot ? 'bg-gray-100 cursor-not-allowed text-gray-500' : '';
  const inputClass = isIot
    ? 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed text-gray-500'
    : deepInputClass;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`编辑施肥记录 - ${record.fertilizerCode}`}
      size="xxxl"
      showFooter={false}
    >
      {/* IoT 警告 */}
      {isIot && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <span>IoT自动记录不可编辑，仅可查看。如需调整，请修改IoT设备的采集参数。</span>
        </div>
      )}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施肥编号</Label>
                <Input type="text" value={form.fertilizerCode} readOnly className={inputClass + ' font-mono'} />
              </div>
              <div>
                <Label className="text-gray-900">数据来源</Label>
                <Input
                  type="text"
                  value={isIot ? 'IoT自动' : '手动录入'}
                  readOnly
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-medium ${isIot ? 'text-green-600' : 'text-blue-600'}`}
                />
              </div>
            </div>
            {/* 关联业务选择器 */}
            <div className="grid grid-cols-2 gap-4">
              <div ref={bizSearchRef} className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-gray-900 shrink-0">关联业务</Label>
                  {!selectedBizLabel && !isIot && (
                    <>
                      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                        <button type="button" onClick={() => setBizType('planting')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bizType === 'planting' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                          种植
                        </button>
                        <button type="button" onClick={() => setBizType('seedling')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bizType === 'seedling' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                          育苗
                        </button>
                      </div>
                      <Input type="text" value={bizSearchKeyword}
                        onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                        onFocus={() => setShowBizSearch(true)}
                        placeholder={bizType === 'planting' ? '搜索种植批号/作物/温室...' : '搜索育苗批号/作物/区域...'}
                        className={`flex-1 ${deepInputClass} rounded-l-lg`} />
                      <Button type="button" variant="secondary" size="sm"
                        onClick={() => setShowBizSearch(!showBizSearch)}
                        className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg">
                        <Search className="w-4 h-4 text-gray-500" />
                      </Button>
                    </>
                  )}
                </div>
                {selectedBizLabel ? (
                  <div className="p-2 border rounded-lg bg-emerald-50 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">{selectedBizLabel}</span>
                      {!isIot && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          updateField('plantingId', ''); updateField('plantingCode', '');
                          updateField('seedlingId', ''); updateField('seedlingCode', '');
                          updateField('greenhouseName', ''); updateField('cropName', '');
                          updateField('fertilizeTime', '');
                          setCropCode(''); setSelectedCrop(null);
                          setBizSearchKeyword(''); setSelectedBizLabel('');
                        }}>
                          <X className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !isIot && (
                  <>
                    {showBizSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                          updateField('plantingId', ''); updateField('plantingCode', '');
                          updateField('seedlingId', ''); updateField('seedlingCode', '');
                          updateField('greenhouseName', ''); updateField('cropName', '');
                          updateField('fertilizeTime', '');
                          setCropCode(''); setSelectedCrop(null);
                          setBizSearchKeyword(''); setSelectedBizLabel('不关联任何业务');
                          setShowBizSearch(false);
                        }} className="w-full justify-start rounded-none border-b border-gray-100">
                          <X className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">不关联任何业务</span>
                        </Button>
                        {bizType === 'planting' && plantingOptions.map((planting: any) => (
                          <Button key={planting.id} type="button" variant="ghost" size="sm" onClick={() => {
                            updateField('seedlingId', ''); updateField('seedlingCode', '');
                            updateField('plantingId', planting.id);
                            updateField('plantingCode', planting.plantCode);
                            updateField('greenhouseName', planting.rootName || planting.areaName || '');
                            updateField('cropName', planting.cropName || '');
                            const d = new Date();
                            updateField('fertilizeTime', new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                            setCropCode(planting.cropCode || '');
                            setBizSearchKeyword(planting.plantCode);
                            setSelectedBizLabel(`种植 · ${planting.plantCode} · ${planting.cropName || ''}`);
                            setShowBizSearch(false);
                          }} className="w-full justify-start rounded-none border-b border-gray-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{planting.plantCode}</p>
                              <p className="text-xs text-gray-500">{planting.cropName || ''} · {planting.rootName || planting.areaName || ''}</p>
                            </div>
                          </Button>
                        ))}
                        {bizType === 'seedling' && seedlingOptions.map((seedling: any) => (
                          <Button key={seedling.id} type="button" variant="ghost" size="sm" onClick={() => {
                            updateField('plantingId', ''); updateField('plantingCode', '');
                            updateField('seedlingId', seedling.id);
                            updateField('seedlingCode', seedling.seedlingCode);
                            updateField('greenhouseName', seedling.siteName || '');
                            updateField('cropName', seedling.cropName || '');
                            const d = new Date();
                            updateField('fertilizeTime', new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                            setCropCode(seedling.cropCode || '');
                            setBizSearchKeyword(seedling.seedlingCode);
                            setSelectedBizLabel(`育苗 · ${seedling.seedlingCode} · ${seedling.cropName || ''}`);
                            setShowBizSearch(false);
                          }} className="w-full justify-start rounded-none border-b border-gray-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{seedling.seedlingCode}</p>
                              <p className="text-xs text-gray-500">{seedling.cropName || ''} · {seedling.siteName || ''}</p>
                            </div>
                          </Button>
                        ))}
                        {((bizType === 'planting' && plantingOptions.length === 0) || (bizType === 'seedling' && seedlingOptions.length === 0)) && (
                          <div className="p-4 text-center text-sm text-gray-400">无匹配的{bizType === 'planting' ? '种植' : '育苗'}记录</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 区域位置 + 作物品种 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  区域位置
                  {(form.plantingId || form.seedlingId) && <span className="ml-2 text-xs text-gray-500">（已锁定）</span>}
                </Label>
                <Input type="text" value={form.greenhouseName}
                  onChange={(e) => updateField('greenhouseName', e.target.value)}
                  placeholder={form.plantingId || form.seedlingId ? '由关联业务自动填充' : '请先选择关联业务'}
                  readOnly={!!(form.plantingId || form.seedlingId) || isIot}
                  className={`${inputClass} ${form.plantingId || form.seedlingId ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
              </div>
              <div>
                <Label className="text-gray-900">
                  作物品种
                  {(form.plantingId || form.seedlingId) && <span className="ml-2 text-xs text-gray-500">（已锁定）</span>}
                </Label>
                <CropCodeSelector value={cropCode} onChange={handleCropCodeChange}
                  placeholder={form.plantingId || form.seedlingId ? '由关联业务自动填充' : '请先选择关联业务'}
                  size="md" showFullPath={true}
                  disabled={!!(form.plantingId || form.seedlingId) || isIot} />
                {selectedCrop && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700">
                      {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                      {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 肥料与用量 */}
        <div>
          <SectionTitle title="肥料与用量" icon="🧪" />
          <div className="space-y-3">
            {!isIot && (
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="inputMode" value="library"
                    checked={form.inputMode === 'library'}
                    onChange={() => setForm(f => ({ ...f, inputMode: 'library', selectedFertilizerId: '' }))} />
                  从库选择
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="inputMode" value="manual"
                    checked={form.inputMode === 'manual'}
                    onChange={() => setForm(f => ({ ...f, inputMode: 'manual', selectedFertilizerId: '' }))} />
                  手动输入
                </label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">肥料类型</Label>
                <select className={`w-full h-10 ${inputClass}`}
                  value={form.fertilizerType}
                  onChange={(e) => { updateField('fertilizerType', e.target.value); if (form.selectedFertilizerId) { updateField('selectedFertilizerId', ''); updateField('fertilizerName', ''); updateField('dilutionRatio', ''); }}}
                  disabled={isIot}>
                  <option value="">选择肥料类型</option>
                  <option value="organic">有机肥</option>
                  <option value="inorganic">无机肥</option>
                  <option value="water_soluble">水溶肥</option>
                  <option value="compound">复合肥</option>
                  <option value="bio">生物肥</option>
                  <option value="slow_release">缓释肥</option>
                  <option value="trace">微量元素肥</option>
                </select>
              </div>
              {form.inputMode === 'manual' ? (
                <div>
                  <Label className="text-gray-900">肥料名称 <span className="text-red-500">*</span></Label>
                  <Input type="text" value={form.fertilizerName}
                    onChange={(e) => updateField('fertilizerName', e.target.value)}
                    placeholder="请输入肥料名称" disabled={isIot} className={inputClass} />
                </div>
              ) : (
                <div>
                  <Label className="text-gray-900">选择肥料</Label>
                  <select className={`w-full h-10 ${inputClass}`}
                    value={form.selectedFertilizerId}
                    onChange={(e) => {
                      const selected = fertilizerLibraryStore.items.find(i => i.id === e.target.value);
                      if (selected) {
                        setForm(f => ({ ...f, selectedFertilizerId: selected.id,
                          fertilizerName: selected.fertilizerName,
                          fertilizerType: selected.fertilizerType || '',
                          dilutionRatio: selected.specs?.[0]?.suggestedRatio || '' }));
                      }
                    }} disabled={isIot}>
                    <option value="">-- 请先选择肥料类型 --</option>
                    {fertilizerLibraryStore.items
                      .filter(item => item.status === 'active' && (!form.fertilizerType || item.fertilizerType === form.fertilizerType))
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.fertilizerName}{item.currentStock != null ? `（库存 ${item.currentStock}kg）` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {form.inputMode === 'library' && (
                <div>
                  <Label className="text-gray-900">品牌名称</Label>
                  <Input type="text" value={selectedFertilizerBrand} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-900">稀释比例</Label>
                <Input type="text" value={form.dilutionRatio}
                  onChange={(e) => updateField('dilutionRatio', e.target.value)}
                  placeholder="如 1:500" disabled={isIot} className={inputClass} />
              </div>
              <div>
                <Label className="text-gray-900">施肥量</Label>
                <Input type="text" inputMode="decimal" value={quantityInputText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuantityInputText(v);
                    if (v === '') { updateField('quantity', 0); return; }
                    const num = parseFloat(v);
                    if (!isNaN(num) && num >= 0) { updateField('quantity', num); }
                  }}
                  placeholder="0" disabled={isIot} className={inputClass} />
                {(() => {
                  if (form.inputMode !== 'library' || !form.selectedFertilizerId) return null;
                  const lib = fertilizerLibraryStore.items.find(i => i.id === form.selectedFertilizerId);
                  if (!lib || lib.currentStock == null) return null;
                  const converted = toBaseUnit(Number(form.quantity) || 0, form.unit);
                  let previewEl = null;
                  if (converted && form.unit !== converted.baseUnit) {
                    previewEl = (
                      <div className="text-xs text-gray-500 mt-1">
                        = {converted.baseQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {converted.baseUnit}
                      </div>
                    );
                  } else if (!isConvertibleUnit(form.unit) && form.unit) {
                    previewEl = (
                      <div className="text-xs text-amber-600 mt-1">
                        ⚠ 单位「{form.unit}」无法自动换算，库存校验仅供参考
                      </div>
                    );
                  }
                  const compareQty = (converted?.baseQuantity ?? Number(form.quantity)) || 0;
                  let warnEl = null;
                  if (converted && compareQty > lib.currentStock) {
                    warnEl = (
                      <div className="text-amber-600 text-sm mt-1">
                        ⚠ 施肥量 {form.quantity} {form.unit}（≈ {compareQty.toLocaleString(undefined, { maximumFractionDigits: 3 })} {converted.baseUnit}）超过库存 {lib.currentStock}{converted.baseUnit}
                      </div>
                    );
                  }
                  return <>{previewEl}{warnEl}</>;
                })()}
              </div>
              <div>
                <Label className="text-gray-900">单位</Label>
                <DictSelect category="unit" value={form.unit}
                  onChange={(value) => updateField('unit', value)}
                  placeholder="选择单位" disabled={isIot} />
              </div>
              <div>
                <Label className="text-gray-900">单价 (元/{form.unit || '单位'})</Label>
                <Input type="number" value={form.unitPrice || ''}
                  onChange={(e) => updateField('unitPrice', Number(e.target.value))}
                  min="0" step="0.01" placeholder="0" disabled={isIot} className={inputClass} />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">总成本（自动计算）</Label>
              <Input type="text" value={`${form.totalCost.toFixed(2)} 元`} readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 font-bold text-emerald-700" />
            </div>
          </div>
        </div>

        {/* 时间 + 操作员 + 备注（无分区标题，紧凑布局） */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">施肥时间</Label>
              <Input type="datetime-local" value={form.fertilizeTime}
                onChange={(e) => updateField('fertilizeTime', e.target.value)}
                disabled={isIot} className={inputClass} />
            </div>
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Select value={form.operatorName || undefined}
                onValueChange={(val) => updateField('operatorName', val)}
                disabled={isIot}>
                <SelectTrigger className={`w-full h-10 ${isIot ? 'bg-gray-100' : deepInputClass}`}>
                  <SelectValue placeholder="选择操作员" />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-gray-900">备注</Label>
            <TextArea value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="请输入备注信息" rows={3} disabled={isIot}
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${isIot ? 'border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500' : 'border border-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        {!isIot && (
          <Button variant="default" size="sm" onClick={handleSubmit}
            disabled={submitting || !form.fertilizerName.trim()}>
            {submitting ? '保存中...' : '保存修改'}
          </Button>
        )}
      </div>
    </UnifiedModal>
  );
}
