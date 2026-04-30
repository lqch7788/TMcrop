/**
 * 育苗服务测试用例
 */

import {
  SeedlingStatus,
  SeedlingPlanType,
  SeedlingCalculateMode,
  DailyRecord,
  TransplantRecord,
} from '../types/crop';
import * as seedlingService from '../services/seedlingService';

const STORAGE_KEY = 'crop_seedlings';

const clearTestData = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('crop_seed_sources'); // 育苗依赖种源
};

describe('育苗服务', () => {
  beforeEach(() => {
    clearTestData();
    seedlingService.initSeedlings();
  });

  afterAll(() => {
    clearTestData();
  });

  describe('数据初始化', () => {
    it('应该能够初始化默认数据', () => {
      const seedlings = seedlingService.getSeedlings();
      expect(seedlings.length).toBeGreaterThan(0);
    });
  });

  describe('查询功能', () => {
    it('应该能够获取所有育苗列表', () => {
      const seedlings = seedlingService.getSeedlings();
      expect(Array.isArray(seedlings)).toBe(true);
    });

    it('应该能够根据ID获取育苗详情', () => {
      const seedling = seedlingService.getSeedlingById('SD001');
      expect(seedling).toBeDefined();
      expect(seedling?.seedlingCode).toBeDefined();
    });

    it('应该能够根据种源ID查询关联的育苗记录', () => {
      const seedlings = seedlingService.getSeedlingsBySourceId('SS001');
      expect(Array.isArray(seedlings)).toBe(true);
    });

    it('应该能够获取待定植的育苗列表', () => {
      const transplantReady = seedlingService.getTransplantReadySeedlings();
      expect(Array.isArray(transplantReady)).toBe(true);
    });

    it('应该能够获取可定植数量', () => {
      const count = seedlingService.getAvailableTransplantCount('SD001');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('新增功能', () => {
    it('应该能够添加新的育苗记录', () => {
      const initialCount = seedlingService.getSeedlings().length;

      const today = new Date();
      const code = seedlingService.generateSeedlingCodeByDate(today);

      const newSeedling = seedlingService.addSeedling({
        seedlingCode: code,
        sourceCode: 'ZZ20260115-001',
        cropName: '红果番茄',
        cropVariety: '红果番茄',
        cropCode: 'PD030100400',
        seedlingType: '播种育苗',
        siteId: 'SITE001',
        siteName: '1号温室',
        startDate: '2026-04-01',
        expectedEndDate: '2026-04-30',
        initialCount: 1000,
        survivalCount: 0,
        plantedCount: 0,
        survivalRate: 0,
        lossCount: 0,
        lossRate: 0,
        isFinished: false,
        status: SeedlingStatus.IN_PROGRESS,
        dailyRecords: [],
        pictures: [],
        printCount: 0,
        remarks: '测试育苗',
        createBy: '测试用户',
        planType: SeedlingPlanType.ROUTINE,
        targetSurvivalRate: 90,
        targetSurvivalCount: 900,
        calculateMode: SeedlingCalculateMode.SINGLE,
      });

      expect(newSeedling).toBeDefined();
      expect(newSeedling.id).toBeDefined();
      expect(seedlingService.getSeedlings().length).toBe(initialCount + 1);
    });
  });

  describe('更新功能', () => {
    it('应该能够更新育苗信息', () => {
      const updated = seedlingService.updateSeedling('SD001', {
        survivalCount: 800,
        survivalRate: 80,
      });

      expect(updated).toBeDefined();
      expect(updated?.survivalCount).toBe(800);
      expect(updated?.survivalRate).toBe(80);
    });

    it('应该能够增加已定植数量', () => {
      const before = seedlingService.getSeedlingById('SD001');
      const beforePlanted = before?.plantedCount || 0;

      const result = seedlingService.increasePlantedCount('SD001', 100);

      expect(result).toBe(true);
      const after = seedlingService.getSeedlingById('SD001');
      expect(after?.plantedCount).toBe(beforePlanted + 100);
    });
  });

  describe('每日记录功能', () => {
    it('应该能够添加每日记录', () => {
      const record: Omit<DailyRecord, 'id' | 'seedlingId'> = {
        recordDate: '2026-04-15',
        plantHeight: 10.5,
        leafCount: 5,
        temperature: 25,
        humidity: 70,
        remarks: '生长正常',
        recordedBy: '测试人员',
      };

      const result = seedlingService.addDailyRecord('SD001', record);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it('应该能够删除每日记录', () => {
      // 先添加一条记录
      const record: Omit<DailyRecord, 'id' | 'seedlingId'> = {
        recordDate: '2026-04-15',
        plantHeight: 10.5,
        leafCount: 5,
        temperature: 25,
        humidity: 70,
        remarks: '测试',
        recordedBy: '测试人员',
      };

      const added = seedlingService.addDailyRecord('SD001', record);
      expect(added).toBeDefined();

      const beforeCount = seedlingService.getSeedlingById('SD001')?.dailyRecords.length || 0;
      const deleted = seedlingService.deleteDailyRecord('SD001', added!.id);

      expect(deleted).toBe(true);
    });
  });

  describe('定植记录功能', () => {
    it('应该能够添加定植记录', () => {
      const record: Omit<TransplantRecord, 'id' | 'createTime'> = {
        transplantDate: '2026-04-20',
        areaName: 'A区',
        zoneName: 'A1',
        bedName: 'A1-01',
        transplantCount: 500,
        remainingCount: 500,
        status: 'growing' as any,
      };

      const result = seedlingService.addTransplantRecord('SD001', record);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it('应该能够获取定植记录列表', () => {
      const records = seedlingService.getTransplantRecords('SD001');
      expect(Array.isArray(records)).toBe(true);
    });
  });

  describe('删除功能', () => {
    it('应该能够删除单条育苗记录', () => {
      const initialCount = seedlingService.getSeedlings().length;
      const result = seedlingService.deleteSeedling('SD001');

      expect(result).toBe(true);
      expect(seedlingService.getSeedlings().length).toBe(initialCount - 1);
    });

    it('应该能够批量删除育苗记录', () => {
      const initialCount = seedlingService.getSeedlings().length;
      const result = seedlingService.deleteSeedlings(['SD001', 'SD002']);

      expect(result).toBe(true);
      expect(seedlingService.getSeedlings().length).toBe(initialCount - 2);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置育苗数据', () => {
      seedlingService.resetSeedlings();

      const seedlings = seedlingService.getSeedlings();
      expect(seedlings.length).toBeGreaterThan(0);
    });
  });
});
