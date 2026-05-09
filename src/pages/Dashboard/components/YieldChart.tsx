// 月度产量统计图表组件
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface YieldChartProps {
  yieldRegion: string;
  yieldCrop: string;
  filteredYieldStats: any[];
  onRegionChange: (region: string) => void;
  onCropChange: (crop: string) => void;
}

export function YieldChart({
  yieldRegion,
  yieldCrop,
  filteredYieldStats,
  onRegionChange,
  onCropChange,
}: YieldChartProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">月度产量统计</h3>
      <div className="flex gap-4 mb-4">
        <select
          value={yieldRegion}
          onChange={(e) => onRegionChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">全部区域</option>
          <option value="G001">玻璃温室A区</option>
          <option value="G002">玻璃温室B区</option>
          <option value="G003">玻璃温室C区</option>
          <option value="G004">日光温室1号</option>
        </select>
        <select
          value={yieldCrop}
          onChange={(e) => onCropChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">全部作物</option>
          <option value="C001">番茄</option>
          <option value="C002">黄瓜</option>
          <option value="C003">辣椒</option>
          <option value="C004">草莓</option>
        </select>
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
