import React from 'react';
import { Download, Edit2, Eye, Plus, Trash2, X } from 'lucide-react';
import type { MonthlyBudget } from './types';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface BudgetTableProps {
  data: MonthlyBudget[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
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
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
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
                    onClick={onCancelBatch}
                  >
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
              {exportMode && (
                <>
                  <Button
                    size="sm"
                    variant="default"
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
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <Button
                  size="sm"
                  variant="default"
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
                  variant="default"
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
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">总成本(万元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">正式工(万元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">临时工(万元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">社保(万元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">福利(万元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">人数</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">采收量(万斤)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">单位成本</TableHead>
              {!showCheckbox && (
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 11 : 10} className="px-4 py-8 text-center text-gray-500">
                  暂无月度预算数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((record) => (
                <TableRow key={record.month} className="hover:bg-blue-100 transition-colors">
                  {showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Checkbox
                        checked={selectedRows.includes(record.month)}
                        onCheckedChange={() => onSelectRow?.(record.month)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{record.month}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right font-medium text-emerald-600 whitespace-nowrap">
                    {(record.laborCost / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.formalWorkerCost / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.tempWorkerCost / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.socialSecurity / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.benefits / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">{record.headcount}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {(record.yieldPrediction / 10000).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">¥{record.costPerUnit.toFixed(2)}</TableCell>
                  {!showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
};

export default BudgetTable;