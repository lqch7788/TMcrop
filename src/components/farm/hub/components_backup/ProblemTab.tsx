/**
 * 农事任务中心 - 问题管理Tab
 * 样式与 TaskDispatchPage 统一
 */

import React from 'react';
import { ProblemEntry } from '../../../hooks/usePersistentProblems';
import { Eye, Edit, Plus } from 'lucide-react';

// 状态配置
const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: '待处理', label: '待分派' },
  { value: '处理中', label: '处理中' },
  { value: '待验收', label: '待验收' },
  { value: '已处理', label: '已处理' },
];

// 严重程度配置
const SEVERITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  '轻微': { bg: 'bg-green-100', text: 'text-green-700', label: '轻微' },
  '中等': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '中等' },
  '严重': { bg: 'bg-red-100', text: 'text-red-700', label: '严重' },
};

interface ProblemTabProps {
  problems: ProblemEntry[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  filters: { status: string; type: string; area: string; search: string };
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
  onDispatchProblem?: (problemId: number) => void;
}

/**
 * 问题管理Tab组件
 */
export function ProblemTab({
  problems,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  filters,
  onFilterChange,
  onResetFilters,
  onDispatchProblem,
}: ProblemTabProps) {
  return (
    <div>
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态:</span>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status.value}
                onClick={() => onFilterChange('status', status.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filters.status === status.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">严重程度:</span>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部程度</option>
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onResetFilters}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
      </div>

      {/* 快捷操作栏 */}
      <div className="mb-4 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-emerald-700">快捷操作:</span>
          <button
            onClick={() => window.location.href = '/problemDispatch?action=create'}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
            手动创建问题
          </button>
          <button
            onClick={() => window.location.href = '/inspection?action=importProblem'}
            className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            从巡查导入
          </button>
        </div>
      </div>

      {/* AI推荐面板 - 当有待分派问题时显示 */}
      {problems.some(p => p.status === '待处理') && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-purple-700 mb-2">AI智能推荐</h4>
              <p className="text-sm text-gray-600 mb-3">
                系统检测到 <span className="font-medium text-purple-600">{problems.filter(p => p.status === '待处理').length}</span> 个待分派问题，AI已自动分析最优执行人匹配方案
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">
                  查看AI推荐
                </button>
                <button className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800">
                  手动选择执行人
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-orange-700">已选择 {selectedIds.length} 项</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600">
              批量分派
            </button>
            <button
              onClick={onClearSelection}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 问题列表 */}
      {problems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>暂无问题</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === problems.length && problems.length > 0}
                    onChange={() => selectedIds.length === problems.length ? onClearSelection() : onSelectAll()}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题编号</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">问题描述</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">来源</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">严重程度</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">处理人</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {problems.map((problem) => {
                const severityConfig = SEVERITY_CONFIG[problem.issueSeverity] || SEVERITY_CONFIG['轻微'];
                const isPendingDispatch = problem.status === '待处理';
                return (
                  <tr key={problem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(problem.id))}
                        onChange={() => onToggleSelect(String(problem.id))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{problem.problemCode}</td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{problem.issueText}</p>
                        {problem.greehouseName && (
                          <p className="text-xs text-gray-400">{problem.greehouseName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {problem.sourceModule === 'inspection' ? '巡查' : '手动'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${severityConfig.bg} ${severityConfig.text}`}>
                        {severityConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        problem.status === '已处理' ? 'bg-green-100 text-green-700' :
                        problem.status === '待验收' ? 'bg-orange-100 text-orange-700' :
                        problem.status === '处理中' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {problem.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{problem.handler || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isPendingDispatch && onDispatchProblem ? (
                          <>
                            <button
                              onClick={() => onDispatchProblem(problem.id as number)}
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                            >
                              分派
                            </button>
                            <button
                              onClick={() => window.location.href = `/problemDispatch?problemId=${problem.id}`}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              编辑
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => window.location.href = `/problemDispatch?problemId=${problem.id}`}
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              {problem.status === '待处理' ? '分派' : '查看'}
                            </button>
                            <button
                              onClick={() => window.location.href = `/problemDispatch?problemId=${problem.id}`}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              编辑
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {problems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">共 {problems.length} 条记录</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              上一页
            </button>
            <span className="px-3 py-1 text-sm">第 1/1 页</span>
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50" disabled>
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProblemTab;
