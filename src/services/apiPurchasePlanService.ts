/**
 * 采购计划数据 API 服务
 * 对接后端 /api/purchase-plans
 * API失败时降级到 localStorage (purchasePlanService)
 */

import { apiClient } from './apiClient';
import { PurchasePlan, PurchasePlanItem } from './purchasePlanService';
import * as purchasePlanService from './purchasePlanService';

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

// ==================== API 函数（降级到localStorage）====================

export async function getPurchasePlans(): Promise<PurchasePlan[]> {
  try {
    const data = await apiClient.get<BackendPurchasePlan[]>('/purchase-plans');
    return transformPurchasePlan(data) as PurchasePlan[];
  } catch (error) {
    console.warn('[采购计划API] 获取失败，降级到localStorage:', error);
    return purchasePlanService.getPurchasePlans();
  }
}

export async function getPurchasePlanById(id: string): Promise<PurchasePlan | undefined> {
  try {
    const data = await apiClient.get<BackendPurchasePlan>(`/purchase-plans/${id}`);
    return transformPurchasePlan(data) as PurchasePlan;
  } catch (error) {
    console.warn('[采购计划API] 获取单个失败，降级到localStorage:', error);
    return purchasePlanService.getPurchasePlanById(id);
  }
}

export async function addPurchasePlan(plan: Omit<PurchasePlan, 'id'>): Promise<PurchasePlan> {
  try {
    const result = await apiClient.post<{ id: string }>('/purchase-plans', plan);
    return { ...plan, id: result.id } as PurchasePlan;
  } catch (error) {
    console.warn('[采购计划API] 创建失败，降级到localStorage:', error);
    return purchasePlanService.addPurchasePlan(plan);
  }
}

export async function updatePurchasePlan(id: string, updates: Partial<PurchasePlan>): Promise<PurchasePlan | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/purchase-plans/${id}`, updates);
    return result ? { ...updates, id } as PurchasePlan : null;
  } catch (error) {
    console.warn('[采购计划API] 更新失败，降级到localStorage:', error);
    return purchasePlanService.updatePurchasePlan(id, updates);
  }
}

export async function deletePurchasePlan(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/purchase-plans/${id}`);
    return true;
  } catch (error) {
    console.warn('[采购计划API] 删除失败，降级到localStorage:', error);
    return purchasePlanService.deletePurchasePlan(id);
  }
}

export async function deletePurchasePlans(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/purchase-plans/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('[采购计划API] 批量删除失败，降级到localStorage:', error);
    return purchasePlanService.deletePurchasePlans(ids);
  }
}

export async function resetPurchasePlans(): Promise<void> {
  try {
    await apiClient.post('/purchase-plans/reset');
  } catch (error) {
    console.warn('[采购计划API] 重置失败，降级到localStorage:', error);
  }
  purchasePlanService.resetPurchasePlans();
}
