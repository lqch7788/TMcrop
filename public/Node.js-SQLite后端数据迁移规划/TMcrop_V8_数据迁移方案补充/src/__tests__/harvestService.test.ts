/**
 * 采收服务测试用例
 */

import * as harvestService from '../services/harvestService';

const STORAGE_KEY = 'harvest_records';

const clearTestData = () => {
  localStorage.removeItem(STORAGE_KEY);
};

describe('采收服务', () => {
  beforeEach(() => {
    clearTestData();
    harvestService.initHarvestRecords();
  });

  afterAll(() => {
    clearTestData();
  });

  describe('数据初始化', () => {
    it('应该能够初始化默认数据', () => {
      const records = harvestService.getHarvestRecords();
      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe('查询功能', () => {
    it('应该能够获取所有采收记录', () => {
      const records = harvestService.getHarvestRecords();
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
    });

    it('应该能够根据ID获取采收详情', () => {
      const record = harvestService.getHarvestRecordById('1');
      expect(record).toBeDefined();
      expect(record?.harvestCode).toBe('HS202604001');
    });

    it('应该能够根据多个ID批量获取采收记录', () => {
      const records = harvestService.getHarvestRecordsByIds(['1', '2']);
      expect(records.length).toBe(2);
    });

    it('应该能够根据批次号获取采收记录', () => {
      const records = harvestService.getHarvestRecordsByBatchCode('ZZ2026-001');
      expect(Array.isArray(records)).toBe(true);
    });

    it('获取不存在的记录应返回undefined', () => {
      const record = harvestService.getHarvestRecordById('999');
      expect(record).toBeUndefined();
    });
  });

  describe('新增功能', () => {
    it('应该能够添加新的采收记录', () => {
      const initialCount = harvestService.getHarvestRecords().length;

      const newRecord = harvestService.addHarvestRecord({
        harvestCode: 'HS202604999',
        batchId: '999',
        batchCode: 'ZZ2026-999',
        cropName: '茄子',
        greenhouseId: 'GH003',
        greenhouseName: '3号大棚',
        harvestDate: '2026-04-30',
        harvestArea: 50,
        harvestQuantity: 200,
        unit: '公斤',
        quality: 'good',
        grade: 'B',
        harvesterIds: ['U001'],
        harvesterNames: ['测试人员'],
        warehouseId: 'WH001',
        warehouseName: '主仓库',
        status: 'stored',
        auditor: '测试审核',
        variety: '紫茄子',
        plantingMode: '大棚种植',
        targetYield: 250,
        relatedTaskId: 'T999',
        relatedTaskCode: 'AGR20260499999',
      });

      expect(newRecord).toBeDefined();
      expect(newRecord.id).toBeDefined();
      expect(harvestService.getHarvestRecords().length).toBe(initialCount + 1);
    });

    it('应该能够批量添加采收记录', () => {
      const initialCount = harvestService.getHarvestRecords().length;

      const newRecords = harvestService.addHarvestRecords([
        {
          harvestCode: 'HS202604888',
          batchId: '888',
          batchCode: 'ZZ2026-888',
          cropName: '测试1',
          greenhouseId: 'GH001',
          greenhouseName: '1号大棚',
          harvestDate: '2026-04-30',
          harvestArea: 30,
          harvestQuantity: 100,
          unit: '公斤',
          quality: 'good',
          grade: 'B',
          harvesterIds: [],
          harvesterNames: [],
          warehouseId: 'WH001',
          warehouseName: '主仓库',
          status: 'stored',
          auditor: '测试',
          variety: '测试',
          plantingMode: '测试',
          targetYield: 150,
        },
        {
          harvestCode: 'HS202604877',
          batchId: '877',
          batchCode: 'ZZ2026-877',
          cropName: '测试2',
          greenhouseId: 'GH002',
          greenhouseName: '2号大棚',
          harvestDate: '2026-04-30',
          harvestArea: 40,
          harvestQuantity: 150,
          unit: '公斤',
          quality: 'excellent',
          grade: 'A',
          harvesterIds: [],
          harvesterNames: [],
          warehouseId: 'WH001',
          warehouseName: '主仓库',
          status: 'stored',
          auditor: '测试',
          variety: '测试',
          plantingMode: '测试',
          targetYield: 200,
        },
      ]);

      expect(newRecords.length).toBe(2);
      expect(harvestService.getHarvestRecords().length).toBe(initialCount + 2);
    });
  });

  describe('更新功能', () => {
    it('应该能够更新采收记录', () => {
      const updated = harvestService.updateHarvestRecord('1', {
        quality: 'excellent',
        remarks: '更新备注',
      });

      expect(updated).toBeDefined();
      expect(updated?.quality).toBe('excellent');
    });

    it('更新不存在的记录应返回null', () => {
      const updated = harvestService.updateHarvestRecord('999', {
        quality: 'excellent',
      });

      expect(updated).toBeNull();
    });
  });

  describe('删除功能', () => {
    it('应该能够删除单条采收记录', () => {
      const initialCount = harvestService.getHarvestRecords().length;
      const result = harvestService.deleteHarvestRecord('1');

      expect(result).toBe(true);
      expect(harvestService.getHarvestRecords().length).toBe(initialCount - 1);
    });

    it('删除不存在的记录应返回false', () => {
      const result = harvestService.deleteHarvestRecord('999');
      expect(result).toBe(false);
    });

    it('应该能够批量删除采收记录', () => {
      const initialCount = harvestService.getHarvestRecords().length;
      const result = harvestService.deleteHarvestRecords(['1', '2']);

      expect(result).toBe(true);
      expect(harvestService.getHarvestRecords().length).toBe(initialCount - 2);
    });

    it('批量删除不存在的ID应返回false', () => {
      const result = harvestService.deleteHarvestRecords(['999', '888']);
      expect(result).toBe(false);
    });
  });

  describe('单号生成功能', () => {
    it('应该能够生成采收单号', () => {
      const code = harvestService.generateHarvestCode();
      expect(code).toBeDefined();
      expect(code.startsWith('HS')).toBe(true);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置采收数据', () => {
      harvestService.addHarvestRecord({
        harvestCode: 'HS202604999',
        batchId: '999',
        batchCode: 'ZZ2026-999',
        cropName: '测试',
        greenhouseId: 'GH999',
        greenhouseName: '测试棚',
        harvestDate: '2026-04-30',
        harvestArea: 10,
        harvestQuantity: 50,
        unit: '公斤',
        quality: 'good',
        grade: 'C',
        harvesterIds: [],
        harvesterNames: [],
        warehouseId: 'WH001',
        warehouseName: '主仓库',
        status: 'stored',
        auditor: '测试',
        variety: '测试',
        plantingMode: '测试',
        targetYield: 100,
      });

      harvestService.resetHarvestRecords();

      const records = harvestService.getHarvestRecords();
      expect(records.length).toBeGreaterThan(0);
    });
  });
});
