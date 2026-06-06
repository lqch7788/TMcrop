/**
 * 2026-06-06: 种源筛选 Hook
 * 把 SeedSourcePage 中 12 项过滤条件（~45 行）的 useMemo 逻辑抽出来。
 * 依赖：useUserStore 解析 recorderId → 名称。
 */
import { useMemo } from 'react';
import { SeedSource, SeedSourceFilters } from '../types/crop';
import { computeStockStatus } from '../lib/stockStatus';
import { useUserStore } from '../stores/useUserStore';

export function useFilteredSeedSources(
  sources: SeedSource[],
  filters: SeedSourceFilters,
): SeedSource[] {
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
