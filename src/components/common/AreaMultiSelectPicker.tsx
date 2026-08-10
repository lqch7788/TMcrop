/**
 * 区域多选选择器（2026-08-10 抽出复用）
 *
 * 仿照 src/components/farm/fertilizer/FertilizerAddModal.tsx 区域选择模式：
 *   Tabs 切换 种植/育苗 → 搜索 → dropdown 选择 → 已选区域 chip 展示
 * 支持多选不同作物不同区域。
 *
 * 数据源：
 *   - 种植：usePlantingStore.items
 *   - 育苗：useSeedlingStore.items
 *
 * 使用方：
 *   - 施肥管理（原有）
 *   - 领料申请单（新增于 2026-08-10）
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TabsList, TabsTrigger } from '@/components/ui';
import { usePlantingStore, useSeedlingStore } from '@/stores';
import type { SelectedArea } from '@/types/materialReceiving';

interface AreaMultiSelectPickerProps {
  value: SelectedArea[];
  onChange: (areas: SelectedArea[]) => void;
  /** 标签文案，默认"选区域(多选,支持不同作物不同区域)" */
  label?: string;
  /** 是否必填红星（仅 UI 提示） */
  required?: boolean;
  /** 已禁用（不可选/不可删） */
  disabled?: boolean;
}

export function AreaMultiSelectPicker({
  value,
  onChange,
  label = '选区域(多选,支持不同作物不同区域)',
  required = false,
  disabled = false,
}: AreaMultiSelectPickerProps) {
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();

  const [areaTab, setAreaTab] = useState<'planting' | 'seedling'>('planting');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // 打开时拉取数据（如果有 loadItems 方法）
  useEffect(() => {
    if (disabled) return;
    if (typeof plantingStore.loadItems === 'function') {
      plantingStore.loadItems();
    }
    if (typeof seedlingStore.loadItems === 'function') {
      seedlingStore.loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // 点击外部关闭
  useEffect(() => {
    if (disabled) return;
    const h = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setShowAreaDropdown(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [disabled]);

  // 过滤后的种植/育苗项
  const areaOptions = useMemo(() => {
    const kw = areaSearch.trim().toLowerCase();
    if (areaTab === 'planting') {
      return (plantingStore.items as any[]).filter((p: any) => !p.isHarvest).filter((p: any) => {
        if (!kw) return true;
        return (p.plantCode || '').toLowerCase().includes(kw)
          || (p.cropName || '').toLowerCase().includes(kw)
          || (p.cropVariety || '').toLowerCase().includes(kw)
          || (p.subVariety1Name || '').toLowerCase().includes(kw)
          || (p.rootName || '').toLowerCase().includes(kw);
      });
    }
    return (seedlingStore.items as any[]).filter((s: any) => {
      if (!kw) return true;
      return (s.seedlingCode || '').toLowerCase().includes(kw)
        || (s.cropName || '').toLowerCase().includes(kw)
        || (s.siteName || '').toLowerCase().includes(kw);
    });
  }, [areaTab, areaSearch, plantingStore.items, seedlingStore.items]);

  // 显示用作物名（优先品种，回退作物名）
  const formatDisplay = (item: any) =>
    item.subVariety1Name || item.cropVariety || item.cropName || '';

  // 加入区域
  const addArea = useCallback((item: any) => {
    if (value.some((a) => a.id === item.id)) return; // 已选
    const cropName = formatDisplay(item);
    const area: SelectedArea = areaTab === 'planting'
      ? {
          type: 'planting',
          id: item.id,
          code: item.plantCode || item.code,
          cropName,
          area: item.rootName || item.areaName || '',
          greenhouseId: item.greenhouseId,
          greenhouseName: item.greenhouseName,
        }
      : {
          type: 'seedling',
          id: item.id,
          code: item.seedlingCode || item.code,
          cropName,
          area: item.siteName || '育苗区',
          greenhouseId: item.greenhouseId,
          greenhouseName: item.greenhouseName,
        };
    onChange([...value, area]);
    setAreaSearch('');
    setShowAreaDropdown(false);
  }, [areaTab, value, onChange]);

  // 移除区域
  const removeArea = useCallback((id: string) => {
    onChange(value.filter((a) => a.id !== id));
  }, [value, onChange]);

  // 统计当前选中区域的所有作物名
  const allCropNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of value) if (a.cropName) set.add(a.cropName);
    return Array.from(set);
  }, [value]);

  return (
    <div>
      <Label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {/* 已选区域作物统计 */}
      {value.length > 0 && allCropNames.length > 0 && (
        <p className="text-xs text-emerald-600 mb-2">
          🌱 {allCropNames.length === 1 ? '当前作物' : `包含作物(${allCropNames.length})`}:{allCropNames.join('、')}
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
            <Input
              type="text"
              value={areaSearch}
              onChange={(e) => { setAreaSearch(e.target.value); setShowAreaDropdown(true); }}
              onFocus={() => setShowAreaDropdown(true)}
              placeholder={`搜索${areaTab === 'planting' ? '种植' : '育苗'}批号/作物/区域`}
              disabled={disabled}
              className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {showAreaDropdown && areaOptions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {areaOptions.map((item: any) => (
              <button
                key={item.id}
                onClick={() => addArea(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 text-sm"
              >
                <span className="font-medium">{formatDisplay(item)}</span>
                {item.cropName && formatDisplay(item) !== item.cropName && (
                  <span className="text-gray-400 text-xs ml-1">({item.cropName})</span>
                )}
                <span className="text-gray-400 mx-1">·</span>
                <span className="text-gray-600">
                  {areaTab === 'planting' ? (item.rootName || item.areaName) : (item.siteName || '育苗区')}
                </span>
                <span className="text-gray-400 mx-1">·</span>
                <span className="text-xs text-gray-500 font-mono">
                  {areaTab === 'planting' ? item.plantCode : item.seedlingCode}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 已选区域 chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700"
            >
              {a.type === 'planting' ? '🌱' : '🌿'} {a.cropName} · {a.area} · {a.code}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeArea(a.id)}
                  className="ml-0.5 text-emerald-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default AreaMultiSelectPicker;
