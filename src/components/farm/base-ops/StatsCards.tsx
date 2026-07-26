/**
 * 基地运营中心 — 顶部 4 统计卡组件
 * Plan B 2026-07-25
 */
import { Card, CardContent } from '@/components/ui';
import type { BaseOpsStats } from './types';

export function StatsCards({ stats }: { stats: BaseOpsStats }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalArea}</div>
          <div className="text-sm text-gray-600">总面积(㎡)</div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.zoneCount}</div>
          <div className="text-sm text-gray-600">区块数</div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
        <CardContent className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.plantingCount}</div>
          <div className="text-sm text-gray-600">种植中</div>
        </CardContent>
      </Card>
    </div>
  );
}