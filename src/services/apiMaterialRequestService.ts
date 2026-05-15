/**
 * 物料申请 API 服务
 * 对接后端 /api/material-requests
 * 支持数据降级：API失败时使用本地缓存
 */

import { apiClient } from './apiClient';
import { dataRouter } from './dataRouter';
import { unifiedCache } from './unifiedCache';
import type { MaterialItem } from '../types/materialReceiving';

// 缓存键名
const CACHE_KEY = 'material-requests';

// 物料申请单据接口（与后端返回的驼峰格式对应）
export interface MaterialRequestRecord {
  id: string;
  requestCode: string;
  requestTitle?: string;
  requestType?: string;
  departmentId?: string;
  departmentName?: string;
  applicantId?: string;
  applicantName?: string;
  applyDate?: string;
  expectedDate?: string;
  warehouseId?: string;
  warehouseName?: string;
  plantArea?: string;
  productionBatchCode?: string;
  totalAmount?: number;
  priority?: string;
  status?: string;
  approvalStatus?: string;
  remarks?: string;
  attachments?: unknown[];
  createBy?: string;
  materials?: MaterialItem[];
}

/**
 * 获取物料申请列表（使用 dataRouter 统一降级）
 */
export async function getMaterialRequests(params?: {
  status?: string;
  approval_status?: string;
  department_name?: string;
  applicant_name?: string;
  warehouse_name?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: MaterialRequestRecord[]; total: number }> {
  // 使用 dataRouter 进行数据读取，自动处理降级
  const result = await dataRouter.read<{ data: MaterialRequestRecord[]; total: number }>({
    key: CACHE_KEY,
    apiRead: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: MaterialRequestRecord[];
        meta: { total: number };
      }>('/material-requests', params as Record<string, string>);

      // 更新缓存
      await unifiedCache.set(CACHE_KEY, response.data);

      return {
        data: response.data,
        total: response.meta?.total || response.data.length
      };
    },
    localRead: () => {
      // 从缓存读取
      const cached = unifiedCache.get<MaterialRequestRecord[]>(CACHE_KEY);
      if (cached) {
        return { data: cached, total: cached.length };
      }
      // 无缓存数据时返回空
      console.log('[物料申请] 缓存为空，返回空列表');
      return { data: [], total: 0 };
    }
  });

  return result || { data: [], total: 0 };
}

/**
 * 获取单个物料申请详情
 */
export async function getMaterialRequestById(id: string): Promise<MaterialRequestRecord | null> {
  try {
    return await apiClient.get<MaterialRequestRecord>(`/material-requests/${id}`);
  } catch (error) {
    console.warn('[物料申请] API获取失败，尝试从缓存读取:', error);
    // 从缓存中查找
    const cached = await unifiedCache.get<MaterialRequestRecord[]>(CACHE_KEY);
    if (cached) {
      return cached.find(item => item.id === id || item.requestCode === id) || null;
    }
    // 缓存中也无数据
    return null;
  }
}

/**
 * 创建物料申请
 */
export async function createMaterialRequest(data: {
  id?: string;
  request_code?: string;
  request_title?: string;
  request_type?: string;
  department_id?: string;
  department_name?: string;
  applicant_id?: string;
  applicant_name?: string;
  apply_date?: string;
  expected_date?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  plant_area?: string;
  production_batch_code?: string;
  total_amount?: number;
  priority?: string;
  status?: string;
  approval_status?: string;
  remarks?: string;
  attachments?: unknown[];
  create_by?: string;
  materials?: MaterialItem[];
}): Promise<{ id: string; request_code: string }> {
  // 先生成本地 ID 和 code（用于离线模式）
  const localId = data.id || `MR${Date.now()}`;
  const localCode = data.request_code || `MR${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(Date.now() % 10000).padStart(4, '0')}`;

  const result = await dataRouter.write({
    key: CACHE_KEY,
    apiWrite: async () => {
      return await apiClient.post<{ id: string; request_code: string }>('/material-requests', data);
    },
    localWrite: () => {
      // 离线模式：本地更新缓存
      const newRecord = {
        ...data,
        id: localId,
        requestCode: localCode,
        materials: data.materials || [],
      } as MaterialRequestRecord;
      unifiedCache.get<MaterialRequestRecord[]>(CACHE_KEY).then(cached => {
        const records = cached || [];
        records.unshift(newRecord);
        unifiedCache.set(CACHE_KEY, records);
      });
      // 返回新记录信息供调用方使用
      return { id: localId, request_code: localCode };
    }
  }, data as any);

  // 如果 API 成功，result 包含后端返回的 id 和 code
  // 如果离线/失败，localWrite 返回本地生成的 id 和 code
  if (result && typeof result === 'object' && 'id' in result && 'request_code' in result) {
    return result as { id: string; request_code: string };
  }
  // 降级返回本地生成的 ID 和 code
  return { id: localId, request_code: localCode };
}

/**
 * 更新物料申请
 */
export async function updateMaterialRequest(
  id: string,
  updates: Partial<MaterialRequestRecord>
): Promise<{ id: string }> {
  return dataRouter.write({
    key: CACHE_KEY,
    apiWrite: async () => {
      return await apiClient.put<{ id: string }>(`/material-requests/${id}`, updates);
    },
    localWrite: () => {
      // 本地更新后更新缓存
      unifiedCache.get<MaterialRequestRecord[]>(CACHE_KEY).then(cached => {
        if (cached) {
          const index = cached.findIndex(item => item.id === id);
          if (index !== -1) {
            cached[index] = { ...cached[index], ...updates };
            unifiedCache.set(CACHE_KEY, cached);
          }
        }
      });
    }
  }, updates as any) as Promise<{ id: string }>;
}

/**
 * 删除物料申请
 */
export async function deleteMaterialRequest(id: string): Promise<{ id: string }> {
  return dataRouter.write({
    key: CACHE_KEY,
    apiWrite: async () => {
      return await apiClient.delete<{ id: string }>(`/material-requests/${id}`);
    },
    localWrite: () => {
      // 本地删除后更新缓存
      unifiedCache.get<MaterialRequestRecord[]>(CACHE_KEY).then(cached => {
        if (cached) {
          const filtered = cached.filter(item => item.id !== id);
          unifiedCache.set(CACHE_KEY, filtered);
        }
      });
    }
  }, { id } as any) as Promise<{ id: string }>;
}
