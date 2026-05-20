/**
 * 农事操作记录分页组件
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/select';

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
        <Select
          value={String(pageSize)}
          onValueChange={(val) => { onPageSizeChange(Number(val)); onPageChange(1); }}
        >
          <SelectTrigger className="px-2 py-1 border border-gray-200 rounded text-sm w-auto">
            <SelectValue placeholder="20" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">条</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">共 {totalCount} 条</span>
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          variant="ghost"
          size="icon"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </Button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          variant="ghost"
          size="icon"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
