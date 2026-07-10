/**
 * 2026-07-10 P1-2: 育苗筛选 Hook
 * 把 SeedlingPage 中 ~30 行 inline useMemo 过滤逻辑抽出来，与 useFilteredSeedSources 对齐。
 *
 * 不改变任何功能逻辑：保持原有的 includes/startsWith 行为、surplus 派生公式。
 */
import { useMemo } from 'react';
import { Seedling, SeedlingFilters } from '../types/crop';

export function useFilteredSeedlings(
  seedlings: Seedling[],
  filters: SeedlingFilters,
): Seedling[] {
  return useMemo(() => {
    return seedlings.filter((item) => {
      if (filters.cropName && filters.cropName !== '__all__' && !item.cropName.includes(filters.cropName)) return false;
      if (filters.seedlingCode && !item.seedlingCode.startsWith(filters.seedlingCode)) return false;
      if (filters.sourceCode && !item.sourceCode.startsWith(filters.sourceCode)) return false;
      if (filters.siteName && filters.siteName !== '__all__' && item.siteName !== filters.siteName) return false;
      if (filters.seedlingType && filters.seedlingType !== '__all__' && item.seedlingType !== filters.seedlingType) return false;
      if (filters.status && filters.status !== '__all__' && item.status !== filters.status) return false;
      if (filters.startDate && item.startDate < filters.startDate) return false;
      if (filters.endDate && item.startDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.startsWith(filters.createBy)) return false;
      if (filters.initialCountMin !== undefined && item.initialCount < filters.initialCountMin) return false;
      if (filters.initialCountMax !== undefined && item.initialCount > filters.initialCountMax) return false;
      if (filters.survivalCountMin !== undefined && item.survivalCount < filters.survivalCountMin) return false;
      if (filters.survivalCountMax !== undefined && item.survivalCount > filters.survivalCountMax) return false;
      if (filters.lossCountMin !== undefined && item.lossCount < filters.lossCountMin) return false;
      if (filters.lossCountMax !== undefined && item.lossCount > filters.lossCountMax) return false;
      // 现存数量 = 小苗剩余 = 产出 - 损耗 - 采收入库
      const surplus = Math.max(0,
        (item.expandedPlantCount || 0)
        - (item.seedlingLossCount || 0)
        - (item.harvestStockedCount || 0)
      );
      if (filters.surplusMin !== undefined && surplus < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && surplus > filters.surplusMax) return false;
      if (filters.survivalRateMin !== undefined && item.survivalRate < filters.survivalRateMin) return false;
      if (filters.survivalRateMax !== undefined && item.survivalRate > filters.survivalRateMax) return false;
      if (filters.lossRateMin !== undefined && item.lossRate < filters.lossRateMin) return false;
      if (filters.lossRateMax !== undefined && item.lossRate > filters.lossRateMax) return false;
      return true;
    });
  }, [seedlings, filters]);
}