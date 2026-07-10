/**
 * 2026-07-10 P1-2: 种植筛选 Hook
 * 把 PlantingPage 中 ~18 行 inline useMemo 过滤逻辑抽出来，与 useFilteredSeedSources 对齐。
 *
 * 不改变任何功能逻辑。
 */
import { useMemo } from 'react';
import { Planting, PlantingFilters } from '../types/crop';

export function useFilteredPlantings(
  plantings: Planting[],
  filters: PlantingFilters,
): Planting[] {
  return useMemo(() => {
    return plantings.filter((item) => {
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      if (filters.plantCode && !item.plantCode.includes(filters.plantCode)) return false;
      if (filters.sourceCode && !item.sourceCode.includes(filters.sourceCode)) return false;
      if (filters.areaName && !item.areaName.includes(filters.areaName)) return false;
      if (filters.isHarvest && String(item.isHarvest) !== filters.isHarvest) return false;
      if (filters.startDate && item.plantingDate < filters.startDate) return false;
      if (filters.endDate && item.plantingDate > filters.endDate) return false;
      if (filters.transplantDate && item.transplantDate !== filters.transplantDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      // 2026-07-10 P1-3 bugfix：移除 as any（Planting 类型已声明 orgName 可选字段）
      if (filters.orgName && !item.orgName?.includes(filters.orgName)) return false;
      if (filters.countMin !== undefined && item.plantingCount < filters.countMin) return false;
      if (filters.countMax !== undefined && item.plantingCount > filters.countMax) return false;
      return true;
    });
  }, [plantings, filters]);
}