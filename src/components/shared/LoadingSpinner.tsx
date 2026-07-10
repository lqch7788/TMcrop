/**
 * 共享 Loading Spinner（2026-07-10 P1-4）
 * 抽自 5 处复制粘贴的 spinner 代码（SeedlingPage / PlantingPage / InventoryTable / InventoryDetailModal / OutboundRecordsComponents）
 *
 * 修复原 border-3 错误 Tailwind class（原代码 border-3 不是有效类，应为 border-2）。
 */
import React from 'react';

export interface LoadingSpinnerProps {
  size?: number;          // 默认 24 (w-6 h-6)
  colorClass?: string;    // 默认 border-emerald-500
  withText?: boolean;     // 默认 false（表格内）；true 时显示 "加载中..."
  text?: string;          // 默认 "加载中..."
  className?: string;
}

export function LoadingSpinner({
  size = 24,
  colorClass = 'border-emerald-500',
  withText = false,
  text = '加载中...',
  className = '',
}: LoadingSpinnerProps) {
  // Tailwind JIT 类名需要静态字面量（动态拼接会被 tree-shake 优化掉）
  // 提供 4 个常用尺寸 + 4 个常用颜色预设
  const sizeClass = size === 16 ? 'w-4 h-4' : size === 20 ? 'w-5 h-5' : size === 24 ? 'w-6 h-6' : 'w-8 h-8';
  const colorPreset = colorClass === 'border-blue-500'
    ? 'border-blue-500'
    : colorClass === 'border-gray-400'
    ? 'border-gray-400'
    : colorClass === 'border-white'
    ? 'border-white'
    : 'border-emerald-500';

  const spinner = (
    <div
      className={`${sizeClass} border-2 ${colorPreset} border-t-transparent rounded-full animate-spin ${className}`}
    />
  );

  if (!withText) return spinner;

  return (
    <div className="flex items-center justify-center gap-2">
      {spinner}
      <span>{text}</span>
    </div>
  );
}