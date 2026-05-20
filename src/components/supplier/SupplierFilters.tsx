// 供应商筛选组件 - 含四级区域级联筛选（方案6.1）
import { useMemo, useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SupplierFiltersState } from './types';
import { getSupplierTypeName } from './data';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
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
    onFilterChange('province', value);
    onFilterChange('city', '');
    onFilterChange('district', '');
    setCityOptions([]);
    setDistrictOptions([]);
    loadCities(value);
  };

  const handleCityChange = (value: string) => {
    onFilterChange('city', value);
    onFilterChange('district', '');
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
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">区县</Label>
            <Select
              value={(filters.district ?? '') || ''}
              onValueChange={(val) => onFilterChange('district', val)}
              disabled={!(filters.city ?? '')}
            >
              <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {districtOptions.filter(d => d.value !== '').map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
    if (filters.type !== '全部' && supplier.supplierType !== filters.type) return false;
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
