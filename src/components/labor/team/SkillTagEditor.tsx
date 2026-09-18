/**
 * 技能标签 chip 多选编辑器（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-3：从 TeamTable 内部抽出来：
 *   - TeamTable 从 738 行降到 ~650 行
 *   - 技能标签相关 UI/逻辑封闭独立维护
 *   - 内部仍用 __custom_input__ sentinel + custom: 前缀（前端 UI 内部标记）
 *     + 函数式 setState（避免连续点击相互覆盖）
 */
import { X } from 'lucide-react';

const PRESET_TAGS = ['采收', '施肥', '打药', '巡检', '灌溉', '运输', '修剪', '清园'];

export interface SkillTagEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function SkillTagEditor({ value, onChange }: SkillTagEditorProps) {
  const tags = Array.isArray(value) ? value : [];
  const cleanTags = tags.filter((t) => t !== '__custom_input__');
  const showCustomInput = tags.some((t) => t === '__custom_input__' || t.startsWith('custom:'));
  const customValue = tags.find((t) => t.startsWith('custom:'))?.replace('custom:', '') || '';

  const toggle = (preset: string) => {
    const next = tags.includes(preset) ? tags.filter((t) => t !== preset) : [...tags, preset];
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map((preset) => {
          const selected = tags.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                selected
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {selected ? '✓ ' : '+ '}{preset}
            </button>
          );
        })}
        {showCustomInput ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 border border-emerald-400 rounded-full">
            <input
              autoFocus
              type="text"
              placeholder="输入自定义标签"
              value={customValue}
              onChange={(e) => {
                const val = e.target.value;
                const filtered = tags.filter((t) => !t.startsWith('custom:') && t !== '__custom_input__');
                onChange(val ? [...filtered, `custom:${val.trim()}`] : [...filtered, '__custom_input__']);
              }}
              onBlur={() => {
                const hasValue = tags.some((t) => t.startsWith('custom:') && t.replace('custom:', '').trim());
                if (!hasValue) onChange(tags.filter((t) => t !== '__custom_input__'));
              }}
              className="w-32 text-xs border-none bg-transparent outline-none"
              style={{ minWidth: '120px' }}
            />
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== '__custom_input__'))}
              className="text-emerald-700 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onChange([...tags, '__custom_input__'])}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-dashed border-gray-400 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
          >
            + 其他
          </button>
        )}
      </div>
      {cleanTags.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          已选 {cleanTags.length} 个：{
            cleanTags
              .map((t) => t.startsWith('custom:') ? `「${t.replace('custom:', '')}」` : t)
              .join('、')
          }
        </div>
      )}
    </div>
  );
}