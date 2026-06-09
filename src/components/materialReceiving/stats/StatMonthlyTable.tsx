import React from 'react';
import { BarChart3, Download, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

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
            <Select
              value={selectedMonth}
              onValueChange={(v) => onMonthChange(v)}
            >
              <SelectTrigger className="h-8 bg-white/60">
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
      </div>

      {/* 月度汇总表格 - 按物料分类统计（折叠模式） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">月度领料统计</h3>
          <div className="flex gap-2">
            {exportMode ? (
              <>
                <Button
                  size="sm"
                  onClick={onExportConfirm}
                >
                  <Download className="w-4 h-4" />
                  确认导出
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onExportCancel}
                >
                  <X className="w-4 h-4" /> 取消
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={onToggleExportMode}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {exportMode && (
                  <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Checkbox
                      checked={selectedRows.length === getAllMonthKeys().length && getAllMonthKeys().length > 0}
                      onCheckedChange={() => onSelectAll()}
                    />
                  </TableHead>
                )}
                <TableHead
                  className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                  onClick={() => onSort('month')}
                >
                  月份 {sortConfig.key === 'month' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料分类</TableHead>
                <TableHead
                  className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400"
                  onClick={() => onSort('totalQuantity')}
                >
                  领料数量 {sortConfig.key === 'totalQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400"
                  onClick={() => onSort('totalAmount')}
                >
                  领料金额 {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">排名</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">占比</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">环比</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">同比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {/* 单月视图：直接显示7分类 */}
              {monthFilter !== 'all' && (
                <>
                  {getSingleMonthTableData(yearFilter, monthFilter).map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-emerald-50/50 transition-colors">
                      {exportMode && (
                        <TableCell className="px-4 py-3">
                          <Checkbox
                            checked={selectedRows.includes(idx)}
                            onCheckedChange={() => onSelectRow(idx)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.monthName}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600">{row.categoryName}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.quantity.toLocaleString()}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{row.amount.toLocaleString()}</TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-500">-</TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-500">{getCategoryStats(row.quantity, getSingleMonthTotal(yearFilter, monthFilter).totalQty)}</TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-500">-</TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-500">-</TableCell>
                    </TableRow>
                  ))}
                  {/* 当月合计 */}
                  <TableRow className="bg-emerald-50 font-bold">
                    {exportMode && <TableCell className="px-4 py-3"></TableCell>}
                    <TableCell className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">当月合计</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-emerald-600">-</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right text-emerald-700">{getSingleMonthTotal(yearFilter, monthFilter).totalQty.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-right text-emerald-700">¥{getSingleMonthTotal(yearFilter, monthFilter).totalAmt.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-emerald-700">-</TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-emerald-700">100%</TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-emerald-700">-</TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-emerald-700">-</TableCell>
                  </TableRow>
                </>
              )}

              {/* 全部月份视图：折叠模式 */}
              {monthFilter === 'all' && (
                <>
                  {getSortedMonthSummaries().map((monthRow, monthIdx) => (
                    <React.Fragment key={monthRow.month}>
                      {/* 月份汇总行（可点击展开） */}
                      <TableRow
                        className="cursor-pointer hover:bg-emerald-50/50 bg-gray-50"
                        onClick={() => onToggleMonthExpand(monthRow.month)}
                      >
                        {exportMode && (
                          <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.includes(monthIdx)}
                              onCheckedChange={() => onSelectRow(monthIdx)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">
                              {expandedMonths.has(monthRow.month) ? '▼' : '▶'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{monthRow.monthName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500">
                          点击展开7分类详情
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {monthRow.totalQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                          ¥{monthRow.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-gray-500">
                          {getMonthStats(monthRow.month).rank}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-gray-500">
                          {getMonthStats(monthRow.month).percent}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm">
                          <span className={getMonthStats(monthRow.month).qoq.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).qoq.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                            {getMonthStats(monthRow.month).qoq}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm">
                          <span className={getMonthStats(monthRow.month).yoy.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).yoy.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                            {getMonthStats(monthRow.month).yoy}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* 展开的7分类明细 */}
                      {expandedMonths.has(monthRow.month) && getMonthDetails(monthRow.month).map((detail, idx) => (
                        <TableRow key={`${monthRow.month}-${idx}`} className="hover:bg-emerald-50/50">
                          <TableCell className="px-4 py-3 pl-10 text-sm text-gray-400 whitespace-nowrap">
                            └ {detail.monthName}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: (categorySummaryData.find(c => c.key === detail.categoryKey) as any)?.solid || '#999' }}
                              />
                              {detail.categoryName}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right text-gray-600">
                            {detail.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right text-gray-600">
                            ¥{detail.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-gray-400">-</TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-gray-500">
                            {getCategoryStats(detail.quantity, monthRow.totalQuantity)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-gray-400">-</TableCell>
                          <TableCell className="px-4 py-3 text-center text-gray-400">-</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* 年度合计 */}
                  <TableRow className="bg-emerald-100 font-bold text-emerald-800">
                    {exportMode && <TableCell className="px-4 py-3"></TableCell>}
                    <TableCell className="px-4 py-3 whitespace-nowrap">年度合计</TableCell>
                    <TableCell className="px-4 py-3">-</TableCell>
                    <TableCell className="px-4 py-3 text-right">{getYearTotalQuantity(yearFilter).toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-right">¥{getYearTotalAmount(yearFilter).toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-center">-</TableCell>
                    <TableCell className="px-4 py-3 text-center">100%</TableCell>
                    <TableCell className="px-4 py-3 text-center">-</TableCell>
                    <TableCell className="px-4 py-3 text-center">-</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default StatMonthlyTable;
