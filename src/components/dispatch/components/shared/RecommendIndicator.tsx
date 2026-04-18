/**
 * 推荐指数指示器组件
 * 显示推荐评分（0-100）
 */

import React from 'react';

export interface RecommendIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 评分样式配置
 */
const getScoreStyle = (score: number): { bg: string; text: string; label: string } => {
  if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', label: '推荐' };
  if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', label: '良好' };
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', label: '一般' };
  return { bg: 'bg-gray-100', text: 'text-gray-700', label: '较低' };
};

/**
 * 推荐指数指示器组件
 */
export const RecommendIndicator: React.FC<RecommendIndicatorProps> = ({
  score,
  showLabel = false,
  size = 'md',
}) => {
  const style = getScoreStyle(score);

  // 尺寸配置
  const sizeConfig = {
    sm: { dot: 'w-2 h-2', text: 'text-xs', padding: 'px-1.5 py-0.5' },
    md: { dot: 'w-3 h-3', text: 'text-sm', padding: 'px-2 py-1' },
    lg: { dot: 'w-4 h-4', text: 'text-base', padding: 'px-3 py-1.5' },
  };

  const sizeStyle = sizeConfig[size];

  return (
    <div className="flex items-center gap-1.5">
      {/* 评分圆点 */}
      <div className={`${sizeStyle.dot} rounded-full ${style.bg}`} />

      {/* 评分数字 */}
      <span className={`font-bold ${style.text} ${sizeStyle.text}`}>{score}</span>

      {/* 评分标签 */}
      {showLabel && (
        <span className={`${sizeStyle.padding} rounded text-xs ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      )}
    </div>
  );
};

/**
 * 推荐指数进度条组件
 */
export interface RecommendProgressProps {
  score: number;
  showValue?: boolean;
}

export const RecommendProgress: React.FC<RecommendProgressProps> = ({
  score,
  showValue = true,
}) => {
  const style = getScoreStyle(score);

  return (
    <div className="flex items-center gap-2">
      {/* 进度条背景 */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* 进度条填充 */}
        <div
          className={`h-full rounded-full transition-all ${style.bg.replace('bg-', 'bg-')}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* 评分值 */}
      {showValue && (
        <span className={`text-sm font-bold ${style.text}`}>{score}</span>
      )}
    </div>
  );
};

/**
 * 推荐指数标签组件（用于表格列显示）
 */
export interface RecommendBadgeProps {
  score: number;
}

export const RecommendBadge: React.FC<RecommendBadgeProps> = ({ score }) => {
  const style = getScoreStyle(score);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${style.bg} ${style.text}`}
    >
      {score >= 80 ? '⭐' : score >= 60 ? '👍' : score >= 40 ? '👌' : '👎'} {score}
    </span>
  );
};
