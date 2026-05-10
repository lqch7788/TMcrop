/**
 * 生产计划数据服务
 * 使用 localStorage 实现数据持久化
 */

const STORAGE_KEY = 'production_plans';

// 生产计划类型
export interface ProductionPlan {
  id: string;
  batchCode: string;
  batchName: string;
  planType: string;
  cropName: string;
  variety: string;
  greenhouseName: string;
  areaName: string;
  targetQuantity: number;
  actualYield: number;
  startDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string;
  status: string;
  priority: string;
  remarks: string;
  publisher: string;
  createTime: string;
  updateTime: string;
  responsiblePerson: string;
  unit: string;
  publishDate: string;
  batchStatus: string;
  planDetail: string;
  planDetailFileName: string;
  plantingArea: number;
  plantingMode: string;
  supplierName: string;
  seedlingSiteName: string;
  seedQuantity: number;
  targetSeedlingCount: number;
}

// 初始化默认数据
const defaultData: ProductionPlan[] = [
  {
    id: 'PP001',
    batchCode: 'JZB2026-001',
    batchName: '红果番茄种源采购计划',
    planType: 'seed_breeding',
    cropName: '红果番茄',
    variety: '番茄',
    greenhouseName: '',
    areaName: '',
    targetQuantity: 50,
    actualYield: 50,
    startDate: '2026-01-15',
    expectedHarvestDate: '',
    actualHarvestDate: '',
    status: 'completed',
    priority: 'medium',
    remarks: '用于种源库补充',
    publisher: '李明辉',
    createTime: '2026-01-15T10:00:00.000Z',
    updateTime: '2026-04-20T14:30:00.000Z',
    responsiblePerson: '李明辉',
    unit: 'kg',
    publishDate: '2026-01-10',
    batchStatus: 'completed',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '北京某种子公司',
    seedlingSiteName: '',
    seedQuantity: 50,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP002',
    batchCode: 'JZB2026-002',
    batchName: '大叶生菜种源采购计划',
    planType: 'seed_breeding',
    cropName: '大叶生菜',
    variety: '生菜',
    greenhouseName: '',
    areaName: '',
    targetQuantity: 30,
    actualYield: 30,
    startDate: '2026-02-01',
    expectedHarvestDate: '',
    actualHarvestDate: '',
    status: 'completed',
    priority: 'low',
    remarks: '',
    publisher: '王建国',
    createTime: '2026-02-01T09:00:00.000Z',
    updateTime: '2026-04-18T11:20:00.000Z',
    responsiblePerson: '王建国',
    unit: 'kg',
    publishDate: '2026-01-25',
    batchStatus: 'completed',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '山东寿光种子基地',
    seedlingSiteName: '',
    seedQuantity: 30,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP003',
    batchCode: 'JZB2026-003',
    batchName: '水果黄瓜种源采购计划',
    planType: 'seed_breeding',
    cropName: '水果黄瓜',
    variety: '黄瓜',
    greenhouseName: '',
    areaName: '',
    targetQuantity: 40,
    actualYield: 40,
    startDate: '2026-02-15',
    expectedHarvestDate: '',
    actualHarvestDate: '',
    status: 'completed',
    priority: 'medium',
    remarks: '',
    publisher: '李明辉',
    createTime: '2026-02-15T14:00:00.000Z',
    updateTime: '2026-04-20T09:00:00.000Z',
    responsiblePerson: '李明辉',
    unit: 'kg',
    publishDate: '2026-02-10',
    batchStatus: 'completed',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '上海蔬菜种子公司',
    seedlingSiteName: '',
    seedQuantity: 40,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP004',
    batchCode: 'JZB2026-004',
    batchName: '紫长茄子种源采购计划',
    planType: 'seed_breeding',
    cropName: '紫长茄子',
    variety: '茄子',
    greenhouseName: '',
    areaName: '',
    targetQuantity: 20,
    actualYield: 20,
    startDate: '2026-03-01',
    expectedHarvestDate: '',
    actualHarvestDate: '',
    status: 'completed',
    priority: 'high',
    remarks: '紧急采购',
    publisher: '张伟',
    createTime: '2026-03-01T08:30:00.000Z',
    updateTime: '2026-04-15T16:00:00.000Z',
    responsiblePerson: '张伟',
    unit: 'kg',
    publishDate: '2026-02-25',
    batchStatus: 'completed',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '南京农科院种子站',
    seedlingSiteName: '',
    seedQuantity: 20,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP005',
    batchCode: 'YMB2026-001',
    batchName: '大叶空心菜扦插苗培育计划',
    planType: 'seedling',
    cropName: '大叶空心菜',
    variety: '空心菜',
    greenhouseName: '育苗基地A区',
    areaName: '',
    targetQuantity: 100,
    actualYield: 100,
    startDate: '2026-03-10',
    expectedHarvestDate: '2026-03-25',
    actualHarvestDate: '',
    status: 'in_progress',
    priority: 'medium',
    remarks: '自繁扦插苗',
    publisher: '王建国',
    createTime: '2026-03-10T09:00:00.000Z',
    updateTime: '2026-04-20T10:00:00.000Z',
    responsiblePerson: '王建国',
    unit: '株',
    publishDate: '2026-03-05',
    batchStatus: 'in_progress',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '',
    seedlingSiteName: '育苗基地A区',
    seedQuantity: 0,
    targetSeedlingCount: 100,
  },
  {
    id: 'PP006',
    batchCode: 'YMB2026-002',
    batchName: '黑美人西瓜嫁接苗培育计划',
    planType: 'seedling',
    cropName: '黑美人西瓜',
    variety: '西瓜',
    greenhouseName: '育苗基地B区',
    areaName: '',
    targetQuantity: 50,
    actualYield: 50,
    startDate: '2026-03-15',
    expectedHarvestDate: '2026-04-10',
    actualHarvestDate: '',
    status: 'in_progress',
    priority: 'high',
    remarks: '委托培育嫁接苗',
    publisher: '李明辉',
    createTime: '2026-03-15T14:00:00.000Z',
    updateTime: '2026-04-18T16:00:00.000Z',
    responsiblePerson: '李明辉',
    unit: '株',
    publishDate: '2026-03-10',
    batchStatus: 'in_progress',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '',
    seedlingSiteName: '育苗基地B区',
    seedQuantity: 0,
    targetSeedlingCount: 50,
  },
  {
    id: 'PP007',
    batchCode: 'YMB2026-003',
    batchName: '奶油生菜组培苗培育计划',
    planType: 'seedling',
    cropName: '奶油生菜',
    variety: '生菜',
    greenhouseName: '组培中心',
    areaName: '',
    targetQuantity: 200,
    actualYield: 200,
    startDate: '2026-03-20',
    expectedHarvestDate: '2026-04-15',
    actualHarvestDate: '',
    status: 'in_progress',
    priority: 'medium',
    remarks: '省农业厅赠送组培苗',
    publisher: '张伟',
    createTime: '2026-03-20T10:00:00.000Z',
    updateTime: '2026-04-19T09:00:00.000Z',
    responsiblePerson: '张伟',
    unit: '株',
    publishDate: '2026-03-15',
    batchStatus: 'in_progress',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 0,
    plantingMode: '',
    supplierName: '',
    seedlingSiteName: '组培中心',
    seedQuantity: 0,
    targetSeedlingCount: 200,
  },
  {
    id: 'PP008',
    batchCode: 'ZZB2026-001',
    batchName: 'A1区散叶生菜种植计划',
    planType: 'planting',
    cropName: '散叶生菜',
    variety: '散叶生菜',
    greenhouseName: 'A1区',
    areaName: 'A1区',
    targetQuantity: 500,
    actualYield: 0,
    startDate: '2026-04-01',
    expectedHarvestDate: '2026-05-15',
    actualHarvestDate: '',
    status: 'planning',
    priority: 'high',
    remarks: '春季种植计划',
    publisher: '王建国',
    createTime: '2026-03-25T10:00:00.000Z',
    updateTime: '2026-03-25T10:00:00.000Z',
    responsiblePerson: '王建国',
    unit: 'kg',
    publishDate: '2026-03-28',
    batchStatus: 'published',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 1000,
    plantingMode: '水培',
    supplierName: '',
    seedlingSiteName: '',
    seedQuantity: 0,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP009',
    batchCode: 'ZZB2026-002',
    batchName: 'B2区黑美人西瓜种植计划',
    planType: 'planting',
    cropName: '黑美人西瓜',
    variety: '黑美人',
    greenhouseName: 'B2区',
    areaName: 'B2区',
    targetQuantity: 2000,
    actualYield: 0,
    startDate: '2026-03-20',
    expectedHarvestDate: '2026-06-15',
    actualHarvestDate: '',
    status: 'in_progress',
    priority: 'medium',
    remarks: '春季大棚西瓜',
    publisher: '李明辉',
    createTime: '2026-03-15T09:00:00.000Z',
    updateTime: '2026-03-20T08:00:00.000Z',
    responsiblePerson: '李明辉',
    unit: 'kg',
    publishDate: '2026-03-18',
    batchStatus: 'in_progress',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 2000,
    plantingMode: '大棚种植',
    supplierName: '',
    seedlingSiteName: '',
    seedQuantity: 0,
    targetSeedlingCount: 0,
  },
  {
    id: 'PP010',
    batchCode: 'ZZB2026-003',
    batchName: 'C3区圆叶菠菜种植计划',
    planType: 'planting',
    cropName: '圆叶菠菜',
    variety: '圆叶菠菜',
    greenhouseName: 'C3区',
    areaName: 'C3区',
    targetQuantity: 800,
    actualYield: 0,
    startDate: '2026-04-10',
    expectedHarvestDate: '2026-05-20',
    actualHarvestDate: '',
    status: 'planning',
    priority: 'low',
    remarks: '轮作计划',
    publisher: '张伟',
    createTime: '2026-04-05T14:00:00.000Z',
    updateTime: '2026-04-05T14:00:00.000Z',
    responsiblePerson: '张伟',
    unit: 'kg',
    publishDate: '2026-04-08',
    batchStatus: 'draft',
    planDetail: '',
    planDetailFileName: '',
    plantingArea: 800,
    plantingMode: '露地种植',
    supplierName: '',
    seedlingSiteName: '',
    seedQuantity: 0,
    targetSeedlingCount: 0,
  },
];

/**
 * 从 localStorage 读取数据
 */
function getStoredData(): ProductionPlan[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('生产计划数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 保存数据到 localStorage
 */
function saveData(data: ProductionPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ==================== 对外接口 ====================

/**
 * 获取所有生产计划
 */
export function getProductionPlans(): ProductionPlan[] {
  return getStoredData();
}

/**
 * 根据ID获取单个生产计划
 */
export function getProductionPlanById(id: string): ProductionPlan | undefined {
  const data = getStoredData();
  return data.find(item => item.id === id);
}

/**
 * 根据批次号获取生产计划
 */
export function getProductionPlanByCode(batchCode: string): ProductionPlan | undefined {
  const data = getStoredData();
  return data.find(item => item.batchCode === batchCode);
}

/**
 * 根据状态获取生产计划
 */
export function getProductionPlansByStatus(status: string): ProductionPlan[] {
  const data = getStoredData();
  return data.filter(item => item.status === status);
}

/**
 * 根据类型获取生产计划
 */
export function getProductionPlansByType(planType: string): ProductionPlan[] {
  const data = getStoredData();
  return data.filter(item => item.planType === planType);
}

/**
 * 添加生产计划
 */
export function addProductionPlan(plan: Omit<ProductionPlan, 'id'>): ProductionPlan {
  const data = getStoredData();
  const newPlan: ProductionPlan = {
    ...plan,
    id: `PP${Date.now()}`,
  };
  data.unshift(newPlan);
  saveData(data);
  return newPlan;
}

/**
 * 更新生产计划
 */
export function updateProductionPlan(id: string, updates: Partial<ProductionPlan>): ProductionPlan | null {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = { ...data[index], ...updates };
  saveData(data);
  return data[index];
}

/**
 * 删除生产计划
 */
export function deleteProductionPlan(id: string): boolean {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return false;

  data.splice(index, 1);
  saveData(data);
  return true;
}

/**
 * 批量删除生产计划
 */
export function deleteProductionPlans(ids: string[]): boolean {
  const data = getStoredData();
  const filtered = data.filter(item => !ids.includes(item.id));
  if (filtered.length === data.length) return false;
  saveData(filtered);
  return true;
}

/**
 * 重置数据到默认状态
 */
export function resetProductionPlans(): void {
  saveData(defaultData);
}
