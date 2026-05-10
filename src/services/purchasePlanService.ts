/**
 * 采购计划数据服务
 * 使用 localStorage 实现数据持久化
 */

const STORAGE_KEY = 'purchase_plans';

// 采购计划类型
export interface PurchasePlanItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  estimatedTotalPrice: number;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  purpose: string;
  remark: string;
  relatedBatchCode?: string;
}

export interface PurchasePlan {
  id: string;
  purchaseApplicationCode: string;
  relatedBatchCode: string;
  purchaseType: string;
  purchaseTypeName: string;
  applicant: string;
  applicantId: string;
  applicantDepartment: string;
  applyDate: string;
  requiredDate: string;
  priority: string;
  priorityText: string;
  status: string;
  statusText: string;
  itemCount: number;
  items: PurchasePlanItem[];
  remarks: string;
  approvalPerson: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  planCode: string;
  planTitle: string;
  planType: string;
  departmentName: string;
  applicantName: string;
  applyDate2: string;
  expectedDate: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  attachments: string[];
}

// 初始化默认数据
const defaultData: PurchasePlan[] = [
  {
    id: 'PP001',
    purchaseApplicationCode: 'PA202601001',
    relatedBatchCode: 'ZZB2026-001',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '郭靖',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-01-05',
    requiredDate: '2026-02-15',
    priority: 'high',
    priorityText: '高',
    status: 'completed',
    statusText: '已完成',
    itemCount: 2,
    items: [
      {
        id: 'I001',
        materialId: 'MT001',
        materialCode: 'SP0202001',
        materialName: '尿素',
        category: '肥料与土壤改良剂-化学肥料',
        specification: '46% 50kg/袋',
        unit: '袋',
        quantity: 50,
        estimatedPrice: 120,
        estimatedTotalPrice: 6000,
        supplier: '鑫源农资公司',
        location: 'A区-01-01',
        batchNo: 'F20240101',
        productionDate: '2024-01-10',
        expiryDate: '2026-01-10',
        purpose: '春季基肥施用',
        remark: '用于番茄种植区',
        relatedBatchCode: 'ZZB2026-001',
      },
      {
        id: 'I002',
        materialId: 'MT002',
        materialCode: 'SP0201001',
        materialName: '商品有机肥',
        category: '肥料与土壤改良剂-有机肥',
        specification: '40kg/袋',
        unit: '袋',
        quantity: 30,
        estimatedPrice: 85,
        estimatedTotalPrice: 2550,
        supplier: '鑫源农资公司',
        location: 'A区-01-02',
        batchNo: 'U20240102',
        productionDate: '2024-01-15',
        expiryDate: '2026-01-15',
        purpose: '追肥使用',
        remark: '分两次施用',
        relatedBatchCode: 'ZZB2026-001',
      },
    ],
    remarks: '春季番茄种植基肥和追肥采购',
    approvalPerson: 'Susan',
    approvalStatus: 'approved',
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-02-15T10:00:00.000Z',
    planCode: 'PA202601001',
    planTitle: '生产物资采购 - PA202601001',
    planType: 'production',
    departmentName: '生产部',
    applicantName: '郭靖',
    applyDate2: '2026-01-05',
    expectedDate: '2026-02-15',
    supplierId: '',
    supplierName: '鑫源农资公司',
    totalAmount: 8550,
    attachments: [],
  },
  {
    id: 'PP002',
    purchaseApplicationCode: 'PA202601002',
    relatedBatchCode: 'ZZB2026-002',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '黄蓉',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-02-10',
    requiredDate: '2026-03-20',
    priority: 'high',
    priorityText: '高',
    status: 'in_progress',
    statusText: '执行中',
    itemCount: 2,
    items: [
      {
        id: 'I003',
        materialId: 'MT003',
        materialCode: 'SP0203001',
        materialName: '水溶肥',
        category: '肥料与土壤改良剂-水溶肥',
        specification: '20-20-20 5kg/袋',
        unit: '袋',
        quantity: 40,
        estimatedPrice: 150,
        estimatedTotalPrice: 6000,
        supplier: '丰达化肥厂',
        location: 'A区-02-01',
        batchNo: 'WF20240201',
        productionDate: '2024-02-01',
        expiryDate: '2025-08-01',
        purpose: '叶面喷施',
        remark: '稀释1000倍使用',
        relatedBatchCode: 'ZZB2026-002',
      },
      {
        id: 'I004',
        materialId: 'MT002',
        materialCode: 'SP0202001',
        materialName: '尿素',
        category: '肥料与土壤改良剂-化学肥料',
        specification: '46% 50kg/袋',
        unit: '袋',
        quantity: 60,
        estimatedPrice: 85,
        estimatedTotalPrice: 5100,
        supplier: '丰达化肥厂',
        location: 'A区-01-02',
        batchNo: 'U20240201',
        productionDate: '2024-02-05',
        expiryDate: '2026-02-05',
        purpose: '根部追肥',
        remark: '分三次施用',
        relatedBatchCode: 'ZZB2026-002',
      },
    ],
    remarks: '黄瓜种植水溶肥和尿素采购',
    approvalPerson: 'Susan',
    approvalStatus: 'approved',
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    planCode: 'PA202601002',
    planTitle: '生产物资采购 - PA202601002',
    planType: 'production',
    departmentName: '生产部',
    applicantName: '黄蓉',
    applyDate2: '2026-02-10',
    expectedDate: '2026-03-20',
    supplierId: '',
    supplierName: '丰达化肥厂',
    totalAmount: 11100,
    attachments: [],
  },
  {
    id: 'PP003',
    purchaseApplicationCode: 'PA202601003',
    relatedBatchCode: 'SC202604001',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '杨过',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-03-01',
    requiredDate: '2026-05-01',
    priority: 'high',
    priorityText: '高',
    status: 'pending',
    statusText: '待审批',
    itemCount: 2,
    items: [
      {
        id: 'I005',
        materialId: 'MT001',
        materialCode: 'SP0202001',
        materialName: '尿素',
        category: '肥料与土壤改良剂-化学肥料',
        specification: '46% 50kg/袋',
        unit: '袋',
        quantity: 80,
        estimatedPrice: 120,
        estimatedTotalPrice: 9600,
        supplier: '待确定',
        location: '待分配',
        batchNo: '',
        productionDate: '',
        expiryDate: '2026-05-01',
        purpose: '夏季基肥',
        remark: '用于黄瓜种植区',
        relatedBatchCode: 'SC202604001',
      },
      {
        id: 'I006',
        materialId: 'MT003',
        materialCode: 'SP0203001',
        materialName: '水溶肥',
        category: '肥料与土壤改良剂-水溶肥',
        specification: '20-20-20 5kg/袋',
        unit: '袋',
        quantity: 60,
        estimatedPrice: 150,
        estimatedTotalPrice: 9000,
        supplier: '待确定',
        location: '待分配',
        batchNo: '',
        productionDate: '',
        expiryDate: '2025-11-01',
        purpose: '滴灌施用',
        remark: '配合滴灌系统使用',
        relatedBatchCode: 'SC202604001',
      },
    ],
    remarks: '茄子种植基地夏季肥料储备',
    approvalPerson: 'Susan',
    approvalStatus: 'pending',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    planCode: 'PA202601003',
    planTitle: '生产物资采购 - PA202601003',
    planType: 'production',
    departmentName: '生产部',
    applicantName: '杨过',
    applyDate2: '2026-03-01',
    expectedDate: '2026-05-01',
    supplierId: '',
    supplierName: '待确定',
    totalAmount: 18600,
    attachments: [],
  },
];

/**
 * 从 localStorage 读取数据
 */
function getStoredData(): PurchasePlan[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('采购计划数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 保存数据到 localStorage
 */
function saveData(data: PurchasePlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ==================== 对外接口 ====================

/**
 * 获取所有采购计划
 */
export function getPurchasePlans(): PurchasePlan[] {
  return getStoredData();
}

/**
 * 根据ID获取单个采购计划
 */
export function getPurchasePlanById(id: string): PurchasePlan | undefined {
  const data = getStoredData();
  return data.find(item => item.id === id);
}

/**
 * 根据状态获取采购计划
 */
export function getPurchasePlansByStatus(status: string): PurchasePlan[] {
  const data = getStoredData();
  return data.filter(item => item.status === status);
}

/**
 * 添加采购计划
 */
export function addPurchasePlan(plan: Omit<PurchasePlan, 'id'>): PurchasePlan {
  const data = getStoredData();
  const newPlan: PurchasePlan = {
    ...plan,
    id: `PP${Date.now()}`,
  };
  data.unshift(newPlan);
  saveData(data);
  return newPlan;
}

/**
 * 更新采购计划
 */
export function updatePurchasePlan(id: string, updates: Partial<PurchasePlan>): PurchasePlan | null {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = { ...data[index], ...updates };
  saveData(data);
  return data[index];
}

/**
 * 删除采购计划
 */
export function deletePurchasePlan(id: string): boolean {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return false;

  data.splice(index, 1);
  saveData(data);
  return true;
}

/**
 * 批量删除采购计划
 */
export function deletePurchasePlans(ids: string[]): boolean {
  const data = getStoredData();
  const filtered = data.filter(item => !ids.includes(item.id));
  if (filtered.length === data.length) return false;
  saveData(filtered);
  return true;
}

/**
 * 重置数据到默认状态
 */
export function resetPurchasePlans(): void {
  saveData(defaultData);
}
