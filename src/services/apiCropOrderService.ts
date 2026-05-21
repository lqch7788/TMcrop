/**
 * 作物订单数据 API 服务
 * 对接后端 /api/crop-orders
 *
 * 三级降级策略：
 * - GET 请求：API → IndexedDB缓存 → localStorage
 * - POST/PUT/DELETE：API → localStorage（失败时作为降级）
 *
 * 核心原则：服务器数据是唯一真相来源
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropOrder, CropOrderStatus } from '../types/crop';

const STORAGE_KEY = 'crop_orders_local';
const PENDING_ORDERS_KEY = 'crop_orders_pending';

/**
 * 从 localStorage 获取本地订单数据
 */
function getLocalOrders(): CropOrder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 保存订单到 localStorage
 */
function saveLocalOrders(orders: CropOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('[apiCropOrderService] 保存到localStorage失败:', error);
  }
}

/**
 * 获取待同步的订单（创建但未成功同步到服务器的）
 */
function getPendingOrders(): CropOrder[] {
  try {
    const stored = localStorage.getItem(PENDING_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 保存待同步订单
 */
function savePendingOrders(orders: CropOrder[]): void {
  try {
    localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('[apiCropOrderService] 保存待同步订单失败:', error);
  }
}

/**
 * 添加订单到待同步队列
 */
function addToPendingOrders(order: CropOrder): void {
  const pending = getPendingOrders();
  const exists = pending.find(o => o.id === order.id);
  if (!exists) {
    pending.push(order);
    savePendingOrders(pending);
  }
}

/**
 * 从待同步队列移除订单
 */
function removeFromPendingOrders(orderId: string): void {
  const pending = getPendingOrders();
  const filtered = pending.filter(o => o.id !== orderId);
  savePendingOrders(filtered);
}

/**
 * 将前端驼峰命名字段转换为后端蛇形命名字段
 */
function toSnakeCase(data: Record<string, unknown>): Record<string, unknown> {
  const snakeMap: Record<string, string> = {
    orderCode: 'order_code',
    orderName: 'order_name',
    orderType: 'order_type',
    cropName: 'crop_name',
    cropVariety: 'crop_variety',
    cropCategory: 'crop_category',
    plannedQuantity: 'planned_quantity',
    actualQuantity: 'actual_quantity',
    unitPrice: 'unit_price',
    totalAmount: 'total_amount',
    customerName: 'customer_name',
    customerContact: 'customer_contact',
    deliveryAddress: 'delivery_address',
    orderDate: 'order_date',
    expectedDeliveryDate: 'expected_delivery_date',
    actualDeliveryDate: 'actual_delivery_date',
    expectedHarvestDate: 'expected_harvest_date',
    supplierName: 'supplier_name',
    unit: 'unit',
    remarks: 'remarks',
    status: 'status',
    createBy: 'create_by',
    updateTime: 'update_time',
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'instanceIds') continue;
    const snakeKey = snakeMap[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/**
 * 获取所有订单
 * 三级降级：API → IndexedDB缓存 → localStorage
 */
export async function getOrders(): Promise<CropOrder[]> {
  // 第一级：尝试从 API 获取
  try {
    const data = await enhancedApiClient.get<CropOrder[]>('/crop-orders');

    if (data && Array.isArray(data) && data.length > 0) {
      // API 成功，更新 localStorage 缓存
      saveLocalOrders(data);
      return data;
    }
  } catch (error) {
    console.warn('[apiCropOrderService] API获取失败，降级到本地存储:', error);
  }

  // 第二级：尝试从 localStorage 获取
  const localOrders = getLocalOrders();
  if (localOrders.length > 0) {
    console.log('[apiCropOrderService] 使用localStorage缓存数据');
    return localOrders;
  }

  // 第三级：返回空数组（无数据可用）
  return [];
}

/**
 * 根据ID获取单个订单
 */
export async function getOrderById(id: string): Promise<CropOrder | undefined> {
  try {
    return await enhancedApiClient.get<CropOrder>(`/crop-orders/${id}`);
  } catch (error) {
    console.warn('[apiCropOrderService] 获取订单详情失败:', error);
    // 尝试从本地存储查找
    const localOrders = getLocalOrders();
    return localOrders.find(o => o.id === id);
  }
}

/**
 * 创建订单
 * 三级降级：API成功 → 失败写入localStorage
 */
export async function createOrder(
  orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>
): Promise<CropOrder> {
  // 生成临时 ID（用于本地存储）
  const tempId = `ORD${Date.now()}`;
  const now = new Date().toISOString();

  // 构建完整的订单对象（用于本地存储降级）
  const localOrder: CropOrder = {
    ...orderData,
    id: tempId,
    orderCode: '', // 待服务器返回
    createTime: now,
    updateTime: now,
  } as CropOrder;

  // 第一级：尝试调用 API
  try {
    const snakeData = toSnakeCase(orderData as Record<string, unknown>);
    const result = await enhancedApiClient.post<CropOrder>('/crop-orders', snakeData);

    console.log('[apiCropOrderService] 创建订单成功:', result);
    return result;
  } catch (error) {
    console.warn('[apiCropOrderService] API创建失败，降级到localStorage:', error);

    // 第二级：失败时写入 localStorage
    const localOrders = getLocalOrders();
    localOrders.unshift(localOrder); // 新订单在前
    saveLocalOrders(localOrders);

    // 添加到待同步队列（联网后尝试同步）
    addToPendingOrders(localOrder);

    console.log('[apiCropOrderService] 订单已保存到本地，等待同步');
    return localOrder;
  }
}

/**
 * 更新订单
 * 三级降级：API成功 → 失败写入localStorage
 */
export async function updateOrder(
  id: string,
  updates: Partial<CropOrder>
): Promise<CropOrder | null> {
  // 第一级：尝试调用 API
  try {
    const snakeData = toSnakeCase(updates as Record<string, unknown>);
    await enhancedApiClient.put(`/crop-orders/${id}`, snakeData);

    // API 成功，尝试获取更新后的数据
    return await getOrderById(id);
  } catch (error) {
    console.warn('[apiCropOrderService] API更新失败，降级到localStorage:', error);

    // 第二级：失败时更新 localStorage
    const localOrders = getLocalOrders();
    const index = localOrders.findIndex(o => o.id === id);

    if (index !== -1) {
      localOrders[index] = {
        ...localOrders[index],
        ...updates,
        updateTime: new Date().toISOString(),
      };
      saveLocalOrders(localOrders);
      return localOrders[index];
    }

    return null;
  }
}

/**
 * 删除订单
 * 三级降级：API成功 → 失败标记删除
 */
export async function deleteOrder(id: string): Promise<boolean> {
  // 第一级：尝试调用 API
  try {
    await enhancedApiClient.delete(`/crop-orders/${id}`);
    return true;
  } catch (error) {
    console.warn('[apiCropOrderService] API删除失败，标记本地删除:', error);

    // 第二级：失败时从 localStorage 标记删除
    const localOrders = getLocalOrders();
    const filtered = localOrders.filter(o => o.id !== id);
    saveLocalOrders(filtered);

    // 从待同步队列移除
    removeFromPendingOrders(id);

    return true;
  }
}

/**
 * 批量删除订单
 */
export async function deleteOrders(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    await deleteOrder(id);
  }
  return true;
}

/**
 * 关联实例到订单
 */
export async function linkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  try {
    await enhancedApiClient.post(`/crop-orders/${orderId}/link-instances`, { instanceIds });
    return true;
  } catch (error) {
    console.warn('[apiCropOrderService] 关联实例失败:', error);
    return false;
  }
}

/**
 * 从订单取消关联实例
 */
export async function unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean> {
  try {
    await enhancedApiClient.post(`/crop-orders/${orderId}/unlink-instances`, { instanceIds });
    return true;
  } catch (error) {
    console.warn('[apiCropOrderService] 取消关联实例失败:', error);
    return false;
  }
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean> {
  try {
    await enhancedApiClient.put(`/crop-orders/${id}/status`, { status });
    return true;
  } catch (error) {
    console.warn('[apiCropOrderService] 更新订单状态失败:', error);
    // 降级到本地更新
    await updateOrder(id, { status });
    return true;
  }
}

/**
 * 重置数据到默认状态（仅调用后端）
 */
export async function resetOrders(): Promise<void> {
  await enhancedApiClient.post('/crop-orders/reset');
}

/**
 * 订单统计数据
 */
export interface OrderStats {
  total: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
}

/**
 * 从后端获取订单统计数据
 */
export async function getOrderStats(): Promise<OrderStats | null> {
  try {
    const backendStats = await enhancedApiClient.get<{
      total: number;
      pending: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      total_amount: number;
    }>('/crop-orders/stats/summary');

    return {
      total: backendStats.total,
      inProgress: backendStats.confirmed + backendStats.processing,
      completed: backendStats.delivered + backendStats.shipped,
      thisMonth: 0,
    };
  } catch (error) {
    console.warn('[apiCropOrderService] 获取订单统计失败:', error);
    return null;
  }
}

/**
 * 同步待处理的订单到服务器
 * 联网时调用此函数尝试同步本地创建的订单
 */
export async function syncPendingOrders(): Promise<{ success: number; failed: number }> {
  const pending = getPendingOrders();
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`[apiCropOrderService] 开始同步 ${pending.length} 条待处理订单`);

  let success = 0;
  let failed = 0;

  for (const order of pending) {
    try {
      const snakeData = toSnakeCase(order as Record<string, unknown>);
      const result = await enhancedApiClient.post<CropOrder>('/crop-orders', snakeData);

      // 同步成功，从待同步队列移除，并更新本地存储的 ID
      removeFromPendingOrders(order.id);

      // 更新本地订单的 ID（临时ID → 服务器返回的真实ID）
      const localOrders = getLocalOrders();
      const index = localOrders.findIndex(o => o.id === order.id);
      if (index !== -1 && result && result.id !== order.id) {
        localOrders[index] = { ...localOrders[index], id: result.id };
        saveLocalOrders(localOrders);
      }

      success++;
      console.log(`[apiCropOrderService] 同步订单成功: ${order.id} -> ${result?.id}`);
    } catch (error) {
      console.warn(`[apiCropOrderService] 同步订单失败: ${order.id}`, error);
      failed++;
    }
  }

  console.log(`[apiCropOrderService] 同步完成: 成功 ${success}, 失败 ${failed}`);
  return { success, failed };
}

/**
 * 获取本地存储的订单数量（用于诊断）
 */
export function getLocalOrdersCount(): number {
  return getLocalOrders().length;
}

/**
 * 获取待同步订单数量（用于诊断）
 */
export function getPendingOrdersCount(): number {
  return getPendingOrders().length;
}
