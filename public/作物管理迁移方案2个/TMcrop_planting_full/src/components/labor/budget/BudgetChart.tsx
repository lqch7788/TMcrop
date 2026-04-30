import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { MonthlyBudget, QuarterlyBudget } from './types';

interface BudgetChartProps {
  monthlyData: MonthlyBudget[];
  quarterlyData: QuarterlyBudget[];
}

export const BudgetChart: React.FC<BudgetChartProps> = ({ monthlyData, quarterlyData }) => {
  // 月度数据格式
  const monthChartData = monthlyData.map((m) => ({
    name: m.month.split('-')[1] + '月',
    laborCost: m.laborCost / 10000,
    formalWorker: m.formalWorkerCost / 10000,
    tempWorker: m.tempWorkerCost / 10000,
    socialSecurity: m.socialSecurity / 10000,
    benefits: m.benefits / 10000,
    headcount: m.headcount,
    yield: m.yieldPrediction / 10000,
  }));

  // 季度数据格式
  const quarterChartData = quarterlyData.map((q) => ({
    name: q.quarter,
    laborCost: q.laborCost / 10000,
    formalWorker: q.formalWorkerCost / 10000,
    tempWorker: q.tempWorkerCost / 10000,
    headcount: q.headcount,
    yield: q.yieldPrediction / 10000,
  }));

  return (
    <div className="space-y-6">
      {/* 月度人工成本趋势 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月度人工成本趋势 (万元)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2) + '万元'}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend />
            <Bar dataKey="laborCost" name="总成本" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="formalWorker" name="正式工" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tempWorker" name="临时工" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 月度采收量预测 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月度采收量预测 (万斤)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2) + '万斤'}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend />
            <Line type="monotone" dataKey="yield" name="采收量" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 季度对比 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">季度人工成本对比 (万元)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={quarterChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2) + '万元'}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend />
            <Bar dataKey="laborCost" name="总成本" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="formalWorker" name="正式工" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tempWorker" name="临时工" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 用工人数趋势 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月度用工人数</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend />
            <Bar dataKey="headcount" name="用工人数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BudgetChart;
