import { Eye, Calculator, Download, ChevronLeft, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
import type { SalaryTableProps } from './types';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';

/**
 * 工资状态徽章
 */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    '待确认': { bg: 'bg-amber-100', text: 'text-amber-700' },
    '已确认': { bg: 'bg-blue-100', text: 'text-blue-700' },
    '已发放': { bg: 'bg-green-100', text: 'text-green-700' },
  };
  const { bg, text } = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {status}
    </span>
  );
}

/**
 * 工资表格组件
 */
export function SalaryTable({
  data,
  pagination,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onCalculate,
  onExport,
  onSelectAll,
  onSelectRow,
  onShowExportModal,
  onAddClick,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchEditConfirm,
  onConfirmDelete,
  onCancelBatch,
  onExportClick,
}: SalaryTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const allSelected = data.length > 0 && selectedRows.length === total;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">工资记录</h3>
        <div className="flex gap-2">
          {(batchEditMode || batchDeleteMode || exportMode) ? (
            <>
              {batchEditMode && (
                <>
                  <Button
                    size="sm"
                    variant="blue"
                    onClick={onBatchEditConfirm}
                    disabled={selectedRows.length === 0}
                  >
                    <Edit className="w-4 h-4" />
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
                    onClick={onConfirmDelete}
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
                    onClick={onShowExportModal}
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
                  <Edit className="w-4 h-4" />
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
              {onExportClick && (
                <Button
                  size="sm"
                  onClick={onExportClick}
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
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">计算方式</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">加班费</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">奖金</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">扣款合计</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">实发工资</TableHead>
              <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</TableHead>
              {!showCheckbox && (
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow key={record.id} className="hover:bg-blue-100 transition-colors">
                  {showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={() => onSelectRow?.(record.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffName}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.month}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.calcType}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.baseSalary.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.overtimePay.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    ¥{record.bonuses.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    -¥{(record.deductions + record.lateDeductions + record.absenceDeductions + record.socialSecurity + record.housingFund + record.personalTax).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-emerald-600 text-right">
                    ¥{record.netSalary.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                    <StatusBadge status={record.status} />
                  </TableCell>
                  {!showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetail(record)}
                          title="查看工资条"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(record.calcType === '日薪制' || record.calcType === '时薪制') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onCalculate?.(record)}
                            title="工资计算"
                          >
                            <Calculator className="w-4 h-4" />
                          </Button>
                        )}
                        {record.status === '已发放' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onExport?.(record)}
                            title="导出工资条"
                          >
                            <Download className="w-4 h-4" />
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
}
