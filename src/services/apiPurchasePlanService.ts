/**
 * 采购计划数据 API 服务
 * 对接后端 /api/purchase-plans
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { PurchasePlan, PurchasePlanItem } from './purchasePlanService';

// 后端返回的数据字段类型
interface BackendPurchasePlanItem {
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
  [key: string]: unknown;
}

interface BackendPurchasePlan {
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
  items: BackendPurchasePlanItem[];
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
  [key: string]: unknown;
}

/**
 * 将后端返回的数据转换为前端格式
 */
function transformPurchasePlan(data: BackendPurchasePlan | BackendPurchasePlan[]): PurchasePlan | PurchasePlan[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformItem(item: BackendPurchasePlanItem): PurchasePlanItem {
  return {
    id: item.id || '',
    materialId: item.materialId || '',
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    category: item.category || '',
    specification: item.specification || '',
    unit: item.unit || '',
    quantity: item.quantity || 0,
    estimatedPrice: item.estimatedPrice || 0,
    estimatedTotalPrice: item.estimatedTotalPrice || 0,
    supplier: item.supplier || '',
    location: item.location || '',
    batchNo: item.batchNo || '',
    productionDate: item.productionDate || '',
    expiryDate: item.expiryDate || '',
    purpose: item.purpose || '',
    remark: item.remark || '',
    relatedBatchCode: item.relatedBatchCode,
  };
}

function transformSingle(item: BackendPurchasePlan): PurchasePlan {
  return {
    id: item.id,
    purchaseApplicationCode: item.purchaseApplicationCode || '',
    relatedBatchCode: item.relatedBatchCode || '',
    purchaseType: item.purchaseType || '',
    purchaseTypeName: item.purchaseTypeName || '',
    applicant: item.applicant || '',
    applicantId: item.applicantId || '',
    applicantDepartment: item.applicantDepartment || '',
    applyDate: item.applyDate ? item.applyDate.split('T')[0] : '',
    requiredDate: item.requiredDate ? item.requiredDate.split('T')[0] : '',
    priority: item.priority || 'normal',
    priorityText: item.priorityText || '中',
    status: item.status || 'draft',
    statusText: item.statusText || '草稿',
    itemCount: item.itemCount || 0,
    items: Array.isArray(item.items) ? item.items.map(transformItem) : [],
    remarks: item.remarks || '',
    approvalPerson: item.approvalPerson || '',
    approvalStatus: item.approvalStatus || 'pending',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    planCode: item.planCode || '',
    planTitle: item.planTitle || '',
    planType: item.planType || '',
    departmentName: item.departmentName || '',
    applicantName: item.applicantName || '',
    applyDate2: item.applyDate2 || '',
    expectedDate: item.expectedDate || '',
    supplierId: item.supplierId || '',
    supplierName: item.supplierName || '',
    totalAmount: item.totalAmount || 0,
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
  };
}

/**
 * 获取所有采购计划
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPurchasePlans(): Promise<PurchasePlan[]> {
  const data = await enhancedApiClient.get<BackendPurchasePlan[]>('/purchase-plans');
  return transformPurchasePlan(data) as PurchasePlan[];
}

/**
 * 根据ID获取单个采购计划
 * 降级策略：API → IndexedDB 缓存
 */
export async function getPurchasePlanById(id: string): Promise<PurchasePlan | undefined> {
  const data = await enhancedApiClient.get<BackendPurchasePlan>(`/purchase-plans/${id}`);
  return transformPurchasePlan(data) as PurchasePlan;
}

/**
 * 创建采购计划
 * 降级策略：API → 离线队列
 */
export async function addPurchasePlan(plan: Omit<PurchasePlan, 'id'>): Promise<PurchasePlan> {
  const result = await enhancedApiClient.post<PurchasePlan>('/purchase-plans', plan);
  // POST 响应现在返回经过 mapToFrontendFormat 的完整数据
  return transformPurchasePlan(result) as PurchasePlan;
}

/**
 * 更新采购计划
 * 降级策略：API → 离线队列
 */
export async function updatePurchasePlan(id: string, updates: Partial<PurchasePlan>): Promise<PurchasePlan | null> {
  const result = await enhancedApiClient.put<{ data: PurchasePlan }>(`/purchase-plans/${id}`, updates);
  // PUT 响应现在返回经过 mapToFrontendFormat 的完整更新数据
  return result?.data ? transformPurchasePlan(result.data) as PurchasePlan : null;
}

/**
 * 删除采购计划
 * 降级策略：API → 离线队列
 */
export async function deletePurchasePlan(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/purchase-plans/${id}`);
  return true;
}

/**
 * 批量删除采购计划
 * 降级策略：API → 离线队列
 */
export async function deletePurchasePlans(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/purchase-plans/batch-delete', { ids });
  return true;
}

/**
 * 重置采购计划（仅调用后端，不做降级）
 */
export async function resetPurchasePlans(): Promise<void> {
  await enhancedApiClient.post('/purchase-plans/reset');
}
