/**
 * IoT数据来源标识组件
 * 显示当前IoT设备连接状态和自动记录数统计
 */
import React from 'react';
import { Wifi, WifiOff, Cpu } from 'lucide-react';

interface IotDeviceStatus {
  device_id: string;
  device_name: string;
  record_count: number;
  last_active?: string;
}

interface IotDataIndicatorProps {
  /** IoT设备状态列表 */
  devices: IotDeviceStatus[];
  /** 是否正在加载 */
  loading?: boolean;
  className?: string;
}

export default function IotDataIndicator({ devices, loading = false, className = '' }: IotDataIndicatorProps) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
        <Cpu className="w-4 h-4 animate-pulse" />
        <span>正在查询IoT设备...</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
        <WifiOff className="w-4 h-4" />
        <span>暂无IoT设备连接</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {devices.map((device) => (
        <div
          key={device.device_id}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-emerald-700">{device.device_name}</span>
          <span className="text-emerald-500">|</span>
          <span className="text-emerald-600">
            自动记录: <strong>{device.record_count}</strong> 条
          </span>
          {device.last_active && (
            <span className="text-xs text-gray-400 ml-1">
              最后活跃: {new Date(device.last_active).toLocaleString('zh-CN')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export type { IotDeviceStatus };
