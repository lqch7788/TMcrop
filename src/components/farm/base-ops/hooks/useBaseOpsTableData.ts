/**
 * 基地运营中心 — 主表格数据 hook
 * Plan B 2026-07-25
 *
 * 根据 selectedNode.type 返回：
 *   - base / 默认：温室列表（GREENHOUSE_COLUMNS）
 *   - greenhouse：区块列表（ZONE_COLUMNS）
 *   - zone：地块列表（BLOCK_COLUMNS）
 *   - block：种植记录列表（PLANTING_RECORD_COLUMNS）
 *
 * 列定义先直接 export 出来（不引 V2 文件，避免循环依赖）。
 */
import { useMemo } from 'react';
import type { SelectedNode, TableColumn } from '../types';

export const BASE_COLUMNS: TableColumn[] = [
  { key: 'code', label: '编码', width: 'w-32' },
  { key: 'name', label: '名称' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

export const GREENHOUSE_COLUMNS: TableColumn[] = [
  { key: 'code', label: '编码', width: 'w-32' },
  { key: 'name', label: '名称' },
  { key: 'location', label: '位置' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

export const ZONE_COLUMNS: TableColumn[] = [
  { key: 'zoneCode', label: '编码', width: 'w-32' },
  { key: 'zoneName', label: '名称' },
  { key: 'zoneType', label: '类型' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

export const BLOCK_COLUMNS: TableColumn[] = [
  { key: 'blockCode', label: '编码', width: 'w-32' },
  { key: 'blockName', label: '名称' },
  { key: 'blockType', label: '类型' },
  { key: 'area', label: '面积' },
  { key: 'status', label: '状态', width: 'w-24' },
  { key: 'action', label: '操作', width: 'w-32' },
];

export const PLANTING_RECORD_COLUMNS: TableColumn[] = [
  { key: 'seasonCode', label: '编码', width: 'w-32' },
  { key: 'cropName', label: '作物' },
  { key: 'varietyName', label: '品种' },
  { key: 'startDate', label: '开始日期' },
  { key: 'status', label: '状态', width: 'w-24' },
];

export function useBaseOpsTableData(
  selectedNode: SelectedNode,
  baseOidFromUrl: string | undefined,
  bases: any[],
  greenhouses: any[],
  zones: any[],
  blocks: any[],
  records: any[],
): { tableData: any[]; tableColumns: TableColumn[] } {
  const tableColumns = useMemo<TableColumn[]>(() => {
    switch (selectedNode.type) {
      case 'base': return GREENHOUSE_COLUMNS;
      case 'greenhouse': return ZONE_COLUMNS;
      case 'zone': return BLOCK_COLUMNS;
      case 'block': return PLANTING_RECORD_COLUMNS;
      default: return BASE_COLUMNS;
    }
  }, [selectedNode.type]);

  const tableData = useMemo(() => {
    if (!selectedNode.oid) {
      if (baseOidFromUrl) {
        return greenhouses
          .filter((gh) => gh.baseOid === baseOidFromUrl)
          .map((gh) => ({
            type: 'greenhouse' as const,
            oid: gh.oid,
            code: gh.code || '-',
            name: gh.name || '未命名温室',
            location: gh.location || '-',
            area: gh.area ? `${gh.area}` : '-',
            status: gh.status || 'active',
          }));
      }
      return bases.map((b) => ({
        type: 'base' as const,
        oid: b.oid,
        code: b.code || '-',
        name: b.name || '未命名基地',
        area: b.area ? `${b.area}` : '-',
        status: b.status || 'active',
      }));
    }

    switch (selectedNode.type) {
      case 'base': {
        return greenhouses
          .filter((gh) => gh.baseOid === selectedNode.oid)
          .map((gh) => ({
            type: 'greenhouse' as const,
            oid: gh.oid,
            code: gh.code || '-',
            name: gh.name || '未命名温室',
            location: gh.location || '-',
            area: gh.area ? `${gh.area}` : '-',
            status: gh.status || 'active',
          }));
      }
      case 'greenhouse': {
        return zones
          .filter((z) => z.greenhouseOid === selectedNode.oid)
          .map((z) => ({
            type: 'zone' as const,
            oid: z.oid,
            zoneCode: z.zoneCode || '-',
            zoneName: z.zoneName || '未命名区域',
            zoneType: z.zoneType || '-',
            area: z.area ? `${z.area}` : '-',
            status: z.status || 'active',
          }));
      }
      case 'zone': {
        return blocks
          .filter((b) => b.zoneOid === selectedNode.oid)
          .map((b) => ({
            type: 'block' as const,
            oid: b.oid,
            blockCode: b.blockCode || '-',
            blockName: b.blockName || '未命名地块',
            blockType: b.blockType || '-',
            area: b.area ? `${b.area}` : '-',
            status: b.status || 'active',
          }));
      }
      case 'block': {
        return records
          .filter((r) => r.blockOid === selectedNode.oid)
          .map((r) => ({
            type: 'planting' as const,
            oid: r.oid,
            seasonCode: r.seasonCode || '-',
            cropName: r.cropName || '-',
            varietyName: r.varietyName || '-',
            startDate: r.startDate?.slice(0, 10) || '-',
            status: r.status || '-',
          }));
      }
      default:
        return [];
    }
  }, [selectedNode, baseOidFromUrl, bases, greenhouses, zones, blocks, records]);

  return { tableData, tableColumns };
}