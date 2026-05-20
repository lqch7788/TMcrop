/**
 * 种植筛选工具栏组件
 */

import React, { useMemo } from 'react';
import { Search, RotateCcw, Plus } from 'lucide-react';
import { PlantingFilters } from '../../../../types/crop';
import { Button } from '@/components/ui/button';
import { Label, TreeSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { TreeSelectNode } from '@/components/ui/TreeSelect';
import { Input } from '../../../ui/input';

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
          <Label className="text-gray-700">作物品种</Label>
          <Select
            value={filters.cropName}
            onValueChange={(val) => onChange({ ...filters, cropName: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {cropNames.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 种植批号 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">种植批号</Label>
          <Input
            type="text"
            value={filters.plantCode}
            onChange={(e) => onChange({ ...filters, plantCode: e.target.value })}
            placeholder="请输入种植批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 来源批号（种源/育苗批号） */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">来源批号</Label>
          <Input
            type="text"
            value={filters.sourceCode}
            onChange={(e) => onChange({ ...filters, sourceCode: e.target.value })}
            placeholder="请输入来源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 定植日期 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">定植日期</Label>
          <Input
            type="date"
            value={filters.transplantDate}
            onChange={(e) => onChange({ ...filters, transplantDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种植区域/大棚位置（树形选择） */}
        <div className="min-w-[160px]">
          <Label className="text-gray-700">大棚位置</Label>
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
          <Label className="text-gray-700">采收状态</Label>
          <Select
            value={filters.isHarvest}
            onValueChange={(val) => onChange({ ...filters, isHarvest: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">未采收</SelectItem>
              <SelectItem value="true">已采收</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 第二行：方案3.3 组织筛选 + 定植数量范围 */}
      <div className="flex flex-wrap gap-4 items-end mt-3">
        {/* 组织 */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">组织</Label>
          <Input
            type="text"
            value={filters.orgName || ''}
            onChange={(e) => onChange({ ...filters, orgName: e.target.value })}
            placeholder="输入组织名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 定植数量最小值 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">定植数量≥</Label>
          <Input
            type="number"
            value={filters.countMin || ''}
            onChange={(e) => onChange({ ...filters, countMin: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="最小值"
            min="0"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 定植数量最大值 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">定植数量≤</Label>
          <Input
            type="number"
            value={filters.countMax || ''}
            onChange={(e) => onChange({ ...filters, countMax: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="最大值"
            min="0"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
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
