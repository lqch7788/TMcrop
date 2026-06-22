/**
 * 标签履历时间线组件 — 左右交替Z型布局
 * 对标iAGS seedlingManagement.ejs 第1709-1758行 getLabelResumeInfo
 * 奇数条目左侧，偶数条目右侧，64px间距，标记颜色连接线
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Tag, ArrowRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';

// ========== 数据接口 ==========

export interface LabelResumeEntry {
  id: number;
  operationType: 'move_in' | 'move_out' | 'mark';
  fromAreaName?: string;
  toAreaName?: string;
  areaName?: string;
  operationDate: string;
  markName?: string;
  markColor?: string;
  operatorName?: string;
  // 2026-06-22: 现场拍照存证
  imageBase64?: string | null;
}

export interface LabelResumeTimelineProps {
  entries: LabelResumeEntry[];
  currentLabel?: string;
  currentMark?: { name: string; color: string };
  loading?: boolean;
  className?: string;
}

// ========== 操作类型配置 ==========

const OPERATION_CONFIG: Record<string, { label: string; icon: React.ReactNode; bgClass: string; textClass: string }> = {
  move_in:   { label: '移入', icon: <ArrowRight className="w-3 h-3" />, bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  move_out:  { label: '移出', icon: <ArrowLeft className="w-3 h-3" />,  bgClass: 'bg-orange-100',  textClass: 'text-orange-700' },
  mark:      { label: '标记', icon: <Tag className="w-3 h-3" />,         bgClass: 'bg-purple-100',  textClass: 'text-purple-700' },
};

// ========== 组件 ==========

export default function LabelResumeTimeline({
  entries,
  currentLabel,
  currentMark,
  loading = false,
  className,
}: LabelResumeTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <MapPin className="w-8 h-8 mb-2" />
        <p className="text-sm">暂无履历记录</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* 头部：当前标签信息 */}
      {currentLabel && (
        <div className="flex items-center gap-2 mb-6 px-2">
          <span className="text-sm font-bold text-gray-900">{currentLabel}</span>
          {currentMark && (
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
              style={{ backgroundColor: currentMark.color }}
            >
              {currentMark.name}
            </span>
          )}
        </div>
      )}

      {/* 时间线主体 */}
      <div className="relative">
        {/* 中间竖线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" style={{ transform: 'translateX(-0.5px)' }} />

        {entries.map((entry, i) => {
          const isLeft = i % 2 === 0;
          const isLast = i === entries.length - 1;
          const config = OPERATION_CONFIG[entry.operationType] || OPERATION_CONFIG.move_in;
          const lineColor = entry.markColor || '#d1d5db';
          const areaLabel = entry.toAreaName || entry.fromAreaName || entry.areaName || '-';

          return (
            <div key={entry.id} className="relative" style={{ marginBottom: isLast ? '0' : '64px' }}>
              {/* 内容行 */}
              <div className="flex items-start">
                {/* 左侧内容（奇数条目） */}
                <div className="flex-1 pr-8" style={{ minWidth: 0 }}>
                  {isLeft && <ResumeCard entry={entry} areaLabel={areaLabel} config={config} align="right" />}
                </div>

                {/* 中间圆点 */}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: lineColor }}
                  />
                </div>

                {/* 右侧内容（偶数条目） */}
                <div className="flex-1 pl-8" style={{ minWidth: 0 }}>
                  {!isLeft && <ResumeCard entry={entry} areaLabel={areaLabel} config={config} align="left" />}
                </div>
              </div>

              {/* 连接线（非最后一项） */}
              {!isLast && (
                <div
                  className="absolute w-px left-1/2"
                  style={{
                    height: '64px',
                    backgroundColor: lineColor,
                    top: '12px',
                    transform: 'translateX(-0.5px)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 px-2">
        {Object.entries(OPERATION_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={cn('px-1.5 py-0.5 rounded', cfg.bgClass, cfg.textClass)}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== 履历卡片子组件 ==========

function ResumeCard({
  entry,
  areaLabel,
  config,
  align,
}: {
  entry: LabelResumeEntry;
  areaLabel: string;
  config: { label: string; icon: React.ReactNode; bgClass: string; textClass: string };
  align: 'left' | 'right';
}) {
  const isMark = entry.operationType === 'mark';

  return (
    <div
      className={cn(
        'bg-white border rounded-lg p-3 shadow-sm',
        isMark && entry.markColor ? 'border-l-2' : 'border-gray-100',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      style={isMark && entry.markColor ? { borderLeftColor: entry.markColor } : undefined}
    >
      {/* 操作类型标签 */}
      <div className={cn('flex items-center gap-1.5 mb-1', align === 'right' && 'justify-end')}>
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', config.bgClass, config.textClass)}>
          {config.icon}
          {config.label}
        </span>
        {isMark && entry.markName && (
          <span
            className="px-1.5 py-0.5 rounded text-xs text-white font-medium"
            style={{ backgroundColor: entry.markColor || '#9ca3af' }}
          >
            {entry.markName}
          </span>
        )}
      </div>

      {/* 区域名称 */}
      <p className="text-sm text-gray-700">
        <MapPin className="w-3 h-3 inline mr-1 text-gray-400" />
        {areaLabel}
      </p>

      {/* 日期 + 操作员 */}
      <p className="text-xs text-gray-400 mt-1">
        {entry.operationDate}
        {entry.operatorName && <span> · {entry.operatorName}</span>}
      </p>

      {/* 现场照片缩略图（点击放大） */}
      {entry.imageBase64 && (
        <a
          href={entry.imageBase64}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block"
          title="点击查看大图"
        >
          <img
            src={entry.imageBase64}
            alt="现场照片"
            className="w-24 h-24 object-cover rounded border border-gray-200 hover:border-emerald-400 transition-colors cursor-zoom-in"
          />
        </a>
      )}
    </div>
  );
}
