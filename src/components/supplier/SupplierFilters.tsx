// 供应商筛选组件 - 含省/市两级区域级联筛选（2026-09-28：原四级中的区县分支已移除，数据源无区县层级）
import { useMemo, useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { SupplierFiltersState, SUPPLIER_STATUS_OPTIONS, SUPPLIER_ORGANIZATION_OPTIONS, SUPPLIER_INTERNAL_OPTIONS } from './types';
import { getSupplierTypeName } from './data';
import {
  evaluateSupplierQualification,
  QUALIFICATION_FILTER_OPTIONS,
  ATTENTION_STATUSES,
  type SupplierQualificationFields,
} from './qualification';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Label } from '@/components/ui';
import { useDictionaryStore, useRegionStore, useSupplierCodeRuleStore } from '../../stores';

interface SupplierFiltersProps {
  filters: SupplierFiltersState;
  onFilterChange: (key: keyof SupplierFiltersState, value: string) => void;
  onReset: () => void;
}

export default function SupplierFilters({ filters, onFilterChange, onReset }: SupplierFiltersProps) {
  // 更多筛选展开/折叠
  const [showMore, setShowMore] = useState(false);

  // 字典数据
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  // 2026-09-28：类型选项与编码规则同源（store 已在页面/规则页加载）
  const categories = useSupplierCodeRuleStore((s) => s.categories);

  const attributeOptions = useMemo(() => {
    const attrs = dictionaries.filter(d => d.categoryCode === 'supplier_attribute' && d.status === 'active');
    return ['全部', ...attrs.map(a => a.dictLabel)];
  }, [dictionaries]);

  // 2026-09-28 审计修复：三组选项不再硬编码在组件内——
  // 类型取自编码规则 store（与后端 material_code_categories 同源，规则页新增分类即时可用），
  // 状态/组织取自 types.ts 的统一常量（此前 4 处各写一遍）
  const typeOptions = useMemo(
    () => ['全部', ...categories.map((c) => c.code)],
    [categories]
  );
  const statusOptions = useMemo(() => ['全部', ...SUPPLIER_STATUS_OPTIONS], []);
  const organizationOptions = useMemo(() => ['全部', ...SUPPLIER_ORGANIZATION_OPTIONS], []);

  // 区域级联筛选（方案6.1：仅省/市两级）
  const { provinces, fetchProvinces, getChildren } = useRegionStore();
  const [cityOptions, setCityOptions] = useState<Array<{value: string; label: string}>>([]);

  useEffect(() => { fetchProvinces(); }, [fetchProvinces]);

  const loadCities = useCallback(async (provinceName: string) => {
    if (!provinceName) { setCityOptions([]); return; }
    const provinceId = provinces.find(p => p.name === provinceName)?.id;
    if (provinceId) {
      const children = await getChildren(provinceId);
      setCityOptions([{ value: '', label: '全部' }, ...children.map(c => ({ value: c.name, label: c.name }))]);
    }
  }, [provinces, getChildren]);

  const handleProvinceChange = (value: string) => {
    onFilterChange('province', value);
    onFilterChange('city', '');
    setCityOptions([]);
    loadCities(value);
  };

  const handleCityChange = (value: string) => {
    // 2026-09-28：区县分支已移除（数据源无区县层级）
    onFilterChange('city', value);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* 第一行：默认可见的筛选字段 */}
      <div className="flex items-end gap-4">
        <div className="flex-1 grid grid-cols-5 gap-4">
          {/* 供应商名称 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</Label>
            <Input
              type="text"
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              placeholder="输入名称搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 组织 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">所属组织</Label>
            <Select
              value={filters.organization}
              onValueChange={(val) => onFilterChange('organization', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {organizationOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 供应商类型 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">供应商类型</Label>
            <Select
              value={filters.type}
              onValueChange={(val) => onFilterChange('type', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt === '全部' ? '全部类型' : getSupplierTypeName(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 供应商属性 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">供应商属性</Label>
            <Select
              value={filters.supplierAttribute}
              onValueChange={(val) => onFilterChange('supplierAttribute', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {attributeOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 供应商状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">供应商状态</Label>
            <Select
              value={filters.status}
              onValueChange={(val) => onFilterChange('status', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMore(!showMore)}
            className="whitespace-nowrap gap-1"
          >
            {showMore ? (
              <>收起<ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>更多<ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </Button>
          <Button
            size="sm"
            variant="warning"
            onClick={onReset}
            className="whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
        </div>
      </div>

      {/* 更多筛选：默认折叠，点击"更多"展开 */}
      {showMore && (
        <div className="mt-3 grid grid-cols-5 gap-4">
          {/* 联系人 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">联系人</Label>
            <Input
              type="text"
              value={filters.contact || ''}
              onChange={(e) => onFilterChange('contact', e.target.value)}
              placeholder="输入联系人搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 区域级联：省 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">省份</Label>
            <Select
              value={(filters.province ?? '') || ''}
              onValueChange={(val) => handleProvinceChange(val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {provinces.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 区域级联：市 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">城市</Label>
            <Select
              value={(filters.city ?? '') || ''}
              onValueChange={(val) => handleCityChange(val)}
              disabled={!(filters.province ?? '')}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {cityOptions.filter(c => c.value !== '').map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 区域级联：区 */}

          {/* 供应商编号 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</Label>
            <Input
              type="text"
              value={filters.code || ''}
              onChange={(e) => onFilterChange('code', e.target.value)}
              placeholder="输入编号搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 2026-09-28 批次B：资质合规状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">资质状态</Label>
            <Select
              value={filters.qualification || '全部'}
              onValueChange={(val) => onFilterChange('qualification', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {QUALIFICATION_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2026-09-28 批次C：内部自产标记 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">内部自产</Label>
            <Select
              value={filters.isInternal || '全部'}
              onValueChange={(val) => onFilterChange('isInternal', val)}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {SUPPLIER_INTERNAL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

// 筛选函数（含区域级联筛选 方案6.1）
export function filterSuppliers<T extends {
  id: string;
  code: string;
  name: string;
  contact: string;
  supplierType: string;
  status: string;
  supplierAttribute: string;
  organization: string;
  province?: string;
  city?: string;
}>(suppliers: T[], filters: SupplierFiltersState): T[] {
  return suppliers.filter(supplier => {
    if (filters.code && !supplier.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.name && !supplier.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.contact && !supplier.contact.toLowerCase().includes(filters.contact.toLowerCase())) return false;
    if (filters.type !== '全部' && supplier.supplierType !== filters.type) return false;
    if (filters.status !== '全部' && supplier.status !== filters.status) return false;
    if (filters.supplierAttribute !== '全部' && supplier.supplierAttribute !== filters.supplierAttribute) return false;
    if (filters.organization !== '全部' && supplier.organization !== filters.organization) return false;
    // 区域级联
    if (filters.province && supplier.province !== filters.province) return false;
    if (filters.city && supplier.city !== filters.city) return false;
    // 2026-09-28：区县谓词已移除（suppliers 无该列）

    // 2026-09-28 批次B：资质合规状态（'attention' 为聚合项；'全部'/空 不过滤）
    const qualFilter = filters.qualification;
    if (qualFilter && qualFilter !== '全部') {
      const status = evaluateSupplierQualification(supplier as unknown as SupplierQualificationFields).status;
      if (qualFilter === 'attention') {
        if (!ATTENTION_STATUSES.includes(status)) return false;
      } else if (status !== qualFilter) {
        return false;
      }
    }

    // 2026-09-28 批次C：内部自产标记（历史行无该值时按外部采购处理）
    if (filters.isInternal && filters.isInternal !== '全部') {
      const flag = String((supplier as Record<string, unknown>).isInternal || 'external');
      if (flag !== filters.isInternal) return false;
    }
    return true;
  });
}
