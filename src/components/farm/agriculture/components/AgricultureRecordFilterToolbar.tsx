/**
 * 农事操作记录筛选工具栏组件
 */

import React from 'react';
import { Search, Plus } from 'lucide-react';
import { SOURCE_CONFIG, type FarmOperationRecord } from '../../../../hooks/useOperationRecords';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { greenhouseOptions, operatorOptions } from '../../../../data/farmMockData';
import { Button } from '@/components/ui/button';

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
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 搜索框 */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            placeholder="操作单号/作物/区域/人员"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 来源类型 */}
        <div className="min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">来源类型</label>
          <select
            value={filters.sourceType}
            onChange={(e) => onFiltersChange({ ...filters, sourceType: e.target.value as any })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {SOURCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 操作类型 */}
        <div className="min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
          <select
            value={filters.operationType}
            onChange={(e) => onFiltersChange({ ...filters, operationType: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 操作区域 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">操作区域</label>
          <select
            value={filters.greenhouseId}
            onChange={(e) => onFiltersChange({ ...filters, greenhouseId: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {greenhouseOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 操作人员 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
          <select
            value={filters.operatorId}
            onChange={(e) => onFiltersChange({ ...filters, operatorId: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {operatorOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
