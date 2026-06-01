/**
 * 技术方案筛选工具栏
 * 受控组件：父组件传 filter state 和 onChange
 */
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TechSolution } from '../../types/techSolution';

export interface TechSolutionFiltersValue {
  code: string;
  crop: string;
  author: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface TechSolutionFiltersProps {
  value: TechSolutionFiltersValue;
  crops: string[]; // 从数据中动态提取的作物品种列表
  onChange: (field: keyof TechSolutionFiltersValue, value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function TechSolutionFilters({
  value,
  crops,
  onChange,
  onSearch,
  onReset,
}: TechSolutionFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label>方案编号</Label>
          <Input
            value={value.code}
            onChange={(e) => onChange('code', e.target.value)}
            placeholder="请输入方案编号"
          />
        </div>
        <div className="min-w-[150px]">
          <Label>作物</Label>
          <Select value={value.crop} onValueChange={(v) => onChange('crop', v)}>
            <SelectTrigger>
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              {crops.map((crop) => (
                <SelectItem key={crop} value={crop}>
                  {crop}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>编制人</Label>
          <Input
            value={value.author}
            onChange={(e) => onChange('author', e.target.value)}
            placeholder="请输入编制人"
          />
        </div>
        <div className="min-w-[150px]">
          <Label>状态</Label>
          <Select value={value.status} onValueChange={(v) => onChange('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部</SelectItem>
              <SelectItem value="已发布">已发布</SelectItem>
              <SelectItem value="草稿">草稿</SelectItem>
              <SelectItem value="审核中">审核中</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>开始日期</Label>
          <Input
            type="date"
            value={value.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>结束日期</Label>
          <Input
            type="date"
            value={value.endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
          <Button variant="default" size="sm" onClick={onReset}>
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}
