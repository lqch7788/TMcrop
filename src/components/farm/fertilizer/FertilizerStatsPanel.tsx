/**
 * 施肥统计分析面板组件
 * 包含：时间范围筛选、分组维度切换、柱状图、饼图、汇总数字
 * 使用 Recharts 渲染图表
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts';
import { useFertilizerStore } from '@/stores';
import { getDictItemName } from '@/stores/useDictionaryStore';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

interface FertilizerStatsPanelProps {
  filters: Record<string, string>;
}

// 饼图颜色
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f97316'];

export function FertilizerStatsPanel({ filters }: FertilizerStatsPanelProps) {
  const store = useFertilizerStore();
  const { items, stats } = store;

  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [groupBy, setGroupBy] = useState<'month' | 'crop' | 'fertilizer_type' | 'greenhouse'>('fertilizer_type');

  // 加载统计数据
  useEffect(() => {
    store.fetchStats({ ...filters, ...timeRange, group_by: groupBy });
  }, [filters, timeRange, groupBy]);

  // ========== 柱状图数据 ==========
  const barChartData = useMemo(() => {
    const groups = new Map<string, { quantity: number; cost: number }>();
    items.forEach((item) => {
      let key = '';
      switch (groupBy) {
        case 'month':
          key = item.fertilizeTime ? item.fertilizeTime.slice(0, 7) : '未知';
          break;
        case 'crop':
          key = item.cropName || '未知';
          break;
        case 'fertilizer_type':
          key = getDictItemName('fertilizer_type', item.fertilizerType) || item.fertilizerType || '未知';
          break;
        case 'greenhouse':
          key = item.greenhouseName || '未知';
          break;
      }
      const existing = groups.get(key) || { quantity: 0, cost: 0 };
      existing.quantity += item.quantity || 0;
      existing.cost += item.totalCost || 0;
      groups.set(key, existing);
    });
    return Array.from(groups.entries())
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [items, groupBy]);

  // ========== 饼图数据 ==========
  const pieChartData = useMemo(() => {
    const typeMap = new Map<string, number>();
    items.forEach((item) => {
      const label = getDictItemName('fertilizer_type', item.fertilizerType) || item.fertilizerType || '未知';
      typeMap.set(label, (typeMap.get(label) || 0) + (item.quantity || 0));
    });
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  // ========== 汇总数据 ==========
  const summary = useMemo(() => {
    const total = items.length;
    const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.totalCost || 0), 0);
    const avgQty = total > 0 ? totalQty / total : 0;
    const types = new Set(items.map((i) => i.fertilizerType)).size;
    return { total, totalQty, totalCost, avgQty, types };
  }, [items]);

  // 分组维度选项
  const groupByOptions = [
    { value: 'fertilizer_type', label: '肥料类型' },
    { value: 'month', label: '按月份' },
    { value: 'crop', label: '作物品种' },
    { value: 'greenhouse', label: '温室位置' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 面板头部 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">施肥统计分析</h3>
          </div>
        </div>

        {/* 筛选行 */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div>
            <Label className="text-xs text-gray-500 mr-2">开始日期</Label>
            <DatePicker
              selected={timeRange.start ? new Date(timeRange.start) : undefined}
              onChange={(date) => setTimeRange((p) => ({ ...p, start: todayLocal(date) }))}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mr-2">结束日期</Label>
            <DatePicker
              selected={timeRange.end ? new Date(timeRange.end) : undefined}
              onChange={(date) => setTimeRange((p) => ({ ...p, end: todayLocal(date) }))}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mr-2">分组维度</Label>
            <Select
              value={groupBy}
              onValueChange={(val) => setGroupBy(val as any)}
            >
              <SelectTrigger className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 w-auto">
                <SelectValue placeholder="肥料类型" />
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 px-6 py-4 border-b border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{summary.total}</div>
          <div className="text-xs text-gray-500">总记录数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.totalQty.toLocaleString()}</div>
          <div className="text-xs text-gray-500">总施肥量 (kg)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{summary.totalCost.toLocaleString()}</div>
          <div className="text-xs text-gray-500">总成本 (元)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.avgQty.toFixed(1)}</div>
          <div className="text-xs text-gray-500">平均施肥量 (kg)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-600">{summary.types}</div>
          <div className="text-xs text-gray-500">肥料种类数</div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 py-4">
        {/* 柱状图 - 施肥量分布 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            施肥量分布（按{groupByOptions.find((o) => o.value === groupBy)?.label}）
          </h4>
          <div className="h-[300px]">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                    height={80}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quantity" name="施肥量(kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="cost" name="成本(元)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 饼图 - 肥料类型分布 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">肥料类型分布（按施肥量）</h4>
          <div className="h-[300px]">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    formatter={(value: number) => `${value.toLocaleString()} kg`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图例说明区 */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-xs text-gray-500">施肥量 (kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span className="text-xs text-gray-500">成本 (元)</span>
          </div>
          <div className="text-xs text-gray-400 ml-auto">
            统计基于当前筛选条件下的全部记录
          </div>
        </div>
      </div>
    </div>
  );
}
