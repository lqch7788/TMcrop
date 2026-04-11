import { Eye, Edit, Trash2, Plus, Pencil, Download } from 'lucide-react';
import type { Position } from './PositionManagementPage';

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
                  <button
                    onClick={onBatchEditClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pencil className="w-4 h-4" />
                    批量编辑
                  </button>
                  <button
                    onClick={onCancelBatchEdit}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button
                    onClick={onBatchDeleteClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </button>
                  <button
                    onClick={onCancelBatchDelete}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {exportMode && (
                <>
                  <button
                    onClick={onBatchExportClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button
                    onClick={onCancelExport}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {onBatchEditClick && (
                <button
                  onClick={onBatchEditClick}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Pencil className="w-4 h-4" />
                  编辑
                </button>
              )}
              {onBatchDeleteClick && (
                <button
                  onClick={onBatchDeleteClick}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {onBatchExportClick && (
                <button
                  onClick={onBatchExportClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
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
                        <button
                          onClick={() => onViewPosition(pos)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEditPosition && (
                        <button
                          onClick={() => onEditPosition(pos)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onDeletePosition && (
                        <button
                          onClick={() => onDeletePosition(pos)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <button
              onClick={onSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {allSelected ? '全不选' : '全选'}
            </button>
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
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

export default PositionTable;