// MonthlyFilters 组件 - 月度筛选表单
// 月度汇总Tab专用的年份和月份筛选
import { Button } from '@/components/ui';
import { RotateCcw } from 'lucide-react';

import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface MonthlyFiltersProps {
  /** 当前选择的年份 */
  yearFilter: string;
  /** 当前选择的月份 */
  monthFilter: string;
  /** 设置年份 */
  onYearChange: (year: string) => void;
  /** 设置月份 */
  onMonthChange: (month: string) => void;
  /** 重置筛选 */
  onReset: () => void;
  /** 设置当前页码 */
  onPageChange: (page: number) => void;
  /** 设置展开的月份 */
  onExpandedMonthsChange: () => void;
}

export function MonthlyFilters({
  yearFilter,
  monthFilter,
  onYearChange,
  onMonthChange,
  onReset,
  onPageChange,
  onExpandedMonthsChange,
}: MonthlyFiltersProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">年份</Label>
          <Select
            value={yearFilter}
            onValueChange={(v) => {
              onYearChange(v);
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025年</SelectItem>
              <SelectItem value="2024">2024年</SelectItem>
              <SelectItem value="2023">2023年</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">月份</Label>
          <Select
            value={monthFilter}
            onValueChange={(v) => {
              onMonthChange(v);
              onExpandedMonthsChange(new Set());
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部月份</SelectItem>
              <SelectItem value="01">1月</SelectItem>
              <SelectItem value="02">2月</SelectItem>
              <SelectItem value="03">3月</SelectItem>
              <SelectItem value="04">4月</SelectItem>
              <SelectItem value="05">5月</SelectItem>
              <SelectItem value="06">6月</SelectItem>
              <SelectItem value="07">7月</SelectItem>
              <SelectItem value="08">8月</SelectItem>
              <SelectItem value="09">9月</SelectItem>
              <SelectItem value="10">10月</SelectItem>
              <SelectItem value="11">11月</SelectItem>
              <SelectItem value="12">12月</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="warning"
          onClick={() => {
            onYearChange(String(new Date().getFullYear()));
            onMonthChange('all');
            onExpandedMonthsChange(new Set());
            onPageChange(1);
          }}
        >
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
      </div>
    </div>
  );
}
