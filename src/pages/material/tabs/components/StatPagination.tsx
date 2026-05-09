// StatPagination 组件 - 分页组件
// 物料统计表格的分页控制
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatPaginationProps {
  /** 当前页码 */
  currentPage: number;
  /** 每页条数 */
  pageSize: number;
  /** 总数据条数 */
  totalCount: number;
  /** 设置当前页码 */
  onPageChange: (page: number) => void;
  /** 设置每页条数 */
  onPageSizeChange: (size: number) => void;
}

export function StatPagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: StatPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">每页</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="px-2 py-1 border border-gray-200 rounded text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span className="text-sm text-gray-500">条</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">共 {totalCount} 条</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
