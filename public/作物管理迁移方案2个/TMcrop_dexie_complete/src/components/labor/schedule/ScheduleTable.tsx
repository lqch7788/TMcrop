import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import type { ScheduleRecord, ShiftConfig } from './types';

interface ScheduleTableProps {
  scheduleList: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
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
}

// 获取班次颜色
function getShiftColor(shift: string, configs: ShiftConfig[]): string {
  const config = configs.find(c => c.name === shift);
  return config?.color || 'bg-gray-500';
}

export function ScheduleTable({
  scheduleList,
  shiftConfigs,
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
                  <button
                    onClick={onBatchEditClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="w-4 h-4" />
                    批量编辑
                  </button>
                  <button
                    onClick={onCancelBatchEdit}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button
                    onClick={onBatchDeleteClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </button>
                  <button
                    onClick={onCancelBatchDelete}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {exportMode && (
                <>
                  <button
                    onClick={onBatchExportClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button
                    onClick={onBatchExportClick}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {onBatchEditClick && (
                <button
                  onClick={onBatchEditClick}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
              {onBatchDeleteClick && (
                <button
                  onClick={onBatchDeleteClick}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
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
              <input
                type="text"
                placeholder="搜索员工、区域、日期..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">日期:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => {
                setDateRange(prev => ({ ...prev, start: e.target.value }));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => {
                setDateRange(prev => ({ ...prev, end: e.target.value }));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 班次筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">班次:</span>
            <select
              value={shiftFilter}
              onChange={e => {
                setShiftFilter(e.target.value);
                setCurrentPage(1);
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
                setCurrentPage(1);
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
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                日期
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                员工
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                班次
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                工作区域
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                签到/签退
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map(record => {
                const shiftConfig = shiftConfigs.find(c => c.name === record.shift);
                return (
                  <tr
                    key={record.id}
                    onClick={() => (exportMode || batchEditMode || batchDeleteMode) ? onSelectRow?.(record.id) : onScheduleClick?.(record)}
                    className={`hover:bg-blue-100 cursor-pointer transition-colors ${(exportMode || batchEditMode || batchDeleteMode) ? '' : ''}`}
                  >
                    {(exportMode || batchEditMode || batchDeleteMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(record.id)}
                          onChange={() => onSelectRow?.(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.date}</div>
                      <div className="text-xs text-gray-500">{getWeekday(record.date)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.staffName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white
                        ${getShiftColor(record.shift, shiftConfigs)}
                      `}>
                        {record.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.workZone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shiftConfig?.startTime} - {shiftConfig?.endTime}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium
                        ${record.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                        ${record.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                        ${record.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.checkIn || '-'} / {record.checkOut || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
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
            <span>共 {filteredData.length} 条</span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleTable;
