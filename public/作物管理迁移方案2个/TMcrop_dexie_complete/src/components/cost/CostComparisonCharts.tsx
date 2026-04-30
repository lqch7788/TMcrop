import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DepartmentCost {
  department: string;
  requisitionCount: number;
  materialTypes: number;
  totalCost: number;
  percentage: number;
  rank: number;
}

interface SupplierPrice {
  supplier: string;
  materialTypes: number;
  totalAmount: number;
  avgPrice: number;
  priceIndex: number;
}

interface CostComparisonChartsProps {
  departmentData: DepartmentCost[];
  supplierData: SupplierPrice[];
}

export const CostComparisonCharts: React.FC<CostComparisonChartsProps> = ({
  departmentData,
  supplierData,
}) => {
  return (
    <div className="space-y-4">
      {/* 部门成本对比 */}
      <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
        <h5 className="font-semibold text-gray-700 mb-4">部门成本对比</h5>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#64748B' }}
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
              <Bar
                dataKey="totalCost"
                name="总成本"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 供应商价格对比 */}
      <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
        <h5 className="font-semibold text-gray-700 mb-4">供应商价格对比</h5>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">供应商</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">物料种类</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">交易总额</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">平均单价</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">价格指数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {supplierData.map((item) => (
                <tr key={item.supplier} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.supplier}</td>
                  <td className="px-4 py-2 text-sm text-center text-gray-600">{item.materialTypes}种</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">¥{item.avgPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.priceIndex < 100
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.priceIndex}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostComparisonCharts;
console.log('组件创建成功: CostComparisonCharts');
