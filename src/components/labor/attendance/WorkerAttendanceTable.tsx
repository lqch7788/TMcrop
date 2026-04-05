/**
 * 工人考勤 - 考勤记录表格组件
 */
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceRecord, PAGE_SIZE_OPTIONS } from './types';

interface WorkerAttendanceTableProps {
  data: AttendanceRecord[];
  exportMode: boolean;
  selectedRows: number[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onShowExportModal: () => void;
}

export function WorkerAttendanceTable({
  data,
  exportMode,
  selectedRows,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onSelectAll,
  onSelectRow,
  onPageChange,
  onPageSizeChange,
  onShowExportModal,
}: WorkerAttendanceTableProps) {
  const allSelected = data.length > 0 && selectedRows.length === totalCount;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* 导出模式下的选择列 */}
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">上班时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">下班时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作时长</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">考勤状态</th>
              {!exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((att) => (
              <tr key={att.id} className="hover:bg-gray-50">
                {/* 导出模式下的选择列 */}
                {exportMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(att.id)}
                      onChange={() => onSelectRow(att.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600">{att.workerId}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.dept}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.checkIn}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.checkOut}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{att.hours} 小时</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      att.statusClass === 'normal'
                        ? 'bg-green-100 text-green-700'
                        : att.statusClass === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {att.status}
                  </span>
                </td>
                {!exportMode && (
                  <td className="px-4 py-3">
                    <button
                      className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                      title="查看"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 导出模式下的选择栏 */}
        {exportMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {allSelected ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          {/* 每页条数 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>

          {/* 页码导航 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {totalCount} 条</span>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
