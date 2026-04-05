/**
 * 绩效考核图表组件
 * 使用 recharts 展示考核数据
 */
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PerformanceRecord, PERFORMANCE_DIMENSIONS } from './types';

interface PerformanceChartProps {
  records: PerformanceRecord[];
}

export function PerformanceChart({ records }: PerformanceChartProps) {
  // 如果没有数据，显示空状态
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">考核维度分析</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          暂无考核数据
        </div>
      </div>
    );
  }

  // 准备雷达图数据
  const radarData = PERFORMANCE_DIMENSIONS.map((dim) => {
    const record = records[0]; // 使用第一条记录展示
    return {
      dimension: dim.name,
      score: record[dim.key] as number,
      fullMark: 100,
    };
  });

  // 平均雷达图数据
  const avgData = PERFORMANCE_DIMENSIONS.map((dim) => {
    const total = records.reduce((sum, r) => sum + (r[dim.key] as number), 0);
    return {
      dimension: dim.name,
      score: Math.round(total / records.length),
      fullMark: 100,
    };
  });

  // 得分颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#34d399';
    if (score >= 70) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">考核维度分析</h3>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">平均得分</p>
          <p className="text-2xl font-bold text-emerald-700">
            {Math.round(records.reduce((sum, r) => sum + r.totalScore, 0) / records.length)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">考核人数</p>
          <p className="text-2xl font-bold text-blue-700">{records.length}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">最高得分</p>
          <p className="text-2xl font-bold text-amber-700">
            {Math.max(...records.map((r) => r.totalScore))}
          </p>
        </div>
      </div>

      {/* 雷达图 */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={records.length > 1 ? avgData : radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />
            {records.length > 1 ? (
              <>
                <Radar
                  name="部门平均"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend />
              </>
            ) : (
              <>
                <Radar
                  name={records[0].staffName}
                  dataKey="score"
                  stroke={getScoreColor(radarData[0]?.score || 0)}
                  fill={getScoreColor(radarData[0]?.score || 0)}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend />
              </>
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 维度说明 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">维度权重</p>
        <div className="flex flex-wrap gap-2">
          {PERFORMANCE_DIMENSIONS.map((dim) => (
            <span
              key={dim.key}
              className="inline-flex px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
            >
              {dim.name}: {dim.weight}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
