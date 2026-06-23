/**
 * 标签类型选择器 — 批次/单株/混合 三态切换
 * 用于 PrintLabelModal 和 SeedlingLabelManageModal
 */

import React from 'react';

export type LabelType = 'batch' | 'single' | 'mixed';

interface LabelTypeSelectorProps {
  value: LabelType;
  onChange: (val: LabelType) => void;
  /** 隐藏的选项（如 PrintLabelModal batch mode 不展示"混合"） */
  hidden?: LabelType[];
}

const LABEL_TYPES: Array<{ value: LabelType; label: string; desc: string }> = [
  { value: 'batch', label: '批次', desc: '1 个标签代表整批苗，同一批次共用一个标签' },
  { value: 'single', label: '单株', desc: '每株苗一个标签，用于精确追溯' },
  { value: 'mixed', label: '混合', desc: '部分批次 + 部分单株，各自指定数量' },
];

export function LabelTypeSelector({ value, onChange, hidden = [] }: LabelTypeSelectorProps) {
  const visible = LABEL_TYPES.filter(t => !hidden.includes(t.value));

  return (
    <div className="flex gap-2">
      {visible.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
            value === t.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
          title={t.desc}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default LabelTypeSelector;
