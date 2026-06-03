/**
 * 物料自动补全输入框（共享组件）
 *
 * 行为：用户键入物料名称 → 模糊匹配 useWarehouseMaterialStore → 下拉展示最多 N 条
 *       选中 → 自动填入主数据字段；未找到 → 显示"去添加"提示（默认跳转 /warehouse-overview）
 *
 * 数据流：useWarehouseMaterialStore → MaterialAutocomplete → onSelect/onChange
 *
 * 迁移来源（已合并两套实现）：
 * - src/pages/warehouse/components/WarehouseInboundModals/CreateModal.tsx（行内下拉版）
 * - src/components/purchasePlan/MaterialAutocomplete.tsx（精确匹配 + 去添加提示版）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useWarehouseMaterialStore } from '@/stores';
import type { Material } from '@/services/apiWarehouseMaterialService';

export interface MaterialAutocompleteProps {
  /** 当前物料名称（受控） */
  value: string;
  /** 物料名称变化（用户键入） */
  onChange: (value: string) => void;
  /** 选中下拉项时回调，父组件按需填充其他字段（编码、规格、单位等） */
  onSelect: (material: Material) => void;
  /** 占位符 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 未找到时行为：'navigate'=显示跳转链接；'hide'=不显示；'inline'=内联创建（预留） */
  notFoundMode?: 'navigate' | 'hide' | 'inline';
  /** 跳转目标，默认 /warehouse-overview */
  createUrl?: string;
  /** 链接文字，默认 '去添加' */
  createLabel?: string;
  /** 模糊匹配字段，默认 ['name', 'code'] */
  searchFields?: Array<keyof Material>;
  /** 仅显示指定 dataStatus 的物料，默认 '启用' */
  dataStatusFilter?: string;
  /** 最多展示结果数，默认 8 */
  maxResults?: number;
}

export function MaterialAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '输入物料名称搜索',
  className = '',
  disabled = false,
  notFoundMode = 'navigate',
  createUrl = '/warehouse-overview',
  createLabel = '去添加',
  searchFields = ['name', 'code'],
  dataStatusFilter = '启用',
  maxResults = 8,
}: MaterialAutocompleteProps) {
  const items = useWarehouseMaterialStore((s) => s.items);
  const loadItems = useWarehouseMaterialStore((s) => s.loadItems);
  const loadedRef = useRef(false);

  // 搜索状态：搜索词 + 下拉开关 + 输入框 ref
  const [searchQuery, setSearchQuery] = useState(value);
  const [openDropdown, setOpenDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 首次挂载时若未加载过则拉取（去重，避免重复请求）
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    if (items.length === 0) void loadItems();
    // items 故意不加入依赖，只在挂载时检查一次
  }, []);

  // 外部 value 变化时同步到搜索词（父组件重置、选中后回填、API 加载等场景）
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // 过滤逻辑：dataStatus 过滤 + 多字段模糊匹配 + 上限截断
  const filteredResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    const pool = items.filter((m) => !dataStatusFilter || m.dataStatus === dataStatusFilter);
    if (!q) return pool.slice(0, maxResults);
    return pool
      .filter((m) =>
        searchFields.some((f) => String(m[f] ?? '').toLowerCase().includes(q)),
      )
      .slice(0, maxResults);
  })();

  // 未找到结果：是否展示"去添加"提示
  const showNotFoundHint =
    notFoundMode === 'navigate' &&
    searchQuery.trim().length > 0 &&
    items.length > 0 &&
    filteredResults.length === 0;

  const handleChange = (newValue: string) => {
    setSearchQuery(newValue);
    onChange(newValue);
    setOpenDropdown(true);
  };

  const handleSelect = (m: Material) => {
    setSearchQuery(m.name);
    onSelect(m);
    setOpenDropdown(false);
  };

  return (
    <div className={className}>
      <div className="flex items-center relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpenDropdown(true)}
          onBlur={() => setTimeout(() => setOpenDropdown(false), 150)}
          className="w-full h-7 px-2 py-1 pr-6 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-100"
        />
        <Search className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
      </div>

      {openDropdown && filteredResults.length > 0 && (() => {
        const rect = inputRef.current?.getBoundingClientRect();
        return (
          <div
            className="fixed z-[999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              top: rect ? rect.bottom + 2 : 0,
              left: rect ? rect.left : 0,
              minWidth: rect ? rect.width : 200,
            }}
          >
            {filteredResults.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(m);
                }}
                className="h-auto w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-b-0"
              >
                <span className="font-medium text-gray-800 truncate max-w-[140px]">{m.name}</span>
                <span className="text-gray-400 font-mono text-[10px] ml-2 flex-shrink-0">{m.code}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {showNotFoundHint && (
        <div className="mt-0.5 text-[10px] text-amber-600">
          未在物料库中找到 ·
          <Link
            // deep link：库存总览页面会读 ?new=1 自动开新建 Modal，prefillName 把用户搜的词带过去
            to={`${createUrl}?new=1&prefillName=${encodeURIComponent(searchQuery.trim())}`}
            className="text-emerald-600 hover:text-emerald-700 hover:underline ml-0.5"
          >
            {createLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

export default MaterialAutocomplete;
