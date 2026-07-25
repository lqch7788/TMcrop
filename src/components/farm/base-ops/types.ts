/**
 * 基地运营中心（base-ops）共享类型定义
 * Plan B 2026-07-25
 */

export type NodeType = 'base' | 'greenhouse' | 'zone' | 'block' | 'planting';

export interface SelectedNode {
  type: NodeType;
  oid: string;
  name?: string;
}

export interface BaseOpsStats {
  totalArea: number;
  zoneCount: number;
  plantingCount: number;
  currentCrop: string;
}

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}