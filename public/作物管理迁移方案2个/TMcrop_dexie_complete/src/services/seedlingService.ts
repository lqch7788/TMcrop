/**
 * 育苗数据服务
 * 使用 localStorage 实现数据持久化
 */

import { Seedling, SeedlingStatus, DailyRecord } from '../types/crop';

const STORAGE_KEY = 'crop_seedlings';

// 初始化默认数据
const defaultData: Seedling[] = [
  {
    id: 'SD001',
    seedlingCode: 'YM2026-001',
    sourceId: 'SS001',
    sourceCode: 'ZZ2026-001',
    cropName: '番茄',
    cropVariety: '红果番茄',
    seedlingType: '穴盘育苗',
    siteId: 'SITE001',
    siteName: '育苗温室A区',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    expectedEndDate: '2026-02-28',
    initialCount: 50000,
    survivalCount: 45000,
    plantedCount: 40000,
    survivalRate: 90,
    lossCount: 5000,
    lossRate: 10,
    isFinished: true,
    status: SeedlingStatus.COMPLETED,
    dailyRecords: [
      {
        id: 'DR001',
        seedlingId: 'SD001',
        recordDate: '2026-02-01',
        temperature: 25,
        humidity: 70,
        watering: true,
        remarks: '播种第1天'
      },
      {
        id: 'DR002',
        seedlingId: 'SD001',
        recordDate: '2026-02-05',
        temperature: 26,
        humidity: 65,
        watering: true,
        remarks: '发芽整齐'
      }
    ],
    pictures: [],
    qualityGrade: 'A级',
    printCount: 3,
    remarks: '成苗率优秀',
    createBy: '李明辉',
    createTime: '2026-02-01 08:00:00',
    updateTime: '2026-02-28 17:00:00'
  },
  {
    id: 'SD002',
    seedlingCode: 'YM2026-002',
    sourceId: 'SS002',
    sourceCode: 'ZZ2026-002',
    cropName: '生菜',
    cropVariety: '大叶生菜',
    seedlingType: '直播育苗',
    siteId: 'SITE002',
    siteName: '育苗温室B区',
    startDate: '2026-03-01',
    initialCount: 3000,
    survivalCount: 2700,
    plantedCount: 0,
    survivalRate: 90,
    lossCount: 300,
    lossRate: 10,
    isFinished: false,
    status: SeedlingStatus.TRANSPLANT_READY,
    dailyRecords: [],
    pictures: [],
    qualityGrade: 'B级',
    printCount: 1,
    remarks: '待定植',
    createBy: '王建国',
    createTime: '2026-03-01 09:00:00',
    updateTime: '2026-04-20 10:00:00'
  },
  {
    id: 'SD003',
    seedlingCode: 'YM2026-003',
    sourceId: 'SS003',
    sourceCode: 'ZZ2026-003',
    cropName: '黄瓜',
    cropVariety: '水果黄瓜',
    seedlingType: '穴盘育苗',
    siteId: 'SITE001',
    siteName: '育苗温室A区',
    startDate: '2026-03-10',
    initialCount: 10000,
    survivalCount: 9500,
    plantedCount: 0,
    survivalRate: 95,
    lossCount: 500,
    lossRate: 5,
    isFinished: false,
    status: SeedlingStatus.IN_PROGRESS,
    dailyRecords: [],
    pictures: [],
    printCount: 0,
    remarks: '生长良好',
    createBy: '李明辉',
    createTime: '2026-03-10 08:00:00',
    updateTime: '2026-04-20 15:00:00'
  }
];

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initSeedlings(): Seedling[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

/**
 * 获取所有育苗数据
 */
export function getSeedlings(): Seedling[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  return initSeedlings();
}

/**
 * 根据ID获取单条育苗记录
 */
export function getSeedlingById(id: string): Seedling | undefined {
  const seedlings = getSeedlings();
  return seedlings.find(s => s.id === id);
}

/**
 * 根据ID数组获取多条育苗记录
 */
export function getSeedlingsByIds(ids: string[]): Seedling[] {
  const seedlings = getSeedlings();
  return seedlings.filter(s => ids.includes(s.id));
}

/**
 * 根据来源ID获取育苗记录（用于级联查询）
 */
export function getSeedlingsBySourceId(sourceId: string): Seedling[] {
  const seedlings = getSeedlings();
  return seedlings.filter(s => s.sourceId === sourceId);
}

/**
 * 添加新育苗记录
 */
export function addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Seedling {
  const seedlings = getSeedlings();
  const newSeedling: Seedling = {
    ...seedling,
    id: 'SD' + Date.now(),
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  };
  seedlings.push(newSeedling);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return newSeedling;
}

/**
 * 更新育苗记录
 */
export function updateSeedling(id: string, updates: Partial<Seedling>): Seedling | null {
  const seedlings = getSeedlings();
  const index = seedlings.findIndex(s => s.id === id);
  if (index === -1) return null;

  seedlings[index] = {
    ...seedlings[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return seedlings[index];
}

/**
 * 删除育苗记录
 */
export function deleteSeedling(id: string): boolean {
  const seedlings = getSeedlings();
  const index = seedlings.findIndex(s => s.id === id);
  if (index === -1) return false;

  seedlings.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return true;
}

/**
 * 批量删除育苗记录
 */
export function deleteSeedlings(ids: string[]): boolean {
  const seedlings = getSeedlings();
  const filtered = seedlings.filter(s => !ids.includes(s.id));
  if (filtered.length === seedlings.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 添加每日记录
 */
export function addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): DailyRecord | null {
  const seedlings = getSeedlings();
  const index = seedlings.findIndex(s => s.id === seedlingId);
  if (index === -1) return null;

  const newRecord: DailyRecord = {
    ...record,
    id: 'DR' + Date.now(),
    seedlingId
  };

  const dailyRecords = seedlings[index].dailyRecords || [];
  dailyRecords.push(newRecord);

  seedlings[index] = {
    ...seedlings[index],
    dailyRecords,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return newRecord;
}

/**
 * 删除每日记录
 */
export function deleteDailyRecord(seedlingId: string, recordId: string): boolean {
  const seedlings = getSeedlings();
  const index = seedlings.findIndex(s => s.id === seedlingId);
  if (index === -1) return false;

  const dailyRecords = seedlings[index].dailyRecords || [];
  const filtered = dailyRecords.filter(r => r.id !== recordId);
  if (filtered.length === dailyRecords.length) return false;

  seedlings[index] = {
    ...seedlings[index],
    dailyRecords: filtered,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return true;
}

/**
 * 更新每日记录
 */
export function updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): boolean {
  const seedlings = getSeedlings();
  const sIndex = seedlings.findIndex(s => s.id === seedlingId);
  if (sIndex === -1) return false;

  const dailyRecords = seedlings[sIndex].dailyRecords || [];
  const rIndex = dailyRecords.findIndex(r => r.id === recordId);
  if (rIndex === -1) return false;

  dailyRecords[rIndex] = { ...dailyRecords[rIndex], ...updates };

  seedlings[sIndex] = {
    ...seedlings[sIndex],
    dailyRecords,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedlings));
  return true;
}

/**
 * 增加已定植数量（定植操作时调用）
 */
export function increasePlantedCount(id: string, count: number): boolean {
  const seedling = getSeedlingById(id);
  if (!seedling) return false;

  const newPlantedCount = seedling.plantedCount + count;
  const newStatus = newPlantedCount >= seedling.survivalCount
    ? SeedlingStatus.COMPLETED
    : SeedlingStatus.TRANSPLANT_READY;

  updateSeedling(id, {
    plantedCount: newPlantedCount,
    status: newStatus
  });
  return true;
}

/**
 * 获取可定植的育苗列表
 */
export function getTransplantReadySeedlings(): Seedling[] {
  const seedlings = getSeedlings();
  return seedlings.filter(s =>
    s.status === SeedlingStatus.TRANSPLANT_READY ||
    (s.status === SeedlingStatus.IN_PROGRESS && s.survivalCount - s.plantedCount > 0)
  );
}

/**
 * 获取指定育苗的可定植数量
 */
export function getAvailableTransplantCount(id: string): number {
  const seedling = getSeedlingById(id);
  if (!seedling) return 0;
  return seedling.survivalCount - seedling.plantedCount;
}

/**
 * 重置数据到默认状态
 */
export function resetSeedlings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
