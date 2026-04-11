/**
 * 月报表格组件 - 支持批量操作
 */

import { Eye, Download, ChevronLeft, ChevronRight, Edit2, Trash2, Plus, CheckSquare, Square, X } from 'lucide-react';
import { MonthlyReport } from './types';

interface MonthlyReportTableProps {
  reports: MonthlyReport[];
  paginatedReports: MonthlyReport[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  selectedRows: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: string) => void;
  onExportClick: () => void;
  onCancelExport: () => void;
  onShowExportModal: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onAddClick?: () => void;
  onEdit?: (report: MonthlyReport) => void;
  onDelete?: (report: MonthlyReport) => void;
  onViewDetail?: (report: MonthlyReport) => void;
}

export function MonthlyReportTable({
  reports,
  paginatedReports,
  currentPage,
  totalPages,
  pageSize,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  selectedRows,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onSelectRow,
  onExportClick,
  onCancelExport,
  onShowExportModal,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onAddClick,
  onEdit,
  onDelete,
  onViewDetail,
}: MonthlyReportTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const isAllSelected = selectedRows.length === paginatedReports.length && paginatedReports.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">月度工作报告</h3>
        {/* 批量操作按钮 */}
        {showCheckbox ? (
          <div className="flex gap-2">
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
                批量编辑
              </button>
            )}
            {batchDeleteMode && (
              <button
                onClick={onBatchDeleteClick}
                disabled={selectedRows.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
          </div>
        ) : (
          <div className="flex gap-2">
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
            <button
              onClick={onExportClick}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        )}
      </div>

      {/* 表格内容 */}
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
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">报表编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总工日数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总工时</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">平均人数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">完成任务</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">待办任务</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总产量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">质量率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">人工成本</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料成本</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">考勤率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              {!showCheckbox && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedReports.map((report) => (
              <tr key={report.id} className={`hover:bg-gray-50 ${selectedRows.includes(report.id.toString()) ? 'bg-emerald-50' : ''}`}>
                {showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => onSelectRow(report.id.toString())} className="text-gray-500 hover:text-emerald-600">
                      {selectedRows.includes(report.id.toString()) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.code}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.month}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.dept}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.totalWorkdays}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.totalWorkhours}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.avgDailyWorkers}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.completedTasks}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.pendingTasks}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.totalHarvest}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.qualityRate}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.laborCost}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.materialCost}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.attendanceRate}</td>
                <td className="px-4 py-3 whitespace-nowrap">
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
                {!showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {onViewDetail && (
                        <button
                          onClick={() => onViewDetail(report)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(report)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(report)}
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
            ))}
          </tbody>
        </table>

        {/* 导出模式下的选中信息 */}
        {showCheckbox && (
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
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {reports.length} 条</span>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
