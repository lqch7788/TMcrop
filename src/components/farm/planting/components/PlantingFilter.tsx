/**
 * 种植筛选工具栏组件
 */

import React, { useMemo } from 'react';
import { Search, RotateCcw, Plus } from 'lucide-react';
import { PlantingFilters } from '../../../../types/crop';
import { Button } from '@/components/ui/button';
import { TreeSelect } from '@/components/ui';
import type { TreeSelectNode } from '@/components/ui/TreeSelect';

interface PlantingFilterProps {
  filters: PlantingFilters;
  onChange: (filters: PlantingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  onAdd?: () => void;
  cropNames: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string; parent?: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function PlantingFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  onAdd,
  cropNames,
  areas,
  statusOptions
}: PlantingFilterProps) {
  /** 将扁平区域数据构建为树形结构 */
  const areaTreeData = useMemo<TreeSelectNode[]>(() => {
    const nodeMap = new Map<string, TreeSelectNode>();
    const roots: TreeSelectNode[] = [];

    // 先创建所有节点
    areas.forEach((a) => {
      nodeMap.set(a.value, { key: a.value, title: a.label, children: [] });
    });

    // 建立父子关系
    areas.forEach((a) => {
      const node = nodeMap.get(a.value)!;
      if (a.parent && nodeMap.has(a.parent)) {
        const parent = nodeMap.get(a.parent)!;
        if (!parent.children) parent.children = [];
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    // 清理空 children 数组
    const cleanChildren = (nodes: TreeSelectNode[]) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length === 0) delete n.children;
        if (n.children) cleanChildren(n.children);
      });
    };
    cleanChildren(roots);

    return roots;
  }, [areas]);

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 作物品种 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
          <select
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {cropNames.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 种植批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">种植批号</label>
          <input
            type="text"
            value={filters.plantCode}
            onChange={(e) => onChange({ ...filters, plantCode: e.target.value })}
            placeholder="请输入种植批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 来源批号（种源/育苗批号） */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">来源批号</label>
          <input
            type="text"
            value={filters.sourceCode}
            onChange={(e) => onChange({ ...filters, sourceCode: e.target.value })}
            placeholder="请输入来源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 定植日期 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">定植日期</label>
          <input
            type="date"
            value={filters.transplantDate}
            onChange={(e) => onChange({ ...filters, transplantDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种植区域/大棚位置（树形选择） */}
        <div className="min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">大棚位置</label>
          <TreeSelect
            value={filters.areaName || undefined}
            onChange={(val) => onChange({ ...filters, areaName: val || '' })}
            treeData={areaTreeData}
            placeholder="全部"
            allowClear
            showSearch
            className="h-10"
          />
        </div>

        {/* 采收状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">采收状态</label>
          <select
            value={filters.isHarvest}
            onChange={(e) => onChange({ ...filters, isHarvest: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="false">未采收</option>
            <option value="true">已采收</option>
          </select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2 ml-auto">
          {onAdd && (
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
          )}
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
