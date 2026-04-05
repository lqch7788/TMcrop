import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ScheduleRecord, ShiftConfig } from './types';

interface ScheduleTableProps {
  scheduleList: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
  onScheduleClick?: (record: ScheduleRecord) => void;
  onExport?: () => void;
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

  // 星期几
  const getWeekday = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 工具栏 */}
      <div className="p-4 border-b space-y-3">
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
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                员工
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                班次
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工作区域
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                签到/签退
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedData.map(record => {
                const shiftConfig = shiftConfigs.find(c => c.name === record.shift);
                return (
                  <tr
                    key={record.id}
                    onClick={() => onScheduleClick?.(record)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{record.date}</div>
                      <div className="text-xs text-gray-500">{getWeekday(record.date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{record.staffName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white
                        ${getShiftColor(record.shift, shiftConfigs)}
                      `}>
                        {record.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.workZone}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {shiftConfig?.startTime} - {shiftConfig?.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded text-xs font-medium
                        ${record.status === '已排班' ? 'bg-blue-100 text-blue-700' : ''}
                        ${record.status === '已执行' ? 'bg-green-100 text-green-700' : ''}
                        ${record.status === '已取消' ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
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
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            第 {currentPage} / {totalPages} 页，共 {filteredData.length} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`
                    w-8 h-8 rounded-lg text-sm font-medium
                    ${currentPage === pageNum ? 'bg-blue-500 text-white' : 'border hover:bg-gray-50'}
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleTable;
