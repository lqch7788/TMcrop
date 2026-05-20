import { Search } from 'lucide-react';
import { batchStatusLabels, PlanTypeLabels } from './constants';
import { PlanType } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
        {/* 计划类型下拉选择 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700 text-center">计划类型</Label>
          <Select value={planTypeFilter} onValueChange={(v) => onPlanTypeChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(PlanTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 批次编号搜索 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700 text-center">批次编号</Label>
          <Input
            placeholder="搜索批次编号"
            value={batchCodeSearch}
            onChange={(e) => onBatchCodeChange(e.target.value)}
          />
        </div>
        {/* 种植模式搜索 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700 text-center">种植模式</Label>
          <Input
            placeholder="搜索种植模式"
            value={plantingModeSearch}
            onChange={(e) => onPlantingModeChange(e.target.value)}
          />
        </div>
        {/* 作物名称搜索 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700 text-center">作物名称</Label>
          <Input
            placeholder="搜索作物名称"
            value={cropNameSearch}
            onChange={(e) => onCropNameChange(e.target.value)}
          />
        </div>
        {/* 作物品种搜索 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700 text-center">作物品种</Label>
          <Input
            placeholder="搜索作物品种"
            value={varietySearch}
            onChange={(e) => onVarietyChange(e.target.value)}
          />
        </div>
        {/* 种植区域搜索 */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-gray-700 text-center">种植区域</Label>
          <Input
            placeholder="搜索种植区域"
            value={greenhouseSearch}
            onChange={(e) => onGreenhouseChange(e.target.value)}
          />
        </div>
        {/* 状态下拉选择 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700 text-center">状态</Label>
          <Select value={statusFilter} onValueChange={(v) => onStatusChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(batchStatusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 操作按钮 */}
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
