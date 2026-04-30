/**
 * 种植服务测试用例
 */

import { PlantingStatus, SourceType } from '../types/crop';
import * as plantingService from '../services/plantingService';

const STORAGE_KEY = 'crop_plantings';

const clearTestData = () => {
  localStorage.removeItem(STORAGE_KEY);
};

describe('种植服务', () => {
  beforeEach(() => {
    clearTestData();
    plantingService.initPlantings();
  });

  afterAll(() => {
    clearTestData();
  });

  describe('数据初始化', () => {
    it('应该能够初始化默认数据', () => {
      const plantings = plantingService.getPlantings();
      expect(plantings.length).toBeGreaterThan(0);
    });
  });

  describe('查询功能', () => {
    it('应该能够获取所有种植列表', () => {
      const plantings = plantingService.getPlantings();
      expect(Array.isArray(plantings)).toBe(true);
    });

    it('应该能够根据ID获取种植详情', () => {
      const planting = plantingService.getPlantingById('PL001');
      expect(planting).toBeDefined();
      expect(planting?.plantCode).toBeDefined();
    });

    it('应该能够根据多个ID批量获取种植记录', () => {
      const plantings = plantingService.getPlantingsByIds(['PL001', 'PL002']);
      expect(plantings.length).toBe(2);
    });

    it('应该能够根据来源ID查询关联的种植记录', () => {
      const plantings = plantingService.getPlantingsBySourceId('SD001');
      expect(Array.isArray(plantings)).toBe(true);
    });

    it('应该能够获取未采收的种植列表', () => {
      const unharvested = plantingService.getUnharvestedPlantings();
      expect(Array.isArray(unharvested)).toBe(true);
      expect(unharvested.every(p => !p.isHarvest)).toBe(true);
    });

    it('应该能够获取已采收的种植列表', () => {
      const harvested = plantingService.getHarvestedPlantings();
      expect(Array.isArray(harvested)).toBe(true);
      expect(harvested.every(p => p.isHarvest)).toBe(true);
    });
  });

  describe('新增功能', () => {
    it('应该能够添加新的种植记录', () => {
      const initialCount = plantingService.getPlantings().length;

      const newPlanting = plantingService.addPlanting({
        plantCode: 'ZZ2026-003-01',
        sourceType: SourceType.SEED,
        sourceId: 'SS001',
        sourceCode: 'ZZ2026-001',
        cropName: '辣椒',
        cropVariety: '尖椒',
        areaId: 'G003',
        areaName: '二棚 > 01区',
        rootName: '二棚',
        plantingCount: 3000,
        plantingDate: '2026-04-01',
        soilPH: 6.2,
        soilEC: 1.3,
        transplantCount: 3000,
        transplantDate: '2026-04-05',
        isHarvest: false,
        attritionRate: 4,
        printCount: 0,
        traceabilityCode: 'TR202604010003',
        pictures: [],
        status: PlantingStatus.PLANTED,
        remarks: '测试种植',
        createBy: '测试用户',
      });

      expect(newPlanting).toBeDefined();
      expect(newPlanting.id).toBeDefined();
      expect(plantingService.getPlantings().length).toBe(initialCount + 1);
    });
  });

  describe('更新功能', () => {
    it('应该能够更新种植信息', () => {
      const updated = plantingService.updatePlanting('PL001', {
        remarks: '更新备注',
        attritionRate: 6,
      });

      expect(updated).toBeDefined();
      expect(updated?.remarks).toBe('更新备注');
      expect(updated?.attritionRate).toBe(6);
    });

    it('更新不存在的记录应返回null', () => {
      const updated = plantingService.updatePlanting('PL999', {
        remarks: '更新备注',
      });

      expect(updated).toBeNull();
    });
  });

  describe('采收功能', () => {
    it('应该能够执行采收登记', () => {
      const before = plantingService.getPlantingById('PL001');
      expect(before?.isHarvest).toBe(false);

      const result = plantingService.harvestPlanting('PL001', '2026-05-01', 38000);

      expect(result).toBe(true);
      const after = plantingService.getPlantingById('PL001');
      expect(after?.isHarvest).toBe(true);
      expect(after?.harvestDate).toBe('2026-05-01');
      expect(after?.status).toBe(PlantingStatus.HARVESTED);
    });

    it('采收不存在的记录应返回false', () => {
      const result = plantingService.harvestPlanting('PL999', '2026-05-01');
      expect(result).toBe(false);
    });
  });

  describe('删除功能', () => {
    it('应该能够删除单条种植记录', () => {
      const initialCount = plantingService.getPlantings().length;
      const result = plantingService.deletePlanting('PL001');

      expect(result).toBe(true);
      expect(plantingService.getPlantings().length).toBe(initialCount - 1);
    });

    it('删除不存在的记录应返回false', () => {
      const result = plantingService.deletePlanting('PL999');
      expect(result).toBe(false);
    });

    it('应该能够批量删除种植记录', () => {
      const initialCount = plantingService.getPlantings().length;
      const result = plantingService.deletePlantings(['PL001', 'PL002']);

      expect(result).toBe(true);
      expect(plantingService.getPlantings().length).toBe(initialCount - 2);
    });
  });

  describe('批号生成功能', () => {
    it('应该能够生成种植批号', () => {
      const code = plantingService.generatePlantCode('ZZ2026-001');
      expect(code).toBeDefined();
      expect(code.includes('ZZ2026-001')).toBe(true);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置种植数据', () => {
      plantingService.addPlanting({
        plantCode: 'ZZ2026-999-01',
        sourceType: SourceType.SEED,
        sourceId: 'SS999',
        sourceCode: 'ZZ2026-999',
        cropName: '测试',
        cropVariety: '测试',
        areaId: 'G999',
        areaName: '测试区',
        rootName: '测试',
        plantingCount: 100,
        plantingDate: '2026-04-01',
        isHarvest: false,
        attritionRate: 0,
        printCount: 0,
        traceabilityCode: 'TR20260401999',
        pictures: [],
        status: PlantingStatus.PLANTED,
        remarks: '测试',
        createBy: '测试',
      });

      plantingService.resetPlantings();

      const plantings = plantingService.getPlantings();
      expect(plantings.length).toBeGreaterThan(0);
    });
  });
});
