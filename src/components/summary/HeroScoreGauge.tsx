/**
 * 综合经营评分 — 浅色 SVG 仪表盘（2026-10-01 第二版 + P0-2 加 Tooltip）
 *
 * 设计调整：
 * - 不再用深色背景，整体浅色基底
 * - 进度环颜色根据状态切换（emerald / amber / red）
 * - 大字号 + tabular-nums（领导一眼看到）
 * - 入场动画保留（stroke-dasharray 从 0 过渡到目标值）
 * - P0-2：右上加"?"问号 → Tooltip 显示计算口径说明
 */

import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui';

export interface HeroScoreGaugeProps {
  /** 综合得分，0~100 */
  score: number;
  /** 评分状态 */
  status: 'good' | 'warning' | 'critical';
  /** 较上一周期的环比变化（%），可选 */
  changeRate?: number | null;
  /** 副标题，默认"综合经营评分" */
  label?: string;
  /** P0-2：自定义计算口径说明（悬停 ? 时显示），不传则用默认 */
  formulaDescription?: string;
}

const STATUS_LABEL: Record<HeroScoreGaugeProps['status'], string> = {
  good: '运行良好',
  warning: '需要关注',
  critical: '亟需改善',
};

const STATUS_COLOR: Record<HeroScoreGaugeProps['status'], {
  stroke: string;
  text: string;
  bg: string;
  dot: string;
  pulseClass: string;
}> = {
  good: {
    stroke: '#10b981',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
    pulseClass: 'health-dot-green-pulse',
  },
  warning: {
    stroke: '#f59e0b',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    pulseClass: '',
  },
  critical: {
    stroke: '#ef4444',
    text: 'text-red-700',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    pulseClass: 'health-dot-red-pulse',
  },
};

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HeroScoreGauge({
  score,
  status,
  changeRate,
  label = '综合经营评分',
  formulaDescription,
}: HeroScoreGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * safeScore) / 100;
  const colors = STATUS_COLOR[status];

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      {/* SVG 圆环 */}
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90 score-ring">
          {/* 背景环 */}
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            stroke="#e2e8f0"
            strokeWidth="10"
            fill="none"
          />
          {/* 进度环 */}
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            stroke={colors.stroke}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>

        {/* 中心数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-slate-900 tabular-nums leading-none">
            {Math.round(safeScore)}
          </div>
          <div className="text-xs text-slate-400 mt-2 tracking-widest uppercase">/ 100</div>
        </div>
      </div>

      {/* 标签 + 状态 + 口径说明 ? — P0-2 */}
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 tracking-wider">{label}</span>
          <Tooltip
            content={
              <div className="text-left space-y-1">
                <div className="font-medium text-white">综合经营评分口径</div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  {formulaDescription ?? '基于指标库中所有「自动指标」的加权达成率综合得分（0-100），分越高说明经营状况越健康。'}
                </div>
                <div className="text-xs text-slate-300 pt-1 border-t border-slate-600">
                  80+ 良好 · 60~80 关注 · &lt;60 亟需改善
                </div>
              </div>
            }
            position="bottom"
            delay={150}
            multiline
            maxWidth={280}
          >
            <HelpCircle
              className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help"
              aria-label="评分口径说明"
            />
          </Tooltip>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${colors.pulseClass}`} />
          <span className={`text-[11px] font-medium ${colors.text}`}>{STATUS_LABEL[status]}</span>
        </div>
        {changeRate !== undefined && changeRate !== null && (
          <div
            className={`flex items-center gap-1 text-[11px] ${
              changeRate > 0 ? 'text-emerald-600' : changeRate < 0 ? 'text-red-600' : 'text-slate-500'
            }`}
          >
            {changeRate > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : changeRate < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>较上期 {changeRate > 0 ? '+' : ''}{changeRate.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeroScoreGauge;