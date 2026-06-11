/**
 * 采购计划数据 API 服务
 * 对接后端 /api/purchase-plans
 *
 * 数据流：API → enhancedApiClient → SQLite DB
 */

import { enhancedApiClient } from '../lib/apiClient';
// M-3: 改用 src/types/purchase 的 PurchasePlan（含 executionStatus 字段）
import type { PurchasePlan, PurchasePlanItem, PurchaseExecutionStatus } from '../types/purchase';
import { logger } from '../lib/logger';
import { z } from 'zod';

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
  executionStatus?: string;
  execution_status?: string;
  [key: string]: unknown;
}

// M-3: 用 zod 校验后端响应里的执行状态枚举，拒收非法值
const ExecutionStatusSchema = z.enum(['pending_execution', 'purchasing', 'completed', 'cancelled']);

/**
 * 安全解析后端返回的 executionStatus，失败时回退到 'pending_execution'
 */
function parseExecutionStatus(raw: unknown): PurchaseExecutionStatus {
  const parsed = ExecutionStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'pending_execution';
}

/**
 * M-12: 单条转换（明确契约：只接受单条）
 */
function transformSingle(item: BackendPurchasePlan): PurchasePlan {
  return {
    id: item.id,
    purchaseApplicationCode: item.purchaseApplicationCode || '',
    relatedBatchCode: item.relatedBatchCode || '',
    purchaseType: (item.purchaseType || 'other') as PurchasePlan['purchaseType'],
    purchaseTypeName: item.purchaseTypeName || '',
    applicant: item.applicant || '',
    applicantId: item.applicantId || '',
    applicantDepartment: item.applicantDepartment || '',
    applyDate: item.applyDate ? item.applyDate.split('T')[0] : '',
    requiredDate: item.requiredDate ? item.requiredDate.split('T')[0] : '',
    priority: (item.priority || 'normal') as PurchasePlan['priority'],
    priorityText: item.priorityText || '中',
    status: (item.status || 'draft') as PurchasePlan['status'],
    statusText: item.statusText || '草稿',
    // M-3: 强类型，不再用 as any；走 zod 校验白名单值
    executionStatus: parseExecutionStatus(item.executionStatus ?? item.execution_status),
    itemCount: item.itemCount || 0,
    items: Array.isArray(item.items) ? item.items.map(transformItem) : [],
    remark: item.remarks || '', // 后端字段名是 remarks，前端 PurchaseApplication 类型用 remark（兼容映射）
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
 * M-12: 数组转换（明确契约：只接受数组）
 */
function transformPurchasePlanArray(data: BackendPurchasePlan[]): PurchasePlan[] {
  return data.map(transformSingle);
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

// 注：transformSingle 已在 M-12 中提到文件顶部（强类型 + zod 校验 executionStatus）
// 旧的 transformPurchasePlan 双契约版本已删除，拆为 transformPurchasePlanArray（数组）+ transformSingle（单条）

/**
 * 获取所有采购计划
 * 数据流：API → SQLite DB
 */
export async function getPurchasePlans(): Promise<PurchasePlan[]> {
  const data = await enhancedApiClient.get<BackendPurchasePlan[]>('/purchase-plans');
  // M-12: 数组契约专用 transform
  return transformPurchasePlanArray(data);
}

/**
 * 根据ID获取单个采购计划
 * 数据流：API → SQLite DB
 */
export async function getPurchasePlanById(id: string): Promise<PurchasePlan | undefined> {
  const data = await enhancedApiClient.get<BackendPurchasePlan>(`/purchase-plans/${id}`);
  return data ? transformSingle(data) : undefined;
}

/**
 * 创建采购计划
 * 数据流：API → SQLite DB
 */
export async function addPurchasePlan(plan: Omit<PurchasePlan, 'id'>): Promise<PurchasePlan> {
  const result = await enhancedApiClient.post<BackendPurchasePlan>('/purchase-plans', plan);
  return transformSingle(result);
}

/**
 * 更新采购计划
 * 数据流：API → SQLite DB
 */
export async function updatePurchasePlan(id: string, updates: Partial<PurchasePlan>): Promise<PurchasePlan | null> {
  // enhancedApiClient 已自动解包 { success, data }，result 就是 plan 本身
  const result = await enhancedApiClient.put<BackendPurchasePlan>(`/purchase-plans/${id}`, updates);
  return result ? transformSingle(result) : null;
}

/**
 * 删除采购计划
 * 数据流：API → SQLite DB
 * P0-1 修复：4xx/5xx 由 enhancedApiClient 自动抛错，成功才返回 true
 */
export async function deletePurchasePlan(id: string): Promise<boolean> {
  try {
    await enhancedApiClient.delete(`/purchase-plans/${id}`);
    return true;
  } catch (error) {
    // 业务校验失败（如已审批/采购中）或网络错误统一返回 false，由调用方处理
    logger.error('[apiPurchasePlanService] deletePurchasePlan 失败', error);
    throw error;
  }
}

/**
 * 批量删除采购计划
 * 数据流：API → SQLite DB
 */
export async function deletePurchasePlans(
  ids: string[]
): Promise<{ deleted: number; skipped: { id: string; reason: string }[] }> {
  const result = await enhancedApiClient.post<{ deleted: number; skipped: { id: string; reason: string }[] }>(
    '/purchase-plans/batch-delete',
    { ids }
  );
  return result || { deleted: 0, skipped: [] };
}

/**
 * 重置采购计划
 */
export async function resetPurchasePlans(): Promise<void> {
  await enhancedApiClient.post('/purchase-plans/reset');
}

/**
 * 获取下一个可用的采购申请批次号
 * 规则：PA + YYYYMM + 4位流水号（基于数据库最大已用序号 +1）
 * 用于"生成"按钮和打开新建弹窗时的初始值
 */
export async function getNextPurchaseApplicationCode(): Promise<string> {
  const result = await enhancedApiClient.get<{ code: string }>('/purchase-plans/next-code');
  return result?.code || '';
}

/**
 * 更新采购执行状态（4 档白名单校验在后端）
 */
export async function updateExecutionStatus(
  id: string,
  executionStatus: string
): Promise<PurchasePlan | null> {
  // enhancedApiClient 已自动解包 { success, data }，result 就是 plan 本身
  const result = await enhancedApiClient.patch<BackendPurchasePlan>(
    `/purchase-plans/${id}/execution-status`,
    { executionStatus }
  );
  return result ? transformSingle(result) : null;
}
