/**
 * 作物管理模块Mock数据
 * 包含种源管理、育苗管理、种植管理的模拟数据
 */

import {
  SeedSource,
  Seedling,
  Planting,
  SourceType,
  SourceOrigin,
  SeedlingStatus,
  PlantingStatus,
  StockStatus,
  SeedSourceFilters,
  SeedlingFilters,
  PlantingFilters
} from '../types/crop';

// ========== Mock数据 ==========

/** 种源数据 - 种源批号格式：ZZ + 年月日(8位) + "-" + 流水号(3位) */
export const seedSources: SeedSource[] = [
  {
    id: 'SS001',
    seedCode: 'ZZ20260115-001',
    sourceType: SourceType.SEED,
    sourceOrigin: 'external_purchase' as SourceOrigin,
    cropCategory: '茄果类',
    cropName: '番茄',
    cropVariety: '红果番茄',
    cropCode: 'PD0301001',  // 作物编码：蔬菜类-茄果类-番茄-001
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
    cropCategory: '叶菜类',
    cropName: '生菜',
    cropVariety: '大叶生菜',
    cropCode: 'PD0102001',  // 作物编码：蔬菜类-叶菜类-生菜-001
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
    cropCategory: '瓜类',
    cropName: '黄瓜',
    cropVariety: '水果黄瓜',
    cropCode: 'PD0201001',  // 作物编码：蔬菜类-瓜菜类-黄瓜-001
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
    cropCategory: '茄果类',
    cropName: '茄子',
    cropVariety: '紫长茄子',
    cropCode: 'PD0303001',  // 作物编码：蔬菜类-茄果类-茄子-001
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

/** 育苗数据 - 按新增弹窗字段更新，cropCode使用品种库完整11位编码
 * 育苗批号格式：YM + 年月日(YYYYMMDD) + "-" + 3位流水号，如 YM20260201-001
 */
export const seedlings: Seedling[] = [
  {
    id: 'SD001',
    seedlingCode: 'YM20260201-001',
    sourceId: 'SS001',
    sourceCode: 'ZZ20260115-001',
    cropCode: 'PD0301004001',  // 蔬菜类-茄果类-番茄-红果番茄
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
    seedlingCode: 'YM20260301-001',
    sourceId: 'SS002',
    sourceCode: 'ZZ20260201-001',
    cropCode: 'PD0102005001',  // 蔬菜类-叶菜类-生菜-大叶生菜
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
    seedlingCode: 'YM20260310-001',
    sourceId: 'SS003',
    sourceCode: 'ZZ20260215-001',
    cropCode: 'PD0201001001',  // 蔬菜类-瓜菜类-黄瓜-水果黄瓜
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

/** 种植数据 */
export const plantings: Planting[] = [
  {
    id: 'PL001',
    plantCode: 'ZZ2026-001-01',
    sourceType: SourceType.SEEDLING,
    sourceId: 'SD001',
    sourceCode: 'YM2026-001',
    cropName: '番茄',
    cropVariety: '红果番茄',
    areaId: 'G001',
    areaName: '一棚 > 01区',
    rootName: '一棚',
    plantingCount: 40000,
    plantingDate: '2026-03-01',
    soilPH: 6.5,
    soilEC: 1.2,
    transplantCount: 40000,
    transplantDate: '2026-03-05',
    isHarvest: false,
    attritionRate: 5,
    printCount: 1,
    traceabilityCode: 'TR202603010001',
    pictures: [],
    status: PlantingStatus.GROWING,
    remarks: '长势良好',
    createBy: '李明辉',
    createTime: '2026-03-01 09:00:00',
    updateTime: '2026-04-20 16:00:00'
  },
  {
    id: 'PL002',
    plantCode: 'ZZ2026-002-01',
    sourceType: SourceType.SEED,
    sourceId: 'SS003',
    sourceCode: 'ZZ2026-003',
    cropName: '黄瓜',
    cropVariety: '水果黄瓜',
    areaId: 'G002',
    areaName: '一棚 > 02区',
    rootName: '一棚',
    plantingCount: 5000,
    plantingDate: '2026-03-15',
    soilPH: 6.8,
    soilEC: 1.5,
    isHarvest: true,
    harvestDate: '2026-04-15',
    attritionRate: 3,
    printCount: 2,
    traceabilityCode: 'TR202603150002',
    pictures: [],
    status: PlantingStatus.HARVESTED,
    remarks: '第一批采收完成',
    createBy: '王建国',
    createTime: '2026-03-15 10:00:00',
    updateTime: '2026-04-15 18:00:00'
  }
];

// ========== 下拉选项数据 ==========

/** 作物类型选项 */
export const cropCategories = [
  { value: '茄果类', label: '茄果类' },
  { value: '叶菜类', label: '叶菜类' },
  { value: '瓜类', label: '瓜类' },
  { value: '豆类', label: '豆类' },
  { value: '根茎类', label: '根茎类' }
];

/** 作物名称选项 */
export const cropNames = [
  { value: '番茄', label: '番茄' },
  { value: '黄瓜', label: '黄瓜' },
  { value: '生菜', label: '生菜' },
  { value: '茄子', label: '茄子' },
  { value: '辣椒', label: '辣椒' },
  { value: '豆角', label: '豆角' }
];

/** 作物品种选项 */
export const cropVarieties = [
  { value: '红果番茄', label: '红果番茄' },
  { value: '大叶生菜', label: '大叶生菜' },
  { value: '水果黄瓜', label: '水果黄瓜' },
  { value: '紫长茄子', label: '紫长茄子' },
  { value: '青椒', label: '青椒' }
];

/** 供应商选项 */
export const suppliers = [
  { value: 'SUP001', label: '金色稻种有限公司' },
  { value: 'SUP002', label: '丰收种业公司' },
  { value: 'SUP003', label: '绿野种苗公司' }
];

/** 场地/温室选项 */
export const sites = [
  { value: 'SITE001', label: '育苗温室A区' },
  { value: 'SITE002', label: '育苗温室B区' },
  { value: 'SITE003', label: '育苗温室C区' }
];

/** 种植区域选项 */
export const areas = [
  { value: 'G001', label: '一棚 > 01区', parent: '一棚' },
  { value: 'G002', label: '一棚 > 02区', parent: '一棚' },
  { value: 'G003', label: '二棚 > 01区', parent: '二棚' },
  { value: 'G004', label: '二棚 > 02区', parent: '二棚' },
  { value: 'G005', label: '三棚 > 01区', parent: '三棚' }
];

/** 单位选项 */
export const units = [
  { value: '袋', label: '袋' },
  { value: '株', label: '株' },
  { value: '粒', label: '粒' },
  { value: '个', label: '个' }
];

/** 育苗方式选项 */
export const seedlingTypes = [
  { value: '穴盘育苗', label: '穴盘育苗' },
  { value: '直播育苗', label: '直播育苗' },
  { value: '嫁接育苗', label: '嫁接育苗' }
];

/** 品质等级选项 */
export const qualityGrades = [
  { value: 'A级', label: 'A级（优良）' },
  { value: 'B级', label: 'B级（良好）' },
  { value: 'C级', label: 'C级（一般）' }
];

/** 种源状态选项 */
export const seedSourceStatusOptions = [
  { value: 'sufficient', label: '充足' },
  { value: 'low', label: '不足' },
  { value: 'depleted', label: '耗尽' }
];

/** 育苗状态选项 */
export const seedlingStatusOptions = [
  { value: SeedlingStatus.IN_PROGRESS, label: '进行中' },
  { value: SeedlingStatus.TRANSPLANT_READY, label: '待定植' },
  { value: SeedlingStatus.COMPLETED, label: '已完成' },
  { value: SeedlingStatus.ABNORMAL, label: '异常' }
];

/** 种植状态选项 */
export const plantingStatusOptions = [
  { value: PlantingStatus.PLANTED, label: '已定植' },
  { value: PlantingStatus.GROWING, label: '生长期' },
  { value: PlantingStatus.HARVESTED, label: '已采收' },
  { value: PlantingStatus.CANCELLED, label: '已取消' }
];

/** 来源类型选项 */
export const sourceTypeOptions = [
  { value: SourceType.SEED, label: '种子' },
  { value: SourceType.SEEDLING, label: '种苗' }
];

/** 操作人员选项（新增） */
export const OPERATORS = [
  { value: '李明辉', label: '李明辉' },
  { value: '王建国', label: '王建国' },
  { value: '张伟', label: '张伟' },
  { value: '刘洋', label: '刘洋' },
  { value: '陈静', label: '陈静' }
];
