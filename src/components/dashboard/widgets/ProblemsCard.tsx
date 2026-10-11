/**
 * 基地总览 - 待处理问题卡片（2026-10-11 新增：填充右列底部空白，与左列底部对齐）
 * 数据：useProblemStore → GET /api/problems（真实问题数据，与农事任务中心"问题管理"同源）
 * 展示未完成问题前 5 条，点击"查看全部"跳农事任务中心
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useProblemStore } from '../../../stores/useProblemStore';

/** 问题状态 → 中文徽章样式（与问题管理页面口径一致） */
const PROBLEM_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '处理中', cls: 'bg-blue-100 text-blue-600' },
  waiting_acceptance: { label: '待验收', cls: 'bg-amber-100 text-amber-600' },
  rejected: { label: '返工中', cls: 'bg-red-100 text-red-600' },
  processing: { label: '处理中', cls: 'bg-blue-100 text-blue-600' },
};

/** 优先级 → 圆点颜色 */
const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-600',
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300',
};

/** 未完成状态集合（其余视为已闭环） */
const OPEN_STATUSES = ['pending', 'in_progress', 'waiting_acceptance', 'rejected', 'processing'];

/** 创建时间 → MM-DD 短格式（容错解析） */
function formatShortDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ProblemsCard() {
  const navigate = useNavigate();
  const problems = useProblemStore((s) => s.problems);
  const fetchProblems = useProblemStore((s) => s.fetchProblems);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // 未完成问题按创建时间倒序取前 5
  const pendingProblems = useMemo(() => {
    return problems
      .filter((p) => OPEN_STATUSES.includes(String(p.status || '')))
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 5);
  }, [problems]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          待处理问题
          {pendingProblems.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              {pendingProblems.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => navigate('/farm-hub')}
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          查看全部 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {pendingProblems.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">
          {problems.length === 0 ? '加载中...' : '暂无待处理问题'}
        </div>
      ) : (
        <div className="space-y-3">
          {pendingProblems.map((p) => {
            const statusCfg = PROBLEM_STATUS_MAP[String(p.status || '')] || { label: String(p.status || '-'), cls: 'bg-gray-100 text-gray-600' };
            return (
              <div key={String(p.id)} className="flex items-start gap-2.5">
                {/* 优先级圆点 */}
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[String(p.priority || '')] || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 font-mono flex-shrink-0">{p.problemCode || '-'}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatShortDate(p.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 truncate" title={p.title || p.issueText || p.description || ''}>
                    {p.title || p.issueText || p.description || '（无描述）'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${statusCfg.cls}`}>{statusCfg.label}</span>
                    {p.greenhouseName && <span className="text-xs text-gray-400 truncate">{p.greenhouseName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
