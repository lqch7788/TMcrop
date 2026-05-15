// MonthlyDashboard 组件 - 月度仪表盘图表
// 包含环形图、堆叠柱状图、单独月份分组柱状图、分类汇总卡片
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStatisticsStore, getMonthCategoryData, getMonthSummary } from '@/stores';

interface MonthlyDashboardProps {
  /** 选中的月份 */
  selectedMonth: string;
  /** 设置选中月份 */
  onMonthChange: (month: string) => void;
}

export function MonthlyDashboard({ selectedMonth, onMonthChange }: MonthlyDashboardProps) {
  const categorySummaryData = useStatisticsStore((s) => s.categorySummary);
  const categoryTrendData = useStatisticsStore((s) => s.categoryTrend);
  const materialStatistics = useStatisticsStore((s) => s.materialStatistics);

  // 动态计算年度总数量和总金额
  const yearTotal = categorySummaryData.reduce((sum, c) => sum + c.value, 0);
  const yearAmount = categorySummaryData.reduce((sum, c) => sum + c.amount, 0);
  // 根据选中的月份计算当月总计
  const monthTotal = selectedMonth !== 'all'
    ? categoryTrendData.find(d => d.month === selectedMonth)?.total || 0
    : yearTotal;

  // 动态年份和月份列表
  const currentYear = new Date().getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: `${currentYear}-${m}`, label: `${i + 1}月` };
  });

  return (
    /* 仪表盘主体 - 左侧环形图 + 右侧堆叠柱状图 */
    <div className="grid grid-cols-12 gap-6 mb-6">
      {/* 左侧：环形图 */}
      <div className="col-span-3 bg-white/50 rounded-xl p-4 border border-gray-100">
        <h5 className="font-semibold text-gray-700 mb-4 text-center">{currentYear}年领料分类占比</h5>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categorySummaryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {categorySummaryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.solid} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.5)'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} 件`,
                  props.payload.name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* 环形图中心 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-800">
              {(selectedMonth === 'all' ? yearTotal : monthTotal).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              {selectedMonth === 'all' ? '年度总计' : '当月总计'}
            </div>
          </div>
        </div>
        {/* 分类列表 */}
        <div className="mt-4 space-y-2">
          {categorySummaryData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
                <span className="text-gray-600 truncate" title={item.name}>{item.name}</span>
              </div>
              <span className="font-medium text-gray-800">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：堆叠柱状图 / 单独月份分组柱状图 */}
      <div className="col-span-9 bg-white/50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-gray-700">
            月度用量趋势（按物料分类）
            {selectedMonth !== 'all' && <span className="ml-2 text-cyan-600">- {selectedMonth.replace(/^\d{4}-/, '')}月 各分类详情</span>}
          </h5>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-8 px-3 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">全部月份</option>
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 全部月份：堆叠柱状图 */}
        {selectedMonth === 'all' && (
          <div className="h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={categoryTrendData}>
                <defs>
                  <linearGradient id="grad-production" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-facility" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-operation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-postprocess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-digital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-energy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="grad-other" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => v.replace(/^\d{4}-/, '')+'月'}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, Math.ceil(Math.max(...categoryTrendData.map(d => d.total)) * 1.2 / 100) * 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.5)'
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const cat = categorySummaryData.find(c => c.key === name);
                    const amount = Math.round(value * 30);
                    return [`${value} 件 / ¥${(amount/10000).toFixed(2)} 万`, cat?.name || name];
                  }}
                />
                <Legend formatter={(value) => {
                  const cat = categorySummaryData.find(c => c.key === value);
                  return <span className="text-gray-600 text-xs">{cat?.name || value}</span>;
                }} />
                <Bar dataKey="生产投入" stackId="a" fill="url(#grad-production)" radius={[0,0,0,0]} barSize={28} />
                <Bar dataKey="设施装备" stackId="a" fill="url(#grad-facility)" radius={[0,0,0,0]} />
                <Bar dataKey="作业支持" stackId="a" fill="url(#grad-operation)" radius={[0,0,0,0]} />
                <Bar dataKey="采后流通" stackId="a" fill="url(#grad-postprocess)" radius={[0,0,0,0]} />
                <Bar dataKey="数字管理" stackId="a" fill="url(#grad-digital)" radius={[0,0,0,0]} />
                <Bar dataKey="能源耗材" stackId="a" fill="url(#grad-energy)" radius={[0,0,0,0]} />
                <Bar dataKey="其他" stackId="a" fill="url(#grad-other)" radius={[4,4,0,0]} />
                <Bar dataKey="total" stackId="b" fill="transparent" label={{ position: 'top', formatter: (value: number) => value > 0 ? value.toLocaleString() : '', fontSize: 11, fill: '#374151', dy: -10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 单独月份：7个竖向柱子 + 月份汇总 */}
        {selectedMonth !== 'all' && (
          <>
            {/* 月份汇总提示 */}
            <div className="mb-4 px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-600">选中月份：</span>
                  <span className="font-bold text-gray-800 ml-2">{selectedMonth.replace(/^\d{4}-/, '')}月</span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-gray-500 text-sm">总用量：</span>
                    <span className="font-bold text-cyan-600 ml-1">{getMonthSummary(selectedMonth, categoryTrendData, categorySummaryData).totalQuantity.toLocaleString()} 件</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">总金额：</span>
                    <span className="font-bold text-purple-600 ml-1">¥{(getMonthSummary(selectedMonth, categoryTrendData, categorySummaryData).totalAmount / 10000).toFixed(1)} 万元</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7分类竖向柱状图 */}
            <div className="h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getMonthCategoryData(selectedMonth, categoryTrendData, categorySummaryData)}>
                  <defs>
                    <linearGradient id="grad-production-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-facility-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-operation-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-postprocess-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-digital-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-energy-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="grad-other-single" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => v.replace('类', '').replace('与', '/')}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    label={{ value: '用量(件)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `¥${(v/10000).toFixed(1)}万`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    label={{ value: '金额(万元)', angle: 90, position: 'insideRight', fill: '#64748B', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.5)'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} 件 / ¥${(props.payload.amount/10000).toFixed(2)} 万`,
                      props.payload.name
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    yAxisId="left"
                    radius={[6, 6, 0, 0]}
                    barSize={48}
                    label={{
                      position: 'top',
                      formatter: (value: number) => value > 0 ? value.toLocaleString() : '',
                      fontSize: 11,
                      fill: '#374151'
                    }}
                  >
                    {getMonthCategoryData(selectedMonth, categoryTrendData, categorySummaryData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.solid} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 分类汇总卡片区域组件
 * 显示各物料分类的汇总信息
 */
export function CategorySummaryCards() {
  const categorySummaryData = useStatisticsStore((s) => s.categorySummary);

  // 动态计算合计
  const yearTotal = categorySummaryData.reduce((sum, c) => sum + c.value, 0);
  const yearAmount = categorySummaryData.reduce((sum, c) => sum + c.amount, 0);

  return (
    /* 底部：分类汇总卡片 */
    <div className="grid grid-cols-8 gap-3">
      {categorySummaryData.map((item) => (
        <div key={item.name} className="bg-white/60 rounded-xl p-3 border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
            <span className="text-xs text-gray-600 truncate" title={item.name}>{item.name}</span>
          </div>
          <div className="text-lg font-bold text-gray-800">{item.value.toLocaleString()}</div>
          <div className="text-sm text-gray-500">件</div>
          <div className="text-xs text-gray-400 mt-1">¥{item.amount}万</div>
        </div>
      ))}
      {/* 合计卡片 */}
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-3 text-white">
        <div className="text-xs opacity-80 mb-1">年度合计</div>
        <div className="text-xl font-bold">{yearTotal.toLocaleString()}</div>
        <div className="text-sm">件</div>
        <div className="text-xs opacity-80 mt-1">¥{yearAmount.toFixed(1)}万</div>
      </div>
    </div>
  );
}
