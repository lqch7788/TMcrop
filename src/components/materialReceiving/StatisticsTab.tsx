import { BarChart3, ChevronDown, ChevronRight as ChevronRightIcon, ClipboardList, Download, Eye, Package, RefreshCw, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { MonthlyStatistics, MaterialStatistics, DepartmentStatistics, GreenhouseStatistics, FieldStatistics, BatchStatistics, MonthSummaryRow, MonthDetailRow, CategorySummary, CategoryTrend, TrendChartData, DepartmentPieData, CategoryPieData } from '../../types/materialReceiving';
import { monthlyStatisticsData, materialStatisticsData, departmentStatisticsData, greenhouseStatisticsData, fieldStatisticsData, batchStatisticsData, categorySummaryData, categoryTrendData, trendChartData, departmentPieData, categoryPieData, getMonthSummaries, getMonthDetails, getYearTotalQuantity, getYearTotalAmount, getMonthCategoryData, getSingleMonthTableData, getSingleMonthTotal, CATEGORY_COLORS } from '../../data/materialReceivingData';

interface StatisticsTabProps {
  // 主Tab状态
  activeTab: 'monthly' | 'material' | 'department' | 'area';
  setActiveTab: (v: 'monthly' | 'material' | 'department' | 'area') => void;
  // 区域统计子Tab状态
  activeAreaTab: 'greenhouse' | 'field' | 'batch';
  setActiveAreaTab: (v: 'greenhouse' | 'field' | 'batch') => void;
  // 月份切换器
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  // 筛选状态
  departmentFilter: string[];
  setDepartmentFilter: (v: string[]) => void;
  dateRange: { start: string; end: string };
  setDateRange: (v: { start: string; end: string }) => void;
  categoryFilter: string[];
  setCategoryFilter: (v: string[]) => void;
  warehouseFilter: string[];
  setWarehouseFilter: (v: string[]) => void;
  // 月度汇总筛选
  yearFilter: string;
  setYearFilter: (v: string) => void;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  expandedMonths: Set<string>;
  setExpandedMonths: (v: Set<string>) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  setSortConfig: (v: { key: string; direction: 'asc' | 'desc' }) => void;
  // 大棚筛选
  greenhouseTypeFilter: string;
  setGreenhouseTypeFilter: (v: string) => void;
  greenhouseFilter: string[];
  setGreenhouseFilter: (v: string[]) => void;
  // 大田筛选
  fieldFilter: string[];
  setFieldFilter: (v: string[]) => void;
  // 批次筛选
  batchFilter: string;
  setBatchFilter: (v: string) => void;
  // 对比周期
  comparisonPeriod: string;
  setComparisonPeriod: (v: string) => void;
  // 分页
  currentPage: number;
  setCurrentPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  // 导出
  exportMode: boolean;
  setExportMode: (v: boolean) => void;
  selectedRows: number[];
  setSelectedRows: (v: number[]) => void;
  showExportTypeModal: boolean;
  setShowExportTypeModal: (v: boolean) => void;
  exportFileType: string;
  setExportFileType: (v: string) => void;
  // 弹窗
  showDetailModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  selectedRecord: any;
  setSelectedRecord: (v: any) => void;
  // 回调函数
  onQuickFilter: (period: string) => void;
  onReset: () => void;
  onToggleMonthExpand: (month: string) => void;
  onMonthSort: (key: string) => void;
  onSelectAll: () => void;
  onExportConfirm: () => void;
  onExportCancel: () => void;
  // 辅助函数结果
  getSortedMonthSummaries: () => MonthSummaryRow[];
  getMonthStats: (month: string) => { rank: string; percent: string; qoq: string; yoy: string };
  getCategoryStats: (detailQty: number, monthQty: number) => string;
  getAllMonthKeys: () => number[];
  getStatSummaryData: () => {
    requisitionCount: number;
    totalQuantity: number;
    totalAmount: number;
    avgDifferenceRate: number;
    yearOnYearChange: number;
  };
}

export default function StatisticsTab({
  activeTab,
  setActiveTab,
  activeAreaTab,
  setActiveAreaTab,
  selectedMonth,
  setSelectedMonth,
  departmentFilter,
  setDepartmentFilter,
  dateRange,
  setDateRange,
  categoryFilter,
  setCategoryFilter,
  warehouseFilter,
  setWarehouseFilter,
  yearFilter,
  setYearFilter,
  monthFilter,
  setMonthFilter,
  expandedMonths,
  setExpandedMonths,
  sortConfig,
  setSortConfig,
  greenhouseTypeFilter,
  setGreenhouseTypeFilter,
  greenhouseFilter,
  setGreenhouseFilter,
  fieldFilter,
  setFieldFilter,
  batchFilter,
  setBatchFilter,
  comparisonPeriod,
  setComparisonPeriod,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  exportMode,
  setExportMode,
  selectedRows,
  setSelectedRows,
  showExportTypeModal,
  setShowExportTypeModal,
  exportFileType,
  setExportFileType,
  showDetailModal,
  setShowDetailModal,
  selectedRecord,
  setSelectedRecord,
  onQuickFilter,
  onReset,
  onToggleMonthExpand,
  onMonthSort,
  onSelectAll,
  onExportConfirm,
  onExportCancel,
  getSortedMonthSummaries,
  getMonthStats,
  getCategoryStats,
  getAllMonthKeys,
  getStatSummaryData,
}: StatisticsTabProps) {
  return (
    <>
      {/* Tab切换 - 主Tab */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="border-b border-gray-100">
          <div className="flex items-center gap-1 p-2">
            <Button
              variant={activeTab === 'monthly' ? 'default' : 'ghost'}
              onClick={() => { setActiveTab('monthly'); setCurrentPage(1); }}
            >
              📅 月度汇总
            </Button>
            <Button
              variant={activeTab === 'material' ? 'default' : 'ghost'}
              onClick={() => { setActiveTab('material'); setCurrentPage(1); }}
            >
              📦 物料汇总
            </Button>
            <Button
              variant={activeTab === 'department' ? 'default' : 'ghost'}
              onClick={() => { setActiveTab('department'); setCurrentPage(1); }}
            >
              👤 部门汇总
            </Button>
            <Button
              variant={activeTab === 'area' ? 'default' : 'ghost'}
              onClick={() => { setActiveTab('area'); setCurrentPage(1); }}
            >
              <BarChart3 className="w-4 h-4" /> 🏠 区域统计
            </Button>
          </div>
        </div>

        {/* 区域统计子Tab */}
        {activeTab === 'area' && (
          <div className="border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-1 p-2">
              <Button
                variant={activeAreaTab === 'greenhouse' ? 'blue' : 'ghost'}
                onClick={() => { setActiveAreaTab('greenhouse'); setCurrentPage(1); }}
              >
                <BarChart3 className="w-4 h-4" /> 🏠 大棚统计
              </Button>
              <Button
                variant={activeAreaTab === 'field' ? 'blue' : 'ghost'}
                onClick={() => { setActiveAreaTab('field'); setCurrentPage(1); }}
              >
                <BarChart3 className="w-4 h-4" /> 🌾 大田统计
              </Button>
              <Button
                variant={activeAreaTab === 'batch' ? 'blue' : 'ghost'}
                onClick={() => { setActiveAreaTab('batch'); setCurrentPage(1); }}
              >
                <BarChart3 className="w-4 h-4" /> 🌱 种植批次统计
              </Button>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* 统计卡片区域 */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* 卡片1: 领料单数 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-200/50 px-2 py-1 rounded-full">本月</span>
              </div>
              <div className="text-2xl font-bold text-emerald-700 mb-1">{getStatSummaryData().requisitionCount}</div>
              <div className="text-xs text-emerald-600/70">领料单数</div>
            </div>

            {/* 卡片2: 领料总量 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-200/50 px-2 py-1 rounded-full">累计</span>
              </div>
              <div className="text-2xl font-bold text-blue-700 mb-1">{getStatSummaryData().totalQuantity.toLocaleString()}</div>
              <div className="text-xs text-blue-600/70">领料总量</div>
            </div>

            {/* 卡片3: 总金额 */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <span className="text-lg font-bold">¥</span>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-200/50 px-2 py-1 rounded-full">元</span>
              </div>
              <div className="text-2xl font-bold text-amber-700 mb-1">¥{getStatSummaryData().totalAmount.toLocaleString()}</div>
              <div className="text-xs text-amber-600/70">总金额</div>
            </div>

            {/* 卡片4: 差异率 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${
                  getStatSummaryData().avgDifferenceRate < 0
                    ? 'bg-green-500 shadow-green-500/30'
                    : 'bg-red-500 shadow-red-500/30'
                }`}>
                  <TrendingDown className={`w-5 h-5 text-white ${getStatSummaryData().avgDifferenceRate >= 0 ? 'transform rotate-180' : ''}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  getStatSummaryData().avgDifferenceRate < 0
                    ? 'text-green-600 bg-green-200/50'
                    : 'text-red-600 bg-red-200/50'
                }`}>
                  {getStatSummaryData().avgDifferenceRate < 0 ? '正常' : '异常'}
                </span>
              </div>
              <div className={`text-2xl font-bold mb-1 ${
                getStatSummaryData().avgDifferenceRate < 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {getStatSummaryData().avgDifferenceRate.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-600/70">平均差异率</div>
            </div>

            {/* 卡片5: 同比变化 */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-4 border border-rose-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/30">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-rose-600 bg-rose-200/50 px-2 py-1 rounded-full">同比</span>
              </div>
              <div className="text-2xl font-bold text-rose-700 mb-1">+{getStatSummaryData().yearOnYearChange}%</div>
              <div className="text-xs text-rose-600/70">较上年同期</div>
            </div>
          </div>

          {/* 仪表盘 - 仅月度汇总Tab显示 */}
          {activeTab === 'monthly' && (
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-6 mb-6 shadow-lg shadow-cyan-500/10">
              {/* 仪表盘标题 + 月份切换器 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">领料统计概览</h4>
                    <p className="text-sm text-gray-500">2025年度物料领取分析</p>
                  </div>
                </div>
                {/* 月份切换器 */}
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={(val) => setSelectedMonth(val)}
                  >
                    <SelectTrigger className="h-8 px-3 bg-white/60 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部月份</SelectItem>
                      <SelectItem value="2025-01">1月</SelectItem>
                      <SelectItem value="2025-02">2月</SelectItem>
                      <SelectItem value="2025-03">3月</SelectItem>
                      <SelectItem value="2025-04">4月</SelectItem>
                      <SelectItem value="2025-05">5月</SelectItem>
                      <SelectItem value="2025-06">6月</SelectItem>
                      <SelectItem value="2025-07">7月</SelectItem>
                      <SelectItem value="2025-08">8月</SelectItem>
                      <SelectItem value="2025-09">9月</SelectItem>
                      <SelectItem value="2025-10">10月</SelectItem>
                      <SelectItem value="2025-11">11月</SelectItem>
                      <SelectItem value="2025-12">12月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 仪表盘主体 - 左侧环形图 + 右侧堆叠柱状图 */}
              <div className="grid grid-cols-12 gap-6 mb-6">
                {/* 左侧：环形图 */}
                <div className="col-span-3 bg-white/50 rounded-xl p-4 border border-gray-100">
                  <h5 className="font-semibold text-gray-700 mb-4 text-center">物料分类占比</h5>
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
                        {selectedMonth === 'all' ? '29,450' : '2,450'}
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
                  <h5 className="font-semibold text-gray-700 mb-4">
                    月度用量趋势（按物料分类）
                    {selectedMonth !== 'all' && <span className="ml-2 text-cyan-600">- {selectedMonth.replace('2025-','')}月 各分类详情</span>}
                  </h5>

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
                            tickFormatter={(v) => v.replace('2025-','')+'月'}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                          />
                          <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 5000]} />
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
                            <span className="font-bold text-gray-800 ml-2">{selectedMonth.replace('2025-', '')}月</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <div>
                              <span className="text-gray-500 text-sm">总用量：</span>
                              <span className="font-bold text-cyan-600 ml-1">{getMonthCategoryData(selectedMonth).reduce((sum, d) => sum + d.value, 0).toLocaleString()} 件</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-sm">总金额：</span>
                              <span className="font-bold text-purple-600 ml-1">¥{(getMonthCategoryData(selectedMonth).reduce((sum, d) => sum + d.amount, 0) / 10000).toFixed(1)} 万元</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 7分类竖向柱状图 */}
                      <div className="h-[480px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={getMonthCategoryData(selectedMonth)}>
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
                              domain={[0, 5000]}
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
                              {getMonthCategoryData(selectedMonth).map((entry, index) => (
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

              {/* 底部：分类汇总卡片 */}
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
                  <div className="text-xl font-bold">29,450</div>
                  <div className="text-sm">件</div>
                  <div className="text-xs opacity-80 mt-1">¥89.5万</div>
                </div>
              </div>
            </div>
          )}

          {/* 筛选表单区域 - 月度汇总Tab专用 */}
          {activeTab === 'monthly' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label className="block text-sm font-medium text-gray-900 mb-1">年份</Label>
                  <Select
                    value={yearFilter}
                    onValueChange={(val) => {
                      setYearFilter(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025年</SelectItem>
                      <SelectItem value="2024">2024年</SelectItem>
                      <SelectItem value="2023">2023年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="block text-sm font-medium text-gray-900 mb-1">月份</Label>
                  <Select
                    value={monthFilter}
                    onValueChange={(val) => {
                      setMonthFilter(val);
                      setExpandedMonths(new Set());
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部月份</SelectItem>
                      <SelectItem value="01">1月</SelectItem>
                      <SelectItem value="02">2月</SelectItem>
                      <SelectItem value="03">3月</SelectItem>
                      <SelectItem value="04">4月</SelectItem>
                      <SelectItem value="05">5月</SelectItem>
                      <SelectItem value="06">6月</SelectItem>
                      <SelectItem value="07">7月</SelectItem>
                      <SelectItem value="08">8月</SelectItem>
                      <SelectItem value="09">9月</SelectItem>
                      <SelectItem value="10">10月</SelectItem>
                      <SelectItem value="11">11月</SelectItem>
                      <SelectItem value="12">12月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="warning" onClick={() => {
                    setYearFilter('2025');
                    setMonthFilter('all');
                    setExpandedMonths(new Set());
                    setCurrentPage(1);
                  }}>
                  <RotateCcw className="w-4 h-4" /> 重置
                </Button>
              </div>
            </div>
          )}

          {/* 筛选表单区域 - 其他Tab专用 */}
          {activeTab !== 'monthly' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                {/* 部门筛选 */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700 mb-0">部门:</Label>
                  <Select
                    value={departmentFilter[0] || 'all'}
                    onValueChange={(val) => setDepartmentFilter(val === 'all' ? [] : [val])}
                  >
                    <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="生产部">生产部</SelectItem>
                      <SelectItem value="技术部">技术部</SelectItem>
                      <SelectItem value="设备部">设备部</SelectItem>
                      <SelectItem value="后勤部">后勤部</SelectItem>
                      <SelectItem value="采后处理部">采后处理部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 时间范围 */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700 mb-0">时间:</Label>
                  <DatePicker
                    selected={dateRange.start ? new Date(dateRange.start) : undefined}
                    onChange={(date) => setDateRange({ ...dateRange, start: date.toISOString().slice(0, 10) })}
                    placeholder="开始日期"
                  />
                  <span className="text-gray-400">至</span>
                  <DatePicker
                    selected={dateRange.end ? new Date(dateRange.end) : undefined}
                    onChange={(date) => setDateRange({ ...dateRange, end: date.toISOString().slice(0, 10) })}
                    placeholder="结束日期"
                  />
                </div>

                {/* 快捷筛选按钮 */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <Button variant="ghost" size="sm" onClick={() => onQuickFilter('currentWeek')}>本周</Button>
                  <Button variant="default" size="sm" onClick={() => onQuickFilter('currentMonth')}>本月</Button>
                  <Button variant="ghost" size="sm" onClick={() => onQuickFilter('currentQuarter')}>本季</Button>
                  <Button variant="ghost" size="sm" onClick={() => onQuickFilter('currentYear')}>本年</Button>
                </div>

                {/* 重置按钮 */}
                <Button variant="secondary" size="sm" onClick={onReset}>
                  <RefreshCw className="w-4 h-4" />
                  重置
                </Button>
              </div>

              {/* 区域统计特有筛选 */}
              {activeTab === 'area' && activeAreaTab === 'greenhouse' && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">大棚类型:</Label>
                    <Select
                      value={greenhouseTypeFilter}
                      onValueChange={(val) => setGreenhouseTypeFilter(val)}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="玻璃温室">玻璃温室</SelectItem>
                        <SelectItem value="日光温室">日光温室</SelectItem>
                        <SelectItem value="塑料大棚">塑料大棚</SelectItem>
                        <SelectItem value="露天">露天</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">具体大棚:</Label>
                    <Select
                      value={greenhouseFilter[0] || 'all'}
                      onValueChange={(val) => setGreenhouseFilter(val === 'all' ? [] : [val])}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="玻璃温室A区">玻璃温室A区</SelectItem>
                        <SelectItem value="玻璃温室B区">玻璃温室B区</SelectItem>
                        <SelectItem value="玻璃温室C区">玻璃温室C区</SelectItem>
                        <SelectItem value="日光温室1号">日光温室1号</SelectItem>
                        <SelectItem value="日光温室2号">日光温室2号</SelectItem>
                        <SelectItem value="日光温室3号">日光温室3号</SelectItem>
                        <SelectItem value="日光温室4号">日光温室4号</SelectItem>
                        <SelectItem value="塑料大棚1号">塑料大棚1号</SelectItem>
                        <SelectItem value="塑料大棚2号">塑料大棚2号</SelectItem>
                        <SelectItem value="露天种植区">露天种植区</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">对比周期:</Label>
                    <Select
                      value={comparisonPeriod}
                      onValueChange={(val) => setComparisonPeriod(val)}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不对比</SelectItem>
                        <SelectItem value="lastWeek">上周对比</SelectItem>
                        <SelectItem value="lastMonth">上月对比</SelectItem>
                        <SelectItem value="lastQuarter">上季度对比</SelectItem>
                        <SelectItem value="lastYear">去年同期</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTab === 'area' && activeAreaTab === 'field' && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">具体地块:</Label>
                    <Select
                      value={fieldFilter[0] || 'all'}
                      onValueChange={(val) => setFieldFilter(val === 'all' ? [] : [val])}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="A1地块">A1地块</SelectItem>
                        <SelectItem value="A2地块">A2地块</SelectItem>
                        <SelectItem value="A3地块">A3地块</SelectItem>
                        <SelectItem value="B1地块">B1地块</SelectItem>
                        <SelectItem value="B2地块">B2地块</SelectItem>
                        <SelectItem value="C1地块">C1地块</SelectItem>
                        <SelectItem value="C2地块">C2地块</SelectItem>
                        <SelectItem value="D1地块">D1地块</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">对比周期:</Label>
                    <Select
                      value={comparisonPeriod}
                      onValueChange={(val) => setComparisonPeriod(val)}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不对比</SelectItem>
                        <SelectItem value="lastWeek">上周对比</SelectItem>
                        <SelectItem value="lastMonth">上月对比</SelectItem>
                        <SelectItem value="lastQuarter">上季度对比</SelectItem>
                        <SelectItem value="lastYear">去年同期</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTab === 'area' && activeAreaTab === 'batch' && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 mb-0">批次选择:</Label>
                    <Select
                      value={batchFilter || 'all'}
                      onValueChange={(val) => setBatchFilter(val === 'all' ? '' : val)}
                    >
                      <SelectTrigger className="h-10 px-3 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[280px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部批次</SelectItem>
                        <SelectItem value="ZZB2026-001">ZZB2026-001（番茄-玻璃温室A区）</SelectItem>
                        <SelectItem value="ZZB2026-002">ZZB2026-002（黄瓜-玻璃温室B区）</SelectItem>
                        <SelectItem value="ZZB2026-003">ZZB2026-003（草莓-日光温室1号）</SelectItem>
                        <SelectItem value="YMB2026-001">YMB2026-001（番茄育苗-育苗基地A区）</SelectItem>
                        <SelectItem value="YMB2026-002">YMB2026-002（黄瓜育苗-育苗基地B区）</SelectItem>
                        <SelectItem value="JZB2026-001">JZB2026-001（番茄种源-先正达种业）</SelectItem>
                        <SelectItem value="JZB2026-002">JZB2026-002（黄瓜种源-圣尼斯种业）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

