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
import { Button } from '@/components/ui/button';
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
              <Button variant="secondary" onClick={onCancelBatch} className="flex items-center gap-1">
                <X className="w-4 h-4" />
                取消
              </Button>
              {batchEditMode && (
                <Button variant="blue" onClick={onBatchEditClick} disabled={selectedRows.length === 0} className="flex items-center gap-1">
                  <Edit2 className="w-4 h-4" />
                  批量编辑
                </Button>
              )}
              {batchDeleteMode && (
                <Button variant="destructive" onClick={onBatchDeleteClick} disabled={selectedRows.length === 0} className="flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </Button>
              )}
              {exportMode && (
                <Button variant="default" onClick={onBatchExportClick} disabled={selectedRows.length === 0} className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <Button variant="default" onClick={onAddClick} className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {onBatchEditClick && (
                <Button variant="blue" onClick={onBatchEditClick} className="flex items-center gap-1">
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {onBatchDeleteClick && (
                <Button variant="destructive" onClick={onBatchDeleteClick} className="flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {onBatchExportClick && (
                <Button variant="default" onClick={onBatchExportClick} className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap w-12">
                  <Button variant="ghost" size="icon" onClick={onSelectAll} className="text-white hover:text-blue-200">
                    {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </Button>
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">预警编号</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">预警等级</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">预警类型</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">预警标题</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">部门/人员</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">创建时间</TableHead>
              {!showCheckbox && <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-100">
            {paginatedAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                  暂无预警数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedAlerts.map((alert, index) => {
                const style = levelStyles[alert.level];
                // 生成预警编号：20260411 + 3位序号
                const baseDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const alertNumber = `${baseDate}${String((currentPage - 1) * pageSize + index + 1).padStart(3, '0')}`;
                return (
                  <TableRow
                    key={alert.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedRows.includes(alert.id) ? 'bg-emerald-50' : ''}`}
                    onClick={() => !showCheckbox && onSelectAlert(alert)}
                  >
                    {showCheckbox && (
                      <TableCell className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => onSelectRow?.(alert.id)}>
                          {selectedRows.includes(alert.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{alertNumber}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={style.variant} className={style.className}>
                        <span className="flex items-center gap-1">
                          {style.icon}
                          {AlertLevelNames[alert.level]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{alert.alertTypeName}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 truncate">{alert.title}</p>
                        <p className="text-sm text-gray-500 truncate">{alert.content}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        {alert.department && <p>{alert.department}</p>}
                        {alert.staffName && <p className="text-gray-500">{alert.staffName}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
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
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{alert.createTime}</TableCell>
                    {!showCheckbox && (
                      <TableCell className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onSelectAlert(alert)} title="查看详情">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          {onEdit && (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(alert)} title="编辑">
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(alert)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
            &lt;
          </Button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}
