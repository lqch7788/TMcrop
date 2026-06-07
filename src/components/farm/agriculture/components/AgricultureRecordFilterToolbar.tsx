/**
 * 农事操作记录筛选工具栏组件
 */

import React, { useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { SOURCE_CONFIG, type FarmOperationRecord } from '../../../../hooks/useOperationRecords';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { useGreenhouseStore, useWorkerStore } from '../../../../stores';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

// 来源类型选项
const SOURCE_OPTIONS = Object.entries(SOURCE_CONFIG).map(([value, config]) => ({
  value: value as keyof typeof SOURCE_CONFIG,
  label: config.label,
}));

// 状态选项
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

// 操作类型选项
const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  ...FARM_OPERATION_TYPES.map(t => ({ value: t.value, label: t.label })),
];

interface AgricultureRecordFilterToolbarProps {
  filters: {
    sourceType: '' | 'task' | 'tempTask' | 'manual' | 'inspection';
    operationType: string;
    status: string;
    greenhouseId: string;
    operatorId: string;
    dateFrom: string;
    dateTo: string;
    searchText: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
  onAdd: () => void;
  // 权限控制
  canCreate?: boolean;
}

export function AgricultureRecordFilterToolbar({
  filters,
  onFiltersChange,
  onReset,
  onAdd,
  canCreate = true,
}: AgricultureRecordFilterToolbarProps) {
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  useEffect(() => {
    if (greenhouses.length === 0) loadGreenhouses();
    if (workers.length === 0) loadWorkers();
  }, [greenhouses.length, loadGreenhouses, workers.length, loadWorkers]);

  // 温室选项
  const greenhouseOptions = useMemo(() =>
    greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name })),
    [greenhouses]
  );

  // 操作人员选项
  const operatorOptions = useMemo(() =>
    workers.filter(w => w.status === 'active').map(w => ({ value: w.id, label: w.name })),
    [workers]
  );
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 搜索框 */}
        <div className="flex-1 min-w-[180px]">
          <Label className="text-gray-700">搜索</Label>
          <Input
            type="text"
            value={filters.searchText}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            placeholder="操作单号/作物/区域/人员"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 来源类型 */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">来源类型</Label>
          <Select
            value={filters.sourceType}
            onValueChange={(val) => onFiltersChange({ ...filters, sourceType: val as any })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作类型 */}
        <div className="min-w-[140px]">
          <Label className="text-gray-700">操作类型</Label>
          <Select
            value={filters.operationType}
            onValueChange={(val) => onFiltersChange({ ...filters, operationType: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">状态</Label>
          <Select
            value={filters.status}
            onValueChange={(val) => onFiltersChange({ ...filters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作区域 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">操作区域</Label>
          <Select
            value={filters.greenhouseId}
            onValueChange={(val) => onFiltersChange({ ...filters, greenhouseId: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {greenhouseOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作人员 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">操作人员</Label>
          <Select
            value={filters.operatorId}
            onValueChange={(val) => onFiltersChange({ ...filters, operatorId: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {operatorOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onReset}>
            重置
          </Button>
          {canCreate && (
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
