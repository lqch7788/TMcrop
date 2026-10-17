/**
 * 种源「作物品种」名称口径测试（2026-10-17）
 *
 * 背景：育苗新增/编辑弹窗的「关联种源」下拉原显示 cropName（作物级，如"草莓"），
 *   同一作物下多个品种无法区分（红颜 / 宁玉 / 章姬），故收敛为品种口径单一真理源。
 * 本测试锁定优先级语义，防止未来改动把品种退回作物名（会连带破坏品种联动匹配）。
 *
 * 真实数据（seed_sources 表实测）：
 *   SRC-SS-20261016-001: cropName=草莓, cropVariety=红颜, varietyName=红颜
 *   ZY20260719-001:      cropName=杜鹃花, cropVariety='', varietyName=杜鹃花
 */
import { describe, it, expect } from 'vitest';
import { getSeedSourceVarietyName, getSeedSourceOriginOrSupplier } from '../constants/seedSourceDict';
import type { SourceOrigin } from '../types/crop';

describe('getSeedSourceVarietyName 名称口径', () => {
  it('cropVariety 有值 → 取 cropVariety（草莓记录显示"红颜"而非"草莓"）', () => {
    expect(
      getSeedSourceVarietyName({ cropVariety: '红颜', varietyName: '红颜', cropName: '草莓' }),
    ).toBe('红颜');
  });

  it('cropVariety 为空 → 回退 varietyName（老数据只写了 variety_name）', () => {
    expect(
      getSeedSourceVarietyName({ cropVariety: '', varietyName: '章姬', cropName: '草莓' }),
    ).toBe('章姬');
  });

  it('cropVariety / varietyName 均空 → 回退 cropName', () => {
    expect(
      getSeedSourceVarietyName({ cropVariety: '', varietyName: '', cropName: '郁金香' }),
    ).toBe('郁金香');
  });

  it('真实数据：杜鹃花（无品种级）三个字段同为杜鹃花 → 杜鹃花', () => {
    expect(
      getSeedSourceVarietyName({ cropVariety: '', varietyName: '杜鹃花', cropName: '杜鹃花' }),
    ).toBe('杜鹃花');
  });

  it('全空 → 返回空串（不返回 undefined，调用方直接拼模板安全）', () => {
    expect(getSeedSourceVarietyName({ cropVariety: '', varietyName: '', cropName: '' })).toBe('');
    expect(
      getSeedSourceVarietyName({
        cropVariety: null as unknown as string,
        varietyName: undefined as unknown as string,
        cropName: '',
      }),
    ).toBe('');
  });

  it('品种联动语义：同作物不同品种不相等（红颜 ≠ 宁玉）', () => {
    const 红颜 = getSeedSourceVarietyName({ cropVariety: '红颜', varietyName: '红颜', cropName: '草莓' });
    const 宁玉 = getSeedSourceVarietyName({ cropVariety: '宁玉', varietyName: '宁玉', cropName: '草莓' });
    expect(红颜).not.toBe(宁玉);
  });
});

describe('getSeedSourceOriginOrSupplier 种源来源/原始供应商口径', () => {
  it('调拨 + 有原始供应商 → 显示原始供应商（真实数据 ZY20261009-001）', () => {
    expect(
      getSeedSourceOriginOrSupplier({
        sourceOrigin: 'inventory_transfer',
        supplierName: '丰收种业公司',
        originalSupplierName: '丰收种业公司',
      }),
    ).toBe('丰收种业公司');
  });

  it('调拨 + 只有 supplierName（originalSupplierName 为空）→ 显示 supplierName', () => {
    expect(
      getSeedSourceOriginOrSupplier({
        sourceOrigin: 'inventory_transfer',
        supplierName: '绿叶蔬菜种苗基地',
        originalSupplierName: '',
      }),
    ).toBe('绿叶蔬菜种苗基地');
  });

  it('种植留种（无任何供应商）→ 回退来源途径中文"种植留种"（真实数据 SRC-SS-20261016-001）', () => {
    expect(
      getSeedSourceOriginOrSupplier({
        sourceOrigin: 'planting_self_kept',
        supplierName: null as unknown as string,
        originalSupplierName: null as unknown as string,
      }),
    ).toBe('种植留种');
  });

  it('调拨但无供应商 → 回退来源途径中文"库存调拨"（真实数据 ZY20261016-001）', () => {
    expect(
      getSeedSourceOriginOrSupplier({
        sourceOrigin: 'inventory_transfer',
        supplierName: '',
        originalSupplierName: undefined as unknown as string,
      }),
    ).toBe('库存调拨');
  });

  it('供应商为纯空白串 → 视为无供应商，回退来源途径', () => {
    expect(
      getSeedSourceOriginOrSupplier({
        sourceOrigin: 'planting_self_kept',
        supplierName: '   ',
        originalSupplierName: '',
      }),
    ).toBe('种植留种');
  });

  it('未知 sourceOrigin 且无供应商 → 原样返回代码（不显示空白，Fail Loud）', () => {
    // 场景：DB 出现新来源途径但尚未登记到 SOURCE_ORIGIN_MAP 时，应原样显示代码便于定位
    const unregistered = {
      sourceOrigin: 'unknown_origin' as unknown as SourceOrigin,
      supplierName: '',
      originalSupplierName: '',
    };
    expect(getSeedSourceOriginOrSupplier(unregistered)).toBe('unknown_origin');
  });
});
