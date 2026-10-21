'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  cropCode?: string;
  /** 2026-10-21：选项第二行的补充描述（品种/可用量等），不传则沿用旧的 cropCode 展示 */
  description?: string;
  /** 2026-10-21：置灰不可选（如可用量为 0 的记录），不传则可选 */
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string, cropCode?: string) => void;
  onSearch?: (keyword: string) => Promise<Option[]>;
  placeholder?: string;
  className?: string;
  /** 2026-10-21：禁用（透传给输入框并阻止打开下拉），不传则可交互 */
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  onSearch,
  placeholder = '请选择',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [remoteOptions, setRemoteOptions] = useState<Option[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 点击外部关闭（选项行的 mousedown 已 preventDefault，选中选项时不会误触发关闭）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        setRemoteOptions([]);
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

  // 远程搜索
  const performSearch = useCallback(async (keyword: string) => {
    if (!onSearch || !keyword.trim()) {
      setRemoteOptions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await onSearch(keyword);
      setRemoteOptions(results);
    } catch {
      // 远程搜索失败时清空结果（UI 显示"无匹配结果"）
      setRemoteOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onSearch]);

  // 防抖搜索
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (search && onSearch) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(search);
      }, 300);
    } else {
      setRemoteOptions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, onSearch, performSearch]);

  // 合并本地和远程选项
  // 逻辑：远程搜索进行中时显示"搜索中"，搜索完成后使用远程结果，无搜索时使用本地选项
  const allOptions = (() => {
    if (search && loading) {
      // 远程搜索进行中，显示空列表（会显示"搜索中..."）
      return [];
    }
    if (search && remoteOptions.length > 0) {
      // 远程搜索有结果，使用远程结果
      return remoteOptions;
    }
    if (!search) {
      // 无搜索关键词，显示本地选项
      return options;
    }
    // 有搜索关键词但远程无结果（搜索完成但无匹配）
    return [];
  })();

  const selectedOption = options.find(opt => opt.value === value);

  const displayText = selectedOption?.label || '';

  const handleSelect = (opt: Option) => {
    // 2026-10-21：置灰项（如可用量为 0）不可选中
    if (opt.disabled) return;
    onChange(opt.value, opt.cropCode);
    setOpen(false);
    setSearch('');
    setRemoteOptions([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 选择器触发区域 */}
      {/* 2026-09-28 UI 统一：触发区样式对齐生产领料弹窗的输入框标准
          （border-gray-400 / rounded-lg / px-3 py-2 / focus:ring-2 ring-emerald-500） */}
      <div
        className={`flex items-center border border-gray-400 rounded-lg bg-white ${
          open ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? search : displayText}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm bg-white rounded-l-lg focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
        />
        {value && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
            }}
            className="p-1 hover:bg-gray-100"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        <div className="px-2 py-1 bg-gray-50 border-l border-gray-200">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 下拉选项列表 */}
      {open && (
        <div
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {allOptions.length > 0 ? (
            allOptions.map((opt, idx) => (
              <div
                key={`${opt.value}-${idx}`}
                className={`px-3 py-2 ${
                  opt.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-emerald-100'
                } ${opt.value === value ? 'bg-emerald-50 font-medium' : ''}`}
                // 阻止 mousedown 默认行为，避免选中选项时触发外部点击关闭逻辑
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
              >
                <div className="text-sm font-mono text-gray-900">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-gray-500">{opt.description}</div>
                )}
                {opt.cropCode && (
                  <div className="text-xs text-gray-500">编码: {opt.cropCode}</div>
                )}
                {opt.disabled && (
                  <div className="text-xs text-gray-400">可用量为 0，不可选择</div>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {loading ? '搜索中...' : '无匹配结果'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
