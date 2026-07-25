/**
 * 基地运营中心 - 区域下拉组件
 *
 * 2026-07-25：替换原 DictSelect category="planting_area" / getDictItems('seedling_site')
 * 统一数据源：useZoneStore（基地运营中心 zone 表）
 *
 * 与 DictSelect 接口约定一致：
 *   value: 当前选中 zone.oid（与 dictItem.dictCode 同语义）
 *   onChange(oid): 单参数字符串回调
 *
 * 多基地场景：传 baseOid 可限定到某基地下的 zone；
 * 不传则默认当前用户所有 zone（与 dict 同等行为）
 */

import React from 'react';
import { useZoneStore } from '@/stores';

interface BaseZoneSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 限定基地 OID；不传则显示全量 zone */
  baseOid?: string;
  /** 显示时附加 zoneCode，便于同名区域区分（如 "Z001-001 玻璃温室1区"） */
  showCode?: boolean;
  /** 显示时附加所属温室（如 "玻璃温室区 / 玻璃温室1区"），需 greenhouseName 字段 */
  showParent?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BaseZoneSelect({
  value,
  onChange,
  placeholder = '选择区域',
  baseOid,
  showCode = false,
  showParent = false,
  allowClear = true,
  disabled = false,
  className = 'w-full h-10 px-3 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed',
}: BaseZoneSelectProps) {
  const zones = useZoneStore((s) => s.zones);
  const loading = useZoneStore((s) => s.loading);
  const loadZones = useZoneStore((s) => s.loadZones);

  // 首次打开自动加载 zone 列表
  React.useEffect(() => {
    if (zones.length === 0 && !loading) {
      loadZones();
    }
  }, [zones.length, loading, loadZones]);

  // 过滤：仅取 status !== 'inactive'（active 状态显示）；可选 baseOid 过滤
  const filtered = React.useMemo(() => {
    const active = zones.filter((z) => (z.status ?? 'active') !== 'inactive');
    if (baseOid) return active.filter((z) => z.baseOid === baseOid);
    return active;
  }, [zones, baseOid]);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      {/* 2026-07-16：disabled + hidden 修复 — placeholder 不作为可选项
          （参考 DictSelect 同样的处理） */}
      <option value="" disabled hidden>
        {placeholder}
      </option>
      {filtered.map((z) => {
        const code = showCode && z.zoneCode ? `${z.zoneCode} - ` : '';
        const parent = showParent && (z as any).greenhouseName ? `${(z as any).greenhouseName} / ` : '';
        const label = `${code}${parent}${z.zoneName || '未命名区域'}`;
        return (
          <option key={z.oid} value={z.oid}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

export default BaseZoneSelect;
