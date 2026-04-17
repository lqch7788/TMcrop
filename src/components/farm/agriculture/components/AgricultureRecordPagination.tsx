/**
 * 农事操作记录分页组件
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AgricultureRecordPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function AgricultureRecordPagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: AgricultureRecordPaginationProps) {
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
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
