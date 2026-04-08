import React, { useState } from 'react';
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
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 计算分页
  const totalPages = Math.ceil(alerts.length / pageSize) || 1;
  const paginatedAlerts = alerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">预警列表</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警等级</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警标题</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门/人员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建时间</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginatedAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无预警数据
                </td>
              </tr>
            ) : (
              paginatedAlerts.map((alert) => {
                const style = levelStyles[alert.level];
                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => onSelectAlert(alert)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={style.variant} className={style.className}>
                        <span className="flex items-center gap-1">
                          {style.icon}
                          {AlertLevelNames[alert.level]}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{alert.alertTypeName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 truncate">{alert.title}</p>
                        <p className="text-sm text-gray-500 truncate">{alert.content}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        {alert.department && <p>{alert.department}</p>}
                        {alert.staffName && <p className="text-gray-500">{alert.staffName}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{alert.createTime}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 px-4 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {alerts.length} 条</span>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
