/**
 * 任务分页组件
 */

interface TaskPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * 任务分页组件
 */
export function TaskPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TaskPaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value={10}>10条</option>
          <option value={20}>20条</option>
          <option value={50}>50条</option>
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>共 {totalCount} 条</span>
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
  );
}

export default TaskPagination;
