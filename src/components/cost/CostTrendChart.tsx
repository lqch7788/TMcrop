import React, { useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CostTrendChartProps {
  data: Array<{
    month: string;
    totalCost: number;
  }>;
}

type ChartType = 'bar' | 'line';

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');

  // 计算Y轴最大值
  const maxValue = Math.max(...data.map(d => d.totalCost));
  const yAxisMax = Math.ceil(maxValue * 1.2 / 1000) * 1000;

  return (
    <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
      {/* 标题和图表类型切换 */}
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-gray-700">成本趋势（12个月）</h5>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-emerald-100 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title="柱状图"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'line'
                ? 'bg-emerald-100 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title="折线图"
          >
            <LineChart className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => v.replace('2025-', '').replace('2026-', '') + '月'}
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
              tick={{ fontSize: 11, fill: '#64748B' }}
              domain={[0, yAxisMax]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.5)',
              }}
              formatter={(value: number) => [`¥${value.toLocaleString()}`, '成本']}
            />
            <Legend />
            {chartType === 'bar' ? (
              <Bar
                dataKey="totalCost"
                name="成本"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="totalCost"
                name="成本"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CostTrendChart;
console.log('组件创建成功: CostTrendChart');
