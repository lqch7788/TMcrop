/**
 * 劳动风险预警列表组件 - 支持批量操作
 */

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
import { AlertTriangle, AlertCircle, AlertOctagon, Clock, CheckCircle, CheckSquare, Square, X, Trash2, Plus, Edit2, Download } from 'lucide-react';
import type { RiskAlert, AlertLevel } from './types';
import { AlertLevelNames } from './types';

interface RiskAlertListProps {
  alerts: RiskAlert[];
  onSelectAlert: (alert: RiskAlert) => void;
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onEdit?: (alert: RiskAlert) => void;
  onDelete?: (alert: RiskAlert) => void;
  onAddClick?: () => void;
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

export function RiskAlertList({
  alerts,
  onSelectAlert,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onEdit,
  onDelete,
  onAddClick,
}: RiskAlertListProps) {
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 计算分页
  const totalPages = Math.ceil(alerts.length / pageSize) || 1;
  const paginatedAlerts = alerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 判断是否全选
  const isAllSelected = selectedRows.length === alerts.length && alerts.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">预警列表</h3>
        <div className="flex items-center gap-2">
          {/* 批量操作按钮 */}
          {showCheckbox ? (
            <>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              <button
                onClick={onCancelBatch}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              {batchEditMode && (
                <button
                  onClick={onBatchEditClick}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="w-4 h-4" />
                  批量编辑
                </button>
              )}
              {batchDeleteMode && (
                <button
                  onClick={onBatchDeleteClick}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </button>
              )}
              {exportMode && (
                <button
                  onClick={onBatchExportClick}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {onBatchEditClick && (
                <button
                  onClick={onBatchEditClick}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </button>
              )}
              {onBatchDeleteClick && (
                <button
                  onClick={onBatchDeleteClick}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {onBatchExportClick && (
                <button
                  onClick={onBatchExportClick}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <button onClick={onSelectAll} className="text-white hover:text-blue-200">
                    {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警等级</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">预警标题</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门/人员</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">创建时间</th>
              {!showCheckbox && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginatedAlerts.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                  暂无预警数据
                </td>
              </tr>
            ) : (
              paginatedAlerts.map((alert, index) => {
                const style = levelStyles[alert.level];
                // 生成预警编号：20260411 + 3位序号
                const baseDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const alertNumber = `${baseDate}${String((currentPage - 1) * pageSize + index + 1).padStart(3, '0')}`;
                return (
                  <tr
                    key={alert.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedRows.includes(alert.id) ? 'bg-emerald-50' : ''}`}
                    onClick={() => !showCheckbox && onSelectAlert(alert)}
                  >
                    {showCheckbox && (
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onSelectRow?.(alert.id)} className="text-gray-500 hover:text-emerald-600">
                          {selectedRows.includes(alert.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{alertNumber}</td>
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
                    {!showCheckbox && (
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSelectAlert(alert)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="查看详情"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          {onEdit && (
                            <button
                              onClick={() => onEdit(alert)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="编辑"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(alert)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
