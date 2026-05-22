import { Eye, Plus, Edit, Trash2, Download } from 'lucide-react';
import type { WorkLog, WorkLogTableProps } from './types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/Pagination';

/**
 * 工作日志表格组件
 */
export function WorkLogTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
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
  onExportClick,
}: WorkLogTableProps & {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: number[];
  onSelectAll?: () => void;
  onSelectRow?: (id: number) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onExportClick?: () => void;
}) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const allSelected = selectedRows.length === data.length && data.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">工作日志列表</h3>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            {(exportMode || batchEditMode || batchDeleteMode) && (
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll?.()}
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-blue-600"
                />
              </TableHead>
            )}
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">日志编号</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务编号</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务类型</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">工作量</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">进度</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">工作区域</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">工作内容</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">问题描述</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">处理措施</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">提交时间</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-300">
          {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((log) => (
            <TableRow key={log.id} className="hover:bg-blue-100 transition-colors">
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <TableCell className="px-4 py-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.includes(log.id)}
                    onCheckedChange={() => onSelectRow?.(log.id)}
                  />
                </TableCell>
              )}
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{log.code}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.taskCode || '-'}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.taskTypeName || '-'}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.workloadDays || log.workloadHours ? (
                  `${log.workloadDays ? `${log.workloadDays}天` : ''}${log.workloadHours ? `${log.workloadHours}小时` : ''}${log.workers ? `，${log.workers}人` : ''}`
                ) : '-'}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.progress !== undefined ? `${log.progress}%` : '-'}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.crop}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.greenhouse}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[150px] truncate">
                {log.tasks}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate">
                {log.problems}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate">
                {log.solutions}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.submitTime ? new Date(log.submitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetail(log)}
                  title="查看"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
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
