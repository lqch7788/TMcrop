// ============================================================
// 采购计划状态管理
// 使用 localStorage 持久化状态更新，支持审批联动
// ============================================================

import type { PurchasePlan } from '../types/purchase';
import { purchasePlans as initialPurchasePlans } from '../data/mockData';
import { apiClient, USE_API } from '../services/apiClient';

const STORAGE_KEY = 'purchase_plan_status_updates';

// 采购计划状态更新记录
interface PurchasePlanStatusUpdate {
  planId: string;
  status: string;
  statusText: string;
  updatedAt: string;
}

// 获取所有状态更新
function getStatusUpdates(): Record<string, PurchasePlanStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// 保存状态更新
function saveStatusUpdate(planId: string, status: string, statusText: string): void {
  const updates = getStatusUpdates();
  updates[planId] = {
    planId,
    status,
    statusText,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

// 更新采购计划状态
export function updatePurchasePlanStatus(planId: string, status: string, statusText: string): void {
  saveStatusUpdate(planId, status, statusText);
  // 触发自定义事件，让组件可以刷新数据
  window.dispatchEvent(new CustomEvent('purchasePlanStatusChanged', { detail: { planId, status, statusText } }));
}

// 获取应用状态更新后的采购计划数据
export function getPurchasePlansWithStatus(): PurchasePlan[] {
  const updates = getStatusUpdates();

  return initialPurchasePlans.map(plan => {
    const update = updates[plan.id];
    if (update) {
      return {
        ...plan,
        status: update.status as PurchasePlan['status'],
        statusText: update.statusText,
      };
    }
    return plan;
  }) as PurchasePlan[];
}

// 异步获取采购计划数据（支持 API 调用和 mock 回退）
export async function getPurchasePlansWithStatusAsync(): Promise<PurchasePlan[]> {
  try {
    if (USE_API) {
      // 尝试从 API 获取数据
      const apiData = await apiClient.get<PurchasePlan[]>('/purchase-plans');
      if (apiData && apiData.length > 0) {
        const updates = getStatusUpdates();
        // 应用本地状态更新
        return apiData.map(plan => {
          const update = updates[plan.id];
          if (update) {
            return {
              ...plan,
              status: update.status as PurchasePlan['status'],
              statusText: update.statusText,
            };
          }
          return plan;
        }) as PurchasePlan[];
      }
    }
  } catch (error) {
    console.error('从 API 获取采购计划失败，使用 mock 数据:', error);
  }

  // 回退到 mock 数据
  return getPurchasePlansWithStatus();
}

// 清除所有状态更新（用于测试）
export function clearAllStatusUpdates(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 监听状态变化
export function subscribeToStatusChanges(callback: (planId: string, status: string, statusText: string) => void): () => void {
  const handler = (event: CustomEvent) => {
    const { planId, status, statusText } = event.detail;
    callback(planId, status, statusText);
  };

  window.addEventListener('purchasePlanStatusChanged', handler as EventListener);

  return () => {
    window.removeEventListener('purchasePlanStatusChanged', handler as EventListener);
  };
}
