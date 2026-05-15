import { useEffect } from 'react';
import { AlertTriangle, Thermometer, Activity, Eye, Sprout } from 'lucide-react';
import { useDashboardStore } from '../../../stores/useDashboardStore';

export function AlertsCard() {
  const alertsBreakdown = useDashboardStore((s) => s.alertsBreakdown);
  const fetchDashboardStats = useDashboardStore((s) => s.fetchDashboardStats);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-red-500 to-rose-600">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">告警数量</span>
        </div>
        <span className="text-2xl font-bold text-red-600">{alertsBreakdown.total}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-red-500" />
            环境告警
          </span>
          <span className="font-medium">{alertsBreakdown.environment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-orange-500" />
            设备故障
          </span>
          <span className="font-medium">{alertsBreakdown.equipment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Eye className="w-3 h-3 text-yellow-500" />
            病虫害告警
          </span>
          <span className="font-medium">{alertsBreakdown.pest}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-500" />
            农事告警
          </span>
          <span className="font-medium">{alertsBreakdown.farming}</span>
        </div>
      </div>
    </div>
  );
}
