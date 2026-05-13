/**
 * 区域选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useZoneStore } from '../../../stores';

interface ZoneSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  greenhouseOid?: string;
}

export function ZoneSelect({
  value,
  onChange,
  placeholder = '选择区域',
  allowClear = true,
  disabled = false,
  greenhouseOid,
}: ZoneSelectProps) {
  const zones = useZoneStore((state) => state.zones);
  const loading = useZoneStore((state) => state.loading);

  React.useEffect(() => {
    if (zones.length === 0 && !loading) {
      useZoneStore.getState().loadZones();
    }
  }, [zones.length, loading]);

  const filteredZones = greenhouseOid
    ? zones.filter((z) => z.greenhouseOid === greenhouseOid)
    : zones;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredZones.map((zone) => (
        <option key={zone.oid} value={zone.oid}>
          {zone.zoneName} ({zone.zoneCode})
        </option>
      ))}
    </select>
  );
}

export default ZoneSelect;
