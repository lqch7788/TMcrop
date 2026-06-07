/**
 * 人效分析图表 - 趋势图表
 */

import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, LineChart } from 'lucide-react';
import { Button } from '@/components/ui';
import { EfficiencyTrend } from './types';

interface EfficiencyChartProps {
  data: EfficiencyTrend[];
}

type ChartType = 'bar' | 'line';

export const EfficiencyChart: React.FC<EfficiencyChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<ChartType>('line');

  // 计算Y轴最大值
  const maxOutput = Math.max(...data.map(d => d.output));
  const yAxisMax = Math.ceil(maxOutput * 1.2 / 1000) * 1000;

  // 格式化月份显示
  const formatMonth = (month: string) => {
    const [, m] = month.split('-');
    return `${parseInt(m)}月`;
  };

  return (
    <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
      {/* 标题和图表类型切换 */}
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-gray-700">人效趋势（12个月）</h5>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChartType('bar')}
            className={chartType === 'bar' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}
            title="柱状图"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChartType('line')}
            className={chartType === 'line' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}
            title="折线图"
          >
            <LineChart className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
              tick={{ fontSize: 11, fill: '#64748B' }}
              domain={[0, yAxisMax]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#64748B' }}
              domain={[0, 1.2]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.5)',
              }}
              formatter={(value: number, name: string) => {
                if (name === '产出') {
                  return [value.toLocaleString(), '产出'];
                }
                return [`${(value * 100).toFixed(1)}%`, name === 'efficiency' ? '工时效率' : '出勤率'];
              }}
              labelFormatter={(label) => {
                const [, m] = label.split('-');
                return `${parseInt(m)}月`;
              }}
            />
            <Legend
              formatter={(value: string) => {
                if (value === 'output') return '产出';
                if (value === 'efficiency') return '工时效率';
                if (value === 'attendance') return '出勤率';
                return value;
              }}
            />
            {chartType === 'bar' ? (
              <Bar
                yAxisId="left"
                dataKey="output"
                name="output"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            ) : (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="output"
                  name="output"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efficiency"
                  name="efficiency"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendance"
                  name="attendance"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EfficiencyChart;
