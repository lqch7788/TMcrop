import { Eye, Edit, Trash2, Plus, Pencil, Download } from 'lucide-react';
import type { Position } from './PositionManagementPage';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/Pagination';

interface PositionTableProps {
  positions: Position[];
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
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
  onViewPosition?: (position: Position) => void;
  onEditPosition?: (position: Position) => void;
  onDeletePosition?: (position: Position) => void;
}

export function PositionTable({
  positions,
  currentPage,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
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
  onViewPosition,
  onEditPosition,
  onDeletePosition,
}: PositionTableProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedPositions = positions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = paginatedPositions.length > 0 && paginatedPositions.every(p => selectedRows.includes(p.id.toString()));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">职务列表</h3>
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
                    <Pencil className="w-4 h-4" />
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
                  <Pencil className="w-4 h-4" />
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
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务编号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务名称</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属部门</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务级别</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资(元)</TableHead>
              <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">岗位人数</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职责描述</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
              {!showCheckbox && (
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedPositions.map((pos) => (
              <TableRow key={pos.id} className="hover:bg-blue-100 transition-colors">
                {(exportMode || batchEditMode || batchDeleteMode) && (
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Checkbox
                      checked={selectedRows.includes(pos.id.toString())}
                      onCheckedChange={() => onSelectRow?.(pos.id.toString())}
                    />
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{pos.code}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pos.name}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.dept}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.level}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.salary}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.staffCount}人</TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{pos.description}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {pos.status}
                  </span>
                </TableCell>
                {!showCheckbox && (
                  <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {onViewPosition && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewPosition(pos)}
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEditPosition && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditPosition(pos)}
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDeletePosition && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeletePosition(pos)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {paginatedPositions.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 10 : 9} className="px-4 py-12 text-center text-gray-400">
                  暂无职务记录
                </TableCell>
              </TableRow>
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

export default PositionTable;