/**
 * 补录原因复合输入组件
 *
 * 2026-07-13 v6 新增：
 * - 上方 5 个预设下拉 + 「其他（请说明）」
 * - 选「其他」时下方显示自定义文本框
 * - 输出格式：预设 → 原样输出；其他 → "其他（请说明）：自定义文本"
 *
 * 用法：
 *   <SupplementaryReasonInput value={formData.supplementaryReason} onChange={(v) => setFormData({...formData, supplementaryReason: v})} />
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@/components/ui';

/** 5 个预设补录原因 + 「其他」占位 */
export const SUPPLEMENTARY_REASONS = [
  '采收时漏登',
  '数量统计错误',
  '系统故障',
  '品质复检后修正',
  '其他（请说明）',
] as const;

/** "其他" 选项的 value（同时是输出字符串的前缀） */
export const OTHER_VALUE = '其他（请说明）';

/** 自定义文本框占位符 */
const CUSTOM_PLACEHOLDER = '请输入具体原因';

interface SupplementaryReasonInputProps {
  value: string;
  onChange: (v: string) => void;
}

/**
 * 解析 value 字符串，判断是否处于"其他"模式以及拆分出自定义文本。
 * - value 以 OTHER_VALUE 开头 → 其他模式
 * - 否则 → 预设模式（value 等于 SUPPLEMENTARY_REASONS 之一）
 */
function parseValue(value: string): { isOther: boolean; selectedPreset: string; customText: string } {
  if (!value) {
    return { isOther: false, selectedPreset: '', customText: '' };
  }
  const isOther = value.startsWith(OTHER_VALUE);
  if (isOther) {
    // "其他（请说明）：大风导致落果" → customText = "大风导致落果"
    const rest = value.slice(OTHER_VALUE.length).replace(/^[：:]/, '');
    return { isOther: true, selectedPreset: OTHER_VALUE, customText: rest };
  }
  return { isOther: false, selectedPreset: value, customText: '' };
}

export const SupplementaryReasonInput: React.FC<SupplementaryReasonInputProps> = ({ value, onChange }) => {
  const { isOther, selectedPreset, customText } = parseValue(value);

  /** 选择预设：非其他直接输出预设；其他先输出占位（让用户填自定义文本） */
  const handlePresetChange = (preset: string) => {
    if (preset === OTHER_VALUE) {
      // 切到"其他" → 输出 OTHER_VALUE 占位，让下方 Input 显示
      onChange(OTHER_VALUE);
    } else {
      onChange(preset);
    }
  };

  /** 自定义文本框：清空回到 OTHER_VALUE 占位；有内容拼成 "OTHER_VALUE：xxx" */
  const handleCustomChange = (text: string) => {
    if (!text.trim()) {
      onChange(OTHER_VALUE);
    } else {
      onChange(`${OTHER_VALUE}：${text}`);
    }
  };

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1">
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择补录原因" />
          </SelectTrigger>
          <SelectContent>
            {SUPPLEMENTARY_REASONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isOther && (
        <div className="flex-1">
          <Input
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder={CUSTOM_PLACEHOLDER}
            className="px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      )}
    </div>
  );
};