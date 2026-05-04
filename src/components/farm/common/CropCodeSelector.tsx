/**
 * 统一的作物编码选择器组件
 * 供种源管理、育苗管理、种植管理、采收入库等模块使用
 * 所有模块统一从作物品种库读取数据
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Leaf, Plus } from 'lucide-react';
import { CropVariety } from '../../../types/cropVariety';
import {
  initVarieties,
  getVarietyOptions,
  searchVarieties,
  getCategoryOptions,
  getVarietyByCode,
  findOrCreateVarietyByName
} from '../../../services/cropVarietyService';
import { CropVarietyOption } from '../../../types/cropVariety';

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

  // 初始化品种库
  const allOptions = useMemo(() => {
    initVarieties();
    return getVarietyOptions();
  }, []);

  // 类别选项
  const categoryOptions = useMemo(() => getCategoryOptions(), []);

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

  // 选中的品种信息
  const selectedVariety = useMemo(() => {
    if (!value) return null;
    return getVarietyByCode(value) || null;
  }, [value]);

  // 显示文本
  const displayText = useMemo(() => {
    if (selectedVariety) {
      return showFullPath
        ? `${selectedVariety.categoryName} > ${selectedVariety.typeName} > ${selectedVariety.varietyName}${selectedVariety.subVariety1Name ? ` > ${selectedVariety.subVariety1Name}` : ''}`
        : selectedVariety.varietyName;
    }
    return '';
  }, [selectedVariety, showFullPath]);

  // 处理选择
  const handleSelect = useCallback((option: CropVarietyOption) => {
    const variety = getVarietyByCode(option.value);
    onChange(option.value, variety || null);
    setIsOpen(false);
    setSearchKeyword('');
  }, [onChange]);

  // 尺寸样式
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  return (
    <div className={`relative ${className}`}>
      {/* 选择触发器 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full ${sizeClasses[size]} px-3 border border-gray-200 rounded-lg
          bg-white text-left flex items-center justify-between gap-2
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
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
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
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                !selectedCategory
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {categoryOptions.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 选项列表 */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 && searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-500 text-sm mb-3">未找到匹配的品种</div>
                {searchKeyword.trim() && (
                  <button
                    onClick={() => {
                      // 自动创建新品种
                      const newVariety = findOrCreateVarietyByName(searchKeyword.trim());
                      if (newVariety) {
                        onChange(newVariety.cropCode, newVariety);
                        setIsOpen(false);
                        setSearchKeyword('');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    自动创建「{searchKeyword.trim()}」
                  </button>
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
    <button
      onClick={() => onSelect(option)}
      className={`
        w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-emerald-50
        transition-colors ${isSelected ? 'bg-emerald-50' : ''}
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
    </button>
  );
}

export default CropCodeSelector;
