import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, AlertOctagon, Bell, Clock, CheckCircle } from 'lucide-react';
import type { AlertLevel } from './types';

interface RiskDashboardProps {
  stats: {
    todayCount: number;
    weekCount: number;
    pendingCount: number;
    totalCount: number;
    byLevel: Record<AlertLevel, number>;
  };
}

// 预警等级配置
const levelConfig: Record<AlertLevel, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  warning: {
    label: '一般提醒',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  danger: {
    label: '需要注意',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  critical: {
    label: '紧急处理',
    icon: <AlertOctagon className="w-5 h-5" />,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
};

export function RiskDashboard({ stats }: RiskDashboardProps) {
  return (
    <div className="space-y-4">
      {/* 统计卡片行 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 今日预警 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">今日预警</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{stats.todayCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 本周预警 */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">本周预警</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{stats.weekCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 待处理预警 */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">待处理预警</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{stats.pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 已处理预警 */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">已处理预警</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {stats.totalCount - stats.pendingCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预警等级分布 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">预警等级分布（待处理）</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(levelConfig) as AlertLevel[]).map((level) => {
              const config = levelConfig[level];
              const count = stats.byLevel[level];
              return (
                <div
                  key={level}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg}`}
                >
                  <div className={`${config.color}`}>{config.icon}</div>
                  <div>
                    <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                    <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
