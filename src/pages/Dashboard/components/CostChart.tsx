// 成本构成分析图表组件
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

interface CostChartProps {
  costPeriod: string;
  costCrop: string;
  costAreaType: string;
  filteredCostAnalysis: any[];
  onPeriodChange: (period: string) => void;
  onCropChange: (crop: string) => void;
  onAreaTypeChange: (areaType: string) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CostChart({
  costPeriod,
  costCrop,
  costAreaType,
  filteredCostAnalysis,
  onPeriodChange,
  onCropChange,
  onAreaTypeChange,
}: CostChartProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">成本构成分析</h3>
      <div className="flex gap-4 mb-4">
        <select
          value={costPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
          <option value="year">本年</option>
        </select>
        <select
          value={costCrop}
          onChange={(e) => onCropChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">全部作物</option>
          <option value="C001">番茄</option>
          <option value="C002">黄瓜</option>
          <option value="C003">辣椒</option>
        </select>
        <select
          value={costAreaType}
          onChange={(e) => onAreaTypeChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">全部区域类型</option>
          <option value="greenhouse">大棚</option>
          <option value="field">大田</option>
        </select>
      </div>
      <div className="h-56">
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
              label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
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
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {filteredCostAnalysis.slice(0, 4).map((item, index) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[index] }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
