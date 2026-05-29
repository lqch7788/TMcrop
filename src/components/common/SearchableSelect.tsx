/**
 * 可搜索选择组件
 * 支持下拉搜索、选择、以及新增按钮弹出快速添加
 */
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Option {
  value: string;
  label: string;
  searchText?: string; // 用于搜索的额外文本
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  onAddNew?: () => void;  // 新增按钮回调
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  renderOption?: (option: Option) => React.ReactNode; // 自定义选项渲染
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
  onAddNew,
  allowClear = true,
  disabled = false,
  className = '',
  renderOption,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 过滤选项
  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.searchText && opt.searchText.toLowerCase().includes(searchLower)) ||
      opt.value.toLowerCase().includes(searchLower)
    );
  });

  // 选中的选项
  const selectedOption = options.find(opt => opt.value === value);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 选择触发器 */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between h-10 px-3 border rounded-lg cursor-pointer bg-white
          ${disabled ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-400 hover:border-emerald-500'}
          ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}
        `}
      >
        <span className={`text-sm truncate ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && value && !disabled && (
            <X
              className="w-4 h-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索..."
                className="w-full h-9 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 选项列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-gray-400 text-sm">
                {search ? '无匹配结果' : '暂无数据'}
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    px-3 py-2 cursor-pointer text-sm
                    ${opt.value === value ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'}
                  `}
                >
                  {renderOption ? renderOption(opt) : opt.label}
                </div>
              ))
            )}
          </div>

          {/* 新增按钮 */}
          {onAddNew && (
            <div className="p-2 border-t border-gray-100">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  setSearch('');
                  onAddNew();
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                新增
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
