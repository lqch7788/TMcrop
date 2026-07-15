/**
 * 库存入库按模块下沉 — Store
 * 2026-06-18 任务 3
 *
 * 设计原则：
 * - recordsBySource 按 `${sourceModule}:${sourceId}` 缓存入库记录，避免重复请求
 * - submitInbound 成功后失效对应 source 的缓存，强制下次 loadRecords 重拉
 * - 禁止 persist / IndexedDB / localStorage 兜底（V2.1 铁律）
 * - 2026-07-15：移除 5 分钟 TTL 缓存（违反 V2.1 铁律：禁止任何缓存降级）
 *   - 内存 store 本身不算缓存（刷新即丢失），但 `if (now - last < CACHE_TTL_MS) return` 跳过请求的逻辑就是显式缓存
 *   - 改为：除非有数据就跳过空请求（如果调用方已通过 submitInbound 失效缓存）
 */

import { create } from 'zustand'
import {
  inbound,
  listInboundRecords,
  type InboundRecordsQuery,
} from '@/services/apiInventoryInboundService'
import type {
  InventoryInboundRecord,
  InventoryInboundInput,
} from '@/types/inventoryInbound'

interface InventoryInboundStore {
  /** sourceModule:sourceId → 入库记录列表 */
  recordsBySource: Record<string, InventoryInboundRecord[]>
  loading: boolean
  /** 顶层错误信息（页面可读） */
  error: string | null

  /** 加载某 source 的入库记录 */
  loadRecords: (key: string, query: InboundRecordsQuery, force?: boolean) => Promise<void>
  /** 提交入库；成功后失效该 source 的缓存 */
  submitInbound: (
    input: InventoryInboundInput
  ) => Promise<{ stockId: string; recordId: string } | null>
  /** 清空指定 source 的缓存 */
  clear: (key: string) => void
  /** 清空全部缓存 */
  clearAll: () => void
}

export const useInventoryInboundStore = create<InventoryInboundStore>((set, get) => ({
  recordsBySource: {},
  loading: false,
  error: null,

  loadRecords: async (key, query, force = false) => {
    // 2026-07-15：移除 5 分钟 TTL。仅在 explicit force=false 且已有数据时跳过请求。
    // 提交入库后会调 clear() 失效缓存，所以下次 loadRecords 总是会重拉
    if (!force && get().recordsBySource[key]) {
      return
    }

    set({ loading: true, error: null })
    try {
      const { data } = await listInboundRecords(query)
      set((s) => ({
        recordsBySource: { ...s.recordsBySource, [key]: data },
        loading: false,
      }))
    } catch (e) {
      console.error('[useInventoryInboundStore.loadRecords]', e)
      set({
        error: e instanceof Error ? e.message : '加载入库记录失败',
        loading: false,
      })
    }
  },

  submitInbound: async (input) => {
    // 2026-06-18: 失败时 throw 让 modal 拿到真实错误消息
    try {
      const result = await inbound(input)
      // 失效该 source 的缓存，强制下次 loadRecords 重拉
      const cacheKey = `${input.sourceModule}:${input.sourceId}`
      set((s) => {
        const nextRecords = { ...s.recordsBySource }
        delete nextRecords[cacheKey]
        return { recordsBySource: nextRecords, error: null }
      })
      return result
    } catch (e) {
      console.error('[useInventoryInboundStore.submitInbound]', e)
      const msg = e instanceof Error ? e.message : '入库失败'
      set({ error: msg })
      throw e  // 抛出给调用方（modal 的 catch 块）显示真实错误
    }
  },

  clear: (key) => {
    set((s) => {
      const nextRecords = { ...s.recordsBySource }
      delete nextRecords[key]
      return { recordsBySource: nextRecords }
    })
  },

  clearAll: () => {
    set({ recordsBySource: {}, error: null })
  },
}))
