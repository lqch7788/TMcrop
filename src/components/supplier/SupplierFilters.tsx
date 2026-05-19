// 供应商筛选组件 - 含四级区域级联筛选（方案6.1）
import { useMemo, useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SupplierFiltersState } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../ui/button';
import { useDictionaryStore, useRegionStore } from '../../stores';

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

  const attributeOptions = useMemo(() => {
    const attrs = dictionaries.filter(d => d.categoryCode === 'supplier_attribute' && d.status === 'active');
    return ['全部', ...attrs.map(a => a.dictLabel)];
  }, [dictionaries]);

  const typeOptions = ['全部', 'SP', 'FE', 'PP', 'EQ', 'FA', 'IR', 'OP', 'PH', 'TS', 'UT', 'OT'];
  const statusOptions = ['全部', '合作中', '暂停', '终止'];
  const organizationOptions = ['全部', '宁波帮帮忙公司', '成都帮帮您公司'];

  // 四级区域级联筛选（方案6.1）
  const { provinces, fetchProvinces, getChildren } = useRegionStore();
  const [provinceOptions, setProvinceOptions] = useState<Array<{value: string; label: string}>>([]);
  const [cityOptions, setCityOptions] = useState<Array<{value: string; label: string}>>([]);
  const [districtOptions, setDistrictOptions] = useState<Array<{value: string; label: string}>>([]);

  useEffect(() => { fetchProvinces(); }, [fetchProvinces]);
  useEffect(() => {
    setProvinceOptions([{ value: '', label: '全部' }, ...provinces.map(p => ({ value: p.name, label: p.name }))]);
  }, [provinces]);

  const loadCities = useCallback(async (provinceName: string) => {
    if (!provinceName) { setCityOptions([]); return; }
    const provinceId = provinces.find(p => p.name === provinceName)?.id;
    if (provinceId) {
      const children = await getChildren(provinceId);
      setCityOptions([{ value: '', label: '全部' }, ...children.map(c => ({ value: c.name, label: c.name }))]);
    }
  }, [provinces, getChildren]);

  const loadDistricts = useCallback(async (cityName: string) => {
    if (!cityName) { setDistrictOptions([]); return; }
    // 从所有市选项中找对应ID
    const allCities = cityOptions.filter(c => c.value !== '');
    const cityId = allCities.find(c => c.value === cityName)?.value;
    // 由于我们存的是name不是id，需要从provinces的子节点中找
    for (const p of provinces) {
      const children = await getChildren(p.id);
      const city = children.find(c => c.name === cityName);
      if (city) {
        const districts = await getChildren(city.id);
        setDistrictOptions([{ value: '', label: '全部' }, ...districts.map(d => ({ value: d.name, label: d.name }))]);
        return;
      }
    }
    setDistrictOptions([]);
  }, [provinces, cityOptions, getChildren]);

  const handleProvinceChange = (value: string) => {
    onFilterChange('province' as any, value);
    onFilterChange('city' as any, '');
    onFilterChange('district' as any, '');
    setCityOptions([]);
    setDistrictOptions([]);
    loadCities(value);
  };

  const handleCityChange = (value: string) => {
    onFilterChange('city' as any, value);
    onFilterChange('district' as any, '');
    setDistrictOptions([]);
    loadDistricts(value);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* 第一行：默认可见的筛选字段 */}
      <div className="flex items-end gap-4">
        <div className="flex-1 grid grid-cols-5 gap-4">
          {/* 供应商名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
            <input
              type="text"
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              placeholder="输入名称搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 组织 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
            <select
              value={filters.organization}
              onChange={(e) => onFilterChange('organization', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {organizationOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 供应商类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商类型</label>
            <select
              value={filters.type}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {typeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt === '全部' ? '全部类型' : getSupplierTypeName(opt)}
                </option>
              ))}
            </select>
          </div>

          {/* 供应商属性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商属性</label>
            <select
              value={filters.supplierAttribute}
              onChange={(e) => onFilterChange('supplierAttribute', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {attributeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 供应商状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商状态</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
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
            onClick={onReset}
            className="whitespace-nowrap"
          >
            重置
          </Button>
        </div>
      </div>

      {/* 更多筛选：默认折叠，点击"更多"展开 */}
      {showMore && (
        <div className="mt-3 grid grid-cols-5 gap-4">
          {/* 联系人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
            <input
              type="text"
              value={filters.contact || ''}
              onChange={(e) => onFilterChange('contact', e.target.value)}
              placeholder="输入联系人搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 区域级联：省 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
            <select
              value={(filters as any).province || ''}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              {provinces.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 区域级联：市 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
            <select
              value={(filters as any).city || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!(filters as any).province}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
            >
              <option value="">全部</option>
              {cityOptions.filter(c => c.value !== '').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* 区域级联：区 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">区县</label>
            <select
              value={(filters as any).district || ''}
              onChange={(e) => onFilterChange('district' as any, e.target.value)}
              disabled={!(filters as any).city}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
            >
              <option value="">全部</option>
              {districtOptions.filter(d => d.value !== '').map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* 供应商编号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
            <input
              type="text"
              value={filters.code || ''}
              onChange={(e) => onFilterChange('code', e.target.value)}
              placeholder="输入编号搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 筛选函数（含区域级联筛选 方案6.1）
export function filterSuppliers<T extends {
  id: number;
  code: string;
  name: string;
  contact: string;
  supplierType: string;
  status: string;
  supplierAttribute: string;
  organization: string;
  province?: string;
  city?: string;
  district?: string;
}>(suppliers: T[], filters: SupplierFiltersState): T[] {
  return suppliers.filter(supplier => {
    if (filters.code && !supplier.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.name && !supplier.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.contact && !supplier.contact.toLowerCase().includes(filters.contact.toLowerCase())) return false;
    if (filters.type !== '全部' && (supplier as any).supplierType !== filters.type) return false;
    if (filters.status !== '全部' && supplier.status !== filters.status) return false;
    if (filters.supplierAttribute !== '全部' && supplier.supplierAttribute !== filters.supplierAttribute) return false;
    if (filters.organization !== '全部' && supplier.organization !== filters.organization) return false;
    // 区域级联
    if (filters.province && supplier.province !== filters.province) return false;
    if (filters.city && supplier.city !== filters.city) return false;
    if (filters.district && (supplier as any).district !== filters.district) return false;
    return true;
  });
}
