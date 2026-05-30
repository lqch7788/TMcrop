import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';

interface CostPieChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
    solid: string;
  }>;
}

// 分类颜色映射
const CATEGORY_COLORS: Record<string, string> = {
  '种质资源': '#06B6D4',
  '肥料与土壤改良剂': '#8B5CF6',
  '农药与植保产品': '#F59E0B',
  '农业机械': '#F97316',
  '劳保与防护用品': '#EC4899',
  '采收容器': '#64748B',
  '监测设备': '#10B981',
  '其他': '#9CA3AF',
};

// 默认颜色数组
const DEFAULT_COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#F97316', '#EC4899', '#64748B', '#10B981', '#9CA3AF'];

export const CostPieChart: React.FC<CostPieChartProps> = ({ data }) => {
  // 为每个数据项分配颜色
  const dataWithColors = data.map((item, index) => ({
    ...item,
    solid: CATEGORY_COLORS[item.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const totalAmount = data.reduce((sum, d) => sum + d.value, 0);

  // 渲染外部标签
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
    if (percentage < 5) return null; // 太小的不显示

    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#64748B"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
      <h5 className="font-semibold text-gray-700 mb-4 text-center">成本构成（按分类）</h5>
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
            >
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.solid} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${props.payload.name}: ${props.payload.percentage.toFixed(1)}% (¥${value.toLocaleString()})`,
                '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              ¥{(totalAmount / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-gray-500">总成本</div>
          </div>
        </div>
      </div>
      {/* 图例 - 无百分比 */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {dataWithColors.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.solid }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostPieChart;
// logger.info('组件创建成功: CostPieChart');
