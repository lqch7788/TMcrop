// MonthlyFilters 组件 - 月度筛选表单
// 月度汇总Tab专用的年份、月份与部门筛选
import { Button } from '@/components/ui';
import { RotateCcw } from 'lucide-react';

import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface MonthlyFiltersProps {
  /** 当前选择的年份 */
  yearFilter: string;
  /** 当前选择的月份 */
  monthFilter: string;
  /** 2026-09-27 审计修复（B6）：部门筛选 */
  deptFilter: string;
  /** 部门选项（从 monthlyStatistics 聚合） */
  deptOptions: string[];
  /** 设置年份 */
  onYearChange: (year: string) => void;
  /** 设置月份 */
  onMonthChange: (month: string) => void;
  /** 设置部门 */
  onDeptChange: (dept: string) => void;
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
  deptFilter,
  deptOptions,
  onYearChange,
  onMonthChange,
  onDeptChange,
  onReset,
  onPageChange,
  onExpandedMonthsChange,
}: MonthlyFiltersProps) {
  // 2026-09-27 修复：年份选项动态生成（当前年往前 4 年）——此前硬编码 2023-2025，
  // 而默认年份是当年（2026），下拉无当前年选项导致 Select 显示空白
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

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
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">月份</Label>
          <Select
            value={monthFilter}
            onValueChange={(v) => {
              onMonthChange(v);
              onExpandedMonthsChange();
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
        {/* 2026-09-27 审计修复（B6）：月度汇总按部门筛选 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">部门</Label>
          <Select
            value={deptFilter}
            onValueChange={(v) => {
              onDeptChange(v);
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {deptOptions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="warning"
          onClick={() => {
            onYearChange(String(new Date().getFullYear()));
            onMonthChange('all');
            onDeptChange('all');
            onExpandedMonthsChange();
            onPageChange(1);
          }}
        >
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
      </div>
    </div>
  );
}
