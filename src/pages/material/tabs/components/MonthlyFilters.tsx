// MonthlyFilters 组件 - 月度筛选表单
// 月度汇总Tab专用的年份和月份筛选
import { Button } from '@/components/ui/button';

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
          <label className="block text-sm font-medium text-gray-900 mb-1">年份</label>
          <select
            value={yearFilter}
            onChange={(e) => {
              onYearChange(e.target.value);
              onPageChange(1);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="2025">2025年</option>
            <option value="2024">2024年</option>
            <option value="2023">2023年</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">月份</label>
          <select
            value={monthFilter}
            onChange={(e) => {
              onMonthChange(e.target.value);
              onExpandedMonthsChange(new Set());
              onPageChange(1);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">全部月份</option>
            <option value="01">1月</option>
            <option value="02">2月</option>
            <option value="03">3月</option>
            <option value="04">4月</option>
            <option value="05">5月</option>
            <option value="06">6月</option>
            <option value="07">7月</option>
            <option value="08">8月</option>
            <option value="09">9月</option>
            <option value="10">10月</option>
            <option value="11">11月</option>
            <option value="12">12月</option>
          </select>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            onYearChange('2025');
            onMonthChange('all');
            onExpandedMonthsChange(new Set());
            onPageChange(1);
          }}
        >
          重置
        </Button>
      </div>
    </div>
  );
}
