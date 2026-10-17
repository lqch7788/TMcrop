/**
 * 统一的作物编码选择器组件
 * 供种源管理、育苗管理、种植管理、采收入库等模块使用
 * 所有模块统一从作物品种库读取数据
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Leaf, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { CropVariety } from '../../../types/cropVariety';
import {
  initVarieties,
  getVarietyOptions,
  searchVarieties,
  getCategoryOptions,
  getVarietyByCode,
  findOrCreateVarietyByName
} from '../../../services/cropVarietyService';
import * as apiCropVarietyService from '../../../services/apiCropVarietyService';
import { CropVarietyOption } from '../../../types/cropVariety';

/**
 * 2026-10-17 修复：品种数据源改为 API 品种库（数据库 9 位编码）
 *
 * 原实现只用 localStorage 旧品种库（11 位编码），而数据库 crop_code 全是 9 位
 * （种源/育苗/库存实测均为 9 位，零条 11 位）→
 *   - 预填 cropCode 解析失败：编辑弹窗「作物品种」显示空白占位符
 *   - 下拉选出的 11 位编码与数据库品种库对不上，后续无法匹配
 * 现改为：API 品种库为主（与列表/详情/导出同源），旧库仅作兜底（历史 11 位编码仍可显示）。
 * 模块级缓存：多个表单共用，只请求一次。
 */
let apiVarietyCache: CropVariety[] | null = null;
let apiVarietyLoading: Promise<CropVariety[]> | null = null;

async function loadApiVarieties(): Promise<CropVariety[]> {
  if (apiVarietyCache) return apiVarietyCache;
  if (!apiVarietyLoading) {
    apiVarietyLoading = apiCropVarietyService.getAllVarieties()
      .then((list) => { apiVarietyCache = list; return list; })
      .catch((e) => {
        // 网络失败不阻断表单（V2.1：不用缓存兜底，但选择器退回旧库只读展示）
        console.warn('[CropCodeSelector] 加载 API 品种库失败，回退本地旧库', e);
        apiVarietyCache = [];
        return [];
      })
      .finally(() => { apiVarietyLoading = null; });
  }
  return apiVarietyLoading;
}

/** API 品种 → 选择器选项（字段口径与旧库 getVarietyOptions 保持一致） */
function toCropVarietyOption(v: CropVariety): CropVarietyOption {
  return {
    value: v.cropCode,
    label: v.detailVarietyName || v.subVariety1Name || v.varietyName,
    category: v.categoryName,
    categoryCode: v.categoryCode,
    typeName: v.typeName,
    typeCode: v.typeCode,
    varietyCode: v.varietyCode,
    subVariety1Name: v.subVariety1Name,
    subVariety1Code: v.subVariety1Code,
    detailVarietyCode: v.detailVarietyCode,
    detailVarietyName: v.detailVarietyName,
    alias: v.alias,
    fullPath: `${v.categoryName} > ${v.typeName} > ${v.varietyName}${v.subVariety1Name ? ` > ${v.subVariety1Name}` : ''}${v.detailVarietyName ? ` > ${v.detailVarietyName}` : ''}`,
  };
}

interface CropCodeSelectorProps {
  value?: string;                    // 选中的 cropCode
  onChange: (cropCode: string, varietyInfo: CropVariety | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showFullPath?: boolean;           // 是否显示完整路径
  className?: string;
}

export function CropCodeSelector({
  value,
  onChange,
  placeholder = '搜索或选择作物品种...',
  disabled = false,
  size = 'md',
  showFullPath = true,
  className = ''
}: CropCodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // 2026-10-17：API 品种库（主数据源）加载 + 缓存
  const [apiVarieties, setApiVarieties] = useState<CropVariety[] | null>(apiVarietyCache);
  useEffect(() => {
    if (apiVarieties) return;
    let cancelled = false;
    loadApiVarieties().then((list) => { if (!cancelled) setApiVarieties(list); });
    return () => { cancelled = true; };
  }, [apiVarieties]);

  // cropCode → 品种（API 库）
  const apiMap = useMemo(() => {
    const m = new Map<string, CropVariety>();
    (apiVarieties || []).forEach((v) => {
      if (v.cropCode && !m.has(v.cropCode)) m.set(v.cropCode, v);
    });
    return m;
  }, [apiVarieties]);

  // 初始化品种库（API 库为主；未加载/失败时回退旧库）
  const allOptions = useMemo(() => {
    if (apiVarieties && apiVarieties.length > 0) {
      return apiVarieties
        .filter((v) => !v.status || v.status === 'active')
        .map(toCropVarietyOption);
    }
    initVarieties();
    return getVarietyOptions();
  }, [apiVarieties]);

  // 类别选项（从当前数据源派生，避免旧库类别与 API 库不一致）
  const categoryOptions = useMemo(() => {
    if (apiVarieties && apiVarieties.length > 0) {
      const seen = new Map<string, string>();
      apiVarieties.forEach((v) => {
        if (v.categoryCode && !seen.has(v.categoryCode)) {
          seen.set(v.categoryCode, v.categoryName || v.categoryCode);
        }
      });
      return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
    }
    return getCategoryOptions();
  }, [apiVarieties]);

  // 根据搜索关键词和类别筛选
  const filteredOptions = useMemo(() => {
    let result = allOptions;

    // 类别筛选
    if (selectedCategory) {
      result = result.filter(opt => opt.categoryCode === selectedCategory);
    }

    // 搜索筛选
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(opt =>
        opt.label.toLowerCase().includes(keyword) ||
        opt.fullPath.toLowerCase().includes(keyword) ||
        opt.value.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [allOptions, selectedCategory, searchKeyword]);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    return searchVarieties(searchKeyword).slice(0, 10);
  }, [searchKeyword]);

  // 选中的品种信息（API 库优先 → 旧库兜底，兼容历史 11 位编码）
  const selectedVariety = useMemo(() => {
    if (!value) return null;
    return apiMap.get(value) || getVarietyByCode(value) || null;
  }, [value, apiMap]);

  // 显示文本
  const displayText = useMemo(() => {
    if (selectedVariety) {
      return showFullPath
        ? `${selectedVariety.categoryName} > ${selectedVariety.typeName} > ${selectedVariety.varietyName}${selectedVariety.subVariety1Name ? ` > ${selectedVariety.subVariety1Name}` : ''}`
        : selectedVariety.varietyName;
    }
    return '';
  }, [selectedVariety, showFullPath]);

  // 处理选择（API 库优先 → 旧库兜底）
  const handleSelect = useCallback((option: CropVarietyOption) => {
    const variety = apiMap.get(option.value) || getVarietyByCode(option.value) || null;
    onChange(option.value, variety);
    setIsOpen(false);
    setSearchKeyword('');
  }, [onChange, apiMap]);

  // 尺寸样式
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  return (
    <div className={`relative ${className}`}>
      {/* 选择触发器 */}
      <Button
        variant="outline"
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full ${sizeClasses[size]} px-3
          text-left flex items-center justify-between gap-2
          border border-gray-400 shadow-inner
          focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedVariety ? (
            <>
              <Leaf className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="truncate text-gray-900">{displayText}</span>
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                {selectedVariety.cropCode}
              </span>
            </>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </Button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索品种名称或编码..."
                className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* 类别快速筛选 */}
          <div className="p-2 border-b border-gray-100 flex gap-1 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedCategory('')}
              className={`px-2 py-1 rounded-full ${
                !selectedCategory
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : ''
              }`}
            >
              全部
            </Button>
            {categoryOptions.map(cat => (
              <Button
                key={cat.value}
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-2 py-1 rounded-full ${
                  selectedCategory === cat.value
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : ''
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* 选项列表 */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 && searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-500 text-sm mb-3">未找到匹配的品种</div>
                {searchKeyword.trim() && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // 自动创建新品种
                      const newVariety = findOrCreateVarietyByName(searchKeyword.trim());
                      if (newVariety) {
                        onChange(newVariety.cropCode, newVariety);
                        setIsOpen(false);
                        setSearchKeyword('');
                      }
                    }}
                    className="mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    自动创建「{searchKeyword.trim()}」
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 搜索结果显示 */}
                {searchResults.length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50">
                      搜索结果
                    </div>
                    {searchResults.map((result) => (
                      <OptionItem
                        key={result.variety.id}
                        option={{
                          value: result.variety.cropCode,
                          label: result.variety.varietyName,
                          category: result.variety.categoryName,
                          categoryCode: result.variety.categoryCode,
                          typeName: result.variety.typeName,
                          typeCode: result.variety.typeCode,
                          varietyCode: result.variety.varietyCode,
                          subVariety1Name: result.variety.subVariety1Name,
                          subVariety1Code: result.variety.subVariety1Code,
                          fullPath: `${result.variety.categoryName} > ${result.variety.typeName} > ${result.variety.varietyName}${result.variety.subVariety1Name ? ` > ${result.variety.subVariety1Name}` : ''}`
                        }}
                        isSelected={value === result.variety.cropCode}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

                {/* 完整列表 */}
                {filteredOptions.map((option) => (
                  <OptionItem
                    key={option.value}
                    option={option}
                    isSelected={value === option.value}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// 选项项组件
interface OptionItemProps {
  option: CropVarietyOption;
  isSelected: boolean;
  onSelect: (option: CropVarietyOption) => void;
}

function OptionItem({ option, isSelected, onSelect }: OptionItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={() => onSelect(option)}
      className={`
        w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-emerald-50
        ${isSelected ? 'bg-emerald-50' : ''}
      `}
    >
      <Leaf className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{option.label}</span>
          <span className="text-xs text-gray-400 font-mono">{option.value}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{option.fullPath}</div>
      </div>
      {isSelected && (
        <span className="text-xs text-emerald-600 font-medium">已选</span>
      )}
    </Button>
  );
}

export default CropCodeSelector;
