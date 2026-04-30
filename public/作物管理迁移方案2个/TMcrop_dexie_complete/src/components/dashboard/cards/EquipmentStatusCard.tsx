import { Activity } from 'lucide-react';
import { equipmentStats } from '../../../data/mockData';

export function EquipmentStatusCard() {
  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
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
    </div>
  );
}
