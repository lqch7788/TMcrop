// 成本构成分析图表组件
// 2026-10-11 数据真实化：数据源改为 /api/summary/cost-stats（useDashboard 聚合的 filteredCostAnalysis），
//                        作物/区域硬编码筛选项删除，改为周期（全部/近3月/近12月）；空数据显示占位提示
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface CostChartProps {
  costPeriod: string;
  filteredCostAnalysis: any[];
  onPeriodChange: (period: string) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// 2026-06-15 P0-3: 抽到组件外避免每次渲染重建
const PERIOD_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'quarter', label: '近3月' },
  { value: 'year', label: '近12月' },
];

export function CostChart({
  costPeriod,
  filteredCostAnalysis,
  onPeriodChange,
}: CostChartProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">成本构成分析</h3>
      <div className="flex gap-2 mb-4">
        <Select value={costPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="选择统计周期">
            <SelectValue placeholder="周期" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-56">
        {filteredCostAnalysis.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            暂无成本数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredCostAnalysis}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                labelLine={true}
                label={({ cx, cy, midAngle, outerRadius, percent }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 20;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="#6b7280" fontSize={12} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {filteredCostAnalysis.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`¥${value}`, '金额']} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {filteredCostAnalysis.map((item, index) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
