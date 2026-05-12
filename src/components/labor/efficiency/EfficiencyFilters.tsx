/**
 * 人效分析筛选栏
 */

import React from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EfficiencyFilters as FiltersType } from './types';

interface EfficiencyFiltersProps {
  filters: FiltersType;
  departments: string[];
  onFilterChange: (filters: Partial<FiltersType>) => void;
  onReset: () => void;
}

export const EfficiencyFilters: React.FC<EfficiencyFiltersProps> = ({
  filters,
  departments,
  onFilterChange,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>

        {/* 日期范围 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">日期范围</label>
          <select
            value={filters.startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="2023-05">2023-05</option>
            <option value="2023-06">2023-06</option>
            <option value="2023-07">2023-07</option>
            <option value="2023-08">2023-08</option>
            <option value="2023-09">2023-09</option>
            <option value="2023-10">2023-10</option>
            <option value="2023-11">2023-11</option>
            <option value="2023-12">2023-12</option>
            <option value="2024-01">2024-01</option>
            <option value="2024-02">2024-02</option>
            <option value="2024-03">2024-03</option>
            <option value="2024-04">2024-04</option>
          </select>
          <span className="text-gray-400">至</span>
          <select
            value={filters.endDate}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="2023-05">2023-05</option>
            <option value="2023-06">2023-06</option>
            <option value="2023-07">2023-07</option>
            <option value="2023-08">2023-08</option>
            <option value="2023-09">2023-09</option>
            <option value="2023-10">2023-10</option>
            <option value="2023-11">2023-11</option>
            <option value="2023-12">2023-12</option>
            <option value="2024-01">2024-01</option>
            <option value="2024-02">2024-02</option>
            <option value="2024-03">2024-03</option>
            <option value="2024-04">2024-04</option>
          </select>
        </div>

        {/* 部门筛选 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">部门</label>
          <select
            value={filters.department}
            onChange={(e) => onFilterChange({ department: e.target.value })}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 重置按钮 */}
        <Button
          variant="secondary"
          onClick={onReset}
          className="ml-auto"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          重置
        </Button>
      </div>
    </div>
  );
};

export default EfficiencyFilters;
