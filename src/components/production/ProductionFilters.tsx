import { Search } from 'lucide-react';
import { batchStatusLabels, PlanTypeLabels } from './constants';
import { PlanType } from '../../types';
import { Button } from '../ui/button';

interface ProductionFiltersProps {
  batchCodeSearch: string;
  plantingModeSearch: string;
  cropNameSearch: string;
  varietySearch: string;
  greenhouseSearch: string;
  statusFilter: string;
  planTypeFilter: string;
  onBatchCodeChange: (value: string) => void;
  onPlantingModeChange: (value: string) => void;
  onCropNameChange: (value: string) => void;
  onVarietyChange: (value: string) => void;
  onGreenhouseChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPlanTypeChange: (value: string) => void;
  onReset: () => void;
  onSearch: () => void;
}

export function ProductionFilters({
  batchCodeSearch,
  plantingModeSearch,
  cropNameSearch,
  varietySearch,
  greenhouseSearch,
  statusFilter,
  planTypeFilter,
  onBatchCodeChange,
  onPlantingModeChange,
  onCropNameChange,
  onVarietyChange,
  onGreenhouseChange,
  onStatusChange,
  onPlanTypeChange,
  onReset,
  onSearch,
}: ProductionFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">计划类型</label>
          <select
            value={planTypeFilter}
            onChange={(e) => onPlanTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部类型</option>
            {Object.entries(PlanTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">批次编号</label>
          <input
            type="text"
            placeholder="搜索批次编号"
            value={batchCodeSearch}
            onChange={(e) => onBatchCodeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">种植模式</label>
          <input
            type="text"
            placeholder="搜索种植模式"
            value={plantingModeSearch}
            onChange={(e) => onPlantingModeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">作物名称</label>
          <input
            type="text"
            placeholder="搜索作物名称"
            value={cropNameSearch}
            onChange={(e) => onCropNameChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">作物品种</label>
          <input
            type="text"
            placeholder="搜索作物品种"
            value={varietySearch}
            onChange={(e) => onVarietyChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">种植区域</label>
          <input
            type="text"
            placeholder="搜索种植区域"
            value={greenhouseSearch}
            onChange={(e) => onGreenhouseChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 text-center mb-1">状态</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部状态</option>
            {Object.entries(batchStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-2">
          <Button size="sm" onClick={onReset}>
            重置
          </Button>
          <Button size="sm" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
