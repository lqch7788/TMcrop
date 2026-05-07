/**
 * 种源服务测试用例
 */

import {
  SourceType,
  SourceOrigin,
  StockStatus,
} from '../types/crop';
import * as seedSourceService from '../services/seedSourceService';

const STORAGE_KEY = 'crop_seed_sources';

const clearTestData = () => {
  localStorage.removeItem(STORAGE_KEY);
};

describe('种源服务', () => {
  beforeEach(() => {
    clearTestData();
    seedSourceService.initSeedSources();
  });

  afterAll(() => {
    clearTestData();
  });

  describe('数据初始化', () => {
    it('应该能够初始化默认数据', () => {
      const sources = seedSourceService.getSeedSources();
      expect(sources.length).toBeGreaterThan(0);
    });
  });

  describe('查询功能', () => {
    it('应该能够获取所有种源列表', () => {
      const sources = seedSourceService.getSeedSources();
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
    });

    it('应该能够根据ID获取种源详情', () => {
      const source = seedSourceService.getSeedSourceById('SS001');
      expect(source).toBeDefined();
      expect(source?.seedCode).toBe('ZZ20260115-001');
    });

    it('应该能够根据多个ID批量获取种源', () => {
      const sources = seedSourceService.getSeedSourcesByIds(['SS001', 'SS002']);
      expect(sources.length).toBe(2);
    });

    it('应该能够获取今日最大序号', () => {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const maxSerial = seedSourceService.getTodayMaxSeedCodeSerial(today);
      expect(typeof maxSerial).toBe('number');
    });
  });

  describe('新增功能', () => {
    it('应该能够添加新的种源记录', () => {
      const initialCount = seedSourceService.getSeedSources().length;

      const newSource = seedSourceService.addSeedSource({
        seedCode: 'ZZ20260430-999',
        sourceType: SourceType.SEED,
        sourceOrigin: 'external_purchase' as SourceOrigin,
        cropCategory: '蔬菜类',
        typeName: '茄果类',
        varietyName: '番茄',
        cropName: '红果番茄',
        cropVariety: '番茄',
        cropCode: 'PD030100400',
        supplierId: 'SUP001',
        supplierName: '测试供应商',
        purchaseDate: '2026-04-30',
        quantity: 100,
        unit: '袋',
        unitPrice: 200,
        totalAmount: 20000,
        initialCount: 100000,
        availableCount: 100000,
        pictures: [],
        remarks: '测试种源',
        status: StockStatus.SUFFICIENT,
        printCount: 0,
        createBy: '测试用户',
      });

      expect(newSource).toBeDefined();
      expect(newSource.id).toBeDefined();
      expect(seedSourceService.getSeedSources().length).toBe(initialCount + 1);
    });
  });

  describe('更新功能', () => {
    it('应该能够更新种源信息', () => {
      const updated = seedSourceService.updateSeedSource('SS001', {
        availableCount: 30000,
        remarks: '更新备注',
      });

      expect(updated).toBeDefined();
      expect(updated?.availableCount).toBe(30000);
      expect(updated?.remarks).toBe('更新备注');
    });

    it('应该能够扣减可用数量', () => {
      const before = seedSourceService.getSeedSourceById('SS001');
      const beforeCount = before?.availableCount || 0;

      const result = seedSourceService.decreaseAvailableCount('SS001', 5000);

      expect(result).toBe(true);
      const after = seedSourceService.getSeedSourceById('SS001');
      expect(after?.availableCount).toBe(beforeCount - 5000);
    });

    it('扣减数量超过可用时应该失败', () => {
      const before = seedSourceService.getSeedSourceById('SS001');
      const beforeCount = before?.availableCount || 0;

      const result = seedSourceService.decreaseAvailableCount('SS001', beforeCount + 10000);

      expect(result).toBe(false);
      const after = seedSourceService.getSeedSourceById('SS001');
      expect(after?.availableCount).toBe(beforeCount);
    });
  });

  describe('删除功能', () => {
    it('应该能够删除单条种源记录', () => {
      const initialCount = seedSourceService.getSeedSources().length;
      const result = seedSourceService.deleteSeedSource('SS001');

      expect(result).toBe(true);
      expect(seedSourceService.getSeedSources().length).toBe(initialCount - 1);
    });

    it('应该能够批量删除种源记录', () => {
      const initialCount = seedSourceService.getSeedSources().length;
      const result = seedSourceService.deleteSeedSources(['SS001', 'SS002']);

      expect(result).toBe(true);
      expect(seedSourceService.getSeedSources().length).toBe(initialCount - 2);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置种源数据', () => {
      seedSourceService.addSeedSource({
        seedCode: 'ZZ20260430-999',
        sourceType: SourceType.SEED,
        sourceOrigin: 'external_purchase' as SourceOrigin,
        cropCategory: '测试',
        typeName: '测试',
        varietyName: '测试',
        cropName: '测试',
        cropVariety: '测试',
        cropCode: 'PD000000000',
        supplierId: 'SUP001',
        supplierName: '测试',
        purchaseDate: '2026-04-30',
        quantity: 100,
        unit: '袋',
        unitPrice: 100,
        totalAmount: 10000,
        initialCount: 10000,
        availableCount: 10000,
        pictures: [],
        status: StockStatus.SUFFICIENT,
        printCount: 0,
        createBy: '测试',
      });

      seedSourceService.resetSeedSources();

      const sources = seedSourceService.getSeedSources();
      expect(sources.length).toBeGreaterThan(0);
    });
  });
});
