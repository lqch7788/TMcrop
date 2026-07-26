/**
 * 2026-07-21：种源品种路径共享 Hook
 *
 * 解决问题：
 * - 列表 (SeedSourceTable) 和详情 (DetailModal) 各自实现品种路径逻辑
 * - 详情只显示 2 段（typeName + varietyName），列表显示完整 4 段
 * - 同一记录两个视图显示不一致 → 用户困惑
 *
 * 设计：把路径生成逻辑抽到共享 Hook，两端用同一份
 *
 * 路径规则（4 段，与种植管理 PlantingTable.getVarietyPath 对齐）：
 *   类别（categoryName） > 类型（typeName） > 品种（varietyName） > 子品种（subVariety1Name）
 *
 * 数据源优先级：
 *   1. 品种库 cropVarietyCache（按 cropCode 精确匹配 → cropName/cropVariety 模糊匹配）
 *   2. 兜底：record 自身字段拼接
 */
import { useEffect, useState, useMemo } from 'react';
import * as cropVarietyService from '@/services/cropVarietyService';
import type { CropVariety } from '@/types/cropVariety';
import type { SeedSource } from '@/types/crop';

export interface UseSeedSourceVarietyPathResult {
  /** 完整 4 段路径（用 " > " 分隔） */
  getVarietyPath: (record: SeedSource) => string;
  /** 品种库查到的完整信息（用于编辑弹窗选中显示） */
  getVarietyByAny: (record: SeedSource) => CropVariety | null;
  /** 品种库是否已加载 */
  loaded: boolean;
}

/**
 * 全局品种库缓存（避免每个组件都重新请求）
 * 模块级 Map：组件卸载不清空，由 Vite HMR 重新加载时清空
 */
let globalVarietyCache: Map<string, CropVariety> | null = null;
let loadingPromise: Promise<Map<string, CropVariety>> | null = null;

async function loadVarietyCache(): Promise<Map<string, CropVariety>> {
  if (globalVarietyCache) return globalVarietyCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const varieties = await cropVarietyService.getAllVarieties();
      const cache = new Map<string, CropVariety>();
      varieties.forEach((v: CropVariety) => {
        // 按 subVariety1Name 缓存（最细分）
        const key1 = v.subVariety1Name || '';
        if (key1 && !cache.has(key1)) cache.set(key1, v);
        // 按 varietyName 缓存
        const key2 = v.varietyName || '';
        if (key2 && !cache.has(key2)) cache.set(key2, v);
        // 按 cropCode 缓存（最精确）
        const key3 = v.cropCode || '';
        if (key3 && !cache.has(key3)) cache.set(key3, v);
      });
      globalVarietyCache = cache;
      return cache;
    } catch (e) {
      console.warn('[useSeedSourceVarietyPath] 加载品种库失败', e);
      globalVarietyCache = new Map();
      return globalVarietyCache;
    } finally {
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

export function useSeedSourceVarietyPath(): UseSeedSourceVarietyPathResult {
  const [varietyCache, setVarietyCache] = useState<Map<string, CropVariety>>(globalVarietyCache || new Map());
  const [loaded, setLoaded] = useState(!!globalVarietyCache);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    loadVarietyCache().then((cache) => {
      if (cancelled) return;
      setVarietyCache(cache);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [loaded]);

  // 从品种库查找完整品种信息
  const getVarietyByAny = (record: SeedSource): CropVariety | null => {
    // 2026-07-26 修复：用 cropCode 精确匹配唯一标准，移除 cropName/cropVariety 模糊 fallback。
    // 原因：模糊 includes 匹配会因为子品种名包含父作物名（如"其他草莓".includes("草莓")）而
    //   错误命中其他 variety，导致调拨后种源页显示错误的 cropCode/cropVarietyName。
    // cropCode 是后端从 crop_varieties JOIN 返的唯一真理源，匹配不上就 null，由 UI 兜底。
    if (record.cropCode) {
      const v = varietyCache.get(record.cropCode);
      if (v) return v;
    }
    return null;
  };

  // 品种完整路径：从品种库查四段路径（类别 > 类型 > 品种 > 子品种）
  const getVarietyPath = (record: SeedSource): string => {
    const variety = getVarietyByAny(record);
    if (!variety) {
      // 兜底：用 record 自身字段拼接
      const parts: string[] = [];
      if (record.cropCategory) parts.push(record.cropCategory);
      if (record.cropName) parts.push(record.cropName);
      if (record.cropVariety && record.cropVariety !== record.cropName) parts.push(record.cropVariety);
      return parts.length > 0 ? parts.join(' > ') : '—';
    }
    const parts: string[] = [];
    if (variety.categoryName) parts.push(variety.categoryName);
    if (variety.typeName) parts.push(variety.typeName);
    if (variety.varietyName) parts.push(variety.varietyName);
    if (variety.subVariety1Name) parts.push(variety.subVariety1Name);
    return parts.join(' > ') || '—';
  };

  return useMemo(() => ({ getVarietyPath, getVarietyByAny, loaded }), [varietyCache, loaded]);
}

/** 重置缓存（HMR / 手动刷新品种库时调用） */
export function resetSeedSourceVarietyCache(): void {
  globalVarietyCache = null;
  loadingPromise = null;
}