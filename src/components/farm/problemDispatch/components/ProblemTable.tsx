/**
 * 问题分派表格组件
 */

import React from 'react';
import { Button } from '../../../ui/button';
import { SourceCell } from './SourceCell';
import { Input } from '../../../ui/input';

// 状态映射：后端英文 → 前端中文
const STATUS_CN_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'waiting_acceptance': '待验收',
  'completed': '已处理',
};

/** 将后端英文状态转为中文显示 */
const getStatusCN = (status: string): string => STATUS_CN_MAP[status] || status;

interface ProblemEntry {
  id: number;
  problemCode: string;
  sourceModule?: string;
  sourceTaskId?: string;
  issueText: string;
  issueSeverity: '轻微' | '中等' | '严重';
  status: string; // 后端返回英文状态值
  handler?: string;
  handlerName?: string;
  assigneeName?: string; // 分派处理人别名
}

interface ProblemTableProps {
  problems: ProblemEntry[];
  // 选择状态
  selectedRows: number[];
  selectedProblems: number[];
  batchDeleteMode: boolean;
  batchDispatchMode: boolean;
  exportMode: boolean;
  // 状态映射
  pendingProblems: ProblemEntry[];
  // 回调
  onViewDetail: (problem: ProblemEntry) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onBatchSelectAll: () => void;
  // 操作按钮回调
  onSingleDispatch?: (problem: ProblemEntry) => void;
}

export function ProblemTable({
  problems,
  selectedRows,
  selectedProblems,
  batchDeleteMode,
  batchDispatchMode,
  exportMode,
  pendingProblems,
  onViewDetail,
  onToggleSelect,
  onToggleSelectAll,
  onBatchSelectAll,
  onSingleDispatch,
}: ProblemTableProps) {
  const showCheckbox = batchDeleteMode || exportMode || batchDispatchMode;

  // 严重程度样式
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case '严重':
        return 'bg-red-100 text-red-700';
      case '中等':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  // 状态样式（传入中文状态值）
  const getStatusStyle = (status: string) => {
    const cn = getStatusCN(status);
    switch (cn) {
      case '已处理':
        return 'bg-green-100 text-green-700';
      case '处理中':
        return 'bg-amber-100 text-amber-700';
      case '待验收':
        return 'bg-purple-100 text-purple-700';
      case '待处理':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 全选状态
  const isAllSelected = batchDispatchMode
    ? selectedProblems.length === pendingProblems.length && pendingProblems.length > 0
    : selectedRows.length === problems.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                {showCheckbox && problems.length > 0 && (
                  <Input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={batchDispatchMode ? onBatchSelectAll : onToggleSelectAll}
                    className="w-4 h-4 rounded border-white/30 bg-white/20"
                  />
                )}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">来源</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">问题描述</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">严重程度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">处理人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {problems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  暂无问题数据
                </td>
              </tr>
            ) : (
              problems.map(problem => (
                <tr key={problem.id} className="hover:bg-blue-50 transition-colors">
                  {/* 复选框 */}
                  <td className="px-4 py-3">
                    {batchDispatchMode ? (
                      getStatusCN(problem.status) === '待处理' && !problem.sourceTaskId ? (
                        <Input
                          type="checkbox"
                          checked={selectedProblems.includes(problem.id)}
                          onChange={() => onToggleSelect(problem.id)}
                          className="w-4 h-4 rounded border-gray-400"
                        />
                      ) : null
                    ) : (batchDeleteMode || exportMode) ? (
                      <Input
                        type="checkbox"
                        checked={selectedRows.includes(problem.id)}
                        onChange={() => onToggleSelect(problem.id)}
                        className="w-4 h-4 rounded border-gray-400"
                      />
                    ) : null}
                  </td>

                  {/* 编号 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onViewDetail(problem)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      title="点击查看详情"
                    >
                      {problem.problemCode}
                    </Button>
                  </td>

                  {/* 来源 */}
                  <td className="px-4 py-3 text-sm">
                    <SourceCell problem={problem} />
                  </td>

                  {/* 问题描述 */}
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate">
                    {problem.issueText}
                  </td>

                  {/* 严重程度 */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(problem.issueSeverity)}`}>
                      {problem.issueSeverity}
                    </span>
                  </td>

                  {/* 状态 */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(problem.status)}`}>
                      {getStatusCN(problem.status)}
                    </span>
                  </td>

                  {/* 处理人 */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {problem.handler || problem.handlerName || problem.assigneeName || '-'}
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-3">
                    {getStatusCN(problem.status) === '待处理' && !problem.sourceTaskId && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => onSingleDispatch?.(problem)}
                      >
                        分派
                      </Button>
                    )}
                    {getStatusCN(problem.status) === '处理中' && (
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() => onViewDetail(problem)}
                      >
                        详情
                      </Button>
                    )}
                    {getStatusCN(problem.status) === '待验收' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(problem)}
                      >
                        验收
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
