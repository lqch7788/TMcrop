/**
 * 人效分析详细数据表格 - 支持批量操作
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Download, Plus, Edit2, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { EfficiencyMetrics } from './types';
import { Pagination } from '@/components/ui';

interface EfficiencyTableProps {
  data: EfficiencyMetrics[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onViewDetail?: (record: EfficiencyMetrics) => void;
  onEdit?: (record: EfficiencyMetrics) => void;
  onDelete?: (record: EfficiencyMetrics) => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onAddClick?: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const EfficiencyTable: React.FC<EfficiencyTableProps> = ({
  data,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onViewDetail,
  onEdit,
  onDelete,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onAddClick,
}) => {
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  // 判断是否全选
  const isAllSelected = selectedRows.length === data.length && data.length > 0;

  // 格式化数值显示
  const formatValue = (value: number, type: 'number' | 'percent' | 'currency') => {
    if (type === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (type === 'currency') {
      return value.toLocaleString();
    }
    return value.toFixed(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">人效详细数据</h3>
          {showCheckbox && (
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 取消按钮 */}
          {showCheckbox && (
            <Button
              variant="secondary"
              onClick={onCancelBatch}
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          )}
          {/* 新增按钮 - 正常模式显示 */}
          {!showCheckbox && (
            <Button
              variant="default"
              onClick={onAddClick}
            >
              <Plus className="w-4 h-4 mr-1" />
              新增
            </Button>
          )}
          {/* 编辑/批量编辑按钮 - 同一位置 */}
          {batchEditMode ? (
            <Button
              variant="default"
              onClick={onBatchEditClick}
              disabled={selectedRows.length === 0}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              批量编辑
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                variant="default"
                onClick={onBatchEditClick}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            )
          )}
          {/* 删除/批量删除按钮 - 同一位置 */}
          {batchDeleteMode ? (
            <Button
              variant="default"
              onClick={onBatchDeleteClick}
              disabled={selectedRows.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              批量删除
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                variant="default"
                onClick={onBatchDeleteClick}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            )
          )}
          {/* 导出按钮 - 同一位置 */}
          {exportMode ? (
            <Button
              variant="default"
              onClick={onBatchExportClick}
              disabled={selectedRows.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                variant="default"
                onClick={onBatchExportClick}
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            )
          )}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onSelectAll}
                      className="text-white hover:text-blue-200"
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </Button>
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">月份</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">部门</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">总人数</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">总产出</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">人均产出</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">总工时</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">工时效率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">任务达成率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">出勤率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">人工成本率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">技能覆盖率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {paginatedData.map((row) => (
              <TableRow key={row.id} className={`hover:bg-blue-50 transition-colors ${selectedRows.includes(row.id) ? 'bg-emerald-50' : ''}`}>
                {showCheckbox && (
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectRow?.(row.id)}
                      className="text-gray-500 hover:text-emerald-600"
                    >
                      {selectedRows.includes(row.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.date}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.department}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalWorkers}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalOutput.toLocaleString()}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.avgOutputPerWorker, 'number')}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalHours}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    row.avgEfficiency >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {formatValue(row.avgEfficiency, 'percent')}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    row.taskCompletionRate >= 0.95 ? 'bg-emerald-100 text-emerald-700' :
                    row.taskCompletionRate >= 0.90 ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {formatValue(row.taskCompletionRate, 'percent')}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.attendanceRate, 'percent')}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.laborCostRate, 'percent')}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.skillCoverage, 'percent')}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail?.(row)}
                      className="text-gray-500 hover:text-emerald-600"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!batchEditMode && !batchDeleteMode && !exportMode && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(row)}
                          className="text-gray-500 hover:text-blue-600"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(row)}
                          className="text-gray-500 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            showPageSize={true}
          />
        </div>
      </div>
    </div>
  );
};

export default EfficiencyTable;
