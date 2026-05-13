/**
 * 设备选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useDeviceStore } from '../../../stores';

interface DeviceSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  deviceType?: string;
  greenhouseOid?: string;
}

export function DeviceSelect({
  value,
  onChange,
  placeholder = '选择设备',
  allowClear = true,
  disabled = false,
  deviceType,
  greenhouseOid,
}: DeviceSelectProps) {
  const devices = useDeviceStore((state) => state.devices);
  const loading = useDeviceStore((state) => state.loading);

  React.useEffect(() => {
    if (devices.length === 0 && !loading) {
      useDeviceStore.getState().loadDevices();
    }
  }, [devices.length, loading]);

  let filteredDevices = devices;

  if (deviceType) {
    filteredDevices = filteredDevices.filter((d) => d.deviceType === deviceType);
  }

  if (greenhouseOid) {
    filteredDevices = filteredDevices.filter((d) => d.greenhouseOid === greenhouseOid);
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredDevices.map((device) => (
        <option key={device.oid} value={device.oid}>
          {device.deviceName} ({device.deviceCode})
        </option>
      ))}
    </select>
  );
}

export default DeviceSelect;
