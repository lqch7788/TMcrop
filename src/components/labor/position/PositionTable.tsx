import { Eye, Edit, Trash2, Plus, Pencil, Download } from 'lucide-react';
import type { Position } from './PositionManagementPage';
import { Button } from '@/components/ui/button';

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
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职务级别</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">基本工资(元)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">岗位人数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">职责描述</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              {!showCheckbox && (
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedPositions.map((pos) => (
              <tr key={pos.id} className="hover:bg-blue-100 transition-colors">
                {(exportMode || batchEditMode || batchDeleteMode) && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(pos.id.toString())}
                      onChange={() => onSelectRow?.(pos.id.toString())}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{pos.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pos.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.dept}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{pos.level}</td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.salary}</td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{pos.staffCount}人</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate whitespace-nowrap">{pos.description}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    pos.statusClass === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {pos.status}
                  </span>
                </td>
                {!showCheckbox && (
                  <td className="px-4 py-3 text-center whitespace-nowrap">
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
                  </td>
                )}
              </tr>
            ))}
            {paginatedPositions.length === 0 && (
              <tr>
                <td colSpan={showCheckbox ? 10 : 9} className="px-4 py-12 text-center text-gray-400">
                  暂无职务记录
                </td>
              </tr>
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
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {total} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </Button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PositionTable;