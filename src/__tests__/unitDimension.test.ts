/**
 * 单位口径判断测试（2026-10-17）
 * 目的：锁定「种源单位与育苗单位是否可 1:1 换算」的判定规则。
 * 背景：千克种源曾被按「株」扣减（22 千克 − 10 株 = 12 千克），属于维度错误。
 */
import { describe, it, expect } from 'vitest';
import { normalizeUnit, isSameUnitDimension } from '../constants/units';

describe('normalizeUnit', () => {
  it('同义单位归一化', () => {
    expect(normalizeUnit('公斤')).toBe('千克');
    expect(normalizeUnit('kg')).toBe('千克');
    expect(normalizeUnit('棵')).toBe('株');
    expect(normalizeUnit('颗')).toBe('粒');
    expect(normalizeUnit(' 千克 ')).toBe('千克');
    expect(normalizeUnit('')).toBe('');
    expect(normalizeUnit(null)).toBe('');
  });
});

describe('isSameUnitDimension', () => {
  it('不同维度不可换算：千克 ↔ 株', () => {
    expect(isSameUnitDimension('千克', '株')).toBe(false);
    expect(isSameUnitDimension('克', '株')).toBe(false);
    expect(isSameUnitDimension('粒', '株')).toBe(false);
  });

  it('同义单位视为同口径：公斤/千克、棵/株、颗/粒', () => {
    expect(isSameUnitDimension('公斤', '千克')).toBe(true);
    expect(isSameUnitDimension('kg', '千克')).toBe(true);
    expect(isSameUnitDimension('棵', '株')).toBe(true);
    expect(isSameUnitDimension('颗', '粒')).toBe(true);
  });

  it('完全相同的单位视为同口径', () => {
    expect(isSameUnitDimension('株', '株')).toBe(true);
    expect(isSameUnitDimension('千克', '千克')).toBe(true);
  });

  it('单位缺失时按同口径兼容（不误伤历史数据）', () => {
    expect(isSameUnitDimension('', '株')).toBe(true);
    expect(isSameUnitDimension('千克', '')).toBe(true);
    expect(isSameUnitDimension(null, null)).toBe(true);
  });
});
