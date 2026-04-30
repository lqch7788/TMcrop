/**
 * 种源数据服务
 * 使用 localStorage 实现数据持久化
 */

import { SeedSource, SourceType, SourceOrigin, StockStatus } from '../types/crop';

const STORAGE_KEY = 'crop_seed_sources';

// 初始化默认数据
// 作物编码规则：类别(2位) + 类型(2位) + 品种(2位) + 子品种1(3位) + 详细品种(2位) = 11位
// 示例：PD030100400 = 蔬菜类-茄果类-番茄-004红果番茄-00
// 种源批号格式：ZZ + 年月日(8位) + "-" + 流水号(3位)，例如 ZZ20260426-001
const defaultData: SeedSource[] = [
  {
    id: 'SS001',
    seedCode: 'ZZ20260115-001',
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '茄果类',
    varietyName: '番茄',
    cropName: '红果番茄',
    cropVariety: '番茄',
    cropCode: 'PD030100400',  // 蔬菜类-茄果类-番茄-004红果番茄-00
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
    seedCode: 'ZZ20260201-001',
    sourceType: SourceType.SEEDLING,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '叶菜类',
    varietyName: '生菜',
    cropName: '大叶生菜',
    cropVariety: '生菜',
    cropCode: 'PD010299900',  // 蔬菜类-叶菜类-生菜-999其他生菜-00
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
    seedCode: 'ZZ20260215-001',
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '瓜菜类',
    varietyName: '黄瓜',
    cropName: '水果黄瓜',
    cropVariety: '黄瓜',
    cropCode: 'PD020100100',  // 蔬菜类-瓜菜类-黄瓜-001水果黄瓜-00
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
    seedCode: 'ZZ20260301-001',
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '茄果类',
    varietyName: '茄子',
    cropName: '紫长茄子',
    cropVariety: '茄子',
    cropCode: 'PD030300100',  // 蔬菜类-茄果类-茄子-001紫长茄子-00
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
  },
  // 新增测试数据 - 不同的种源类型和来源途径
  {
    id: 'SS005',
    seedCode: 'ZZ20260310-001',
    sourceType: SourceType.CUTTING,
    sourceOrigin: 'self_produced' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '叶菜类',
    varietyName: '空心菜',
    cropName: '大叶空心菜',
    cropVariety: '空心菜',
    cropCode: 'PD010399900',  // 蔬菜类-叶菜类-空心菜-999其他-00
    supplierId: '',
    supplierName: '',
    purchaseDate: '2026-03-10',
    quantity: 100,
    unit: '株',
    unitPrice: 0,
    totalAmount: 0,
    initialCount: 10000,
    availableCount: 8000,
    pictures: [],
    remarks: '基地自繁扦插苗，生长良好',
    status: StockStatus.SUFFICIENT,
    printCount: 0,
    createBy: '王建国',
    createTime: '2026-03-10 09:00:00',
    updateTime: '2026-04-20 10:00:00'
  },
  {
    id: 'SS006',
    seedCode: 'ZZ20260315-001',
    sourceType: SourceType.GRAFTING,
    sourceOrigin: 'commissioned' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '瓜类水果',
    varietyName: '西瓜',
    cropName: '黑美人西瓜',
    cropVariety: '西瓜',
    cropCode: 'PD0601001001',  // 蔬菜类-瓜类水果-西瓜-001黑美人-00
    supplierId: '',
    supplierName: '委托培育',
    purchaseDate: '2026-03-15',
    quantity: 50,
    unit: '株',
    unitPrice: 80,
    totalAmount: 4000,
    initialCount: 5000,
    availableCount: 5000,
    pictures: [],
    remarks: '委托农业科学院培育的嫁接西瓜苗，抗病性强',
    status: StockStatus.SUFFICIENT,
    printCount: 1,
    createBy: '李明辉',
    createTime: '2026-03-15 14:00:00',
    updateTime: '2026-04-18 16:00:00'
  },
  {
    id: 'SS007',
    seedCode: 'ZZ20260320-001',
    sourceType: SourceType.TISSUE_CULTURE,
    sourceOrigin: 'gift' as SourceOrigin,
    cropCategory: '蔬菜类',
    typeName: '叶菜类',
    varietyName: '生菜',
    cropName: '奶油生菜',
    cropVariety: '生菜',
    cropCode: 'PD010299901',  // 蔬菜类-叶菜类-生菜-999其他-01
    supplierId: '',
    supplierName: '省农业厅赠送',
    purchaseDate: '2026-03-20',
    quantity: 200,
    unit: '株',
    unitPrice: 0,
    totalAmount: 0,
    initialCount: 20000,
    availableCount: 15000,
    pictures: [],
    remarks: '省农业厅推广新品种赠送，组培苗成活率高',
    status: StockStatus.SUFFICIENT,
    printCount: 0,
    createBy: '张伟',
    createTime: '2026-03-20 10:00:00',
    updateTime: '2026-04-19 09:00:00'
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

/**
 * 获取当天最大种源批号流水号
 * @param dateStr 日期字符串 (YYYYMMDD格式)
 * @returns 当天最大流水号，如果没有则返回0
 */
export function getTodayMaxSeedCodeSerial(dateStr: string): number {
  const sources = getSeedSources();
  let maxSerial = 0;

  for (const source of sources) {
    // 种源批号格式：ZZ + 年月日(8位) + "-" + 流水号(3位)
    // 例如：ZZ20260426-001
    if (source.seedCode && source.seedCode.startsWith('ZZ' + dateStr + '-')) {
      const serialStr = source.seedCode.substring(11); // 去掉ZZ + 年月日 + "-"，取后面3位
      const serial = parseInt(serialStr, 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  }

  return maxSerial;
}

/**
 * 生成新的种源批号
 * @param dateStr 日期字符串 (YYYYMMDD格式)
 * @returns 新的种源批号 ZZ + 年月日 + "-" + 3位流水号
 */
export function generateSeedCode(dateStr: string): string {
  const maxSerial = getTodayMaxSeedCodeSerial(dateStr);
  const newSerial = maxSerial + 1;
  return `ZZ${dateStr}-${String(newSerial).padStart(3, '0')}`;
}
