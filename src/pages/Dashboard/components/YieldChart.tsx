// 月度产量统计图表组件
// 2026-10-11 数据真实化：数据源改为 /api/summary/yield-stats（useDashboard 的 filteredYieldStats），
//                        区域/作物硬编码筛选项删除，改为真实作物下拉；空数据显示占位提示
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface YieldChartProps {
  yieldCrop: string;
  filteredYieldStats: any[];
  /** 作物筛选选项（来自 /summary/yield-stats group_by=crop 的真实作物名） */
  yieldCropOptions: string[];
  onCropChange: (crop: string) => void;
}

export function YieldChart({
  yieldCrop,
  filteredYieldStats,
  yieldCropOptions,
  onCropChange,
}: YieldChartProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">月度产量统计</h3>
      <div className="flex gap-3 mb-4">
        <Select value={yieldCrop} onValueChange={onCropChange}>
          <SelectTrigger className="h-9 flex-1 min-w-0" aria-label="按作物筛选产量">
            <SelectValue placeholder="全部作物" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部作物</SelectItem>
            {yieldCropOptions.map((crop) => (
              <SelectItem key={crop} value={crop}>{crop}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-48">
        {filteredYieldStats.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            暂无产量数据
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
