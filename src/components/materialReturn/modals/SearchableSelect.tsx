'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef(false);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 如果正在选择中，跳过
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filteredOptions = search
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  const displayText = selectedOption?.label || '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 选择器触发区域 */}
      <div
        className={`flex items-center border rounded ${
          open ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? search : displayText}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-sm bg-white rounded-l focus:outline-none"
        />
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 hover:bg-gray-100"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        <div className="px-2 py-1 bg-gray-50 border-l border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* 下拉选项列表 */}
      {open && (
        <div
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div
                key={opt.value}
                className={`px-3 py-2 cursor-pointer hover:bg-emerald-100 ${
                  opt.value === value ? 'bg-emerald-50 font-medium' : ''
                }`}
                onClick={() => {
                  isSelectingRef.current = true;
                  console.log('[SearchableSelect] 点击选项:', opt.value, opt.label);
                  onChange(opt.value);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div className="text-sm font-mono text-gray-900">{opt.label}</div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">无匹配结果</div>
          )}
        </div>
      )}
    </div>
  );
}
