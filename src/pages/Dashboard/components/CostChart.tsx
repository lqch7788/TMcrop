// 成本构成分析图表组件
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

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

// 2026-06-15 P0-3: 抽到组件外避免每次渲染重建
const PERIOD_OPTIONS = [
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' },
];

const CROP_OPTIONS = [
  { value: '', label: '全部作物' },
  { value: 'C001', label: '番茄' },
  { value: 'C002', label: '黄瓜' },
  { value: 'C003', label: '辣椒' },
];

const AREA_TYPE_OPTIONS = [
  { value: '', label: '全部区域' },
  { value: 'greenhouse', label: '大棚' },
  { value: 'field', label: '大田' },
];

export function CostChart({
  costPeriod,
  costCrop,
  costAreaType,
  filteredCostAnalysis,
  onPeriodChange,
  onCropChange,
  onAreaTypeChange,
}: CostChartProps) {
  // 2026-06-15 P0-3: 原生 <select> 改为统一 UI 库 Select(Radix)
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
        <Select value={costCrop} onValueChange={onCropChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="按作物筛选成本">
            <SelectValue placeholder="全部作物" />
          </SelectTrigger>
          <SelectContent>
            {CROP_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={costAreaType} onValueChange={onAreaTypeChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="按区域类型筛选成本">
            <SelectValue placeholder="全部区域" />
          </SelectTrigger>
          <SelectContent>
            {AREA_TYPE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
