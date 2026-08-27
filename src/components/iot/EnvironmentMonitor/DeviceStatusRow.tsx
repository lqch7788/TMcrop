/**
 * 设备运行状态横栏（9 设备）
 */
import React from 'react';
import { DeviceStatusItem } from './mockData';

const statusStyle: Record<string, { bg: string; text: string; border: string; label: string }> = {
  running: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500', label: '运转中' },
  idle: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: '未工作' },
  fault: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', label: '异常' },
};

interface DeviceStatusRowProps {
  devices: DeviceStatusItem[];
}

const DeviceStatusRow: React.FC<DeviceStatusRowProps> = ({ devices }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
      <div className="grid grid-cols-9 gap-2">
        {devices.map(device => {
          const style = statusStyle[device.status];
          const Icon = device.icon;
          const isActive = device.status === 'running';
          return (
            <div
              key={device.id}
              className={`flex flex-col items-center justify-center px-2 py-3 border ${style.border} ${isActive ? style.bg : 'bg-white'} rounded-lg transition-colors`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium mt-1 ${isActive ? 'text-white' : 'text-gray-700'}`}>
                {device.name}
              </span>
              <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {style.label}
              </span>
              <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {device.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceStatusRow;
