/**
 * 标签类型选择器 — 整批共享/每株独立/混合模式 三态切换
 * 用于 PrintLabelModal 和 SeedlingLabelManageModal
 *
 * 设计改进（2026-06-28）：
 * - 选项标签：批次/单株/混合 → 整批共享/每株独立/混合模式（更直观）
 * - 每个按钮 2 行：标题 + 简短描述（不靠 hover 也能看懂区别）
 * - 选中态：边框 + 背景色高亮（清晰可见）
 */

import React from 'react';

export type LabelType = 'batch' | 'single' | 'mixed';

interface LabelTypeSelectorProps {
  value: LabelType;
  onChange: (val: LabelType) => void;
  /** 隐藏的选项（如 PrintLabelModal batch mode 不展示"混合"） */
  hidden?: LabelType[];
}

const LABEL_TYPES: Array<{ value: LabelType; label: string; sublabel: string; desc: string; icon: string }> = [
  {
    value: 'batch',
    label: '整批共享',
    sublabel: '1 个标签 = N 株',
    desc: '1 个标签代表整批苗，同一批次共用一个标签（适合批量销售/移栽）',
    icon: '📦',
  },
  {
    value: 'single',
    label: '每株独立',
    sublabel: '每株 1 个标签',
    desc: '每株苗一个标签，用于精确追溯（适合脱毒苗、科研育种、珍贵种质）',
    icon: '🌱',
  },
  {
    value: 'mixed',
    label: '混合模式',
    sublabel: '部分共享 + 部分独立',
    desc: '部分批次 + 部分单株，各自指定数量（适合批量为主 + 少量单株的特殊场景）',
    icon: '🔀',
  },
];

export function LabelTypeSelector({ value, onChange, hidden = [] }: LabelTypeSelectorProps) {
  const visible = LABEL_TYPES.filter(t => !hidden.includes(t.value));

  return (
    <div className="grid grid-cols-3 gap-2">
      {visible.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
            value === t.value
              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
          title={t.desc}
        >
          {/* 第 1 行：图标 + 主标题 */}
          <div className="flex items-center gap-1.5">
            <span className="text-base">{t.icon}</span>
            <span className={`text-sm ${value === t.value ? 'font-semibold text-emerald-800' : 'font-medium text-gray-700'}`}>
              {t.label}
            </span>
          </div>
          {/* 第 2 行：副标题（让用户一眼看懂区别） */}
          <div className={`text-xs mt-0.5 ${value === t.value ? 'text-emerald-700' : 'text-gray-500'}`}>
            {t.sublabel}
          </div>
        </button>
      ))}
    </div>
  );
}

export default LabelTypeSelector;