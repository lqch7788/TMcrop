/**
 * 考核评价面板组件
 * 显示基地考核排名和综合评分分布
 */
import { Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { EvaluationItem } from '../../types/indicators.types';

interface EvaluatePanelProps {
  evaluationData: EvaluationItem[];
}

// 获取排名徽章样式
function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500';
  if (rank === 2) return 'bg-gradient-to-br from-gray-400 to-gray-500';
  if (rank === 3) return 'bg-gradient-to-br from-amber-500 to-amber-600';
  return 'bg-blue-100 text-blue-600';
}

// 获取评价等级
function getGradeInfo(score: number): { label: string; style: string } {
  if (score >= 90) return { label: '优秀', style: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
  if (score >= 85) return { label: '良好', style: 'bg-blue-100 text-blue-800 border border-blue-300' };
  return { label: '合格', style: 'bg-gray-100 text-gray-700 border border-gray-300' };
}

export default function EvaluatePanel({ evaluationData }: EvaluatePanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基地考核排名 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />基地考核排名
          </h3>
          <div className="space-y-3">
            {evaluationData.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-300">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${getRankBadgeStyle(item.rank)}`}>
                  {item.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm font-bold text-blue-600 font-mono">{item.totalScore}分</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>生产 {item.productionScore}</span>
                    <span>质量 {item.qualityScore}</span>
                    <span>成本 {item.costScore}</span>
                    <span>效率 {item.efficiencyScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 综合评分分布 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">综合评分分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evaluationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[70, 100]} fontSize={12} stroke="#6b7280" />
              <YAxis type="category" dataKey="name" fontSize={12} width={60} stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="totalScore" name="总分" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 评价明细表 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">评价明细表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold">排名</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">基地</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">生产指标</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">质量指标</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">成本指标</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">效率指标</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">综合得分</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">评价等级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {evaluationData.map(item => {
                const gradeInfo = getGradeInfo(item.totalScore);
                return (
                  <tr key={item.id} className="hover:bg-blue-50 transition-all duration-300">
                    <td className="px-3 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getRankBadgeStyle(item.rank)}`}>
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.productionScore}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.qualityScore}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.costScore}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-mono">{item.efficiencyScore}</td>
                    <td className="px-3 py-3 text-sm font-bold text-blue-600 font-mono">{item.totalScore}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${gradeInfo.style}`}>
                        {gradeInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
