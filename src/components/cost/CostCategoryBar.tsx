import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CostCategoryBarProps {
  data: Array<{
    category: string;
    totalAmount: number;
  }>;
}

export const CostCategoryBar: React.FC<CostCategoryBarProps> = ({ data }) => {
  const COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#F97316', '#EC4899', '#64748B', '#10B981', '#9CA3AF'];

  return (
    <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
      <h5 className="font-semibold text-gray-700 mb-4">分类成本排名</h5>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 11, fill: '#64748B' }}
              width={90}
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
            <Bar dataKey="totalAmount" name="成本" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CostCategoryBar;
console.log('组件创建成功: CostCategoryBar');
