/**
 * 问题分派表格组件
 */

import React from 'react';
import { Send, Download, Trash2 } from 'lucide-react';
import { SourceCell } from './SourceCell';
import { Button } from '@/components/ui/button';

interface ProblemEntry {
  id: number;
  problemCode: string;
  sourceModule?: string;
  sourceTaskId?: string;
  issueText: string;
  issueSeverity: '轻微' | '中等' | '严重';
  status: '待处理' | '处理中' | '待验收' | '已处理';
  handler?: string;
  handlerName?: string; // 兼容别名
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
  onBatchDispatch?: () => void;
  onBatchDelete?: () => void;
  onExport?: () => void;
  onCancelBatchDelete?: () => void;
  onCancelBatchDispatch?: () => void;
  onCancelExport?: () => void;
  onShowExportModal?: () => void;
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
  onBatchDispatch,
  onBatchDelete,
  onExport,
  onCancelBatchDelete,
  onCancelBatchDispatch,
  onCancelExport,
  onShowExportModal,
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

  // 状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '已处理':
        return 'bg-green-100 text-green-700';
      case '处理中':
        return 'bg-amber-100 text-amber-700';
      case '待验收':
        return 'bg-purple-100 text-purple-700';
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
      {/* 表头工具栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
        {exportMode ? (
          <>
            <Button
              size="sm"
              onClick={onShowExportModal}
            >
              <Download className="w-4 h-4" />
              确认导出
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelExport}
            >
              取消
            </Button>
          </>
        ) : batchDeleteMode ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={onBatchDelete}
              disabled={selectedRows.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelBatchDelete}
            >
              取消
            </Button>
          </>
        ) : batchDispatchMode ? (
          <>
            <Button
              size="sm"
              variant="warning"
              onClick={onBatchDispatch}
              disabled={selectedProblems.length === 0}
            >
              <Send className="w-4 h-4" />
              确认分派
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancelBatchDispatch}
            >
              取消
            </Button>
          </>
        ) : null}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                {showCheckbox && problems.length > 0 && (
                  <input
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
          <tbody className="divide-y divide-gray-100">
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
                      problem.status === '待处理' && !problem.sourceTaskId ? (
                        <input
                          type="checkbox"
                          checked={selectedProblems.includes(problem.id)}
                          onChange={() => onToggleSelect(problem.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      ) : null
                    ) : (batchDeleteMode || exportMode) ? (
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(problem.id)}
                        onChange={() => onToggleSelect(problem.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    ) : null}
                  </td>

                  {/* 编号 */}
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <button
                      onClick={() => onViewDetail(problem)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                      title="点击查看详情"
                    >
                      {problem.problemCode}
                    </button>
                  </td>

                  {/* 来源 */}
                  <td className="px-4 py-3">
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
                      {problem.status}
                    </span>
                  </td>

                  {/* 处理人 */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {problem.handler || problem.handlerName || '-'}
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-3">
                    {problem.status === '待处理' && !problem.sourceTaskId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSingleDispatch?.(problem)}
                      >
                        分派
                      </Button>
                    )}
                    {problem.status === '处理中' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(problem)}
                      >
                        详情
                      </Button>
                    )}
                    {problem.status === '待验收' && (
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
