/**
 * 作物品种库树形结构类型定义
 * 用于树形展示的节点数据结构
 */

import { ProduceCategoryCode } from '../../../data/produceCodeRule';
import { CropVariety } from '../../../types/cropVariety';

/**
 * 树形节点层级类型
 */
export type TreeLevel = 'category' | 'type' | 'variety' | 'subVariety1' | 'detail';

/**
 * 树形节点数据
 */
export interface VarietyTreeNode {
  /** 节点唯一标识（编码路径） */
  key: string;
  /** 显示名称 */
  name: string;
  /** 编码（11位或部分） */
  code: string;
  /** 节点层级 */
  level: TreeLevel;
  /** 子节点 */
  children: VarietyTreeNode[];
  /** 是否为叶子节点 */
  isLeaf: boolean;
  /** 是否已录入（用户已添加的品种） */
  isRecorded: boolean;
  /** 完整作物编码（11位，仅叶子节点） */
  fullCropCode?: string;
  /** 用户录入的品种详情（仅已录入的节点有值） */
  recordedVariety?: CropVariety;
  /** 层级路径信息 */
  path: {
    categoryCode: ProduceCategoryCode;
    categoryName: string;
    typeCode: string;
    typeName: string;
    varietyCode: string;
    varietyName: string;
    subVariety1Code?: string;
    subVariety1Name?: string;
  };
  /** 是否有子节点（用于显示展开图标） */
  hasChildren: boolean;
  /** 直接子节点数量 */
  childCount: number;
}

/**
 * 树形展开状态
 */
export interface TreeExpandState {
  /** 展开的节点key集合 */
  expandedKeys: Set<string>;
  /** 默认展开到某一级 */
  defaultExpandLevel: TreeLevel;
}

/**
 * 显示模式
 */
export type DisplayMode = 'recorded' | 'all';

/**
 * 树形组件Props
 */
export interface VarietyTreeProps {
  /** 视图模式 */
  viewMode: 'table' | 'tree';
  /** 视图模式切换回调 */
  onViewModeChange: (mode: 'table' | 'tree') => void;
  /** 搜索关键词 */
  searchKeyword?: string;
  /** 类别筛选 */
  categoryFilter?: string;
  /** 选中回调 */
  onSelect: (variety: CropVariety) => void;
  /** 新增回调 */
  onAdd: (node?: VarietyTreeNode) => void;
  /** 编辑回调 */
  onEdit: (variety: CropVariety) => void;
  /** 删除回调 */
  onDelete: (variety: CropVariety) => void;
  /** 展开状态变化回调 */
  onExpandChange?: (expandedKeys: string[]) => void;
}

/**
 * 树形Hook返回值
 */
export interface UseVarietyTreeReturn {
  /** 树形数据 */
  treeData: VarietyTreeNode[];
  /** 展开的节点key数组 */
  expandedKeys: string[];
  /** 展开/折叠节点 */
  toggleExpand: (key: string) => void;
  /** 展开所有 */
  expandAll: () => void;
  /** 折叠所有 */
  collapseAll: () => void;
  /** 展开到指定级别 */
  expandToLevel: (level: TreeLevel) => void;
  /** 节点总数统计 */
  totalNodeCount: number;
  /** 已录入节点数 */
  recordedNodeCount: number;
}
