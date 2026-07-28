/**
 * 作物品种库树形状态管理Hook
 * 管理树形的展开状态、数据转换、搜索过滤等功能
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  VarietyTreeNode,
  TreeLevel,
  UseVarietyTreeReturn,
  DisplayMode
} from '../types';
import { CropVariety } from '../../../../types/cropVariety';
import { produceCategories, getProduceTypesByCategory, ProduceCategoryCode } from '../../../../data/produceCodeRule';
import { getVarietyOptions, getAllVarieties as getLocalVarieties } from '../../../../services/cropVarietyService';
import { getCategoryExtensions, getTypeExtensions, getVarietyExtensions, getSubVariety1Extensions } from '../../../../services/cropVarietyExtensionService';

/**
 * 将已录入品种转换为以编码前缀分组的Map
 * 2026-07-28 修复：用完整的 crop_code 字段作为 key（唯一），不再用 categoryCode+typeCode+varietyCode+subVariety1Code 拼接
 * 之前拼接 key 在 sub_variety1_code='000' 等场景下，多条 crop_code 不同的记录（如 FR0101009 香野 vs FR01011000 梦之娇）
 * 拼成同一个 key，导致 map.set/map.get 互相覆盖，树形图只能看到一条
 * @param varieties 品种数据源（Store 或 localStorage）
 */
const buildRecordedVarietyMap = (varieties?: CropVariety[]): Map<string, CropVariety[]> => {
  const data = varieties ?? getLocalVarieties();
  const map = new Map<string, CropVariety[]>();

  for (const v of data) {
    // 用 crop_code 作为 key（数据库原值，9 位唯一）
    if (!v.cropCode) continue;
    const key = v.cropCode;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(v);
  }

  return map;
};

/**
 * 判断某路径下是否有已录入品种
 * 2026-07-28：recordedMap 已改用完整 crop_code 作为 key，所以前缀匹配即可
 */
const hasRecordedVariety = (
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string,
  recordedMap?: Map<string, CropVariety[]>
): boolean => {
  if (!recordedMap) return false;
  const prefix = `${categoryCode}${typeCode}${varietyCode}${subVariety1Code || '000'}`;
  // 用 startsWith 前缀匹配（兼容 9 位和 10 位 crop_code）
  for (const key of recordedMap.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
};

/**
 * 构建树形节点
 */
const buildTreeNode = (
  level: TreeLevel,
  name: string,
  code: string,
  path: VarietyTreeNode['path'],
  recordedMap: Map<string, CropVariety[]>
): VarietyTreeNode => {
  const children: VarietyTreeNode[] = [];
  let hasChildren = false;
  let childCount = 0;
  let isRecorded = false;

  // 计算节点 key（统一在函数顶部声明，供各级分支与返回语句共享）
  // 2026-07-28 修复：将此声明从函数末尾上移至此，避免 subVariety1 分支 line 306 引用 key 时触发 TDZ（Cannot access 'key' before initialization）
  const key = level === 'category'
    ? code
    : level === 'type'
    ? `${path.categoryCode}-${code}`
    : level === 'variety'
    ? `${path.categoryCode}-${path.typeCode}-${code}`
    : `${path.categoryCode}-${path.typeCode}-${path.varietyCode}-${code}`;

  if (level === 'category') {
    // 类别节点 - 构建类型子节点（预定义 + 用户扩展）
    const category = produceCategories.find(c => c.code === code as ProduceCategoryCode);
    if (category) {
      const types = getProduceTypesByCategory(category.code);
      for (const type of types) {
        const typeNode = buildTreeNode(
          'type',
          type.name,
          type.code,
          { ...path, typeCode: type.code, typeName: type.name },
          recordedMap
        );
        children.push(typeNode);
        if (typeNode.hasChildren || typeNode.isRecorded) {
          hasChildren = true;
        }
        childCount++;
      }
      // 添加用户扩展的类型（数据库返回的是 snake_case 字段名）
      const extensionTypes = getTypeExtensions(category.code);
      for (const extType of extensionTypes) {
        // 跳过已存在的预定义类型
        if (types.some(t => t.code === extType.type_code)) continue;
        const typeNode = buildTreeNode(
          'type',
          extType.type_name,
          extType.type_code,
          { ...path, typeCode: extType.type_code, typeName: extType.type_name },
          recordedMap
        );
        // 标记为扩展节点
        (typeNode as any).isExtension = true;
        (typeNode as any).extensionId = extType.id;
        children.push(typeNode);
        hasChildren = true;
        childCount++;
      }
    }
    isRecorded = hasRecordedVariety(code, '', '', undefined, recordedMap);
    // 确保有类型子节点时展开箭头显示
    if (children.length > 0) hasChildren = true;
  } else if (level === 'type') {
    // 类型节点 - 构建品种子节点（预定义 + 用户扩展）
    const category = produceCategories.find(c => c.code === path.categoryCode);
    if (category) {
      const types = getProduceTypesByCategory(category.code);
      const type = types.find(t => t.code === code);
      if (type) {
        for (const variety of type.subCategories) {
          const varietyNode = buildTreeNode(
            'variety',
            variety.name,
            variety.code,
            { ...path, varietyCode: variety.code, varietyName: variety.name },
            recordedMap
          );
          // 始终添加品种节点到树中，无论是否有子节点
          children.push(varietyNode);
          if (varietyNode.hasChildren || varietyNode.isRecorded) {
            hasChildren = true;
          }
          childCount++;
        }
        // 添加用户扩展的品种（数据库返回 snake_case 字段名）
        const extensionVarieties = getVarietyExtensions(path.categoryCode, code);
        for (const extVar of extensionVarieties) {
          // 跳过已存在的预定义品种
          if (type.subCategories.some(v => v.code === extVar.variety_code)) continue;
          const varietyNode = buildTreeNode(
            'variety',
            extVar.variety_name,
            extVar.variety_code,
            { ...path, varietyCode: extVar.variety_code, varietyName: extVar.variety_name },
            recordedMap
          );
          // 标记为扩展节点
          (varietyNode as any).isExtension = true;
          (varietyNode as any).extensionId = extVar.id;
          children.push(varietyNode);
          hasChildren = true;
          childCount++;
        }
      }
    }
    isRecorded = hasRecordedVariety(path.categoryCode, code, '', undefined, recordedMap);
    // 确保有子品种时展开箭头显示
    if (children.length > 0) hasChildren = true;
  } else if (level === 'variety') {
    // 品种节点 - 构建子品种1子节点（预定义 + 用户扩展 + 2026-07-28 修复：已录入但未在预定义/extensions 中的）
    const category = produceCategories.find(c => c.code === path.categoryCode);
    if (category) {
      const types = getProduceTypesByCategory(category.code);
      const type = types.find(t => t.code === path.typeCode);
      if (type) {
        const variety = type.subCategories.find(v => v.code === code);
        // 收集所有子品种1的code，用于去重
        const existingSubCodes = new Set<string>();

        if (variety?.subVarieties && variety.subVarieties.length > 0) {
          for (const sub of variety.subVarieties) {
            existingSubCodes.add(sub.code);
            const subNode = buildTreeNode(
              'subVariety1',
              sub.name,
              sub.code,
              { ...path, subVariety1Code: sub.code, subVariety1Name: sub.name },
              recordedMap
            );
            children.push(subNode);
            hasChildren = true;
            childCount++;
          }
          isRecorded = hasRecordedVariety(path.categoryCode, path.typeCode, code, undefined, recordedMap);
        }

        // 添加用户扩展的子品种1（数据库返回 snake_case 字段名）
        const extensionSubVarieties = getSubVariety1Extensions(path.categoryCode, path.typeCode, code);
        for (const extSub of extensionSubVarieties) {
          // 跳过已存在的预定义子品种
          if (existingSubCodes.has(extSub.sub_variety1_code)) continue;
          existingSubCodes.add(extSub.sub_variety1_code);
          const subNode = buildTreeNode(
            'subVariety1',
            extSub.sub_variety1_name,
            extSub.sub_variety1_code,
            { ...path, subVariety1Code: extSub.sub_variety1_code, subVariety1Name: extSub.sub_variety1_name },
            recordedMap
          );
          // 标记为扩展节点
          (subNode as any).isExtension = true;
          (subNode as any).extensionId = extSub.id;
          children.push(subNode);
          hasChildren = true;
          childCount++;
        }

        // 2026-07-28 修复：遍历 recordedMap 找到该 variety 下所有已录入的 subVariety1，
        // 对每个未在预定义/extensions 中的 code 创建子节点（解决"天使8号"、"梦之娇"、"越王"等
        // 不在预定义 subVariety 范围、不在 extensions 表，但仍已录入的品种在树形图中消失的问题）
        // 2026-07-28 v2：buildRecordedVarietyMap 已改用 crop_code 作为 key，
        // 所以 key 前 9 位 = categoryCode(2) + typeCode(2) + varietyCode(2) + subVariety1Code(3)
        const varietyPrefix = `${path.categoryCode}${path.typeCode}${code}`;
        for (const [mapKey, recordedVarieties] of recordedMap.entries()) {
          if (!mapKey.startsWith(varietyPrefix)) continue;
          // crop_code 前 9 位：6 位 prefix + 3 位 subVariety1Code
          // 但是部分历史数据 crop_code 是 10 位（如 FR01011000），前 9 位是 'FR0101100'（不是合法 subVariety1Code）
          // 兼容处理：取 crop_code 的第 7-9 位作为 subVariety1Code（3 位），剩余 crop_code 作为 detailKey
          const subCodeFromKey = mapKey.slice(6, 9);
          // 跳过已经在预定义/extensions 中的
          if (existingSubCodes.has(subCodeFromKey)) continue;
          // 兼容 9 位和 10 位 crop_code（之前的 length === 9 检查把 10 位的 FR01011000 排除了）
          if (mapKey.length !== 9 && mapKey.length !== 10) continue;
          // 用第一条已录入品种作为节点信息（subVariety1Name/extensionId）
          const rv = recordedVarieties[0];
          if (!rv) continue;
          const subName = rv.subVariety1Name || subCodeFromKey;
          existingSubCodes.add(subCodeFromKey);
          const subNode = buildTreeNode(
            'subVariety1',
            subName,
            subCodeFromKey,
            { ...path, subVariety1Code: rv.subVariety1Code || subCodeFromKey, subVariety1Name: subName },
            recordedMap
          );
          children.push(subNode);
          hasChildren = true;
          childCount++;
        }

        // 如果既没有预定义子品种也没有扩展子品种，检查是否有已录入的详细品种（直接挂在品种下）
        if (children.length === 0) {
          const key = `${path.categoryCode}${path.typeCode}${code}000`;
          const recordedVarieties = recordedMap.get(key) || [];
          if (recordedVarieties.length > 0) {
            for (const rv of recordedVarieties) {
              const detailName = (!rv.detailVarietyCode || rv.detailVarietyCode === '00' || rv.detailVarietyCode === '')
                ? (rv.subVariety1Name || '')
                : (rv.detailVarietyName || rv.subVariety1Name || '');
              const detailNode: VarietyTreeNode = {
                key: `${key}${String(rv.detailVarietyCode ?? '00')}`,
                name: detailName,
                code: String(rv.detailVarietyCode ?? '00'),
                level: 'detail',
                children: [],
                isLeaf: true,
                isRecorded: true,
                fullCropCode: rv.cropCode,
                recordedVariety: rv,
                path,
                hasChildren: false,
                childCount: 0
              };
              children.push(detailNode);
              hasChildren = true;
              childCount++;
            }
            isRecorded = true;
          }
        }
      }
    }
  } else if (level === 'subVariety1') {
    // 子品种1节点 - 构建详细品种子节点（用户录入的）
    // 2026-07-28 修复：recordedMap 已改用完整 crop_code 作为 key
    // 所以要遍历 recordedMap 找 categoryCode+typeCode+varietyCode+code（subVariety1Code）前缀匹配的记录
    const subKeyPrefix = `${path.categoryCode}${path.typeCode}${path.varietyCode}${code}`;
    const recordedVarieties: CropVariety[] = [];
    for (const [mapKey, items] of recordedMap.entries()) {
      if (mapKey.startsWith(subKeyPrefix)) {
        recordedVarieties.push(...items);
      }
    }

    // 按detailVarietyCode排序（00, 01, 02...）
    const sortedVarieties = [...recordedVarieties].sort((a, b) => {
      const codeA = parseInt(a.detailVarietyCode || '0', 10);
      const codeB = parseInt(b.detailVarietyCode || '0', 10);
      return codeA - codeB;
    });

    for (const rv of sortedVarieties) {
      // 当 detailVarietyCode 为 '00' 或空时，使用 subVariety1Name 作为名称
      // 否则使用用户录入的 detailVarietyName
      const detailName = (!rv.detailVarietyCode || rv.detailVarietyCode === '00' || rv.detailVarietyCode === '')
        ? (rv.subVariety1Name || '')
        : (rv.detailVarietyName || rv.subVariety1Name || '');

      const detailNode: VarietyTreeNode = {
        key: `${key}${String(rv.detailVarietyCode ?? '')}`,
        name: detailName,
        code: String(rv.detailVarietyCode ?? '00'),
        level: 'detail',
        children: [],
        isLeaf: true,
        isRecorded: true,
        fullCropCode: rv.cropCode,
        recordedVariety: rv,
        path,
        hasChildren: false,
        childCount: 0
      };
      children.push(detailNode);
      hasChildren = true;
      childCount++;
    }
    isRecorded = recordedVarieties.length > 0;
  }

  // key 已在函数顶部声明，此处不再重复
  return {
    key,
    name,
    code,
    level,
    children,
    isLeaf: !hasChildren,
    isRecorded,
    path,
    hasChildren,
    childCount
  };
};

/**
 * 根据显示模式过滤树形数据
 * recorded模式：只显示有已录入品种的节点
 */
const filterTreeByMode = (nodes: VarietyTreeNode[], mode: DisplayMode): VarietyTreeNode[] => {
  if (mode === 'all') return nodes;

  // recorded模式：只保留有已录入品种或路径上有已录入品种的节点
  return nodes.filter(node => {
    // 如果节点本身已录入，保留
    if (node.isRecorded) return true;
    // 如果有子节点（深层有已录入品种），保留但过滤子节点
    if (node.hasChildren) {
      const filteredChildren = filterTreeByMode(node.children, mode);
      return filteredChildren.length > 0;
    }
    return false;
  }).map(node => ({
    ...node,
    children: node.hasChildren ? filterTreeByMode(node.children, mode) : []
  }));
};

/**
 * 根据关键词搜索树形节点
 * 规则：
 * 1. 如果节点名称匹配关键词，显示该节点及其所有子节点
 * 2. 如果节点名称不匹配但子节点有匹配，连同父节点一起显示
 * 3. 搜索时保留预定义结构，即使父节点匹配也显示所有子节点
 */
const searchTree = (nodes: VarietyTreeNode[], keyword: string): VarietyTreeNode[] => {
  if (!keyword.trim()) return nodes;

  const lowerKeyword = keyword.toLowerCase();

  const searchNode = (node: VarietyTreeNode): VarietyTreeNode | null => {
    // 检查当前节点名称是否匹配
    const nameMatch = (node.name || '').toLowerCase().includes(lowerKeyword);
    // 检查已录入品种信息是否匹配
    const recordedMatch = node.recordedVariety
      ? (node.recordedVariety.varietyName || '').toLowerCase().includes(lowerKeyword) ||
        node.recordedVariety.alias?.some(a => (a || '').toLowerCase().includes(lowerKeyword))
      : false;

    // 递归搜索子节点
    const matchedChildren: VarietyTreeNode[] = [];
    for (const child of node.children) {
      const matched = searchNode(child);
      if (matched) matchedChildren.push(matched);
    }

    // 如果当前节点匹配，保留所有子节点结构（即使子节点不匹配）
    if (nameMatch || recordedMatch) {
      return {
        ...node,
        children: node.children, // 保留所有预定义子节点
        hasChildren: node.hasChildren
      };
    }

    // 如果当前节点不匹配但有匹配的子节点，返回带匹配子节点的父节点
    if (matchedChildren.length > 0) {
      return {
        ...node,
        children: matchedChildren,
        hasChildren: matchedChildren.length > 0
      };
    }

    return null;
  };

  const result: VarietyTreeNode[] = [];
  for (const node of nodes) {
    const matched = searchNode(node);
    if (matched) result.push(matched);
  }

  return result;
};

/**
 * 收集所有节点key
 */
const collectAllKeys = (nodes: VarietyTreeNode[]): string[] => {
  const keys: string[] = [];
  const collect = (nodeList: VarietyTreeNode[]) => {
    for (const node of nodeList) {
      keys.push(node.key);
      if (node.children.length > 0) {
        collect(node.children);
      }
    }
  };
  collect(nodes);
  return keys;
};

/**
 * 获取节点到达指定层级的所有祖先key
 */
const getAncestorKeys = (nodeKey: string, targetLevel: TreeLevel): string[] => {
  const parts = nodeKey.split('-');
  const levelIndex = targetLevel === 'category' ? 0
    : targetLevel === 'type' ? 1
    : targetLevel === 'variety' ? 2
    : targetLevel === 'subVariety1' ? 3
    : 4;

  // 只返回当前节点的key，不展开祖先
  const ancestors: string[] = [nodeKey];
  return ancestors;
};

/**
 * 树形状态管理Hook
 */
export function useVarietyTree(
  searchKeyword: string = '',
  categoryFilter: string = '',
  displayMode: DisplayMode = 'recorded',
  defaultExpandLevel: TreeLevel = 'subVariety1',
  refreshKey?: number,
  recordedVarieties?: CropVariety[]
): UseVarietyTreeReturn {
  // 展开状态
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  // 是否已初始化（避免刷新时重置展开状态）
  const [isExpandedInitialized, setIsExpandedInitialized] = useState(false);

  // 构建已录入品种Map（从传入的 varieties 或 localStorage 获取）
  const recordedVarietyMap = useMemo(() => buildRecordedVarietyMap(recordedVarieties), [recordedVarieties, refreshKey]);

  // 构建完整树形数据
  const fullTreeData = useMemo((): VarietyTreeNode[] => {
    const nodes: VarietyTreeNode[] = [];

    for (const category of produceCategories) {
      // 类别筛选
      if (categoryFilter && category.code !== categoryFilter) {
        continue;
      }

      const categoryNode = buildTreeNode(
        'category',
        category.name,
        category.code,
        {
          categoryCode: category.code as ProduceCategoryCode,
          categoryName: category.name,
          typeCode: '',
          typeName: '',
          varietyCode: '',
          varietyName: '',
        },
        recordedVarietyMap
      );

      // 始终显示所有预定义类别
      if (categoryNode.hasChildren || categoryNode.isRecorded || categoryNode.children.length > 0) {
        nodes.push(categoryNode);
      }
    }

    // 添加用户扩展的类别（数据库返回 snake_case 字段名）
    const existingCategoryCodes = new Set(produceCategories.map(c => c.code));
    const extensionCategories = getCategoryExtensions();
    for (const extCat of extensionCategories) {
      if (categoryFilter && extCat.category_code !== categoryFilter) continue;
      // 跳过已存在的预定义类别
      if (existingCategoryCodes.has(extCat.category_code as any)) continue;
      const catNode = buildTreeNode(
        'category',
        extCat.category_name,
        extCat.category_code,
        {
          categoryCode: extCat.category_code as ProduceCategoryCode,
          categoryName: extCat.category_name,
          typeCode: '',
          typeName: '',
          varietyCode: '',
          varietyName: '',
        },
        recordedVarietyMap
      );
      // 标记为扩展节点
      (catNode as any).isExtension = true;
      (catNode as any).extensionId = extCat.id;
      nodes.push(catNode);
    }

    return nodes;
  }, [categoryFilter, recordedVarietyMap]);

  // 应用显示模式过滤
  const modeFilteredTree = useMemo(() => {
    return filterTreeByMode(fullTreeData, displayMode);
  }, [fullTreeData, displayMode]);

  // 应用搜索过滤
  const treeData = useMemo(() => {
    if (!searchKeyword.trim()) return modeFilteredTree;
    return searchTree(modeFilteredTree, searchKeyword);
  }, [modeFilteredTree, searchKeyword]);

  // 统计信息
  const totalNodeCount = useMemo(() => collectAllKeys(fullTreeData).length, [fullTreeData]);
  const recordedNodeCount = useMemo(() => {
    let count = 0;
    const countRecorded = (nodes: VarietyTreeNode[]) => {
      for (const node of nodes) {
        if (node.isRecorded) count++;
        if (node.children.length > 0) countRecorded(node.children);
      }
    };
    countRecorded(fullTreeData);
    return count;
  }, [fullTreeData]);

  // 展开/折叠节点
  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // 展开所有
  const expandAll = useCallback(() => {
    setExpandedKeys(new Set(collectAllKeys(treeData)));
  }, [treeData]);

  // 折叠所有
  const collapseAll = useCallback(() => {
    setExpandedKeys(new Set());
  }, []);

  // 展开到指定级别
  const expandToLevel = useCallback((level: TreeLevel) => {
    const keysToExpand: string[] = [];
    const expandNode = (nodes: VarietyTreeNode[]) => {
      for (const node of nodes) {
        const ancestorKeys = getAncestorKeys(node.key, level);
        keysToExpand.push(...ancestorKeys);
        if (node.children.length > 0) {
          expandNode(node.children);
        }
      }
    };
    expandNode(treeData);
    setExpandedKeys(new Set(keysToExpand));
  }, [treeData]);

  // 初始化时展开到默认级别（仅展开第一级，让用户自己选择展开哪一级的子节点）
  // 注意：只在首次初始化时执行，刷新时保留用户展开的状态
  useEffect(() => {
    if (!isExpandedInitialized) {
      const initialKeys = treeData.map(node => node.key);
      setExpandedKeys(new Set(initialKeys));
      setIsExpandedInitialized(true);
    }
  }, [treeData, isExpandedInitialized]);

  return {
    treeData,
    expandedKeys: Array.from(expandedKeys),
    toggleExpand,
    expandAll,
    collapseAll,
    expandToLevel,
    totalNodeCount,
    recordedNodeCount
  };
}
