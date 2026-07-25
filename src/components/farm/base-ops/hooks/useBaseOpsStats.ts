/**
 * 基地运营中心 — 顶部 4 统计卡聚合计算 hook
 * Plan B 2026-07-25
 *
 * 统计来源：
 * - totalArea: zones / greenhouses 的 area 字段累加（base 级 = MU_TO_SQM 转换）
 * - zoneCount: 命中 zones 的数量
 * - plantingCount: 来自 zones[i].aggregatedPlantings.count（plan Task 3 后端聚合）
 * - currentCrop: 来自 zones[i].aggregatedPlantings.currentCrop
 *
 * 跟随 selectedNode 重算（base / greenhouse / zone 三层粒度）。
 */
import { useMemo } from 'react';
import type { SelectedNode, BaseOpsStats } from '../types';

const MU_TO_SQM = 666.67;

export function useBaseOpsStats(
  selectedNode: SelectedNode,
  baseOidFromUrl: string | undefined,
  bases: any[],
  greenhouses: any[],
  zones: any[],
  blocks: any[],  // 保留参数签名兼容性（未使用但未来可能用到）
  records: any[],  // 保留参数签名兼容性
): BaseOpsStats {
  return useMemo(() => {
    const effectiveBaseOid = selectedNode.oid || baseOidFromUrl;
    const effectiveNodeType = selectedNode.oid
      ? selectedNode.type
      : (baseOidFromUrl ? 'base' : null);

    if (!effectiveBaseOid || !effectiveNodeType) {
      return { totalArea: 0, zoneCount: 0, plantingCount: 0, currentCrop: '-' };
    }

    const computeBaseStats = (targetBaseOid: string): BaseOpsStats => {
      const baseNode = bases.find((b) => b.oid === targetBaseOid);
      const baseGreenhouses = greenhouses.filter((gh) => gh.baseOid === targetBaseOid);
      const baseZones = zones.filter((z) =>
        baseGreenhouses.some((gh) => gh.oid === String(z.greenhouseOid || '')),
      );

      const baseAreaSqm = (Number(baseNode?.area) || 0) * MU_TO_SQM;
      const ghAreaSum = baseGreenhouses.reduce((sum, gh) => sum + (Number(gh.area) || 0), 0);
      const totalArea = baseAreaSqm > 0 ? baseAreaSqm : ghAreaSum;

      const plantingCount = baseZones.reduce(
        (sum, z) => sum + (z.aggregatedPlantings?.count || 0),
        0,
      );
      const currentCrop = baseZones
        .map((z) => z.aggregatedPlantings?.currentCrop)
        .filter((c) => c && c !== '-')[0] || '-';

      return {
        totalArea,
        zoneCount: baseZones.length,
        plantingCount,
        currentCrop,
      };
    };

    switch (effectiveNodeType) {
      case 'base': {
        return computeBaseStats(effectiveBaseOid);
      }
      case 'greenhouse': {
        const ghZones = zones.filter((z) => z.greenhouseOid === selectedNode.oid);
        const plantingCount = ghZones.reduce(
          (sum, z) => sum + (z.aggregatedPlantings?.count || 0),
          0,
        );
        const currentCrop = ghZones
          .map((z) => z.aggregatedPlantings?.currentCrop)
          .filter((c) => c && c !== '-')[0] || '-';
        return {
          totalArea: greenhouses.find((gh) => gh.oid === selectedNode.oid)?.area || 0,
          zoneCount: ghZones.length,
          plantingCount,
          currentCrop,
        };
      }
      case 'zone': {
        const zone = zones.find((z) => z.oid === selectedNode.oid);
        return {
          totalArea: zone?.area || 0,
          zoneCount: 1,
          plantingCount: zone?.aggregatedPlantings?.count || 0,
          currentCrop: zone?.aggregatedPlantings?.currentCrop || '-',
        };
      }
      default:
        return { totalArea: 0, zoneCount: 0, plantingCount: 0, currentCrop: '-' };
    }
  }, [selectedNode, baseOidFromUrl, bases, greenhouses, zones, blocks, records]);
}