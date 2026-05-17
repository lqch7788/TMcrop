/**
 * 多维度对比分析面板
 * 主参数 + 2个对比参数 + 4种图表 + 多采样粒度 + 导出(PNG/JPEG/PDF) + 响应式
 * V10.0 新增 — 对标旧系统 yield.ejs + fertilizer.ejs
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Table2, LineChart, PieChart, RefreshCw, Download, Camera } from 'lucide-react';
import { Button, Card, Select, DateRangePicker, EmptyState, Skeleton } from '@/components/ui';
import { useSummaryDataStore } from '@/stores';
import { BarChart, Bar, LineChart as RLineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COMPARISON_PARAMS, getFlatParams } from './constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null); // 当前打开的导出菜单 key

  // 图表容器 refs，用于导出截图
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setChartRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) chartRefs.current.set(key, el);
    else chartRefs.current.delete(key);
  }, []);

  // 扁平参数列表 (仅叶子节点可选)
  const flatParams = getFlatParams();
  // 对比参数互斥 — 过滤掉已选的
  const availableCompare1 = flatParams.filter(p => p.key !== mainParam);
  const availableCompare2 = flatParams.filter(p => p.key !== mainParam && p.key !== compareParam1);

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

  // ========== 导出功能 ==========
  const handleExportChart = useCallback(async (chartKey: string, format: 'png' | 'jpeg' | 'pdf') => {
    const el = chartRefs.current.get(chartKey);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
      if (format === 'pdf') {
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`对比图表_${chartKey}_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `对比图表_${chartKey}_${new Date().toISOString().slice(0, 10)}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : 'png'}`, 0.9);
        link.click();
      }
    } catch (err) {
      console.error('导出失败:', err);
    }
    setShowExportMenu(null);
  }, []);

  const handleExportAll = useCallback(async (format: 'png' | 'jpeg' | 'pdf') => {
    const keys = ['main', ...(compareParam1 ? ['compare1'] : []), ...(compareParam2 ? ['compare2'] : [])];
    try {
      if (format === 'pdf') {
        const pdf = new jsPDF('l', 'mm', 'a4');
        for (let i = 0; i < keys.length; i++) {
          const el = chartRefs.current.get(keys[i]);
          if (!el) continue;
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          if (i > 0) pdf.addPage();
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        pdf.save(`对比分析汇总_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        for (const key of keys) {
          const el = chartRefs.current.get(key);
          if (!el) continue;
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
          const link = document.createElement('a');
          const suffix = format === 'jpeg' ? 'jpg' : 'png';
          link.download = `对比图表_${key}_${new Date().toISOString().slice(0, 10)}.${suffix}`;
          link.href = canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : 'png'}`, 0.9);
          link.click();
        }
      }
    } catch (err) {
      console.error('导出全部失败:', err);
    }
    setShowExportMenu(null);
  }, [compareParam1, compareParam2]);

  const ExportMenu = ({ chartKey }: { chartKey: string }) => (
    <div className="absolute top-2 right-2 z-10">
      <button
        onClick={() => setShowExportMenu(showExportMenu === chartKey ? null : chartKey)}
        className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700"
        title="导出图表"
      >
        <Camera className="w-4 h-4" />
      </button>
      {showExportMenu === chartKey && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[90px]">
          {(['png', 'jpeg', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExportChart(chartKey, fmt)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-emerald-50 rounded"
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );

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
              {flatParams.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
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
        <div className="space-y-4">
          {/* 导出全部按钮 */}
          <div className="flex justify-end gap-2">
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => setShowExportMenu(showExportMenu === '__all' ? null : '__all')}>
                <Download className="w-4 h-4 mr-1" />导出全部
              </Button>
              {showExportMenu === '__all' && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[90px] z-20">
                  {(['png', 'jpeg', 'pdf'] as const).map((fmt) => (
                    <button key={fmt} onClick={() => handleExportAll(fmt)}
                      className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-emerald-50 rounded">
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {comparisonData.main && (
            <Card className={`relative ${!compareParam1 && !compareParam2 ? 'lg:col-span-2 xl:col-span-3' : ''}`}>
              <Card.Header className="flex items-center justify-between">
                <Card.Title className="text-emerald-600">主参数 · {flatParams.find(p=>p.key===mainParam)?.label}</Card.Title>
              </Card.Header>
              <Card.Content>
                <div ref={setChartRef('main')}>
                  <ExportMenu chartKey="main" />
                  {renderChart(comparisonData.main.data, '主参数', '#10b981')}
                </div>
              </Card.Content>
            </Card>
          )}
          {comparisonData.compare1 && (
            <Card className="relative">
              <Card.Header><Card.Title className="text-blue-600">对比参数1 · {flatParams.find(p=>p.key===compareParam1)?.label}</Card.Title></Card.Header>
              <Card.Content>
                <div ref={setChartRef('compare1')}>
                  <ExportMenu chartKey="compare1" />
                  {renderChart(comparisonData.compare1.data, '对比1', '#3b82f6')}
                </div>
              </Card.Content>
            </Card>
          )}
          {comparisonData.compare2 && (
            <Card className="relative">
              <Card.Header><Card.Title className="text-amber-600">对比参数2 · {flatParams.find(p=>p.key===compareParam2)?.label}</Card.Title></Card.Header>
              <Card.Content>
                <div ref={setChartRef('compare2')}>
                  <ExportMenu chartKey="compare2" />
                  {renderChart(comparisonData.compare2.data, '对比2', '#f59e0b')}
                </div>
              </Card.Content>
            </Card>
          )}
          </div>
        </div>
      ) : (
        <EmptyState icon={<BarChart3 className="w-12 h-12 text-gray-300" />}
          description="点击「查询」获取多维度对比分析数据" />
      )}
    </div>
  );
}
