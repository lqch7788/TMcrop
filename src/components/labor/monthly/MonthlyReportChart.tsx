/**
 * 月报图表组件
 * 使用 recharts 展示月度工作数据
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { MonthlyReport } from './types';

interface MonthlyReportChartProps {
  reports: MonthlyReport[];
}

export function MonthlyReportChart({ reports }: MonthlyReportChartProps) {
  // 准备图表数据
  const chartData = reports.map((report) => ({
    name: report.month.replace('年', '/').replace('月', ''),
    总工日: report.totalWorkdays,
    总工时: report.totalWorkhours / 8, // 转换为"人天"
    已完成任务: report.completedTasks,
    待办任务: report.pendingTasks,
    考勤率: parseFloat(report.attendanceRate.replace('%', '')),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">月度工作趋势</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 工时统计柱状图 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">工时统计</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Bar dataKey="总工日" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="总工时" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 任务完成情况折线图 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">任务完成情况</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="已完成任务"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="待办任务"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 考勤率折线图 */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-gray-700 mb-4">考勤率趋势</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[90, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '考勤率']}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="考勤率"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
