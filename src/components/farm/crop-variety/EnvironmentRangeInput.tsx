/**
 * 阈值区间输入组件（2026-07-27 审核修复）
 *
 * 设计目的：
 * - 作物适宜环境参数（温度/湿度/CO₂/光照/pH/EC 等）应当是"区间"而非"单点"
 * - 用户输入 min + max 两个值，组件拼接为 "min-max" 字符串
 * - DB 字段保持 string 格式（与种子数据 "20-25" 一致）
 *
 * 行为：
 * - value 为 "20-25" → 显示 min=20, max=25
 * - value 为 "25" → 显示 min=25, max=''（用户填了单值）
 * - value 为空/null/undefined → 两边都空
 * - 用户输入 → 实时拼接 "min-max"（空值省略）
 */
import React from 'react';
import { Input } from '@/components/ui';

interface EnvironmentRangeInputProps {
  /** 当前值，格式 "min-max"，如 "20-25" / "6.0-6.5" / "" / undefined */
  value?: string | null;
  /** 变更回调，传出拼接后的字符串 */
  onChange: (value: string) => void;
  /** 占位文字（前后缀） */
  placeholderMin?: string;
  placeholderMax?: string;
  /** 步长（默认 0.01） */
  step?: number;
  /** 禁用 */
  disabled?: boolean;
}

export function EnvironmentRangeInput({
  value,
  onChange,
  placeholderMin = '最小',
  placeholderMax = '最大',
  step = 0.01,
  disabled = false,
}: EnvironmentRangeInputProps) {
  // 解析当前值 "20-25" → [20, 25]
  const parts = (value || '').split('-');
  const minVal = parts[0] || '';
  const maxVal = parts[1] || '';

  // 拼接新值（空值省略 - 后缀）
  const buildValue = (min: string, max: string): string => {
    const m = min.trim();
    const x = max.trim();
    if (m && x) return `${m}-${x}`;
    if (m) return m;       // 只填 min 时保存为单值（避免脏数据）
    if (x) return x;       // 只填 max 时也保存为单值
    return '';             // 都空就清空
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step={step}
        value={minVal}
        onChange={(e) => onChange(buildValue(e.target.value, maxVal))}
        placeholder={placeholderMin}
        disabled={disabled}
        className="flex-1 px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
      />
      <span className="text-gray-400 text-xs shrink-0">~</span>
      <Input
        type="number"
        step={step}
        value={maxVal}
        onChange={(e) => onChange(buildValue(minVal, e.target.value))}
        placeholder={placeholderMax}
        disabled={disabled}
        className="flex-1 px-2 py-1.5 border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-cyan-50"
      />
    </div>
  );
}