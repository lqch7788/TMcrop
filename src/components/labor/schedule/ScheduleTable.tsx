import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import type { ScheduleRecord, ShiftConfig } from './types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Pagination } from '@/components/ui/Pagination';

interface ScheduleTableProps {
  scheduleList: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onScheduleClick?: (record: ScheduleRecord) => void;
  onExport?: () => void;
  onAddClick?: () => void;
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
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  // 权限控制props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

// 获取班次颜色
function getShiftColor(shift: string, configs: ShiftConfig[]): string {
  const config = configs.find(c => c.name === shift);
  return config?.color || 'bg-gray-500';
}

export function ScheduleTable({
  scheduleList,
  shiftConfigs,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onScheduleClick,
  onExport,
  onAddClick,
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
  onCancelBatchEdit,
  onCancelBatchDelete,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: ScheduleTableProps) {
  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    return {
      start: weekStart.toISOString().split('T')[0],
      end: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  });

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return scheduleList.filter(record => {
      // 搜索
      const matchSearch =
        record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.workZone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date.includes(searchTerm);

      // 班次筛选
      const matchShift = shiftFilter === 'all' || record.shift === shiftFilter;

      // 状态筛选
      const matchStatus = statusFilter === 'all' || record.status === statusFilter;

      // 日期范围
      const matchDate = record.date >= dateRange.start && record.date <= dateRange.end;

      return matchSearch && matchShift && matchStatus && matchDate;
    });
  }, [scheduleList, searchTerm, shiftFilter, statusFilter, dateRange]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const allSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRows.includes(r.id));

  // 星期几
  const getWeekday = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">排班记录</h3>
        <div className="flex gap-2">
          {(batchEditMode || batchDeleteMode || exportMode) ? (
            <>
              {batchEditMode && (
                <>
                  <Button
                    size="sm"
                    variant="blue"
                    onClick={onBatchEditClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Edit className="w-4 h-4" />
                    批量编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatchEdit}
                  >
                    取消
                  </Button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onBatchDeleteClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatchDelete}
                  >
                    取消
                  </Button>
                </>
              )}
              {exportMode && (
                <>
                  <Button
                    size="sm"
                    onClick={onBatchExportClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onBatchExportClick}
                  >
                    取消
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {canCreate && onAddClick && (
                <Button
                  size="sm"
                  onClick={onAddClick}
                >
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && onBatchEditClick && (
                <Button
                  size="sm"
                  variant="blue"
                  onClick={onBatchEditClick}
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && onBatchDeleteClick && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBatchDeleteClick}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && onExport && (
                <Button
                  size="sm"
                  onClick={onExport}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 工具栏 */}
      <div className="p-4 space-y-3">
        {/* 搜索和操作 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索员工、区域、日期..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  onPageChange?.(1);
                }}
                className="pl-9 pr-4"
              />
            </div>
          </div>
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          )}
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">日期:</span>
            <DatePicker
              selected={dateRange.start ? new Date(dateRange.start) : undefined}
              onChange={(date) => {
                setDateRange(prev => ({ ...prev, start: date.toISOString().split('T')[0] }));
                onPageChange?.(1);
              }}
              className="w-[140px]"
            />
            <span className="text-gray-400">至</span>
            <DatePicker
              selected={dateRange.end ? new Date(dateRange.end) : undefined}
              onChange={(date) => {
                setDateRange(prev => ({ ...prev, end: date.toISOString().split('T')[0] }));
                onPageChange?.(1);
              }}
              className="w-[140px]"
            />
          </div>

          {/* 班次筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">班次:</span>
            <select
              value={shiftFilter}
              onChange={e => {
                setShiftFilter(e.target.value);
                onPageChange?.(1);
              }}
              className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              {shiftConfigs.map(config => (
                <option key={config.name} value={config.name}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">状态:</span>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                onPageChange?.(1);
              }}
              className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="已排班">已排班</option>
              <option value="已执行">已执行</option>
              <option value="已取消">已取消</option>
            </select>
          </div>

          {/* 结果统计 */}
          <div className="text-sm text-gray-500 ml-auto">
            共 {filteredData.length} 条记录
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onSelectAll?.()}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-blue-600"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                日期
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                员工
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                班次
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                工作区域
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                时间
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                状态
              </TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">
                签到/签退
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map(record => {
                const shiftConfig = shiftConfigs.find(c => c.name === record.shift);
                return (
                  <TableRow
                    key={record.id}
                    onClick={() => (exportMode || batchEditMode || batchDeleteMode) ? onSelectRow?.(record.id) : onScheduleClick?.(record)}
                    className="hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    {(exportMode || batchEditMode || batchDeleteMode) && (
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Checkbox
                          checked={selectedRows.includes(record.id)}
                          onCheckedChange={() => onSelectRow?.(record.id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.date}</div>
                      <div className="text-xs text-gray-500">{getWeekday(record.date)}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.staffName}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white
                        ${getShiftColor(record.shift, shiftConfigs)}
                      `}>
                        {record.shift}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.workZone}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shiftConfig?.startTime} - {shiftConfig?.endTime}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium
                        ${record.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                        ${record.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                        ${record.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.checkIn || '-'} / {record.checkOut || '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
  );
}

export default ScheduleTable;
