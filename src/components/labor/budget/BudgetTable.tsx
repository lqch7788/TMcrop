import React, { useState } from 'react';
import { Eye, Edit2, Trash2, Download, Plus } from 'lucide-react';
import type { MonthlyBudget } from './types';
import { Button } from '@/components/ui/button';

interface BudgetTableProps {
  data: MonthlyBudget[];
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onViewDetail?: (record: MonthlyBudget) => void;
  onEdit?: (record: MonthlyBudget) => void;
  onDelete?: (record: MonthlyBudget) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onAddClick?: () => void;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  data,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onViewDetail,
  onEdit,
  onDelete,
  onSelectAll,
  onSelectRow,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onAddClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = selectedRows.length === data.length && data.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">月度预算明细</h3>
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
                    onClick={onCancelBatch}
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
                    onClick={onCancelBatch}
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
                    onClick={onCancelBatch}
                  >
                    取消
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <Button
                  size="sm"
                  onClick={onAddClick}
                >
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {onBatchEditClick && (
                <Button
                  size="sm"
                  variant="blue"
                  onClick={onBatchEditClick}
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {onBatchDeleteClick && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBatchDeleteClick}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {onBatchExportClick && (
                <Button
                  size="sm"
                  onClick={onBatchExportClick}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">总成本(万元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">正式工(万元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">临时工(万元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">社保(万元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">福利(万元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">人数</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">采收量(万斤)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">单位成本</th>
              {!showCheckbox && (
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 11 : 10} className="px-4 py-8 text-center text-gray-500">
                  暂无月度预算数据
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => (
                <tr key={record.month} className="hover:bg-blue-100 transition-colors">
                  {showCheckbox && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(record.month)}
                        onChange={() => onSelectRow?.(record.month)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{record.month}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600 whitespace-nowrap">
                    {(record.laborCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.formalWorkerCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.tempWorkerCost / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.socialSecurity / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.benefits / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{record.headcount}</td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.yieldPrediction / 10000).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">¥{record.costPerUnit.toFixed(2)}</td>
                  {!showCheckbox && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {onViewDetail && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewDetail(record)}
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(record)}
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(record)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 选择栏 */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
            >
              {allSelected ? '全不选' : '全选'}
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
            onChange={(e) => setCurrentPage(1)}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={12}>12条</option>
            <option value={6}>6条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {data.length} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            &lt;
          </Button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BudgetTable;