/**
 * 基地运营中心 — 4 级树菜单数据 hook
 * Plan B 2026-07-25
 *
 * 复用原 V2 的 buildTreeData 函数（line 533）：
 *   base → greenhouse → zone → block 4 级节点
 *   支持 baseOidFromUrl 过滤 + 搜索关键字
 */
import { useMemo } from 'react';
import { buildTreeData } from '@/pages/BaseOperationsCenterV2';

export function useBaseOpsTreeData(
  bases: any[],
  greenhouses: any[],
  zones: any[],
  blocks: any[],
  baseOidFromUrl: string | undefined,
  searchTerm: string,
): any[] {
  return useMemo(() => {
    return buildTreeData(bases, greenhouses, zones, blocks, baseOidFromUrl, searchTerm) as any[];
  }, [bases, greenhouses, zones, blocks, baseOidFromUrl, searchTerm]);
}