/**
 * 2026-06-06: 种源筛选 Hook
 * 把 SeedSourcePage 中 12 项过滤条件（~45 行）的 useMemo 逻辑抽出来。
 * 依赖：useUserStore 解析 recorderId → 名称。
 */
import { useMemo } from 'react';
import { SeedSource, SeedSourceFilters } from '../types/crop';
import { computeStockStatus } from '../lib/stockStatus';
import { StockStatus } from '../types/crop';
import { useUserStore } from '../stores/useUserStore';
import { seedSourceStatusOptions } from '../data/cropData';

export function useFilteredSeedSources(
  sources: SeedSource[],
  filters: SeedSourceFilters,
): SeedSource[] {
  // 2026-07-01 P1-1 修复：开发态校验 seedSourceStatusOptions 的 value 与 StockStatus 枚举一致
  // 防止某天 STOCK_STATUS_MAP key 改名导致 status 筛选静默失灵
  if (process.env.NODE_ENV !== 'production') {
    const validStatuses = new Set(Object.values(StockStatus) as string[]);
    for (const opt of seedSourceStatusOptions) {
      if (opt.value !== '__all__' && !validStatuses.has(opt.value)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[useFilteredSeedSources] 库存状态筛选 value="${opt.value}" 不在 StockStatus 枚举内，`
          + `有效值: ${Array.from(validStatuses).join(', ')}`
        );
      }
    }
  }

  return useMemo(() => {
    // 记录人 ID → 名称（用于级联筛选）
    let recorderName = '';
    if (filters.recorderId) {
      const users = useUserStore.getState().users;
      const user = users.find((u: any) => (u.oid || u.id) === filters.recorderId);
      recorderName = user?.name || '';
    }

    const filtered = sources.filter((item) => {
      if (filters.cropCategory && filters.cropCategory !== '__all__' && item.cropCategory !== filters.cropCategory) return false;
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      if (filters.cropType && filters.cropType !== '__all__' && item.cropCategory !== filters.cropType) return false;
      if (filters.seedCode && !item.seedCode.includes(filters.seedCode)) return false;
      if (filters.sourceType && filters.sourceType !== '__all__' && item.sourceType !== filters.sourceType) return false;
      if (filters.supplierName && filters.supplierName !== '__all__' && !item.supplierName.includes(filters.supplierName)) return false;
      // 2026-06-04: status 改为实时计算
      if (filters.status && filters.status !== '__all__' && computeStockStatus(item.availableCount, item.initialCount) !== filters.status) return false;
      if (filters.startDate && item.purchaseDate < filters.startDate) return false;
      if (filters.endDate && item.purchaseDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      if (recorderName && item.createBy !== recorderName) return false;
      if (filters.surplusMin !== undefined && item.availableCount < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && item.availableCount > filters.surplusMax) return false;
      if (filters.propagationType) {
        const itemPropType = item.propagationType || 'external';
        if (itemPropType !== filters.propagationType) return false;
      }
      if (filters.propagationStatus) {
        if (item.propagationStatus !== filters.propagationStatus) return false;
      }
      // 2026-07-21：回流合并筛选（列表已删除回流次数字段，移到筛选器）
      if (filters.reflowFilter === 'has_reflow' && ((item as any).reflowCount ?? 0) <= 0) return false;
      if (filters.reflowFilter === 'no_reflow' && ((item as any).reflowCount ?? 0) > 0) return false;
      return true;
    });
    // 按创建时间倒序排列
    return filtered.sort((a, b) => {
      const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
      const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [filters, sources]);
}
