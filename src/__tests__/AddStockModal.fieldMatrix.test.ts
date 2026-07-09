import { describe, it, expect } from 'vitest';
import {
  FIELD_CONFIG,
  COMMON_FIELDS,
  validateBySourceType,
  fieldsToResetOnSourceTypeChange,
} from '../components/farm/inventory/AddStockModal.constants';
import type { SourceType } from '../types/inventoryInbound';

describe('FIELD_CONFIG 6 套矩阵', () => {
  it('六种 sourceType 全部存在', () => {
    const keys = Object.keys(FIELD_CONFIG).sort();
    expect(keys).toEqual(
      ['commissioned', 'external_purchased', 'gift', 'manual', 'self_produced', 'transfer'].sort()
    );
  });

  it('外购入库必填 supplierId、不显示 baseId', () => {
    const fields = FIELD_CONFIG.external_purchased;
    expect(fields.find(f => f.key === 'supplierId')?.required).toBe(true);
    expect(fields.find(f => f.key === 'supplierId')?.type).toBe('supplier-select');
    expect(fields.find(f => f.key === 'baseId')).toBeUndefined();
  });

  it('外购入库显示单价/采购日期/总金额/作物形态', () => {
    const keys = FIELD_CONFIG.external_purchased.map(f => f.key);
    // 2026-07-08 T13：T13 修复移除 supplierPhone；新增 cropForm（与种植管理采收弹窗对齐）
    expect(keys).not.toContain('supplierPhone');
    expect(keys).toContain('unitPrice');
    expect(keys).toContain('purchaseDate');
    expect(keys).toContain('totalAmount');
    expect(keys).toContain('cropForm');
  });

  it('自产必填 baseId、不显示 supplierId', () => {
    const fields = FIELD_CONFIG.self_produced;
    expect(fields.find(f => f.key === 'baseId')?.required).toBe(true);
    expect(fields.find(f => f.key === 'supplierId')).toBeUndefined();
  });

  it('自产显示种植模式/采收区域', () => {
    const keys = FIELD_CONFIG.self_produced.map(f => f.key);
    expect(keys).toContain('plantingMode');
    expect(keys).toContain('greenhouseName');
  });

  it('调拨入库不显示种植模式/采收区域/供应商', () => {
    const transferKeys = FIELD_CONFIG.transfer.map(f => f.key);
    expect(transferKeys).toContain('sourceWarehouseName');
    expect(transferKeys).not.toContain('plantingMode');
    expect(transferKeys).not.toContain('greenhouseName');
    expect(transferKeys).not.toContain('supplierId');
  });

  it('委托生产必填 consignor', () => {
    expect(FIELD_CONFIG.commissioned.find(f => f.key === 'consignor')?.required).toBe(true);
  });

  it('赠送 giftFrom 为选填', () => {
    expect(FIELD_CONFIG.gift.find(f => f.key === 'giftFrom')?.required).toBe(false);
  });

  it('手动盘点 stocktakeNo 为选填', () => {
    expect(FIELD_CONFIG.manual.find(f => f.key === 'stocktakeNo')?.required).toBe(false);
  });
});

describe('COMMON_FIELDS 6 来源通用', () => {
  it('必含 quantity/unit/warehouseId/recordDate/cropSelector', () => {
    const keys = COMMON_FIELDS.map(f => f.key);
    expect(keys).toEqual(expect.arrayContaining([
      'quantity', 'unit', 'warehouseId', 'recordDate', 'cropSelector',
    ]));
  });

  it('notes 在 COMMON_FIELDS 中且为选填', () => {
    const notes = COMMON_FIELDS.find(f => f.key === 'notes');
    expect(notes?.required).toBe(false);
  });
});

describe('validateBySourceType', () => {
  it('外购入库不填 supplierId 报错', () => {
    const errors = validateBySourceType({ quantity: 1, unit: '克' }, 'external_purchased');
    expect(errors.supplierId).toBe('必填');
  });

  it('公共必填字段缺失报错', () => {
    const errors = validateBySourceType(
      { quantity: 1, unit: '克', supplierId: 'sup1' },
      'external_purchased'
    );
    expect(errors.recordDate).toBe('必填');
    expect(errors.cropSelector).toBe('必填');
    expect(errors.warehouseId).toBe('必填');
  });

  it('纯空白必填字段报错', () => {
    const errors = validateBySourceType(
      {
        quantity: 1,
        unit: '克',
        recordDate: '2026-07-08',
        cropSelector: 'crop1',
        warehouseId: 'wh1',
        consignor: '   ',
      },
      'commissioned'
    );
    expect(errors.consignor).toBe('必填');
  });

  it('自产不填 baseId 报错', () => {
    const errors = validateBySourceType({ quantity: 1, unit: '克' }, 'self_produced');
    expect(errors.baseId).toBe('必填');
  });

  it('委托不填 consignor 报错', () => {
    const errors = validateBySourceType({ quantity: 1, unit: '克' }, 'commissioned');
    expect(errors.consignor).toBe('必填');
  });

  it('数量为 0 报错（6 来源通用）', () => {
    Object.keys(FIELD_CONFIG).forEach(src => {
      const errors = validateBySourceType({ quantity: 0, unit: '克' }, src as SourceType);
      expect(errors.quantity).toBe('必须大于 0');
    });
  });

  it('Infinity 数量报错（有限数字约束）', () => {
    const errors = validateBySourceType(
      {
        quantity: 'Infinity',
        unit: '克',
        recordDate: '2026-07-08',
        cropSelector: 'crop1',
        warehouseId: 'wh1',
      },
      'gift'
    );
    expect(errors.quantity).toBe('必须大于 0');
  });

  it('赠送入库不填 giftFrom 不报错（选填）', () => {
    const errors = validateBySourceType({ quantity: 1, unit: '克' }, 'gift');
    expect(errors.giftFrom).toBeUndefined();
  });

  it('合法入参不报错（外购 + 必填齐）', () => {
    const errors = validateBySourceType(
      {
        quantity: 10,
        unit: '克',
        recordDate: '2026-07-08',
        cropSelector: 'crop1',
        warehouseId: 'wh1',
        supplierId: 'sup1',
        cropForm: '果实',  // 2026-07-08 T13：外购必填 cropForm
      },
      'external_purchased'
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  // 已知 trade-off：unitPrice 负值当前不校验（外购财务字段暂不强制 min）
  // 决策记录于代码质量审查 2026-07-08。若未来业务要求 unitPrice 必须 ≥ 0，
  // 需在 validateBySourceType 加通用数值字段 min 校验。
  it('外购 unitPrice 负值不报错（已知 trade-off — 待业务要求再补）', () => {
    const errors = validateBySourceType(
      { quantity: 1, unit: '克', supplierId: 'sup1', unitPrice: -100 },
      'external_purchased'
    );
    expect(errors.unitPrice).toBeUndefined();
  });
});

describe('fieldsToResetOnSourceTypeChange', () => {
  it('返回所有来源专属字段 key（含 5 种来源）', () => {
    const keys = fieldsToResetOnSourceTypeChange();
    expect(keys).toContain('supplierId');
    expect(keys).toContain('supplierName');
    // 2026-07-08 T13：T13 修复移除 supplierPhone
    expect(keys).not.toContain('supplierPhone');
    expect(keys).toContain('giftFrom');
    expect(keys).toContain('consignor');
    expect(keys).toContain('sourceWarehouseName');
    expect(keys).toContain('stocktakeNo');
    expect(keys).toContain('baseId');
    expect(keys).toContain('plantingMode');
    expect(keys).toContain('greenhouseName');
  });

  it('不应包含公共字段 key', () => {
    const keys = fieldsToResetOnSourceTypeChange();
    expect(keys).not.toContain('quantity');
    expect(keys).not.toContain('unit');
    expect(keys).not.toContain('warehouseId');
    expect(keys).not.toContain('notes');
  });
});
