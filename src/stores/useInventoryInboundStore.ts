/**
 * 库存入库按模块下沉 — Store
 * 2026-06-18 任务 3
 *
 * 设计原则：
 * - recordsBySource 按 `${sourceModule}:${sourceId}` 缓存入库记录列表，避免多个种源/育苗切换时反复请求
 * - submitInbound 成功后失效对应 source 的缓存（不立即重拉，由页面在 onSuccess 中调 loadRecords）
 * - 禁止 persist / IndexedDB / localStorage 兜底（V2.1 铁律）
 * - 缓存淘汰机制：loadRecords 时按 lastFetch 时间戳决定是否重新拉取
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

/** 缓存 5 分钟内不重拉（与 useWarehouseStore 保持一致） */
const CACHE_TTL_MS = 5 * 60 * 1000

interface InventoryInboundStore {
  /** sourceModule:sourceId → 入库记录列表 */
  recordsBySource: Record<string, InventoryInboundRecord[]>
  loading: boolean
  /** sourceModule:sourceId → 上次拉取时间戳 */
  lastFetch: Record<string, number>
  /** 顶层错误信息（页面可读） */
  error: string | null

  /** 加载某 source 的入库记录（带缓存） */
  loadRecords: (key: string, query: InboundRecordsQuery) => Promise<void>
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
  lastFetch: {},
  error: null,

  loadRecords: async (key, query) => {
    // 5 分钟内已拉过则跳过
    const last = get().lastFetch[key]
    const now = Date.now()
    if (last && now - last < CACHE_TTL_MS && get().recordsBySource[key]) {
      return
    }

    set({ loading: true, error: null })
    try {
      const { data } = await listInboundRecords(query)
      set((s) => ({
        recordsBySource: { ...s.recordsBySource, [key]: data },
        lastFetch: { ...s.lastFetch, [key]: now },
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
    // 2026-06-18: 失败时 throw 让 modal 拿到真实错误消息（不再吞错返回 null）
    try {
      const result = await inbound(input)
      // 失效该 source 的缓存 + 时间戳，强制下一次 loadRecords 重拉
      const cacheKey = `${input.sourceModule}:${input.sourceId}`
      set((s) => {
        const nextRecords = { ...s.recordsBySource }
        const nextLastFetch = { ...s.lastFetch }
        delete nextRecords[cacheKey]
        delete nextLastFetch[cacheKey]
        return { recordsBySource: nextRecords, lastFetch: nextLastFetch, error: null }
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
      const nextLastFetch = { ...s.lastFetch }
      delete nextRecords[key]
      delete nextLastFetch[key]
      return { recordsBySource: nextRecords, lastFetch: nextLastFetch }
    })
  },

  clearAll: () => {
    set({ recordsBySource: {}, lastFetch: {}, error: null })
  },
}))
