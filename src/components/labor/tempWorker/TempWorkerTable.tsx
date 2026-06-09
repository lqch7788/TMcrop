import { ChevronLeft, ChevronRight, Download, Edit2, Eye, Plus, Trash2, X } from 'lucide-react';
import {
  TempWorkerTableProps,
  TempWorker,
  StaffStatus,
} from './types';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { showConfirm } from '@/lib/dialogService';
import { Pagination } from '@/components/ui';

/**
 * 获取状态对应的样式
 */
function getStatusClass(status: StaffStatus): string {
  switch (status) {
    case '在职':
      return 'bg-emerald-100 text-emerald-700';
    case '离职':
      return 'bg-gray-100 text-gray-600';
    case '停薪留职':
      return 'bg-amber-100 text-amber-700';
    case '试用期':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

interface ExtendedTempWorkerTableProps extends TempWorkerTableProps {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onCancelExport?: () => void;
}

/**
 * 临时工列表表格组件
 */
export function TempWorkerTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  onDelete,
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
}: ExtendedTempWorkerTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = selectedRows.length === data.length && data.length > 0;

  // 处理删除确认
  const handleDelete = async (record: TempWorker) => {
    if (await showConfirm(`确定要删除员工 "${record.name}" 吗？`)) {
      onDelete(record);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">临时工列表</h3>
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
                    onClick={onCancelBatchEdit}
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
                    onClick={onCancelBatchDelete}
                  >
                    <X className="w-4 h-4" /> 取消
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

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll as (checked: boolean) => void}
                    className="border-gray-400"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                工号
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                姓名
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                类型
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                合同类型
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                技能数
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                状态
              </TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                入职日期
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-emerald-50 transition-colors"
                >
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={() => onSelectRow?.(record.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {record.employeeCode}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {record.name}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.workerType}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.contractType}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                      {record.skillTags.length} 项
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.joinDate}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetail(record)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(record)}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(record)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
