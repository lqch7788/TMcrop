/**
 * 默认编制人列表（4 人兜底）
 * 2026-06-06 抽取：字典为空时使用；防止 useEffect 异步跑导致第一帧下拉空
 */
export const DEFAULT_OPERATOR_OPTIONS: { value: string; label: string }[] = [
  { value: '陆启闯', label: '陆启闯' },
  { value: '郭靖', label: '郭靖' },
  { value: '黄蓉', label: '黄蓉' },
  { value: '张无忌', label: '张无忌' },
];
