/**
 * 基地运营中心 V2 Store - Zustand 状态管理
 * 树形结构管理：基地 → 温室/大棚 → 区域 → 地块
 */
import { create } from 'zustand';
import { getBases, getGreenhouses, getZones, getBlocks } from '@/services/apiBasicDataService';
import type { Base, Greenhouse, Zone, Block } from '@/services/apiBasicDataService';
import type { TreeNode } from '@/components/ui/Tree';

// ============================================
// 类型定义
// ============================================

/** 统计数据 */
export interface BaseStats {
  totalBases: number;
  totalGreenhouses: number;
  totalZones: number;
  totalBlocks: number;
  activeBases: number;
  activeGreenhouses: number;
}

/** 当前选中的节点信息 */
export interface SelectedNodeInfo {
  type: 'base' | 'greenhouse' | 'zone' | 'block' | null;
  oid: string | null;
  name: string | null;
}

// ============================================
// Store 接口
// ============================================

interface BaseOperationsStore {
  // 数据状态
  bases: Base[];
  greenhouses: Greenhouse[];
  zones: Zone[];
  blocks: Block[];

  // 树形状态
  treeData: TreeNode[];
  expandedKeys: string[];
  selectedNode: SelectedNodeInfo;

  // 搜索状态
  searchTerm: string;
  filteredData: TreeNode[];

  // 加载状态
  loading: boolean;
  error: string | null;

  // 统计数据
  stats: BaseStats;

  // Actions - 数据加载
  loadAllData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Actions - 树形操作
  setExpandedKeys: (keys: string[]) => void;
  toggleExpanded: (key: string) => void;
  selectNode: (type: SelectedNodeInfo['type'], oid: string, name: string) => void;
  clearSelection: () => void;

  // Actions - 搜索
  setSearchTerm: (term: string) => void;

  // Actions - 统计
  computeStats: () => void;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 将数据构建为树形结构
 */
function buildTreeData(
  bases: Base[],
  greenhouses: Greenhouse[],
  zones: Zone[],
  blocks: Block[]
): TreeNode[] {
  return bases.map((base) => ({
    key: `base_${base.oid}`,
    title: base.name || base.code || '未命名基地',
    children: greenhouses
      .filter((gh) => gh.baseOid === base.oid)
      .map((gh) => ({
        key: `greenhouse_${gh.oid}`,
        title: gh.name || gh.code || '未命名温室',
        children: zones
          .filter((z) => z.greenhouseOid === gh.oid)
          .map((z) => ({
            key: `zone_${z.oid}`,
            title: z.zoneName || z.zoneCode || '未命名区域',
            children: blocks
              .filter((b) => b.zoneOid === z.oid)
              .map((b) => ({
                key: `block_${b.oid}`,
                title: b.blockName || b.blockCode || '未命名地块',
              })),
          })),
      })),
  }));
}

/**
 * 根据搜索词过滤树形节点
 */
function filterTreeData(nodes: TreeNode[], searchTerm: string): TreeNode[] {
  if (!searchTerm.trim()) return nodes;

  const lowerTerm = searchTerm.toLowerCase();

  function matches(node: TreeNode): boolean {
    return node.title.toLowerCase().includes(lowerTerm);
  }

  function filterRecursive(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .map((node) => {
        // 如果当前节点匹配，保留整个子树
        if (matches(node)) {
          return node;
        }

        // 否则检查子节点
        if (node.children && node.children.length > 0) {
          const filteredChildren = filterRecursive(node.children);
          // 只有当子节点有匹配时才保留该节点
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
        }

        return null;
      })
      .filter((node): node is TreeNode => node !== null);
  }

  return filterRecursive(nodes);
}

/**
 * 计算统计数据
 */
function computeStats(
  bases: Base[],
  greenhouses: Greenhouse[],
  zones: Zone[],
  blocks: Block[]
): BaseStats {
  return {
    totalBases: bases.length,
    totalGreenhouses: greenhouses.length,
    totalZones: zones.length,
    totalBlocks: blocks.length,
    activeBases: bases.filter((b) => b.status === 'active').length,
    activeGreenhouses: greenhouses.filter((gh) => gh.status === 'active').length,
  };
}

// ============================================
// Store 实现
// ============================================

export const useBaseOperationsStore = create<BaseOperationsStore>()((set, get) => ({
  // 初始状态
  bases: [],
  greenhouses: [],
  zones: [],
  blocks: [],

  treeData: [],
  expandedKeys: [],
  selectedNode: {
    type: null,
    oid: null,
    name: null,
  },

  searchTerm: '',
  filteredData: [],

  loading: false,
  error: null,

  stats: {
    totalBases: 0,
    totalGreenhouses: 0,
    totalZones: 0,
    totalBlocks: 0,
    activeBases: 0,
    activeGreenhouses: 0,
  },

  // ============================================
  // Actions - 数据加载
  // ============================================

  loadAllData: async (baseOid?: string) => {
    set({ loading: true, error: null });

    try {
      // 并行加载所有数据
      // 注意：API 返回 {success, data} 格式，需要提取 data 数组
      // 2026-07-25：传 baseOid 让 greenhouse API 只返回该基地的温室
      //           zones/blocks 仍走全量 + 前端 filteredZones/filteredBlocks 过滤
      const [basesData, greenhousesData, zonesData, blocksData] = await Promise.all([
        getBases(),
        getGreenhouses(baseOid),
        getZones(),
        getBlocks(),
      ]);

      // 安全提取数组数据
      const bases = Array.isArray(basesData) ? basesData : (basesData?.data || []);
      const greenhouses = Array.isArray(greenhousesData) ? greenhousesData : (greenhousesData?.data || []);
      const zones = Array.isArray(zonesData) ? zonesData : (zonesData?.data || []);
      const blocks = Array.isArray(blocksData) ? blocksData : (blocksData?.data || []);

      const treeData = buildTreeData(bases, greenhouses, zones, blocks);
      const stats = computeStats(bases, greenhouses, zones, blocks);

      set({
        bases,
        greenhouses,
        zones,
        blocks,
        treeData,
        filteredData: treeData,
        stats,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载数据失败',
        loading: false,
      });
    }
  },

  refreshData: async () => {
    await get().loadAllData();
  },

  // ============================================
  // Actions - 树形操作
  // ============================================

  setExpandedKeys: (keys) => {
    set({ expandedKeys: keys });
  },

  toggleExpanded: (key) => {
    const { expandedKeys } = get();
    const newKeys = expandedKeys.includes(key)
      ? expandedKeys.filter((k) => k !== key)
      : [...expandedKeys, key];
    set({ expandedKeys: newKeys });
  },

  selectNode: (type, oid, name) => {
    set({
      selectedNode: { type, oid, name },
    });
  },

  clearSelection: () => {
    set({
      selectedNode: { type: null, oid: null, name: null },
    });
  },

  // ============================================
  // Actions - 搜索
  // ============================================

  setSearchTerm: (term) => {
    const { treeData } = get();
    const filteredData = filterTreeData(treeData, term);
    set({ searchTerm: term, filteredData });
  },

  // ============================================
  // Actions - 统计
  // ============================================

  computeStats: () => {
    const { bases, greenhouses, zones, blocks } = get();
    const stats = computeStats(bases, greenhouses, zones, blocks);
    set({ stats });
  },
}));
