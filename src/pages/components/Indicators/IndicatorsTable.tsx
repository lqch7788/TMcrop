/**
 * 指标表格组件
 * 显示指标列表，支持选择、分页和操作
 */
import { BarChart3, Eye, Edit, Trash2, Target, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ChevronRight as DoubleRight, ChevronLeft as DoubleLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import type { Indicator } from '../../types/indicators.types';
import { getProgressColor, getAchievementColor, calcAchievementRate } from '../../hooks/useIndicators';

interface IndicatorsTableProps {
  indicators: Indicator[];
  selectedIds: string[];
  exportMode: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onView: (item: Indicator) => void;
  onAnalyze: (item: Indicator) => void;
  onEdit: (item: Indicator) => void;
  onDelete: (item: Indicator) => void;
}

// 获取趋势图标
function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

// 渲染分页按钮
function renderPagination(currentPage: number, totalPages: number, onPageChange: (page: number) => void) {
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <Button
        key={i}
        size="sm"
        variant={i === currentPage ? "default" : "outline"}
        onClick={() => onPageChange(i)}
        className={
          i === currentPage
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 font-medium'
            : 'text-gray-700 hover:bg-blue-50 border-gray-300'
        }
      >
        {i}
      </Button>
    );
  }
  return pages;
}

export default function IndicatorsTable({
  indicators,
  selectedIds,
  exportMode,
  currentPage,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onSelectAll,
  onToggleSelect,
  onView,
  onAnalyze,
  onEdit,
  onDelete,
}: IndicatorsTableProps) {
  const pageSizeOptions = [5, 10, 20, 50];
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-3 py-3 text-left text-sm font-semibold w-12">
                  <Checkbox
                    checked={selectedIds.length === indicators.length && indicators.length > 0}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              <th className="px-3 py-3 text-left text-sm font-semibold">指标编码</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">指标名称</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">类别</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">采集方式</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">目标值</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">实际值</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">达成率</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">趋势</th>
              <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {indicators.map((ind) => (
              <tr
                key={ind.id}
                className={`hover:bg-blue-50 transition-all duration-300 ${selectedIds.includes(ind.id) ? 'bg-blue-50' : ''}`}
              >
                {exportMode && (
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selectedIds.includes(ind.id)}
                      onCheckedChange={() => onToggleSelect(ind.id)}
                    />
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-gray-600 font-mono">{ind.code}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">{ind.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">{ind.category}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${ind.source === '自动采集' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                    {ind.source}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 font-mono">{ind.target}{ind.unit}</td>
                <td className="px-3 py-3 text-sm text-gray-900 font-medium font-mono">{ind.actual}{ind.unit}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(ind.actual, ind.target)} rounded-full`}
                        style={{ width: `${Math.min((ind.actual / ind.target) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium font-mono ${getAchievementColor(ind.actual, ind.target)}`}>
                      {calcAchievementRate(ind.actual, ind.target)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={ind.trend} />
                    <span className="text-xs text-gray-500">
                      {ind.trend === 'up' ? '上升' : ind.trend === 'down' ? '下降' : '持平'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(ind)} title="查看">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onAnalyze(ind)} title="分析">
                      <Target className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(ind)} title="编辑">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(ind)} title="删除">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {indicators.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {indicators.length > 0 && (
        <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              共 <span className="text-blue-600 font-medium">{totalCount}</span> 条记录
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页</span>
              <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
                <SelectTrigger className="w-20 h-8 px-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(opt => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">条</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="text-gray-600"
            >
              <DoubleLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {renderPagination(currentPage, totalPages, onPageChange)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="text-gray-600"
            >
              <DoubleRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 ml-2">
              第 <span className="text-blue-600 font-medium">{currentPage}</span> / {totalPages} 页
            </span>
          </div>
        </div>
      )}
    </>
  );
}
