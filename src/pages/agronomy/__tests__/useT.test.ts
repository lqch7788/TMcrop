/**
 * v0.3 i18n Hook 单元测试
 * 验证：useT 翻译正确性、插值、缺失 key 行为
 */
import { describe, it, expect } from 'vitest';
import { createT } from '@/hooks/useT';
import zhCN from '@/locales/zh-CN.json';

describe('i18n createT', () => {
  const t = createT(zhCN as Record<string, unknown>);

  it('应该翻译存在的 key', () => {
    expect(t('common.save')).toBe('保存');
    expect(t('common.cancel')).toBe('取消');
    expect(t('farm.task.title')).toBe('农事任务');
  });

  it('应该处理嵌套 key', () => {
    expect(t('farm.task.status.pending')).toBe('待开始');
    expect(t('farm.task.status.completed')).toBe('已完成');
  });

  it('应该支持变量插值', () => {
    const result = t('pesticide.warning.harvestTooClose', { days: 3, interval: 14 });
    expect(result).toContain('3');
    expect(result).toContain('14');
  });

  it('缺失 key 应返回 key 本身', () => {
    expect(t('common.not_exist_key')).toBe('common.not_exist_key');
  });
});
