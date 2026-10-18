/**
 * 2026-07-10 P1-2: 育苗筛选 Hook
 * 把 SeedlingPage 中 ~30 行 inline useMemo 过滤逻辑抽出来，与 useFilteredSeedSources 对齐。
 *
 * 不改变任何功能逻辑：保持原有的 includes/startsWith 行为、surplus 派生公式。
 */
import { useMemo } from 'react';
import { Seedling, SeedlingFilters } from '../types/crop';
import { getSeedlingRemainingCount, getMotherAliveCount, getMotherLossDisplayCount } from '@/lib/seedlingPool';

export function useFilteredSeedlings(
  seedlings: Seedling[],
  filters: SeedlingFilters,
): Seedling[] {
  return useMemo(() => {
    return seedlings.filter((item) => {
      if (filters.cropName && filters.cropName !== '__all__' && !item.cropName.includes(filters.cropName)) return false;
      if (filters.seedlingCode && !item.seedlingCode.startsWith(filters.seedlingCode)) return false;
      if (filters.sourceCode && !item.sourceCode.startsWith(filters.sourceCode)) return false;
      // 2026-10-18 P1 修复：区域筛选按 area_oid（FK）比较；老数据无 oid 时回退名称匹配。
      // 原实现把 OID 写进 siteName 再与中文名称比较，选中任何区域结果恒为空。
      if (filters.areaOid && filters.areaOid !== '__all__') {
        const itemOid = String((item as any).areaOid || '');
        if (itemOid) {
          if (itemOid !== filters.areaOid) return false;
        } else if (item.siteId !== filters.areaOid && item.siteName !== filters.siteName) {
          // 历史数据没有 area_oid：area_name 曾被写成 OID（映射到 item.siteId），
          // 或记录只存了区域名称 → 两种都兼容
          return false;
        }
      } else if (filters.siteName && filters.siteName !== '__all__' && item.siteName !== filters.siteName) {
        return false;
      }
      if (filters.seedlingType && filters.seedlingType !== '__all__' && item.seedlingType !== filters.seedlingType) return false;
      if (filters.status && filters.status !== '__all__' && item.status !== filters.status) return false;
      if (filters.startDate && item.startDate < filters.startDate) return false;
      if (filters.endDate && item.startDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.startsWith(filters.createBy)) return false;
      if (filters.initialCountMin !== undefined && item.initialCount < filters.initialCountMin) return false;
      if (filters.initialCountMax !== undefined && item.initialCount > filters.initialCountMax) return false;
      // 2026-10-17：成活/损耗筛选统一走 seedlingPool（原比较 survival_count/loss_count 存量字段，恒 0）
      const alive = getMotherAliveCount(item);
      const lossDisplay = getMotherLossDisplayCount(item);
      if (filters.survivalCountMin !== undefined && alive < filters.survivalCountMin) return false;
      if (filters.survivalCountMax !== undefined && alive > filters.survivalCountMax) return false;
      if (filters.lossCountMin !== undefined && lossDisplay < filters.lossCountMin) return false;
      if (filters.lossCountMax !== undefined && lossDisplay > filters.lossCountMax) return false;
      // 2026-10-17：剩余数量统一走 seedlingPool（1:1 镜像母株池；1:多 = 产出 − 损耗 − 已入库）
      const surplus = getSeedlingRemainingCount(item);
      if (filters.surplusMin !== undefined && surplus < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && surplus > filters.surplusMax) return false;
      // 2026-10-18 P2：成活率/损耗率改按 seedlingPool 派生口径，与列表显示一致
      //（原实现读 survivalRate/lossRate 存量字段，历史行常为 0，筛选失真）
      const invested = (item.initialCount || 0) + (item.replantCount || 0);
      const survivalRate = invested > 0 ? Math.round((alive / invested) * 100) : 0;
      const lossRate = invested > 0 ? Math.round((lossDisplay / invested) * 100) : 0;
      if (filters.survivalRateMin !== undefined && survivalRate < filters.survivalRateMin) return false;
      if (filters.survivalRateMax !== undefined && survivalRate > filters.survivalRateMax) return false;
      if (filters.lossRateMin !== undefined && lossRate < filters.lossRateMin) return false;
      if (filters.lossRateMax !== undefined && lossRate > filters.lossRateMax) return false;
      return true;
    });
  }, [seedlings, filters]);
}