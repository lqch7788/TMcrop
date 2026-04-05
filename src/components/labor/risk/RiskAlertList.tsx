import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, AlertCircle, AlertOctagon, Clock, CheckCircle } from 'lucide-react';
import type { RiskAlert, AlertLevel } from './types';
import { AlertLevelNames } from './types';

interface RiskAlertListProps {
  alerts: RiskAlert[];
  onSelectAlert: (alert: RiskAlert) => void;
}

// 预警等级样式配置
const levelStyles: Record<AlertLevel, { icon: React.ReactNode; variant: 'warning' | 'destructive' | 'destructive'; className: string }> = {
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    variant: 'warning',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  danger: {
    icon: <AlertCircle className="w-4 h-4" />,
    variant: 'destructive',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  critical: {
    icon: <AlertOctagon className="w-4 h-4" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

export function RiskAlertList({ alerts, onSelectAlert }: RiskAlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-lg font-medium">暂无预警数据</p>
        <p className="text-sm">当前没有符合筛选条件的预警信息</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[100px]">预警等级</TableHead>
            <TableHead className="w-[120px]">预警类型</TableHead>
            <TableHead>预警标题</TableHead>
            <TableHead className="w-[100px]">部门/人员</TableHead>
            <TableHead className="w-[100px]">状态</TableHead>
            <TableHead className="w-[160px]">创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const style = levelStyles[alert.level];
            return (
              <TableRow
                key={alert.id}
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => onSelectAlert(alert)}
              >
                <TableCell>
                  <Badge variant={style.variant} className={style.className}>
                    <span className="flex items-center gap-1">
                      {style.icon}
                      {AlertLevelNames[alert.level]}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{alert.alertTypeName}</TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="font-medium text-gray-900 truncate">{alert.title}</p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{alert.content}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {alert.department && <p className="text-gray-600">{alert.department}</p>}
                    {alert.staffName && <p className="text-gray-500">{alert.staffName}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  {alert.status === 'pending' ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                      <Clock className="w-3 h-3 mr-1" />
                      待处理
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已处理
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">{alert.createTime}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
