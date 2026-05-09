/**
 * 分类管理面板组件
 * 显示指标分类汇总和分布图表
 */
import { PieChart, Settings } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategorySummary, Indicator } from '../../types/indicators.types';
import { Button } from '../../../components/ui/button';

interface CategoryPanelProps {
  categorySummary: CategorySummary[];
  indicators: Indicator[];
}

export default function CategoryPanel({ categorySummary, indicators }: CategoryPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分类汇总 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />指标分类汇总
          </h3>
          <div className="space-y-3">
            {categorySummary.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">{cat.count}个</span>
                </div>
                <span className="text-sm font-medium text-blue-600 font-mono">平均达成 {cat.avgAchievement}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 指标分布饼图 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">指标分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie
                data={categorySummary}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                nameKey="name"
                label={({name, count}) => `${name}: ${count}`}
              >
                {categorySummary.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 指标定义配置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />指标定义配置
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold">编码</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">名称</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">计量单位</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">预警值</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">权重</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {indicators.slice(0, 10).map(ind => (
                <tr key={ind.id} className="hover:bg-blue-50 transition-all duration-300">
                  <td className="px-3 py-3 text-sm font-mono text-gray-600">{ind.code}</td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">{ind.name}</td>
                  <td className="px-3 py-3 text-sm text-gray-700">{ind.unit}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.target}</td>
                  <td className="px-3 py-3 text-sm text-amber-600 font-mono">{ind.warning}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.weight}%</td>
                  <td className="px-3 py-3">
                    <Button variant="ghost" className="text-blue-600 text-sm">配置</Button>
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
