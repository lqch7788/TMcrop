/**
 * 采收记录 Store（V2.1 架构 - 纯内存）
 * 2026-07-01 新增
 *
 * 给 UnifiedRowHarvestInboundModal 弹窗底部"采收记录"历史表用。
 * 种源 / 育苗 / 种植 3 页面共用，按 recordKey = `${module}:${id}` 索引。
 *
 * 数据流：listHarvestRecordsBySource → enhancedApiClient → 后端 GET /api/harvest
 *        → 写入本 store → 组件订阅
 *
 * 铁律：禁止 persist / IndexedDB / localStorage 兜底（V2.1 架构铁律）
 */

import { create } from 'zustand';
import type { HarvestRecord } from '../types';
import { listHarvestRecordsBySource, deleteHarvestRecord as deleteHarvestRecordApi } from '../services/harvestRecordService';

export type SourceModule = 'seed_source' | 'seedling' | 'planting';

interface HarvestRecordState {
  /** recordKey = `${sourceModule}:${sourceId}` → 该来源的入库历史（已 create_time DESC） */
  recordsByKey: Record<string, HarvestRecord[]>;
  /** 加载中状态（按 recordKey） */
  loadingByKey: Record<string, boolean>;
  /** 错误（按 recordKey） */
  errorByKey: Record<string, string | null>;
  /** 正在删除的 recordId（用于删除按钮 loading 态） */
  deletingIds: Record<string, boolean>;

  /** 加载某来源的采收记录（不传 sourceId 则跳过） */
  loadRecords: (sourceModule: SourceModule, sourceId: string) => Promise<void>;
  /** 弹窗提交成功后调用，把新记录 prepend 到对应 key（避免再请求一次） */
  prependRecord: (sourceModule: SourceModule, sourceId: string, record: HarvestRecord) => void;
  /** 清除某来源的本地缓存（弹窗关闭时调用） */
  clearRecords: (sourceModule: SourceModule, sourceId: string) => void;
  /** 删除 1 条采收记录（调 DELETE /api/harvest/:id；后端级联清理 4 张表） */
  deleteRecord: (recordId: string, sourceModule: SourceModule, sourceId: string) => Promise<boolean>;
}

/** 构造 recordKey（与 loadRecords/prependRecord 共享） */
function makeKey(sourceModule: SourceModule, sourceId: string): string {
  return `${sourceModule}:${sourceId}`
}

export const useHarvestRecordStore = create<HarvestRecordState>()((set) => ({
  recordsByKey: {},
  loadingByKey: {},
  errorByKey: {},
  deletingIds: {},

  loadRecords: async (sourceModule, sourceId) => {
    if (!sourceId) return
    const key = makeKey(sourceModule, sourceId)
    set((s) => ({ loadingByKey: { ...s.loadingByKey, [key]: true }, errorByKey: { ...s.errorByKey, [key]: null } }))
    try {
      const records = await listHarvestRecordsBySource(sourceModule, sourceId)
      set((s) => ({
        recordsByKey: { ...s.recordsByKey, [key]: records },
        loadingByKey: { ...s.loadingByKey, [key]: false },
      }))
    } catch (e: any) {
      set((s) => ({
        errorByKey: { ...s.errorByKey, [key]: e?.message || '加载采收记录失败' },
        loadingByKey: { ...s.loadingByKey, [key]: false },
      }))
    }
  },

  prependRecord: (sourceModule, sourceId, record) => {
    if (!sourceId || !record) return
    const key = makeKey(sourceModule, sourceId)
    set((s) => ({
      recordsByKey: {
        ...s.recordsByKey,
        [key]: [record, ...(s.recordsByKey[key] || [])],
      },
    }))
  },

  clearRecords: (sourceModule, sourceId) => {
    if (!sourceId) return
    const key = makeKey(sourceModule, sourceId)
    set((s) => {
      const next = { ...s.recordsByKey }
      delete next[key]
      return { recordsByKey: next }
    })
  },

  deleteRecord: async (recordId, sourceModule, sourceId) => {
    if (!recordId) return false
    set((s) => ({ deletingIds: { ...s.deletingIds, [recordId]: true } }))
    try {
      await deleteHarvestRecordApi(recordId)
      // 乐观更新：从所有相关 key 的列表中移除该 recordId
      set((s) => {
        const nextRecords = { ...s.recordsByKey }
        if (sourceId) {
          const key = makeKey(sourceModule, sourceId)
          if (nextRecords[key]) {
            nextRecords[key] = nextRecords[key].filter((r) => r.id !== recordId)
          }
        } else {
          // 没传 sourceId 时全量清理（防御性，正常不会发生）
          for (const k of Object.keys(nextRecords)) {
            nextRecords[k] = nextRecords[k].filter((r) => r.id !== recordId)
          }
        }
        const nextDeleting = { ...s.deletingIds }
        delete nextDeleting[recordId]
        return { recordsByKey: nextRecords, deletingIds: nextDeleting }
      })
      return true
    } catch (e: any) {
      console.error('[useHarvestRecordStore.deleteRecord]', e)
      set((s) => {
        const nextDeleting = { ...s.deletingIds }
        delete nextDeleting[recordId]
        return { deletingIds: nextDeleting }
      })
      throw e
    }
  },
}))
