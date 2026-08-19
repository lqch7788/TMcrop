/**
 * 标记状态选择器 — 大类下拉 + 子项复选框（共享组件）
 *
 * 2026-08-19：AddResumeForm 的「标记状态」和「补录现有属性」两个 Tab
 *   顶部都有完全一样的"大类单选 → 子项多选"UI（约 50 行重复代码）。
 *   抽到本组件复用，accent 颜色由调用方传入（mark 用紫、patch 用琥珀）。
 *
 * 数据源：/api/dictionary/dictionaries/mark-status 返回的 tree
 *   每个 children 项的 id 是 dictionaries.id（字符串），用于回传给后端。
 */
import React from 'react';

export interface MarkDictNode {
  id: string;
  dictCode: string;
  dictLabel: string;
  parentId: string | null;
  color: string | null;
  children?: MarkDictNode[];
}

export interface MarkDictCategory extends MarkDictNode {
  children: MarkDictNode[];
}

export type MarkAccent = 'purple' | 'amber';

interface MarkCategoryPickerProps {
  markTree: MarkDictCategory[];
  /** 当前选中的大类 id（dictionaries.id）；null = 未选 */
  selectedCategory: string | null;
  /** 切换大类时回调；切大类会清空已选子项（业务约定） */
  onCategoryChange: (categoryId: string | null) => void;
  /** 当前已选的子项 id 列表（dictionaries.id） */
  selectedIds: string[];
  /** 子项勾选/取消回调（由调用方实现 toggle 逻辑） */
  onIdsChange: (updater: (prev: string[]) => string[]) => void;
  /** 视觉强调色：mark 紫色（事件流）/ patch 琥珀（补录历史） */
  accent?: MarkAccent;
  /** 标签文案，默认"标记大类"/"子项" */
  labels?: { category?: string; child?: string };
}

const ACCENT_CLASS: Record<MarkAccent, { hover: string }> = {
  purple: { hover: 'hover:bg-purple-50' },
  amber: { hover: 'hover:bg-amber-50' },
};

export function MarkCategoryPicker({
  markTree,
  selectedCategory,
  onCategoryChange,
  selectedIds,
  onIdsChange,
  accent = 'purple',
  labels,
}: MarkCategoryPickerProps) {
  const labelCategory = labels?.category ?? '标记大类';
  const labelChild = labels?.child ?? '子项';
  const hoverClass = ACCENT_CLASS[accent].hover;

  if (markTree.length === 0) {
    return (
      <span className="text-xs text-amber-600">
        暂无标记（系统设置 → 数据字典 → 标记状态 配置）
      </span>
    );
  }

  const activeCat = selectedCategory ? markTree.find((c) => c.id === selectedCategory) : null;

  return (
    <div className="flex flex-col gap-2 max-w-xl">
      {/* 大类下拉（单选） */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 whitespace-nowrap" style={{ width: 80 }}>
          {labelCategory}
        </span>
        <select
          value={selectedCategory || ''}
          onChange={(e) => onCategoryChange(e.target.value || null)}
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
        >
          <option value="">— 请选择大类 —</option>
          {markTree.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.dictLabel}</option>
          ))}
        </select>
      </div>

      {/* 选中大类后：子项复选框列表 */}
      {activeCat && (
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-600 whitespace-nowrap" style={{ width: 80, marginTop: 6 }}>
            {labelChild}
          </span>
          <div className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5 border border-gray-200 rounded p-1.5 bg-white">
            {activeCat.children.map((child) => {
              const checked = selectedIds.includes(child.id);
              return (
                <label
                  key={child.id}
                  className={`flex items-center gap-1.5 px-1 py-0.5 ${hoverClass} rounded cursor-pointer text-xs whitespace-nowrap`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onIdsChange((prev) =>
                        checked ? prev.filter((x) => x !== child.id) : [...prev, child.id]
                      )
                    }
                    className="w-3.5 h-3.5"
                  />
                  <span>{child.dictLabel}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkCategoryPicker;
