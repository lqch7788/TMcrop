/**
 * 防治药剂池编辑器
 *
 * 2026-10-21 抽取自「病虫害管理 → 新增防治记录」（AddPestControlModal.tsx）。
 * 抽取原因：农事任务的「病虫害防治 - 详细配置」需要与防治记录完全一致的
 *   药剂池（药剂类型筛选 → 搜索下拉 → 池化添加 → 每行内联编辑用量/单位/稀释/方法），
 *   内联两套实现必然漂移，故抽成共享组件（与肥料侧的 FertilizerPoolEditor 对称）。
 *
 * 三步交互（与防治记录一致）：
 *   ① 药剂类型多选过滤 → ② 选择规格（精确到含量/厂家，带库存与单价）→ ③ 池内逐条编辑
 *
 * 数据源：pesticideLibraryStore（药剂库）+ 数据字典（pesticide_type / application_method）
 * 值域：PesticidePoolItem[]（@/types/farm/pest-control），与防治记录表 pesticideList JSON 同口径
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { deepInputClass } from '@/components/common/deepInputClass';
import { DictSelect } from '@/components/common/settings/DictSelect';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { usePesticideLibraryStore } from '@/stores';
import type { PesticidePoolItem } from '@/types/farm/pest-control';

interface PesticidePoolEditorProps {
  /** 池中药剂（受控） */
  pool: PesticidePoolItem[];
  /** 池变化回调 */
  onChange: (pool: PesticidePoolItem[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 2026-07-11：药剂库杀线虫剂 tab 已下线，顶部 checkbox 过滤掉 */
const EXCLUDED_PESTICIDE_TYPE_LABELS = ['杀线虫剂', 'nematicide'];

export function PesticidePoolEditor({ pool, onChange, disabled }: PesticidePoolEditorProps) {
  const pesticideStore = usePesticideLibraryStore();
  const dictionaryStore = useDictionaryStore();
  const dictionaries = dictionaryStore.dictionaries;

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pesticideStore.fetchItems();
    dictionaryStore.refreshDictionaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** 切换类型筛选（多选） */
  const toggleTypeFilter = useCallback((typeCode: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeCode) ? prev.filter((t) => t !== typeCode) : [...prev, typeCode]
    );
  }, []);

  /** 已激活的药剂类型字典（顶部多选 checkbox 行） */
  const topLevelPesticideTypes = useMemo(() => {
    return dictionaries
      .filter((d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type')
      .filter((d: any) => {
        if (d.parentId || d.parent_id) return false; // 只取顶层
        const label = d.dictLabel || d.dict_label;
        const code = d.dictCode || d.dict_code;
        return (
          !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(label) &&
          !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(code)
        );
      });
  }, [dictionaries]);

  /** 类型筛选 + 关键字筛选后的规格列表（扁平化后每条即完整规格） */
  const filteredSpecs = useMemo(() => {
    const items = (pesticideStore.items as any[]).filter((p) => p.status === 'active' || !p.status);
    let list = items;
    if (selectedTypes.length > 0) {
      list = list.filter((p) => (p.pesticideTypes || []).some((t: string) => selectedTypes.includes(t)));
    }
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return list;
    return list.filter((p) =>
      [p.pesticideName, p.pesticideCode, p.ingredient, p.specContent, p.manufacturer, p.brandName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(kw)
    );
  }, [selectedTypes, searchKeyword, pesticideStore.items]);

  /** 选中规格加入池（按 specId 去重，自动用规格默认值） */
  const addToPool = useCallback(
    (pesticide: any, spec: any | null) => {
      const dedupeKey = spec?.id || pesticide.id;
      if (pool.some((p) => (p.specId || p.pesticideId) === dedupeKey)) return;
      const newItem: PesticidePoolItem = {
        pesticideId: pesticide.id,
        pesticideName: pesticide.pesticideName,
        pesticideCode: pesticide.pesticideCode,
        pesticideTypes: pesticide.pesticideTypes || [],
        specId: spec?.id,
        specContent: spec?.specContent,
        formulation: spec?.formulation,
        manufacturer: spec?.manufacturer,
        brandName: spec?.brandName,
        // 2026-08-15：用量拆分 —— dosage 为用户实际填写（初始空）；suggestedDosage 为药剂库建议用量（只读参考，不保存）
        dosage: '',
        suggestedDosage: spec?.suggestedDosage || '',
        unit: spec?.dosageUnit || '',
        dilutionRatio: spec?.suggestedRatio || '',
        applicationMethod: '',
        remarks: spec?.remark || '',
        stockQuantity: spec?.stockQuantity ?? pesticide.stockQuantity ?? 0,
        stockUnit: spec?.stockUnit || pesticide.stockUnit || 'kg',
        unitPrice: spec?.unitPrice ?? pesticide.unitPrice ?? 0,
      };
      onChange([...pool, newItem]);
      setSearchKeyword('');
      setShowDropdown(false);
    },
    [pool, onChange]
  );

  const removeFromPool = useCallback(
    (index: number) => onChange(pool.filter((_, i) => i !== index)),
    [pool, onChange]
  );

  const updatePoolField = useCallback(
    (index: number, field: keyof PesticidePoolItem, value: any) => {
      onChange(pool.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
    },
    [pool, onChange]
  );

  return (
    <div>
      {/* 第 1 步 + 第 2 步：同排并排，各占一半 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 左半：药剂类型（多选 checkbox） */}
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-gray-700 font-semibold">
              ① 药剂类型（过滤）<span className="text-red-500">*</span>
            </Label>
            {selectedTypes.length > 0 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSelectedTypes([])}
                className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                清空
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {topLevelPesticideTypes.map((d: any) => {
              const code = d.dictCode || d.dict_code;
              const label = d.dictLabel || d.dict_label;
              const checked = selectedTypes.includes(code);
              return (
                <label
                  key={d.id}
                  className={`px-2 py-0.5 rounded border text-xs font-medium transition-all select-none ${
                    checked
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                  } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleTypeFilter(code)}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>

        {/* 右半：选择药剂（按已选类型过滤的下拉） */}
        <div ref={dropdownRef} className="relative">
          <div className="mb-1">
            <Label className="text-xs text-gray-700 font-semibold">
              ② 选择规格（精确到含量/厂家）
              <span className="ml-2 text-xs text-gray-500 font-normal">
                共 {filteredSpecs.length} 个规格
                {selectedTypes.length > 0 && (
                  <span className="text-emerald-600">（{selectedTypes.length} 个类型）</span>
                )}
              </span>
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              disabled={disabled}
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索名称/规格/厂家/品牌..."
              className={`flex-1 ${deepInputClass} rounded-l-lg`}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => setShowDropdown(!showDropdown)}
              className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          {showDropdown && !disabled && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {filteredSpecs.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  无匹配规格
                  {selectedTypes.length > 0 && '（请调整类型筛选）'}
                </div>
              ) : (
                filteredSpecs.map((p: any) => {
                  const spec = p; // 扁平化：pesticide 与 spec 是同一个对象
                  const dedupeKey = spec?.id || p.id;
                  const inPool = pool.some((it) => (it.specId || it.pesticideId) === dedupeKey);
                  return (
                    <Button
                      key={`${p.id}-${spec?.id || 'no-spec'}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addToPool(p, spec)}
                      disabled={inPool}
                      className={`w-full justify-between rounded-none border-b border-gray-100 last:border-b-0 py-2 px-3 ${
                        inPool ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm font-medium text-gray-800">{p.pesticideName}</span>
                          {inPool && <span className="text-xs text-emerald-600 shrink-0">✓ 已添加</span>}
                          <span className="text-gray-400 shrink-0">|</span>
                          <span className="text-xs text-gray-600 truncate">
                            {spec?.specContent || '无规格'}
                            {spec?.manufacturer ? ` · ${spec.manufacturer}` : ''}
                            {spec?.brandName ? ` · ${spec.brandName}` : ''}
                          </span>
                          <span className="text-gray-400 shrink-0">|</span>
                          {(p.pesticideTypes || []).slice(0, 1).map((t: string) => (
                            <span
                              key={t}
                              className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0"
                            >
                              {getDictLabel('pesticide_type', t) || t}
                            </span>
                          ))}
                          {(spec?.unitPrice ?? p.unitPrice) > 0 && (
                            <>
                              <span className="text-gray-400 shrink-0">|</span>
                              <span className="text-xs text-amber-600 shrink-0">
                                ¥{Number(spec?.unitPrice ?? p.unitPrice).toFixed(2)}
                              </span>
                            </>
                          )}
                          <span className="text-gray-400 shrink-0">|</span>
                          <span
                            className={`text-xs shrink-0 ${
                              (spec?.stockQuantity ?? p.stockQuantity ?? 0) > 0
                                ? 'text-emerald-600'
                                : 'text-red-400'
                            }`}
                          >
                            库存 {Number(spec?.stockQuantity ?? p.stockQuantity ?? 0).toFixed(2)}{' '}
                            {spec?.stockUnit || p.stockUnit || 'kg'}
                          </span>
                        </div>
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* 第 3 步：药剂池（每个药剂一行，可编辑用量/单位/稀释/方法/备注） */}
      <div className="border-2 border-emerald-200 rounded-lg p-3 bg-emerald-50/30">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-gray-700 font-semibold">③ 药剂池（已添加 {pool.length} 个）</Label>
          {pool.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              清空药剂池
            </button>
          )}
        </div>
        {pool.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400 bg-white rounded border border-dashed border-gray-300">
            药剂池为空，请先勾选类型，再从上方下拉选择药剂加入池
          </div>
        ) : (
          <div className="space-y-2">
            {pool.map((item, idx) => (
              <div
                key={item.specId || item.pesticideId || idx}
                className="bg-white border border-emerald-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-xs font-bold text-emerald-700 shrink-0">#{idx + 1}</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{item.pesticideName}</span>
                    {item.pesticideCode && (
                      <span className="text-xs text-gray-400 font-mono shrink-0">{item.pesticideCode}</span>
                    )}
                    {(item.specContent || item.manufacturer || item.brandName) && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded truncate">
                        {item.specContent || ''}
                        {item.manufacturer && <span className="text-gray-600"> · {item.manufacturer}</span>}
                        {item.brandName && <span className="text-gray-500"> · {item.brandName}</span>}
                      </span>
                    )}
                    {(item.pesticideTypes || []).slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0"
                      >
                        {getDictLabel('pesticide_type', t) || t}
                      </span>
                    ))}
                    {(item.unitPrice ?? 0) > 0 && (
                      <span className="text-xs text-emerald-600 whitespace-nowrap shrink-0">
                        ¥{Number(item.unitPrice ?? 0).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-emerald-600 whitespace-nowrap shrink-0">
                      · 库存 {Number(item.stockQuantity ?? 0).toFixed(2)} {item.stockUnit || 'kg'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeFromPool(idx)}
                    className="text-red-500 hover:text-red-700 shrink-0 ml-2 disabled:opacity-50"
                    title="从药剂池移除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  {/* 2026-08-15：用量拆分 —— "用量"为用户实际填写（与单位紧挨）；"建议用量"只读展示药剂库自带值，不保存 */}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">用量</Label>
                    <Input
                      type="text"
                      disabled={disabled}
                      value={item.dosage || ''}
                      onChange={(e) => updatePoolField(idx, 'dosage', e.target.value)}
                      placeholder="参考建议用量"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">单位</Label>
                    <UnitDictSelect
                      value={item.unit || ''}
                      disabled={disabled}
                      onChange={(val) => updatePoolField(idx, 'unit', val)}
                      placeholder="单位"
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-600">建议用量</Label>
                    <div
                      className="px-2 py-1.5 border border-gray-200 bg-gray-50 rounded text-xs text-gray-600 min-h-[30px] leading-[18px]"
                      title="药剂库规格自带建议用量，仅供参考，不保存"
                    >
                      {item.suggestedDosage ? `${item.suggestedDosage} ${item.unit || ''}`.trim() : '-'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-600">稀释倍数</Label>
                    <Input
                      type="text"
                      disabled={disabled}
                      value={item.dilutionRatio || ''}
                      onChange={(e) => updatePoolField(idx, 'dilutionRatio', e.target.value)}
                      placeholder="如 1:1500"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-600">使用方法</Label>
                    <DictSelect
                      category="application_method"
                      value={item.applicationMethod || ''}
                      disabled={disabled}
                      onChange={(val) => updatePoolField(idx, 'applicationMethod', val)}
                      placeholder="请选择"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 mt-2">
                  <div className="col-span-6">
                    <Label className="text-xs text-gray-600">备注</Label>
                    <Input
                      type="text"
                      disabled={disabled}
                      value={item.remarks || ''}
                      onChange={(e) => updatePoolField(idx, 'remarks', e.target.value)}
                      placeholder="可选备注"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PesticidePoolEditor;