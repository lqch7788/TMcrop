/**
 * 任务表格表头组件
 */

import React from 'react';
import { Input } from '../../../ui/input';

interface TaskTableHeaderProps {
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  batchDispatchMode?: boolean;
  batchVerifyMode?: boolean;
  batchReassignMode?: boolean;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onSelectAll?: () => void;
}

export function TaskTableHeader({
  exportMode,
  batchEditMode,
  batchDeleteMode,
  batchDispatchMode,
  batchVerifyMode,
  batchReassignMode,
  isAllSelected,
  isSomeSelected,
  onSelectAll,
}: TaskTableHeaderProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode || batchDispatchMode || batchVerifyMode || batchReassignMode;

  return (
    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
      {showCheckbox && (
        <th className="px-4 py-3 text-center">
          <Input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected && !isAllSelected;
            }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        </th>
      )}
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务ID</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务类型</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务区域</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作物</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">关联生产批次</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">执行人</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">班组</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">进度</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">优先级</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">备注</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作业标准</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">计划开始</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">计划结束</th>
      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务工时</th>
    </tr>
  );
}
