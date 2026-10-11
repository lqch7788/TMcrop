/**
 * 问题分派表格组件
 */

import React from 'react';
import { CheckCircle, Eye } from 'lucide-react';

import { Button } from '@/components/ui';
import { SourceCell } from './SourceCell';
import { Input } from '@/components/ui';
import { problemStatusToCN } from '@/utils/problemStatus';
import type { ProblemEntry as BaseProblemEntry } from '../../../../hooks/usePersistentProblems';

// 2026-09-21：状态映射表已上移到 src/utils/problemStatus.ts（唯一真相源）。
//   原先本文件与 ProblemTab 各维护一份 STATUS_CN_MAP，内容已有细微出入。
//   保留原函数名做薄封装，避免改动本文件内已有调用点。
const getStatusCN = problemStatusToCN;

/**
 * 问题条目 —— 复用唯一真相源类型（hooks/usePersistentProblems）并补充分派模块字段
 *
 * 2026-10-11：原为本文件私自复制的一份同名字段子集，与 ProblemTab / SourceCell 使用的
 *   ProblemEntry 类型不互通，导致父组件传入的回调签名不匹配（需靠 as any 绕过）。
 *   handlerName / assigneeName 来自 store 字段映射（useProblemStore FIELD_MAP），
 *   上游 usePersistentProblems 尚未声明，故在此扩展而非另起一套。
 */
interface ProblemEntry extends BaseProblemEntry {
  handlerName?: string;
  assigneeName?: string; // 分派处理人别名
}

interface ProblemTableProps {
  problems: ProblemEntry[];
  // 选择状态
  // 2026-10-11：问题 ID 的真实类型是 number | string（useProblemStore.Problem.id），
  //   选中集与回调按真实类型放宽，避免调用方（ProblemTab）为 includes(problem.id) 反复 as any
  selectedRows: Array<number | string>;
  selectedProblems: Array<number | string>;
  batchDeleteMode: boolean;
  batchDispatchMode: boolean;
  exportMode: boolean;
  // 状态映射
  pendingProblems: ProblemEntry[];
  // 回调
  onViewDetail: (problem: ProblemEntry) => void;
  onToggleSelect: (id: number | string) => void;
  onToggleSelectAll: () => void;
  onBatchSelectAll: () => void;
  // 操作按钮回调
  onSingleDispatch?: (problem: ProblemEntry) => void;
  // 2026-10-10（审核修复）：问题验收回调 —— 原「验收」按钮 onClick 是 onViewDetail（只读），
  //   与页面文案"点击验收通过才会自动标记为已处理"矛盾、待验收问题无真实验收入口
  onAcceptance?: (problem: ProblemEntry) => void;
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
  onAcceptance,
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
                      className="text-blue-600 hover:text-blue-800 font-medium h-6"
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
                        className="h-6"
                      >
                        分派
                      </Button>
                    )}
                    {getStatusCN(problem.status) === '处理中' && (
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() => onViewDetail(problem)}
                        className="h-6"
                      >
                        <Eye className="w-4 h-4" /> 详情
                      </Button>
                    )}
                    {getStatusCN(problem.status) === '待验收' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (onAcceptance || onViewDetail)(problem)}
                        className="h-6"
                      >
                        <CheckCircle className="w-4 h-4" /> 验收
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
