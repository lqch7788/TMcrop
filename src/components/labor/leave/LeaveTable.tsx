import { Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Download } from 'lucide-react';
import type { LeaveTableProps } from './types';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';

/**
 * 请假管理表格组件
 */
export function LeaveTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onApprove,
  onReject,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onAddClick,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatchEdit,
  onCancelBatchDelete,
  onCancelExport,
}: LeaveTableProps & {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: (string | number)[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string | number) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onCancelExport?: () => void;
}) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const allSelected = data.length > 0 && selectedRows.length === total;

  // 状态颜色映射
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '待审批':
        return 'bg-amber-100 text-amber-700';
      case '已通过':
        return 'bg-green-100 text-green-700';
      case '已拒绝':
        return 'bg-red-100 text-red-700';
      case '已取消':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">请假记录</h3>
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
                    <Edit className="w-4 h-4" />
                    批量编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatchEdit}
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
                    onClick={onCancelBatchDelete}
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
                    onClick={onCancelExport}
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
        <Table className="w-full">
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            {(exportMode || batchEditMode || batchDeleteMode) && (
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll?.()}
                />
              </TableHead>
            )}
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">请假类型</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始日期</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">结束日期</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">天数</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
            {!showCheckbox && (
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-300">
          {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
            <TableRow key={record.id} className="hover:bg-blue-100 transition-colors">
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <Checkbox
                    checked={selectedRows.includes(record.id)}
                    onCheckedChange={() => onSelectRow?.(record.id)}
                  />
                </TableCell>
              )}
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffName}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.leaveType}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.startDate}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.endDate}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.days}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                  {record.status}
                </span>
              </TableCell>
              {!showCheckbox && (
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(record)}
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {record.status === '待审批' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onApprove(record)}
                          title="批准"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReject(record)}
                          title="驳回"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
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
