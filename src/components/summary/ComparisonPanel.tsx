/**
 * 多维度对比分析面板
 * 主参数 + 2个对比参数 + 4种图表 + 多采样粒度
 * V10.0 新增 — 对标旧系统 yield.ejs + fertilizer.ejs
 */
import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Table2, LineChart, PieChart, RefreshCw } from 'lucide-react';
import { Button, Card, Select, DateRangePicker, EmptyState, Skeleton } from '@/components/ui';
import { useSummaryDataStore } from '@/stores';
import { BarChart, Bar, LineChart as RLineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 对比参数配置 (计划 §3.4.2)
const COMPARISON_PARAMS = [
  { key: 'yield', label: '产量', category: 'products' },
  { key: 'fertilizer_total', label: '总施肥量', category: 'fertilizer' },
  { key: 'fertilizer_cost', label: '施肥成本', category: 'fertilizer' },
  { key: 'work_hours', label: '工时', category: 'labor' },
  { key: 'worker_count', label: '工人数', category: 'labor' },
];

const CHART_MODES = [
  { key: 'bar', label: '柱状图', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'line', label: '曲线图', icon: <LineChart className="w-4 h-4" /> },
  { key: 'pie', label: '饼图', icon: <PieChart className="w-4 h-4" /> },
  { key: 'table', label: '表格', icon: <Table2 className="w-4 h-4" /> },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ComparisonPanel() {
  const { comparisonData, fetchComparisonStats, isLoading } = useSummaryDataStore();

  const [mainParam, setMainParam] = useState('yield');
  const [compareParam1, setCompareParam1] = useState('');
  const [compareParam2, setCompareParam2] = useState('');
  const [chartMode, setChartMode] = useState('bar');
  const [sampling, setSampling] = useState('month');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // 对比参数互斥 — 过滤掉已选的
  const availableCompare1 = COMPARISON_PARAMS.filter(p => p.key !== mainParam);
  const availableCompare2 = COMPARISON_PARAMS.filter(p => p.key !== mainParam && p.key !== compareParam1);

  const handleQuery = useCallback(() => {
    fetchComparisonStats({
      mainParam,
      compareParam1: compareParam1 || undefined,
      compareParam2: compareParam2 || undefined,
      startDate: dateRange.start,
      endDate: dateRange.end,
      sampling,
    });
  }, [mainParam, compareParam1, compareParam2, dateRange, sampling, fetchComparisonStats]);

  useEffect(() => {
    handleQuery();
  }, []); // 首次自动加载

  // 渲染图表
  const renderChart = (data: any[], title: string, color: string) => {
    if (!data || data.length === 0) return <EmptyState description="暂无数据" />;

    switch (chartMode) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} name={title} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} name={title} />
            </RLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RPieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </RPieChart>
          </ResponsiveContainer>
        );
      case 'table':
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">分组</th>
                <th className="text-right py-2 px-3">数值</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{item.label}</td>
                  <td className="py-2 px-3 text-right font-mono">{Number(item.value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 筛选条件 */}
      <Card>
        <Card.Content className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">主参数</label>
            <Select value={mainParam} onChange={setMainParam}>
              {COMPARISON_PARAMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">对比参数1</label>
            <Select value={compareParam1} onChange={setCompareParam1}>
              <option value="">-- 不选择 --</option>
              {availableCompare1.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">对比参数2</label>
            <Select value={compareParam2} onChange={setCompareParam2}>
              <option value="">-- 不选择 --</option>
              {availableCompare2.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
          <div className="w-[180px]">
            <label className="text-xs text-gray-500 mb-1 block">采样粒度</label>
            <Select value={sampling} onChange={setSampling}>
              <option value="day">日</option>
              <option value="month">月</option>
              <option value="year">年</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {CHART_MODES.map(m => (
              <Button key={m.key} size="sm" variant={chartMode === m.key ? 'default' : 'outline'}
                onClick={() => setChartMode(m.key)} title={m.label}>
                {m.icon}
              </Button>
            ))}
          </div>
          <Button onClick={handleQuery} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            查询
          </Button>
        </Card.Content>
      </Card>

      {/* 图表区 */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : comparisonData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {comparisonData.main && (
            <Card className={compareParam1 || compareParam2 ? '' : 'lg:col-span-2'}>
              <Card.Header><Card.Title className="text-emerald-600">主参数 · {COMPARISON_PARAMS.find(p=>p.key===mainParam)?.label}</Card.Title></Card.Header>
              <Card.Content>{renderChart(comparisonData.main.data, '主参数', '#10b981')}</Card.Content>
            </Card>
          )}
          {comparisonData.compare1 && (
            <Card>
              <Card.Header><Card.Title className="text-blue-600">对比参数1</Card.Title></Card.Header>
              <Card.Content>{renderChart(comparisonData.compare1.data, '对比1', '#3b82f6')}</Card.Content>
            </Card>
          )}
          {comparisonData.compare2 && (
            <Card>
              <Card.Header><Card.Title className="text-amber-600">对比参数2</Card.Title></Card.Header>
              <Card.Content>{renderChart(comparisonData.compare2.data, '对比2', '#f59e0b')}</Card.Content>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState icon={<BarChart3 className="w-12 h-12 text-gray-300" />}
          description="点击「查询」获取多维度对比分析数据" />
      )}
    </div>
  );
}
