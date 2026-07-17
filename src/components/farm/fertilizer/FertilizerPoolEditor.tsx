/**
 * 肥料池编辑器组件（2026-07-12 — V2 改造）
 * 仿病虫害药剂池模式：类型筛选 → 搜索 → 选中加入池 → 内联编辑
 * 可复用于 AddFertilizerModal 和 EditFertilizerModal
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { useFertilizerLibraryStore, useDictionaryStore, getDictItemName } from '@/stores';
import { FERTILIZER_TYPE_OPTIONS, STOCK_UNIT_OPTIONS } from '../../settings/fertilizer-library/constants';
import { toSpecUnit } from '@/lib/unitConversions';

/** 2026-07-17：单位不匹配检测 + 换算预览（避免用户填错单位导致 INSUFFICIENT_STOCK） */
function unitMismatch(inputUnit: string, stockUnit: string): boolean {
  return (inputUnit || '').trim().toLowerCase() !== (stockUnit || 'kg').trim().toLowerCase();
}

function UnitHint({ qty, inputUnit, stockUnit }: { qty: number; inputUnit: string; stockUnit: string }) {
  if (!qty || qty <= 0 || !unitMismatch(inputUnit, stockUnit)) return null;
  const conv = toSpecUnit(qty, inputUnit, stockUnit);
  if (!conv || conv.needsManualCheck) {
    return (
      <div className="text-[10px] text-amber-600 mt-0.5 leading-tight">
        ⚠ 单位「{inputUnit}」无法自动换算到「{stockUnit}」，请确认
      </div>
    );
  }
  return (
    <div className="text-[10px] text-blue-600 mt-0.5 leading-tight">
      ≈ <span className="font-mono">{Number(conv.convertedQuantity).toFixed(4)}</span> {stockUnit}（自动换算）
    </div>
  );
}

// 施肥方式字典 key
const METHOD_DICT_KEY = 'fertilization_method';

/** 池中单条肥料项 */
export interface FertilizerPoolItem {
  specId: string;
  fertilizerName: string;
  fertilizerCode: string;
  fertilizerType: string;
  brandName: string;
  specContent: string;
  manufacturer: string;
  dosage: string;
  unit: string;
  dilutionRatio: string;
  fertilizationMethod: string;
  unitPrice: number;
  stockQuantity: number;
  stockUnit: string;
}

interface FertilizerPoolEditorProps {
  pool: FertilizerPoolItem[];
  onChange: (pool: FertilizerPoolItem[]) => void;
}

export function FertilizerPoolEditor({ pool, onChange }: FertilizerPoolEditorProps) {
  const libStore = useFertilizerLibraryStore();
  const dictStore = useDictionaryStore();
  const allDicts = dictStore.dictionaries;
  const methodItems = useMemo(() =>
    allDicts.filter((d: any) => (d.categoryCode || d.category) === METHOD_DICT_KEY),
  [allDicts]);

  // 确保字典已加载（使用 refresh 跳过缓存）
  useEffect(() => { dictStore.refreshDictionaries(); }, []);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载肥料库
  useEffect(() => { libStore.fetchItems(); }, []);

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 类型筛选切换
  const toggleType = useCallback((code: string) => {
    setSelectedTypes((prev) => prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]);
  }, []);

  // 过滤后的肥料列表（扁平化后直接过滤 fertilizer_specs）
  const filteredSpecs = useMemo(() => {
    const items = libStore.items.filter((s: any) => s.status === 'active' || !s.status);
    let result = items;
    if (selectedTypes.length > 0) {
      result = result.filter((s) => selectedTypes.includes(s.fertilizerType));
    }
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      result = result.filter((s) =>
        (s.fertilizerName || '').toLowerCase().includes(kw) ||
        (s.fertilizerCode || '').toLowerCase().includes(kw) ||
        (s.brandName || '').toLowerCase().includes(kw) ||
        (s.specContent || '').toLowerCase().includes(kw)
      );
    }
    return result;
  }, [selectedTypes, searchKeyword, libStore.items]);

  // 加入池（去重）
  const addToPool = useCallback((spec: any) => {
    const dedupeKey = spec.id;
    setSearchKeyword('');
    setShowDropdown(false);
    onChange([
      ...pool,
      {
        specId: spec.id,
        fertilizerName: spec.fertilizerName,
        fertilizerCode: spec.fertilizerCode,
        fertilizerType: spec.fertilizerType || '',
        brandName: spec.brandName || '主品牌',
        specContent: spec.specContent || '',
        manufacturer: spec.manufacturer || '',
        dosage: spec.suggestedDosage || '',
        unit: spec.dosageUnit || 'kg',
        dilutionRatio: spec.suggestedRatio || '',
        fertilizationMethod: '',
        unitPrice: spec.unitPrice || 0,
        stockQuantity: spec.stockQuantity || 0,
        stockUnit: spec.stockUnit || 'kg',
      },
    ]);
  }, [pool, onChange]);

  // 从池中移除
  const removeFromPool = useCallback((index: number) => {
    onChange(pool.filter((_, i) => i !== index));
  }, [pool, onChange]);

  // 更新池中字段（数值字段自动转换）
  const updateField = useCallback((index: number, field: keyof FertilizerPoolItem, value: any) => {
    const numFields: (keyof FertilizerPoolItem)[] = ['dosage', 'unitPrice'];
    const v = numFields.includes(field) ? (Number(value) || 0) : value;
    onChange(pool.map((it, i) => i === index ? { ...it, [field]: v } : it));
  }, [pool, onChange]);

  // 清空池
  const clearPool = useCallback(() => onChange([]), [onChange]);

  return (
    <div className="space-y-3">
      {/* 肥料类型筛选 + 搜索框（同行） */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-gray-500 mb-1 block">筛选肥料类型（可多选）</Label>
          <div className="flex flex-wrap gap-1.5">
            {FERTILIZER_TYPE_OPTIONS.map((opt) => {
              const checked = selectedTypes.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${
                    checked ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(opt.value)}
                    className="w-3 h-3"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-w-[280px]">
          <Label className="text-xs text-gray-500 mb-1 block">搜索肥料</Label>
          <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchKeyword}
            onChange={(e) => { setSearchKeyword(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="搜索肥料名称/编码/品牌加入池"
            className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchKeyword && (
            <button onClick={() => { setSearchKeyword(''); setShowDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showDropdown && filteredSpecs.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredSpecs.map((spec: any) => (
              <button
                key={spec.id}
                onClick={() => addToPool(spec)}
                className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-gray-50 last:border-b-0 text-sm"
              >
                <span className="font-medium text-gray-800">{spec.fertilizerName}</span>
                <span className="text-gray-400 mx-1">·</span>
                <span className="text-gray-500">{spec.brandName || '主品牌'}</span>
                {spec.unitPrice > 0 && (
                  <span className="text-gray-400 mx-1">·</span>
                )}
                {spec.unitPrice > 0 && (
                  <span className="text-amber-600">¥{Number(spec.unitPrice).toFixed(2)}</span>
                )}
                <span className="text-gray-400 mx-1">·</span>
                <span className={`text-xs ${spec.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-400'}`}>
                  库存 {Number(spec.stockQuantity || 0).toFixed(2)} {spec.stockUnit || 'kg'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>

      {/* 池内行 */}
      {pool.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">🧪 已选肥料 ({pool.length})</span>
            <Button variant="ghost" size="sm" onClick={clearPool} className="text-xs text-red-500 hover:text-red-700">
              <Trash2 className="w-3 h-3 mr-1" />清空全部
            </Button>
          </div>
          {pool.map((item, idx) => (
            <div key={`${item.specId}-${idx}`} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              {/* 肥料头部 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-800 text-sm">{item.fertilizerName}</span>
                  <span className="text-xs text-gray-400">{item.fertilizerCode}</span>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    {getDictItemName('fertilizer_type', item.fertilizerType) || item.fertilizerType}
                  </span>
                  <span className="text-xs text-gray-500">{item.brandName} · {item.specContent}</span>
                  <span className="text-xs text-emerald-600">¥{Number(item.unitPrice).toFixed(2)} · 库存 {Number(item.stockQuantity).toFixed(2)} {item.stockUnit}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFromPool(idx)} className="text-gray-400 hover:text-red-500 h-7 w-7">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {/* 内联编辑 */}
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">用量</Label>
                  <Input type="number" value={item.dosage} onChange={(e) => updateField(idx, 'dosage', e.target.value)}
                    placeholder="用量" step="0.01" min="0" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 flex items-center gap-1">
                    单位
                    <span className="text-[10px] text-gray-400 font-normal">（库存：{item.stockUnit || 'kg'}）</span>
                  </Label>
                  <Select value={item.unit} onValueChange={(v) => updateField(idx, 'unit', v)}>
                    <SelectTrigger className={`h-8 text-sm ${unitMismatch(item.unit, item.stockUnit) ? 'border-amber-400' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_UNIT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* 2026-07-17：单位不一致时给换算预览，避免用户填错单位导致 INSUFFICIENT_STOCK */}
                  <UnitHint qty={Number(item.dosage) || 0} inputUnit={item.unit} stockUnit={item.stockUnit || 'kg'} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">稀释倍数</Label>
                  <Input type="text" value={item.dilutionRatio} onChange={(e) => updateField(idx, 'dilutionRatio', e.target.value)}
                    placeholder="如 1:500" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">施肥方式</Label>
                  <Select value={item.fertilizationMethod} onValueChange={(v) => updateField(idx, 'fertilizationMethod', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="选择方式" /></SelectTrigger>
                    <SelectContent>
                      {methodItems.map((m: any) => (
                        <SelectItem key={m.dictCode || m.dict_code} value={m.dictCode || m.dict_code}>
                          {m.dictLabel || m.dict_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">单价 (元)</Label>
                  <Input type="number" value={item.unitPrice || ''} onChange={(e) => updateField(idx, 'unitPrice', e.target.value)}
                    placeholder="单价" step="0.01" min="0" className="h-8 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
