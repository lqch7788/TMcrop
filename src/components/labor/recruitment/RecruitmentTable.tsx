import { CheckCircle, ChevronLeft, ChevronRight, Download, Edit2, Eye, Plus, Trash2, X, XCircle } from 'lucide-react';
import { RecruitmentRequest, RecruitmentStatus } from './types';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';

interface RecruitmentTableProps {
  recruitments: RecruitmentRequest[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (recruitment: RecruitmentRequest) => void;
  onEdit: (recruitment: RecruitmentRequest) => void;
  onDelete: (recruitment: RecruitmentRequest) => void;
  onApprove: (recruitment: RecruitmentRequest) => void;
  onComplete: (recruitment: RecruitmentRequest) => void;
  onCancel: (recruitment: RecruitmentRequest) => void;
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

// 状态标签组件
function StatusBadge({ status }: { status: RecruitmentStatus }) {
  const styles: Record<RecruitmentStatus, { bg: string; text: string; label: string }> = {
    '待审批': { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批' },
    '招聘中': { bg: 'bg-blue-100', text: 'text-blue-700', label: '招聘中' },
    '已完成': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
    '已取消': { bg: 'bg-gray-100', text: 'text-gray-500', label: '已取消' },
  };
  const style = styles[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function RecruitmentTable({
  recruitments,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onComplete,
  onCancel,
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
}: RecruitmentTableProps) {
  const totalPages = Math.ceil(recruitments.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, recruitments.length);
  const paginatedData = recruitments.slice(startIndex, endIndex);
  const allSelected = selectedRows.length === recruitments.length && recruitments.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">招聘记录</h3>
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

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[1200px]">
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">招聘编号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">招聘岗位</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">需求部门</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">人数</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">来源</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">期望到岗</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="px-4 py-12 text-center text-gray-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((rec) => (
                <TableRow key={rec.id} className="hover:bg-emerald-50 transition-colors">
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(rec.id)}
                        onCheckedChange={() => onSelectRow?.(rec.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{rec.requestCode}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{rec.position}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{rec.department}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{rec.quantity}人</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{rec.source}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{rec.expectedDate}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={rec.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                        {rec.applicantName.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{rec.applicantName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{rec.applyDate}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(rec)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {rec.status === '待审批' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onApprove(rec)}
                            title="审批通过"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onCancel(rec)}
                            title="取消"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {rec.status === '招聘中' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onComplete(rec)}
                          title="完成招聘"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {rec.status === '待审批' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(rec)}
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(rec)}
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

export default RecruitmentTable;
