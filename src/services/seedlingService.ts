/**
 * 育苗数据服务
 * 使用 localStorage 实现数据持久化
 */

import { Seedling, SeedlingStatus, DailyRecord, PrintRecord, LabelPrintType, TransplantRecord, TransplantHistory, TransplantRecordStatus } from '../types/crop';

const STORAGE_KEY = 'crop_seedlings';

// 初始化默认数据 - 按新增弹窗字段更新，cropCode使用品种库完整11位编码
// 育苗批号格式：YM + 年月日(YYYYMMDD) + "-" + 3位流水号，如 YM20260201-001
const defaultData: Seedling[] = [
  {
    id: 'SD001',
    seedlingCode: 'YM20260201-001',
    sourceId: 'SS001',
    sourceCode: 'ZZ20260115-001',
    cropCode: 'PD030100400',  // 蔬菜类-茄果类-番茄-红果番茄
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
    cropCode: 'PD010200700',  // 蔬菜类-叶菜类-生菜-大叶生菜
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
    cropCode: 'PD020100100',  // 蔬菜类-瓜菜类-黄瓜-水果黄瓜
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
  },
  // ========== 新增模拟数据 ==========
  {
    id: 'SD004',
    seedlingCode: 'YM20260420-001',
    sourceId: '',  // 不关联种源
    sourceCode: '',
    cropCode: 'FR010100100',  // 水果类-浆果类-草莓-红颜草莓
    cropName: '红颜草莓',
    cropVariety: '红颜草莓',
    seedlingType: '扦插育苗',  // 扩繁育苗方式
    siteId: 'SITE001',
    siteName: '育苗温室A区',
    startDate: '2026-04-20',
    expectedEndDate: '2026-06-20',
    initialCount: 0,
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
    remarks: '扩繁育苗：母株50株，扩繁倍数50倍，目标产量2500株',
    createBy: '张伟',
    createTime: '2026-04-20 09:00:00',
    updateTime: '2026-04-20 09:00:00',
    // 扩繁育苗字段
    calculateMode: 'propagation',  // 扩繁育苗模式
    motherPlantCount: 50,  // 母株数量
    propagationMultiple: 50,  // 扩繁倍数
    theoreticalYield: 2500  // 理论产量
  },
  {
    id: 'SD005',
    seedlingCode: 'YM20260422-001',
    sourceId: '',  // 不关联种源
    sourceCode: '',
    cropCode: 'FR020100100',  // 水果类-核果类-桃子-水蜜桃
    cropName: '桃子',
    cropVariety: '水蜜桃',
    seedlingType: '嫁接育苗',
    siteId: 'SITE002',
    siteName: '育苗温室B区',
    startDate: '2026-04-22',
    expectedEndDate: '2026-05-15',
    initialCount: 5000,
    survivalCount: 4500,
    plantedCount: 0,
    survivalRate: 90,
    lossCount: 500,
    lossRate: 10,
    isFinished: false,
    status: SeedlingStatus.IN_PROGRESS,
    dailyRecords: [],
    pictures: [],
    printCount: 0,
    remarks: '水蜜桃育苗，长势良好',
    createBy: '刘洋',
    createTime: '2026-04-22 10:00:00',
    updateTime: '2026-04-22 10:00:00'
  },
  {
    id: 'SD006',
    seedlingCode: 'YM20260425-001',
    sourceId: '',  // 不关联种源
    sourceCode: '',
    cropCode: 'PD030200100',  // 蔬菜类-茄果类-小番茄-千禧小番茄
    cropName: '小番茄',
    cropVariety: '千禧小番茄',
    seedlingType: '穴盘育苗',
    siteId: 'SITE003',
    siteName: '育苗温室C区',
    startDate: '2026-04-25',
    expectedEndDate: '2026-05-20',
    initialCount: 8000,
    survivalCount: 7600,
    plantedCount: 0,
    survivalRate: 95,
    lossCount: 400,
    lossRate: 5,
    isFinished: false,
    status: SeedlingStatus.IN_PROGRESS,
    dailyRecords: [],
    pictures: [],
    printCount: 0,
    remarks: '出苗整齐，长势良好',
    createBy: '陈静',
    createTime: '2026-04-25 08:30:00',
    updateTime: '2026-04-25 08:30:00'
  }
];

/**
 * 统一的数据读取函数 - 从localStorage读取并解析
 */
function getStoredData(): Seedling[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('育苗数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initSeedlings(): Seedling[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    // localStorage 为空时，初始化默认数据
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    const data = JSON.parse(stored);
    return data.length > 0 ? data : defaultData;
  } catch {
    return defaultData;
  }
}

/**
 * 获取所有育苗数据
 */
export function getSeedlings(): Seedling[] {
  return getStoredData();
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
 * 生成育苗批号
 * 格式：YM + 年月日(YYYYMMDD) + "-" + 3位流水号
 * 例如：YM20260429-001
 * 参照种源批号规则（ZZ20260426-001）设计
 */
export function generateSeedlingCode(): string {
  const today = new Date();
  return generateSeedlingCodeByDate(today);
}

/**
 * 根据指定日期生成育苗批号（自动检查重码）
 * 格式：YM + 年月日(YYYYMMDD) + "-" + 3位流水号
 * @param date 指定日期（可以是过去或未来的日期）
 */
export function generateSeedlingCodeByDate(date: Date | string): string {
  let dateStr: string;

  if (typeof date === 'string') {
    // 如果是字符串（来自表单的YYYY-MM-DD格式），转换为YYYYMMDD
    dateStr = date.replace(/-/g, '');
  } else {
    // 如果是Date对象
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateStr = `${year}${month}${day}`;
  }

  // 从已有育苗记录中检查当天的最大流水号
  const seedlings = getSeedlings();
  let maxSeq = 0;

  for (const seedling of seedlings) {
    // 匹配格式：YM20260429-001
    const match = seedling.seedlingCode.match(/^YM(\d{8})-(\d{3})$/);
    if (match && match[1] === dateStr) {
      const seq = parseInt(match[2], 10);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  // 新流水号 = 当天最大流水号 + 1
  const nextSeq = maxSeq + 1;

  // 格式：YM + YYYYMMDD + "-" + 3位流水号
  return `YM${dateStr}-${nextSeq.toString().padStart(3, '0')}`;
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
 * 如果记录中包含数量变化，会自动更新主记录的对应数量并重算比率
 * 同时根据数量变化自动转换状态
 */
export function addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): DailyRecord | null {
  const seedlings = getSeedlings();
  const index = seedlings.findIndex(s => s.id === seedlingId);
  if (index === -1) return null;

  const seedling = seedlings[index];
  const newRecord: DailyRecord = {
    ...record,
    id: 'DR' + Date.now(),
    seedlingId
  };

  const dailyRecords = seedling.dailyRecords || [];
  dailyRecords.push(newRecord);

  // 如果有数量变化，更新主记录
  let updates: Partial<Seedling> = { dailyRecords };
  let newSurvivalCount = seedling.survivalCount || 0;
  let newPlantedCount = seedling.plantedCount || 0;
  let newLossCount = seedling.lossCount || 0;

  if (record.survivalCountChange !== undefined && record.survivalCountChange !== 0) {
    newSurvivalCount = Math.max(0, newSurvivalCount + record.survivalCountChange);
    const newSurvivalRate = seedling.initialCount > 0 ? (newSurvivalCount / seedling.initialCount) * 100 : 0;
    updates = {
      ...updates,
      survivalCount: newSurvivalCount,
      survivalRate: Math.round(newSurvivalRate * 100) / 100
    };
  }
  if (record.plantedCountChange !== undefined && record.plantedCountChange !== 0) {
    newPlantedCount = Math.max(0, newPlantedCount + record.plantedCountChange);
    updates = {
      ...updates,
      plantedCount: newPlantedCount
    };
  }
  if (record.lossCountChange !== undefined && record.lossCountChange !== 0) {
    newLossCount = Math.max(0, newLossCount + record.lossCountChange);
    const newLossRate = seedling.initialCount > 0 ? (newLossCount / seedling.initialCount) * 100 : 0;
    updates = {
      ...updates,
      lossCount: newLossCount,
      lossRate: Math.round(newLossRate * 100) / 100
    };
  }

  // 状态自动转换逻辑
  let newStatus = seedling.status;
  if (record.abnormality && seedling.status !== SeedlingStatus.ABNORMAL) {
    // 有异常情况，标记为异常
    newStatus = SeedlingStatus.ABNORMAL;
    updates.status = newStatus;
  } else if (seedling.status === SeedlingStatus.IN_PROGRESS && newSurvivalCount > 0) {
    // 成活数量 > 0，从进行中转为待定植
    newStatus = SeedlingStatus.TRANSPLANT_READY;
    updates.status = newStatus;
  } else if (newPlantedCount >= newSurvivalCount && newSurvivalCount > 0) {
    // 定植数量 >= 成活数量，且有成活，从待定植转为已完成
    newStatus = SeedlingStatus.COMPLETED;
    updates.status = newStatus;
    updates.isFinished = true;
    updates.endDate = new Date().toISOString().slice(0, 10);
  }

  seedlings[index] = {
    ...seedling,
    ...updates,
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
 * V3.1 增加成活数量（入库时调用）
 * @param id 育苗ID
 * @param quantity 入库数量
 * @returns 是否成功
 */
export function addSeedlingSurvivalCount(id: string, quantity: number): boolean {
  const seedling = getSeedlingById(id);
  if (!seedling) return false;

  const newSurvivalCount = (seedling.survivalCount || 0) + quantity;

  updateSeedling(id, {
    survivalCount: newSurvivalCount
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

// ==================== 标签打印相关函数（新增） ====================

/**
 * 生成单个二维码编号
 * 格式：YM + 育苗批号 + 序号（3位）
 */
export function generateLabelNumber(seedlingCode: string, index: number): string {
  return `${seedlingCode}-${String(index).padStart(3, '0')}`;
}

/**
 * 打印标签
 * @param seedlingId 育苗ID
 * @param printType 打印类型
 * @param printCount 打印数量
 * @param operator 操作人员
 * @param labelNumbers 指定二维码编号（重打印时）
 */
export function printLabel(
  seedlingId: string,
  printType: LabelPrintType,
  printCount: number,
  operator: string,
  labelNumbers?: string[]
): PrintRecord | null {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling) return null;

  // 生成打印记录
  const printRecord: PrintRecord = {
    id: 'PR' + Date.now(),
    printTime: new Date().toLocaleString('zh-CN'),
    printType,
    printCount,
    operator,
    labelNumbers: labelNumbers || [],
    seedlingId
  };

  // 初始化打印记录数组
  if (!seedling.printRecords) {
    seedling.printRecords = [];
  }
  seedling.printRecords.push(printRecord);

  // 更新打印次数
  const newPrintCount = seedling.printCount + printCount;
  updateSeedling(seedlingId, {
    printRecords: seedling.printRecords,
    printCount: newPrintCount
  });

  return printRecord;
}

/**
 * 批量打印标签
 * @param seedlingIds 育苗ID列表
 * @param operator 操作人员
 */
export function batchPrintLabel(seedlingIds: string[], operator: string): PrintRecord[] {
  const results: PrintRecord[] = [];
  for (const id of seedlingIds) {
    const seedling = getSeedlingById(id);
    if (seedling) {
      const record = printLabel(id, LabelPrintType.BATCH, 1, operator);
      if (record) results.push(record);
    }
  }
  return results;
}

/**
 * 获取打印记录
 * @param seedlingId 育苗ID
 */
export function getPrintRecords(seedlingId: string): PrintRecord[] {
  const seedling = getSeedlingById(seedlingId);
  return seedling?.printRecords || [];
}

/**
 * 更新打印记录（用于追加二维码编号）
 * @param seedlingId 育苗ID
 * @param printRecordId 打印记录ID
 * @param labelNumbers 二维码编号列表
 */
export function updatePrintRecordLabelNumbers(seedlingId: string, printRecordId: string, labelNumbers: string[]): boolean {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling?.printRecords) return false;

  const recordIndex = seedling.printRecords.findIndex(r => r.id === printRecordId);
  if (recordIndex === -1) return false;

  seedling.printRecords[recordIndex].labelNumbers = labelNumbers;
  updateSeedling(seedlingId, { printRecords: seedling.printRecords });
  return true;
}

// ==================== 栽种记录相关函数（新增） ====================

/**
 * 添加栽种记录
 * @param seedlingId 育苗ID
 * @param record 栽种记录
 */
export function addTransplantRecord(seedlingId: string, record: Omit<TransplantRecord, 'id' | 'createTime'>): TransplantRecord | null {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling) return null;

  const newRecord: TransplantRecord = {
    ...record,
    id: 'TR' + Date.now(),
    createTime: new Date().toLocaleString('zh-CN')
  };

  if (!seedling.transplantRecords) {
    seedling.transplantRecords = [];
  }
  seedling.transplantRecords.push(newRecord);

  // 更新已定植数量
  const newPlantedCount = seedling.plantedCount + record.transplantCount;
  const newStatus = newPlantedCount >= seedling.survivalCount
    ? SeedlingStatus.COMPLETED
    : SeedlingStatus.TRANSPLANT_READY;

  updateSeedling(seedlingId, {
    transplantRecords: seedling.transplantRecords,
    plantedCount: newPlantedCount,
    status: newStatus
  });

  return newRecord;
}

/**
 * 获取栽种记录列表
 * @param seedlingId 育苗ID
 */
export function getTransplantRecords(seedlingId: string): TransplantRecord[] {
  const seedling = getSeedlingById(seedlingId);
  return seedling?.transplantRecords || [];
}

/**
 * 更新栽种记录状态
 * @param seedlingId 育苗ID
 * @param recordId 栽种记录ID
 * @param status 新状态
 */
export function updateTransplantRecordStatus(
  seedlingId: string,
  recordId: string,
  status: TransplantRecordStatus
): boolean {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling?.transplantRecords) return false;

  const recordIndex = seedling.transplantRecords.findIndex(r => r.id === recordId);
  if (recordIndex === -1) return false;

  seedling.transplantRecords[recordIndex].status = status;
  updateSeedling(seedlingId, { transplantRecords: seedling.transplantRecords });
  return true;
}

// ==================== 栽种履历相关函数（新增） ====================

/**
 * 添加栽种履历条目
 * @param seedlingId 育苗ID
 * @param labelNumber 二维码编号
 * @param historyItem 履历条目
 */
export function addTransplantHistoryItem(
  seedlingId: string,
  labelNumber: string,
  historyItem: Omit<TransplantHistory['history'][0], 'id'>
): TransplantHistory | null {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling) return null;

  if (!seedling.transplantHistory) {
    seedling.transplantHistory = [];
  }

  // 查找或创建该二维码的履历记录
  let historyRecord = seedling.transplantHistory.find(h => h.labelNumber === labelNumber);
  if (!historyRecord) {
    historyRecord = {
      id: 'TH' + Date.now(),
      seedlingId,
      labelNumber,
      currentArea: historyItem.toArea || '',
      status: TransplantRecordStatus.IN_STOCK,
      history: []
    };
    seedling.transplantHistory.push(historyRecord);
  }

  // 添加履历条目
  historyRecord.history.push({
    ...historyItem,
    id: 'THI' + Date.now()
  });

  // 更新当前位置
  if (historyItem.toArea) {
    historyRecord.currentArea = historyItem.toArea;
  }

  updateSeedling(seedlingId, { transplantHistory: seedling.transplantHistory });
  return historyRecord;
}

/**
 * 获取栽种履历列表
 * @param seedlingId 育苗ID
 */
export function getTransplantHistory(seedlingId: string): TransplantHistory[] {
  const seedling = getSeedlingById(seedlingId);
  return seedling?.transplantHistory || [];
}

/**
 * 获取指定二维码的履历
 * @param seedlingId 育苗ID
 * @param labelNumber 二维码编号
 */
export function getLabelTransplantHistory(seedlingId: string, labelNumber: string): TransplantHistory | undefined {
  const history = getTransplantHistory(seedlingId);
  return history.find(h => h.labelNumber === labelNumber);
}

/**
 * 更新履历中二维码的状态
 * @param seedlingId 育苗ID
 * @param labelNumber 二维码编号
 * @param status 新状态
 */
export function updateLabelStatus(
  seedlingId: string,
  labelNumber: string,
  status: TransplantRecordStatus
): boolean {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling?.transplantHistory) return false;

  const historyRecord = seedling.transplantHistory.find(h => h.labelNumber === labelNumber);
  if (!historyRecord) return false;

  historyRecord.status = status;
  updateSeedling(seedlingId, { transplantHistory: seedling.transplantHistory });
  return true;
}

/**
 * 生成育苗批号对应的所有二维码编号
 * @param seedlingId 育苗ID
 */
export function generateAllLabelNumbers(seedlingId: string): string[] {
  const seedling = getSeedlingById(seedlingId);
  if (!seedling) return [];

  const labels: string[] = [];
  for (let i = 0; i < seedling.initialCount; i++) {
    labels.push(generateLabelNumber(seedling.seedlingCode, i + 1));
  }
  return labels;
}
