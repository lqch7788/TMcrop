/**
 * 任务表格表头组件
 */

import React from 'react';
import { Input } from '../../../ui/input';
import { TableRow, TableHead } from '../../../ui/table';

interface TaskTableHeaderProps {
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onSelectAll?: () => void;
}

export function TaskTableHeader({
  exportMode,
  batchEditMode,
  batchDeleteMode,
  isAllSelected,
  isSomeSelected,
  onSelectAll,
}: TaskTableHeaderProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;

  return (
    <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-500 hover:to-blue-600">
      {showCheckbox && (
        <TableHead className="px-4 py-3 text-center text-white">
          <Input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected && !isAllSelected;
            }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        </TableHead>
      )}
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">任务ID</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">任务类型</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">任务区域</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">作物</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">批次</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">执行人</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">进度</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">优先级</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">状态</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">操作</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">备注</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">作业标准</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">计划开始</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">计划结束</TableHead>
      <TableHead className="px-4 py-3 text-center text-white whitespace-nowrap font-semibold">任务工时</TableHead>
    </TableRow>
  );
}
