/**
 * 工人考勤 - 考勤记录表格组件
 */
import { useRef } from 'react';
import { Eye, ChevronLeft, ChevronRight, Edit, Trash2, Download, Plus, Upload } from 'lucide-react';
import { AttendanceRecord, PAGE_SIZE_OPTIONS } from './types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { showAlert } from '@/lib/dialogService';
import { Pagination } from '@/components/ui/Pagination';

interface WorkerAttendanceTableProps {
  data: AttendanceRecord[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  selectedRows: number[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onShowExportModal: () => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onExportClick?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onViewDetail?: (record: AttendanceRecord) => void;
}

export function WorkerAttendanceTable({
  data,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  selectedRows,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onSelectAll,
  onSelectRow,
  onPageChange,
  onPageSizeChange,
  onShowExportModal,
  onAddClick,
  onBatchEditClick,
  onBatchDeleteClick,
  onExportClick,
  onCancelBatchEdit,
  onCancelBatchDelete,
  onViewDetail,
}: WorkerAttendanceTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const allSelected = data.length > 0 && selectedRows.length === totalCount;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            console.log('导入文件:', file.name);
            // 这里可以添加文件处理逻辑
            showAlert(`已选择文件: ${file.name}`);
          }
          // 重置input以允许重复选择同一文件
          e.target.value = '';
        }}
      />
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">考勤记录</h3>
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
                    onClick={onExportClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onExportClick}
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
              <Button
                size="sm"
                onClick={handleImportClick}
              >
                <Upload className="w-4 h-4" />
                导入
              </Button>
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
        <Table className="w-full">
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow>
            {/* 选择列 */}
            {showCheckbox && (
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll()}
                />
              </TableHead>
            )}
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工号</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">日期</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">上班时间</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">下班时间</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作时长</TableHead>
            <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">考勤状态</TableHead>
            {!exportMode && (
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-300">
          {data.map((att) => (
            <TableRow key={att.id} className="hover:bg-blue-100 transition-colors">
              {/* 选择列 */}
              {showCheckbox && (
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <Checkbox
                    checked={selectedRows.includes(att.id)}
                    onCheckedChange={() => onSelectRow(att.id)}
                  />
                </TableCell>
              )}
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.workerId}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.name}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.dept}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.date}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.checkIn}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{att.checkOut}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{Math.round(att.hours)} 小时</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    att.statusClass === 'normal'
                      ? 'bg-green-100 text-green-700'
                      : att.statusClass === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {att.status}
                </span>
              </TableCell>
              {!showCheckbox && (
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="查看详情"
                    onClick={() => onViewDetail?.(att)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
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
