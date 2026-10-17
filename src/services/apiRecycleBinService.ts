/**
 * 作物管理通用回收站 API 服务
 * 对接后端 /api/recycle-bin
 *
 * 数据流：API → enhancedApiClient → Store（V2.1 铁律：无缓存降级）
 */
import { enhancedApiClient } from '../lib/apiClient';
import type {
  RecycleBinFilters,
  RecycleBinItem,
  RecycleBinListResult,
  RecycleBinStats,
} from '../types/recycleBin';

type Raw = Record<string, any>;

/** 兼容后端 camelCase / snake_case 两种字段名 */
function normalizeItem(raw: Raw): RecycleBinItem {
  return {
    id: String(raw.id ?? ''),
    module: String(raw.module ?? 'crop'),
    entityType: String(raw.entityType ?? raw.entity_type ?? ''),
    entityId: String(raw.entityId ?? raw.entity_id ?? ''),
    entityCode: String(raw.entityCode ?? raw.entity_code ?? ''),
    displayName: String(raw.displayName ?? raw.display_name ?? ''),
    snapshot: String(raw.snapshot ?? ''),
    dependencies: raw.dependencies ?? null,
    restoreInfo: raw.restoreInfo ?? raw.restore_info ?? null,
    deleteMode: String(raw.deleteMode ?? raw.delete_mode ?? ''),
    sourcePage: String(raw.sourcePage ?? raw.source_page ?? ''),
    deletedBy: String(raw.deletedBy ?? raw.deleted_by ?? ''),
    deletedById: String(raw.deletedById ?? raw.deleted_by_id ?? ''),
    deletedAt: String(raw.deletedAt ?? raw.deleted_at ?? ''),
    restoreStatus: String(raw.restoreStatus ?? raw.restore_status ?? 'pending'),
    restoredBy: raw.restoredBy ?? raw.restored_by ?? null,
    restoredAt: raw.restoredAt ?? raw.restored_at ?? null,
    restoreError: raw.restoreError ?? raw.restore_error ?? null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
  };
}

/** 查询回收站列表（分页） */
export async function getRecycleBinItems(filters: RecycleBinFilters = {}): Promise<RecycleBinListResult> {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.status) params.set('status', filters.status);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  params.set('page', String(filters.page || 1));
  params.set('pageSize', String(filters.pageSize || 20));

  const result = await enhancedApiClient.get<Raw>(`/recycle-bin?${params.toString()}`);
  const items = Array.isArray(result?.items) ? result.items.map(normalizeItem) : [];
  return {
    items,
    total: Number(result?.total || 0),
    page: Number(result?.page || 1),
    pageSize: Number(result?.pageSize || result?.page_size || 20),
  };
}

/** 回收站统计（各类型待恢复数量） */
export async function getRecycleBinStats(): Promise<RecycleBinStats> {
  const result = await enhancedApiClient.get<Raw>('/recycle-bin/stats');
  const rawByType = result?.byType || result?.by_type;
  return {
    total: Number(result?.total || 0),
    byType: Array.isArray(rawByType)
      ? rawByType.map((r: Raw) => ({
          entityType: String(r.entityType ?? r.entity_type ?? ''),
          count: Number(r.count || 0),
        }))
      : [],
  };
}

/** 恢复一条记录 */
export async function restoreRecycleBinItem(id: string): Promise<{ id: string; entityId: string; warnings?: string[] }> {
  return enhancedApiClient.post<{ id: string; entityId: string; warnings?: string[] }>(
    `/recycle-bin/${encodeURIComponent(id)}/restore`,
    {},
  );
}

/** 彻底删除回收站记录（仅管理员） */
export async function purgeRecycleBinItem(id: string): Promise<void> {
  await enhancedApiClient.delete(`/recycle-bin/${encodeURIComponent(id)}`);
}
