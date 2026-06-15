import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useDeviceStore } from '../../../stores/useDeviceStore';
import { CardSkeleton } from './CardSkeleton';

export function EquipmentStatusCard() {
  const navigate = useNavigate();
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const loadDevices = useDeviceStore((s) => s.loadDevices);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 根据设备 status 字段统计各类设备数量
  const safeDevices = Array.isArray(devices) ? devices : [];
  const equipmentStats = useMemo(() => ({
    autoMode: safeDevices.filter(d => d.status === 'normal' || d.status === 'active' || d.status === 'running').length,
    manualMode: safeDevices.filter(d => d.status === 'manual' || d.status === 'standby').length,
    faults: safeDevices.filter(d => d.status === 'fault' || d.status === 'error' || d.status === 'faulty' || d.status === 'repair').length,
    offlineSensors: safeDevices.filter(d => d.status === 'offline' || d.status === 'inactive' || d.status === 'disabled').length,
  }), [devices]);

  return (
    <button
      type="button"
      onClick={() => navigate('/device-monitor')}
      className="flex flex-col text-left w-full h-full bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none"
      aria-label={`设备状态：自动运行 ${equipmentStats.autoMode} 台、手动模式 ${equipmentStats.manualMode} 台、设备故障 ${equipmentStats.faults} 台、离线传感器 ${equipmentStats.offlineSensors} 个，点击查看设备监控`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-cyan-500 to-teal-600">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">设备状态</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">自动运行</span>
          <span className="font-medium text-emerald-600">{equipmentStats.autoMode}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">手动模式</span>
          <span className="font-medium text-amber-600">{equipmentStats.manualMode}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">设备故障</span>
          <span className="font-medium text-red-600">{equipmentStats.faults}台</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">离线传感器</span>
          <span className="font-medium text-gray-600">{equipmentStats.offlineSensors}个</span>
        </div>
      </div>
    </button>
  );
}
