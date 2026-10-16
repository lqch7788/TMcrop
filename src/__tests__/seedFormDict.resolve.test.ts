/**
 * 种源形态值中文解析测试（2026-10-17）
 *
 * 背景：种源列表/详情/导出三处对同一脏值显示三种结果（'seedling' → 列表"种苗"、
 * 详情"种苗/实生苗"(SOURCE_TYPE_MAP 反模式)、导出原样"seedling"）。修复：统一走
 * seedFormDict.resolveSeedFormLabel —— 中文直通 / 英中翻译 / 未知英文兜底"其他"，
 * 保证所有界面与导出不泄漏英文枚举。
 */
import { describe, it, expect } from 'vitest';
import { resolveSeedFormLabel } from '../constants/seedFormDict';

describe('resolveSeedFormLabel 形态值中文解析', () => {
  it('英文脏值 seedling（真实数据 ZY20260723-001）→ 种苗', () => {
    expect(resolveSeedFormLabel('seedling')).toBe('种苗');
  });

  it('中文值直通（含稀有值，不做枚举校验）', () => {
    expect(resolveSeedFormLabel('种子')).toBe('种子');
    expect(resolveSeedFormLabel('果实')).toBe('果实');
    expect(resolveSeedFormLabel('穗条')).toBe('穗条');
  });

  it('英文枚举翻译（sourceType 场景）', () => {
    expect(resolveSeedFormLabel('seed')).toBe('种子');
    expect(resolveSeedFormLabel('other')).toBe('其他');
    expect(resolveSeedFormLabel('tissue_culture')).toBe('组培苗');
  });

  it('未知英文（如 transfer）→ 兜底"其他"，不再原样回显泄漏英文', () => {
    expect(resolveSeedFormLabel('transfer')).toBe('其他');
    expect(resolveSeedFormLabel('external_seed')).toBe('其他');
  });

  it('空值 → 返回空串（占位符由调用方决定，如「—」）', () => {
    expect(resolveSeedFormLabel(null)).toBe('');
    expect(resolveSeedFormLabel(undefined)).toBe('');
    expect(resolveSeedFormLabel('')).toBe('');
    expect(resolveSeedFormLabel('   ')).toBe('');
  });

  it('前后空格容错', () => {
    expect(resolveSeedFormLabel(' seed ')).toBe('种子');
  });
});
