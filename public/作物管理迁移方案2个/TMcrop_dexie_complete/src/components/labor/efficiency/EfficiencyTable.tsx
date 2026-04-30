/**
 * 人效分析详细数据表格 - 支持批量操作
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Download, Plus, Edit2, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { EfficiencyMetrics } from './types';

interface EfficiencyTableProps {
  data: EfficiencyMetrics[];
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
            <button
              onClick={onCancelBatch}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          )}
          {/* 新增按钮 - 正常模式显示 */}
          {!showCheckbox && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          )}
          {/* 编辑/批量编辑按钮 - 同一位置 */}
          {batchEditMode ? (
            <button
              onClick={onBatchEditClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
              批量编辑
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchEditClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )
          )}
          {/* 删除/批量删除按钮 - 同一位置 */}
          {batchDeleteMode ? (
            <button
              onClick={onBatchDeleteClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchDeleteClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )
          )}
          {/* 导出按钮 - 同一位置 */}
          {exportMode ? (
            <button
              onClick={onBatchExportClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchExportClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )
          )}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  <button
                    onClick={onSelectAll}
                    className="text-white hover:text-blue-200"
                  >
                    {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总人数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总产出</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">人均产出</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">总工时</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工时效率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务达成率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出勤率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">人工成本率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">技能覆盖率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((row) => (
              <tr key={row.id} className={`hover:bg-blue-50 transition-colors ${selectedRows.includes(row.id) ? 'bg-emerald-50' : ''}`}>
                {showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onSelectRow?.(row.id)}
                      className="text-gray-500 hover:text-emerald-600"
                    >
                      {selectedRows.includes(row.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.date}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.department}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalWorkers}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalOutput.toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.avgOutputPerWorker, 'number')}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalHours}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    row.avgEfficiency >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {formatValue(row.avgEfficiency, 'percent')}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    row.taskCompletionRate >= 0.95 ? 'bg-emerald-100 text-emerald-700' :
                    row.taskCompletionRate >= 0.90 ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {formatValue(row.taskCompletionRate, 'percent')}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.attendanceRate, 'percent')}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.laborCostRate, 'percent')}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatValue(row.skillCoverage, 'percent')}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewDetail?.(row)}
                      className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!batchEditMode && !batchDeleteMode && !exportMode && (
                      <>
                        <button
                          onClick={() => onEdit?.(row)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete?.(row)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
            <span>共 {data.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
};

export default EfficiencyTable;
