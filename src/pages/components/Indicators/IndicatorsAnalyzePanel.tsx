/**
 * 达成分析面板组件
 * 显示月度达成率趋势和目标-实际对比
 */
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AnalyzeItem } from '../../types/indicators.types';

interface AnalyzePanelProps {
  analyzeData: AnalyzeItem[];
}

export default function AnalyzePanel({ analyzeData }: AnalyzePanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度达成率趋势 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">指标达成率趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyzeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
              <YAxis fontSize={12} domain={[90, 100]} stroke="#6b7280" />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="达成率" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 目标值与实际值对比 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">目标值与实际值对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyzeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
              <YAxis fontSize={12} stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="target" name="目标值" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="实际值" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 达成情况明细 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">达成情况明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold">指标名称</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">实际值</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">差距</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">达成率</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {analyzeData.map((item, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-all duration-300">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.month}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.target}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 font-medium font-mono">{item.actual}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 font-mono">
                    {item.actual - item.target > 0 ? '+' : ''}{item.actual - item.target}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.达成率 >= 98
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : item.达成率 >= 95
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {item.达成率}%
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.达成率 >= 98
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : item.达成率 >= 95
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {item.达成率 >= 98 ? '优秀' : item.达成率 >= 95 ? '良好' : '待改进'}
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
}
