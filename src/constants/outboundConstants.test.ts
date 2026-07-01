import { describe, it, expect } from 'vitest';
import {
  OutboundBusinessType,
  OUTBOUND_BUSINESS_TYPE_META,
  mapLegacyBusinessType,
} from './outboundConstants';

describe('OutboundBusinessType enum', () => {
  it('应包含 10 个值', () => {
    expect(Object.values(OutboundBusinessType)).toHaveLength(10);
  });

  it('所有值应是字符串且唯一', () => {
    const values = Object.values(OutboundBusinessType);
    values.forEach((v) => expect(typeof v).toBe('string'));
    expect(new Set(values).size).toBe(values.length);
  });

  it('应包含全部业务场景', () => {
    const expected = [
      'customer_sale', 'transfer_out', 'damage_loss', 'internal_planting',
      'internal_seedling', 'internal_seed_source',
      'gift_sample', 'return_inbound', 'inventory_adjust', 'other',
    ];
    expected.forEach((code) => {
      expect(Object.values(OutboundBusinessType)).toContain(code);
    });
  });
});

describe('OUTBOUND_BUSINESS_TYPE_META', () => {
  it('每个枚举值都应有元数据', () => {
    Object.values(OutboundBusinessType).forEach((code) => {
      const meta = OUTBOUND_BUSINESS_TYPE_META[code];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.color).toMatch(/^bg-\w+-\d+ text-\w+-\d+$/);
    });
  });

  it('customer_sale 标签应为「销售交货」', () => {
    expect(OUTBOUND_BUSINESS_TYPE_META[OutboundBusinessType.CUSTOMER_SALE].label).toBe('销售交货');
  });
});

describe('mapLegacyBusinessType', () => {
  it('老值 harvest/purchase/manual/transfer 全映射为 other', () => {
    expect(mapLegacyBusinessType('harvest')).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('purchase')).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('manual')).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('transfer')).toBe(OutboundBusinessType.OTHER);
  });

  it('种源/育苗/种植老值也映射为 other', () => {
    expect(mapLegacyBusinessType('seed_source')).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('seedling')).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('planting')).toBe(OutboundBusinessType.OTHER);
  });

  it('新值原样返回', () => {
    expect(mapLegacyBusinessType('customer_sale')).toBe(OutboundBusinessType.CUSTOMER_SALE);
    expect(mapLegacyBusinessType('damage_loss')).toBe(OutboundBusinessType.DAMAGE_LOSS);
  });

  it('null/undefined/空字符串 → other', () => {
    expect(mapLegacyBusinessType(null)).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType(undefined)).toBe(OutboundBusinessType.OTHER);
    expect(mapLegacyBusinessType('')).toBe(OutboundBusinessType.OTHER);
  });

  it('未知值 → other（防御性）', () => {
    expect(mapLegacyBusinessType('unknown_xxx')).toBe(OutboundBusinessType.OTHER);
  });
});
