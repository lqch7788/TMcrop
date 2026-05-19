/**
 * 分页组件
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE_OPTIONS } from '../constants_taskDispatch';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      {/* 每页条数选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">每页</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1); // 重置到第一页
          }}
          className="px-2 py-1 border border-gray-200 rounded text-sm"
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">条</span>
      </div>

      {/* 页码导航 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">共 {total} 条</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm">
          {currentPage} / {totalPages}
        </span>
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
