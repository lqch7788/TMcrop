/**
 * 种源数据服务
 * 使用 localStorage 实现数据持久化
 */

import { SeedSource, SourceType, StockStatus } from '../types/crop';

const STORAGE_KEY = 'crop_seed_sources';

// 初始化默认数据
const defaultData: SeedSource[] = [
  {
    id: 'SS001',
    seedCode: 'ZZ2026-001',
    sourceType: SourceType.SEED,
    cropCategory: '茄果类',
    cropName: '番茄',
    cropVariety: '红果番茄',
    supplierId: 'SUP001',
    supplierName: '金色稻种有限公司',
    purchaseDate: '2026-01-15',
    quantity: 50,
    unit: '袋',
    unitPrice: 150,
    totalAmount: 7500,
    initialCount: 50000,
    availableCount: 35000,
    pictures: [],
    remarks: '优质红果番茄种子，发芽率高',
    status: StockStatus.SUFFICIENT,
    printCount: 2,
    createBy: '李明辉',
    createTime: '2026-01-15 10:00:00',
    updateTime: '2026-04-20 14:30:00'
  },
  {
    id: 'SS002',
    seedCode: 'ZZ2026-002',
    sourceType: SourceType.SEEDLING,
    cropCategory: '叶菜类',
    cropName: '生菜',
    cropVariety: '大叶生菜',
    supplierId: 'SUP002',
    supplierName: '丰收种业公司',
    purchaseDate: '2026-02-01',
    quantity: 30,
    unit: '株',
    unitPrice: 5,
    totalAmount: 150,
    initialCount: 3000,
    availableCount: 1500,
    pictures: [],
    remarks: '进口大叶生菜种子',
    status: StockStatus.LOW,
    printCount: 0,
    createBy: '王建国',
    createTime: '2026-02-01 09:00:00',
    updateTime: '2026-04-18 11:20:00'
  },
  {
    id: 'SS003',
    seedCode: 'ZZ2026-003',
    sourceType: SourceType.SEED,
    cropCategory: '瓜类',
    cropName: '黄瓜',
    cropVariety: '水果黄瓜',
    supplierId: 'SUP001',
    supplierName: '金色稻种有限公司',
    purchaseDate: '2026-02-15',
    quantity: 40,
    unit: '袋',
    unitPrice: 120,
    totalAmount: 4800,
    initialCount: 40000,
    availableCount: 40000,
    pictures: [],
    remarks: '荷兰水果黄瓜种子',
    status: StockStatus.SUFFICIENT,
    printCount: 1,
    createBy: '李明辉',
    createTime: '2026-02-15 14:00:00',
    updateTime: '2026-04-20 09:00:00'
  },
  {
    id: 'SS004',
    seedCode: 'ZZ2026-004',
    sourceType: SourceType.SEED,
    cropCategory: '茄果类',
    cropName: '茄子',
    cropVariety: '紫长茄子',
    supplierId: 'SUP003',
    supplierName: '绿野种苗公司',
    purchaseDate: '2026-03-01',
    quantity: 20,
    unit: '袋',
    unitPrice: 200,
    totalAmount: 4000,
    initialCount: 20000,
    availableCount: 0,
    pictures: [],
    remarks: '优质紫长茄子种子',
    status: StockStatus.DEPLETED,
    printCount: 3,
    createBy: '张伟',
    createTime: '2026-03-01 08:30:00',
    updateTime: '2026-04-15 16:00:00'
  }
];

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initSeedSources(): SeedSource[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  // 首次使用默认数据
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

/**
 * 获取所有种源数据
 */
export function getSeedSources(): SeedSource[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  return initSeedSources();
}

/**
 * 根据ID获取单条种源
 */
export function getSeedSourceById(id: string): SeedSource | undefined {
  const sources = getSeedSources();
  return sources.find(s => s.id === id);
}

/**
 * 根据ID数组获取多种源
 */
export function getSeedSourcesByIds(ids: string[]): SeedSource[] {
  const sources = getSeedSources();
  return sources.filter(s => ids.includes(s.id));
}

/**
 * 添加新种源
 */
export function addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): SeedSource {
  const sources = getSeedSources();
  const newSource: SeedSource = {
    ...source,
    id: 'SS' + Date.now(),
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  };
  sources.push(newSource);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  return newSource;
}

/**
 * 更新种源
 */
export function updateSeedSource(id: string, updates: Partial<SeedSource>): SeedSource | null {
  const sources = getSeedSources();
  const index = sources.findIndex(s => s.id === id);
  if (index === -1) return null;

  sources[index] = {
    ...sources[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN')
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  return sources[index];
}

/**
 * 删除种源
 */
export function deleteSeedSource(id: string): boolean {
  const sources = getSeedSources();
  const index = sources.findIndex(s => s.id === id);
  if (index === -1) return false;

  sources.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  return true;
}

/**
 * 批量删除种源
 */
export function deleteSeedSources(ids: string[]): boolean {
  const sources = getSeedSources();
  const filtered = sources.filter(s => !ids.includes(s.id));
  if (filtered.length === sources.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 扣减可用数量（育苗定植时调用）
 */
export function decreaseAvailableCount(id: string, count: number): boolean {
  const source = getSeedSourceById(id);
  if (!source) return false;

  const newAvailable = source.availableCount - count;
  if (newAvailable < 0) return false;

  // 更新库存状态
  let newStatus = source.status;
  if (newAvailable === 0) {
    newStatus = StockStatus.DEPLETED;
  } else if (newAvailable < source.initialCount * 0.2) {
    newStatus = StockStatus.LOW;
  }

  updateSeedSource(id, {
    availableCount: newAvailable,
    status: newStatus
  });
  return true;
}

/**
 * 重置数据到默认状态
 */
export function resetSeedSources(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
