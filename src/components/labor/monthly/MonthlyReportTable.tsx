/**
 * 月报表格组件 - 支持批量操作
 */

import { Eye, Download, ChevronLeft, ChevronRight, Edit2, Trash2, Plus, CheckSquare, Square, X } from 'lucide-react';
import { MonthlyReport } from './types';
import { Button } from '@/components/ui/button';

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
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancelBatch}
            >
              <X className="w-4 h-4" />
              取消
            </Button>
            {batchEditMode && (
              <Button
                variant="blue"
                size="sm"
                onClick={onBatchEditClick}
                disabled={selectedRows.length === 0}
              >
                批量编辑
              </Button>
            )}
            {batchDeleteMode && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onBatchDeleteClick}
                disabled={selectedRows.length === 0}
              >
                批量删除
              </Button>
            )}
            {exportMode && (
              <Button
                size="sm"
                onClick={onBatchExportClick}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            {onAddClick && (
              <Button size="sm" onClick={onAddClick}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
            )}
            {onBatchEditClick && (
              <Button variant="blue" size="sm" onClick={onBatchEditClick}>
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
            )}
            {onBatchDeleteClick && (
              <Button variant="destructive" size="sm" onClick={onBatchDeleteClick}>
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )}
            <Button size="sm" onClick={onExportClick}>
              <Download className="w-4 h-4" />
              导出
            </Button>
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
                  <Button variant="ghost" size="icon" onClick={onSelectAll} className="text-white hover:text-blue-200">
                    {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </Button>
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
                    <Button variant="ghost" size="icon" onClick={() => onSelectRow(report.id.toString())} className="text-gray-500 hover:text-emerald-600">
                      {selectedRows.includes(report.id.toString()) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetail(report)}
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(report)}
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(report)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                {selectedRows.length === reports.length ? '全不选' : '全选'}
              </Button>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              &lt;
            </Button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
