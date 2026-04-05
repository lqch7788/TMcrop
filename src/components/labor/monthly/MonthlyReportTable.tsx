/**
 * 月报表格组件
 */

import { Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthlyReport } from './types';

interface MonthlyReportTableProps {
  reports: MonthlyReport[];
  paginatedReports: MonthlyReport[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  exportMode: boolean;
  selectedRows: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onExportClick: () => void;
  onCancelExport: () => void;
  onShowExportModal: () => void;
}

export function MonthlyReportTable({
  reports,
  paginatedReports,
  currentPage,
  totalPages,
  pageSize,
  exportMode,
  selectedRows,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onSelectRow,
  onExportClick,
  onCancelExport,
  onShowExportModal,
}: MonthlyReportTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">月度工作报告</h3>
        {exportMode ? (
          <div className="flex gap-2">
            <button
              onClick={onShowExportModal}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              确认导出
            </button>
            <button
              onClick={onCancelExport}
              className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={onExportClick}
            className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        )}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === reports.length && reports.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">报表编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总工日数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总工时</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">平均人数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">完成任务</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">待办任务</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">总产量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">质量率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">人工成本</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料成本</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">考勤率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              {!exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                {exportMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(report.id)}
                      onChange={() => onSelectRow(report.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.month}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.dept}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.totalWorkdays}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.totalWorkhours}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.avgDailyWorkers}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.completedTasks}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.pendingTasks}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.totalHarvest}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.qualityRate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.laborCost}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.materialCost}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{report.attendanceRate}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      report.statusClass === 'normal'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                {!exportMode && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 导出模式下的选中信息 */}
        {exportMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button onClick={onSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {selectedRows.length === reports.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {reports.length} 条</span>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">
              {currentPage} / {totalPages || 1}
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
