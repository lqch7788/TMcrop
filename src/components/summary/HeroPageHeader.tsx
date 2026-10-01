/**
 * 汇总看板专用页面标题 — 浅色科技条（2026-10-01 第二版）
 *
 * 设计调整：
 * - 与系统其他汇总页面（BusinessAnalysis / BatchManagement / SummaryIndicators 等）统一风格
 * - 浅色基底 + 顶部细线扫描（emerald→cyan 渐变）+ 极浅色时间胶囊
 * - 顶部细线 scan 仍保留科技感，但不再深色玻璃
 */

import { ReactNode } from 'react';

export interface HeroPageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** 时间胶囊文本（如"本年度 · 2026-01-01 ~ 2026-12-31"） */
  period?: string;
  /** 最后更新时间（如"14:32"） */
  lastUpdated?: string;
  /** 右侧操作按钮（刷新等） */
  actions?: ReactNode;
}

/** 顶部细线扫描（emerald → cyan 渐变） */
function TopScanLine() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden"
    >
      <div
        className="h-full w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #10b981 30%, #06b6d4 50%, #10b981 70%, transparent 100%)',
          animation: 'hero-scan 4s linear infinite',
        }}
      />
    </div>
  );
}

export function HeroPageHeader({
  icon,
  title,
  description,
  period,
  lastUpdated,
  actions,
}: HeroPageHeaderProps) {
  return (
    <div
      className="stagger-in stagger-in-1 relative bg-white rounded-xl border border-slate-200/70 shadow-sm px-6 py-5 overflow-hidden"
    >
      <TopScanLine />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* 左侧：图标 + 标题 + 描述 */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        {/* 右侧：时间胶囊 + 最后更新 + 操作 */}
        <div className="flex items-center gap-3 flex-wrap">
          {period && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-700 flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-glow-pulse" />
              <span>{period}</span>
            </div>
          )}
          {lastUpdated && (
            <div className="text-xs text-slate-400 hidden md:flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span>更新 {lastUpdated}</span>
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

export default HeroPageHeader;