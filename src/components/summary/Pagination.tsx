/**
 * 分页组件
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">每页</span>
        <select
          value={10}
          onChange={(e) => onPageChange(1)}
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
        <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-emerald-600">{currentPage} / {totalPages}</span>
        <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
