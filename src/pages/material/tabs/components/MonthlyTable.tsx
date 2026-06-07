// MonthlyTable 组件 - 月度汇总表格
// 按物料分类统计的月度汇总表格（折叠模式）
import { Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import {
  useStatisticsStore,
  getSingleMonthTableData,
  getYearTotalQuantity,
  getYearTotalAmount,
  getMonthDetails,
} from '@/stores';
import type { SortConfig, MonthSummary, MonthDetail } from '../types/statisticsTab.types';

interface MonthlyTableProps {
  /** 当前选择的年份 */
  yearFilter: string;
  /** 当前选择的月份 */
  monthFilter: string;
  /** 展开的月份集合 */
  expandedMonths: Set<string>;
  /** 排序配置 */
  sortConfig: SortConfig;
  /** 导出模式 */
  exportMode: boolean;
  /** 选中的行 */
  selectedRows: number[];
  /** 月度汇总数据（已排序） */
  monthSummaries: MonthSummary[];
  /** 获取月份统计信息 */
  getMonthStats: (month: string) => { rank: number | string; percent: string; qoq: string; yoy: string };
  /** 获取分类占比 */
  getCategoryStats: (detailQty: number, monthQty: number) => string;
  /** 切换月份展开 */
  onToggleExpand: (month: string) => void;
  /** 排序处理 */
  onSort: (key: string) => void;
  /** 全选处理 */
  onSelectAll: () => void;
  /** 行选择变化处理 */
  onRowSelectChange: (idx: number, checked: boolean) => void;
  /** 获取所有月份key */
  getAllMonthKeys: () => number[];
  /** 确认导出 */
  onExportConfirm: () => void;
  /** 取消导出 */
  onCancelExport: () => void;
  /** 设置导出模式 */
  onExportModeChange: (mode: boolean) => void;
}

export function MonthlyTable({
  yearFilter,
  monthFilter,
  expandedMonths,
  sortConfig,
  exportMode,
  selectedRows,
  monthSummaries,
  getMonthStats,
  getCategoryStats,
  onToggleExpand,
  onSort,
  onSelectAll,
  onRowSelectChange,
  getAllMonthKeys,
  onExportConfirm,
  onCancelExport,
  onExportModeChange,
}: MonthlyTableProps) {
  const categoryTrend = useStatisticsStore((s) => s.categoryTrend);
  const categorySummary = useStatisticsStore((s) => s.categorySummary);

  // 单月总计（替代旧的 getSingleMonthTotal mock 函数）
  const singleMonthTotal = monthFilter !== 'all'
    ? (() => {
        const details = getSingleMonthTableData(yearFilter, monthFilter, categoryTrend, categorySummary);
        return {
          totalQty: details.reduce((s, d) => s + d.quantity, 0),
          totalAmt: details.reduce((s, d) => s + d.amount, 0),
        };
      })()
    : { totalQty: 0, totalAmt: 0 };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">月度领料统计</h3>
        <div className="flex gap-2">
          {exportMode ? (
            <>
              <Button size="sm" onClick={onExportConfirm}>
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelExport}>
                取消
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onExportModeChange(true)}>
              <Download className="w-4 h-4" />
              导出
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === getAllMonthKeys().length && getAllMonthKeys().length > 0}
                    onCheckedChange={() => onSelectAll()}
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
                className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                onClick={() => onSort('totalQuantity')}
              >
                领料数量 {sortConfig.key === 'totalQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
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
                {getSingleMonthTableData(yearFilter, monthFilter, categoryTrend, categorySummary).map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-100 transition-colors">
                    {exportMode && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Checkbox
                          checked={selectedRows.includes(idx)}
                          onCheckedChange={(checked) => onRowSelectChange(idx, checked === true)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.monthName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.categoryName}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600 whitespace-nowrap">¥{row.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">{getCategoryStats(row.quantity, singleMonthTotal.totalQty)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                  </tr>
                ))}
                {/* 当月合计 */}
                <tr className="bg-emerald-50 font-bold">
                  {exportMode && <td className="px-4 py-3"></td>}
                  <td className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">当月合计</td>
                  <td className="px-4 py-3 text-sm text-emerald-600">-</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-700">{singleMonthTotal.totalQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-700">¥{singleMonthTotal.totalAmt.toLocaleString()}</td>
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
                {monthSummaries.map((monthRow, monthIdx) => (
                  <tbody key={monthRow.month}>
                    {/* 月份汇总行（可点击展开） */}
                    <tr
                      className="cursor-pointer hover:bg-emerald-50/50 bg-gray-50"
                      onClick={() => onToggleExpand(monthRow.month)}
                    >
                      {exportMode && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.includes(monthIdx)}
                            onCheckedChange={(checked) => onRowSelectChange(monthIdx, checked === true)}
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
                    {expandedMonths.has(monthRow.month) && (
                      <>
                        {getMonthDetails(monthRow.month, categoryTrend, categorySummary).map((detail: MonthDetail, idx: number) => (
                          <tr key={`${monthRow.month}-${idx}`} className="hover:bg-emerald-50/50">
                            <td className="px-4 py-3 pl-10 text-sm text-gray-400 whitespace-nowrap">
                              └ {detail.monthName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: (categorySummary.find(c => c.key === detail.categoryKey) as any)?.solid || '#999' }}
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
                      </>
                    )}
                  </tbody>
                ))}

                {/* 年度合计 */}
                <tr className="bg-emerald-100 font-bold text-emerald-800">
                  {exportMode && <td className="px-4 py-3"></td>}
                  <td className="px-4 py-3 whitespace-nowrap">年度合计</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3 text-right">{getYearTotalQuantity(yearFilter, categoryTrend).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{getYearTotalAmount(yearFilter, categoryTrend, categorySummary).toLocaleString()}</td>
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
  );
}
