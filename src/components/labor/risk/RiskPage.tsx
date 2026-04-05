import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRisk } from './hooks/useRisk';
import { RiskDashboard } from './RiskDashboard';
import { RiskFilters } from './RiskFilters';
import { RiskAlertList } from './RiskAlertList';
import { RiskAlertDetailModal } from './RiskAlertDetailModal';
import type { RiskAlert } from './types';

export function RiskPage() {
  const { alerts, stats, filters, updateFilters, clearFilters, handleAlert, getAlertById } =
    useRisk();
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleSelectAlert = (alert: RiskAlert) => {
    setSelectedAlert(alert);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedAlert(null);
  };

  const handleHandleAlert = (alertId: string, remarks: string) => {
    handleAlert(alertId, remarks);
    // 刷新选中预警的详情
    const updated = getAlertById(alertId);
    if (updated) {
      setSelectedAlert(updated);
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">劳动风险预警</h1>
        <p className="text-sm text-gray-500 mt-1">监控和管理劳动风险预警信息</p>
      </div>

      {/* 预警仪表盘 */}
      <RiskDashboard stats={stats} />

      {/* 预警列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">预警列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 筛选栏 */}
          <RiskFilters filters={filters} onUpdate={updateFilters} onClear={clearFilters} />

          {/* 预警列表 */}
          <RiskAlertList alerts={alerts} onSelectAlert={handleSelectAlert} />
        </CardContent>
      </Card>

      {/* 预警详情弹窗 */}
      <RiskAlertDetailModal
        alert={selectedAlert}
        open={detailModalOpen}
        onClose={handleCloseDetail}
        onHandle={handleHandleAlert}
      />
    </div>
  );
}
