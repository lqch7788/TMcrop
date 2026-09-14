import React, { useState, useMemo } from 'react';
import { Clock, Download, Edit2, LogIn, Plus, RefreshCw, Search, Settings, Trash2, X } from 'lucide-react';
import type { ScheduleRecord, ShiftConfig } from './types';
import { normalizeRecord } from './types';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { useTeamStore } from '@/stores';

interface ScheduleTableProps {
  scheduleList: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
  currentPage: number;
  pageSize: number;
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
  // 2026-09-14：导出模式取消回调（之前漏了导致按钮无效）
  onCancelBatchExport?: () => void;
  // 权限控制props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  // 2026-09-14：行尾操作列回调
  onCheckInClick?: (record: ScheduleRecord) => void;
  onCancelRowClick?: (record: ScheduleRecord) => void;
  onSwapRowClick?: (record: ScheduleRecord) => void;
  // 2026-09-14：班次设置回调（顶部右侧按钮调用）
  onShiftConfigClick?: () => void;
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
  onCancelBatchExport,
  onCheckInClick,
  onCancelRowClick,
  onSwapRowClick,
  onShiftConfigClick,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: ScheduleTableProps) {
  // 规范化数据（兼容snake_case和camelCase）
  const normalizedList = useMemo(() => scheduleList.map(normalizeRecord), [scheduleList]);

  // 班组 ID → 名称 映射（2026-09-13 加）：后端写入了 teamId 但 teamName 是 null
  const teams = useTeamStore((s) => s.teams);
  const teamNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teams) m[t.id] = t.teamName;
    return m;
  }, [teams]);

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // 修复 2026-09-13：原默认本周一~周日，新建非本周日期的排班在表格视图看不到。
  // 改为本月1日~本月最后一日，容纳任意日期新建的排班。
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start: formatDate(monthStart),
      end: formatDate(monthEnd),
    };
  });

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return normalizedList.filter(record => {
      // 搜索
      const matchSearch =
        record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.workZone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date.includes(searchTerm) ||
        ((record.teamName || (record.teamId ? teamNameMap[record.teamId] : '') || '')
          .toLowerCase().includes(searchTerm.toLowerCase()));

      // 班次筛选
      const matchShift = shiftFilter === 'all' || record.shift === shiftFilter;

      // 状态筛选
      const matchStatus = statusFilter === 'all' || record.status === statusFilter;

      // 日期范围
      const matchDate = record.date >= dateRange.start && record.date <= dateRange.end;

      return matchSearch && matchShift && matchStatus && matchDate;
    });
  }, [normalizedList, searchTerm, shiftFilter, statusFilter, dateRange]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

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
                    <Edit2 className="w-4 h-4" />
                    批量编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatchEdit}
                  >
                    <X className="w-4 h-4" /> 取消
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
                    <X className="w-4 h-4" /> 取消
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
                    onClick={onCancelBatchExport}
                  >
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {canCreate && onAddClick && (
                <Button size="sm" onClick={onAddClick}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && onBatchEditClick && (
                <Button size="sm" variant="blue" onClick={onBatchEditClick}>
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && onBatchDeleteClick && (
                <Button size="sm" variant="destructive" onClick={onBatchDeleteClick}>
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && onExport && (
                <Button
                  size="sm"
                  onClick={onExport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
              {/* 2026-09-14：班次设置移到导出后面 */}
              {onShiftConfigClick && (
                <Button size="sm" onClick={onShiftConfigClick}>
                  <Settings className="w-4 h-4" />
                  班次设置
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 工具栏 + 筛选器（2026-09-14 重构：搜索 + 日期范围同行，搜索在前） */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 搜索框（2026-09-14 移到日期范围前） */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索员工、区域、日期..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                onPageChange?.(1);
              }}
              className="pl-9 pr-4 w-[220px]"
            />
          </div>

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">日期:</span>
            <DatePicker
              selected={dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined}
              onChange={(date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setDateRange(prev => ({ ...prev, start: `${year}-${month}-${day}` }));
                onPageChange?.(1);
              }}
              className="w-[140px]"
            />
            <span className="text-gray-400">至</span>
            <DatePicker
              selected={dateRange.end ? new Date(dateRange.end + 'T00:00:00') : undefined}
              onChange={(date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setDateRange(prev => ({ ...prev, end: `${year}-${month}-${day}` }));
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
                班组
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
              {/* 2026-09-14：操作列（签到/取消/调班 行尾图标按钮） */}
              {!exportMode && !batchEditMode && !batchDeleteMode && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-32">
                  操作
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 10 : 9} className="px-4 py-8 text-center text-gray-400">
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
                      <div className="text-sm text-gray-700">
                        {record.teamName
                          || (record.teamId ? teamNameMap[record.teamId] : null)
                          || '-'}
                      </div>
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
                    {/* 2026-09-14：行尾操作列 */}
                    {!exportMode && !batchEditMode && !batchDeleteMode && (
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* 签到/签退：仅已排班/已执行显示 */}
                          {(record.status === '已排班' || record.status === '已执行') && onCheckInClick && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onCheckInClick(record); }}
                              title={record.status === '已执行' ? '修改签到/签退' : '签到 / 签退'}
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                          )}
                          {/* 调班申请：所有状态可发起 */}
                          {onSwapRowClick && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onSwapRowClick(record); }}
                              title="调班申请"
                              className="p-1.5 rounded hover:bg-purple-100 text-purple-600 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {/* 取消排班：仅已排班显示（已执行/已取消不显示） */}
                          {record.status === '已排班' && onCancelRowClick && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onCancelRowClick(record); }}
                              title="取消排班"
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
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

      {/* 2026-09-14：班次图例（表格下方紧凑条） */}
      <div className="px-4 pb-4 flex items-center gap-4 text-xs text-gray-600 flex-wrap">
        <span className="font-medium">班次图例：</span>
        {shiftConfigs.map(config => (
          <span key={config.name} className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded ${config.color}`} />
            <span>{config.name}</span>
            <span className="text-gray-400">({config.startTime}-{config.endTime})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default ScheduleTable;
