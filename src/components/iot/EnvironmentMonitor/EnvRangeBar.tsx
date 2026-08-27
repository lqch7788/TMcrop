/**
 * 阈值区间进度条 — 完全还原 iAGS 棚内环境监测 UI
 * 设计参考：D:\iAGS\tm.iags_web\app\iAGS\3D\getData.ejs (marker-item)
 *
 * 视觉规则：
 * - 当前值在 [min, max] 区间内 → 蓝渐变（#15516c → #00d8e8）+ 青色气泡 #00D3FF
 * - 当前值超出区间 → 红渐变（#6c1515 → #e80000）+ 红色气泡 #FF0000
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EnvRangeBarProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  minScale: number;
  maxScale: number;
  warning?: boolean;
}

const EnvRangeBar: React.FC<EnvRangeBarProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  min,
  max,
  minScale,
  maxScale,
  warning,
}) => {
  // 自动判断是否在范围内（如果 props 没显式传 warning）
  const isOutOfRange = warning !== undefined ? warning : value < min || value > max;

  // 进度条刻度计算
  const rangeStart = ((min - minScale) / (maxScale - minScale)) * 100;
  const rangeWidth = ((max - min) / (maxScale - minScale)) * 100;
  const valuePos = Math.max(0, Math.min(100, ((value - minScale) / (maxScale - minScale)) * 100));

  return (
    <div className="flex items-start gap-3 py-2">
      {/* 左侧：图标 + 标签 */}
      <div className="flex items-center gap-2 w-24 flex-shrink-0 pt-2">
        <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="text-sm text-gray-700">{label}</span>
      </div>

      {/* 中间 + 右：进度条 + 气泡 + 刻度 */}
      <div className="flex-1 relative pt-5 pb-4">
        {/* 进度条主线（灰色底） */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-visible">
          {/* 阈值区间背景 */}
          <div
            className="absolute h-full rounded-full"
            style={{
              left: `${rangeStart}%`,
              width: `${rangeWidth}%`,
              background: isOutOfRange
                ? 'linear-gradient(90deg, rgba(108,21,21,0.4) 0%, rgba(232,0,0,0.4) 100%)'
                : 'linear-gradient(90deg, #15516c 0%, #00d8e8 100%)',
            }}
          />
          {/* 当前值填充（iAGS marker-current-layout） */}
          <div
            className="absolute h-full rounded-full opacity-80"
            style={{
              width: `${valuePos}%`,
              background: isOutOfRange
                ? 'linear-gradient(90deg, #6c1515 0%, #e80000 100%)'
                : 'linear-gradient(90deg, #15516c 0%, #00d8e8 100%)',
            }}
          />
          {/* 阈值标记线（min/max 位置） */}
          <div
            className="absolute h-3 w-0.5 bg-green-600 -top-0"
            style={{ left: `${rangeStart}%` }}
          />
          <div
            className="absolute h-3 w-0.5 bg-green-600 -top-0"
            style={{ left: `${rangeStart + rangeWidth}%` }}
          />
        </div>

        {/* 当前值气泡（iAGS marker-current-value-text） */}
        <div
          className="absolute -top-3 transform -translate-x-1/2"
          style={{ left: `${valuePos}%` }}
        >
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${
              isOutOfRange ? 'bg-red-500' : 'bg-cyan-400'
            }`}
          >
            {value}{unit}
          </span>
        </div>

        {/* 阈值刻度文字 */}
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
};

export default EnvRangeBar;
