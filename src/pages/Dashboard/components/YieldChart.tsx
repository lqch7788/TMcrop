// 月度产量统计图表组件
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface YieldChartProps {
  yieldRegion: string;
  yieldCrop: string;
  filteredYieldStats: any[];
  onRegionChange: (region: string) => void;
  onCropChange: (crop: string) => void;
}

// 2026-06-15 P0-3: 抽到组件外避免每次渲染重建
const REGION_OPTIONS = [
  { value: '', label: '全部区域' },
  { value: 'G001', label: '玻璃温室A区' },
  { value: 'G002', label: '玻璃温室B区' },
  { value: 'G003', label: '玻璃温室C区' },
  { value: 'G004', label: '日光温室1号' },
];

const CROP_OPTIONS = [
  { value: '', label: '全部作物' },
  { value: 'C001', label: '番茄' },
  { value: 'C002', label: '黄瓜' },
  { value: 'C003', label: '辣椒' },
  { value: 'C004', label: '草莓' },
];

export function YieldChart({
  yieldRegion,
  yieldCrop,
  filteredYieldStats,
  onRegionChange,
  onCropChange,
}: YieldChartProps) {
  // 2026-06-15 P0-3: 原生 <select> 改为统一 UI 库 Select(Radix)
  // 收益: h-9 触摸友好 / 焦点环 / aria 自动注入 / iOS 不再自动放大
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">月度产量统计</h3>
      <div className="flex gap-3 mb-4">
        <Select value={yieldRegion} onValueChange={onRegionChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="按区域筛选产量">
            <SelectValue placeholder="全部区域" />
          </SelectTrigger>
          <SelectContent>
            {REGION_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yieldCrop} onValueChange={onCropChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="按作物筛选产量">
            <SelectValue placeholder="全部作物" />
          </SelectTrigger>
          <SelectContent>
            {CROP_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredYieldStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
              tickFormatter={(value) => `${value}kg`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => [`${value}kg`, '产量']}
            />
            <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} label={{ position: 'top', fontSize: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
