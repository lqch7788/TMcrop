import React from 'react';
import { BarChart3, Download } from 'lucide-react';

interface StatMonthlyTableProps {
  activeTab: 'monthly' | 'material';
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  yearFilter: string;
  onYearFilterChange: (year: string) => void;
  monthFilter: string;
  onMonthFilterChange: (month: string) => void;
  expandedMonths: Set<string>;
  onToggleMonthExpand: (month: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  exportMode: boolean;
  selectedRows: number[];
  onSelectAll: () => void;
  onSelectRow: (idx: number) => void;
  onToggleExportMode: () => void;
  onExportConfirm: () => void;
  onExportCancel: () => void;
  data: any[];
  getSortedMonthSummaries: () => any[];
  getSingleMonthTableData: (year: string, month: string) => any[];
  getSingleMonthTotal: (year: string, month: string) => { totalQty: number; totalAmt: number };
  getMonthDetails: (month: string) => any[];
  getMonthStats: (month: string) => { rank: string; percent: string; qoq: string; yoy: string };
  getCategoryStats: (qty: number, total: number) => string;
  getYearTotalQuantity: (year: string) => number;
  getYearTotalAmount: (year: string) => number;
  getAllMonthKeys: () => string[];
  categorySummaryData: any[];
  categoryTrendData: any[];
  monthlyStatisticsData: any[];
}

export const StatMonthlyTable: React.FC<StatMonthlyTableProps> = ({
  activeTab,
  selectedMonth,
  onMonthChange,
  yearFilter,
  onYearFilterChange,
  monthFilter,
  onMonthFilterChange,
  expandedMonths,
  onToggleMonthExpand,
  sortConfig,
  onSort,
  exportMode,
  selectedRows,
  onSelectAll,
  onSelectRow,
  onToggleExportMode,
  onExportConfirm,
  onExportCancel,
  data,
  getSortedMonthSummaries,
  getSingleMonthTableData,
  getSingleMonthTotal,
  getMonthDetails,
  getMonthStats,
  getCategoryStats,
  getYearTotalQuantity,
  getYearTotalAmount,
  getAllMonthKeys,
  categorySummaryData,
  categoryTrendData,
  monthlyStatisticsData,
}) => {
  if (activeTab !== 'monthly') return null;

  return (
    <>
      {/* 仪表盘 - 仅月度汇总Tab显示 */}
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
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="h-8 px-3 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">全部月份</option>
              <option value="2025-01">1月</option>
              <option value="2025-02">2月</option>
              <option value="2025-03">3月</option>
              <option value="2025-04">4月</option>
              <option value="2025-05">5月</option>
              <option value="2025-06">6月</option>
              <option value="2025-07">7月</option>
              <option value="2025-08">8月</option>
              <option value="2025-09">9月</option>
              <option value="2025-10">10月</option>
              <option value="2025-11">11月</option>
              <option value="2025-12">12月</option>
            </select>
          </div>
        </div>
      </div>

      {/* 月度汇总表格 - 按物料分类统计（折叠模式） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">月度领料统计</h3>
          <div className="flex gap-2">
            {exportMode ? (
              <>
                <button
                  onClick={onExportConfirm}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  确认导出
                </button>
                <button
                  onClick={onExportCancel}
                  className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={onToggleExportMode}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {exportMode && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === getAllMonthKeys().length && getAllMonthKeys().length > 0}
                      onChange={onSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th
                  className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                  onClick={() => onSort('month')}
                >
                  月份 {sortConfig.key === 'month' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料分类</th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400"
                  onClick={() => onSort('totalQuantity')}
                >
                  领料数量 {sortConfig.key === 'totalQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400"
                  onClick={() => onSort('totalAmount')}
                >
                  领料金额 {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">排名</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">占比</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">环比</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">同比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {/* 单月视图：直接显示7分类 */}
              {monthFilter !== 'all' && (
                <>
                  {getSingleMonthTableData(yearFilter, monthFilter).map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                      {exportMode && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(idx)}
                            onChange={() => onSelectRow(idx)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.monthName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.categoryName}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{getCategoryStats(row.quantity, getSingleMonthTotal(yearFilter, monthFilter).totalQty)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                    </tr>
                  ))}
                  {/* 当月合计 */}
                  <tr className="bg-emerald-50 font-bold">
                    {exportMode && <td className="px-4 py-3"></td>}
                    <td className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">当月合计</td>
                    <td className="px-4 py-3 text-sm text-emerald-600">-</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-700">{getSingleMonthTotal(yearFilter, monthFilter).totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-700">¥{getSingleMonthTotal(yearFilter, monthFilter).totalAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-700">100%</td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                  </tr>
                </>
              )}

              {/* 全部月份视图：折叠模式 */}
              {monthFilter === 'all' && (
                <>
                  {getSortedMonthSummaries().map((monthRow, monthIdx) => (
                    <React.Fragment key={monthRow.month}>
                      {/* 月份汇总行（可点击展开） */}
                      <tr
                        className="cursor-pointer hover:bg-emerald-50/50 bg-gray-50"
                        onClick={() => onToggleMonthExpand(monthRow.month)}
                      >
                        {exportMode && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(monthIdx)}
                              onChange={() => onSelectRow(monthIdx)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">
                              {expandedMonths.has(monthRow.month) ? '▼' : '▶'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{monthRow.monthName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          点击展开7分类详情
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {monthRow.totalQuantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                          ¥{monthRow.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {getMonthStats(monthRow.month).rank}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {getMonthStats(monthRow.month).percent}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={getMonthStats(monthRow.month).qoq.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).qoq.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                            {getMonthStats(monthRow.month).qoq}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={getMonthStats(monthRow.month).yoy.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).yoy.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                            {getMonthStats(monthRow.month).yoy}
                          </span>
                        </td>
                      </tr>

                      {/* 展开的7分类明细 */}
                      {expandedMonths.has(monthRow.month) && getMonthDetails(monthRow.month).map((detail, idx) => (
                        <tr key={`${monthRow.month}-${idx}`} className="hover:bg-emerald-50/50">
                          <td className="px-4 py-3 pl-10 text-sm text-gray-400 whitespace-nowrap">
                            └ {detail.monthName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: (categorySummaryData.find(c => c.key === detail.categoryKey) as any)?.solid || '#999' }}
                              />
                              {detail.categoryName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {detail.quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            ¥{detail.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400">-</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500">
                            {getCategoryStats(detail.quantity, monthRow.totalQuantity)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400">-</td>
                          <td className="px-4 py-3 text-center text-gray-400">-</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* 年度合计 */}
                  <tr className="bg-emerald-100 font-bold text-emerald-800">
                    {exportMode && <td className="px-4 py-3"></td>}
                    <td className="px-4 py-3 whitespace-nowrap">年度合计</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3 text-right">{getYearTotalQuantity(yearFilter).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">¥{getYearTotalAmount(yearFilter).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">100%</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default StatMonthlyTable;
console.log('组件创建成功: StatMonthlyTable');
